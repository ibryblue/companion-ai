/**
 * Popup VRM Viewer
 * A simplified VRM viewer for the popup UI, based on vrm-test.html implementation
 */

// Wait for DOM content to be loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM content loaded, checking for THREE.js');
  
  // Function to initialize when THREE is available
  const initWhenThreeIsAvailable = () => {
    // Check if THREE is defined
    if (typeof THREE === 'undefined') {
      console.log('THREE is not defined yet, waiting for bundle to load...');
      
      // Set up a listener for the custom event
      document.addEventListener('vrm-bundle-loaded', () => {
        console.log('VRM bundle loaded event received, proceeding with initialization');
        if (typeof THREE !== 'undefined') {
          console.log('THREE.js is now defined, initializing VRMViewer');
          // Initialize the viewer if it exists in the window object
          if (window.popupController && typeof window.popupController.initVRMControls === 'function') {
            console.log('Calling initVRMControls on popupController');
            window.popupController.initVRMControls();
          }
        } else {
          console.error('THREE is still not defined after bundle loaded event');
          const errorContainer = document.getElementById('error-container');
          if (errorContainer) {
            errorContainer.textContent = 'THREE.js not defined. The bundled script may not have loaded correctly.';
          }
        }
      });
      
      // Also set a timeout as fallback
      setTimeout(() => {
        if (typeof THREE !== 'undefined') {
          console.log('THREE.js is now defined (via timeout), initializing');
          // Initialize the viewer if it exists in the window object
          if (window.popupController && typeof window.popupController.initVRMControls === 'function') {
            console.log('Calling initVRMControls on popupController via timeout');
            window.popupController.initVRMControls();
          }
        } else {
          console.error('THREE is still not defined after timeout');
          const errorContainer = document.getElementById('error-container');
          if (errorContainer) {
            errorContainer.textContent = 'THREE.js not defined. The bundled script may not have loaded correctly.';
          }
        }
      }, 1000);
    } else {
      console.log('THREE.js is defined, proceeding with VRMViewer initialization');
      // Initialize the viewer if it exists in the window object
      if (window.popupController && typeof window.popupController.initVRMControls === 'function') {
        console.log('Calling initVRMControls on popupController immediately');
        window.popupController.initVRMControls();
      }
    }
  };
  
  // Check immediately and set up waiting if needed
  initWhenThreeIsAvailable();
});

class VRMViewer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.clock = null;
    this.currentVRM = null;
    this.isRotating = true;
    this.isInitialized = false;
    this.statusCallback = null;
    this.errorCallback = null;
    
    // Don't auto-initialize, wait for explicit init call
  }
  
  /**
   * Initialize the Three.js scene and renderer
   * @param {Function} statusCallback - Function to call with status updates
   * @param {Function} errorCallback - Function to call with error messages
   */
  init(statusCallback = null, errorCallback = null) {
    if (statusCallback) this.statusCallback = statusCallback;
    if (errorCallback) this.errorCallback = errorCallback;
    
    try {
      console.log('Initializing VRM viewer');
      this.callStatusCallback('Initializing VRM viewer...');
      
      // Check if container exists
      if (!this.container) {
        const error = 'VRM preview container not found';
        console.error(error);
        if (this.errorCallback) this.errorCallback(error);
        return false;
      }
      
      // Check if libraries were loaded
      if (typeof THREE === 'undefined') {
        const error = 'THREE is not defined. The bundled script may not have loaded correctly.';
        console.error(error);
        if (this.errorCallback) this.errorCallback(error);
        return false;
      }
      
      // Check for required THREE components
      if (!THREE.Scene || !THREE.PerspectiveCamera || !THREE.WebGLRenderer) {
        const error = 'Required THREE.js components are missing';
        console.error(error);
        if (this.errorCallback) this.errorCallback(error);
        return false;
      }
      
      // Check for OrbitControls
      if (!THREE.OrbitControls) {
        console.warn('THREE.OrbitControls not found, trying to use it from THREE.js examples');
        // Try to use it from examples
        if (THREE.examples && THREE.examples.jsm && THREE.examples.jsm.controls && THREE.examples.jsm.controls.OrbitControls) {
          THREE.OrbitControls = THREE.examples.jsm.controls.OrbitControls;
        } else {
          const error = 'THREE.OrbitControls not available';
          console.error(error);
          if (this.errorCallback) this.errorCallback(error);
          return false;
        }
      }
      
      // Create scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x2a2a2a);
      
      // Create camera
      this.camera = new THREE.PerspectiveCamera(
        30.0,
        this.container.clientWidth / this.container.clientHeight,
        0.1,
        20.0
      );
      this.camera.position.set(0.0, 1.0, 3.0);
      
      // Create renderer
      try {
        this.renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
      } catch (rendererError) {
        const error = `Failed to create WebGL renderer: ${rendererError.message}`;
        console.error(error);
        if (this.errorCallback) this.errorCallback(error);
        return false;
      }
      
      // Add camera controls
      try {
        // Check for OrbitControls in different possible locations
        const OrbitControlsClass = THREE.OrbitControls || 
                                  (THREE.examples && THREE.examples.jsm && THREE.examples.jsm.controls && THREE.examples.jsm.controls.OrbitControls) || 
                                  window.OrbitControls;
        
        if (OrbitControlsClass) {
          this.controls = new OrbitControlsClass(this.camera, this.renderer.domElement);
          this.controls.target.set(0, 1, 0);
          this.controls.update();
          console.log('OrbitControls initialized successfully');
        } else {
          console.warn('OrbitControls not found, continuing without camera controls');
          // Continue without controls
        }
      } catch (controlsError) {
        const error = `Failed to create OrbitControls: ${controlsError.message}`;
        console.error(error);
        if (this.errorCallback) this.errorCallback(error);
        // Continue without controls
      }
      
      // Add lights
      const light = new THREE.DirectionalLight(0xffffff, Math.PI);
      light.position.set(1.0, 1.0, 1.0).normalize();
      this.scene.add(light);
      
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      this.scene.add(ambientLight);
      
      // Add grid helper (small and subtle)
      const gridHelper = new THREE.GridHelper(5, 10, 0x555555, 0x333333);
      this.scene.add(gridHelper);
      
      // Create clock
      this.clock = new THREE.Clock();
      this.clock.start();
      
      // Handle window resize
      window.addEventListener('resize', this.onResize.bind(this));
      
      // Start animation loop
      this.animate();
      
      this.isInitialized = true;
      console.log('VRM viewer initialized');
      this.callStatusCallback('VRM viewer initialized', 'success');
      
      return true;
    } catch (error) {
      console.error('Error initializing VRM viewer:', error);
      this.callStatusCallback('Failed to initialize VRM viewer', 'error');
      if (this.errorCallback) this.errorCallback(error.message || 'Failed to initialize');
      return false;
    }
  }
  
  onResize() {
    if (!this.camera || !this.renderer || !this.container) return;
    
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }
  
  animate() {
    if (!this.isInitialized) return;
    
    requestAnimationFrame(this.animate.bind(this));
    
    const delta = this.clock.getDelta();
    
    // Update VRM
    if (this.currentVRM && this.currentVRM.update) {
      this.currentVRM.update(delta);
    }
    
    // Rotate model if enabled
    if (this.isRotating && this.currentVRM && this.currentVRM.scene) {
      this.currentVRM.scene.rotation.y += 0.01;
    }
    
    // Update controls
    if (this.controls) {
      this.controls.update();
    }
    
    // Render
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
  
  /**
   * Set a status callback function
   * @param {function} callback - Function to call with status updates
   */
  setStatusCallback(callback) {
    this.statusCallback = callback;
  }
  
  /**
   * Call the status callback if set
   * @param {string} message - Status message
   * @param {string} type - Status type (info, success, error)
   */
  callStatusCallback(message, type = 'info') {
    if (this.statusCallback && typeof this.statusCallback === 'function') {
      this.statusCallback(message, type);
    }
  }
  
  /**
   * Load a VRM model from URL
   * @param {string} url - URL of the VRM model
   * @param {Function} successCallback - Function to call on successful load
   * @param {Function} errorCallback - Function to call on error
   * @returns {Promise} - Promise that resolves with the VRM model or rejects with an error
   */
  loadVRMFromURL(url, successCallback = null, errorCallback = null) {
    return new Promise((resolve, reject) => {
      if (!this.isInitialized) {
        const error = new Error('VRM viewer not initialized');
        this.callStatusCallback('VRM viewer not initialized', 'error');
        if (errorCallback) errorCallback(error.message);
        reject(error);
        return;
      }
      
      // Clear existing model
      if (this.currentVRM && this.currentVRM.scene) {
        this.scene.remove(this.currentVRM.scene);
        this.currentVRM = null;
      }
      
      console.log('Loading VRM model from URL:', url);
      this.callStatusCallback('Loading VRM model...', 'info');
      
      try {
        // For extension local files, ensure we have the right URL format
        if (url.includes('chrome-extension://') || url.startsWith('src/')) {
          console.log('Loading extension resource:', url);
        }
        
        // Create loader
        const loader = new THREE.GLTFLoader();
        loader.crossOrigin = 'anonymous';
        
        // Check for VRM loader plugin
        if (typeof VRMLoaderPlugin === 'undefined') {
          const error = new Error('VRMLoaderPlugin not found in the bundle');
          this.callStatusCallback('VRMLoaderPlugin not available', 'error');
          if (errorCallback) errorCallback(error.message);
          reject(error);
          return;
        }
        
        // Register VRM loader plugin
        loader.register((parser) => {
          return new VRMLoaderPlugin(parser);
        });
        
        // Add error handler for the loader
        loader.manager.onError = (urlError) => {
          console.error('Error loading resource:', urlError);
          this.callStatusCallback('Failed to load resource: ' + urlError, 'error');
          if (errorCallback) errorCallback(`Error loading resource: ${urlError}`);
          reject(new Error(`Error loading resource: ${urlError}`));
        };
        
        // Load the model
        loader.load(
          url,
          (gltf) => {
            this.callStatusCallback('Model loaded, processing...', 'info');
            
            try {
              // Handle VRM data
              if (gltf.userData && gltf.userData.vrm) {
                this.currentVRM = gltf.userData.vrm;
                this.scene.add(this.currentVRM.scene);
                
                // Apply VRM optimizations if available
                if (typeof VRMUtils !== 'undefined') {
                  VRMUtils.removeUnnecessaryJoints(this.currentVRM.scene);
                  
                  // Disable frustum culling to avoid disappearing models
                  this.currentVRM.scene.traverse((obj) => {
                    obj.frustumCulled = false;
                  });
                }
                
                this.callStatusCallback('VRM model loaded successfully', 'success');
                if (successCallback) successCallback(this.currentVRM);
                resolve(this.currentVRM);
              } else {
                // Fallback to just using the GLTF scene
                this.callStatusCallback('No VRM data found, using raw GLTF scene', 'warning');
                
                this.currentVRM = {
                  scene: gltf.scene,
                  update: null
                };
                this.scene.add(gltf.scene);
                
                if (successCallback) successCallback(this.currentVRM);
                resolve(this.currentVRM);
              }
            } catch (error) {
              console.error('Error processing VRM model:', error);
              this.callStatusCallback('Error processing VRM model', 'error');
              if (errorCallback) errorCallback(error.message);
              reject(error);
            }
          },
          (progress) => {
            if (progress.total > 0) {
              const percent = Math.round(progress.loaded / progress.total * 100);
              this.callStatusCallback(`Loading model: ${percent}%`, 'info');
            }
          },
          (error) => {
            console.error('Error loading VRM model:', error);
            this.callStatusCallback('Failed to load VRM model', 'error');
            if (errorCallback) errorCallback(error.message);
            reject(error);
          }
        );
      } catch (error) {
        console.error('Error in loadVRMFromURL:', error);
        this.callStatusCallback('Error loading VRM model', 'error');
        if (errorCallback) errorCallback(error.message);
        reject(error);
      }
    });
  }
  
  /**
   * Load a VRM model from file
   * @param {File} file - File object containing the VRM model
   * @param {Function} successCallback - Function to call on successful load
   * @param {Function} errorCallback - Function to call on error
   */
  loadVRMFromFile(file, successCallback = null, errorCallback = null) {
    if (!this.isInitialized) {
      const error = new Error('VRM viewer not initialized');
      this.callStatusCallback('VRM viewer not initialized', 'error');
      if (errorCallback) errorCallback(error.message);
      return;
    }

    if (!file) {
      const error = new Error('No file provided');
      this.callStatusCallback('No file provided', 'error');
      if (errorCallback) errorCallback(error.message);
      return;
    }

    console.log('Loading VRM model from file:', file.name);
    this.callStatusCallback('Loading VRM model from file...', 'info');

    // Clear existing model
    if (this.currentVRM && this.currentVRM.scene) {
      this.scene.remove(this.currentVRM.scene);
      this.currentVRM = null;
    }

    try {
      // Create file reader
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          // Create loader
          const loader = new THREE.GLTFLoader();
          
          // Check for VRM loader plugin
          if (typeof VRMLoaderPlugin === 'undefined') {
            const error = new Error('VRMLoaderPlugin not found in the bundle');
            this.callStatusCallback('VRMLoaderPlugin not available', 'error');
            if (errorCallback) errorCallback(error.message);
            return;
          }
          
          // Register VRM loader plugin
          loader.register((parser) => {
            return new VRMLoaderPlugin(parser);
          });

          // Parse the loaded file
          loader.parse(
            e.target.result,
            '',
            (gltf) => {
              this.callStatusCallback('Model loaded, processing...', 'info');
              
              try {
                // Handle VRM data
                if (gltf.userData && gltf.userData.vrm) {
                  this.currentVRM = gltf.userData.vrm;
                  this.scene.add(this.currentVRM.scene);
                  
                  // Apply VRM optimizations if available
                  if (typeof VRMUtils !== 'undefined') {
                    VRMUtils.removeUnnecessaryJoints(this.currentVRM.scene);
                    
                    // Disable frustum culling to avoid disappearing models
                    this.currentVRM.scene.traverse((obj) => {
                      obj.frustumCulled = false;
                    });
                  }
                  
                  this.callStatusCallback('VRM model loaded successfully', 'success');
                  if (successCallback) successCallback(this.currentVRM);
                } else {
                  // Fallback to just using the GLTF scene
                  this.callStatusCallback('No VRM data found, using raw GLTF scene', 'warning');
                  
                  this.currentVRM = {
                    scene: gltf.scene,
                    update: null
                  };
                  this.scene.add(gltf.scene);
                  
                  if (successCallback) successCallback(this.currentVRM);
                }
              } catch (error) {
                console.error('Error processing VRM model:', error);
                this.callStatusCallback('Error processing VRM model', 'error');
                if (errorCallback) errorCallback(error.message);
              }
            },
            (error) => {
              console.error('Error parsing file:', error);
              this.callStatusCallback('Failed to parse VRM file', 'error');
              if (errorCallback) errorCallback(error.message);
            }
          );
        } catch (error) {
          console.error('Error processing file data:', error);
          this.callStatusCallback('Error processing file data', 'error');
          if (errorCallback) errorCallback(error.message);
        }
      };

      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        this.callStatusCallback('Failed to read file', 'error');
        if (errorCallback) errorCallback('Failed to read file');
      };

      // Start reading the file
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error in loadVRMFromFile:', error);
      this.callStatusCallback('Error loading VRM file', 'error');
      if (errorCallback) errorCallback(error.message);
    }
  }
  
  /**
   * Set rotation state
   * @param {boolean} enabled - Whether to enable auto-rotation
   */
  setRotation(enabled) {
    this.isRotating = enabled;
  }
  
  /**
   * Set wireframe mode
   * @param {boolean} enabled - Whether to enable wireframe mode
   */
  setWireframe(enabled) {
    if (this.currentVRM && this.currentVRM.scene) {
      this.currentVRM.scene.traverse((obj) => {
        if (obj.isMesh) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(mat => mat.wireframe = enabled);
          } else if (obj.material) {
            obj.material.wireframe = enabled;
          }
        }
      });
    }
  }
  
  /**
   * Toggle rotation of the model and return the current rotation state
   * @returns {boolean} - The current rotation state after toggling
   */
  toggleRotation() {
    this.isRotating = !this.isRotating;
    return this.isRotating;
  }
  
  /**
   * Reset the camera to its default position
   */
  resetCamera() {
    if (this.camera && this.controls) {
      this.camera.position.set(0.0, 1.0, 3.0);
      this.controls.target.set(0, 1, 0);
      this.controls.update();
      this.callStatusCallback('Camera reset', 'info');
    }
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    window.removeEventListener('resize', this.onResize.bind(this));
    
    if (this.currentVRM && this.currentVRM.scene) {
      this.scene.remove(this.currentVRM.scene);
      this.currentVRM = null;
    }
    
    if (this.renderer) {
      this.renderer.dispose();
      if (this.container.contains(this.renderer.domElement)) {
        this.container.removeChild(this.renderer.domElement);
      }
    }
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.clock = null;
    this.isInitialized = false;
  }
} 
/**
 * VRM Renderer
 * 
 * Handles rendering of VRM models using Three.js and VRM library
 */

(function(global) {
  // Store THREE reference globally to avoid window.THREE issues
  let _THREE = null;
  
  class VRMRenderer {
    constructor(container, options = {}) {
      this.container = container;
      this.options = Object.assign({
        width: 300,
        height: 300,
        backgroundColor: 0x000000,
        alpha: true
      }, options);
      
      this.isInitialized = false;
      this.modelLoaded = false;
      this.currentModelUrl = null;
      
      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.clock = null;
      this.mixer = null;
      this.currentVRM = null;
      this.animationFrame = null;
      
      this.onError = options.onError || console.error;
      this.onProgress = options.onProgress || (() => {});
      this.onLoad = options.onLoad || (() => {});
    }
    
    /**
     * Initialize the renderer
     */
    init() {
      if (this.isInitialized) return;
      
      try {
        // Check if THREE is available
        if (typeof global !== 'undefined') {
          if (global.THREE) {
            _THREE = global.THREE;
            console.log('Using global.THREE');
          } else {
            console.error('THREE.js is not available');
            this.showErrorMessage('THREE.js is not available');
            return;
          }
        } else {
          console.error('Global object is not defined');
          return;
        }
        
        const THREE = _THREE;
        if (!THREE) {
          console.error('THREE is not available');
          this.showErrorMessage('THREE is not available');
          return;
        }
        
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(
          30,
          this.options.width / this.options.height,
          0.1,
          20.0
        );
        this.camera.position.set(0.0, 1.0, 5.0);
        this.camera.lookAt(0.0, 1.0, 0.0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({
          alpha: this.options.alpha,
          antialias: true
        });
        this.renderer.setSize(this.options.width, this.options.height);
        this.renderer.setPixelRatio(global.devicePixelRatio);
        this.renderer.setClearColor(this.options.backgroundColor, this.options.alpha ? 0 : 1);
        
        // Set correct color encoding
        if (this.renderer.outputEncoding !== undefined) {
          this.renderer.outputEncoding = THREE.sRGBEncoding;
        }
        
        this.renderer.shadowMap.enabled = true;
        
        // Clear container
        while (this.container.firstChild) {
          this.container.removeChild(this.container.firstChild);
        }
        
        // Add renderer to container
        this.container.appendChild(this.renderer.domElement);
        
        // Add lights
        const light = new THREE.DirectionalLight(0xffffff, Math.PI);
        light.position.set(1.0, 1.0, 1.0).normalize();
        this.scene.add(light);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        // Create clock
        this.clock = new THREE.Clock();
        this.clock.start();
        
        this.isInitialized = true;
        console.log('VRM Renderer initialized successfully');
        
        // Start animation loop
        this.animate();
        
      } catch (error) {
        console.error('Failed to initialize VRM renderer:', error);
        this.showErrorMessage('Failed to initialize renderer');
      }
    }
    
    /**
     * Show error message in the container
     */
    showErrorMessage(message) {
      // Clear container
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }
      
      // Create error message
      const errorDiv = document.createElement('div');
      errorDiv.style.width = '100%';
      errorDiv.style.height = '100%';
      errorDiv.style.display = 'flex';
      errorDiv.style.flexDirection = 'column';
      errorDiv.style.alignItems = 'center';
      errorDiv.style.justifyContent = 'center';
      errorDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      errorDiv.style.color = '#ff5555';
      errorDiv.style.padding = '20px';
      errorDiv.style.boxSizing = 'border-box';
      errorDiv.style.textAlign = 'center';
      errorDiv.style.borderRadius = '10px';
      
      const errorTitle = document.createElement('h3');
      errorTitle.textContent = 'Error';
      errorTitle.style.marginBottom = '10px';
      
      const errorText = document.createElement('p');
      errorText.textContent = message || 'Failed to load VRM model';
      
      errorDiv.appendChild(errorTitle);
      errorDiv.appendChild(errorText);
      this.container.appendChild(errorDiv);
      
      // Notify error handler
      if (typeof this.onError === 'function') {
        this.onError(new Error(message));
      }
    }
    
    /**
     * Load a VRM model
     * @param {string} url - URL of the VRM model
     */
    loadModel(url) {
      if (!this.isInitialized) {
        this.init();
      }
      
      const THREE = _THREE;
      if (!THREE) {
        this.showErrorMessage('THREE.js is not properly initialized');
        return Promise.reject(new Error('THREE.js is not properly initialized'));
      }
      
      return new Promise((resolve, reject) => {
        try {
          // Clean up previous model if exists
          if (this.currentVRM) {
            this.scene.remove(this.currentVRM.scene);
            
            // Dispose resources
            if (typeof this.currentVRM.dispose === 'function') {
              this.currentVRM.dispose();
            }
            
            this.currentVRM = null;
          }
          
          this.currentModelUrl = url;
          
          // Check if GLTFLoader is available
          if (!THREE.GLTFLoader) {
            console.error('GLTFLoader is not available');
            this.showErrorMessage('GLTFLoader is not available');
            reject(new Error('GLTFLoader is not available'));
            return;
          }
          
          // Create loader
          const loader = new THREE.GLTFLoader();
          loader.crossOrigin = 'anonymous';
          
          // Register VRM plugin if available
          if (THREE.VRMLoaderPlugin) {
            console.log('Registering VRMLoaderPlugin');
            loader.register((parser) => {
              return new THREE.VRMLoaderPlugin(parser);
            });
          } else {
            console.warn('VRMLoaderPlugin is not available, will try alternative loading methods');
          }
          
          console.log(`Loading VRM model from ${url}`);
          
          // Load model
          loader.load(
            url,
            (gltf) => {
              console.log('VRM model loaded:', gltf);
              
              // Check if we have VRM in userData
              if (gltf.userData && gltf.userData.vrm) {
                this.currentVRM = gltf.userData.vrm;
                console.log('VRM found in userData:', this.currentVRM);
                
                // Apply VRM optimizations
                if (THREE.VRMUtils) {
                  console.log('Applying VRM optimizations');
                  THREE.VRMUtils.removeUnnecessaryVertices(gltf.scene);
                  THREE.VRMUtils.combineSkeletons(gltf.scene);
                  THREE.VRMUtils.combineMorphs(this.currentVRM);
                  
                  // Disable frustum culling
                  this.currentVRM.scene.traverse((obj) => {
                    obj.frustumCulled = false;
                  });
                  
                  // Rotate if it's VRM 0.0
                  if (THREE.VRMUtils.rotateVRM0) {
                    THREE.VRMUtils.rotateVRM0(this.currentVRM);
                  }
                }
                
                // Add to scene
                this.scene.add(this.currentVRM.scene);
              } else if (THREE.VRM && typeof THREE.VRM.from === 'function') {
                // If we don't have VRMLoaderPlugin but have THREE.VRM
                console.log('Using THREE.VRM.from');
                THREE.VRM.from(gltf).then(vrm => {
                  this.currentVRM = vrm;
                  this.scene.add(this.currentVRM.scene);
                  this.modelLoaded = true;
                  
                  // Scale and center the model
                  this.centerModel();
                  
                  if (typeof this.onLoad === 'function') {
                    this.onLoad(this.currentVRM);
                  }
                  
                  resolve();
                }).catch(error => {
                  console.error('Error in THREE.VRM.from:', error);
                  this.showErrorMessage('Failed to process VRM model');
                  reject(error);
                });
                return;
              } else {
                // Fallback to just using the GLTF scene
                console.log('No VRM support, using raw gltf scene');
                this.currentVRM = {
                  scene: gltf.scene,
                  update: null
                };
                this.scene.add(gltf.scene);
              }
              
              // Scale and center the model
              this.centerModel();
              
              this.modelLoaded = true;
              console.log('VRM model ready');
              
              if (typeof this.onLoad === 'function') {
                this.onLoad(this.currentVRM);
              }
              
              resolve();
            },
            (progress) => {
              const percent = progress.total > 0 ? Math.round(progress.loaded / progress.total * 100) : 0;
              console.log(`Loading model: ${percent}%`);
              
              if (typeof this.onProgress === 'function') {
                this.onProgress(percent);
              }
            },
            (error) => {
              console.error('Error loading VRM model:', error);
              this.showErrorMessage('Failed to load VRM model');
              
              if (typeof this.onError === 'function') {
                this.onError(error);
              }
              
              reject(error);
            }
          );
        } catch (error) {
          console.error('Exception while loading VRM model:', error);
          this.showErrorMessage('Exception while loading VRM model');
          reject(error);
        }
      });
    }
    
    /**
     * Center and scale the model to fit in the view
     */
    centerModel() {
      if (!this.currentVRM || !this.currentVRM.scene) return;
      
      const THREE = _THREE;
      if (!THREE) return;
      
      try {
        // Create a bounding box
        const bbox = new THREE.Box3().setFromObject(this.currentVRM.scene);
        const size = bbox.getSize(new THREE.Vector3());
        const center = bbox.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        if (maxDim > 0) {
          // Scale the model to fit
          const scale = 1.5 / maxDim;
          this.currentVRM.scene.scale.set(scale, scale, scale);
          
          // Center the model
          this.currentVRM.scene.position.x = -center.x * scale;
          this.currentVRM.scene.position.y = -center.y * scale + 0.7; // Adjust to show more of the upper body
          this.currentVRM.scene.position.z = -center.z * scale;
        }
      } catch (error) {
        console.error('Error centering model:', error);
      }
    }
    
    /**
     * Animate the VRM model
     */
    animate() {
      if (!this.isInitialized || !this.renderer) return;
      
      this.animationFrame = global.requestAnimationFrame(() => this.animate());
      
      const delta = this.clock.getDelta();
      
      // Update VRM model
      if (this.currentVRM && this.currentVRM.update && typeof this.currentVRM.update === 'function') {
        try {
          this.currentVRM.update(delta);
        } catch (error) {
          console.error('Error updating VRM:', error);
        }
      }
      
      // Slowly rotate the model
      if (this.currentVRM && this.currentVRM.scene) {
        this.currentVRM.scene.rotation.y += 0.005;
      }
      
      // Render scene
      this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Resize the renderer
     * @param {number} width - Width in pixels
     * @param {number} height - Height in pixels
     */
    resize(width, height) {
      if (!this.isInitialized || !this.camera || !this.renderer) return;
      
      this.options.width = width;
      this.options.height = height;
      
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      
      this.renderer.setSize(width, height);
    }
    
    /**
     * Dispose the renderer and clean up resources
     */
    dispose() {
      if (!this.isInitialized) return;
      
      // Stop animation loop
      if (this.animationFrame) {
        global.cancelAnimationFrame(this.animationFrame);
        this.animationFrame = null;
      }
      
      // Remove current VRM model
      if (this.currentVRM) {
        if (this.currentVRM.scene) {
          this.scene.remove(this.currentVRM.scene);
        }
        
        if (typeof this.currentVRM.dispose === 'function') {
          this.currentVRM.dispose();
        }
        
        this.currentVRM = null;
      }
      
      // Dispose renderer
      if (this.renderer) {
        this.renderer.dispose();
        this.renderer = null;
      }
      
      // Clear container
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }
      
      this.scene = null;
      this.camera = null;
      this.clock = null;
      this.isInitialized = false;
      this.modelLoaded = false;
      
      console.log('VRM Renderer disposed');
    }
  }
  
  // Export the VRMRenderer class
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VRMRenderer;
  } else if (typeof define === 'function' && define.amd) {
    define([], function() { return VRMRenderer; });
  } else if (typeof global !== 'undefined') {
    global.VRMRenderer = VRMRenderer;
  }
})(typeof window !== 'undefined' ? window : this); 
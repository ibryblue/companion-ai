// AI Companion Content Script
console.log('AI Companion content script loaded');

class AICompanion {
  constructor() {
    console.log('AI Companion constructor called');
    
    // Initialize properties
    this.avatar = null;
    this.vrmAvatar = null;
    this.speechBubble = null;
    this.isEnabled = false;
    this.isMuted = false;
    this.useAI = true;
    this.useVRM = false;
    this.selectedCharacter = 'zoro';
    this.responseFrequency = 50;
    this.responseDuration = 5;
    this.selectedVrmModel = '';
    
    // Set up message listener
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Content script received message:', message);
      
      if (message.action === 'settingsUpdated' && message.settings) {
        console.log('Settings updated:', message.settings);
        this.updateSettings(message.settings);
      } else if (message.action === 'initCompanion') {
        console.log('Init companion message received');
        this.init();
      } else if (message.action === 'updateVRMModel') {
        console.log('Update VRM model message received:', message.modelName);
        
        // Store model data if provided
        if (message.modelData) {
          console.log('Model data received:', message.modelData);
          // Save the model data to local storage for persistence
          const storageData = {};
          storageData[`vrm_model_${message.modelName}`] = message.modelData;
          chrome.storage.local.set(storageData, () => {
            console.log('Model data saved to storage');
          });
        }
        
        if (this.isEnabled && this.useVRM) {
          // Store the new model name
          this.selectedVrmModel = message.modelName;
          
          // Clean up existing avatar
          if (this.vrmAvatar) {
            if (typeof this.vrmAvatar.dispose === 'function') {
              this.vrmAvatar.dispose();
            }
            this.vrmAvatar.remove();
            this.vrmAvatar = null;
          }
          
          // Create new VRM avatar
          this.createVRMAvatar().then(() => {
            // Position speech bubble if visible
            if (this.speechBubble && this.speechBubble.style.display === 'block') {
              this.positionSpeechBubble();
            }
            
            // Show confirmation message
            this.showMessage(`VRM model changed to ${message.modelName}`, {
              duration: 3000
            });
            
            sendResponse({ success: true });
          }).catch(error => {
            console.error('Error updating VRM model:', error);
            sendResponse({ success: false, error: error.message });
          });
          
          return true; // Keep the message channel open for async response
        } else {
          sendResponse({ success: false, reason: 'VRM not enabled or companion disabled' });
        }
      }
      
      sendResponse({ status: 'received' });
      return true;
    });
    
    // Initialize
    this.init();
  }
  
  // Load settings from storage
  loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['settings'], (result) => {
        if (result.settings) {
          console.log('Settings loaded from storage:', result.settings);
          
          // Apply settings
          this.isEnabled = result.settings.enabled || false;
          this.isMuted = result.settings.muted || false;
          this.useAI = result.settings.useAI !== undefined ? result.settings.useAI : true;
          this.useVRM = result.settings.useVRM || false;
          this.selectedCharacter = result.settings.selectedCharacter || 'zoro';
          this.responseFrequency = result.settings.responseFrequency || 50;
          this.responseDuration = result.settings.responseDuration || 5;
          this.selectedVrmModel = result.settings.selectedVrmModel || '';
          
          console.log('Companion enabled:', this.isEnabled);
          console.log('VRM enabled:', this.useVRM);
        } else {
          console.log('No settings found, using defaults');
          this.isEnabled = false;
          this.isMuted = false;
          this.useAI = true;
          this.useVRM = false;
          this.selectedCharacter = 'zoro';
          this.responseFrequency = 50;
          this.responseDuration = 5;
          this.selectedVrmModel = '';
        }
        
        resolve();
      });
    });
  }
  
  // Update settings when changed from popup
  updateSettings(settings) {
    console.log('Updating settings:', settings);
    
    let needsReinit = false;
    
    // Check if companion enabled state changed
    if (this.isEnabled !== settings.enabled) {
      this.isEnabled = settings.enabled;
      needsReinit = true;
    }
    
    // Check if VRM state changed
    if (this.useVRM !== settings.useVRM) {
      this.useVRM = settings.useVRM;
      needsReinit = true;
    }
    
    // Update other settings
    this.isMuted = settings.muted;
    this.useAI = settings.useAI;
    this.selectedCharacter = settings.selectedCharacter;
    
    // Check if VRM model changed
    if (this.selectedVrmModel !== settings.selectedVrmModel && settings.selectedVrmModel) {
      this.selectedVrmModel = settings.selectedVrmModel;
      if (this.useVRM) {
        needsReinit = true;
      }
    }
    
    // Update response settings
    this.responseFrequency = settings.responseFrequency;
    this.responseDuration = settings.responseDuration;
    
    console.log('Settings updated, needs reinit:', needsReinit);
    
    // Reinitialize if needed
    if (needsReinit) {
      if (this.isEnabled) {
        this.cleanup();
        this.init();
      } else {
        this.cleanup();
      }
    }
  }
  
  // Initialize the companion
  async init() {
    console.log('Initializing AI companion...');
    
    try {
      await this.loadSettings();
      
      if (this.isEnabled) {
        console.log('Companion is enabled, creating avatar');
        
        // Clean up any existing elements first
        this.cleanup();
        
        // Create avatar based on settings
        if (this.useVRM && this.selectedVrmModel) {
          console.log('Using VRM model:', this.selectedVrmModel);
          await this.createVRMAvatar();
        } else {
          console.log('Using standard avatar:', this.selectedCharacter);
          this.createAvatar();
        }
        
        // Create speech bubble
        this.createSpeechBubble();
        
        // Make avatar draggable
        this.makeAvatarDraggable();
        
        // Add event listeners after elements are created
        setTimeout(() => {
          console.log('Adding event listeners after elements are created');
          this.addEventListeners();
        }, 100);
      } else {
        console.log('Companion is disabled, not creating avatar');
        // Make sure we clean up any existing elements
        this.cleanup();
      }
    } catch (error) {
      console.error('Error initializing companion:', error);
    }
  }
  
  // Clean up companion elements
  cleanup() {
    console.log('Cleaning up AI Companion');
    
    // Remove avatar
    if (this.avatar) {
      this.avatar.remove();
      this.avatar = null;
    }
    
    // Remove VRM avatar
    if (this.vrmAvatar) {
      // Clean up Three.js resources
      if (typeof this.vrmAvatar.dispose === 'function') {
        this.vrmAvatar.dispose();
      } else {
        // Just remove the element if dispose function is not available
        this.vrmAvatar.remove();
      }
      this.vrmAvatar = null;
    }
    
    // Remove speech bubble
    if (this.speechBubble) {
      this.speechBubble.remove();
      this.speechBubble = null;
    }
  }
  
  // Create standard avatar
  createAvatar() {
    console.log('Creating standard avatar for character:', this.selectedCharacter);
    
    // Remove existing avatar if any
    if (this.avatar) {
      this.avatar.remove();
    }
    
    // Create avatar element
    this.avatar = document.createElement('div');
    this.avatar.className = 'ai-companion-avatar';
    this.avatar.style.position = 'fixed';
    this.avatar.style.bottom = '20px';
    this.avatar.style.right = '20px';
    this.avatar.style.width = '90px';
    this.avatar.style.height = '90px';
    this.avatar.style.borderRadius = '0';
    this.avatar.style.border = 'none';
    
    // Get the image URL
    const imageUrl = chrome.runtime.getURL(`images/avatars/${this.selectedCharacter.toLowerCase()}.gif`);
    console.log('Avatar image URL:', imageUrl);
    
    this.avatar.style.backgroundImage = `url(${imageUrl})`;
    this.avatar.style.backgroundSize = 'cover';
    this.avatar.style.backgroundPosition = 'center';
    this.avatar.style.cursor = 'pointer';
    this.avatar.style.zIndex = '9999';
    this.avatar.style.boxShadow = 'none';
    this.avatar.style.transition = 'all 0.3s ease';
    
    // Add hover effect
    this.avatar.addEventListener('mouseenter', () => {
      this.avatar.style.transform = 'scale(1.1)';
    });
    
    this.avatar.addEventListener('mouseleave', () => {
      this.avatar.style.transform = 'scale(1)';
    });
    
    // Make avatar draggable
    this.makeDraggable(this.avatar);
    
    // Add to page
    document.body.appendChild(this.avatar);
    console.log('Avatar added to page');
  }
  
  // Initialize VRM avatar
  async createVRMAvatar() {
    console.log('Creating VRM avatar with model:', this.selectedVrmModel);
    
    try {
      // Create a container for the VRM avatar
      const container = document.createElement('div');
      container.id = 'ai-companion-vrm';
      container.style.position = 'fixed';
      container.style.bottom = '20px';
      container.style.right = '20px';
      container.style.width = '320px'; // Updated to recommended size
      container.style.height = '480px'; // Updated to recommended size
      container.style.zIndex = '10000';
      container.style.cursor = 'pointer';
      container.style.borderRadius = '0';
      container.style.overflow = 'hidden';
      container.style.boxShadow = 'none';
      container.style.border = 'none';
      
      document.body.appendChild(container);
      this.vrmAvatar = container;
      
      // Load Three.js and VRM libraries
      try {
        await this.loadThreeJsLibraries();
      } catch (error) {
        console.error('Failed to load Three.js libraries:', error);
        this.createFallbackVRMAvatar();
        return;
      }
      
      // Check if THREE is available
      if (!window.THREE) {
        console.error('THREE is not defined after loading libraries');
        this.createFallbackVRMAvatar();
        return;
      }
      
      // Create basic Three.js scene
      const THREE = window.THREE;
      const scene = new THREE.Scene();
      
      // Create camera
      const camera = new THREE.PerspectiveCamera(
        45,
        320/480, // Updated aspect ratio
        0.1,
        1000
      );
      camera.position.set(0.0, 1.0, 5.0);
      camera.lookAt(0.0, 1.0, 0.0);
      
      // Create renderer
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true
        });
        renderer.setSize(320, 480); // Updated to recommended size
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setClearColor(0x000000, 0);
      } catch (error) {
        console.error('Failed to create WebGL renderer:', error);
        this.createFallbackVRMAvatar();
        return;
      }
      
      // Clear container
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      
      // Add renderer to container
      container.appendChild(renderer.domElement);
      
      // Add lights
      const light = new THREE.DirectionalLight(0xffffff, Math.PI);
      light.position.set(1.0, 1.0, 1.0).normalize();
      scene.add(light);
      
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      
      // Determine model URL
      let modelUrl;
      if (this.selectedVrmModel === 'Sample VRM') {
        // Use direct URL to the sample VRM file
        modelUrl = chrome.runtime.getURL('models/7062840423830520603.vrm');
        console.log('Using sample VRM model:', modelUrl);
      } else {
        // For other models, try to load from storage
        try {
          // Get the model data from storage
          const result = await new Promise(resolve => {
            chrome.storage.local.get(['settings'], resolve);
          });
          
          const settings = result.settings || {};
          const vrmModels = settings.vrmModels || [];
          
          // Find the selected model in the list
          const selectedModel = vrmModels.find(model => model.name === this.selectedVrmModel);
          
          if (!selectedModel) {
            console.error('Selected VRM model not found in settings:', this.selectedVrmModel);
            // Fall back to the sample model
            modelUrl = chrome.runtime.getURL('models/7062840423830520603.vrm');
            console.log('Falling back to sample VRM model');
          } else {
            // Use the URL from the model data
            console.log('Found model in settings:', selectedModel);
            modelUrl = selectedModel.url;
          }
        } catch (error) {
          console.error('Error loading model from settings:', error);
          // Fall back to the sample model
          modelUrl = chrome.runtime.getURL('models/7062840423830520603.vrm');
          console.log('Falling back to sample VRM model due to error');
        }
      }
      
      // Verify model URL
      console.log('Final model URL:', modelUrl);
      
      // Create and configure loader
      const loader = new THREE.GLTFLoader();
      loader.crossOrigin = 'anonymous';
      
      // Register VRM plugin
      if (window.THREE.VRMLoaderPlugin) {
        console.log('Using THREE.VRMLoaderPlugin');
        loader.register((parser) => {
          return new THREE.VRMLoaderPlugin(parser);
        });
      } else if (window.VRMLoaderPlugin) {
        console.log('Using global VRMLoaderPlugin');
        loader.register((parser) => {
          return new window.VRMLoaderPlugin(parser);
        });
      } else {
        console.warn('VRMLoaderPlugin not available');
      }
      
      // Create clock for animation
      const clock = new THREE.Clock();
      clock.start();
      
      // Current VRM model
      let currentVRM = null;
      
      // Load the model
      console.log('Loading VRM model from URL:', modelUrl);
      console.log('THREE.js version:', window.THREE ? window.THREE.REVISION : 'not loaded');
      console.log('VRMLoaderPlugin available:', !!window.VRMLoaderPlugin || !!window.THREE.VRMLoaderPlugin);
      
      loader.load(
        modelUrl,
        (gltf) => {
          console.log('VRM model loaded:', gltf);
          console.log('VRM model userData:', gltf.userData);
          
          // Check if we have VRM in userData
          if (gltf.userData && gltf.userData.vrm) {
            currentVRM = gltf.userData.vrm;
            console.log('VRM found in userData:', currentVRM);
            console.log('VRM version:', currentVRM.meta ? currentVRM.meta.version : 'unknown');
            
            // Apply VRM optimizations if available
            if (window.THREE.VRMUtils) {
              console.log('Applying VRM optimizations');
              window.THREE.VRMUtils.removeUnnecessaryVertices(gltf.scene);
              window.THREE.VRMUtils.combineSkeletons(gltf.scene);
              window.THREE.VRMUtils.combineMorphs(currentVRM);
              
              // Disable frustum culling
              currentVRM.scene.traverse((obj) => {
                obj.frustumCulled = false;
              });
              
              // Rotate if it's VRM 0.0
              if (window.THREE.VRMUtils.rotateVRM0) {
                window.THREE.VRMUtils.rotateVRM0(currentVRM);
              }
            }
            
            // Add to scene
            scene.add(currentVRM.scene);
            
            // Center the model
            centerModel(currentVRM.scene);
            
            console.log('VRM model ready');
          } else {
            // Fallback to just using the GLTF scene
            console.log('No VRM in userData, using raw gltf scene');
            currentVRM = {
              scene: gltf.scene,
              update: null
            };
            scene.add(gltf.scene);
            
            // Center the model
            centerModel(gltf.scene);
          }
        },
        (progress) => {
          const percent = progress.total > 0 ? Math.round(progress.loaded / progress.total * 100) : 0;
          console.log(`Loading model: ${percent}%`);
        },
        (error) => {
          console.error('Error loading VRM model:', error);
          this.createSimple3DAvatar(container);
        }
      );
      
      // Center model function
      const centerModel = (modelScene) => {
        try {
          // Create a bounding box
          const bbox = new THREE.Box3().setFromObject(modelScene);
          const size = bbox.getSize(new THREE.Vector3());
          const center = bbox.getCenter(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          
          if (maxDim > 0) {
            // Scale the model to fit
            const scale = 1.5 / maxDim;
            modelScene.scale.set(scale, scale, scale);
            
            // Center the model
            modelScene.position.x = -center.x * scale;
            modelScene.position.y = -center.y * scale + 0.7; // Adjust to show more of the upper body
            modelScene.position.z = -center.z * scale;
          }
        } catch (error) {
          console.error('Error centering model:', error);
        }
      };
      
      // Animation function
      let animationFrame;
      const animate = () => {
        animationFrame = requestAnimationFrame(animate);
        
        const delta = clock.getDelta();
        
        // Update VRM model
        if (currentVRM && currentVRM.update && typeof currentVRM.update === 'function') {
          try {
            currentVRM.update(delta);
          } catch (error) {
            console.error('Error updating VRM:', error);
          }
        }
        
        // Slowly rotate the model
        if (currentVRM && currentVRM.scene) {
          currentVRM.scene.rotation.y += 0.005;
        }
        
        // Render scene
        renderer.render(scene, camera);
      };
      
      // Start animation
      animate();
      
      // Store cleanup function
      this.vrmAvatar.dispose = () => {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
        
        if (currentVRM) {
          if (currentVRM.scene) {
            scene.remove(currentVRM.scene);
          }
          
          if (typeof currentVRM.dispose === 'function') {
            currentVRM.dispose();
          }
        }
        
        renderer.dispose();
        
        if (modelUrl.startsWith('blob:')) {
          URL.revokeObjectURL(modelUrl);
        }
        
        // Clear container
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      };
      
      console.log('VRM avatar created successfully');
      
      // Position speech bubble if it exists
      if (this.speechBubble) {
        this.positionSpeechBubble();
      }
    } catch (error) {
      console.error('Error creating VRM avatar:', error);
      
      // Clean up any partial setup
      if (this.vrmAvatar) {
        if (typeof this.vrmAvatar.dispose === 'function') {
          this.vrmAvatar.dispose();
        }
        this.vrmAvatar.remove();
      }
      
      // Create fallback avatar
      console.log('Creating fallback avatar due to error');
      this.createFallbackVRMAvatar();
    }
  }
  
  // Create a simple 3D avatar using basic Three.js
  createSimple3DAvatar(container) {
    console.log('Creating simple 3D avatar');
    
    try {
      // Check if container exists, if not create one
      if (!container) {
        container = document.createElement('div');
        container.id = 'ai-companion-vrm';
        container.style.position = 'fixed';
        container.style.bottom = '20px';
        container.style.right = '20px';
        container.style.width = '320px'; // Updated to recommended size
        container.style.height = '480px'; // Updated to recommended size
        container.style.zIndex = '10000';
        container.style.cursor = 'pointer';
        container.style.borderRadius = '0';
        container.style.overflow = 'hidden';
        container.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        document.body.appendChild(container);
        this.vrmAvatar = container;
      }
      
      if (!window.THREE) {
        throw new Error('THREE is not available');
      }
      
      const THREE = window.THREE;
      
      // Create scene
      const scene = new THREE.Scene();
      
      // Create camera
      const camera = new THREE.PerspectiveCamera(
        45,
        320/480, // Updated aspect ratio
        0.1,
        1000
      );
      camera.position.z = 5;
      
      // Create renderer
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true
      });
      renderer.setSize(320, 480); // Updated to recommended size
      renderer.setClearColor(0x000000, 0); // Transparent background
      
      // Clear container
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      
      // Add renderer to container
      container.appendChild(renderer.domElement);
      
      // Add lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);
      
      // Create a simple avatar (rotating cube with gradient material)
      const geometry = new THREE.BoxGeometry(2, 2, 2);
      
      // Create gradient texture
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 128);
      gradient.addColorStop(0, '#3498db');
      gradient.addColorStop(1, '#2980b9');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
      
      // Add a simple face to the cube
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(64, 50, 30, 0, Math.PI * 2); // Face
      ctx.fill();
      
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(50, 45, 5, 0, Math.PI * 2); // Left eye
      ctx.arc(78, 45, 5, 0, Math.PI * 2); // Right eye
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(64, 70, 15, 0, Math.PI); // Smile
      ctx.stroke();
      
      // Create texture and material
      const texture = new THREE.CanvasTexture(canvas);
      const materials = [
        new THREE.MeshLambertMaterial({ color: 0x3498db }),
        new THREE.MeshLambertMaterial({ color: 0x3498db }),
        new THREE.MeshLambertMaterial({ color: 0x3498db }),
        new THREE.MeshLambertMaterial({ color: 0x3498db }),
        new THREE.MeshLambertMaterial({ map: texture }), // Front face with the smile
        new THREE.MeshLambertMaterial({ color: 0x3498db })
      ];
      
      const cube = new THREE.Mesh(geometry, materials);
      scene.add(cube);
      
      // Animation
      let animationId;
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        
        cube.rotation.y += 0.01;
        cube.rotation.x += 0.005;
        
        renderer.render(scene, camera);
      };
      
      animate();
      
      // Store cleanup function
      this.vrmAvatar.dispose = () => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
        
        geometry.dispose();
        materials.forEach(material => material.dispose());
        texture.dispose();
        renderer.dispose();
        
        // Clear container
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      };
      
      console.log('Simple 3D avatar created successfully');
    } catch (error) {
      console.error('Error creating simple 3D avatar:', error);
      this.createFallbackVRMAvatar();
    }
  }
  
  // Load Three.js and VRM libraries
  async loadThreeJsLibraries() {
    try {
      console.log('Loading Three.js and VRM libraries');
      
      // Load the bundled JavaScript from dist directory
      const bundlePath = chrome.runtime.getURL('dist/vrm-bundle.js');
      console.log('Loading bundle from:', bundlePath);
      
      // First check if THREE is already defined
      if (window.THREE) {
        console.log('THREE is already defined, using existing instance');
        return;
      }
      
      // Load the script
      await this.loadScript(bundlePath);
      console.log('Bundle script loaded, waiting for initialization');
      
      // Wait for bundle to be initialized with a longer timeout
      await new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 20;
        
        const checkThree = () => {
          attempts++;
          if (window.THREE) {
            console.log('THREE.js loaded successfully after', attempts, 'attempts');
            resolve();
          } else if (attempts >= maxAttempts) {
            reject(new Error('THREE.js failed to load after multiple attempts'));
          } else {
            console.log('Waiting for THREE.js to load, attempt', attempts);
            setTimeout(checkThree, 200);
          }
        };
        
        checkThree();
      });
      
      // Verify that the necessary objects exist
      if (!window.THREE) {
        console.error('THREE is not defined after loading libraries');
        throw new Error('THREE is not available');
      } else {
        console.log('THREE is available:', typeof window.THREE);
        
        if (window.THREE.GLTFLoader) {
          console.log('GLTFLoader is available');
        } else {
          console.error('GLTFLoader is not available');
        }
        
        if (window.VRMLoaderPlugin) {
          console.log('VRMLoaderPlugin is available');
        } else if (window.THREE.VRMLoaderPlugin) {
          console.log('THREE.VRMLoaderPlugin is available');
        } else {
          console.warn('VRMLoaderPlugin is not available');
        }
        
        if (window.VRMUtils) {
          console.log('VRMUtils is available');
        } else if (window.THREE.VRMUtils) {
          console.log('THREE.VRMUtils is available');
        } else {
          console.warn('VRMUtils is not available');
        }
      }
    } catch (error) {
      console.error('Error loading Three.js libraries:', error);
      throw error;
    }
  }
  
  // Load a script dynamically with better error handling
  loadScript(src) {
    return new Promise((resolve, reject) => {
      console.log(`Loading script: ${src}`);
      
      // Check if script is already loaded
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        console.log(`Script already exists: ${src}`);
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      
      // Set timeout to detect loading issues
      const timeoutId = setTimeout(() => {
        console.warn(`Script loading timeout: ${src}`);
        // Don't reject, just continue
        resolve();
      }, 5000);
      
      script.onload = () => {
        console.log(`Script loaded successfully: ${src}`);
        clearTimeout(timeoutId);
        resolve();
      };
      
      script.onerror = (e) => {
        console.error(`Failed to load script: ${src}`, e);
        clearTimeout(timeoutId);
        // Don't reject to allow fallback rendering
        resolve();
      };
      
      document.head.appendChild(script);
    });
  }
  
  // Create a fallback VRM avatar if 3D rendering fails
  createFallbackVRMAvatar() {
    console.log('Creating fallback VRM avatar');
    
    // Create container
    this.vrmAvatar = document.createElement('div');
    this.vrmAvatar.id = 'ai-companion-vrm';
    this.vrmAvatar.style.position = 'fixed';
    this.vrmAvatar.style.bottom = '20px';
    this.vrmAvatar.style.right = '20px';
    this.vrmAvatar.style.width = '320px'; // Updated to recommended size
    this.vrmAvatar.style.height = '480px'; // Updated to recommended size
    this.vrmAvatar.style.zIndex = '10000';
    this.vrmAvatar.style.cursor = 'pointer';
    
    document.body.appendChild(this.vrmAvatar);
    
    // Create fallback display
    const fallbackContainer = document.createElement('div');
    fallbackContainer.style.width = '100%';
    fallbackContainer.style.height = '100%';
    fallbackContainer.style.borderRadius = '0'; // Removed circular border
    fallbackContainer.style.overflow = 'hidden';
    fallbackContainer.style.backgroundColor = '#3498db';
    fallbackContainer.style.display = 'flex';
    fallbackContainer.style.flexDirection = 'column';
    fallbackContainer.style.alignItems = 'center';
    fallbackContainer.style.justifyContent = 'center';
    fallbackContainer.style.color = 'white';
    fallbackContainer.style.fontWeight = 'bold';
    fallbackContainer.style.boxShadow = 'none';
    fallbackContainer.style.border = 'none';
    
    const icon = document.createElement('div');
    icon.textContent = '3D';
    icon.style.fontSize = '24px';
    icon.style.marginBottom = '4px';
    
    const label = document.createElement('div');
    label.textContent = 'VRM Avatar';
    label.style.fontSize = '12px';
    
    const errorMsg = document.createElement('div');
    errorMsg.textContent = 'Rendering failed';
    errorMsg.style.fontSize = '10px';
    errorMsg.style.opacity = '0.8';
    errorMsg.style.marginTop = '2px';
    
    fallbackContainer.appendChild(icon);
    fallbackContainer.appendChild(label);
    fallbackContainer.appendChild(errorMsg);
    this.vrmAvatar.appendChild(fallbackContainer);
    
    // Add simple dispose method
    this.vrmAvatar.dispose = () => {
      this.vrmAvatar.remove();
    };
    
    // Show error message
    setTimeout(() => {
      if (this.isEnabled && this.vrmAvatar) {
        this.showMessage('Could not render 3D model. Using fallback avatar instead.', {
          duration: 5000
        });
      }
    }, 1000);
  }
  
  // Create speech bubble
  createSpeechBubble() {
    console.log('Creating speech bubble with glassmorphism style');
    
    // Remove existing speech bubble if any
    if (this.speechBubble) {
      this.speechBubble.remove();
    }
    
    // Add animation keyframes to document if not already added
    if (!document.getElementById('ai-companion-animations')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'ai-companion-animations';
      styleSheet.textContent = `
        @keyframes bubbleIn {
          0% { opacity: 0; transform: scale(0.9); }
          70% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        
        @keyframes bubbleOut {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.9); }
        }
        
        @keyframes typingAnimation {
          0%, 100% { transform: scale(0.7); }
          50% { transform: scale(1); }
        }
      `;
      document.head.appendChild(styleSheet);
    }
    
    // Create speech bubble element
    this.speechBubble = document.createElement('div');
    this.speechBubble.className = 'ai-companion-speech-bubble';
    this.speechBubble.setAttribute('role', 'dialog');
    this.speechBubble.setAttribute('aria-live', 'polite');
    this.speechBubble.setAttribute('aria-label', 'AI Companion message');
    this.speechBubble.style.position = 'fixed';
    this.speechBubble.style.maxWidth = '280px';
    this.speechBubble.style.padding = '12px 16px';
    this.speechBubble.style.borderRadius = '16px';
    this.speechBubble.style.fontSize = '14px';
    this.speechBubble.style.zIndex = '9999';
    this.speechBubble.style.display = 'none';
    
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      this.speechBubble.style.animation = 'bubbleIn 0.3s ease-out forwards';
    } else {
      this.speechBubble.style.transition = 'none';
    }
    
    // Glassmorphism style
    this.speechBubble.style.background = 'rgba(255, 255, 255, 0.1)';
    this.speechBubble.style.backdropFilter = 'blur(10px)';
    this.speechBubble.style.webkitBackdropFilter = 'blur(10px)'; // For Safari
    this.speechBubble.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    this.speechBubble.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
    
    // Check if dark mode is enabled
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (isDarkMode) {
      this.speechBubble.style.color = 'white';
      this.speechBubble.style.background = 'rgba(30, 30, 30, 0.8)';
      this.speechBubble.style.border = '1px solid rgba(255, 255, 255, 0.1)';
    } else {
      this.speechBubble.style.color = '#333';
    }
    
    // Check for high contrast mode
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    if (prefersHighContrast) {
      this.speechBubble.style.background = isDarkMode ? '#000' : '#fff';
      this.speechBubble.style.color = isDarkMode ? '#fff' : '#000';
      this.speechBubble.style.border = '2px solid currentColor';
      this.speechBubble.style.backdropFilter = 'none';
      this.speechBubble.style.webkitBackdropFilter = 'none';
    }
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.setAttribute('aria-label', 'Close message');
    closeButton.style.position = 'absolute';
    closeButton.style.top = '8px';
    closeButton.style.right = '10px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontSize = '16px';
    closeButton.style.lineHeight = '1';
    closeButton.style.opacity = '0.7';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.color = 'inherit';
    closeButton.style.padding = '0';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => {
      this.hideSpeechBubble();
    });
    
    // Create progress bar for auto-hide countdown
    const progressBar = document.createElement('div');
    progressBar.className = 'ai-companion-progress-bar';
    progressBar.setAttribute('role', 'timer');
    progressBar.setAttribute('aria-hidden', 'true');
    progressBar.style.position = 'absolute';
    progressBar.style.bottom = '0';
    progressBar.style.left = '0';
    progressBar.style.height = '2px';
    progressBar.style.width = '100%';
    progressBar.style.backgroundColor = isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)';
    progressBar.style.transformOrigin = 'left';
    progressBar.style.transform = 'scaleX(0)';
    
    if (prefersReducedMotion) {
      progressBar.style.transition = 'none';
    }
    
    // Create content container
    const contentContainer = document.createElement('div');
    contentContainer.className = 'ai-companion-content';
    contentContainer.style.marginRight = '10px'; // Space for close button
    
    // Add elements to speech bubble
    this.speechBubble.appendChild(closeButton);
    this.speechBubble.appendChild(contentContainer);
    this.speechBubble.appendChild(progressBar);
    
    // Add to page
    document.body.appendChild(this.speechBubble);
    
    // Store content container reference
    this.speechBubbleContent = contentContainer;
    this.progressBar = progressBar;
    
    console.log('Glassmorphism speech bubble added to page');
  }
  
  // Position speech bubble relative to avatar
  positionSpeechBubble() {
    if (!this.speechBubble || (!this.avatar && !this.vrmAvatar)) return;
    
    const avatarElement = this.useVRM ? this.vrmAvatar : this.avatar;
    const rect = avatarElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Reset positioning classes and styles
    this.speechBubble.classList.remove('bubble-above', 'bubble-below');
    this.speechBubble.style.bottom = null;
    this.speechBubble.style.top = null;
    this.speechBubble.style.left = null;
    this.speechBubble.style.right = null;
    
    // Remove any existing pointer
    const existingPointer = this.speechBubble.querySelector('.bubble-pointer');
    if (existingPointer) existingPointer.remove();
    
    // Create pointer element
    const pointer = document.createElement('div');
    pointer.className = 'bubble-pointer';
    pointer.style.position = 'absolute';
    pointer.style.width = '12px';
    pointer.style.height = '12px';
    pointer.style.background = this.speechBubble.style.background;
    pointer.style.border = this.speechBubble.style.border;
    pointer.style.borderTop = 'none';
    pointer.style.borderLeft = 'none';
    
    // Determine position based on avatar location
    if (rect.top > viewportHeight / 2) {
      // Show bubble above avatar
      this.speechBubble.style.bottom = `${viewportHeight - rect.top + 10}px`;
      this.speechBubble.classList.add('bubble-above');
      
      // Position horizontally - center over VRM avatar if using VRM
      if (this.useVRM) {
        const bubbleWidth = 280; // Approximate width of speech bubble
        const leftPosition = rect.left + (rect.width / 2) - (bubbleWidth / 2);
        this.speechBubble.style.left = `${Math.max(10, leftPosition)}px`;
        // Ensure bubble doesn't go off-screen to the right
        if (leftPosition + bubbleWidth > viewportWidth - 10) {
          this.speechBubble.style.left = null;
          this.speechBubble.style.right = '10px';
        }
        pointer.style.left = '50%';
        pointer.style.transform = 'translateX(-50%) rotate(45deg)';
      } else {
        // Standard positioning for regular avatar
        if (rect.left < viewportWidth / 2) {
          // Avatar on left side of screen
          this.speechBubble.style.left = `${rect.left}px`;
          pointer.style.left = '20px';
        } else {
          // Avatar on right side of screen
          this.speechBubble.style.right = `${viewportWidth - rect.right}px`;
          pointer.style.right = '20px';
        }
        pointer.style.transform = 'rotate(45deg)';
      }
      
      // Style pointer for above position
      pointer.style.bottom = '-6px';
    } else {
      // Show bubble below avatar
      if (this.useVRM) {
        // For VRM, position at the top of the avatar with enough space
        this.speechBubble.style.top = `${rect.top + 20}px`;
        
        // Center horizontally over the VRM avatar
        const bubbleWidth = 280; // Approximate width of speech bubble
        const leftPosition = rect.left + (rect.width / 2) - (bubbleWidth / 2);
        this.speechBubble.style.left = `${Math.max(10, leftPosition)}px`;
        // Ensure bubble doesn't go off-screen to the right
        if (leftPosition + bubbleWidth > viewportWidth - 10) {
          this.speechBubble.style.left = null;
          this.speechBubble.style.right = '10px';
        }
        pointer.style.left = '50%';
        pointer.style.transform = 'translateX(-50%) rotate(225deg)';
      } else {
        // Standard positioning for regular avatar
        this.speechBubble.style.top = `${rect.bottom + 10}px`;
        
        // Position horizontally
        if (rect.left < viewportWidth / 2) {
          // Avatar on left side of screen
          this.speechBubble.style.left = `${rect.left}px`;
          pointer.style.left = '20px';
        } else {
          // Avatar on right side of screen
          this.speechBubble.style.right = `${viewportWidth - rect.right}px`;
          pointer.style.right = '20px';
        }
        pointer.style.transform = 'rotate(225deg)';
      }
      
      // Style pointer for below position
      pointer.style.top = '-6px';
    }
    
    // Add pointer to speech bubble
    this.speechBubble.appendChild(pointer);
    
    // Adapt to background color
    this.adaptSpeechBubbleToBackground();
  }
  
  // Make an element draggable
  makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    element.onmousedown = dragMouseDown;
    
    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      
      // Get the mouse cursor position at startup
      pos3 = e.clientX;
      pos4 = e.clientY;
      
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      
      // Calculate the new cursor position
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      
      // Set the element's new position
      element.style.top = (element.offsetTop - pos2) + "px";
      element.style.left = (element.offsetLeft - pos1) + "px";
      element.style.bottom = 'auto';
      element.style.right = 'auto';
    }
    
    function closeDragElement() {
      // Stop moving when mouse button is released
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }
  
  // Add event listeners
  addEventListeners() {
    console.log('Adding event listeners');
    
    // Avatar click event
    if (this.avatar || this.vrmAvatar) {
      const avatarElement = this.useVRM ? this.vrmAvatar : this.avatar;
      
      // Make sure the avatar element exists before adding event listener
      if (avatarElement) {
        console.log('Adding click event listener to avatar');
        avatarElement.addEventListener('click', () => {
          console.log('Avatar clicked');
          
          // Show greeting with actions
          this.showMessage('Hello! How can I help you today?', {
            showTyping: true,
            duration: 8000,
            actions: [
              {
                text: 'Tell me about this page',
                callback: () => {
                  this.showMessage('This is a webpage you are currently browsing. I can help you navigate or find information.', {
                    showTyping: true
                  });
                }
              },
              {
                text: 'What can you do?',
                callback: () => {
                  this.showMessage('I can provide information, answer questions, or just keep you company while browsing!', {
                    showTyping: true
                  });
                }
              }
            ]
          });
        });
      } else {
        console.warn('Avatar element is null, cannot add click event listener');
      }
    } else {
      console.warn('No avatar or vrmAvatar found, skipping click event listener');
    }
    
    // Scroll event
    window.addEventListener('scroll', () => {
      // Only respond if enabled and based on frequency setting
      if (!this.isEnabled || Math.random() > this.getResponseProbability()) {
        return;
      }
      
      // Show a random message on scroll
      const scrollMessages = [
        "I see you're scrolling!",
        "Finding what you need?",
        "Need any help navigating?",
        "Just let me know if you need assistance!"
      ];
      
      const randomMessage = scrollMessages[Math.floor(Math.random() * scrollMessages.length)];
      this.showMessage(randomMessage, { duration: 3000 });
    });
    
    // Window resize event for repositioning
    window.addEventListener('resize', () => {
      if (this.speechBubble && this.speechBubble.style.display === 'block') {
        this.positionSpeechBubble();
      }
    });
  }
  
  // Get response probability based on frequency setting
  getResponseProbability() {
    // Convert the numeric frequency (0-100) to a probability (0-1)
    return this.responseFrequency / 100;
  }
  
  // Add keyboard navigation for speech bubble
  setupKeyboardNavigation() {
    // Only add listeners if not already set up
    if (this.keyboardNavigationSetup) return;
    
    // Add keydown event listener to handle keyboard navigation
    document.addEventListener('keydown', (e) => {
      // Only handle if speech bubble is visible
      if (!this.speechBubble || this.speechBubble.style.display !== 'block') return;
      
      // ESC key closes the speech bubble
      if (e.key === 'Escape') {
        this.hideSpeechBubble();
        e.preventDefault();
      }
      
      // Tab key for navigating between action buttons
      if (e.key === 'Tab') {
        const focusableElements = this.speechBubble.querySelectorAll('button');
        if (focusableElements.length > 0) {
          // If shift+tab, move focus backward
          if (e.shiftKey) {
            // If first element is focused, loop to last element
            if (document.activeElement === focusableElements[0]) {
              focusableElements[focusableElements.length - 1].focus();
              e.preventDefault();
            }
          } else {
            // If last element is focused, loop to first element
            if (document.activeElement === focusableElements[focusableElements.length - 1]) {
              focusableElements[0].focus();
              e.preventDefault();
            }
          }
        }
      }
    });
    
    this.keyboardNavigationSetup = true;
  }
  
  // Show a message in the speech bubble
  showMessage(message, options = {}) {
    console.log('Showing message:', message);
    
    if (!this.isEnabled || this.isMuted || !this.speechBubble) {
      console.log('Cannot show message - companion disabled, muted, or no speech bubble');
      return;
    }
    
    // Ensure keyboard navigation is set up
    this.setupKeyboardNavigation();
    
    // Clear any existing timers
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
    }
    
    // Position the speech bubble relative to avatar
    this.positionSpeechBubble();
    
    // Add special class if using VRM
    if (this.useVRM && this.vrmAvatar) {
      this.speechBubble.classList.add('vrm-speech-bubble');
    } else {
      this.speechBubble.classList.remove('vrm-speech-bubble');
    }
    
    // Set message text
    if (this.speechBubbleContent) {
      // Check if we should show typing indicator first
      if (options.showTyping) {
        this.showTypingIndicator().then(() => {
          this.displayFinalMessage(message, options);
        });
      } else {
        this.displayFinalMessage(message, options);
      }
    }
  }
  
  // Hide the speech bubble
  hideSpeechBubble() {
    if (!this.speechBubble) return;
    
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (!prefersReducedMotion) {
      this.speechBubble.style.animation = 'bubbleOut 0.2s ease-in forwards';
    } else {
      this.speechBubble.style.opacity = '0';
    }
    
    setTimeout(() => {
      this.speechBubble.style.display = 'none';
      
      // Reset progress bar
      if (this.progressBar) {
        this.progressBar.style.transition = 'none';
        this.progressBar.style.transform = 'scaleX(0)';
      }
    }, 200);
    
    // Clear any existing timers
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
    }
  }
  
  // Show typing indicator
  showTypingIndicator() {
    return new Promise(resolve => {
      if (!this.speechBubbleContent) {
        resolve();
        return;
      }
      
      // Create typing indicator
      const typingIndicator = document.createElement('div');
      typingIndicator.className = 'typing-indicator';
      typingIndicator.style.display = 'flex';
      typingIndicator.style.alignItems = 'center';
      typingIndicator.style.gap = '4px';
      
      // Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      // Create dots
      for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.style.width = '6px';
        dot.style.height = '6px';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = 'currentColor';
        dot.style.opacity = '0.7';
        
        if (!prefersReducedMotion) {
          dot.style.animation = `typingAnimation 1.4s infinite ease-in-out ${i * 0.2}s`;
        }
        
        typingIndicator.appendChild(dot);
      }
      
      // Clear previous content
      this.speechBubbleContent.innerHTML = '';
      this.speechBubbleContent.appendChild(typingIndicator);
      
      // Show speech bubble
      this.speechBubble.style.display = 'block';
      
      if (!prefersReducedMotion) {
        this.speechBubble.style.animation = 'bubbleIn 0.3s ease-out forwards';
      } else {
        this.speechBubble.style.opacity = '1';
      }
      
      // Resolve after a short delay to simulate typing
      setTimeout(resolve, 1500);
    });
  }
  
  // Display the final message
  displayFinalMessage(message, options = {}) {
    if (!this.speechBubbleContent || !this.speechBubble) return;
    
    // Set duration
    const duration = options.duration || this.responseDuration * 1000;
    
    // Clear previous content
    this.speechBubbleContent.innerHTML = '';
    
    // Add message text
    this.speechBubbleContent.textContent = message;
    
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Show speech bubble if not already visible
    if (this.speechBubble.style.display !== 'block') {
      this.speechBubble.style.display = 'block';
      
      if (!prefersReducedMotion) {
        this.speechBubble.style.animation = 'bubbleIn 0.3s ease-out forwards';
      } else {
        this.speechBubble.style.opacity = '1';
      }
    }
    
    // Add action buttons if provided
    if (options.actions && options.actions.length) {
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'speech-bubble-actions';
      actionsContainer.setAttribute('role', 'group');
      actionsContainer.setAttribute('aria-label', 'Available actions');
      actionsContainer.style.display = 'flex';
      actionsContainer.style.gap = '8px';
      actionsContainer.style.marginTop = '10px';
      
      options.actions.forEach((action, index) => {
        const button = document.createElement('button');
        button.textContent = action.text;
        button.setAttribute('aria-label', action.text);
        button.style.background = 'rgba(255, 255, 255, 0.2)';
        button.style.border = 'none';
        button.style.borderRadius = '12px';
        button.style.padding = '4px 10px';
        button.style.fontSize = '12px';
        button.style.cursor = 'pointer';
        button.style.color = 'inherit';
        button.style.transition = 'background-color 0.2s ease';
        
        // Check for reduced motion preference
        if (prefersReducedMotion) {
          button.style.transition = 'none';
        }
        
        // Check for high contrast mode
        const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
        if (prefersHighContrast) {
          button.style.background = 'transparent';
          button.style.border = '1px solid currentColor';
        }
        
        // Add hover effect
        button.addEventListener('mouseenter', () => {
          button.style.background = 'rgba(255, 255, 255, 0.3)';
          if (prefersHighContrast) {
            button.style.background = 'transparent';
            button.style.textDecoration = 'underline';
          }
        });
        
        button.addEventListener('mouseleave', () => {
          button.style.background = 'rgba(255, 255, 255, 0.2)';
          if (prefersHighContrast) {
            button.style.background = 'transparent';
            button.style.textDecoration = 'none';
          }
        });
        
        button.addEventListener('click', () => {
          if (action.callback) action.callback();
          this.hideSpeechBubble();
        });
        
        // Add keyboard focus styles
        button.addEventListener('focus', () => {
          button.style.outline = '2px solid rgba(255, 255, 255, 0.5)';
          button.style.outlineOffset = '2px';
        });
        
        button.addEventListener('blur', () => {
          button.style.outline = 'none';
        });
        
        actionsContainer.appendChild(button);
      });
      
      this.speechBubbleContent.appendChild(document.createElement('br'));
      this.speechBubbleContent.appendChild(actionsContainer);
    }
    
    // Animate progress bar
    if (this.progressBar) {
      // Reset progress bar
      this.progressBar.style.transition = 'none';
      this.progressBar.style.transform = 'scaleX(0)';
      
      // Trigger reflow
      this.progressBar.offsetHeight;
      
      // Start animation
      if (!prefersReducedMotion) {
        this.progressBar.style.transition = `transform ${duration}ms linear`;
        this.progressBar.style.transform = 'scaleX(1)';
      } else {
        // For reduced motion, just show a static indicator
        this.progressBar.style.transform = 'scaleX(1)';
        this.progressBar.style.opacity = '0.5';
      }
    }
    
    // Hide after duration
    this.hideTimer = setTimeout(() => {
      this.hideSpeechBubble();
    }, duration);
  }
  
  makeAvatarDraggable() {
    console.log('Making avatar draggable');
    
    const element = this.useVRM ? this.vrmAvatar : this.avatar;
    if (!element) return;
    
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;
    
    element.style.cursor = 'grab';
    
    element.addEventListener('mousedown', (e) => {
      isDragging = true;
      offsetX = e.clientX - element.getBoundingClientRect().left;
      offsetY = e.clientY - element.getBoundingClientRect().top;
      element.style.cursor = 'grabbing';
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const x = e.clientX - offsetX;
      const y = e.clientY - offsetY;
      
      element.style.left = `${x}px`;
      element.style.right = 'auto';
      element.style.top = `${y}px`;
      element.style.bottom = 'auto';
      
      // Reposition speech bubble if visible
      if (this.speechBubble && this.speechBubble.style.display === 'block') {
        this.positionSpeechBubble();
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        element.style.cursor = 'grab';
        
        // Final reposition of speech bubble
        if (this.speechBubble && this.speechBubble.style.display === 'block') {
          this.positionSpeechBubble();
        }
      }
    });
  }
  
  // Detect background color and adapt speech bubble
  adaptSpeechBubbleToBackground() {
    if (!this.speechBubble) return;
    
    try {
      // Get the element behind the speech bubble
      const bubbleRect = this.speechBubble.getBoundingClientRect();
      const centerX = bubbleRect.left + bubbleRect.width / 2;
      const centerY = bubbleRect.top + bubbleRect.height / 2;
      
      // Create a temporary element to detect background
      const detector = document.createElement('div');
      detector.style.position = 'fixed';
      detector.style.left = `${centerX}px`;
      detector.style.top = `${centerY}px`;
      detector.style.width = '1px';
      detector.style.height = '1px';
      detector.style.pointerEvents = 'none';
      document.body.appendChild(detector);
      
      // Get background color
      const bgColor = window.getComputedStyle(detector).backgroundColor;
      document.body.removeChild(detector);
      
      // Parse the RGB values
      const rgbMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);
        
        // Calculate brightness (simple formula)
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        // Adjust bubble style based on background brightness
        if (brightness > 125) {
          // Light background
          this.speechBubble.style.background = 'rgba(255, 255, 255, 0.7)';
          this.speechBubble.style.color = '#333';
          this.speechBubble.style.border = '1px solid rgba(0, 0, 0, 0.1)';
          
          // Update pointer if exists
          const pointer = this.speechBubble.querySelector('.bubble-pointer');
          if (pointer) {
            pointer.style.background = 'rgba(255, 255, 255, 0.7)';
            pointer.style.border = '1px solid rgba(0, 0, 0, 0.1)';
            pointer.style.borderTop = 'none';
            pointer.style.borderLeft = 'none';
          }
        } else {
          // Dark background
          this.speechBubble.style.background = 'rgba(40, 40, 40, 0.7)';
          this.speechBubble.style.color = '#fff';
          this.speechBubble.style.border = '1px solid rgba(255, 255, 255, 0.1)';
          
          // Update pointer if exists
          const pointer = this.speechBubble.querySelector('.bubble-pointer');
          if (pointer) {
            pointer.style.background = 'rgba(40, 40, 40, 0.7)';
            pointer.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            pointer.style.borderTop = 'none';
            pointer.style.borderLeft = 'none';
          }
        }
      }
    } catch (error) {
      console.error('Error adapting speech bubble to background:', error);
    }
  }
}

// Initialize AI Companion if not already present
console.log('Initializing AI Companion...');
try {
  if (!window.aiCompanion) {
    window.aiCompanion = new AICompanion();
    console.log('AI Companion initialized');
  } else {
    console.log('AI Companion already exists');
  }
} catch (error) {
  console.error('Error initializing AI Companion:', error);
}

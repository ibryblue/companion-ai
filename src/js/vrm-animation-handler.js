/**
 * VRM Animation Handler
 * Handles loading and applying animations to VRM models
 */

class VRMAnimationHandler {
  /**
   * Create a new VRM Animation Handler
   * @param {Object} vrmViewer - The VRM viewer instance that contains the VRM model
   * @param {Function} statusCallback - Function to call with status updates
   * @param {Function} errorCallback - Function to call with error messages
   */
  constructor(vrmViewer, statusCallback = null, errorCallback = null) {
    this.vrmViewer = vrmViewer;
    this.statusCallback = statusCallback;
    this.errorCallback = errorCallback;
    
    // Animation state
    this.animationMixer = null;
    this.currentAction = null;
    this.animations = [];
    this.fallbackAnimation = null;
    
    // Default settings
    this.autoplay = true;
    this.loop = THREE.LoopRepeat;
  }
  
  /**
   * Call the status callback if set
   * @param {string} message - Status message
   * @param {string} type - Status type (info, success, error, warning)
   */
  callStatusCallback(message, type = 'info') {
    if (this.statusCallback && typeof this.statusCallback === 'function') {
      this.statusCallback(message, type);
    } else if (this.vrmViewer && typeof this.vrmViewer.callStatusCallback === 'function') {
      this.vrmViewer.callStatusCallback(message, type);
    }
  }
  
  /**
   * Check if a VRM model is loaded
   * @returns {boolean} - Whether a VRM model is loaded
   */
  isVRMLoaded() {
    return this.vrmViewer && this.vrmViewer.currentVRM && this.vrmViewer.currentVRM.scene;
  }
  
  /**
   * Initialize the animation mixer for the current VRM model
   * @returns {boolean} - Whether initialization was successful
   */
  initMixer() {
    if (!this.isVRMLoaded()) {
      this.callStatusCallback('No VRM model loaded, cannot initialize animation mixer', 'error');
      return false;
    }
    
    try {
      // Clean up any existing mixer
      if (this.animationMixer) {
        console.log('Cleaning up existing animation mixer');
        this.animationMixer.stopAllAction();
        this.animationMixer.uncacheRoot(this.animationMixer.getRoot());
        this.animationMixer = null;
      }
      
      const vrm = this.vrmViewer.currentVRM;
      
      // For VRM models, we need to use the scene as the root
      // This ensures all bones are properly animated
      const root = vrm.scene;
      
      console.log('Initializing animation mixer with root:', root);
      
      // Create a new animation mixer for the VRM model
      this.animationMixer = new THREE.AnimationMixer(root);
      
      // Log the mixer for debugging
      console.log('Animation mixer created:', this.animationMixer);
      
      // Log all available bones in the VRM model for debugging
      console.log('Available bones in VRM model:');
      const bones = [];
      root.traverse(node => {
        if (node.isBone) {
          bones.push({
            name: node.name,
            type: node.type,
            position: node.position.toArray(),
            parent: node.parent ? node.parent.name : null
          });
        }
      });
      console.log('Bones:', bones);
      
      // If the VRM has a humanoid component, log the normalized bone structure
      if (vrm.humanoid) {
        console.log('VRM humanoid bone structure:');
        const humanoidBones = {};
        
        // List of standard VRM humanoid bones
        const boneNames = [
          'hips', 'spine', 'chest', 'upperChest', 'neck', 'head',
          'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
          'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
          'leftUpperLeg', 'leftLowerLeg', 'leftFoot', 'leftToes',
          'rightUpperLeg', 'rightLowerLeg', 'rightFoot', 'rightToes'
        ];
        
        // Get each bone from the humanoid
        boneNames.forEach(boneName => {
          try {
            const bone = vrm.humanoid.getNormalizedBoneNode(boneName);
            if (bone) {
              humanoidBones[boneName] = {
                name: bone.name,
                found: true
              };
            } else {
              humanoidBones[boneName] = {
                found: false
              };
            }
          } catch (e) {
            humanoidBones[boneName] = {
              found: false,
              error: e.message
            };
          }
        });
        
        console.log('Humanoid bones:', humanoidBones);
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing animation mixer:', error);
      this.callStatusCallback('Failed to initialize animation mixer: ' + error.message, 'error');
      if (this.errorCallback) this.errorCallback(error.message);
      return false;
    }
  }
  
  /**
   * A map of common animation bone names to VRM Humanoid bone names.
   * This helps in retargeting animations from sources like Mixamo.
   */
  getBoneNameMap() {
    return {
      // Mixamo bone names to VRM Humanoid bone names
      'mixamorigHips': 'hips',
      'mixamorigSpine': 'spine',
      'mixamorigSpine1': 'chest',
      'mixamorigSpine2': 'upperChest',
      'mixamorigNeck': 'neck',
      'mixamorigHead': 'head',
      'mixamorigLeftShoulder': 'leftShoulder',
      'mixamorigLeftArm': 'leftUpperArm',
      'mixamorigLeftForeArm': 'leftLowerArm',
      'mixamorigLeftHand': 'leftHand',
      'mixamorigRightShoulder': 'rightShoulder',
      'mixamorigRightArm': 'rightUpperArm',
      'mixamorigRightForeArm': 'rightLowerArm',
      'mixamorigRightHand': 'rightHand',
      'mixamorigLeftUpLeg': 'leftUpperLeg',
      'mixamorigLeftLeg': 'leftLowerLeg',
      'mixamorigLeftFoot': 'leftFoot',
      'mixamorigLeftToeBase': 'leftToes',
      'mixamorigRightUpLeg': 'rightUpperLeg',
      'mixamorigRightLeg': 'rightLowerLeg',
      'mixamorigRightFoot': 'rightFoot',
      'mixamorigRightToeBase': 'rightToes',
    };
  }

  /**
   * Normalizes a bone name for better matching.
   * @param {string} name - The bone name to normalize.
   * @returns {string} - The normalized bone name.
   */
  normalizeBoneName(name) {
    return name.toLowerCase().replace(/^(mixamorig|j_bip_c_)/, '');
  }
  
  /**
   * Get the VRMAnimation class from various possible locations
   * @returns {Object|null} - The VRMAnimation object or null if not found
   */
  getVRMAnimationClass() {
    // Check for VRMAnimation in various possible locations
    if (window.VRMAnimation) {
      console.log('Found VRMAnimation in window.VRMAnimation:', window.VRMAnimation);
      
      // Check if it's the v3.x.x API structure
      if (window.VRMAnimation.VRMAnimation) {
        console.log('Found VRMAnimation.VRMAnimation (v3.x.x API):', window.VRMAnimation.VRMAnimation);
        return window.VRMAnimation;
      }
      
      return window.VRMAnimation;
    } else if (window.THREE && window.THREE.VRM && window.THREE.VRM.VRMAnimation) {
      console.log('Found VRMAnimation in THREE.VRM.VRMAnimation:', window.THREE.VRM.VRMAnimation);
      return window.THREE.VRM.VRMAnimation;
    } else if (window.THREE && window.THREE.VRMAnimation) {
      console.log('Found VRMAnimation in THREE.VRMAnimation:', window.THREE.VRMAnimation);
      return window.THREE.VRMAnimation;
    }
    
    console.error('VRMAnimation not found in any expected location', {
      'window.VRMAnimation': window.VRMAnimation,
      'window.THREE.VRM.VRMAnimation': window.THREE && window.THREE.VRM && window.THREE.VRM.VRMAnimation,
      'window.THREE.VRMAnimation': window.THREE && window.THREE.VRMAnimation
    });
    
    return null;
  }
  
  /**
   * Process a VRMA file to create an animation clip
   * @param {Object} gltf - The parsed GLTF object containing the VRMA data
   * @param {Object} vrm - The VRM model to apply the animation to
   * @returns {THREE.AnimationClip|null} - The created animation clip or null if failed
   */
  processVRMAFile(gltf, vrm) {
    try {
      console.log('Processing VRMA file:', gltf);
      
      // Get the VRMAnimation class
      const VRMAnimationModule = this.getVRMAnimationClass();
      
      if (!VRMAnimationModule) {
        throw new Error('VRMAnimation module not found');
      }
      
      // Log the module structure to debug
      console.log('VRMAnimation module structure:', VRMAnimationModule);
      
      let vrmAnimation;
      
      // Handle different API versions
      if (VRMAnimationModule.VRMAnimation) {
        // v3.x.x API
        console.log('Using VRMAnimation v3.x.x API');
        const { VRMAnimation } = VRMAnimationModule;
        vrmAnimation = new VRMAnimation(gltf);
      } else {
        // Legacy API
        console.log('Using VRMAnimation legacy API');
        vrmAnimation = new VRMAnimationModule(gltf);
      }
      
      console.log('VRMAnimation instance created:', vrmAnimation);
      
      // Try different methods available in the API
      if (vrmAnimation) {
        // Log all available methods on the instance
        console.log('Available methods on VRMAnimation instance:');
        for (const key in vrmAnimation) {
          if (typeof vrmAnimation[key] === 'function') {
            console.log(`- ${key}: ${typeof vrmAnimation[key]}`);
          }
        }
        
        // Try createAnimationTrack (v3.x.x API)
        if (typeof vrmAnimation.createAnimationTrack === 'function') {
          console.log('Using createAnimationTrack method');
          
          // Create animation track
          const track = vrmAnimation.createAnimationTrack(vrm);
          
          if (track) {
            console.log('Animation track created:', track);
            
            // Create a clip from the track
            const clip = new THREE.AnimationClip('VRMA Animation', track.duration || 5, [track]);
            console.log('Animation clip created from track:', clip);
            return clip;
          } else {
            throw new Error('Failed to create animation track');
          }
        }
        // Try createAnimationClip (legacy API)
        else if (typeof vrmAnimation.createAnimationClip === 'function') {
          console.log('Using createAnimationClip method');
          const animationClip = vrmAnimation.createAnimationClip(vrm);
          
          if (!animationClip) {
            throw new Error('Failed to create animation clip');
          }
          
          console.log('Created animation clip:', animationClip);
          return animationClip;
        }
        // Try build method (alternative API)
        else if (typeof vrmAnimation.build === 'function') {
          console.log('Using build method');
          const animationClip = vrmAnimation.build(vrm);
          
          if (!animationClip) {
            throw new Error('Failed to build animation clip');
          }
          
          console.log('Built animation clip:', animationClip);
          return animationClip;
        }
        // Try getClip method (another alternative)
        else if (typeof vrmAnimation.getClip === 'function') {
          console.log('Using getClip method');
          const animationClip = vrmAnimation.getClip(vrm);
          
          if (!animationClip) {
            throw new Error('Failed to get animation clip');
          }
          
          console.log('Got animation clip:', animationClip);
          return animationClip;
        }
        // If we can't find any usable method, try to extract animations directly
        else if (gltf.animations && gltf.animations.length > 0) {
          console.log('Using animations directly from GLTF:', gltf.animations);
          return gltf.animations[0];
        }
        else {
          throw new Error('VRMAnimation instance does not have any usable methods to create animation');
        }
      } else {
        throw new Error('Failed to create VRMAnimation instance');
      }
    } catch (error) {
      console.error('Error processing VRMA file:', error);
      this.callStatusCallback('Error processing VRMA file: ' + error.message, 'error');
      if (this.errorCallback) this.errorCallback(error.message);
      return null;
    }
  }
  
  /**
   * Load an animation from URL
   * @param {string} url - URL of the animation file
   * @param {boolean} autoplay - Whether to automatically play the animation after loading
   * @returns {Promise} - Promise that resolves with the loaded animation or rejects with an error
   */
  loadAnimationFromURL(url, autoplay = this.autoplay) {
    return new Promise((resolve, reject) => {
      if (!this.isVRMLoaded()) {
        const error = new Error('No VRM model loaded');
        this.callStatusCallback('No VRM model loaded, cannot load animation', 'error');
        if (this.errorCallback) this.errorCallback(error.message);
        reject(error);
        return;
      }
      
      // Initialize mixer if not already done
      if (!this.animationMixer) {
        if (!this.initMixer()) {
          const error = new Error('Failed to initialize animation mixer');
          reject(error);
          return;
        }
      }
      
      this.callStatusCallback(`Loading animation from URL: ${url}`, 'info');
      
      // Create loader based on file extension
      const fileExtension = url.split('.').pop().toLowerCase();
      let loader;
      
      switch (fileExtension) {
        case 'vrma':
          // For VRMA files, we need to use the VRMAnimation loader
          const VRMAnimationClass = this.getVRMAnimationClass();
          if (!VRMAnimationClass) {
            const error = new Error('VRMAnimation not available');
            this.callStatusCallback('VRMAnimation not available, cannot load VRMA animations', 'error');
            console.error('VRMAnimation not found in:', {
              'window.VRMAnimation': window.VRMAnimation,
              'window.THREE.VRM.VRMAnimation': window.THREE && window.THREE.VRM && window.THREE.VRM.VRMAnimation,
              'window.THREE.VRMAnimation': window.THREE && window.THREE.VRMAnimation
            });
            if (this.errorCallback) this.errorCallback(error.message);
            reject(error);
            return;
          } else {
            console.log('Found VRMAnimation class:', VRMAnimationClass);
          }
          
          // Use GLTFLoader to load the VRMA file
          loader = new THREE.GLTFLoader();
          break;
          
        case 'gltf':
        case 'glb':
          loader = new THREE.GLTFLoader();
          break;
        case 'fbx':
          if (typeof THREE.FBXLoader === 'undefined') {
            const error = new Error('FBXLoader not available');
            this.callStatusCallback('FBXLoader not available, cannot load FBX animations', 'error');
            if (this.errorCallback) this.errorCallback(error.message);
            reject(error);
            return;
          }
          loader = new THREE.FBXLoader();
          break;
        case 'bvh':
          if (typeof THREE.BVHLoader === 'undefined') {
            const error = new Error('BVHLoader not available');
            this.callStatusCallback('BVHLoader not available, cannot load BVH animations', 'error');
            if (this.errorCallback) this.errorCallback(error.message);
            reject(error);
            return;
          }
          loader = new THREE.BVHLoader();
          break;
        default:
          const error = new Error(`Unsupported animation format: ${fileExtension}`);
          this.callStatusCallback(`Unsupported animation format: ${fileExtension}`, 'error');
          if (this.errorCallback) this.errorCallback(error.message);
          reject(error);
          return;
      }
      
      // Load the animation
      loader.load(
        url,
        (result) => {
          try {
            let animations = [];
            
            // Extract animations based on the file type
            if (fileExtension === 'vrma') {
              // For VRMA files, use the VRMAnimation class
              console.log('Processing VRMA animation with VRMAnimation');
              
              // Get the VRM instance from the viewer
              const vrm = this.vrmViewer.currentVRM;
              
              if (!vrm) {
                throw new Error('No VRM model loaded');
              }
              
              // Process the VRMA file to create an animation clip
              const clip = this.processVRMAFile(result, vrm);
              
              if (!clip) {
                throw new Error('Failed to create animation clip from VRMA file');
              }
              
              console.log('Animation clip created from VRMA file:', clip);
              animations = [clip];
            } else if (fileExtension === 'gltf' || fileExtension === 'glb') {
              // For GLTF/GLB files, animations are in the animations array
              animations = result.animations || [];
              
              // Process animations to match VRM bone structure
              this.processVRMAnimation(animations);
            } else if (fileExtension === 'fbx') {
              // For FBX files, animations are also in the animations array
              animations = result.animations || [];
              
              // Process FBX animations to match VRM bone structure
              this.processFBXAnimation(animations);
            } else if (fileExtension === 'bvh') {
              // For BVH files, the result is already an animation clip
              animations = [result];
              
              // Process BVH animation to match VRM bone structure
              this.processBVHAnimation(animations);
            }
            
            if (animations.length === 0) {
              const warning = `No animations found in ${url}`;
              this.callStatusCallback(warning, 'warning');
              
              // Apply fallback animation if available
              if (this.fallbackAnimation) {
                this.playAnimation(this.fallbackAnimation);
                resolve([]);
              } else {
                reject(new Error(warning));
              }
              return;
            }
            
            // Store the animations
            this.animations = animations;
            
            // Log animation details for debugging
            console.log(`Loaded ${animations.length} animations:`, animations);
            animations.forEach((anim, index) => {
              console.log(`Animation ${index}: ${anim.name || 'unnamed'}, duration: ${anim.duration}s, tracks: ${anim.tracks.length}`);
              
              // Log some track details
              if (anim.tracks.length > 0) {
                console.log(`Sample tracks:`, anim.tracks.slice(0, 3));
              }
            });
            
            // Play the first animation if autoplay is enabled
            if (autoplay) {
              const playResult = this.playAnimation(animations[0]);
              if (playResult) {
                this.callStatusCallback(`Playing animation: ${animations[0].name || 'Animation 1'}`, 'success');
              } else {
                this.callStatusCallback(`Failed to play animation`, 'warning');
              }
            }
            
            this.callStatusCallback(`Successfully loaded ${animations.length} animations`, 'success');
            resolve(animations);
          } catch (error) {
            console.error('Error processing animation:', error);
            this.callStatusCallback('Error processing animation', 'error');
            
            // Apply fallback animation if available
            if (this.fallbackAnimation) {
              this.playAnimation(this.fallbackAnimation);
            }
            
            if (this.errorCallback) this.errorCallback(error.message);
            reject(error);
          }
        },
        (progress) => {
          if (progress.total > 0) {
            const percent = Math.round(progress.loaded / progress.total * 100);
            this.callStatusCallback(`Loading animation: ${percent}%`, 'info');
          }
        },
        (error) => {
          console.error('Error loading animation:', error);
          this.callStatusCallback('Failed to load animation', 'error');
          
          // Apply fallback animation if available
          if (this.fallbackAnimation) {
            this.playAnimation(this.fallbackAnimation);
          }
          
          if (this.errorCallback) this.errorCallback(error.message);
          reject(error);
        }
      );
    });
  }
  
  /**
   * Process VRM animation to match the VRM model's bone structure
   * @param {Array} animations - Array of animation clips to process
   */
  processVRMAnimation(animations) {
    if (!animations || animations.length === 0) return;
    
    const vrm = this.vrmViewer.currentVRM;
    if (!vrm || !vrm.humanoid) return;
    
    animations.forEach(animation => {
      // Create a map of VRM bone names
      const vrmBoneNames = new Map();
      
      // Collect all bone names from the VRM model
      vrm.scene.traverse(node => {
        if (node.isBone) {
          vrmBoneNames.set(node.name.toLowerCase(), node.name);
        }
      });
      
      // Process each track to match the VRM bone structure
      animation.tracks = animation.tracks.map(track => {
        const trackPath = track.name.split('.');
        const boneName = trackPath[0];
        const property = trackPath[1];
        
        // Try to find a matching bone in the VRM model
        const lowerBoneName = boneName.toLowerCase();
        let matchedBoneName = null;
        
        // Check for exact match
        if (vrmBoneNames.has(lowerBoneName)) {
          matchedBoneName = vrmBoneNames.get(lowerBoneName);
        } else {
          // Try to find a partial match
          for (const [key, value] of vrmBoneNames.entries()) {
            if (key.includes(lowerBoneName) || lowerBoneName.includes(key)) {
              matchedBoneName = value;
              break;
            }
          }
        }
        
        if (matchedBoneName && matchedBoneName !== boneName) {
          // Create a new track with the matched bone name
          const newTrackName = `${matchedBoneName}.${property}`;
          console.log(`Remapping track: ${track.name} -> ${newTrackName}`);
          
          return new THREE.KeyframeTrack(
            newTrackName,
            track.times,
            track.values,
            track.interpolation
          );
        }
        
        return track;
      });
    });
  }
  
  /**
   * Process FBX animation to match the VRM model's bone structure
   * @param {Array} animations - Array of animation clips to process
   */
  processFBXAnimation(animations) {
    // Similar to processVRMAnimation but with FBX-specific handling
    this.processVRMAnimation(animations); // Reuse the same logic for now
  }
  
  /**
   * Process BVH animation to match the VRM model's bone structure
   * @param {Array} animations - Array of animation clips to process
   */
  processBVHAnimation(animations) {
    // Similar to processVRMAnimation but with BVH-specific handling
    this.processVRMAnimation(animations); // Reuse the same logic for now
  }
  
  /**
   * Load an animation from a file
   * @param {File} file - File object containing the animation
   * @param {boolean} autoplay - Whether to automatically play the animation after loading
   * @returns {Promise} - Promise that resolves with the loaded animation or rejects with an error
   */
  loadAnimationFromFile(file, autoplay = this.autoplay) {
    return new Promise((resolve, reject) => {
      if (!this.isVRMLoaded()) {
        const error = new Error('No VRM model loaded');
        this.callStatusCallback('No VRM model loaded, cannot load animation', 'error');
        if (this.errorCallback) this.errorCallback(error.message);
        reject(error);
        return;
      }
      
      if (!file) {
        const error = new Error('No file provided');
        this.callStatusCallback('No file provided', 'error');
        if (this.errorCallback) this.errorCallback(error.message);
        reject(error);
        return;
      }
      
      // Initialize mixer if not already done
      if (!this.animationMixer) {
        if (!this.initMixer()) {
          const error = new Error('Failed to initialize animation mixer');
          reject(error);
          return;
        }
      }
      
      this.callStatusCallback(`Loading animation from file: ${file.name}`, 'info');
      
      // Determine file type from extension
      const fileExtension = file.name.split('.').pop().toLowerCase();
      
      // Create file reader
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          let loader;
          let parseFunction;
          
          // Select appropriate loader based on file extension
          switch (fileExtension) {
            case 'vrma':
              // For VRMA files, we need to use the VRMAnimation loader
              const VRMAnimationClass = this.getVRMAnimationClass();
              if (!VRMAnimationClass) {
                const error = new Error('VRMAnimation not available');
                this.callStatusCallback('VRMAnimation not available, cannot load VRMA animations', 'error');
                console.error('VRMAnimation not found in:', {
                  'window.VRMAnimation': window.VRMAnimation,
                  'window.THREE.VRM.VRMAnimation': window.THREE && window.THREE.VRM && window.THREE.VRM.VRMAnimation,
                  'window.THREE.VRMAnimation': window.THREE && window.THREE.VRMAnimation
                });
                if (this.errorCallback) this.errorCallback(error.message);
                reject(error);
                return;
              } else {
                console.log('Found VRMAnimation class:', VRMAnimationClass);
              }
              
              loader = new THREE.GLTFLoader();
              parseFunction = (data) => loader.parse(data, '', (result) => {
                try {
                  console.log('VRMA file parsed as GLTF:', result);
                  
                  // Get the VRM instance from the viewer
                  const vrm = this.vrmViewer.currentVRM;
                  
                  if (!vrm) {
                    throw new Error('No VRM model loaded');
                  }
                  
                  // Process the VRMA file to create an animation clip
                  const clip = this.processVRMAFile(result, vrm);
                  
                  if (!clip) {
                    throw new Error('Failed to create animation clip from VRMA file');
                  }
                  
                  console.log('Animation clip created from VRMA file:', clip);
                  
                  // Store the animation
                  this.animations = [clip];
                  
                  // Play the animation if autoplay is enabled
                  if (autoplay) {
                    const playResult = this.playAnimation(clip);
                    if (playResult) {
                      this.callStatusCallback(`Playing animation: ${clip.name || 'VRMA Animation'}`, 'success');
                    } else {
                      this.callStatusCallback(`Failed to play animation`, 'warning');
                    }
                  }
                  
                  this.callStatusCallback('Successfully loaded VRMA animation', 'success');
                  resolve([clip]);
                } catch (error) {
                  console.error('Error processing VRMA animation:', error);
                  this.callStatusCallback('Error processing VRMA animation', 'error');
                  
                  // Apply fallback animation if available
                  if (this.fallbackAnimation) {
                    this.playAnimation(this.fallbackAnimation);
                  }
                  
                  if (this.errorCallback) this.errorCallback(error.message);
                  reject(error);
                }
              }, (error) => {
                console.error('Error parsing VRMA file:', error);
                this.callStatusCallback('Failed to parse VRMA file', 'error');
                
                // Apply fallback animation if available
                if (this.fallbackAnimation) {
                  this.playAnimation(this.fallbackAnimation);
                }
                
                if (this.errorCallback) this.errorCallback(error.message);
                reject(error);
              });
              break;
              
            case 'gltf':
            case 'glb':
              loader = new THREE.GLTFLoader();
              parseFunction = (data) => loader.parse(data, '', (result) => {
                const animations = result.animations || [];
                
                if (animations.length === 0) {
                  const warning = `No animations found in ${file.name}`;
                  this.callStatusCallback(warning, 'warning');
                  
                  // Apply fallback animation if available
                  if (this.fallbackAnimation) {
                    this.playAnimation(this.fallbackAnimation);
                    resolve([]);
                  } else {
                    reject(new Error(warning));
                  }
                  return;
                }
                
                // Process animations to match VRM bone structure
                this.processVRMAnimation(animations);
                
                // Store the animations
                this.animations = animations;
                
                // Play the first animation if autoplay is enabled
                if (autoplay) {
                  const playResult = this.playAnimation(animations[0]);
                  if (playResult) {
                    this.callStatusCallback(`Playing animation: ${animations[0].name || 'Animation 1'}`, 'success');
                  } else {
                    this.callStatusCallback(`Failed to play animation`, 'warning');
                  }
                }
                
                this.callStatusCallback(`Successfully loaded ${animations.length} animations`, 'success');
                resolve(animations);
              }, (error) => {
                console.error('Error parsing animation file:', error);
                this.callStatusCallback('Failed to parse animation file', 'error');
                
                // Apply fallback animation if available
                if (this.fallbackAnimation) {
                  this.playAnimation(this.fallbackAnimation);
                }
                
                if (this.errorCallback) this.errorCallback(error.message);
                reject(error);
              });
              break;
              
            case 'fbx':
              if (typeof THREE.FBXLoader === 'undefined') {
                const error = new Error('FBXLoader not available');
                this.callStatusCallback('FBXLoader not available, cannot load FBX animations', 'error');
                if (this.errorCallback) this.errorCallback(error.message);
                reject(error);
                return;
              }
              
              // FBXLoader doesn't have a parse method, we need to create a blob URL
              const blob = new Blob([e.target.result], { type: 'application/octet-stream' });
              const url = URL.createObjectURL(blob);
              
              loader = new THREE.FBXLoader();
              loader.load(url, (result) => {
                // Clean up the blob URL
                URL.revokeObjectURL(url);
                
                const animations = result.animations || [];
                
                if (animations.length === 0) {
                  const warning = `No animations found in ${file.name}`;
                  this.callStatusCallback(warning, 'warning');
                  
                  // Apply fallback animation if available
                  if (this.fallbackAnimation) {
                    this.playAnimation(this.fallbackAnimation);
                    resolve([]);
                  } else {
                    reject(new Error(warning));
                  }
                  return;
                }
                
                // Process FBX animations to match VRM bone structure
                this.processFBXAnimation(animations);
                
                // Store the animations
                this.animations = animations;
                
                // Play the first animation if autoplay is enabled
                if (autoplay) {
                  const playResult = this.playAnimation(animations[0]);
                  if (playResult) {
                    this.callStatusCallback(`Playing animation: ${animations[0].name || 'Animation 1'}`, 'success');
                  } else {
                    this.callStatusCallback(`Failed to play animation`, 'warning');
                  }
                }
                
                this.callStatusCallback(`Successfully loaded ${animations.length} animations`, 'success');
                resolve(animations);
              }, undefined, (error) => {
                // Clean up the blob URL
                URL.revokeObjectURL(url);
                
                console.error('Error loading FBX animation:', error);
                this.callStatusCallback('Failed to load FBX animation', 'error');
                
                // Apply fallback animation if available
                if (this.fallbackAnimation) {
                  this.playAnimation(this.fallbackAnimation);
                }
                
                if (this.errorCallback) this.errorCallback(error.message);
                reject(error);
              });
              return; // Return early as we're handling this case differently
              
            case 'bvh':
              if (typeof THREE.BVHLoader === 'undefined') {
                const error = new Error('BVHLoader not available');
                this.callStatusCallback('BVHLoader not available, cannot load BVH animations', 'error');
                if (this.errorCallback) this.errorCallback(error.message);
                reject(error);
                return;
              }
              
              loader = new THREE.BVHLoader();
              parseFunction = (data) => {
                try {
                  // BVHLoader expects a string
                  const text = new TextDecoder().decode(data);
                  const result = loader.parse(text);
                  
                  // Process BVH animation to match VRM bone structure
                  this.processBVHAnimation([result]);
                  
                  // Store the animation
                  this.animations = [result];
                  
                  // Play the animation if autoplay is enabled
                  if (autoplay) {
                    const playResult = this.playAnimation(result);
                    if (playResult) {
                      this.callStatusCallback(`Playing animation: ${result.name || 'BVH Animation'}`, 'success');
                    } else {
                      this.callStatusCallback(`Failed to play animation`, 'warning');
                    }
                  }
                  
                  this.callStatusCallback('Successfully loaded BVH animation', 'success');
                  resolve([result]);
                } catch (error) {
                  console.error('Error parsing BVH animation:', error);
                  this.callStatusCallback('Failed to parse BVH animation', 'error');
                  
                  // Apply fallback animation if available
                  if (this.fallbackAnimation) {
                    this.playAnimation(this.fallbackAnimation);
                  }
                  
                  if (this.errorCallback) this.errorCallback(error.message);
                  reject(error);
                }
              };
              break;
              
            default:
              const error = new Error(`Unsupported animation format: ${fileExtension}`);
              this.callStatusCallback(`Unsupported animation format: ${fileExtension}`, 'error');
              if (this.errorCallback) this.errorCallback(error.message);
              reject(error);
              return;
          }
          
          // Parse the file if we have a parse function
          if (parseFunction) {
            parseFunction(e.target.result);
          }
        } catch (error) {
          console.error('Error processing animation file:', error);
          this.callStatusCallback('Error processing animation file', 'error');
          
          // Apply fallback animation if available
          if (this.fallbackAnimation) {
            this.playAnimation(this.fallbackAnimation);
          }
          
          if (this.errorCallback) this.errorCallback(error.message);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error('Error reading animation file:', error);
        this.callStatusCallback('Failed to read animation file', 'error');
        
        // Apply fallback animation if available
        if (this.fallbackAnimation) {
          this.playAnimation(this.fallbackAnimation);
        }
        
        if (this.errorCallback) this.errorCallback('Failed to read file');
        reject(new Error('Failed to read file'));
      };
      
      // Read the file as an array buffer
      reader.readAsArrayBuffer(file);
    });
  }
  
  /**
   * Set a fallback animation to use when no animation is loaded or an error occurs
   * @param {Object} animation - Animation clip to use as fallback
   */
  setFallbackAnimation(animation) {
    this.fallbackAnimation = animation;
  }
  
  /**
   * Create a simple idle animation as a fallback
   * @returns {Object} - The created animation clip
   */
  createIdleAnimation() {
    if (!this.isVRMLoaded()) {
      return null;
    }
    
    try {
      // Create a simple idle animation that slightly moves the body up and down
      const vrm = this.vrmViewer.currentVRM;
      
      // Find the spine bone or equivalent
      let spineBone = null;
      if (vrm.humanoid) {
        spineBone = vrm.humanoid.getNormalizedBoneNode('spine');
        if (!spineBone) {
          spineBone = vrm.humanoid.getNormalizedBoneNode('chest');
        }
        if (!spineBone) {
          spineBone = vrm.humanoid.getNormalizedBoneNode('hips');
        }
      }
      
      if (!spineBone) {
        // Try to find a bone with 'spine' in the name
        vrm.scene.traverse((node) => {
          if (node.isBone && (
              node.name.toLowerCase().includes('spine') || 
              node.name.toLowerCase().includes('chest') ||
              node.name.toLowerCase().includes('hip')
          )) {
            spineBone = node;
          }
        });
      }
      
      if (!spineBone) {
        // If we still can't find a spine bone, use the root bone or any bone
        vrm.scene.traverse((node) => {
          if (node.isBone && !spineBone) {
            spineBone = node;
          }
        });
      }
      
      if (!spineBone) {
        console.warn('No suitable bone found for idle animation');
        return this.createSimpleTestAnimation();
      }
      
      console.log('Using bone for idle animation:', spineBone.name);
      
      // Create a simple animation
      const times = [0, 1, 2];
      const values = [
        // Initial position
        0, 0, 0,
        // Slightly up
        0, 0.05, 0,
        // Back to initial
        0, 0, 0
      ];
      
      const track = new THREE.VectorKeyframeTrack(
        `${spineBone.name}.position`,
        times,
        values
      );
      
      const idleClip = new THREE.AnimationClip('idle', 2, [track]);
      this.fallbackAnimation = idleClip;
      
      return idleClip;
    } catch (error) {
      console.error('Error creating idle animation:', error);
      this.callStatusCallback('Failed to create idle animation', 'error');
      
      // Try the simple test animation as a last resort
      return this.createSimpleTestAnimation();
    }
  }
  
  /**
   * Create a very simple test animation that should work with any model
   * @returns {Object} - The created animation clip
   */
  createSimpleTestAnimation() {
    if (!this.isVRMLoaded()) {
      return null;
    }
    
    try {
      const vrm = this.vrmViewer.currentVRM;
      
      // Find any bone in the model
      let targetBone = null;
      vrm.scene.traverse((node) => {
        if (node.isBone && !targetBone) {
          targetBone = node;
        }
      });
      
      if (!targetBone) {
        // If no bones found, use the scene root
        targetBone = vrm.scene;
      }
      
      console.log('Using node for test animation:', targetBone.name);
      
      // Create a simple rotation animation
      const times = [0, 1, 2];
      const values = [
        // Initial rotation
        0, 0, 0, 1,
        // Rotate slightly
        0, 0.1, 0, 0.9,
        // Back to initial
        0, 0, 0, 1
      ];
      
      const track = new THREE.QuaternionKeyframeTrack(
        `${targetBone.name}.quaternion`,
        times,
        values
      );
      
      const testClip = new THREE.AnimationClip('test', 2, [track]);
      
      return testClip;
    } catch (error) {
      console.error('Error creating test animation:', error);
      this.callStatusCallback('Failed to create test animation', 'error');
      return null;
    }
  }
  
  /**
   * Play an animation
   * @param {Object} animation - Animation clip to play
   * @param {boolean} loop - Whether to loop the animation
   * @returns {Object} - The animation action
   */
  playAnimation(animation, loop = this.loop) {
    if (!this.animationMixer || !animation) {
      console.error('Cannot play animation: mixer or animation is null', {
        mixer: this.animationMixer,
        animation: animation
      });
      return null;
    }
    
    try {
      console.log('Playing animation:', animation);
      console.log('Animation details:', {
        name: animation.name,
        duration: animation.duration,
        tracks: animation.tracks.length
      });
      
      // Log the tracks for debugging
      animation.tracks.forEach((track, i) => {
        console.log(`Track ${i}: ${track.name}, values: ${track.values.length}, times: ${track.times.length}`);
      });
      
      // Stop any current animation
      if (this.currentAction) {
        console.log('Stopping current animation');
        this.currentAction.stop();
        this.animationMixer.uncacheAction(this.currentAction.getClip());
      }
      
      // Make sure the animation has at least one track
      if (!animation.tracks || animation.tracks.length === 0) {
        console.error('Animation has no tracks');
        this.callStatusCallback('Animation has no tracks', 'error');
        return null;
      }
      
      // For VRMA animations, ensure the tracks are properly mapped to the VRM model
      if (this.vrmViewer && this.vrmViewer.currentVRM) {
        const vrm = this.vrmViewer.currentVRM;
        
        // If this is a VRM model with humanoid, we need to ensure proper track mapping
        if (vrm.humanoid) {
          console.log('Processing animation for VRM humanoid');
          const boneNameMap = this.getBoneNameMap();
          
          // Create a map of all available bones in the VRM model, with normalized names
          const vrmBones = new Map();
          vrm.scene.traverse(node => {
            if (node.isBone) {
              vrmBones.set(this.normalizeBoneName(node.name), node);
            }
          });
          
          console.log('Normalized VRM bones:', Array.from(vrmBones.keys()));
          
          const remappedTracks = [];
          
          animation.tracks.forEach(track => {
            const trackPath = track.name.split('.');
            const originalBoneName = trackPath[0];
            const property = trackPath[1];
            
            // Normalize the bone name from the animation track
            let normalizedTrackBoneName = this.normalizeBoneName(originalBoneName);

            // Check if there is a mapping for this bone
            if (boneNameMap[originalBoneName]) {
              normalizedTrackBoneName = boneNameMap[originalBoneName];
            }
            
            // Try to find a matching bone in the VRM model
            let matchedBone = vrmBones.get(normalizedTrackBoneName);
            
            if (matchedBone) {
              // Create a new track with the matched bone name
              const newTrackName = `${matchedBone.name}.${property}`;
              if (track.name !== newTrackName) {
                console.log(`Remapping track: ${track.name} -> ${newTrackName}`);
              }
              
              const newTrack = new THREE.KeyframeTrack(
                newTrackName,
                track.times,
                track.values,
                track.interpolation
              );
              
              remappedTracks.push(newTrack);
            } else {
              console.warn(`Could not find matching bone for ${originalBoneName} (normalized: ${normalizedTrackBoneName}), skipping track`);
            }
          });
          
          if (remappedTracks.length > 0) {
            // Create a new animation clip with the remapped tracks
            const remappedClip = new THREE.AnimationClip(
              animation.name + '_remapped',
              animation.duration,
              remappedTracks
            );
            
            console.log('Created remapped animation clip:', remappedClip);
            animation = remappedClip;
          } else {
            console.error('No tracks could be remapped. Animation may not play correctly.');
            this.callStatusCallback('Failed to remap animation tracks to the model.', 'error');
          }
        }
      }
      
      // Create and play the new action
      console.log('Creating animation action');
      const action = this.animationMixer.clipAction(animation);
      
      if (!action) {
        console.error('Failed to create animation action');
        this.callStatusCallback('Failed to create animation action', 'error');
        return null;
      }
      
      // Configure the action
      action.setLoop(loop);
      action.clampWhenFinished = true; // Keep the final pose when the animation ends
      action.reset(); // Reset the action before playing
      
      // Play the animation with a short crossfade from the previous animation
      action.fadeIn(0.5);
      action.play();
      
      console.log('Animation action started:', action);
      this.currentAction = action;
      
      return action;
    } catch (error) {
      console.error('Error playing animation:', error);
      this.callStatusCallback('Failed to play animation: ' + error.message, 'error');
      if (this.errorCallback) this.errorCallback(error.message);
      return null;
    }
  }
  
  /**
   * Stop the current animation
   */
  stopAnimation() {
    if (this.currentAction) {
      this.currentAction.stop();
      this.currentAction = null;
    }
  }
  
  /**
   * Update the animation mixer
   * @param {number} delta - Time delta in seconds
   */
  update(delta) {
    if (!this.animationMixer) {
      return;
    }
    
    // Make sure delta is a valid number
    if (typeof delta !== 'number' || isNaN(delta) || delta <= 0) {
      console.warn('Invalid delta time for animation update:', delta);
      // Use a small default delta if the provided one is invalid
      delta = 1/60;
    }
    
    // Cap delta to avoid large jumps if the tab was in background
    const maxDelta = 1/10; // Max 100ms
    if (delta > maxDelta) {
      delta = maxDelta;
    }
    
    // Update the mixer
    try {
      this.animationMixer.update(delta);
    } catch (error) {
      console.error('Error updating animation mixer:', error);
    }
    
    // Log animation state occasionally for debugging (every ~5 seconds)
    if (Math.random() < 0.01) {
      console.log('Animation state:', {
        mixer: this.animationMixer,
        currentAction: this.currentAction ? {
          isRunning: this.currentAction.isRunning(),
          weight: this.currentAction.getEffectiveWeight(),
          time: this.currentAction.time,
          timeScale: this.currentAction.timeScale
        } : null
      });
    }
  }
  
  /**
   * Clean up resources
   */
  dispose() {
    this.stopAnimation();
    
    if (this.animationMixer) {
      this.animationMixer.uncacheRoot(this.animationMixer.getRoot());
      this.animationMixer = null;
    }
    
    this.animations = [];
    this.fallbackAnimation = null;
    this.currentAction = null;
  }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VRMAnimationHandler;
} 
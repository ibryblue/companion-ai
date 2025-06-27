/**
 * VRMAnimation API Test Script
 * 
 * This script tests the VRMAnimation API directly to ensure it works correctly.
 * It can be included in an HTML page to debug VRMAnimation issues.
 */

(function() {
  // Function to check the VRMAnimation API
  function checkVRMAnimationAPI() {
    console.log('Checking VRMAnimation API...');
    
    // Check if VRMAnimation is available
    if (!window.VRMAnimation) {
      console.error('VRMAnimation not found in window.VRMAnimation');
      return false;
    }
    
    console.log('VRMAnimation found:', window.VRMAnimation);
    console.log('VRMAnimation type:', typeof window.VRMAnimation);
    
    // Check if it's an object with properties
    if (typeof window.VRMAnimation === 'object') {
      console.log('VRMAnimation properties:', Object.keys(window.VRMAnimation));
      
      // Check for VRMAnimation class in v3.x.x API
      if (window.VRMAnimation.VRMAnimation) {
        console.log('VRMAnimation.VRMAnimation found (v3.x.x API):', window.VRMAnimation.VRMAnimation);
        console.log('VRMAnimation.VRMAnimation type:', typeof window.VRMAnimation.VRMAnimation);
        return true;
      } else {
        console.warn('VRMAnimation.VRMAnimation not found, may be using legacy API');
        return typeof window.VRMAnimation === 'function';
      }
    } else if (typeof window.VRMAnimation === 'function') {
      console.log('VRMAnimation is a function (legacy API)');
      return true;
    }
    
    console.error('VRMAnimation is not a function or an object with expected properties');
    return false;
  }
  
  // Function to create a test animation
  function createTestAnimation() {
    console.log('Creating test animation...');
    
    try {
      // Create a dummy scene
      const scene = new THREE.Scene();
      
      // Create a dummy VRM model
      const dummyVRM = {
        scene: scene,
        humanoid: {
          getNormalizedBoneNode: (name) => {
            const bone = new THREE.Object3D();
            bone.name = name;
            return bone;
          }
        }
      };
      
      // Create a simple animation clip
      const tracks = [];
      
      // Create some keyframes for the head bone
      const headRotationTrack = new THREE.QuaternionKeyframeTrack(
        'head.quaternion',
        [0, 1, 2],  // times
        [
          // Initial position
          0, 0, 0, 1,
          // Look left
          0, 0.2, 0, 0.97,
          // Back to initial
          0, 0, 0, 1
        ]
      );
      tracks.push(headRotationTrack);
      
      // Create animation clip
      const clip = new THREE.AnimationClip('test-animation', 2, tracks);
      console.log('Animation clip created:', clip);
      
      // Create a dummy GLTF with the animation
      const dummyGLTF = {
        scene: scene,
        animations: [clip]
      };
      
      // Try to use VRMAnimation
      if (window.VRMAnimation) {
        console.log('Using VRMAnimation...');
        
        let vrmAnimation;
        
        // Handle different API versions
        if (window.VRMAnimation.VRMAnimation) {
          // v3.x.x API
          console.log('Using VRMAnimation v3.x.x API');
          const { VRMAnimation } = window.VRMAnimation;
          vrmAnimation = new VRMAnimation(dummyGLTF);
        } else {
          // Legacy API
          console.log('Using VRMAnimation legacy API');
          vrmAnimation = new window.VRMAnimation(dummyGLTF);
        }
        
        console.log('VRMAnimation instance created:', vrmAnimation);
        
        // Check if createAnimationClip exists
        if (vrmAnimation && typeof vrmAnimation.createAnimationClip === 'function') {
          console.log('createAnimationClip method exists, calling it...');
          const resultClip = vrmAnimation.createAnimationClip(dummyVRM);
          console.log('Animation clip created successfully:', resultClip);
          return resultClip;
        } else if (vrmAnimation && typeof vrmAnimation.build === 'function') {
          console.log('build method exists, calling it instead...');
          const resultClip = vrmAnimation.build(dummyVRM);
          console.log('Animation clip created successfully with build():', resultClip);
          return resultClip;
        } else {
          console.error('No createAnimationClip or build method found on VRMAnimation instance');
          
          // Log available methods
          console.log('Available methods on VRMAnimation instance:');
          for (const key in vrmAnimation) {
            if (typeof vrmAnimation[key] === 'function') {
              console.log(`- ${key}: ${typeof vrmAnimation[key]}`);
            }
          }
          
          return null;
        }
      } else {
        console.error('VRMAnimation not available');
        return null;
      }
    } catch (error) {
      console.error('Error creating test animation:', error);
      return null;
    }
  }
  
  // Export functions
  window.VRMAAPITest = {
    checkVRMAnimationAPI,
    createTestAnimation
  };
  
  // Auto-run tests when loaded if in a test environment
  if (window.location.href.includes('vrma-debug.html')) {
    // Wait for all scripts to load
    window.addEventListener('load', () => {
      console.log('VRMAAPITest loaded, running tests...');
      
      setTimeout(() => {
        const apiCheckResult = checkVRMAnimationAPI();
        console.log('API check result:', apiCheckResult);
        
        if (apiCheckResult) {
          const testAnimationResult = createTestAnimation();
          console.log('Test animation result:', testAnimationResult);
        }
      }, 1000); // Give a second for everything to initialize
    });
  }
})(); 
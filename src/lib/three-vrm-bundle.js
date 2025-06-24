/**
 * Three.js VRM Bundle
 * 
 * This file provides a UMD wrapper for Three.js and VRM functionality
 * to avoid import statement issues in Chrome extensions.
 */

(function(global) {
  // Check if THREE is already defined
  if (!global.THREE) {
    console.error('THREE.js must be loaded before this bundle');
    return;
  }
  
  const THREE = global.THREE;
  
  // Create a simple VRMLoaderPlugin if not available
  if (!THREE.VRMLoaderPlugin) {
    console.log('Creating VRMLoaderPlugin');
    
    // Simple VRM loader plugin
    THREE.VRMLoaderPlugin = class VRMLoaderPlugin {
      constructor(parser) {
        this.parser = parser;
      }
      
      // This is a simplified version that just creates a basic VRM object
      afterRoot(gltf) {
        console.log('VRMLoaderPlugin.afterRoot called');
        
        const scene = gltf.scene;
        
        // Create a simple VRM object
        const vrm = {
          scene: scene,
          meta: {
            metaVersion: '1.0',
            name: 'Simple VRM',
            version: '1.0'
          },
          humanoid: {
            getNormalizedBoneNode: (name) => {
              // Return a dummy bone
              const bone = new THREE.Object3D();
              bone.name = name;
              return bone;
            }
          },
          update: (delta) => {
            // Simple update function
          }
        };
        
        // Store VRM in userData
        gltf.userData.vrm = vrm;
        
        return Promise.resolve(gltf);
      }
    };
  }
  
  // Create VRMUtils if not available
  if (!THREE.VRMUtils) {
    console.log('Creating VRMUtils');
    
    THREE.VRMUtils = {
      removeUnnecessaryVertices: (scene) => {
        console.log('VRMUtils.removeUnnecessaryVertices called');
        // No-op in this simplified version
      },
      
      combineSkeletons: (scene) => {
        console.log('VRMUtils.combineSkeletons called');
        // No-op in this simplified version
      },
      
      combineMorphs: (vrm) => {
        console.log('VRMUtils.combineMorphs called');
        // No-op in this simplified version
      },
      
      rotateVRM0: (vrm) => {
        console.log('VRMUtils.rotateVRM0 called');
        // No-op in this simplified version
      },
      
      deepDispose: (object) => {
        console.log('VRMUtils.deepDispose called');
        
        if (!object) return;
        
        // Traverse and dispose materials and geometries
        object.traverse((obj) => {
          if (obj.geometry) {
            obj.geometry.dispose();
          }
          
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach(material => {
                disposeMaterial(material);
              });
            } else {
              disposeMaterial(obj.material);
            }
          }
        });
        
        function disposeMaterial(material) {
          if (!material) return;
          
          // Dispose textures
          for (const key in material) {
            const value = material[key];
            if (value && typeof value === 'object' && 'isTexture' in value) {
              value.dispose();
            }
          }
          
          material.dispose();
        }
      }
    };
  }
  
  // Create VRM if not available
  if (!THREE.VRM) {
    console.log('Creating VRM');
    
    THREE.VRM = {
      from: (gltf) => {
        console.log('VRM.from called');
        
        // Create a simple VRM object
        const vrm = {
          scene: gltf.scene,
          meta: {
            metaVersion: '1.0',
            name: 'Simple VRM',
            version: '1.0'
          },
          humanoid: {
            getNormalizedBoneNode: (name) => {
              // Return a dummy bone
              const bone = new THREE.Object3D();
              bone.name = name;
              return bone;
            }
          },
          update: (delta) => {
            // Simple update function
          }
        };
        
        // Store VRM in userData
        gltf.userData.vrm = vrm;
        
        return Promise.resolve(vrm);
      }
    };
  }
  
  // Export VRM components to global scope
  global.VRMLoaderPlugin = THREE.VRMLoaderPlugin;
  global.VRMUtils = THREE.VRMUtils;
  global.VRM = THREE.VRM;
  
  console.log('Three.js VRM Bundle loaded successfully');
  
})(typeof window !== 'undefined' ? window : this); 
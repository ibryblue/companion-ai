/**
 * VRM Bundle
 * 
 * This file imports and exports Three.js and VRM libraries from npm packages
 * to make them available throughout the extension.
 */

// Import Three.js and its components
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Import VRM libraries
import * as VRM from '@pixiv/three-vrm';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

// Expose libraries as globals
window.THREE = THREE;
window.GLTFLoader = GLTFLoader;
window.OrbitControls = OrbitControls;
window.VRMLoaderPlugin = VRMLoaderPlugin;
window.VRMUtils = VRMUtils;

// Signal that THREE is loaded and ready
window.THREE_READY = true;
console.log('THREE.js and VRM libraries loaded and ready');

// Export for module usage
export {
  THREE,
  GLTFLoader,
  OrbitControls,
  VRM
};

console.log('VRM Bundle loaded successfully');
console.log('THREE.js version:', THREE.REVISION);
console.log('VRM version:', '1.0.9'); // Hardcoded version from package.json 
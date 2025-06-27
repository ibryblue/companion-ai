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
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { BVHLoader } from 'three/examples/jsm/loaders/BVHLoader.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import * as VRMAnimation from '@pixiv/three-vrm-animation';

// Import local modules
import VRMAnimationHandler from './vrm-animation-handler.js';
import VRMAnimationControls from './vrm-animation-controls.js';

// Expose libraries as globals
window.THREE = THREE;
window.THREE.GLTFLoader = GLTFLoader;
window.THREE.OrbitControls = OrbitControls;
window.THREE.FBXLoader = FBXLoader;
window.THREE.BVHLoader = BVHLoader;
window.VRM = VRM;
window.VRMLoaderPlugin = VRMLoaderPlugin;
window.VRMUtils = VRMUtils;

// Properly expose VRMAnimation
window.VRMAnimation = VRMAnimation;

// Log available VRMAnimation exports
console.log('VRMAnimation exports:', Object.keys(VRMAnimation));

window.VRMAnimationHandler = VRMAnimationHandler;
window.VRMAnimationControls = VRMAnimationControls;

// Signal that THREE is loaded and ready
window.THREE_READY = true;
window.VRM_BUNDLE_LOADED = true;
console.log('THREE.js and VRM libraries loaded and ready');

// Dispatch a custom event that can be listened for
document.dispatchEvent(new CustomEvent('vrm-bundle-loaded'));

// Export for module usage
export default {
  THREE,
  GLTFLoader,
  OrbitControls,
  FBXLoader,
  BVHLoader,
  VRM,
  VRMLoaderPlugin,
  VRMUtils,
  VRMAnimation,
  VRMAnimationHandler,
  VRMAnimationControls
};

console.log('VRM Bundle loaded successfully');
console.log('THREE.js version:', THREE.REVISION);
console.log('VRM version:', VRM.VERSION); 
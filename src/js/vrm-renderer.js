/**
 * VRM Renderer Module
 * A simple module to render VRM models in the extension
 */

class VRMRenderer {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.options = Object.assign({
      background: 0x212121,
      autoRotate: true,
      showGrid: true,
      showAxes: true
    }, options);
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.clock = null;
    this.currentVRM = null;
    this.isRotating = this.options.autoRotate;
    
    this.init();
  }
  
  init() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.options.background);
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      30.0,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      20.0
    );
    this.camera.position.set(0.0, 1.0, 5.0);
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);
    
    // Add camera controls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1, 0);
    this.controls.update();
    
    // Add lights
    const light = new THREE.DirectionalLight(0xffffff, Math.PI);
    light.position.set(1.0, 1.0, 1.0).normalize();
    this.scene.add(light);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    // Add helpers
    if (this.options.showGrid) {
      const gridHelper = new THREE.GridHelper(10, 10);
      this.scene.add(gridHelper);
    }
    
    if (this.options.showAxes) {
      const axesHelper = new THREE.AxesHelper(5);
      this.scene.add(axesHelper);
    }
    
    // Create clock
    this.clock = new THREE.Clock();
    this.clock.start();
    
    // Handle window resize
    window.addEventListener('resize', this.onResize.bind(this));
    
    // Start animation loop
    this.animate();
  }
  
  onResize() {
    if (!this.camera || !this.renderer) return;
    
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }
  
  animate() {
    requestAnimationFrame(this.animate.bind(this));
    
    const delta = this.clock.getDelta();
    
    // Update VRM
    if (this.currentVRM && this.currentVRM.update) {
      this.currentVRM.update(delta);
    }
    
    // Rotate model if enabled
    if (this.isRotating && this.currentVRM && this.currentVRM.scene) {
      this.currentVRM.scene.rotation.y += 0.005;
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
   * Load a VRM model from URL
   * @param {string} url - The URL of the VRM model
   * @param {Function} onProgress - Progress callback
   * @param {Function} onSuccess - Success callback
   * @param {Function} onError - Error callback
   */
  loadVRM(url, onProgress, onSuccess, onError) {
    // Clear existing model
    if (this.currentVRM && this.currentVRM.scene) {
      this.scene.remove(this.currentVRM.scene);
      this.currentVRM = null;
    }
    
    // Create loader
    const loader = new THREE.GLTFLoader();
    loader.crossOrigin = 'anonymous';
    
    // Register VRM plugin
    loader.register((parser) => {
      return new VRMLoaderPlugin(parser);
    });
    
    // Load model
    loader.load(
      url,
      (gltf) => {
        try {
          // Handle VRM data
          if (gltf.userData && gltf.userData.vrm) {
            this.currentVRM = gltf.userData.vrm;
            this.scene.add(this.currentVRM.scene);
            
            // Apply VRM optimizations if available
            if (typeof VRMUtils !== 'undefined') {
              VRMUtils.removeUnnecessaryJoints(this.currentVRM.scene);
              
              // Disable frustum culling
              this.currentVRM.scene.traverse((obj) => {
                obj.frustumCulled = false;
              });
            }
            
            if (typeof onSuccess === 'function') {
              onSuccess(this.currentVRM);
            }
          } else {
            // Fallback to just using the GLTF scene
            this.currentVRM = {
              scene: gltf.scene,
              update: null
            };
            this.scene.add(gltf.scene);
            
            if (typeof onSuccess === 'function') {
              onSuccess(this.currentVRM);
            }
          }
        } catch (error) {
          if (typeof onError === 'function') {
            onError(error);
          }
        }
      },
      (progress) => {
        if (typeof onProgress === 'function') {
          const percent = progress.total > 0 ? Math.round(progress.loaded / progress.total * 100) : 0;
          onProgress(percent);
        }
      },
      (error) => {
        if (typeof onError === 'function') {
          onError(error);
        }
      }
    );
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
   * Reset camera to default position
   */
  resetCamera() {
    if (this.camera && this.controls) {
      this.camera.position.set(0.0, 1.0, 5.0);
      this.controls.target.set(0, 1, 0);
      this.controls.update();
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
      this.container.removeChild(this.renderer.domElement);
    }
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.clock = null;
  }
}

// Export the module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VRMRenderer;
} 
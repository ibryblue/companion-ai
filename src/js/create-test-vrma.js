/**
 * This script creates a simple test VRMA file for testing purposes
 */

(function() {
  // Use global THREE and VRMAnimation if available
  const THREE = window.THREE;
  
  if (!THREE) {
    console.error('THREE.js not found');
    return;
  }
  
  /**
   * Create a simple test VRMA file
   * @returns {Promise<Blob>} - The VRMA file as a Blob
   */
  function createTestVRMA() {
    return new Promise((resolve, reject) => {
      // Create a simple animation clip
      const tracks = [];
      
      // Create some keyframes for the head bone
      const headRotationTrack = new THREE.QuaternionKeyframeTrack(
        'humanoid.humanBones.head.node.quaternion',
        [0, 1, 2, 3, 4],  // times
        [
          // Initial position
          0, 0, 0, 1,
          // Look left
          0, 0.2, 0, 0.97,
          // Look right
          0, -0.2, 0, 0.97,
          // Look up
          0.1, 0, 0, 0.99,
          // Back to initial
          0, 0, 0, 1
        ]
      );
      tracks.push(headRotationTrack);
      
      // Create some keyframes for the spine
      const spineRotationTrack = new THREE.QuaternionKeyframeTrack(
        'humanoid.humanBones.spine.node.quaternion',
        [0, 2, 4],  // times
        [
          // Initial position
          0, 0, 0, 1,
          // Bend forward slightly
          0.1, 0, 0, 0.99,
          // Back to initial
          0, 0, 0, 1
        ]
      );
      tracks.push(spineRotationTrack);
      
      // Create animation clip
      const clip = new THREE.AnimationClip('test-animation', 4, tracks);
      
      // Create a dummy scene to export
      const scene = new THREE.Scene();
      
      // Create a dummy object to hold the animation
      const dummyObj = new THREE.Object3D();
      dummyObj.name = 'animation';
      scene.add(dummyObj);
      
      // Add animation to the scene
      dummyObj.animations = [clip];
      
      // Check if GLTFExporter is available
      if (!THREE.GLTFExporter) {
        console.error('THREE.GLTFExporter not found');
        reject(new Error('THREE.GLTFExporter not found'));
        return;
      }
      
      // Export as GLTF
      const exporter = new THREE.GLTFExporter();
      
      exporter.parse(
        scene,
        (gltf) => {
          // Convert to blob
          const blob = new Blob([JSON.stringify(gltf)], { type: 'application/octet-stream' });
          resolve(blob);
        },
        (error) => {
          console.error('Error exporting GLTF:', error);
          reject(error);
        },
        { animations: [clip] }
      );
    });
  }

  /**
   * Download the test VRMA file
   * @returns {Promise<void>}
   */
  async function downloadTestVRMA() {
    try {
      const blob = await createTestVRMA();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'test-animation.vrma';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      console.log('VRMA file created and download triggered');
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to create VRMA file:', error);
      return Promise.reject(error);
    }
  }

  // Expose functions globally
  window.createTestVRMA = createTestVRMA;
  window.createAndDownloadTestVRMA = downloadTestVRMA;
})(); 
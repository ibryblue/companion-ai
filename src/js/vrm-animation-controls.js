/**
 * VRM Animation Controls
 * UI component for controlling VRM animations
 */

class VRMAnimationControls {
  /**
   * Create a new VRM Animation Controls instance
   * @param {HTMLElement} containerElement - Container element for the controls
   * @param {VRMViewer} vrmViewer - The VRM viewer instance
   */
  constructor(containerElement, vrmViewer) {
    this.container = containerElement;
    this.vrmViewer = vrmViewer;
    this.initialized = false;
    
    // Create UI elements
    this.createUI();
  }
  
  /**
   * Create the UI elements for animation controls
   */
  createUI() {
    if (!this.container) {
      console.error('No container element provided for animation controls');
      return;
    }
    
    // Create controls container
    this.controlsContainer = document.createElement('div');
    this.controlsContainer.className = 'vrm-animation-controls';
    this.controlsContainer.style.marginTop = '10px';
    this.controlsContainer.style.padding = '10px';
    this.controlsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
    this.controlsContainer.style.borderRadius = '5px';
    
    // Create title
    const title = document.createElement('h3');
    title.textContent = 'Animation Controls';
    title.style.margin = '0 0 10px 0';
    title.style.fontSize = '14px';
    this.controlsContainer.appendChild(title);
    
    // Create file input for animations
    const fileInputContainer = document.createElement('div');
    fileInputContainer.style.marginBottom = '10px';
    
    const fileInputLabel = document.createElement('label');
    fileInputLabel.textContent = 'Load Animation: ';
    fileInputLabel.style.display = 'block';
    fileInputLabel.style.marginBottom = '5px';
    fileInputLabel.style.fontSize = '12px';
    
    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.vrma,.fbx,.bvh,.gltf,.glb';
    this.fileInput.disabled = true; // Disabled by default until VRM is loaded
    this.fileInput.style.width = '100%';
    this.fileInput.style.marginBottom = '5px';
    
    fileInputContainer.appendChild(fileInputLabel);
    fileInputContainer.appendChild(this.fileInput);
    
    // Add event listener for file input
    this.fileInput.addEventListener('change', this.onFileSelected.bind(this));
    
    // Create animation controls
    const controlsRow = document.createElement('div');
    controlsRow.style.display = 'flex';
    controlsRow.style.justifyContent = 'space-between';
    controlsRow.style.marginTop = '10px';
    
    // Play/Pause button
    this.playPauseButton = document.createElement('button');
    this.playPauseButton.textContent = 'Play';
    this.playPauseButton.disabled = true;
    this.playPauseButton.style.flex = '1';
    this.playPauseButton.style.marginRight = '5px';
    this.playPauseButton.addEventListener('click', this.togglePlayPause.bind(this));
    
    // Stop button
    this.stopButton = document.createElement('button');
    this.stopButton.textContent = 'Stop';
    this.stopButton.disabled = true;
    this.stopButton.style.flex = '1';
    this.stopButton.style.marginRight = '5px';
    this.stopButton.addEventListener('click', this.stopAnimation.bind(this));
    
    // Reset button
    this.resetButton = document.createElement('button');
    this.resetButton.textContent = 'Reset';
    this.resetButton.disabled = true;
    this.resetButton.style.flex = '1';
    this.resetButton.addEventListener('click', this.resetAnimation.bind(this));
    
    controlsRow.appendChild(this.playPauseButton);
    controlsRow.appendChild(this.stopButton);
    controlsRow.appendChild(this.resetButton);
    
    // Create drop zone for drag-and-drop
    this.dropZone = document.createElement('div');
    this.dropZone.className = 'animation-drop-zone';
    this.dropZone.textContent = 'Drag & Drop Animation File Here';
    this.dropZone.style.border = '2px dashed #ccc';
    this.dropZone.style.borderRadius = '5px';
    this.dropZone.style.padding = '20px';
    this.dropZone.style.textAlign = 'center';
    this.dropZone.style.marginTop = '10px';
    this.dropZone.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    this.dropZone.style.cursor = 'pointer';
    this.dropZone.style.fontSize = '12px';
    
    // Add event listeners for drag and drop
    this.dropZone.addEventListener('dragover', this.onDragOver.bind(this));
    this.dropZone.addEventListener('dragleave', this.onDragLeave.bind(this));
    this.dropZone.addEventListener('drop', this.onDrop.bind(this));
    this.dropZone.addEventListener('click', () => this.fileInput.click());
    
    // Status message
    this.statusMessage = document.createElement('div');
    this.statusMessage.className = 'animation-status';
    this.statusMessage.style.marginTop = '10px';
    this.statusMessage.style.fontSize = '12px';
    this.statusMessage.style.color = '#666';
    
    // Add all elements to the container
    this.controlsContainer.appendChild(fileInputContainer);
    this.controlsContainer.appendChild(this.dropZone);
    this.controlsContainer.appendChild(controlsRow);
    this.controlsContainer.appendChild(this.statusMessage);
    
    // Add the controls container to the main container
    this.container.appendChild(this.controlsContainer);
    
    this.initialized = true;
  }
  
  /**
   * Update the UI based on the current state
   */
  updateUI() {
    const vrmLoaded = this.vrmViewer && this.vrmViewer.currentVRM && this.vrmViewer.currentVRM.scene;
    const animationHandler = this.vrmViewer && this.vrmViewer.animationHandler;
    const animationActive = animationHandler && animationHandler.currentAction;
    
    // Update file input
    if (this.fileInput) {
      this.fileInput.disabled = !vrmLoaded;
    }
    
    // Update drop zone
    if (this.dropZone) {
      this.dropZone.style.opacity = vrmLoaded ? '1' : '0.5';
      this.dropZone.style.cursor = vrmLoaded ? 'pointer' : 'not-allowed';
      this.dropZone.textContent = vrmLoaded 
        ? 'Drag & Drop Animation File Here' 
        : 'Load a VRM model first';
    }
    
    // Update buttons
    if (this.playPauseButton) {
      this.playPauseButton.disabled = !animationActive;
      this.playPauseButton.textContent = animationActive && animationActive.isRunning() ? 'Pause' : 'Play';
    }
    
    if (this.stopButton) {
      this.stopButton.disabled = !animationActive;
    }
    
    if (this.resetButton) {
      this.resetButton.disabled = !animationActive;
    }
  }
  
  /**
   * Set a status message
   * @param {string} message - Status message
   * @param {string} type - Message type (info, success, error, warning)
   */
  setStatus(message, type = 'info') {
    if (!this.statusMessage) return;
    
    this.statusMessage.textContent = message;
    
    // Set color based on type
    switch (type) {
      case 'error':
        this.statusMessage.style.color = '#ff5555';
        break;
      case 'success':
        this.statusMessage.style.color = '#55aa55';
        break;
      case 'warning':
        this.statusMessage.style.color = '#aaaa55';
        break;
      default:
        this.statusMessage.style.color = '#666666';
    }
  }
  
  /**
   * Handle file selection from the file input
   * @param {Event} event - File input change event
   */
  onFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    this.loadAnimationFile(file);
  }
  
  /**
   * Handle dragover event for the drop zone
   * @param {DragEvent} event - Drag event
   */
  onDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.vrmViewer || !this.vrmViewer.currentVRM) return;
    
    this.dropZone.style.backgroundColor = 'rgba(200, 200, 255, 0.2)';
    this.dropZone.style.borderColor = '#aaa';
  }
  
  /**
   * Handle dragleave event for the drop zone
   * @param {DragEvent} event - Drag event
   */
  onDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    
    this.dropZone.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    this.dropZone.style.borderColor = '#ccc';
  }
  
  /**
   * Handle drop event for the drop zone
   * @param {DragEvent} event - Drop event
   */
  onDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    this.dropZone.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    this.dropZone.style.borderColor = '#ccc';
    
    if (!this.vrmViewer || !this.vrmViewer.currentVRM) {
      this.setStatus('Please load a VRM model first', 'error');
      return;
    }
    
    // Get the dropped file
    const file = event.dataTransfer.files[0];
    if (!file) return;
    
    this.loadAnimationFile(file);
  }
  
  /**
   * Load an animation file
   * @param {File} file - Animation file to load
   */
  loadAnimationFile(file) {
    if (!this.vrmViewer || !this.vrmViewer.currentVRM) {
      this.setStatus('Please load a VRM model first', 'error');
      return;
    }
    
    // Check file extension
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const supportedExtensions = ['vrma', 'fbx', 'bvh', 'gltf', 'glb'];
    
    if (!supportedExtensions.includes(fileExtension)) {
      this.setStatus(`Unsupported file format: ${fileExtension}`, 'error');
      return;
    }
    
    this.setStatus(`Loading animation: ${file.name}...`, 'info');
    
    // Make sure the animation handler is initialized
    if (!this.vrmViewer.animationHandler) {
      console.log('Animation handler not initialized, initializing now');
      this.vrmViewer.initAnimationHandler();
      
      if (!this.vrmViewer.animationHandler) {
        this.setStatus('Failed to initialize animation handler', 'error');
        return;
      }
    }
    
    console.log(`Loading animation file: ${file.name} (${file.size} bytes)`);
    
    // Load the animation
    this.vrmViewer.loadAnimationFromFile(file)
      .then((animations) => {
        console.log('Animation loading succeeded:', animations);
        
        if (animations && animations.length > 0) {
          this.setStatus(`Animation loaded successfully: ${file.name}`, 'success');
          
          // Log animation details for debugging
          animations.forEach((anim, index) => {
            console.log(`Animation ${index}: ${anim.name || 'unnamed'}, duration: ${anim.duration}s, tracks: ${anim.tracks.length}`);
            
            // Log some track details
            if (anim.tracks.length > 0) {
              console.log(`Sample tracks:`, anim.tracks.slice(0, 3));
            }
          });
        } else {
          this.setStatus(`No animations found in ${file.name}`, 'warning');
          
          // Try to create a test animation
          console.log('Trying to create a test animation');
          const testAnimation = this.vrmViewer.animationHandler.createSimpleTestAnimation();
          if (testAnimation) {
            this.vrmViewer.animationHandler.playAnimation(testAnimation);
            this.setStatus('Created and playing test animation', 'info');
          }
        }
        this.updateUI();
      })
      .catch((error) => {
        console.error('Error loading animation:', error);
        this.setStatus(`Failed to load animation: ${error.message}`, 'error');
        
        // Try to create a test animation
        console.log('Error occurred, trying to create a test animation');
        const testAnimation = this.vrmViewer.animationHandler.createSimpleTestAnimation();
        if (testAnimation) {
          this.vrmViewer.animationHandler.playAnimation(testAnimation);
          this.setStatus('Created and playing test animation', 'info');
        }
        
        this.updateUI();
      });
  }
  
  /**
   * Toggle play/pause of the current animation
   */
  togglePlayPause() {
    if (!this.vrmViewer || !this.vrmViewer.animationHandler) return;
    
    const animHandler = this.vrmViewer.animationHandler;
    const currentAction = animHandler.currentAction;
    
    if (currentAction) {
      if (currentAction.isRunning()) {
        currentAction.paused = true;
        this.setStatus('Animation paused', 'info');
      } else {
        currentAction.paused = false;
        this.setStatus('Animation playing', 'info');
      }
    }
    
    this.updateUI();
  }
  
  /**
   * Stop the current animation
   */
  stopAnimation() {
    if (!this.vrmViewer || !this.vrmViewer.animationHandler) return;
    
    this.vrmViewer.animationHandler.stopAnimation();
    this.setStatus('Animation stopped', 'info');
    this.updateUI();
  }
  
  /**
   * Reset the animation to the beginning
   */
  resetAnimation() {
    if (!this.vrmViewer || !this.vrmViewer.animationHandler) return;
    
    const animHandler = this.vrmViewer.animationHandler;
    const currentAction = animHandler.currentAction;
    
    if (currentAction) {
      currentAction.reset();
      this.setStatus('Animation reset', 'info');
    }
    
    this.updateUI();
  }
  
  /**
   * Update the controls state
   */
  update() {
    this.updateUI();
  }
}

// Export the class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VRMAnimationControls;
} 
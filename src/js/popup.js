// AI Companion Popup Script
// Handles extension settings and controls

// Wait for DOM content to be loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM content loaded, initializing popup UI');
  // Initialize the UI after DOM is loaded
  window.popupController = new PopupController();
});

class PopupController {
  constructor() {
    console.log('Initializing PopupController');
    this.currentTab = null;
    this.settings = {};
    this.stats = {};
    this.vrmModels = [];
    this.selectedCharacter = null;
    this.vrmViewer = null;
    this.vrmInitialized = false;
    this.currentVRMModel = null;
    
    this.init().then(() => {
      this.initEventListeners();
    });
  }
  
  async init() {
    try {
      console.log('🚀 Initializing popup controller');
      await this.loadSettings();
      this.updateUI();
      this.debugVRMModels();
      
      // Initialize VRM viewer if the container exists
      const vrmPreviewContainer = document.getElementById('vrm-preview-container');
      if (vrmPreviewContainer) {
        this.initVRMControls();
      }
      
      console.log('✅ Popup controller initialized');
    } catch (error) {
      console.error('❌ Failed to initialize popup controller:', error);
    }
  }
  
  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
      console.log('📄 Current tab:', tab.url);
    } catch (error) {
      console.error('Failed to get current tab:', error);
    }
  }
  
  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['settings'], (result) => {
        if (result.settings) {
          this.settings = result.settings;
          console.log('Settings loaded:', this.settings);
        } else {
          // Default settings
          this.settings = {
            enabled: false,
            muted: false,
            useAI: true,
            useVRM: false,
            selectedCharacter: 'zoro',
            responseFrequency: 50,
            responseDuration: 5,
            selectedVrmModel: '',
            vrmModels: []
          };
          console.log('Using default settings');
        }
        
        // Update UI with loaded settings
        this.updateUI();
        
        // Update VRM models list
        this.updateVRMModelsList();
        
        resolve();
      });
    });
  }
  
  saveSettings() {
    console.log('Saving settings:', this.settings);
    chrome.storage.local.set({ settings: this.settings }, () => {
      // Notify background script of settings update
      chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: this.settings
      });
    });
  }
  
  async loadVRMModels() {
    try {
      const result = await chrome.storage.local.get({ vrmModels: [] });
      this.vrmModels = result.vrmModels || [];
      console.log('🧍 VRM models loaded:', this.vrmModels);
      this.updateVRMModelsList();
    } catch (error) {
      console.error('Failed to load VRM models:', error);
      this.vrmModels = [];
    }
  }
  
  initEventListeners() {
    // Toggle event listeners
    document.getElementById('companion-toggle').addEventListener('change', (e) => {
      this.settings.enabled = e.target.checked;
      this.saveSettings();
      this.updateUI();
    });
    
    document.getElementById('mute-toggle').addEventListener('change', (e) => {
      this.settings.muted = e.target.checked;
      this.saveSettings();
    });
    
    document.getElementById('ai-toggle').addEventListener('change', (e) => {
      this.settings.useAI = e.target.checked;
      this.saveSettings();
    });
    
    document.getElementById('vrm-toggle').addEventListener('change', (e) => {
      this.settings.useVRM = e.target.checked;
      this.saveSettings();
      this.updateVRMControls();
    });
    
    // Character selection
    document.querySelectorAll('.character-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.character-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        this.settings.selectedCharacter = option.dataset.character;
        this.saveSettings();
      });
    });
    
    // Response settings
    document.getElementById('response-frequency').addEventListener('change', (e) => {
      this.settings.responseFrequency = parseInt(e.target.value);
      this.saveSettings();
    });
    
    document.getElementById('response-duration').addEventListener('change', (e) => {
      this.settings.responseDuration = parseInt(e.target.value);
      this.saveSettings();
    });
    
    // Reset button
    document.getElementById('reset-btn').addEventListener('click', () => {
      this.resetSettings();
    });
    
    // Initialize VRM upload functionality
    this.handleVRMUpload();
    
    // Add sample VRM model button
    const useSampleBtn = document.getElementById('use-sample-vrm-btn');
    if (useSampleBtn) {
      useSampleBtn.addEventListener('click', () => {
        this.useSampleVRMModel();
      });
    } else {
      // Create a button if it doesn't exist
      const vrmControls = document.getElementById('vrm-controls');
      if (vrmControls) {
        const sampleBtn = document.createElement('button');
        sampleBtn.id = 'use-sample-vrm-btn';
        sampleBtn.className = 'secondary-button';
        sampleBtn.textContent = 'Use Sample VRM';
        sampleBtn.style.marginLeft = '10px';
        
        // Find the upload button to position the new button next to it
        const uploadBtn = document.getElementById('upload-vrm-btn');
        if (uploadBtn && uploadBtn.parentNode) {
          uploadBtn.parentNode.insertBefore(sampleBtn, uploadBtn.nextSibling);
          
          // Add event listener
          sampleBtn.addEventListener('click', () => {
            this.useSampleVRMModel();
          });
        }
      }
    }
    
    // VRM model selection
    document.getElementById('vrm-models').addEventListener('change', (e) => {
      this.settings.selectedVrmModel = e.target.value;
      this.saveSettings();
      
      // Notify content script to update the VRM model
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateVRMModel',
            modelName: e.target.value
          }, (response) => {
            const error = chrome.runtime.lastError;
            if (error) {
              console.log('Error sending updateVRMModel message:', error);
            } else {
              console.log('VRM model update message sent, response:', response);
            }
          });
        }
      });
    });
    
    // Clear VRM models button
    const clearVrmBtn = document.getElementById('clear-vrm-btn');
    if (clearVrmBtn) {
      clearVrmBtn.addEventListener('click', () => {
        this.clearVRMModels();
      });
    }
  }
  
  updateUI() {
    // Update toggle states
    const companionToggle = document.getElementById('companion-toggle');
    if (companionToggle) companionToggle.checked = this.settings.enabled;
    
    const muteToggle = document.getElementById('mute-toggle');
    if (muteToggle) muteToggle.checked = this.settings.muted;
    
    const aiToggle = document.getElementById('ai-toggle');
    if (aiToggle) aiToggle.checked = this.settings.useAI;
    
    const vrmToggle = document.getElementById('vrm-toggle');
    if (vrmToggle) vrmToggle.checked = this.settings.useVRM;
    
    // Update select values
    const responseFrequency = document.getElementById('response-frequency');
    if (responseFrequency) responseFrequency.value = this.settings.responseFrequency;
    
    const responseDuration = document.getElementById('response-duration');
    if (responseDuration) responseDuration.value = this.settings.responseDuration;
    
    // Show/hide VRM controls based on toggle state
    this.updateVRMControlsVisibility();
    
    // Update character selection
    this.updateCharacterSelection();
    
    // Update status indicator
    this.updateStatusIndicator();
    
    // Update VRM models list
    this.updateVRMModelsList();
  }
  
  updateStatusIndicator() {
    const statusIndicator = document.getElementById('status-indicator');
    if (statusIndicator) {
      if (this.settings.enabled) {
        statusIndicator.classList.remove('status-disabled');
        statusIndicator.classList.add('status-enabled');
        statusIndicator.textContent = 'Enabled';
      } else {
        statusIndicator.classList.remove('status-enabled');
        statusIndicator.classList.add('status-disabled');
        statusIndicator.textContent = 'Disabled';
      }
    }
  }
  
  updateVRMControlsVisibility() {
    const vrmControls = document.getElementById('vrm-controls');
    if (vrmControls) {
      vrmControls.style.display = this.settings.useVRM ? 'block' : 'none';
    }
  }
  
  updateCharacterSelection() {
    const characterOptions = document.querySelectorAll('.character-option');
    characterOptions.forEach(option => {
      const character = option.getAttribute('data-character');
      if (character === this.settings.selectedCharacter) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });
  }
  
  selectCharacter(character) {
    this.settings.selectedCharacter = character;
    this.saveSettings();
    this.updateCharacterSelection();
    
    // Notify the content script about the character change
    this.sendMessageToTab({
      action: 'settingsUpdated',
      settings: { selectedCharacter: character }
    });
  }
  
  updateVRMModelsList() {
    const selectElement = document.getElementById('vrm-models');
    if (!selectElement) return;
    
    // Clear existing options
    selectElement.innerHTML = '';
    
    if (this.vrmModels && this.vrmModels.length > 0) {
      this.vrmModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.name;
        option.textContent = model.name;
        selectElement.appendChild(option);
      });
      
      // Set the selected model if it exists
      if (this.settings.selectedVrmModel) {
        selectElement.value = this.settings.selectedVrmModel;
      }
    } else {
      // Add a placeholder option if no models are available
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No models available';
      option.disabled = true;
      option.selected = true;
      selectElement.appendChild(option);
    }
    
    // Add event listener for selection change
    selectElement.addEventListener('change', (e) => {
      const selectedModelName = e.target.value;
      this.settings.selectedVrmModel = selectedModelName;
      this.saveSettings();
      
      // Update the VRM viewer
      if (this.vrmViewer && selectedModelName) {
        const selectedModel = this.vrmModels.find(model => model.name === selectedModelName);
        if (selectedModel && selectedModel.url) {
          this.vrmViewer.loadVRMFromURL(selectedModel.url)
            .then(() => console.log('Selected VRM model loaded in viewer'))
            .catch(error => console.error('Failed to load selected VRM model:', error));
        }
      }
      
      // Notify content script to update the VRM model
      this.sendMessageToTab({
        action: 'updateVRMModel',
        modelName: selectedModelName
      });
    });
  }
  
  handleVRMUpload() {
    const fileInput = document.getElementById('vrm-file-input');
    const uploadBtn = document.getElementById('upload-vrm-btn');
    const statusElement = document.getElementById('upload-status');
    
    if (fileInput && uploadBtn) {
      uploadBtn.addEventListener('click', () => {
        fileInput.click();
      });
      
      fileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) {
          return;
        }
        
        if (!file.name.toLowerCase().endsWith('.vrm')) {
          this.showError('Please select a valid VRM file');
          return;
        }
        
        try {
          if (statusElement) {
            statusElement.textContent = 'Processing VRM file...';
            statusElement.style.color = 'var(--text-secondary)';
          }
          
          console.log('Processing VRM file:', file.name);
          
          // Create a URL for the file
          const objectUrl = URL.createObjectURL(file);
          
          // Try to load the model in the viewer first to validate it
          if (this.vrmViewer) {
            try {
              await this.vrmViewer.loadVRMFromFile(file);
              console.log('VRM preview loaded successfully');
            } catch (error) {
              console.error('Failed to load VRM preview:', error);
              this.showError('Failed to load VRM model preview');
              URL.revokeObjectURL(objectUrl);
              return;
            }
          }
          
          // Existing code for storing the model
          const modelName = file.name.replace(/\.vrm$/i, '');
          
          // Check if a model with this name already exists
          const existingModelIndex = this.vrmModels.findIndex(model => model.name === modelName);
          if (existingModelIndex !== -1) {
            // Update existing model
            this.vrmModels[existingModelIndex] = {
              name: modelName,
              url: objectUrl,
              source: 'user',
              dateAdded: new Date().toISOString()
            };
          } else {
            // Add new model
            this.vrmModels.push({
              name: modelName,
              url: objectUrl,
              source: 'user',
              dateAdded: new Date().toISOString()
            });
          }
          
          // Update settings with the new model list
          this.settings.vrmModels = this.vrmModels;
          this.settings.selectedVrmModel = modelName;
          
          // Save to storage
          this.saveVRMModels();
          
          // Update the UI
          this.updateVRMModelsList();
          
          if (statusElement) {
            statusElement.textContent = 'VRM model uploaded successfully!';
            statusElement.style.color = 'var(--success-color, #4CAF50)';
          }
          
          // Notify content script to update the VRM model
          this.sendMessageToTab({
            action: 'updateVRMModel',
            modelName: modelName
          });
          
          // Reset the file input
          fileInput.value = '';
          
          console.log('VRM model added:', modelName);
        } catch (error) {
          console.error('Failed to process VRM file:', error);
          
          if (statusElement) {
            statusElement.textContent = 'Failed to process VRM file';
            statusElement.style.color = 'var(--error-color, #f44336)';
          }
          
          // Reset the file input
          fileInput.value = '';
        }
      });
    }
  }
  
  resetSettings() {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      this.settings = {
        enabled: false,
        muted: false,
        useAI: true,
        useVRM: false,
        selectedCharacter: 'zoro',
        responseFrequency: 50,
        responseDuration: 5,
        selectedVrmModel: '',
        vrmModels: []
      };
      
      this.saveSettings();
      this.updateUI();
      this.updateVRMModelsList();
    }
  }
  
  async sendMessageToTab(message) {
    try {
      if (this.currentTab && this.currentTab.id) {
        await chrome.tabs.sendMessage(this.currentTab.id, message);
      }
    } catch (error) {
      console.error('Failed to send message to tab:', error);
    }
  }
  
  showSuccess(message) {
    console.log('✅ ' + message);
  }
  
  showError(message) {
    console.error('❌ ' + message);
  }

  initVRMControls() {
    if (!this.vrmInitialized) {
      console.log('Initializing VRM controls');
      
      // Check if THREE is defined
      if (typeof THREE === 'undefined') {
        console.error('THREE is not defined. Make sure vrm-bundle.js is loaded correctly.');
        document.getElementById('error-container').textContent = 'THREE.js not defined. The bundled script may not have loaded correctly.';
        document.getElementById('status-container').textContent = 'Failed to initialize viewer';
        return;
      }
      
      // Initialize VRM viewer with proper error handling
      this.vrmViewer = new VRMViewer('vrm-preview-container');
      
      // Initialize the viewer with status and error callbacks
      const initSuccess = this.vrmViewer.init(
        // Status callback
        (status) => {
          console.log('VRM status:', status);
          const statusContainer = document.getElementById('status-container');
          if (statusContainer) statusContainer.textContent = status;
        },
        // Error callback
        (error) => {
          console.error('VRM error:', error);
          const errorContainer = document.getElementById('error-container');
          if (errorContainer) errorContainer.textContent = error;
        }
      );
      
      if (!initSuccess) {
        console.error('Failed to initialize VRM viewer');
        return;
      }

      // Handle model selection and loading
      const modelSelect = document.getElementById('model-select');
      const loadModelBtn = document.getElementById('load-model');
      
      if (modelSelect) {
        modelSelect.addEventListener('change', (e) => {
          if (e.target.value === 'sample') {
            const uploadBtn = document.getElementById('upload-vrm');
            if (uploadBtn) uploadBtn.disabled = true;
          } else {
            const uploadBtn = document.getElementById('upload-vrm');
            if (uploadBtn) uploadBtn.disabled = false;
          }
        });
      }

      if (loadModelBtn) {
        loadModelBtn.addEventListener('click', () => {
          const selected = modelSelect ? modelSelect.value : 'sample';
          if (selected === 'sample') {
            this.loadSampleModelWithFallbacks();
          } else {
            const fileInput = document.getElementById('vrm-file-input');
            if (fileInput) fileInput.click();
          }
        });
      }

      // Handle file upload
      const fileInput = document.getElementById('vrm-file-input');
      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) {
            const statusContainer = document.getElementById('status-container');
            const errorContainer = document.getElementById('error-container');
            
            if (statusContainer) statusContainer.textContent = `Loading model: ${file.name}`;
            if (errorContainer) errorContainer.textContent = '';
            
            this.vrmViewer.loadVRMFromFile(file, 
              // Success callback
              (model) => this.handleSuccessfulVRMLoad(file.name, model),
              // Error callback
              (error) => {
                console.error('Error loading VRM file:', error);
                if (errorContainer) errorContainer.textContent = `Error: ${error}`;
                if (statusContainer) statusContainer.textContent = 'Failed to load model';
              });
          }
        });
      }

      // Upload VRM button
      const uploadBtn = document.getElementById('upload-vrm');
      if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
          if (fileInput) fileInput.click();
        });
      }

      // Toggle rotation button
      const toggleRotationBtn = document.getElementById('toggle-rotation');
      if (toggleRotationBtn) {
        toggleRotationBtn.addEventListener('click', (e) => {
          if (this.vrmViewer) {
            const isRotating = this.vrmViewer.toggleRotation();
            e.target.textContent = isRotating ? 'Stop Rotation' : 'Start Rotation';
          }
        });
      }

      // Reset camera button
      const resetCameraBtn = document.getElementById('reset-camera');
      if (resetCameraBtn) {
        resetCameraBtn.addEventListener('click', () => {
          if (this.vrmViewer) {
            this.vrmViewer.resetCamera();
          }
        });
      }

      this.vrmInitialized = true;
      console.log('VRM controls initialized');
    }

    // Show/hide VRM controls based on toggle state
    const vrmControls = document.getElementById('vrm-controls');
    if (vrmControls) {
      vrmControls.style.display = this.settings.useVRM ? 'block' : 'none';
    }

    // If VRM is enabled and no model is loaded yet, use the sample model
    if (this.settings.useVRM && !this.currentVRMModel) {
      setTimeout(() => {
        this.loadSampleModelWithFallbacks();
      }, 500);
    }
  }

  updateVRMControls() {
    const vrmControls = document.getElementById('vrm-controls');
    if (vrmControls) {
      vrmControls.style.display = this.settings.useVRM ? 'block' : 'none';
    }
  }

  loadSampleModelWithFallbacks() {
    const statusContainer = document.getElementById('status-container');
    const errorContainer = document.getElementById('error-container');
    
    if (statusContainer) statusContainer.textContent = 'Loading sample VRM model...';
    if (errorContainer) errorContainer.textContent = '';
    
    console.log('Attempting to load sample VRM model');
    
    // List of URLs to try in order
    const modelUrls = [
      // GitHub raw content
      'https://raw.githubusercontent.com/pixiv/three-vrm/release/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm',
      // JSDelivr CDN (faster and more reliable)
      'https://cdn.jsdelivr.net/gh/pixiv/three-vrm@release/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm',
      // Local extension file (if available)
      chrome.runtime.getURL('models/sample.vrm'),
      // Another sample model from VRM consortium
      'https://cdn.jsdelivr.net/gh/vrm-c/vrm-specification@master/samples/VRM1_Constraint_Twist_Sample.vrm'
    ];
    
    // Try to load models in sequence
    this.tryLoadModelSequence(modelUrls, 0);
  }
  
  /**
   * Try loading models from a list of URLs in sequence
   * @param {Array} urls - List of URLs to try
   * @param {number} index - Current index in the list
   */
  tryLoadModelSequence(urls, index) {
    if (index >= urls.length) {
      // We've tried all URLs and failed
      const errorContainer = document.getElementById('error-container');
      const statusContainer = document.getElementById('status-container');
      
      if (errorContainer) errorContainer.textContent = 'Failed to load any sample model';
      if (statusContainer) statusContainer.textContent = 'All sample models failed to load';
      console.error('Failed to load any sample VRM model after trying all URLs');
      return;
    }
    
    const currentUrl = urls[index];
    const statusContainer = document.getElementById('status-container');
    
    if (statusContainer) statusContainer.textContent = `Loading sample model (attempt ${index + 1}/${urls.length})...`;
    console.log(`Trying to load VRM from URL (${index + 1}/${urls.length}):`, currentUrl);
    
    // Only proceed if we have a viewer
    if (!this.vrmViewer) {
      console.error('VRM viewer not initialized');
      return;
    }
    
    this.vrmViewer.loadVRMFromURL(
      currentUrl,
      // Success callback
      (model) => {
        console.log('Sample VRM model loaded successfully');
        this.handleSuccessfulVRMLoad('Sample VRM', model);
      },
      // Error callback
      (error) => {
        console.warn(`Failed to load sample model from ${currentUrl}:`, error);
        // Try next URL
        this.tryLoadModelSequence(urls, index + 1);
      }
    );
  }

  handleSuccessfulVRMLoad(name, model) {
    this.currentVRMModel = {
      name: name,
      model: model
    };
    document.getElementById('status-container').textContent = `Model loaded: ${name}`;
    document.getElementById('error-container').textContent = '';
    
    // Save this model to storage if it's not the sample model
    if (name !== 'Sample VRM') {
      // You could implement storage logic here if needed
    }
  }

  // Debug function to check VRM models in storage
  debugVRMModels() {
    console.log("Debugging VRM models in storage");
    chrome.storage.local.get(['settings'], (result) => {
      const settings = result.settings || {};
      const vrmModels = settings.vrmModels || [];
      
      console.log("Settings object:", settings);
      console.log(`Found ${vrmModels.length} VRM models in storage`);
      
      if (vrmModels.length > 0) {
        vrmModels.forEach((model, index) => {
          console.log(`Model ${index + 1}: ${model.name}`);
          console.log(`Data length: ${model.data ? model.data.length : 0} characters`);
        });
        
        console.log(`Selected VRM model: ${settings.selectedVrmModel}`);
      } else {
        console.log("No VRM models found in storage");
        
        // If no models found, use the sample model
        this.useSampleVRMModel();
      }
    });
  }
  
  // Use the sample VRM model from models directory
  useSampleVRMModel() {
    // Use a more reliable sample VRM URL
    const sampleVRMUrl = 'https://raw.githubusercontent.com/pixiv/three-vrm/release/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm';
    const modelName = 'Sample VRM';
    
    try {
      // Show status
      const statusElement = document.getElementById('upload-status');
      if (statusElement) {
        statusElement.textContent = 'Loading sample VRM model...';
        statusElement.style.color = 'var(--text-secondary)';
      }
      
      // Try to load the model in the viewer first
      if (this.vrmViewer) {
        this.loadSampleModelWithFallbacks(statusElement);
      }
    } catch (error) {
      console.error('Failed to process sample VRM:', error);
      
      const statusElement = document.getElementById('upload-status');
      if (statusElement) {
        statusElement.textContent = 'Failed to load sample VRM model';
        statusElement.style.color = 'var(--error-color, #f44336)';
      }
    }
  }
  
  // New function to handle multiple fallbacks for sample model
  loadSampleModelWithFallbacks(statusElement) {
    // Primary URL
    const sampleVRMUrl = 'https://raw.githubusercontent.com/pixiv/three-vrm/release/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm';
    const modelName = 'Sample VRM';
    
    // Try the primary URL
    this.vrmViewer.loadVRMFromURL(sampleVRMUrl)
      .then((vrm) => this.handleSuccessfulVRMLoad(modelName, vrm, sampleVRMUrl, 'remote', statusElement))
      .catch((error) => {
        console.error('Failed to load primary sample VRM:', error);
        
        // Try fallback URL - use the extension's local file
        const fallbackVRMUrl = chrome.runtime.getURL('models/7062840423830520603.vrm');
        console.log('Trying fallback VRM URL:', fallbackVRMUrl);
        
        this.vrmViewer.loadVRMFromURL(fallbackVRMUrl)
          .then((vrm) => this.handleSuccessfulVRMLoad(modelName, vrm, fallbackVRMUrl, 'local', statusElement))
          .catch((fallbackError) => {
            console.error('Failed to load fallback VRM:', fallbackError);
            
            // Try one more reliable CDN source
            const cdnFallbackUrl = 'https://cdn.jsdelivr.net/gh/pixiv/three-vrm@release/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm';
            console.log('Trying CDN fallback VRM URL:', cdnFallbackUrl);
            
            this.vrmViewer.loadVRMFromURL(cdnFallbackUrl)
              .then((vrm) => this.handleSuccessfulVRMLoad(modelName, vrm, cdnFallbackUrl, 'cdn', statusElement))
              .catch((cdnError) => {
                console.error('Failed to load CDN fallback VRM:', cdnError);
                
                if (statusElement) {
                  statusElement.textContent = 'Failed to load sample VRM model';
                  statusElement.style.color = 'var(--error-color, #f44336)';
                }
              });
          });
      });
  }
  
  // Helper function to handle successful VRM loading
  handleSuccessfulVRMLoad(name, vrm, url, source, statusElement) {
    console.log(`${source} VRM preview loaded successfully`);
    
    // Check if the model already exists
    const existingModelIndex = this.vrmModels.findIndex(model => model.name === name);
    
    if (existingModelIndex !== -1) {
      // Update existing model
      this.vrmModels[existingModelIndex] = {
        name: name,
        url: url,
        source: source,
        dateAdded: new Date().toISOString()
      };
    } else {
      // Add new model
      this.vrmModels.push({
        name: name,
        url: url,
        source: source,
        dateAdded: new Date().toISOString()
      });
    }
    
    // Update settings
    this.settings.vrmModels = this.vrmModels;
    this.settings.selectedVrmModel = name;
    
    // Save to storage
    this.saveVRMModels();
    
    // Update UI
    this.updateVRMModelsList();
    
    if (statusElement) {
      statusElement.textContent = `${name} loaded successfully!`;
      statusElement.style.color = 'var(--success-color, #4CAF50)';
    }
    
    // Notify content script
    this.sendMessageToTab({
      action: 'updateVRMModel',
      modelName: name
    });
    
    return vrm;
  }

  // Clear all VRM models
  clearVRMModels() {
    if (confirm('Are you sure you want to delete all VRM models?')) {
      console.log("Clearing all VRM models");
      
      chrome.storage.local.get(['settings'], (result) => {
        const settings = result.settings || {};
        const vrmModels = settings.vrmModels || [];
        
        // Get all model keys to remove
        const keysToRemove = vrmModels.map(model => `vrm_model_${model.name}`);
        console.log("Keys to remove:", keysToRemove);
        
        // Clear VRM models array and selected model
        settings.vrmModels = [];
        settings.selectedVrmModel = '';
        
        // Save settings and remove model data
        chrome.storage.local.set({ settings }, () => {
          console.log("Settings updated, removing model data");
          
          if (keysToRemove.length > 0) {
            chrome.storage.local.remove(keysToRemove, () => {
              console.log("Model data removed");
              
              // Verify removal
              chrome.storage.local.get(null, (allData) => {
                console.log("Storage after clearing:", Object.keys(allData));
              });
            });
          }
          
          console.log("All VRM models cleared");
          
          // Update UI
          this.updateVRMModelsList();
          
          // Notify background script of settings update
          chrome.runtime.sendMessage({
            action: "updateSettings",
            settings: settings
          });
        });
      });
    }
  }

  // Add this method to initialize the VRM viewer
  initVRMViewer(container) {
    try {
      // Create VRM viewer
      this.vrmViewer = new VRMViewer(container.id);
      
      // Load the currently selected VRM model if available
      if (this.settings.selectedVrmModel && this.vrmModels.length > 0) {
        const selectedModel = this.vrmModels.find(model => model.name === this.settings.selectedVrmModel);
        if (selectedModel && selectedModel.url) {
          this.vrmViewer.loadVRMFromURL(
            selectedModel.url,
            (model) => console.log('Selected VRM model loaded in viewer'),
            (error) => console.error('Failed to load selected VRM model:', error)
          );
        }
      } else if (this.vrmModels.length > 0) {
        // Load the first model if no specific model is selected
        const firstModel = this.vrmModels[0];
        if (firstModel && firstModel.url) {
          this.vrmViewer.loadVRMFromURL(
            firstModel.url,
            (model) => console.log('First VRM model loaded in viewer'),
            (error) => console.error('Failed to load first VRM model:', error)
          );
        }
      }
    } catch (error) {
      console.error('Failed to initialize VRM viewer:', error);
    }
  }
}

// Handle popup unload
window.addEventListener('beforeunload', () => {
  console.log('👋 Popup closing');
});

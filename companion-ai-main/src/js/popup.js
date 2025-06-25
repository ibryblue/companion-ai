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
    const companionToggle = document.getElementById('companion-toggle');
    if (companionToggle) {
      companionToggle.addEventListener('change', (e) => {
        this.settings.enabled = e.target.checked;
        this.saveSettings();
        this.updateUI();
      });
    }
    
    const muteToggle = document.getElementById('mute-toggle');
    if (muteToggle) {
      muteToggle.addEventListener('change', (e) => {
        this.settings.muted = e.target.checked;
        this.saveSettings();
      });
    }
    
    const aiToggle = document.getElementById('ai-toggle');
    if (aiToggle) {
      aiToggle.addEventListener('change', (e) => {
        this.settings.useAI = e.target.checked;
        this.saveSettings();
      });
    }
    
    const vrmToggle = document.getElementById('vrm-toggle');
    if (vrmToggle) {
      vrmToggle.addEventListener('change', (e) => {
        this.settings.useVRM = e.target.checked;
        this.saveSettings();
        this.updateVRMControls();
      });
    }
    
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
    const responseFrequency = document.getElementById('response-frequency');
    if (responseFrequency) {
      responseFrequency.addEventListener('change', (e) => {
        this.settings.responseFrequency = parseInt(e.target.value);
        this.saveSettings();
      });
    }
    
    const responseDuration = document.getElementById('response-duration');
    if (responseDuration) {
      responseDuration.addEventListener('change', (e) => {
        this.settings.responseDuration = parseInt(e.target.value);
        this.saveSettings();
      });
    }
    
    // Reset button
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.resetSettings();
      });
    }
    
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
    const vrmModelsSelect = document.getElementById('vrm-models');
    if (vrmModelsSelect) {
      vrmModelsSelect.addEventListener('change', (e) => {
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
    }
    
    // Clear VRM models button
    const clearVrmBtn = document.getElementById('clear-vrm-btn');
    if (clearVrmBtn) {
      clearVrmBtn.addEventListener('click', () => {
        this.clearVRMModels();
      });
    }

    // Load Model button
    const loadModelBtn = document.getElementById('load-model');
    if (loadModelBtn) {
      loadModelBtn.addEventListener('click', () => {
        // Get the selected model type
        const modelSelect = document.getElementById('model-select');
        if (!modelSelect) return;
        
        const selectedValue = modelSelect.value;
        console.log('Selected model type:', selectedValue);
        
        // Handle based on selection
        if (selectedValue === 'sample') {
          // Load sample model
          this.useSampleVRMModel();
        } else if (selectedValue === 'local') {
          // Trigger file upload for local model
          const fileInput = document.getElementById('vrm-file-input');
          if (fileInput) {
            fileInput.click();
          } else {
            console.error('File input element not found');
            const statusElement = document.getElementById('status-container');
            if (statusElement) {
              statusElement.textContent = 'Error: File input not found';
            }
          }
        }
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
    if (!selectElement) {
      console.warn('VRM models select element not found');
      return;
    }
    
    // Clear existing options
    selectElement.innerHTML = '';
    
    if (this.vrmModels && this.vrmModels.length > 0) {
      // Add each model to the dropdown
      this.vrmModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.name;
        option.textContent = model.name;
        selectElement.appendChild(option);
      });
      
      // Set the selected model if it exists
      if (this.settings.selectedVrmModel) {
        // Check if the selected model exists in the list
        const modelExists = this.vrmModels.some(model => model.name === this.settings.selectedVrmModel);
        if (modelExists) {
          selectElement.value = this.settings.selectedVrmModel;
        } else {
          console.warn('Selected model not found in list:', this.settings.selectedVrmModel);
          // If the selected model doesn't exist, select the first one
          if (this.vrmModels.length > 0) {
            this.settings.selectedVrmModel = this.vrmModels[0].name;
            this.saveSettings();
          }
        }
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
    
    // Also update the model-select dropdown if it exists
    const modelSelect = document.getElementById('model-select');
    if (modelSelect) {
      // If we have a selected model, set the appropriate option
      if (this.settings.selectedVrmModel === 'Sample VRM') {
        modelSelect.value = 'sample';
      } else if (this.settings.selectedVrmModel) {
        modelSelect.value = 'local';
      }
    }
    
    // Remove any existing event listeners to prevent duplicates
    const newSelect = selectElement.cloneNode(true);
    selectElement.parentNode.replaceChild(newSelect, selectElement);
    
    // Add event listener for selection change
    newSelect.addEventListener('change', (e) => {
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
        modelName: selectedModelName,
        modelData: this.vrmModels.find(model => model.name === selectedModelName)
      });
    });
  }
  
  handleVRMUpload() {
    const fileInput = document.getElementById('vrm-file-input');
    const uploadBtn = document.getElementById('upload-vrm');
    const statusContainer = document.getElementById('status-container');
    const errorContainer = document.getElementById('error-container');
    
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
          if (errorContainer) errorContainer.textContent = 'Please select a valid VRM file';
          if (statusContainer) statusContainer.textContent = 'Invalid file format';
          return;
        }
        
        try {
          if (statusContainer) {
            statusContainer.textContent = 'Processing VRM file...';
          }
          if (errorContainer) {
            errorContainer.textContent = '';
          }
          
          console.log('Processing VRM file:', file.name);
          
          // Make sure the VRM viewer is initialized
          if (!this.vrmViewer || !this.vrmViewer.isInitialized) {
            console.log('VRM viewer not initialized, initializing now');
            const vrmPreviewContainer = document.getElementById('vrm-preview-container');
            if (vrmPreviewContainer) {
              this.initVRMControls();
            }
          }
          
          // Try to load the model in the viewer
          if (this.vrmViewer && this.vrmViewer.isInitialized) {
            try {
              console.log('Loading VRM file into viewer');
              
              // Use loadVRMFromFile to load directly from the File object
              await this.vrmViewer.loadVRMFromFile(file, 
                // Success callback
                (vrm) => {
                  console.log('VRM preview loaded successfully');
                  
                  // Save the model
                  const modelName = file.name.replace(/\.vrm$/i, '');
                  
                  // Create a URL for the file
                  const objectUrl = URL.createObjectURL(file);
                  
                  // Handle successful load
                  this.handleSuccessfulVRMLoad(modelName, vrm, objectUrl, 'user', statusContainer);
                },
                // Error callback
                (error) => {
                  console.error('Failed to load VRM preview:', error);
                  if (errorContainer) errorContainer.textContent = 'Failed to load VRM model: ' + error;
                  if (statusContainer) statusContainer.textContent = 'Error loading model';
                }
              );
            } catch (error) {
              console.error('Error in loadVRMFromFile:', error);
              if (errorContainer) errorContainer.textContent = 'Error processing file: ' + error.message;
              if (statusContainer) statusContainer.textContent = 'Failed to process file';
            }
          } else {
            console.error('VRM viewer not available');
            if (errorContainer) errorContainer.textContent = 'VRM viewer not available';
            if (statusContainer) statusContainer.textContent = 'Cannot load model';
          }
          
          // Reset the file input
          fileInput.value = '';
          
        } catch (error) {
          console.error('Failed to process VRM file:', error);
          
          if (errorContainer) errorContainer.textContent = 'Error: ' + error.message;
          if (statusContainer) statusContainer.textContent = 'Failed to process VRM file';
          
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
      
      // Check if the container exists
      const vrmPreviewContainer = document.getElementById('vrm-preview-container');
      if (!vrmPreviewContainer) {
        console.error('VRM preview container not found');
        return;
      }
      
      // Check if THREE is defined
      if (typeof THREE === 'undefined') {
        console.error('THREE is not defined. Make sure vrm-bundle.js is loaded correctly.');
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) errorContainer.textContent = 'THREE.js not defined. The bundled script may not have loaded correctly.';
        const statusContainer = document.getElementById('status-container');
        if (statusContainer) statusContainer.textContent = 'Failed to initialize viewer';
        return;
      }
      
      try {
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
        
        this.vrmInitialized = true;

        // Handle model selection and loading - with null checks
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
            // Get the selected model type
            const modelSelect = document.getElementById('model-select');
            if (!modelSelect) return;
            
            const selectedValue = modelSelect.value;
            console.log('Selected model type:', selectedValue);
            
            // Handle based on selection
            if (selectedValue === 'sample') {
              // Load sample model
              this.useSampleVRMModel();
            } else if (selectedValue === 'local') {
              // Trigger file upload for local model
              const fileInput = document.getElementById('vrm-file-input');
              if (fileInput) {
                fileInput.click();
              } else {
                console.error('File input element not found');
                const statusElement = document.getElementById('status-container');
                if (statusElement) {
                  statusElement.textContent = 'Error: File input not found';
                }
              }
            }
          });
        }
      } catch (error) {
        console.error('Error initializing VRM controls:', error);
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) errorContainer.textContent = `Initialization error: ${error.message}`;
        const statusContainer = document.getElementById('status-container');
        if (statusContainer) statusContainer.textContent = 'Failed to initialize viewer';
      }
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
    try {
      // Show status
      const statusContainer = document.getElementById('status-container');
      if (statusContainer) {
        statusContainer.textContent = 'Loading sample VRM model...';
      }
      
      // Check if VRM viewer is initialized
      if (!this.vrmViewer) {
        console.error('VRM viewer not initialized');
        if (statusContainer) {
          statusContainer.textContent = 'VRM viewer not initialized';
        }
        return;
      }
      
      // Try to load the model in the viewer
      console.log('Attempting to load sample VRM model');
      this.loadSampleModelWithFallbacks(statusContainer);
      
      // Also update the model-select dropdown if it exists
      const modelSelect = document.getElementById('model-select');
      if (modelSelect) {
        modelSelect.value = 'sample';
      }
    } catch (error) {
      console.error('Failed to process sample VRM:', error);
      
      const statusContainer = document.getElementById('status-container');
      if (statusContainer) {
        statusContainer.textContent = 'Failed to load sample VRM model';
      }
    }
  }
  
  // New function to handle multiple fallbacks for sample model
  loadSampleModelWithFallbacks(statusElement) {
    // Primary URL
    const sampleVRMUrl = 'https://raw.githubusercontent.com/pixiv/three-vrm/release/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm';
    const modelName = 'Sample VRM';
    
    // Make sure we have a valid VRM viewer
    if (!this.vrmViewer || typeof this.vrmViewer.loadVRMFromURL !== 'function') {
      console.error('VRM viewer not initialized or loadVRMFromURL method not available');
      if (statusElement) {
        statusElement.textContent = 'VRM viewer not initialized';
        statusElement.style.color = 'var(--error-color, #f44336)';
      }
      return;
    }
    
    // Try the primary URL
    this.vrmViewer.loadVRMFromURL(sampleVRMUrl)
      .then((vrm) => {
        console.log('Primary sample VRM loaded successfully');
        return this.handleSuccessfulVRMLoad(modelName, vrm, sampleVRMUrl, 'remote', statusElement);
      })
      .catch((error) => {
        console.error('Failed to load primary sample VRM:', error);
        
        // Try fallback URL - use the extension's local file
        const fallbackVRMUrl = chrome.runtime.getURL('models/7062840423830520603.vrm');
        console.log('Trying fallback VRM URL:', fallbackVRMUrl);
        
        return this.vrmViewer.loadVRMFromURL(fallbackVRMUrl)
          .then((vrm) => {
            console.log('Local sample VRM loaded successfully');
            return this.handleSuccessfulVRMLoad(modelName, vrm, fallbackVRMUrl, 'local', statusElement);
          })
          .catch((fallbackError) => {
            console.error('Failed to load fallback VRM:', fallbackError);
            
            // Try one more reliable CDN source
            const cdnFallbackUrl = 'https://cdn.jsdelivr.net/gh/pixiv/three-vrm@release/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm';
            console.log('Trying CDN fallback VRM URL:', cdnFallbackUrl);
            
            return this.vrmViewer.loadVRMFromURL(cdnFallbackUrl)
              .then((vrm) => {
                console.log('CDN sample VRM loaded successfully');
                return this.handleSuccessfulVRMLoad(modelName, vrm, cdnFallbackUrl, 'cdn', statusElement);
              })
              .catch((cdnError) => {
                console.error('Failed to load CDN fallback VRM:', cdnError);
                
                if (statusElement) {
                  statusElement.textContent = 'Failed to load sample VRM model';
                  statusElement.style.color = 'var(--error-color, #f44336)';
                }
                
                throw new Error('All VRM loading attempts failed');
              });
          });
      })
      .catch((finalError) => {
        console.error('All VRM loading attempts failed:', finalError);
        if (statusElement) {
          statusElement.textContent = 'Failed to load any VRM model';
          statusElement.style.color = 'var(--error-color, #f44336)';
        }
      });
  }
  
  // Helper function to handle successful VRM loading
  handleSuccessfulVRMLoad(name, vrm, url, source, statusElement) {
    console.log(`${source} VRM preview loaded successfully`);
    
    // Generate a unique ID for the model if it doesn't have one
    const modelId = name.replace(/\s+/g, '_').toLowerCase();
    
    // Create a model object with all necessary data
    const modelData = {
      name: name,
      id: modelId,
      url: url,
      source: source,
      dateAdded: new Date().toISOString()
    };
    
    // Check if the model already exists
    const existingModelIndex = this.vrmModels.findIndex(model => model.name === name);
    
    if (existingModelIndex !== -1) {
      // Update existing model
      this.vrmModels[existingModelIndex] = modelData;
    } else {
      // Add new model
      this.vrmModels.push(modelData);
    }
    
    // Update settings
    this.settings.vrmModels = this.vrmModels;
    this.settings.selectedVrmModel = name;
    
    // Save to storage
    this.saveVRMModels();
    
    // Update UI
    this.updateVRMModelsList();
    
    // Update status message
    if (statusElement) {
      if (typeof statusElement.textContent === 'string') {
        statusElement.textContent = `${name} loaded successfully!`;
        statusElement.style.color = 'var(--success-color, #4CAF50)';
      } else {
        console.log(`${name} loaded successfully!`);
      }
    }
    
    // Notify content script about the new model
    this.sendMessageToTab({
      action: 'updateVRMModel',
      modelName: name,
      modelData: modelData
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

  // Save VRM models to storage
  saveVRMModels() {
    console.log('Saving VRM models to storage:', this.vrmModels);
    
    // Update settings with the current VRM models list
    this.settings.vrmModels = this.vrmModels;
    
    // Save settings to storage
    this.saveSettings();
    
    console.log('VRM models saved to settings');
  }
}

// Handle popup unload
window.addEventListener('beforeunload', () => {
  console.log('👋 Popup closing');
});

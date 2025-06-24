// AI Companion Popup Script
// Handles extension settings and controls

class PopupController {
  constructor() {
    console.log('Initializing PopupController');
    this.currentTab = null;
    this.settings = {};
    this.stats = {};
    this.vrmModels = [];
    this.selectedCharacter = null;
    
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
    console.log("Updating VRM models list");
    const vrmModelsSelect = document.getElementById('vrm-models');
    if (!vrmModelsSelect) {
      console.error("VRM models select element not found");
      return;
    }
    
    // Clear existing options
    vrmModelsSelect.innerHTML = '';
    
    // Get settings to access VRM models list
    chrome.storage.local.get(['settings'], (result) => {
      chrome.storage.local.get(null, (allData) => {
        const settings = result.settings || {};
        const vrmModels = settings.vrmModels || [];
        
        console.log(`Found ${vrmModels.length} VRM models in settings`);
        console.log('Current storage keys:', Object.keys(allData));
        
        // Add "No models" option if no models
        if (vrmModels.length === 0) {
          const option = document.createElement('option');
          option.value = '';
          option.textContent = 'No models available';
          vrmModelsSelect.appendChild(option);
          return;
        }
        
        // Add models to dropdown
        let modelsAdded = 0;
        
        vrmModels.forEach(model => {
          const option = document.createElement('option');
          option.value = model.name;
          
          // Display a friendly name for built-in models
          if (model.isBuiltIn) {
            option.textContent = 'Sample VRM Model (Built-in)';
          } else {
            // Format name for user-uploaded models
            const displayName = model.name.replace(/^\d+/, '').replace(/\.vrm$/, '');
            option.textContent = displayName || model.name;
          }
          
          vrmModelsSelect.appendChild(option);
          modelsAdded++;
        });
        
        // If no models were actually added, show the "No models" option
        if (modelsAdded === 0) {
          vrmModelsSelect.innerHTML = '';
          const option = document.createElement('option');
          option.value = '';
          option.textContent = 'No models available';
          vrmModelsSelect.appendChild(option);
        }
        // Select the current model
        else if (settings.selectedVrmModel) {
          console.log(`Setting selected model to: ${settings.selectedVrmModel}`);
          vrmModelsSelect.value = settings.selectedVrmModel;
        }
      });
    });
  }
  
  handleVRMUpload() {
    console.log("Setting up VRM upload functionality");
    const fileInput = document.getElementById('vrm-file-input');
    const uploadStatus = document.getElementById('upload-status');
    
    if (!fileInput || !uploadStatus) {
      console.error("VRM file input or upload status elements not found");
      return;
    }
    
    // Remove any existing event listeners to prevent duplicates
    const uploadBtn = document.getElementById('upload-vrm-btn');
    const newUploadBtn = uploadBtn.cloneNode(true);
    uploadBtn.parentNode.replaceChild(newUploadBtn, uploadBtn);
    
    const newFileInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newFileInput, fileInput);
    
    // Add click event listener to the upload button
    newUploadBtn.addEventListener('click', () => {
      console.log("Upload button clicked");
      newFileInput.click();
    });

    // Add change event listener to the file input
    newFileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) {
        console.log("No file selected");
        return;
      }
      
      uploadStatus.textContent = "Uploading...";
      console.log("File selected:", file.name, "Size:", file.size);
      
      // Check if file is too large (Chrome storage.local has ~5MB limit per item)
      const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB to be safe
      if (file.size > MAX_FILE_SIZE) {
        console.warn(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB) for storage.local API`);
        uploadStatus.textContent = "Error: File too large (max 4MB)";
        uploadStatus.style.color = "red";
        
        setTimeout(() => {
          uploadStatus.textContent = "";
          uploadStatus.style.color = "";
        }, 5000);
        
        newFileInput.value = '';
        return;
      }
      
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          console.log("File read successfully, processing data");
          const result = e.target.result;
          console.log("Result type:", typeof result);
          console.log("Result starts with:", result.substring(0, 50));
          
          // Get base64 data - make sure to extract just the data part after the comma if it's a data URL
          let base64Data = result;
          if (typeof result === 'string' && result.includes(',')) {
            base64Data = result.split(',')[1];
            console.log("Extracted base64 data after comma");
          }
          
          const modelName = file.name.replace('.vrm', '');
          console.log("Model name:", modelName);
          
          // Store the model directly in chrome.storage.local
          const modelKey = `vrm_model_${modelName}`;
          const modelData = {
            name: modelName,
            data: base64Data,
            timestamp: Date.now()
          };
          
          console.log("Storing model with key:", modelKey);
          
          // First, get the current settings
          chrome.storage.local.get(['settings'], (result) => {
            let settings = result.settings || {};
            
            // Ensure vrmModels array exists
            if (!settings.vrmModels) {
              settings.vrmModels = [];
            }
            
            console.log("Current VRM models count:", settings.vrmModels.length);
            
            // Check if model with same name already exists
            const existingModelIndex = settings.vrmModels.findIndex(model => model.name === modelName);
            if (existingModelIndex !== -1) {
              console.log(`Updating existing model: ${modelName}`);
              settings.vrmModels[existingModelIndex] = { 
                name: modelName,
                timestamp: Date.now()
              };
            } else {
              console.log(`Adding new model: ${modelName}`);
              settings.vrmModels.push({
                name: modelName,
                timestamp: Date.now()
              });
            }
            
            // Set as selected model
            settings.selectedVrmModel = modelName;
            console.log(`Selected model set to: ${modelName}`);
            
            // Save the model data separately to avoid storage limits
            const storageUpdate = {};
            storageUpdate[modelKey] = modelData;
            storageUpdate.settings = settings;
            
            // Save both settings and model data
            chrome.storage.local.set(storageUpdate, () => {
              const error = chrome.runtime.lastError;
              if (error) {
                console.error("Error saving VRM model:", error);
                uploadStatus.textContent = "Error: " + (error.message || "Failed to save model");
                uploadStatus.style.color = "red";
              } else {
                console.log("VRM model saved successfully");
                uploadStatus.textContent = "Upload complete!";
                uploadStatus.style.color = "green";
                
                // Debug the settings after save
                chrome.storage.local.get(['settings'], (result) => {
                  console.log("Settings after save:", result.settings);
                  console.log("VRM models count:", result.settings.vrmModels.length);
                  
                  // List all keys in storage
                  chrome.storage.local.get(null, (allData) => {
                    console.log("All storage keys:", Object.keys(allData));
                  });
                });
                
                // Update the VRM models list
                this.updateVRMModelsList();
                
                // Notify background script of settings update
                chrome.runtime.sendMessage({
                  action: "updateSettings",
                  settings: settings
                });
              }
              
              // Clear file input
              newFileInput.value = '';
              
              // Clear status message after a delay
              setTimeout(() => {
                uploadStatus.textContent = "";
                uploadStatus.style.color = "";
              }, 3000);
            });
          });
        } catch (error) {
          console.error("Error processing VRM file:", error);
          uploadStatus.textContent = "Error uploading file";
          uploadStatus.style.color = "red";
          newFileInput.value = '';
        }
      };
      
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        uploadStatus.textContent = "Error reading file";
        uploadStatus.style.color = "red";
        newFileInput.value = '';
      };
      
      // Start reading the file
      console.log("Starting to read file as data URL");
      reader.readAsDataURL(file);
    });
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

  updateVRMControls() {
    const vrmControls = document.getElementById('vrm-controls');
    if (vrmControls) {
      vrmControls.style.display = this.settings.useVRM ? 'block' : 'none';
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
    console.log("Using sample VRM model from models directory");
    
    // Get the current settings
    chrome.storage.local.get(['settings'], (result) => {
      let settings = result.settings || {};
      
      // Ensure vrmModels array exists
      if (!settings.vrmModels) {
        settings.vrmModels = [];
      }
      
      // Use the actual filename as the model name
      const modelName = "7062840423830520603";
      
      // Add sample model to the list if not already present
      const existingModelIndex = settings.vrmModels.findIndex(model => model.name === modelName);
      if (existingModelIndex === -1) {
        console.log(`Adding sample model: ${modelName}`);
        settings.vrmModels.push({
          name: modelName,
          timestamp: Date.now(),
          isBuiltIn: true  // Flag to indicate this is a built-in model
        });
      }
      
      // Set as selected model
      settings.selectedVrmModel = modelName;
      console.log(`Selected model set to: ${modelName}`);
      
      // Save settings
      chrome.storage.local.set({ settings }, () => {
        console.log("Settings updated with sample VRM model");
        
        // Update the VRM models list
        this.updateVRMModelsList();
        
        // Notify background script of settings update
        chrome.runtime.sendMessage({
          action: "updateSettings",
          settings: settings
        });
      });
    });
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
}

// Initialize the popup controller when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Popup DOM loaded, initializing PopupController');
  window.popupController = new PopupController();
});

// Handle popup unload
window.addEventListener('beforeunload', () => {
  console.log('👋 Popup closing');
});

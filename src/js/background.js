// Background script for AI Companion

console.log('Background script loaded');

// Initialize default settings on install or update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed or updated:', details.reason);
  
  // Set default settings
  const defaultSettings = {
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
  
  chrome.storage.local.get(['settings'], (result) => {
    if (!result.settings) {
      console.log('Initializing default settings');
      chrome.storage.local.set({ settings: defaultSettings });
    } else {
      console.log('Settings already exist, not overwriting');
    }
  });
  
  // Preload sample VRM model
  preloadSampleVRMModel();
});

// Preload sample VRM model into storage
async function preloadSampleVRMModel() {
  try {
    console.log('Setting up sample VRM model reference');
    
    // Instead of loading the file into storage, just add a reference to it
    const modelName = '7062840423830520603';
    
    // Get current settings
    chrome.storage.local.get(['settings'], (result) => {
      let settings = result.settings || {};
      
      // Ensure vrmModels array exists
      if (!settings.vrmModels) {
        settings.vrmModels = [];
      }
      
      // Add sample model reference to the list if not already present
      const existingModelIndex = settings.vrmModels.findIndex(model => model.name === modelName);
      if (existingModelIndex === -1) {
        console.log(`Adding sample model reference: ${modelName}`);
        settings.vrmModels.push({
          name: modelName,
          timestamp: Date.now(),
          isBuiltIn: true  // Flag to indicate this is a built-in model
        });
      }
      
      // Save settings
      chrome.storage.local.set({ settings }, () => {
        console.log('Sample VRM model reference added to settings');
      });
    });
  } catch (error) {
    console.error('Failed to set up sample VRM model:', error);
  }
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background script received message:', message);
  
  if (message.action === 'getSettings') {
    chrome.storage.local.get(['settings'], (result) => {
      console.log('Sending settings to requester:', result.settings);
      sendResponse({ settings: result.settings || {} });
    });
    return true;
  }
  
  if (message.action === 'updateSettings') {
    chrome.storage.local.set({ settings: message.settings }, () => {
      console.log('Settings updated:', message.settings);
      
      // Notify all tabs about the settings update
      notifyAllTabs({ 
        action: 'settingsUpdated', 
        settings: message.settings 
      });
      
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (message.action === 'toggleCompanion') {
    chrome.storage.local.get(['settings'], (result) => {
      const settings = result.settings || {};
      
      // Update enabled state
      if (message.enabled !== undefined) {
        settings.enabled = message.enabled;
      } else {
        settings.enabled = !settings.enabled;
      }
      
      console.log('Companion toggled:', settings.enabled);
      
      // Save updated settings
      chrome.storage.local.set({ settings }, () => {
        // Notify all tabs
        notifyAllTabs({ 
          action: 'settingsUpdated', 
          settings: settings 
        });
        
        sendResponse({ success: true, enabled: settings.enabled });
      });
    });
    return true;
  }
  
  if (message.action === 'toggleVRM') {
    chrome.storage.local.get(['settings'], (result) => {
      const settings = result.settings || {};
      
      // Update VRM state
      if (message.enabled !== undefined) {
        settings.useVRM = message.enabled;
      } else {
        settings.useVRM = !settings.useVRM;
      }
      
      console.log('VRM toggled:', settings.useVRM);
      
      // Save updated settings
      chrome.storage.local.set({ settings }, () => {
        // Notify all tabs
        notifyAllTabs({ 
          action: 'settingsUpdated', 
          settings: settings 
        });
        
        sendResponse({ success: true, enabled: settings.useVRM });
      });
    });
    return true;
  }
});

// Notify all tabs about settings changes
function notifyAllTabs(message) {
  chrome.tabs.query({}, (tabs) => {
    console.log(`Notifying ${tabs.length} tabs:`, message);
    
    tabs.forEach(tab => {
      // Skip chrome:// and extension:// pages and check if tab.url exists
      if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        chrome.tabs.sendMessage(tab.id, message, (response) => {
          const error = chrome.runtime.lastError;
          if (error) {
            console.log(`Error sending message to tab ${tab.id}:`, error.message);
          } else {
            console.log(`Tab ${tab.id} responded:`, response);
          }
        });
      }
    });
  });
}

// Initialize companion when tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Make sure tab.url exists before checking startsWith
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
    console.log(`Tab ${tabId} updated, initializing companion`);
    
    chrome.storage.local.get(['settings'], (result) => {
      const settings = result.settings || {};
      
      chrome.tabs.sendMessage(tabId, { 
        action: 'initCompanion',
        settings: settings
      }, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          console.log(`Error initializing companion in tab ${tabId}:`, error.message);
        } else {
          console.log(`Companion initialized in tab ${tabId}:`, response);
        }
      });
    });
  }
});

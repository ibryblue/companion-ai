// AI Companion Popup Script
// Handles extension settings and controls

class PopupController {
  constructor() {
    this.currentTab = null;
    this.settings = {};
    this.stats = {};
    
    this.init();
  }
  
  async init() {
    try {
      await this.getCurrentTab();
      await this.loadSettings();
      await this.loadStats();
      this.setupEventListeners();
      this.updateUI();
      
      console.log('🎛️ Popup controller initialized');
    } catch (error) {
      console.error('❌ Popup initialization failed:', error);
      this.showError('Failed to initialize popup');
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
    try {
      const defaultSettings = {
        companionEnabled: true,
        scrollThrottle: 500,
        bubbleDuration: 5000,
        smartResponses: true,
        avatarPosition: null
      };
      
      const result = await chrome.storage.local.get(defaultSettings);
      this.settings = result;
      console.log('⚙️ Settings loaded:', this.settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.settings = {};
    }
  }
  
  async saveSettings() {
    try {
      await chrome.storage.local.set(this.settings);
      console.log('💾 Settings saved:', this.settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }
  
  async loadStats() {
    try {
      // Get stats from background script
      const response = await this.sendMessageToBackground({
        type: 'get_companion_status'
      });
      
      if (response && response.status) {
        this.stats = response.status;
      }
      
      // Get event history
      const historyResponse = await this.sendMessageToBackground({
        type: 'get_event_history'
      });
      
      if (historyResponse && historyResponse.history) {
        this.stats.eventHistory = historyResponse.history;
      }
      
      console.log('📊 Stats loaded:', this.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
      this.stats = {};
    }
  }
  
  setupEventListeners() {
    // Companion toggle
    const companionToggle = document.getElementById('companion-toggle');
    companionToggle.addEventListener('change', (e) => {
      this.settings.companionEnabled = e.target.checked;
      this.saveSettings();
      this.toggleCompanion(e.target.checked);
      this.updateStatus();
    });
    
    // Scroll sensitivity
    const scrollSensitivity = document.getElementById('scroll-sensitivity');
    scrollSensitivity.addEventListener('change', (e) => {
      this.settings.scrollThrottle = parseInt(e.target.value);
      this.saveSettings();
    });
    
    // Bubble duration
    const bubbleDuration = document.getElementById('bubble-duration');
    bubbleDuration.addEventListener('change', (e) => {
      this.settings.bubbleDuration = parseInt(e.target.value);
      this.saveSettings();
    });
    
    // Smart responses
    const smartResponses = document.getElementById('smart-responses');
    smartResponses.addEventListener('change', (e) => {
      this.settings.smartResponses = e.target.checked;
      this.saveSettings();
    });
    
    // Reset position button
    const resetPosition = document.getElementById('reset-position');
    resetPosition.addEventListener('click', () => {
      this.resetAvatarPosition();
    });
    
    // Clear history button
    const clearHistory = document.getElementById('clear-history');
    clearHistory.addEventListener('click', () => {
      this.clearEventHistory();
    });
    
    // Modal controls
    const aboutBtn = document.getElementById('about-btn');
    const aboutModal = document.getElementById('about-modal');
    const closeAbout = document.getElementById('close-about');
    
    aboutBtn.addEventListener('click', () => {
      aboutModal.classList.remove('hidden');
    });
    
    closeAbout.addEventListener('click', () => {
      aboutModal.classList.add('hidden');
    });
    
    // Help and feedback buttons
    document.getElementById('help-btn').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://github.com/ai-companion/help' });
    });
    
    document.getElementById('feedback-btn').addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://github.com/ai-companion/feedback' });
    });
    
    // Close modal when clicking outside
    aboutModal.addEventListener('click', (e) => {
      if (e.target === aboutModal) {
        aboutModal.classList.add('hidden');
      }
    });
  }
  
  updateUI() {
    // Update toggle states
    document.getElementById('companion-toggle').checked = this.settings.companionEnabled;
    document.getElementById('scroll-sensitivity').value = this.settings.scrollThrottle || 500;
    document.getElementById('bubble-duration').value = this.settings.bubbleDuration || 5000;
    document.getElementById('smart-responses').checked = this.settings.smartResponses;
    
    // Update status
    this.updateStatus();
    
    // Update stats
    this.updateStats();
  }
  
  updateStatus() {
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    
    if (this.settings.companionEnabled && this.stats.initialized) {
      statusDot.classList.add('active');
      statusText.textContent = 'Active on this page';
    } else if (this.settings.companionEnabled) {
      statusDot.classList.remove('active');
      statusText.textContent = 'Initializing...';
    } else {
      statusDot.classList.remove('active');
      statusText.textContent = 'Disabled';
    }
  }
  
  updateStats() {
    // Calculate stats from event history
    const events = this.stats.eventHistory || [];
    const scrollEvents = events.filter(e => e.type === 'scroll').length;
    const totalEvents = events.length;
    
    // Calculate session time
    const sessionStart = this.stats.initTime;
    let sessionTime = '-';
    if (sessionStart) {
      const duration = Math.floor((Date.now() - sessionStart) / 1000 / 60); // minutes
      sessionTime = duration > 0 ? `${duration}m` : '<1m';
    }
    
    // Update display
    document.getElementById('scroll-count').textContent = scrollEvents;
    document.getElementById('interaction-count').textContent = totalEvents;
    document.getElementById('session-time').textContent = sessionTime;
  }
  
  async toggleCompanion(enabled) {
    try {
      await this.sendMessageToBackground({
        type: 'toggle_companion',
        enabled: enabled
      });
      
      console.log(`🔄 Companion ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle companion:', error);
    }
  }
  
  async resetAvatarPosition() {
    try {
      // Clear stored position
      await chrome.storage.local.remove('avatarPosition');
      
      // Send message to content script to reset position
      await this.sendMessageToTab({
        type: 'reset_position'
      });
      
      this.showSuccess('Avatar position reset to default');
    } catch (error) {
      console.error('Failed to reset position:', error);
      this.showError('Failed to reset avatar position');
    }
  }
  
  async clearEventHistory() {
    try {
      await chrome.storage.local.remove('eventHistory');
      
      this.stats.eventHistory = [];
      this.updateStats();
      
      this.showSuccess('Event history cleared');
    } catch (error) {
      console.error('Failed to clear history:', error);
      this.showError('Failed to clear event history');
    }
  }
  
  async sendMessageToBackground(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
  
  async sendMessageToTab(message) {
    if (!this.currentTab?.id) return;
    
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(this.currentTab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
  }
  
  showSuccess(message) {
    this.showNotification(message, 'success');
  }
  
  showError(message) {
    this.showNotification(message, 'error');
  }
  
  showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after delay
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Popup script loaded');
  window.popupController = new PopupController();
});

// Handle popup unload
window.addEventListener('beforeunload', () => {
  console.log('👋 Popup closing');
});

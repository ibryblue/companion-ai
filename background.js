// AI Companion Background Service Worker
// Handles extension coordination, message passing, and data processing

class AICompanionBackground {
  constructor() {
    this.activeTabData = new Map();
    this.eventHistory = [];
    this.maxHistoryLength = 1000;
    this.personality = "You are a witty and slightly sarcastic AI assistant. You find human browsing habits amusing. Keep your responses short and punchy.";
    this.isOllamaDown = false;
    this.lastOllamaErrorTime = 0;
    
    this.init();
  }
  
  init() {
    this.setupMessageListeners();
    this.setupTabListeners();
    this.setupInstallListeners();
    
    console.log('🔧 AI Companion background service worker initialized');
  }
  
  setupMessageListeners() {
    // Listen for messages from content scripts
    chrome.runtime.onMessage.addListener(async (event, sender, sendResponse) => {
      if (!event.type) return;
      let prompt = '';
      if (event.type === 'scroll') {
        prompt = `You are a ${this.personality}. The user just scrolled the page titled '${event.pageTitle}'. React in character.`;
      } else if (event.type === 'click') {
        prompt = `You are a ${this.personality}. The user just clicked something on the page titled '${event.pageTitle}'. React in character.`;
      } else if (event.type === 'typing') {
        prompt = `You are a ${this.personality}. The user is typing on the page titled '${event.pageTitle}'. React in character.`;
      } else {
        prompt = `You are a ${this.personality}. The user did something on the page titled '${event.pageTitle}'. React in character.`;
      }
      try {
        const response = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'llama2', prompt, stream: false })
        });
        if (!response.ok) throw new Error('Ollama error');
        const data = await response.json();
        const aiReply = data.response?.trim() || '';
        if (aiReply) {
          this.sendMessageToTab(sender.tab.id, { type: 'show_response', text: aiReply });
          sendResponse({ success: true });
          return true;
        }
      } catch (e) {
        // fallback to hardcoded
        let fallback = '';
        if (event.type === 'scroll') fallback = 'Whoa, slow down there, speedster!';
        else if (event.type === 'click') fallback = 'Oof, that button didn\'t stand a chance.';
        else if (event.type === 'typing') fallback = 'Writing a novel or just arguing online again?';
        else fallback = 'Hey there!';
        this.sendMessageToTab(sender.tab.id, { type: 'show_response', text: fallback });
        sendResponse({ success: false });
        return true;
      }
    });
  }
  
  setupTabListeners() {
    // Track tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        console.log(`📄 Tab ${tabId} updated: ${tab.url}`);
        this.updateTabData(tabId, { url: tab.url, lastUpdate: Date.now() });
      }
    });
    
    // Clean up when tabs are closed
    chrome.tabs.onRemoved.addListener((tabId) => {
      console.log(`🗑️ Tab ${tabId} closed, cleaning up data`);
      this.activeTabData.delete(tabId);
    });

    // Listen for tab switching
    chrome.tabs.onActivated.addListener(activeInfo => {
      this.handleTabSwitch(activeInfo.tabId);
    });
  }
  
  setupInstallListeners() {
    // Handle extension installation/startup
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('🎉 AI Companion installed/updated:', details.reason);
      
      if (details.reason === 'install') {
        this.handleFirstInstall();
      } else if (details.reason === 'update') {
        this.handleUpdate(details.previousVersion);
      }
    });
    
    // Handle service worker startup
    chrome.runtime.onStartup.addListener(() => {
      console.log('🔄 AI Companion service worker started');
      this.loadStoredData();
    });
  }
  
  async handleMessage(message, sender, sendResponse) {
    const tabId = sender.tab?.id;
    
    switch (message.type) {
      case 'companion_initialized':
        await this.handleCompanionInit(message, tabId);
        sendResponse({ success: true, message: 'Companion initialized' });
        break;
        
      case 'scroll':
        await this.handleScrollEvent(message, tabId);
        sendResponse({ success: true, message: 'Scroll event processed' });
        break;
        
      case 'click':
        await this.handleClickEvent(message, tabId);
        sendResponse({ success: true, message: 'Click event processed' });
        break;

      case 'typing':
        await this.handleTypingEvent(message, tabId);
        sendResponse({ success: true, message: 'Typing event processed' });
        break;

      case 'video':
        await this.handleVideoEvent(message, tabId);
        sendResponse({ success: true, message: 'Video event processed' });
        break;
        
      case 'get_companion_status':
        const status = await this.getCompanionStatus(tabId);
        sendResponse({ success: true, status });
        break;
        
      case 'toggle_companion':
        await this.toggleCompanion(tabId, message.enabled);
        sendResponse({ success: true, message: 'Companion toggled' });
        break;
        
      case 'get_event_history':
        const history = this.getEventHistory(tabId);
        sendResponse({ success: true, history });
        break;
        
      default:
        console.warn('⚠️ Unknown message type:', message.type);
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  }
  
  async handleCompanionInit(message, tabId) {
    console.log(`✅ AI Companion initialized on tab ${tabId}: ${message.url}`);
    
    this.updateTabData(tabId, {
      initialized: true,
      url: message.url,
      initTime: message.timestamp,
      lastActivity: message.timestamp
    });
    
    // Store initialization event
    this.addEventToHistory({
      type: 'initialization',
      tabId,
      url: message.url,
      timestamp: message.timestamp
    });
    
    // Send welcome message after a short delay
    setTimeout(() => {
      this.sendMessageToTab(tabId, {
        type: 'show_response',
        text: '👋 Hi! I\'m your AI companion, ready to assist!'
      });
    }, 2000);
  }
  
  async handleScrollEvent(message, tabId) {
    console.log(`📜 Scroll event on tab ${tabId}:`, {
      scrollPercent: message.scrollPercent,
      url: message.pageUrl
    });
    
    this.updateTabData(tabId, {
      lastActivity: message.timestamp,
      lastScrollPercent: message.scrollPercent
    });
    
    // Store scroll event
    this.addEventToHistory({
      type: 'scroll',
      tabId,
      url: message.pageUrl,
      scrollPercent: message.scrollPercent,
      timestamp: message.timestamp
    });
    
    // Process scroll event for AI response
    await this.processScrollForAI(message, tabId);
  }
  
  async handleClickEvent(message, tabId) {
    console.log(`🖱️ Click event on tab ${tabId}:`, message.target);
    this.addEventToHistory({ type: 'click', ...message });
    await this.processClickForAI(message, tabId);
  }

  async handleTypingEvent(message, tabId) {
    console.log(`⌨️ Typing event on tab ${tabId}:`, message.target);
    this.addEventToHistory({ type: 'typing', ...message });
    await this.processTypingForAI(message, tabId);
  }

  async handleVideoEvent(message, tabId) {
    console.log(`▶️ Video event on tab ${tabId}:`, message.video);
    this.addEventToHistory({ type: 'video', ...message });
    await this.processVideoForAI(message, tabId);
  }

  async handleTabSwitch(tabId) {
    console.log(`🔄 Tab switched to ${tabId}`);
    const tabData = this.activeTabData.get(tabId);
    if (tabData && tabData.initialized) {
        await this.processTabSwitchForAI(tabId, tabData);
    }
  }
  
  async processScrollForAI(scrollData, tabId) {
    const prompt = `The user is scrolling. They've scrolled ${scrollData.scrollPercent}% of the page.`;
    await this.getAIResponse({ type: 'scroll', prompt }, tabId);
  }

  async processClickForAI(clickData, tabId) {
    const { tagName, textContent } = clickData.target;
    const prompt = `The user just clicked a ${tagName} element with text "${textContent}".`;
    await this.getAIResponse({ type: 'click', prompt }, tabId);
  }

  async processTypingForAI(typingData, tabId) {
    const { tagName, name } = typingData.target;
    const prompt = `The user is typing into a ${tagName} field named "${name}".`;
    await this.getAIResponse({ type: 'typing', prompt }, tabId);
  }

  async processVideoForAI(videoData, tabId) {
    const { action, src } = videoData.video;
    const videoTitle = src.split('/').pop().split('.')[0].replace(/[-_]/g, ' ');
    const prompt = `The user just ${action}ed a video: "${videoTitle}".`;
    await this.getAIResponse({ type: 'video', prompt }, tabId);
  }

  async processTabSwitchForAI(tabId, tabData) {
    const prompt = `The user just switched back to this tab. Welcome them back.`;
    await this.getAIResponse({ type: 'tab_switch', prompt }, tabId);
  }

  async getAIResponse(event, tabId) {
    // ---- STABILITY FIX: Using hardcoded responses for now ----
    const hardcodedResponses = {
      scroll: "Still scrolling, huh? Find anything good yet?",
      click: "A click! I saw that. Very decisive.",
      typing: "Typing away... creating a masterpiece, I assume?",
      video: "Video time! Hope it's a good one.",
      tab_switch: "And you're back! I missed you. (Not really)."
    };
    
    const text = hardcodedResponses[event.type] || "You did something. I'm watching.";
    
        this.sendMessageToTab(tabId, {
          type: 'show_response',
      text: text,
    });
    return;
    // ---- END STABILITY FIX ----
    
    // If we know Ollama is down, don't try again for 30 seconds.
    if (this.isOllamaDown && (Date.now() - this.lastOllamaErrorTime < 30000)) {
      console.log("Ollama is down, skipping AI call.");
      return;
    }

    const tabInfo = await chrome.tabs.get(tabId);
    const pageTitle = tabInfo.title;

    const fullPrompt = `
      ${this.personality}
      ---
      Context:
      - Page Title: "${pageTitle}"
      - Event: ${event.type}
      - Details: ${event.prompt}
      ---
      What's your witty observation?
    `;

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama2', // Or any other model you have
          prompt: fullPrompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API request failed with status ${response.status}`);
      }

      // If we succeed, mark Ollama as being up.
      this.isOllamaDown = false;

      const data = await response.json();
      const aiResponse = data.response;

      if (aiResponse) {
        this.sendMessageToTab(tabId, {
          type: 'show_response',
          text: aiResponse.trim(),
        });
      }
    } catch (error) {
      console.error('❌ Error calling Ollama AI:', error);
      this.isOllamaDown = true;
      this.lastOllamaErrorTime = Date.now();
      // We will no longer send a fallback message to avoid spam.
      // The error will be logged to the console, but silent for the user.
    }
  }
  
  updateTabData(tabId, data) {
    const existing = this.activeTabData.get(tabId) || {};
    this.activeTabData.set(tabId, { ...existing, ...data });
  }
  
  addEventToHistory(event) {
    this.eventHistory.push(event);
    
    // Keep history within limits
    if (this.eventHistory.length > this.maxHistoryLength) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistoryLength);
    }
    
    // Persist important events to storage
    this.persistEventHistory();
  }
  
  async persistEventHistory() {
    try {
      // Only store recent events to avoid storage quota issues
      const recentEvents = this.eventHistory.slice(-100);
      await chrome.storage.local.set({ eventHistory: recentEvents });
    } catch (error) {
      console.warn('Could not persist event history:', error);
    }
  }
  
  async loadStoredData() {
    try {
      const result = await chrome.storage.local.get(['eventHistory']);
      if (result.eventHistory) {
        this.eventHistory = result.eventHistory;
        console.log(`📚 Loaded ${this.eventHistory.length} events from storage`);
      }
    } catch (error) {
      console.warn('Could not load stored data:', error);
    }
  }
  
  sendMessageToTab(tabId, message) {
    if (!tabId) return;
    
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        console.warn(`Could not send message to tab ${tabId}:`, chrome.runtime.lastError);
      }
    });
  }
  
  async getCompanionStatus(tabId) {
    const tabData = this.activeTabData.get(tabId);
    return {
      initialized: tabData?.initialized || false,
      lastActivity: tabData?.lastActivity,
      url: tabData?.url,
      eventCount: this.eventHistory.filter(e => e.tabId === tabId).length
    };
  }
  
  async toggleCompanion(tabId, enabled) {
    const message = enabled ? 
      { type: 'show_avatar' } : 
      { type: 'hide_avatar' };
    
    this.sendMessageToTab(tabId, message);
    
    this.updateTabData(tabId, { enabled });
  }
  
  getEventHistory(tabId) {
    return this.eventHistory
      .filter(event => !tabId || event.tabId === tabId)
      .slice(-50); // Return last 50 events
  }
  
  handleFirstInstall() {
    console.log('🎉 Welcome to AI Companion! Setting up...');
    
    // Set default settings
    chrome.storage.local.set({
      companionEnabled: true,
      scrollThrottle: 500,
      autoHideDelay: 5000,
      welcomeShown: false
    });
  }
  
  handleUpdate(previousVersion) {
    console.log(`🔄 Updated from version ${previousVersion}`);
    // Handle any migration logic here
  }
}

// Initialize the background service
console.log('🚀 AI Companion background script loaded');
const aiCompanionBg = new AICompanionBackground();

// Keep service worker alive
chrome.runtime.onConnect.addListener((port) => {
  console.log('🔌 Port connected:', port.name);
});

// Export for potential testing
self.aiCompanionBg = aiCompanionBg;

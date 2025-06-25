# AI Companion Chrome Extension

A real-time AI companion that provides intelligent assistance while browsing the web. This Chrome extension features a floating avatar with contextual responses, scroll event detection, and a modern UI. Now with 3D VRM avatar support!

## 🚀 Features

### Core Functionality
- **Floating Avatar**: Draggable AI companion that stays visible on all webpages
- **Real-time Event Detection**: Monitors scroll events with intelligent throttling
- **Smart Responses**: Context-aware responses triggered by user interactions
- **Speech Bubble System**: Elegant UI for displaying AI responses with auto-hide
- **Message Passing**: Robust communication between content scripts and background service worker

### User Experience
- **Modern UI Design**: Clean, accessible interface with dark mode support
- **Customizable Settings**: Adjustable scroll sensitivity, response timing, and behavior
- **Position Memory**: Avatar remembers its position across page reloads
- **Privacy-Focused**: All processing happens locally, no external API calls

### 3D VRM Avatar Features
- **VRM Model Support**: Load and display 3D VRM avatar models
- **Model Management**: Upload custom VRM models or use sample models
- **Persistent Storage**: VRM models are saved between sessions
- **3D Rendering**: WebGL-based rendering with THREE.js
- **Animation**: Basic avatar animations and interactions
- **Fallback System**: Graceful degradation when WebGL isn't available

### Technical Features
- **Manifest V3 Compliant**: Built with the latest Chrome extension standards
- **Event History**: Tracks and stores user interaction patterns
- **Error Handling**: Robust error handling and graceful degradation
- **Performance Optimized**: Throttled event detection and efficient resource usage

## 📁 File Structure

```
chrome-extension/
├── manifest.json          # Extension configuration (Manifest V3)
├── content.js             # Main content script for avatar and events
├── background.js          # Service worker for coordination
├── styles.css             # Avatar and speech bubble styling
├── popup.html             # Extension settings interface
├── popup.js               # Settings interface functionality
├── popup-vrm-viewer.js    # VRM model viewer for popup
├── popup-styles.css       # Popup interface styling
├── dist/                  # Compiled JavaScript bundles
│   └── vrm-bundle.js      # THREE.js and VRM libraries bundle
├── models/                # Sample VRM models
│   └── 7062840423830520603.vrm  # Default VRM model
├── icons/                 # Extension icons (16px, 32px, 48px, 128px)
│   ├── icon16.jpg
│   ├── icon32.jpg
│   ├── icon48.jpg
│   └── icon128.jpg
├── CHANGES.md             # Documentation of recent changes
└── README.md              # This file
```

## 🛠️ Installation

### Method 1: Developer Mode (Recommended for Testing)

1. **Download the Extension**
   ```bash
   # Clone or download the chrome-extension folder
   ```

2. **Open Chrome Extensions Page**
   - Go to `chrome://extensions/`
   - Or click Menu → More Tools → Extensions

3. **Enable Developer Mode**
   - Toggle "Developer mode" in the top right corner

4. **Load Extension**
   - Click "Load unpacked"
   - Select the `chrome-extension` folder
   - The extension should appear in your extensions list

5. **Verify Installation**
   - Look for the AI Companion icon in your Chrome toolbar
   - Visit any webpage to see the floating avatar appear

### Method 2: Chrome Web Store (Future)
- Extension will be available on Chrome Web Store after review process

## 🎯 Usage

### Basic Usage

1. **Avatar Interaction**
   - The floating avatar appears on all webpages (bottom-right by default)
   - Click the avatar to trigger a random response
   - Drag the avatar to reposition it anywhere on the screen

2. **Automatic Responses**
   - Scroll through content to trigger contextual responses
   - Responses appear in speech bubbles that auto-hide after 5 seconds
   - 25% chance of response on scroll events to avoid spam

3. **Settings Management**
   - Click the extension icon in the toolbar to open settings
   - Toggle the companion on/off
   - Adjust scroll sensitivity and response timing
   - View usage statistics

### Advanced Features

#### Event Detection
- **Scroll Events**: Throttled to 500ms by default
- **Event Logging**: All events logged for debugging and analysis
- **Smart Triggers**: Context-aware response generation

#### Customization
- **Scroll Sensitivity**: Choose from High (250ms), Normal (500ms), or Low (1000ms)
- **Response Duration**: 3, 5, or 8 seconds, or manual dismiss
- **Smart Responses**: Toggle contextual response generation

#### Privacy & Data
- **Local Storage**: Settings and position stored locally
- **No External Calls**: All processing happens on your device
- **Event History**: Limited storage with automatic cleanup

### VRM Avatar Usage

1. **Enable VRM Avatar**
   - Open the extension popup
   - Toggle "Use 3D VRM avatar" to enable the feature
   - The 2D avatar will be replaced with a 3D VRM model

2. **Use Sample Model**
   - Select "Sample" from the model dropdown
   - Click "Load Model" to load the sample VRM model
   - The sample model will appear on the webpage

3. **Upload Custom VRM Model**
   - Select "Local" from the model dropdown
   - Click "Load Model" to open the file picker
   - Select a valid VRM file from your computer
   - The custom model will be loaded and saved for future use

4. **Manage VRM Models**
   - All uploaded models appear in the models dropdown
   - Select any model from the dropdown to switch avatars
   - Use the "Clear Models" button to remove all saved models

## 🔧 Development

### Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Content.js    │◄──►│  Background.js  │◄──►│   Popup.js      │
│                 │    │                 │    │                 │
│ • Avatar UI     │    │ • Coordination  │    │ • Settings UI   │
│ • Event Detection│    │ • Message Hub   │    │ • Statistics    │
│ • Speech Bubbles│    │ • Data Storage  │    │ • Controls      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Webpage DOM   │    │ Chrome Storage  │    │  Extension UI   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components

#### Content Script (`content.js`)
- **AICompanion Class**: Main controller for avatar and interactions
- **Event Handling**: Scroll detection with throttling
- **UI Management**: Avatar positioning and speech bubble display
- **Message Passing**: Communication with background script

#### Background Service Worker (`background.js`)
- **AICompanionBackground Class**: Central coordination hub
- **Event Processing**: Handles and processes user events
- **Data Management**: Stores and retrieves user interaction data
- **Tab Management**: Tracks active tabs and extension state

#### Popup Interface (`popup.js`)
- **PopupController Class**: Manages settings interface
- **Settings Management**: Save/load user preferences
- **Statistics Display**: Shows usage analytics
- **Extension Controls**: Toggle features and reset settings

### Extension Development Setup

1. **Prerequisites**
   - Chrome browser (version 88+)
   - Basic knowledge of JavaScript, HTML, CSS
   - Understanding of Chrome Extension APIs

2. **Development Workflow**
   ```bash
   # 1. Make changes to extension files
   # 2. Go to chrome://extensions/
   # 3. Click reload button for "AI Companion"
   # 4. Test on various websites
   # 5. Check console logs for debugging
   ```

3. **Debugging**
   - **Content Script**: Right-click webpage → Inspect → Console
   - **Background Script**: chrome://extensions/ → AI Companion → service worker
   - **Popup Script**: Right-click extension icon → Inspect popup

### Message Passing System

```javascript
// Content to Background
chrome.runtime.sendMessage({
  type: 'scroll',
  timestamp: Date.now(),
  pageUrl: location.href,
  scrollPercent: 75
});

// Background to Content
chrome.tabs.sendMessage(tabId, {
  type: 'show_response',
  text: 'Great progress!'
});

// Popup to Background
chrome.runtime.sendMessage({
  type: 'get_companion_status'
});
```

## 🧪 Testing

### Manual Testing Checklist

#### Basic Functionality
- [ ] Avatar appears on webpage load
- [ ] Avatar is draggable and repositions correctly
- [ ] Scroll events trigger responses (25% chance)
- [ ] Speech bubbles appear and auto-hide
- [ ] Extension popup opens and displays settings

#### Settings & Controls
- [ ] Enable/disable toggle works
- [ ] Scroll sensitivity changes take effect
- [ ] Bubble duration settings work
- [ ] Avatar position resets correctly
- [ ] Event history clears properly

#### VRM Model Testing
- [ ] VRM toggle enables 3D avatar mode
- [ ] Upload VRM model functionality works
- [ ] Uploaded models appear in the model list
- [ ] Model selection changes the active avatar
- [ ] Delete model functionality works properly
- [ ] VRM models persist after browser restart
- [ ] 3D avatar animates and responds to events

#### Cross-Site Testing
- [ ] Works on HTTP sites
- [ ] Works on HTTPS sites
- [ ] Functions on dynamic/SPA websites
- [ ] No conflicts with existing page elements
- [ ] Maintains performance on heavy pages

#### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Chrome (previous version)
- [ ] Chromium-based browsers

### Automated Testing
Future enhancement: Implement automated testing with Puppeteer for regression testing.

## 🚫 Known Limitations

1. **LLM Integration**: Currently uses mock responses; real LLM integration pending
2. **Event Types**: Only scroll events implemented; click/keypress detection planned
3. **Responsive Design**: Avatar positioning may need adjustment on mobile sites
4. **Performance**: Heavy scroll pages may impact performance slightly

## 🔮 Future Enhancements

### Planned Features
- **Local LLM Integration**: Connect with Ollama for real AI responses
- **Enhanced Event Detection**: Click patterns, time spent on sections, video interactions
- **Advanced Prompting**: Template system for different response styles
- **Voice Support**: Text-to-speech for accessibility
- **Theming**: Multiple avatar designs and color schemes
- **Analytics**: Advanced usage patterns and insights

### Technical Improvements
- **Performance Optimization**: Better event throttling and memory management
- **Accessibility**: Enhanced screen reader support and keyboard navigation
- **Security**: Content Security Policy improvements
- **Testing**: Comprehensive automated test suite

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request with detailed description

## 📞 Support

- **Issues**: Report bugs via GitHub Issues
- **Documentation**: Check this README and inline code comments
- **Community**: Join discussions in GitHub Discussions

## 📊 Version History

### v1.0.0 (Current)
- Initial release with core functionality
- Floating avatar with drag-and-drop
- Scroll event detection and throttling
- Speech bubble system with auto-hide
- Settings popup with customization options
- Background service worker coordination
- Local storage for preferences and history

---

**Built with ❤️ for enhanced web browsing experiences**
# VRM Model Setup Guide

This guide explains how to render VRM 3D models in the AI Companion extension using two different approaches.

## Approach 1: Using NPM Packages (Recommended)

This approach uses proper npm packages for Three.js and VRM libraries.

### Prerequisites

- Node.js and npm installed on your system

### Installation

1. Install the required dependencies:

```bash
npm install
```

This will install:
- Three.js (v0.151.3) - Compatible with VRM libraries
- @pixiv/three-vrm (v1.0.9) and related packages

### Building

1. Build the JavaScript bundles:

```bash
npm run build
```

This will create bundled JavaScript files in the `dist` directory.

### Testing

1. Open the test file in your browser:

```bash
start src/vrm-test.html
```

## Approach 2: Using CDN Libraries (Fallback)

This approach loads Three.js and VRM libraries directly from CDN, without requiring npm.

### Testing

1. Open the CDN test file in your browser:

```bash
start src/vrm-test-cdn.html
```

## Troubleshooting

If you encounter issues with the npm approach:

1. Make sure you're using compatible versions:
   - Three.js v0.151.3
   - @pixiv/three-vrm v1.0.9

2. Check the browser console for errors

3. Try the CDN approach as a fallback

## Implementation in the Extension

To use the VRM models in the extension:

1. Make sure the bundled JavaScript files are included in the extension's manifest:

```json
"web_accessible_resources": [
  {
    "resources": [
      "images/avatars/*.gif",
      "images/avatars/*.png",
      "images/icons/*.jpg",
      "images/icons/*.png",
      "models/*.vrm",
      "lib/*.js",
      "css/*.css",
      "js/*.js",
      "dist/*.js"
    ],
    "matches": ["<all_urls>"]
  }
]
```

2. Load the bundled JavaScript in your content script:

```javascript
await this.loadScript(chrome.runtime.getURL('dist/vrm-bundle.js'));
```

3. Use the VRM loader to load and render models:

```javascript
const loader = new window.GLTFLoader();
loader.register((parser) => {
  return new window.VRMLoaderPlugin(parser);
});

loader.load(
  modelUrl,
  (gltf) => {
    if (gltf.userData && gltf.userData.vrm) {
      const vrm = gltf.userData.vrm;
      scene.add(vrm.scene);
    }
  }
);
```

## Benefits of Using NPM Packages

- Better dependency management
- Proper versioning
- Better code organization
- Easier updates in the future

## References

- [Three.js Documentation](https://threejs.org/docs/)
- [@pixiv/three-vrm Documentation](https://github.com/pixiv/three-vrm) 
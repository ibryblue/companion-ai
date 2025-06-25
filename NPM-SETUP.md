# Setting Up NPM Packages for 3D Models

This guide explains how to use npm packages for Three.js and VRM models instead of the hardcoded libraries.

## Prerequisites

- Node.js and npm installed on your system
- Basic knowledge of JavaScript and npm

## Installation

1. Install the required dependencies:

```bash
npm install
```

This will install:
- Three.js (v0.176.0)
- @pixiv/three-vrm (v1.0.9) and related packages

## Building the Project

1. Build the JavaScript bundles:

```bash
npm run build
```

This will create bundled JavaScript files in the `dist` directory.

2. Watch for changes during development:

```bash
npm run watch
```

## Using the Bundled Libraries

The bundled JavaScript files will be available in the `dist` directory:

- `vrm-bundle.js`: Contains Three.js and VRM libraries
- `content.js`: The content script for the extension
- `background.js`: The background script for the extension

To use the bundled libraries in your HTML files, include them like this:

```html
<script src="../dist/vrm-bundle.js"></script>
```

## Loading VRM Models

With the npm packages properly set up, you can load VRM models using the standard Three.js and VRM APIs:

```javascript
// Create a GLTFLoader
const loader = new THREE.GLTFLoader();

// Register the VRM plugin
loader.register((parser) => {
  return new THREE.VRMLoaderPlugin(parser);
});

// Load the VRM model
loader.load(
  'path/to/model.vrm',
  (gltf) => {
    // The VRM model is available in gltf.userData.vrm
    const vrm = gltf.userData.vrm;
    scene.add(vrm.scene);
  }
);
```

## Troubleshooting

If you encounter issues:

1. Check the browser console for errors
2. Ensure all npm packages are installed correctly
3. Make sure the webpack build completed successfully
4. Verify that the bundled JavaScript files are being loaded properly

## Benefits of Using NPM Packages

- Always use the latest versions of libraries
- Proper dependency management
- Better code organization
- Easier updates and maintenance
- Access to the full feature set of the official libraries 
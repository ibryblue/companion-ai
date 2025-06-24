# Testing VRM Model Functionality

This guide will help you test the VRM (Virtual Reality Model) functionality in the AI Companion extension.

## Prerequisites

1. The extension should be loaded in developer mode in Chrome
2. You should have at least one VRM model file (`.vrm` extension)
   - A sample model is included in the `src/models` directory
   - You can download additional models from [VRoid Hub](https://hub.vroid.com/en) or other sources

## Testing Steps

### 1. Enable VRM Mode

1. Click on the AI Companion extension icon in the Chrome toolbar
2. In the popup, find the "Use 3D VRM Avatar" toggle and enable it
3. Verify that the VRM controls section appears in the popup
4. Navigate to any webpage and verify that the 3D avatar container appears instead of the GIF avatar

### 2. Upload a VRM Model

1. In the extension popup, click on "Upload VRM Model"
2. Select a VRM file from your computer
   - You can use the sample model in `src/models/sample.vrm`
   - Or use your own VRM model file
3. Verify that the upload status shows "Upload successful!"
4. Check that the model appears in the model list

### 3. Select and Test a VRM Model

1. In the model list, click the "Select" button for your uploaded model
2. Verify that the model is marked as selected (highlighted border)
3. Navigate to any webpage and verify that the 3D model is displayed
4. Test interactions:
   - Scroll the page to trigger contextual responses
   - Click the avatar to see if it responds
   - Type in a text field to trigger typing responses

### 4. Test Model Management

1. Upload multiple VRM models (if available)
2. Switch between different models using the "Select" button
3. Delete a model using the "Delete" button
4. Verify that deleted models are removed from the list
5. Close and reopen the browser, then check if your models persist

### 5. Test VRM Mode Toggle

1. Disable VRM mode using the toggle
2. Verify that the extension switches back to GIF avatar mode
3. Enable VRM mode again
4. Verify that your selected model is still active

## Troubleshooting

If you encounter issues with VRM models:

1. **Model doesn't load**: Check the browser console for errors. The model might be incompatible or too large.
2. **Performance issues**: VRM models can be resource-intensive. Try using smaller models or disabling VRM mode on lower-end devices.
3. **Blank avatar**: Make sure all required libraries are loaded correctly. Check the network tab in developer tools.

## Advanced Testing

For developers who want to test the VRM functionality more thoroughly:

1. **Custom animations**: Modify the `vrm-renderer.js` file to add custom animations
2. **Expression testing**: VRM models support facial expressions. Test different expressions by modifying the `setExpression` method calls
3. **Performance profiling**: Use Chrome's performance tools to measure the impact of VRM rendering

## Feedback

After testing, please provide feedback on:
1. Performance impact of VRM models
2. Visual quality and animation smoothness
3. Any compatibility issues with specific browsers or devices
4. Suggestions for improving the VRM implementation 
/**
 * Copy Debug Files
 * 
 * This script copies debug HTML files and related scripts to the dist directory
 * so they can be accessed in the browser.
 */

const fs = require('fs');
const path = require('path');

// Files to copy from src to dist
const filesToCopy = [
  'vrma-debug.html',
  'js/vrma-api-test.js'
];

// Create directories if they don't exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`Creating directory: ${dirPath}`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Copy a file from src to dist
function copyFile(srcFile) {
  const srcPath = path.join('src', srcFile);
  const distPath = path.join('dist', srcFile);
  
  // Ensure the target directory exists
  const distDir = path.dirname(distPath);
  ensureDirectoryExists(distDir);
  
  // Check if source file exists
  if (!fs.existsSync(srcPath)) {
    console.error(`Source file does not exist: ${srcPath}`);
    return;
  }
  
  // Copy the file
  try {
    fs.copyFileSync(srcPath, distPath);
    console.log(`Copied ${srcPath} to ${distPath}`);
  } catch (error) {
    console.error(`Error copying ${srcPath} to ${distPath}:`, error.message);
  }
}

// Ensure dist directory exists
ensureDirectoryExists('dist');

// Ensure dist/js directory exists
ensureDirectoryExists(path.join('dist', 'js'));

// Copy all files
console.log('Copying debug files to dist directory...');
filesToCopy.forEach(copyFile);
console.log('Done!'); 
#!/usr/bin/env node

/**
 * Simple build script for Better Feeds extension that works without external dependencies
 * 
 * This script:
 * 1. Creates dist directory
 * 2. Copies static files (manifest, HTML)
 * 3. Creates placeholder icons if needed
 * 4. Uses Bun to compile TypeScript files
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = path.resolve('.');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

console.log('🚀 Building Better Feeds extension...');

// Create dist directory if it doesn't exist
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
  console.log('✅ Created dist directory');
} else {
  console.log('ℹ️ Dist directory already exists');
}

// Copy manifest.json
try {
  const manifestSrc = path.join(PUBLIC_DIR, 'manifest.json');
  const manifestDest = path.join(DIST_DIR, 'manifest.json');
  fs.copyFileSync(manifestSrc, manifestDest);
  console.log('✅ Copied manifest.json');
} catch (error) {
  console.error('❌ Error copying manifest.json:', error.message);
  process.exit(1);
}

// Create directories for compiled JS
const directories = [
  path.join(DIST_DIR, 'background'),
  path.join(DIST_DIR, 'content'),
  path.join(DIST_DIR, 'popup'),
  path.join(DIST_DIR, 'icons')
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${path.relative(ROOT_DIR, dir)}`);
  }
});

// Copy popup HTML
try {
  const popupHtmlSrc = path.join(SRC_DIR, 'popup', 'popup.html');
  const popupHtmlDest = path.join(DIST_DIR, 'popup', 'popup.html');
  fs.copyFileSync(popupHtmlSrc, popupHtmlDest);
  console.log('✅ Copied popup.html');
} catch (error) {
  console.error('❌ Error copying popup.html:', error.message);
}

// Copy content CSS
try {
  const contentCssSrc = path.join(SRC_DIR, 'content', 'content.css');
  const contentCssDest = path.join(DIST_DIR, 'content', 'content.css');
  fs.copyFileSync(contentCssSrc, contentCssDest);
  console.log('✅ Copied content.css');
} catch (error) {
  console.error('❌ Error copying content.css:', error.message);
  // Decide if this should be a fatal error
  // process.exit(1);
}

// Create placeholder icons
console.log('📦 Generating icons...');
try {
  // Run icon generation script
  execSync('bun scripts/generate-icons.js', { stdio: 'inherit' });
  
  // Copy generated icons to dist
  const iconSizes = [16, 32, 48, 128];
  iconSizes.forEach(size => {
    const iconSrc = path.join(PUBLIC_DIR, 'icons', `icon-${size}.png`);
    const iconDest = path.join(DIST_DIR, 'icons', `icon-${size}.png`);
    
    // Check if icon exists in public/icons
    if (fs.existsSync(iconSrc)) {
      fs.copyFileSync(iconSrc, iconDest);
      console.log(`✅ Copied icon-${size}.png`);
    } else {
      // Create a placeholder directly in dist/icons
      createPlaceholderIcon(iconDest);
      console.log(`⚠️ Created placeholder icon-${size}.png`);
    }
  });
} catch (error) {
  console.error('❌ Error generating icons:', error.message);
  console.log('⚠️ Creating basic placeholder icons...');
  
  // Create basic placeholder icons
  const iconSizes = [16, 32, 48, 128];
  iconSizes.forEach(size => {
    const iconDest = path.join(DIST_DIR, 'icons', `icon-${size}.png`);
    createPlaceholderIcon(iconDest);
    console.log(`⚠️ Created placeholder icon-${size}.png`);
  });
}

// Compile TypeScript files
console.log('📦 Building TypeScript files...');

try {
  // Build background script
  execSync('bun build --target browser src/background/index.ts --outdir=dist/background', { stdio: 'inherit' });
  console.log('✅ Built background script');
  
  // Build content script
  execSync('bun build --target browser src/content/twitter.ts --outdir=dist/content', { stdio: 'inherit' });
  console.log('✅ Built content script');
  
  // Build popup script
  execSync('bun build --target browser src/popup/popup.ts --outdir=dist/popup', { stdio: 'inherit' });
  console.log('✅ Built popup script');
} catch (error) {
  console.error('❌ Error building TypeScript files:', error.message);
  process.exit(1);
}

console.log('\n🎉 Build completed! The extension is ready in the dist/ directory.');
console.log('\nTo load the extension in Chrome:');
console.log('1. Open chrome://extensions');
console.log('2. Enable Developer Mode');
console.log('3. Click "Load unpacked" and select the dist/ directory');

// Function to create a simple placeholder icon (1x1 blue pixel)
function createPlaceholderIcon(filePath) {
  // Simple 1x1 blue pixel PNG (minimal valid PNG format)
  const BLUE_PIXEL_PNG = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
    0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB0, 0x00, 0x00, 0x00,
    0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  
  fs.writeFileSync(filePath, BLUE_PIXEL_PNG);
}
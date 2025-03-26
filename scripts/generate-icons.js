#!/usr/bin/env node

/**
 * Script to generate Chrome extension icons in various sizes from a template SVG
 * 
 * Usage: bun scripts/generate-icons.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Define icon sizes for Chrome extensions
const ICON_SIZES = [16, 32, 48, 128];

// Paths
const TEMPLATE_SVG = path.resolve('./public/icons/icon_template.svg');
const OUTPUT_DIR = path.resolve('./public/icons');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Created output directory: ${OUTPUT_DIR}`);
}

// Function to check if a command exists
function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

// Determine which SVG converter tool to use
let converter = null;
if (commandExists('rsvg-convert')) {
  converter = 'rsvg-convert';
  console.log(`Using ${converter} for SVG conversion`);
} else if (commandExists('inkscape')) {
  converter = 'inkscape';
  console.log(`Using ${converter} for SVG conversion`);
} else if (commandExists('convert')) {
  // ImageMagick's convert
  converter = 'convert';
  console.log(`Using ${converter} for SVG conversion`);
} else {
  console.warn('No suitable SVG conversion tool found. Using fallback PNG generation.');
  console.warn('For better icons, consider installing one of:');
  console.warn('- rsvg-convert (librsvg, preferred)');
  console.warn('- inkscape');
  console.warn('- ImageMagick (convert)');
}

// Check if template exists
if (!fs.existsSync(TEMPLATE_SVG)) {
  console.error(`Template SVG not found: ${TEMPLATE_SVG}`);
  process.exit(1);
}

// Generate icons for each size
ICON_SIZES.forEach(size => {
  const outputFile = path.join(OUTPUT_DIR, `icon-${size}.png`);
  console.log(`Generating ${size}x${size} icon...`);
  
  // If no converter is available, use fallback PNG generation
  if (!converter) {
    console.log(`Creating basic ${size}x${size} PNG icon`);
    createBasicPng(size, outputFile);
    return;
  }
  
  try {
    let command;
    
    if (converter === 'rsvg-convert') {
      command = `rsvg-convert -w ${size} -h ${size} "${TEMPLATE_SVG}" -o "${outputFile}"`;
    } else if (converter === 'inkscape') {
      command = `inkscape --export-filename="${outputFile}" -w ${size} -h ${size} "${TEMPLATE_SVG}"`;
    } else if (converter === 'convert') {
      command = `convert -background none -size ${size}x${size} "${TEMPLATE_SVG}" "${outputFile}"`;
    }
    
    execSync(command, { stdio: 'inherit' });
    console.log(`Created ${outputFile}`);
  } catch (error) {
    console.error(`Error generating ${size}x${size} icon:`, error.message);
    console.log('Creating fallback icon...');
    createBasicPng(size, outputFile);
  }
});

// Create basic placeholder icons
function createBasicPng(size, outputPath) {
  // Simple 1x1 blue pixel PNG (minimal valid PNG format)
  const BLUE_PIXEL_PNG = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
    0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
    0x00, 0x03, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB0, 0x00, 0x00, 0x00,
    0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
  
  fs.writeFileSync(outputPath, BLUE_PIXEL_PNG);
  console.log(`Created placeholder icon: ${outputPath}`);
  
  // Log a warning message only once
  if (size === ICON_SIZES[ICON_SIZES.length - 1]) {
    console.warn('\nWARNING: Using basic placeholder icons. For production use,');
    console.warn('please install one of the SVG conversion tools mentioned above,');
    console.warn('or manually create proper icon files in the public/icons directory.\n');
  }
}

// Generate manifest icons object
const iconEntries = ICON_SIZES.map(size => `"${size}": "icons/icon-${size}.png"`);
const iconsObject = `{\n  ${iconEntries.join(',\n  ')}\n}`;

console.log('\nAdd this to your manifest.json:');
console.log(`"icons": ${iconsObject}`);

console.log('\nIcon generation complete!');
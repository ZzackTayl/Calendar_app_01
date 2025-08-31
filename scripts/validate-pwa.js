#!/usr/bin/env node

/**
 * PWA Validation Script
 * Validates that PWA files are properly configured and accessible
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating PWA Configuration...\n');

// Check if required files exist
const requiredFiles = [
  'public/manifest.json',
  'public/sw.js',
  'public/favicon.svg',
  'public/favicon.ico'
];

let allFilesExist = true;

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

if (!allFilesExist) {
  console.log('\n❌ Some required PWA files are missing!');
  process.exit(1);
}

// Validate manifest.json
console.log('\n📋 Validating manifest.json:');
try {
  const manifestContent = fs.readFileSync('public/manifest.json', 'utf8');
  const manifest = JSON.parse(manifestContent);
  
  const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
  const recommendedFields = ['description', 'background_color', 'theme_color', 'scope', 'lang'];
  
  requiredFields.forEach(field => {
    const exists = manifest[field] !== undefined;
    console.log(`  ${exists ? '✅' : '❌'} ${field}: ${exists ? 'present' : 'missing'}`);
  });
  
  console.log('\n  📋 Recommended fields:');
  recommendedFields.forEach(field => {
    const exists = manifest[field] !== undefined;
    console.log(`  ${exists ? '✅' : '⚠️ '} ${field}: ${exists ? 'present' : 'missing (recommended)'}`);
  });
  
  // Validate icons
  if (manifest.icons && Array.isArray(manifest.icons)) {
    console.log(`\n  🖼️  Icons: ${manifest.icons.length} defined`);
    manifest.icons.forEach((icon, index) => {
      console.log(`    Icon ${index + 1}: ${icon.src} (${icon.sizes})`);
    });
  }
  
} catch (error) {
  console.log(`  ❌ Error parsing manifest.json: ${error.message}`);
  process.exit(1);
}

// Validate service worker
console.log('\n⚙️  Validating sw.js:');
try {
  const swContent = fs.readFileSync('public/sw.js', 'utf8');
  
  // Check for basic service worker structure
  const hasInstallEvent = swContent.includes("addEventListener('install'");
  const hasActivateEvent = swContent.includes("addEventListener('activate'");
  const hasFetchEvent = swContent.includes("addEventListener('fetch'");
  
  console.log(`  ${hasInstallEvent ? '✅' : '⚠️ '} Install event listener: ${hasInstallEvent ? 'present' : 'missing'}`);
  console.log(`  ${hasActivateEvent ? '✅' : '⚠️ '} Activate event listener: ${hasActivateEvent ? 'present' : 'missing'}`);
  console.log(`  ${hasFetchEvent ? '✅' : '⚠️ '} Fetch event listener: ${hasFetchEvent ? 'present' : 'missing'}`);
  
} catch (error) {
  console.log(`  ❌ Error reading sw.js: ${error.message}`);
  process.exit(1);
}

// Check Next.js configuration
console.log('\n⚙️  Validating Next.js configuration:');
try {
  const nextConfigContent = fs.readFileSync('next.config.js', 'utf8');
  
  const hasManifestHeaders = nextConfigContent.includes('/manifest.json');
  const hasSwHeaders = nextConfigContent.includes('/sw.js');
  
  console.log(`  ${hasManifestHeaders ? '✅' : '⚠️ '} Manifest headers: ${hasManifestHeaders ? 'configured' : 'missing'}`);
  console.log(`  ${hasSwHeaders ? '✅' : '⚠️ '} Service Worker headers: ${hasSwHeaders ? 'configured' : 'missing'}`);
  
} catch (error) {
  console.log(`  ⚠️  Could not read next.config.js: ${error.message}`);
}

// Check Vercel configuration
console.log('\n🚀 Validating Vercel configuration:');
try {
  const vercelConfigContent = fs.readFileSync('vercel.json', 'utf8');
  const vercelConfig = JSON.parse(vercelConfigContent);
  
  const hasHeaders = vercelConfig.headers && Array.isArray(vercelConfig.headers);
  let hasManifestConfig = false;
  let hasSwConfig = false;
  
  if (hasHeaders) {
    hasManifestConfig = vercelConfig.headers.some(header => header.source === '/manifest.json');
    hasSwConfig = vercelConfig.headers.some(header => header.source === '/sw.js');
  }
  
  console.log(`  ${hasHeaders ? '✅' : '⚠️ '} Headers configuration: ${hasHeaders ? 'present' : 'missing'}`);
  console.log(`  ${hasManifestConfig ? '✅' : '⚠️ '} Manifest headers: ${hasManifestConfig ? 'configured' : 'missing'}`);
  console.log(`  ${hasSwConfig ? '✅' : '⚠️ '} Service Worker headers: ${hasSwConfig ? 'configured' : 'missing'}`);
  
} catch (error) {
  console.log(`  ⚠️  Could not read vercel.json: ${error.message}`);
}

// Check build output (if .next exists)
console.log('\n🏗️  Checking build output:');
if (fs.existsSync('.next')) {
  const staticDir = '.next/static';
  const publicFiles = fs.existsSync('.next/server/pages') || fs.existsSync('.next/server/app');
  
  console.log(`  ${fs.existsSync(staticDir) ? '✅' : '❌'} Static assets directory: ${fs.existsSync(staticDir) ? 'present' : 'missing'}`);
  console.log(`  ${publicFiles ? '✅' : '❌'} Server pages/app: ${publicFiles ? 'present' : 'missing'}`);
  
  // Check if public files are copied to build
  const builtManifest = fs.existsSync('.next/server/public/manifest.json') || fs.existsSync('public/manifest.json');
  const builtSw = fs.existsSync('.next/server/public/sw.js') || fs.existsSync('public/sw.js');
  
  console.log(`  ${builtManifest ? '✅' : '⚠️ '} Manifest in build: ${builtManifest ? 'accessible' : 'check build process'}`);
  console.log(`  ${builtSw ? '✅' : '⚠️ '} Service Worker in build: ${builtSw ? 'accessible' : 'check build process'}`);
} else {
  console.log('  ⚠️  No build output found. Run "npm run build" to generate build artifacts.');
}

console.log('\n✨ PWA validation complete!');
console.log('\n📝 Next steps:');
console.log('  1. Run "npm run build" to generate production build');
console.log('  2. Test locally with "npm run start"');
console.log('  3. Deploy to Vercel and test PWA files at:');
console.log('     - https://your-domain.com/manifest.json');
console.log('     - https://your-domain.com/sw.js');
console.log('  4. Use browser dev tools to verify PWA installation criteria');
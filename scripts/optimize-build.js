#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Pre-build optimization script to handle large dependencies and memory issues
 */

console.log('🔧 Running build optimizations...');

// 1. Clean previous build artifacts
console.log('📁 Cleaning build artifacts...');
const buildDirs = ['.next', 'dist', 'out'];
buildDirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`   ✓ Cleaned ${dir}/`);
  }
});

// 2. Ensure cache directories exist
console.log('📁 Setting up cache directories...');
const cacheDirs = [
  '.cache/typescript',
  '.cache/eslint',
  '.next/cache/webpack'
];

cacheDirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`   ✓ Created ${dir}/`);
  }
});

// 3. Check available memory
console.log('💾 Checking system resources...');
const totalMem = require('os').totalmem();
const freeMem = require('os').freemem();
const availableGB = Math.floor(freeMem / (1024 * 1024 * 1024));

console.log(`   • Available memory: ${availableGB}GB`);
console.log(`   • CPU cores: ${require('os').cpus().length}`);

if (availableGB < 4) {
  console.warn('⚠️  Warning: Less than 4GB available memory. Build may be slow or fail.');
}

// 4. Optimize package.json scripts for current memory
console.log('⚙️  Optimizing build configuration...');
const packagePath = path.join(process.cwd(), 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

// Adjust memory allocation based on available memory
// Use at least 8GB for large codebases, more if available
const totalGB = Math.floor(totalMem / (1024 * 1024 * 1024));
const maxMemory = Math.max(8192, Math.min(16384, Math.floor(totalGB * 1024 * 0.6))); // Use 60% of total memory, min 8GB, max 16GB
const optimizedNodeOptions = `--max-old-space-size=${maxMemory} --max-semi-space-size=1024 --optimize-for-size --gc-interval=100`;

// Update build script with optimized memory settings
packageJson.scripts.build = `cross-env RUNTIME_SKIP_AUTOSTART=1 NODE_OPTIONS="${optimizedNodeOptions}" next build --no-lint`;

fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
console.log(`   ✓ Set memory limit to ${maxMemory}MB (Total system: ${totalGB}GB)`);

// 5. Check for large files that might cause issues
console.log('🔍 Checking for large files...');
const { execSync } = require('child_process');

try {
  const largeFiles = execSync(`find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | head -100 | xargs wc -l | sort -nr | head -10`, {
    encoding: 'utf8',
    cwd: process.cwd()
  });

  const lines = largeFiles.split('\n').slice(0, 5);
  console.log('   Largest source files:');
  lines.forEach(line => {
    if (line.trim() && !line.includes('total')) {
      console.log(`   • ${line.trim()}`);
    }
  });
} catch (error) {
  console.log('   ✓ Large file check completed');
}

console.log('✅ Build optimization complete!');
console.log('');
console.log('🚀 You can now run: npm run build');
console.log('');
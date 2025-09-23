#!/usr/bin/env node

/**
 * Cross-platform Application Backup Script (Node.js)
 * Replaces scripts/backup-application.sh for Windows/macOS/Linux compatibility
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors
const C = {
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  reset: '\u001b[0m',
};

function log(msg) { console.log(`${C.blue}[${new Date().toISOString()}]${C.reset} ${msg}`); }
function success(msg) { console.log(`${C.green}[SUCCESS]${C.reset} ${msg}`); }
function warn(msg) { console.warn(`${C.yellow}[WARNING]${C.reset} ${msg}`); }
function error(msg) { console.error(`${C.red}[ERROR]${C.reset} ${msg}`); }

function getProjectRoot() {
  const scriptDir = __dirname;
  return path.resolve(scriptDir, '..');
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function cpIfExists(src, dest) {
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true, force: true });
    return true;
  }
  return false;
}

function listExisting(projectRoot, list) {
  return list.filter(name => fs.existsSync(path.join(projectRoot, name)));
}

function tryDiskSpaceCheck(targetDir) {
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      // Use PowerShell to get free space on the drive containing targetDir
      const drive = path.parse(path.resolve(targetDir)).root.replace(/\\$/,'');
      const cmd = `powershell -NoProfile -Command "(Get-PSDrive -Name ${(drive || 'C:').replace(':','')} ).Free"`;
      const out = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      const freeBytes = parseInt(out, 10);
      if (!Number.isNaN(freeBytes)) {
        const freeGB = (freeBytes / (1024 ** 3)).toFixed(1);
        log(`Free space on ${drive}: ${freeGB} GB`);
      }
    } else {
      const out = execSync(`df -h "${targetDir}" | awk 'NR==2 {print $4}'`, { stdio: ['ignore', 'pipe', 'ignore'], shell: '/bin/bash' }).toString().trim();
      log(`Free space near backup target: ${out}`);
    }
  } catch (e) {
    warn('Could not determine disk space (non-fatal).');
  }
}

(function main() {
  log('Starting application backup (cross-platform)...');
  const projectRoot = getProjectRoot();
  const backupRoot = path.join(projectRoot, 'backups');
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15);
  const backupDir = path.join(backupRoot, `app_${stamp}`);

  // Basic checks
  if (!fs.existsSync(path.join(projectRoot, 'package.json'))) {
    error('package.json not found in project root. Aborting.');
    process.exit(1);
  }

  ensureDir(backupDir);
  ensureDir(path.join(backupDir, 'application'));
  ensureDir(path.join(backupDir, 'database'));
  ensureDir(path.join(backupDir, 'configuration'));
  ensureDir(path.join(backupDir, 'scripts'));
  ensureDir(path.join(backupDir, 'documentation'));

  tryDiskSpaceCheck(backupRoot);

  // Application dirs
  const appDirs = listExisting(projectRoot, ['app', 'lib', 'components', 'hooks']);
  for (const d of appDirs) {
    cpIfExists(path.join(projectRoot, d), path.join(backupDir, 'application', d));
    log(`  ✅ Copied ${d}/`);
  }

  // Config files
  const configFiles = [
    'package.json',
    'package-lock.json',
    'next.config.js',
    'tailwind.config.ts',
    'tsconfig.json',
    'vercel.json',
  ];
  for (const f of configFiles) {
    const src = path.join(projectRoot, f);
    if (cpIfExists(src, path.join(backupDir, 'configuration', path.basename(f)))) {
      log(`  ✅ Copied ${f}`);
    }
  }

  // Database
  if (fs.existsSync(path.join(projectRoot, 'supabase', 'migrations'))) {
    cpIfExists(path.join(projectRoot, 'supabase', 'migrations'), path.join(backupDir, 'database', 'migrations'));
    log('  ✅ Copied Supabase migrations');
  }
  cpIfExists(path.join(projectRoot, 'supabase', 'config.toml'), path.join(backupDir, 'database', 'config.toml'));
  if (fs.existsSync(path.join(projectRoot, 'schemas'))) {
    cpIfExists(path.join(projectRoot, 'schemas'), path.join(backupDir, 'database', 'schemas'));
    log('  ✅ Copied schema files');
  }

  // Scripts dir and docker files
  cpIfExists(path.join(projectRoot, 'scripts'), path.join(backupDir, 'scripts'));
  const dockerFiles = [
    'Dockerfile', 'Dockerfile.dev', 'Dockerfile.production', 'Dockerfile.staging', 'Dockerfile.test', 'Dockerfile.e2e',
    'docker-compose.yml', 'docker-compose.dev.yml', 'docker-compose.simple.yml', 'docker-compose.staging.yml', 'docker-compose.test.yml'
  ];
  for (const f of dockerFiles) {
    cpIfExists(path.join(projectRoot, f), path.join(backupDir, f));
  }

  // Documentation: handle both docs/ and Docs/
  const docDirs = ['docs', 'Docs'];
  for (const d of docDirs) {
    if (fs.existsSync(path.join(projectRoot, d))) {
      cpIfExists(path.join(projectRoot, d), path.join(backupDir, 'documentation', d));
      log(`  ✅ Copied ${d}/ directory`);
    }
  }
  // Root .md files
  for (const entry of fs.readdirSync(projectRoot)) {
    if (entry.toLowerCase().endsWith('.md')) {
      cpIfExists(path.join(projectRoot, entry), path.join(backupDir, 'documentation', entry));
    }
  }

  success(`Backup completed: ${backupDir}`);
  process.exit(0);
})();

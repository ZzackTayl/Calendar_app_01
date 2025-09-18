#!/usr/bin/env node

/**
 * PolyHarmony Calendar - Docker Setup Validation Script
 * Validates that the Docker environment is properly configured
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 PolyHarmony Calendar - Docker Setup Validation\n');

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkDockerInstalled() {
  try {
    execSync('docker --version', { stdio: 'pipe' });
    log('✅ Docker is installed', 'green');
    return true;
  } catch (error) {
    log('❌ Docker is not installed or not running', 'red');
    log('   Please install Docker Desktop from docker.com', 'yellow');
    return false;
  }
}

function checkDockerComposeInstalled() {
  try {
    execSync('docker-compose --version', { stdio: 'pipe' });
    log('✅ Docker Compose is installed', 'green');
    return true;
  } catch (error) {
    log('❌ Docker Compose is not installed', 'red');
    log('   Please install Docker Compose', 'yellow');
    return false;
  }
}

function checkRequiredFiles() {
  const requiredFiles = [
    'docker-compose.simple.yml',
    'Dockerfile.dev',
    'env.docker.example',
    'DOCKER_GETTING_STARTED.md',
    'Makefile'
  ];

  let allFilesExist = true;

  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      log(`✅ ${file} exists`, 'green');
    } else {
      log(`❌ ${file} is missing`, 'red');
      allFilesExist = false;
    }
  });

  return allFilesExist;
}

function checkEnvironmentFile() {
  if (fs.existsSync('.env.local')) {
    log('✅ .env.local exists', 'green');
    return true;
  } else {
    log('⚠️  .env.local does not exist', 'yellow');
    log('   Run: cp env.docker.example .env.local', 'blue');
    return false;
  }
}

function checkDockerServices() {
  try {
    const output = execSync('docker-compose -f docker-compose.simple.yml ps', { 
      stdio: 'pipe',
      encoding: 'utf8'
    });
    
    if (output.includes('Up')) {
      log('✅ Docker services are running', 'green');
      return true;
    } else {
      log('⚠️  Docker services are not running', 'yellow');
      log('   Run: make dev or docker-compose -f docker-compose.simple.yml up', 'blue');
      return false;
    }
  } catch (error) {
    log('⚠️  Could not check Docker services', 'yellow');
    log('   This is normal if services are not running yet', 'blue');
    return false;
  }
}

function checkPorts() {
  const requiredPorts = [3000, 5432, 6379, 8025];
  let allPortsAvailable = true;

  requiredPorts.forEach(port => {
    try {
      execSync(`lsof -i :${port}`, { stdio: 'pipe' });
      log(`⚠️  Port ${port} is in use`, 'yellow');
      allPortsAvailable = false;
    } catch (error) {
      log(`✅ Port ${port} is available`, 'green');
    }
  });

  return allPortsAvailable;
}

function main() {
  log('🚀 Starting Docker setup validation...\n', 'bold');

  const checks = [
    { name: 'Docker Installation', fn: checkDockerInstalled },
    { name: 'Docker Compose Installation', fn: checkDockerComposeInstalled },
    { name: 'Required Files', fn: checkRequiredFiles },
    { name: 'Environment File', fn: checkEnvironmentFile },
    { name: 'Port Availability', fn: checkPorts },
    { name: 'Docker Services', fn: checkDockerServices }
  ];

  let passedChecks = 0;
  const totalChecks = checks.length;

  checks.forEach(check => {
    log(`\n📋 Checking ${check.name}...`, 'blue');
    if (check.fn()) {
      passedChecks++;
    }
  });

  log('\n' + '='.repeat(50), 'bold');
  log(`📊 Validation Results: ${passedChecks}/${totalChecks} checks passed`, 'bold');

  if (passedChecks === totalChecks) {
    log('\n🎉 All checks passed! Your Docker setup is ready.', 'green');
    log('   Run: make dev', 'blue');
  } else if (passedChecks >= totalChecks - 2) {
    log('\n⚠️  Most checks passed. You can proceed with setup.', 'yellow');
    log('   Run: make dev', 'blue');
  } else {
    log('\n❌ Several issues found. Please fix them before proceeding.', 'red');
    log('   See the messages above for guidance.', 'yellow');
  }

  log('\n📚 For help, see: DOCKER_GETTING_STARTED.md', 'blue');
}

if (require.main === module) {
  main();
}

module.exports = { main };

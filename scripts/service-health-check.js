#!/usr/bin/env node

/**
 * Comprehensive Service Health Check Script
 * Tests all critical services and reports degradation issues
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Service status tracking
const serviceStatus = {
  critical: [],
  degraded: [],
  operational: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    degraded: 0
  }
};

// Utility functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log(`${'='.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'cyan');
  log(`${'='.repeat(60)}`, 'cyan');
}

function updateStatus(service, status, details = '') {
  serviceStatus.summary.total++;
  
  const entry = { service, details, timestamp: new Date().toISOString() };
  
  switch(status) {
    case 'operational':
      serviceStatus.operational.push(entry);
      serviceStatus.summary.passed++;
      log(`✅ ${service}: OPERATIONAL`, 'green');
      break;
    case 'degraded':
      serviceStatus.degraded.push(entry);
      serviceStatus.summary.degraded++;
      log(`⚠️  ${service}: DEGRADED - ${details}`, 'yellow');
      break;
    case 'critical':
      serviceStatus.critical.push(entry);
      serviceStatus.summary.failed++;
      log(`❌ ${service}: CRITICAL - ${details}`, 'red');
      break;
  }
}

// Test 1: Environment Configuration
async function checkEnvironmentConfig() {
  logSection('1. ENVIRONMENT CONFIGURATION');
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ENCRYPTION_KEY',
    'KEY_DERIVATION_SECRET',
    'JWT_SECRET'
  ];
  
  const missingVars = [];
  
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length === 0) {
    updateStatus('Environment Configuration', 'operational');
  } else {
    updateStatus('Environment Configuration', 'critical', 
      `Missing variables: ${missingVars.join(', ')}`);
  }
  
  // Check for development vs production mode
  const nodeEnv = process.env.NODE_ENV || 'development';
  log(`  Running in ${nodeEnv} mode`, 'blue');
}

// Test 2: Supabase Connection
async function checkSupabaseConnection() {
  logSection('2. SUPABASE DATABASE CONNECTION');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    updateStatus('Supabase Connection', 'critical', 'Missing credentials');
    return false;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic query
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      updateStatus('Supabase Connection', 'critical', error.message);
      return false;
    }
    
    // Check response time
    if (responseTime > 5000) {
      updateStatus('Supabase Connection', 'degraded', 
        `Slow response: ${responseTime}ms`);
    } else {
      updateStatus('Supabase Connection', 'operational');
      log(`  Response time: ${responseTime}ms`, 'blue');
    }
    
    return true;
  } catch (error) {
    updateStatus('Supabase Connection', 'critical', error.message);
    return false;
  }
}

// Test 3: Authentication Service
async function checkAuthService() {
  logSection('3. AUTHENTICATION SERVICE');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    updateStatus('Authentication Service', 'critical', 'Missing credentials');
    return;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check if auth endpoint is responsive
    const startTime = Date.now();
    const { data, error } = await supabase.auth.getSession();
    const responseTime = Date.now() - startTime;
    
    if (responseTime > 3000) {
      updateStatus('Authentication Service', 'degraded', 
        `Slow response: ${responseTime}ms`);
    } else {
      updateStatus('Authentication Service', 'operational');
      log(`  Response time: ${responseTime}ms`, 'blue');
    }
  } catch (error) {
    updateStatus('Authentication Service', 'critical', error.message);
  }
}

// Test 4: Realtime Service
async function checkRealtimeService() {
  logSection('4. REALTIME SERVICE');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    updateStatus('Realtime Service', 'critical', 'Missing credentials');
    return;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test realtime subscription
    const channel = supabase.channel('test-channel');
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        channel.unsubscribe();
        reject(new Error('Connection timeout'));
      }, 5000);
      
      channel
        .on('system', { event: '*' }, () => {
          clearTimeout(timeout);
          channel.unsubscribe();
          resolve();
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            channel.unsubscribe();
            resolve();
          }
        });
    });
    
    updateStatus('Realtime Service', 'operational');
  } catch (error) {
    if (error.message === 'Connection timeout') {
      updateStatus('Realtime Service', 'degraded', 'Connection slow or unreliable');
    } else {
      updateStatus('Realtime Service', 'critical', error.message);
    }
  }
}

// Test 5: API Endpoints
async function checkAPIEndpoints() {
  logSection('5. API ENDPOINTS');
  
  const endpoints = [
    { name: 'Health Check', path: '/api/health/ping', method: 'GET' },
    { name: 'Monitoring', path: '/api/monitoring?type=status', method: 'GET' },
    { name: 'Events API', path: '/api/events', method: 'GET' },
    { name: 'Contacts API', path: '/api/contacts', method: 'GET' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const url = `http://localhost:3000${endpoint.path}`;
      const startTime = Date.now();
      
      // Use fetch if available, otherwise skip
      if (typeof fetch !== 'undefined') {
        const response = await fetch(url, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
          if (responseTime > 3000) {
            updateStatus(`API: ${endpoint.name}`, 'degraded', 
              `Slow response: ${responseTime}ms`);
          } else {
            updateStatus(`API: ${endpoint.name}`, 'operational');
          }
        } else {
          updateStatus(`API: ${endpoint.name}`, 'degraded', 
            `HTTP ${response.status}`);
        }
      } else {
        log(`  Skipping ${endpoint.name} (fetch not available in Node.js)`, 'yellow');
      }
    } catch (error) {
      updateStatus(`API: ${endpoint.name}`, 'critical', 
        'Endpoint unreachable');
    }
  }
}

// Test 6: File System and Permissions
async function checkFileSystem() {
  logSection('6. FILE SYSTEM AND PERMISSIONS');
  
  const criticalPaths = [
    { path: '.next', name: 'Build Output', required: false },
    { path: 'public', name: 'Public Assets', required: true },
    { path: 'app', name: 'App Directory', required: true },
    { path: 'lib', name: 'Library Directory', required: true },
    { path: 'components', name: 'Components Directory', required: true }
  ];
  
  for (const item of criticalPaths) {
    const fullPath = path.join(__dirname, '..', item.path);
    
    if (fs.existsSync(fullPath)) {
      try {
        // Check if we can read the directory
        fs.readdirSync(fullPath);
        updateStatus(`FS: ${item.name}`, 'operational');
      } catch (error) {
        updateStatus(`FS: ${item.name}`, 'degraded', 'Permission issues');
      }
    } else {
      if (item.required) {
        updateStatus(`FS: ${item.name}`, 'critical', 'Directory missing');
      } else {
        updateStatus(`FS: ${item.name}`, 'degraded', 'Directory missing');
      }
    }
  }
}

// Test 7: Security Configuration
async function checkSecurityConfig() {
  logSection('7. SECURITY CONFIGURATION');
  
  // Check encryption key strength
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    updateStatus('Encryption Configuration', 'critical', 'No encryption key set');
  } else if (encryptionKey.length < 64) {
    updateStatus('Encryption Configuration', 'degraded', 'Weak encryption key');
  } else {
    updateStatus('Encryption Configuration', 'operational');
  }
  
  // Check JWT configuration
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    updateStatus('JWT Configuration', 'critical', 'No JWT secret set');
  } else if (jwtSecret.length < 32) {
    updateStatus('JWT Configuration', 'degraded', 'Weak JWT secret');
  } else {
    updateStatus('JWT Configuration', 'operational');
  }
  
  // Check for test mode
  if (process.env.SKIP_EMAIL_VERIFICATION === 'true') {
    updateStatus('Email Verification', 'degraded', 'Disabled (test mode)');
  } else {
    updateStatus('Email Verification', 'operational');
  }
}

// Test 8: Dependencies
async function checkDependencies() {
  logSection('8. NPM DEPENDENCIES');
  
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
  
  if (!fs.existsSync(packageJsonPath)) {
    updateStatus('Dependencies', 'critical', 'package.json missing');
    return;
  }
  
  if (!fs.existsSync(nodeModulesPath)) {
    updateStatus('Dependencies', 'critical', 'node_modules missing');
    return;
  }
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = Object.keys(packageJson.dependencies || {});
    const devDependencies = Object.keys(packageJson.devDependencies || {});
    
    // Check critical dependencies
    const criticalDeps = [
      'next', 'react', 'react-dom', '@supabase/supabase-js',
      '@supabase/ssr'
    ];
    
    const missingDeps = [];
    for (const dep of criticalDeps) {
      const depPath = path.join(nodeModulesPath, dep);
      if (!fs.existsSync(depPath)) {
        missingDeps.push(dep);
      }
    }
    
    if (missingDeps.length === 0) {
      updateStatus('Dependencies', 'operational');
      log(`  Total: ${dependencies.length} production, ${devDependencies.length} dev`, 'blue');
    } else {
      updateStatus('Dependencies', 'critical', 
        `Missing: ${missingDeps.join(', ')}`);
    }
  } catch (error) {
    updateStatus('Dependencies', 'critical', error.message);
  }
}

// Generate Report
function generateReport() {
  logSection('SERVICE HEALTH REPORT SUMMARY');
  
  const totalServices = serviceStatus.summary.total;
  const healthPercentage = Math.round(
    (serviceStatus.summary.passed / totalServices) * 100
  );
  
  // Overall Status
  let overallStatus = 'OPERATIONAL';
  let statusColor = 'green';
  
  if (serviceStatus.critical.length > 0) {
    overallStatus = 'CRITICAL';
    statusColor = 'red';
  } else if (serviceStatus.degraded.length > 0) {
    overallStatus = 'DEGRADED';
    statusColor = 'yellow';
  }
  
  console.log('');
  log(`Overall System Status: ${overallStatus}`, statusColor);
  log(`Health Score: ${healthPercentage}%`, statusColor);
  console.log('');
  
  // Statistics
  log('Statistics:', 'cyan');
  log(`  ✅ Operational: ${serviceStatus.summary.passed}`, 'green');
  log(`  ⚠️  Degraded: ${serviceStatus.summary.degraded}`, 'yellow');
  log(`  ❌ Critical: ${serviceStatus.summary.failed}`, 'red');
  log(`  📊 Total Checks: ${totalServices}`, 'blue');
  
  // Critical Issues
  if (serviceStatus.critical.length > 0) {
    console.log('');
    log('CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:', 'red');
    serviceStatus.critical.forEach(issue => {
      log(`  • ${issue.service}: ${issue.details}`, 'red');
    });
  }
  
  // Degraded Services
  if (serviceStatus.degraded.length > 0) {
    console.log('');
    log('DEGRADED SERVICES:', 'yellow');
    serviceStatus.degraded.forEach(issue => {
      log(`  • ${issue.service}: ${issue.details}`, 'yellow');
    });
  }
  
  // Save report to file
  const reportPath = path.join(__dirname, '..', 'service-health-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(serviceStatus, null, 2));
  
  console.log('');
  log(`Full report saved to: ${reportPath}`, 'blue');
  log(`${'='.repeat(60)}`, 'cyan');
  
  // Exit with appropriate code
  if (serviceStatus.critical.length > 0) {
    process.exit(1);
  }
}

// Main execution
async function main() {
  log('🔍 POLYHARMONY CALENDAR - SERVICE HEALTH CHECK', 'magenta');
  log(`Started at: ${new Date().toISOString()}`, 'blue');
  
  await checkEnvironmentConfig();
  await checkDependencies();
  await checkFileSystem();
  
  const supabaseOk = await checkSupabaseConnection();
  
  if (supabaseOk) {
    await checkAuthService();
    await checkRealtimeService();
  }
  
  await checkSecurityConfig();
  await checkAPIEndpoints();
  
  generateReport();
}

// Run the health check
main().catch(error => {
  log(`Fatal error during health check: ${error.message}`, 'red');
  process.exit(1);
});
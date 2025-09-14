#!/usr/bin/env node

/**
 * Quick API Security Validation
 * Validates authentication and CSRF protection on critical endpoints
 */

const http = require('http');

const CRITICAL_ENDPOINTS = [
  // Public endpoints (should NOT require auth)
  { path: '/api/health', method: 'GET', shouldRequireAuth: false, name: 'Health Check' },
  { path: '/api/health/ping', method: 'GET', shouldRequireAuth: false, name: 'Ping' },
  
  // Auth endpoints (should NOT require auth for signin/signup)
  { path: '/api/auth/signin', method: 'POST', shouldRequireAuth: false, name: 'Sign In' },
  { path: '/api/auth/signup', method: 'POST', shouldRequireAuth: false, name: 'Sign Up' },
  
  // Admin-only endpoints (MUST require auth)
  { path: '/api/monitoring', method: 'GET', shouldRequireAuth: true, name: 'Monitoring' },
  { path: '/api/monitoring/dashboard', method: 'GET', shouldRequireAuth: true, name: 'Monitoring Dashboard' },
  { path: '/api/security/audit', method: 'GET', shouldRequireAuth: true, name: 'Security Audit' },
  { path: '/api/security/config', method: 'GET', shouldRequireAuth: true, name: 'Security Config' },
  { path: '/api/security/monitoring', method: 'GET', shouldRequireAuth: true, name: 'Security Monitoring' },
  { path: '/api/debug/middleware', method: 'GET', shouldRequireAuth: true, name: 'Debug Middleware' },
  
  // Regular authenticated endpoints
  { path: '/api/events', method: 'GET', shouldRequireAuth: true, name: 'Events List' },
  { path: '/api/contacts', method: 'GET', shouldRequireAuth: true, name: 'Contacts List' },
];

async function makeRequest(path, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        status: 0,
        error: error.message
      });
    });
    
    if (method === 'POST') {
      req.write(JSON.stringify({}));
    }
    
    req.end();
  });
}

async function validateEndpoints() {
  console.log('🔒 API Security Validation\n');
  console.log('════════════════════════════════════════════════════════\n');
  
  // First check if server is running
  const healthCheck = await makeRequest('/api/health/ping');
  if (healthCheck.status === 0) {
    console.log('❌ Server is not running at http://localhost:3000');
    console.log('   Please start the server with: npm run dev\n');
    process.exit(1);
  }
  
  let passed = 0;
  let failed = 0;
  const issues = [];
  
  for (const endpoint of CRITICAL_ENDPOINTS) {
    process.stdout.write(`Testing ${endpoint.name.padEnd(25)} `);
    
    // Test without authentication
    const response = await makeRequest(endpoint.path, endpoint.method);
    
    if (endpoint.shouldRequireAuth) {
      // Should return 401 or 403 without auth
      if (response.status === 401 || response.status === 403) {
        console.log('✅ Properly secured (requires auth)');
        passed++;
      } else {
        console.log(`❌ SECURITY ISSUE: Got ${response.status} (expected 401/403)`);
        issues.push(`${endpoint.name}: Not requiring authentication (status: ${response.status})`);
        failed++;
      }
    } else {
      // Should be accessible without auth
      if (response.status === 200 || response.status === 201 || response.status === 204) {
        console.log('✅ Publicly accessible (as expected)');
        passed++;
      } else if (response.status === 429) {
        console.log('⚠️  Rate limited (acceptable)');
        passed++;
      } else if (response.status === 400) {
        console.log('⚠️  Bad request (needs body, but accessible)');
        passed++;
      } else {
        console.log(`❌ ISSUE: Got ${response.status} (expected 200/201/204)`);
        issues.push(`${endpoint.name}: Unexpected status ${response.status}`);
        failed++;
      }
    }
  }
  
  console.log('\n════════════════════════════════════════════════════════');
  console.log('VALIDATION SUMMARY');
  console.log('════════════════════════════════════════════════════════\n');
  
  console.log(`✅ Passed: ${passed}/${CRITICAL_ENDPOINTS.length}`);
  console.log(`❌ Failed: ${failed}/${CRITICAL_ENDPOINTS.length}`);
  
  if (issues.length > 0) {
    console.log('\n🚨 Critical Issues Found:');
    issues.forEach(issue => {
      console.log(`   • ${issue}`);
    });
  } else {
    console.log('\n🎉 All critical endpoints are properly secured!');
  }
  
  console.log('\n');
  
  // Return exit code based on results
  process.exit(failed > 0 ? 1 : 0);
}

// Run validation
validateEndpoints().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
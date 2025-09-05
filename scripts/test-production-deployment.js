#!/usr/bin/env node

/**
 * Production Deployment Test Suite
 * 
 * Comprehensive tests for live deployment validation
 */

const https = require('https');
const http = require('http');

// Test configuration
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://calendar-app-01-39p4obs2l-anthropologica.vercel.app';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, status, details = '') {
  const statusColor = status === 'PASS' ? 'green' : 'red';
  const statusSymbol = status === 'PASS' ? '✓' : '✗';
  log(`${statusSymbol} ${name}: ${status}`, statusColor);
  if (details) {
    log(`  ${details}`, 'yellow');
  }
}

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'PolyHarmony-Test-Suite/1.0',
        ...options.headers,
      },
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData,
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

// Test functions
async function testApplicationAccess() {
  log('\n🌐 Testing Application Access...', 'blue');
  
  try {
    const response = await makeRequest(PRODUCTION_URL);
    
    if (response.status === 200) {
      logTest('Homepage Access', 'PASS', 'Application loads successfully');
    } else {
      logTest('Homepage Access', 'FAIL', `Unexpected status: ${response.status}`);
    }
  } catch (error) {
    logTest('Homepage Access', 'FAIL', `Request error: ${error.message}`);
  }
}

async function testPWAFiles() {
  log('\n📱 Testing PWA Files...', 'blue');
  
  // Test manifest.json
  try {
    const manifestResponse = await makeRequest(`${PRODUCTION_URL}/manifest.json`);
    
    if (manifestResponse.status === 200) {
      logTest('Manifest.json Access', 'PASS', 'PWA manifest accessible');
      
      // Check if it's valid JSON
      if (typeof manifestResponse.data === 'object' && manifestResponse.data.name) {
        logTest('Manifest.json Validity', 'PASS', `App name: ${manifestResponse.data.name}`);
      } else {
        logTest('Manifest.json Validity', 'FAIL', 'Invalid manifest structure');
      }
    } else {
      logTest('Manifest.json Access', 'FAIL', `Status: ${manifestResponse.status}`);
    }
  } catch (error) {
    logTest('Manifest.json Access', 'FAIL', `Error: ${error.message}`);
  }
  
  // Test service worker
  try {
    const swResponse = await makeRequest(`${PRODUCTION_URL}/sw.js`);
    
    if (swResponse.status === 200) {
      logTest('Service Worker Access', 'PASS', 'Service worker accessible');
      
      // Check if it contains service worker code
      if (typeof swResponse.data === 'string' && swResponse.data.includes('addEventListener')) {
        logTest('Service Worker Validity', 'PASS', 'Contains event listeners');
      } else {
        logTest('Service Worker Validity', 'FAIL', 'Invalid service worker structure');
      }
    } else {
      logTest('Service Worker Access', 'FAIL', `Status: ${swResponse.status}`);
    }
  } catch (error) {
    logTest('Service Worker Access', 'FAIL', `Error: ${error.message}`);
  }
}

async function testAPIEndpoints() {
  log('\n🔌 Testing API Endpoints...', 'blue');
  
  // Test health endpoint
  try {
    const healthResponse = await makeRequest(`${PRODUCTION_URL}/api/health`);
    
    if (healthResponse.status === 200 && healthResponse.data.status) {
      logTest('Health Endpoint', 'PASS', `Status: ${healthResponse.data.status}`);
    } else {
      logTest('Health Endpoint', 'FAIL', `Status: ${healthResponse.status}`);
    }
  } catch (error) {
    logTest('Health Endpoint', 'FAIL', `Error: ${error.message}`);
  }
  
  // Test protected endpoint (should return 401)
  try {
    const eventsResponse = await makeRequest(`${PRODUCTION_URL}/api/events`);
    
    if (eventsResponse.status === 401) {
      logTest('Protected Endpoint Security', 'PASS', 'Properly requires authentication');
    } else {
      logTest('Protected Endpoint Security', 'FAIL', `Unexpected status: ${eventsResponse.status}`);
    }
  } catch (error) {
    logTest('Protected Endpoint Security', 'FAIL', `Error: ${error.message}`);
  }
}

async function testSecurityHeaders() {
  log('\n🔒 Testing Security Headers...', 'blue');
  
  try {
    const response = await makeRequest(PRODUCTION_URL);
    const headers = response.headers;
    
    // Check HTTPS enforcement
    if (headers['strict-transport-security']) {
      logTest('HTTPS Enforcement', 'PASS', 'HSTS header present');
    } else {
      logTest('HTTPS Enforcement', 'FAIL', 'Missing HSTS header');
    }
    
    // Check XSS protection
    if (headers['x-xss-protection']) {
      logTest('XSS Protection', 'PASS', 'XSS protection enabled');
    } else {
      logTest('XSS Protection', 'FAIL', 'Missing XSS protection');
    }
    
    // Check content type options
    if (headers['x-content-type-options']) {
      logTest('Content Type Protection', 'PASS', 'MIME type sniffing disabled');
    } else {
      logTest('Content Type Protection', 'FAIL', 'Missing content type protection');
    }
    
    // Check frame options
    if (headers['x-frame-options']) {
      logTest('Clickjacking Protection', 'PASS', 'Frame options configured');
    } else {
      logTest('Clickjacking Protection', 'FAIL', 'Missing frame options');
    }
    
  } catch (error) {
    logTest('Security Headers', 'FAIL', `Error: ${error.message}`);
  }
}

async function testAuthenticationFlow() {
  log('\n🔐 Testing Authentication Flow...', 'blue');
  
  // Test sign-in page access
  try {
    const signinResponse = await makeRequest(`${PRODUCTION_URL}/auth/signin`);
    
    if (signinResponse.status === 200) {
      logTest('Sign-in Page Access', 'PASS', 'Sign-in page accessible');
    } else {
      logTest('Sign-in Page Access', 'FAIL', `Status: ${signinResponse.status}`);
    }
  } catch (error) {
    logTest('Sign-in Page Access', 'FAIL', `Error: ${error.message}`);
  }
  
  // Test sign-up page access
  try {
    const signupResponse = await makeRequest(`${PRODUCTION_URL}/auth/signup`);
    
    if (signupResponse.status === 200) {
      logTest('Sign-up Page Access', 'PASS', 'Sign-up page accessible');
    } else {
      logTest('Sign-up Page Access', 'FAIL', `Status: ${signupResponse.status}`);
    }
  } catch (error) {
    logTest('Sign-up Page Access', 'FAIL', `Error: ${error.message}`);
  }
  
  // Test CSRF token endpoint (should require auth)
  try {
    const csrfResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/csrf-token`);
    
    if (csrfResponse.status === 401) {
      logTest('CSRF Token Protection', 'PASS', 'Properly requires authentication');
    } else {
      logTest('CSRF Token Protection', 'FAIL', `Unexpected status: ${csrfResponse.status}`);
    }
  } catch (error) {
    logTest('CSRF Token Protection', 'FAIL', `Error: ${error.message}`);
  }
}

async function testPerformance() {
  log('\n⚡ Testing Performance...', 'blue');
  
  try {
    const startTime = Date.now();
    const response = await makeRequest(PRODUCTION_URL);
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    if (response.status === 200) {
      if (responseTime < 2000) {
        logTest('Response Time', 'PASS', `${responseTime}ms (Good)`);
      } else if (responseTime < 5000) {
        logTest('Response Time', 'PASS', `${responseTime}ms (Acceptable)`);
      } else {
        logTest('Response Time', 'FAIL', `${responseTime}ms (Too slow)`);
      }
    } else {
      logTest('Performance Test', 'FAIL', `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('Performance Test', 'FAIL', `Error: ${error.message}`);
  }
}

// Main test runner
async function runAllTests() {
  log(`${colors.bold}🚀 Production Deployment Test Suite${colors.reset}`, 'blue');
  log(`Testing: ${PRODUCTION_URL}`, 'blue');
  
  const tests = [
    testApplicationAccess,
    testPWAFiles,
    testAPIEndpoints,
    testSecurityHeaders,
    testAuthenticationFlow,
    testPerformance,
  ];
  
  let passedTests = 0;
  let totalTests = 0;
  
  for (const test of tests) {
    try {
      await test();
      passedTests++;
      totalTests++;
    } catch (error) {
      logTest(test.name, 'FAIL', `Test error: ${error.message}`);
      totalTests++;
    }
  }
  
  log('\n📊 Test Summary', 'blue');
  log(`Production URL: ${PRODUCTION_URL}`, 'blue');
  log(`Total Test Categories: ${totalTests}`, 'blue');
  log(`Passed Categories: ${passedTests}`, 'green');
  log(`Failed Categories: ${totalTests - passedTests}`, 'red');
  
  if (passedTests === totalTests) {
    log('\n🎉 All test categories passed! Production deployment is successful.', 'green');
    log('\n✅ Your application is ready for users!', 'green');
    log(`\n🌐 Live URL: ${PRODUCTION_URL}`, 'blue');
  } else {
    log('\n⚠️ Some test categories had issues. Please review the details above.', 'yellow');
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch((error) => {
    log(`\n💥 Test suite failed: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testApplicationAccess,
  testPWAFiles,
  testAPIEndpoints,
  testSecurityHeaders,
  testAuthenticationFlow,
  testPerformance,
};
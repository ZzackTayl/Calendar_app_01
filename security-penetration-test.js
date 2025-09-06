/**
 * Comprehensive Security Penetration Test Suite
 * 
 * This script attempts various attack vectors against the Calendar_app_01
 * polyamory calendar application to identify security vulnerabilities.
 * 
 * CRITICAL: This is for authorized security testing only. Do not run
 * against production systems without explicit permission.
 */

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

class SecurityPenetrationTest {
  constructor() {
    this.results = {
      vulnerabilities: [],
      warnings: [],
      passed: [],
      criticalIssues: []
    };
    
    this.supabase = SUPABASE_URL && SUPABASE_ANON_KEY 
      ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      : null;
  }

  log(type, test, message, severity = 'info') {
    const result = {
      timestamp: new Date().toISOString(),
      test,
      message,
      severity,
      type
    };

    console.log(`[${type.toUpperCase()}] ${test}: ${message}`);
    
    if (severity === 'critical') {
      this.results.criticalIssues.push(result);
    } else if (type === 'VULNERABILITY') {
      this.results.vulnerabilities.push(result);
    } else if (type === 'WARNING') {
      this.results.warnings.push(result);
    } else {
      this.results.passed.push(result);
    }
  }

  async makeRequest(endpoint, options = {}) {
    try {
      const url = `${BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      return {
        status: response.status,
        headers: Object.fromEntries(response.headers),
        body: response.status !== 204 ? await response.json().catch(() => null) : null,
        ok: response.ok
      };
    } catch (error) {
      return {
        error: error.message,
        status: null
      };
    }
  }

  // ========================================================================
  // AUTHENTICATION & AUTHORIZATION TESTS
  // ========================================================================

  async testAuthenticationBypass() {
    this.log('INFO', 'AUTH_BYPASS', 'Testing authentication bypass attempts...');

    // Test 1: Direct access to protected routes without authentication
    const protectedRoutes = [
      '/dashboard',
      '/events',
      '/relationships',
      '/settings',
      '/api/events',
      '/api/relationships'
    ];

    for (const route of protectedRoutes) {
      const response = await this.makeRequest(route);
      
      if (response.status === 200) {
        this.log('VULNERABILITY', 'AUTH_BYPASS', 
          `Protected route ${route} accessible without authentication`, 'critical');
      } else if (response.status === 302 || response.status === 401 || response.status === 403) {
        this.log('PASS', 'AUTH_BYPASS', `Route ${route} properly protected`);
      } else {
        this.log('WARNING', 'AUTH_BYPASS', 
          `Unexpected response ${response.status} for route ${route}`, 'medium');
      }
    }

    // Test 2: Malformed JWT tokens
    const malformedTokens = [
      'Bearer invalid.token.here',
      'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
      'Bearer expired_token_attempt',
      'Bearer ' + 'A'.repeat(1000), // Extremely long token
    ];

    for (const token of malformedTokens) {
      const response = await this.makeRequest('/api/events', {
        headers: { 'Authorization': token }
      });

      if (response.status === 200) {
        this.log('VULNERABILITY', 'AUTH_BYPASS', 
          `Malformed token accepted: ${token.substring(0, 50)}...`, 'critical');
      } else {
        this.log('PASS', 'AUTH_BYPASS', 'Malformed token properly rejected');
      }
    }
  }

  async testSessionManagement() {
    this.log('INFO', 'SESSION_MGT', 'Testing session management security...');

    // Test 1: Session fixation attempts
    const response = await this.makeRequest('/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent@test.com',
        password: 'wrongpassword'
      })
    });

    // Check for session information leakage in error responses
    if (response.body && response.body.session) {
      this.log('VULNERABILITY', 'SESSION_MGT', 
        'Session information leaked in error response', 'high');
    } else {
      this.log('PASS', 'SESSION_MGT', 'No session leakage in auth errors');
    }

    // Test 2: Check for secure cookie attributes
    const cookies = response.headers['set-cookie'] || [];
    let hasSecureFlags = true;
    
    for (const cookie of cookies) {
      if (cookie.includes('supabase') && !cookie.includes('Secure')) {
        hasSecureFlags = false;
        this.log('VULNERABILITY', 'SESSION_MGT', 
          'Authentication cookie missing Secure flag', 'medium');
      }
      if (cookie.includes('supabase') && !cookie.includes('HttpOnly')) {
        this.log('WARNING', 'SESSION_MGT', 
          'Authentication cookie missing HttpOnly flag', 'medium');
      }
      if (cookie.includes('supabase') && !cookie.includes('SameSite')) {
        this.log('WARNING', 'SESSION_MGT', 
          'Authentication cookie missing SameSite attribute', 'low');
      }
    }

    if (hasSecureFlags) {
      this.log('PASS', 'SESSION_MGT', 'Cookie security attributes properly configured');
    }
  }

  async testPasswordSecurity() {
    this.log('INFO', 'PASSWORD_SEC', 'Testing password security controls...');

    // Test weak password acceptance
    const weakPasswords = [
      '123456',
      'password',
      '12345678',
      'qwerty',
      'abc123',
      'password123'
    ];

    // Note: We're not actually creating accounts, just testing validation
    for (const weakPassword of weakPasswords) {
      const response = await this.makeRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@security-test.com',
          password: weakPassword
        })
      });

      if (response.status === 201 || response.status === 200) {
        this.log('VULNERABILITY', 'PASSWORD_SEC', 
          `Weak password accepted: ${weakPassword}`, 'high');
      } else if (response.status === 400 && response.body && 
                 response.body.error && response.body.error.includes('password')) {
        this.log('PASS', 'PASSWORD_SEC', 'Weak password properly rejected');
      }
    }
  }

  // ========================================================================
  // INPUT VALIDATION & INJECTION TESTS
  // ========================================================================

  async testSQLInjection() {
    this.log('INFO', 'SQL_INJECTION', 'Testing SQL injection vulnerabilities...');

    const sqlPayloads = [
      "'; DROP TABLE events; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "'; INSERT INTO events (title) VALUES ('injected'); --",
      "' OR 1=1 --",
      "'; UPDATE users SET email='hacked@evil.com'; --"
    ];

    // Test SQL injection in search parameters
    for (const payload of sqlPayloads) {
      const response = await this.makeRequest(
        `/api/events?search=${encodeURIComponent(payload)}`
      );

      if (response.error && response.error.includes('syntax error')) {
        this.log('VULNERABILITY', 'SQL_INJECTION', 
          `Potential SQL injection vulnerability with payload: ${payload}`, 'critical');
      } else if (response.status === 200) {
        this.log('PASS', 'SQL_INJECTION', 'SQL injection payload properly handled');
      }
    }

    // Test SQL injection in POST data
    for (const payload of sqlPayloads.slice(0, 3)) {
      const response = await this.makeRequest('/api/events', {
        method: 'POST',
        body: JSON.stringify({
          title: payload,
          description: `Test event with payload: ${payload}`,
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString()
        })
      });

      // Should be rejected due to authentication, but check for SQL errors
      if (response.body && response.body.error && 
          response.body.error.includes('syntax')) {
        this.log('VULNERABILITY', 'SQL_INJECTION', 
          `SQL injection possible in event creation: ${payload}`, 'critical');
      }
    }
  }

  async testXSSVulnerabilities() {
    this.log('INFO', 'XSS', 'Testing Cross-Site Scripting vulnerabilities...');

    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      '&lt;script&gt;alert("XSS")&lt;/script&gt;'
    ];

    for (const payload of xssPayloads) {
      const response = await this.makeRequest('/api/events', {
        method: 'POST',
        body: JSON.stringify({
          title: payload,
          description: `XSS test: ${payload}`,
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString()
        })
      });

      // Check if XSS payload is sanitized in the response
      if (response.body && JSON.stringify(response.body).includes('<script>')) {
        this.log('VULNERABILITY', 'XSS', 
          `XSS payload not sanitized: ${payload}`, 'high');
      } else {
        this.log('PASS', 'XSS', 'XSS payload properly sanitized');
      }
    }
  }

  // ========================================================================
  // RATE LIMITING & DOS PROTECTION TESTS
  // ========================================================================

  async testRateLimiting() {
    this.log('INFO', 'RATE_LIMIT', 'Testing rate limiting protection...');

    // Test authentication rate limiting
    const authRequests = [];
    for (let i = 0; i < 10; i++) {
      authRequests.push(this.makeRequest('/api/auth/signin', {
        method: 'POST',
        body: JSON.stringify({
          email: 'ratetest@example.com',
          password: 'wrongpassword'
        })
      }));
    }

    const authResults = await Promise.all(authRequests);
    const rateLimited = authResults.some(r => r.status === 429);

    if (rateLimited) {
      this.log('PASS', 'RATE_LIMIT', 'Authentication rate limiting working');
    } else {
      this.log('WARNING', 'RATE_LIMIT', 
        'Authentication rate limiting may be insufficient', 'medium');
    }

    // Test API rate limiting
    const apiRequests = [];
    for (let i = 0; i < 50; i++) {
      apiRequests.push(this.makeRequest('/api/events'));
    }

    const apiResults = await Promise.all(apiRequests);
    const apiRateLimited = apiResults.some(r => r.status === 429);

    if (apiRateLimited) {
      this.log('PASS', 'RATE_LIMIT', 'API rate limiting working');
    } else {
      this.log('WARNING', 'RATE_LIMIT', 
        'API rate limiting may be insufficient', 'medium');
    }
  }

  // ========================================================================
  // PRIVACY & ACCESS CONTROL TESTS
  // ========================================================================

  async testPrivacyBoundaries() {
    this.log('INFO', 'PRIVACY', 'Testing privacy boundary enforcement...');

    if (!this.supabase) {
      this.log('WARNING', 'PRIVACY', 'Supabase not configured, skipping direct DB tests');
      return;
    }

    try {
      // Test 1: Attempt to access other users' events without authentication
      const { data, error } = await this.supabase
        .from('events')
        .select('*')
        .limit(10);

      if (data && data.length > 0) {
        this.log('VULNERABILITY', 'PRIVACY', 
          'Events accessible without authentication via direct DB access', 'critical');
      } else if (error && error.message.includes('permission denied')) {
        this.log('PASS', 'PRIVACY', 'RLS policies preventing unauthorized access');
      }

      // Test 2: Attempt to access users table
      const { data: users, error: userError } = await this.supabase
        .from('users')
        .select('*')
        .limit(10);

      if (users && users.length > 0) {
        this.log('VULNERABILITY', 'PRIVACY', 
          'User data accessible without authentication', 'critical');
      } else if (userError && userError.message.includes('permission denied')) {
        this.log('PASS', 'PRIVACY', 'User data properly protected');
      }

    } catch (error) {
      this.log('WARNING', 'PRIVACY', `Privacy test error: ${error.message}`);
    }
  }

  // ========================================================================
  // SECURITY HEADERS & CONFIGURATION TESTS
  // ========================================================================

  async testSecurityHeaders() {
    this.log('INFO', 'SEC_HEADERS', 'Testing security headers...');

    const response = await this.makeRequest('/');
    const headers = response.headers || {};

    const expectedHeaders = [
      'content-security-policy',
      'x-frame-options',
      'x-content-type-options',
      'referrer-policy',
      'permissions-policy'
    ];

    for (const header of expectedHeaders) {
      if (headers[header]) {
        this.log('PASS', 'SEC_HEADERS', `${header} header present`);
      } else {
        this.log('WARNING', 'SEC_HEADERS', 
          `Missing security header: ${header}`, 'medium');
      }
    }

    // Check for HSTS header (should be present in production)
    if (headers['strict-transport-security']) {
      this.log('PASS', 'SEC_HEADERS', 'HSTS header present');
    } else {
      this.log('WARNING', 'SEC_HEADERS', 
        'HSTS header missing (may be expected in development)', 'low');
    }

    // Check for information disclosure in headers
    const sensitiveHeaders = ['server', 'x-powered-by'];
    for (const header of sensitiveHeaders) {
      if (headers[header]) {
        this.log('WARNING', 'SEC_HEADERS', 
          `Information disclosure header present: ${header}`, 'low');
      }
    }
  }

  // ========================================================================
  // CSRF PROTECTION TESTS
  // ========================================================================

  async testCSRFProtection() {
    this.log('INFO', 'CSRF', 'Testing CSRF protection...');

    // Test POST request without CSRF token
    const response = await this.makeRequest('/api/events', {
      method: 'POST',
      body: JSON.stringify({
        title: 'CSRF Test Event',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString()
      })
    });

    // Should be blocked by authentication first, but check for CSRF-specific errors
    if (response.body && response.body.error && 
        response.body.error.includes('CSRF')) {
      this.log('PASS', 'CSRF', 'CSRF protection active');
    } else if (response.status === 403) {
      this.log('PASS', 'CSRF', 'Request properly rejected (may include CSRF protection)');
    } else {
      this.log('WARNING', 'CSRF', 
        'CSRF protection status unclear from unauthenticated test', 'low');
    }
  }

  // ========================================================================
  // COMPREHENSIVE TEST RUNNER
  // ========================================================================

  async runAllTests() {
    console.log('🔒 Starting Comprehensive Security Penetration Test Suite');
    console.log('=' .repeat(70));

    try {
      await this.testAuthenticationBypass();
      await this.testSessionManagement();
      await this.testPasswordSecurity();
      await this.testSQLInjection();
      await this.testXSSVulnerabilities();
      await this.testRateLimiting();
      await this.testPrivacyBoundaries();
      await this.testSecurityHeaders();
      await this.testCSRFProtection();

      this.generateReport();
    } catch (error) {
      console.error('❌ Test suite error:', error.message);
    }
  }

  generateReport() {
    console.log('\n' + '=' .repeat(70));
    console.log('🔒 SECURITY PENETRATION TEST REPORT');
    console.log('=' .repeat(70));

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Critical Issues: ${this.results.criticalIssues.length}`);
    console.log(`   Vulnerabilities: ${this.results.vulnerabilities.length}`);
    console.log(`   Warnings: ${this.results.warnings.length}`);
    console.log(`   Tests Passed: ${this.results.passed.length}`);

    if (this.results.criticalIssues.length > 0) {
      console.log(`\n🚨 CRITICAL SECURITY ISSUES:`);
      this.results.criticalIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.test}: ${issue.message}`);
      });
    }

    if (this.results.vulnerabilities.length > 0) {
      console.log(`\n⚠️  SECURITY VULNERABILITIES:`);
      this.results.vulnerabilities.forEach((vuln, index) => {
        console.log(`   ${index + 1}. ${vuln.test}: ${vuln.message}`);
      });
    }

    if (this.results.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS:`);
      this.results.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning.test}: ${warning.message}`);
      });
    }

    // Recommendations
    console.log(`\n🔧 SECURITY RECOMMENDATIONS:`);
    
    if (this.results.criticalIssues.length > 0) {
      console.log(`   - IMMEDIATE ACTION REQUIRED: Fix all critical issues before deployment`);
    }
    
    if (this.results.vulnerabilities.length > 0) {
      console.log(`   - Address all identified vulnerabilities`);
    }
    
    console.log(`   - Regularly run security scans and penetration tests`);
    console.log(`   - Implement security monitoring and alerting`);
    console.log(`   - Conduct code reviews with security focus`);
    console.log(`   - Keep dependencies updated and scan for vulnerabilities`);

    // Overall assessment
    const totalIssues = this.results.criticalIssues.length + this.results.vulnerabilities.length;
    
    if (totalIssues === 0) {
      console.log(`\n✅ OVERALL ASSESSMENT: No critical vulnerabilities detected`);
      console.log(`   The application appears to have good security practices in place.`);
    } else if (this.results.criticalIssues.length > 0) {
      console.log(`\n❌ OVERALL ASSESSMENT: CRITICAL SECURITY ISSUES DETECTED`);
      console.log(`   DO NOT DEPLOY TO PRODUCTION until critical issues are resolved.`);
    } else {
      console.log(`\n⚠️  OVERALL ASSESSMENT: Security vulnerabilities detected`);
      console.log(`   Address vulnerabilities before production deployment.`);
    }

    console.log('\n' + '=' .repeat(70));
  }
}

// Run the test suite if called directly
if (require.main === module) {
  const tester = new SecurityPenetrationTest();
  tester.runAllTests().catch(console.error);
}

module.exports = SecurityPenetrationTest;
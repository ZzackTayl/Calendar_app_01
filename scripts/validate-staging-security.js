#!/usr/bin/env node

const https = require('https');
const tls = require('tls');
const { URL } = require('url');

async function validateStagingSecurity() {
  const stagingUrl = process.env.STAGING_URL || process.env.STAGING_APP_URL || 'https://staging.polyharmony.app';
  const parsedUrl = new URL(stagingUrl);

  let errors = [];
  let warnings = [];

  console.log(`Validating security for staging environment: ${stagingUrl}`);

  // SSL/TLS Validation
  try {
    const certInfo = await checkSSLCertificate(parsedUrl.hostname);
    if (!certInfo.valid) {
      errors.push(...certInfo.errors);
    }
    console.log('✓ SSL certificate validation completed');
  } catch (error) {
    errors.push(`SSL validation failed: ${error.message}`);
  }

  // HTTP Security Headers Validation
  try {
    const headerResults = await checkSecurityHeaders(stagingUrl);
    errors.push(...headerResults.errors);
    warnings.push(...headerResults.warnings);
    console.log('✓ HTTP security headers validation completed');
  } catch (error) {
    errors.push(`HTTP headers validation failed: ${error.message}`);
  }

  // Additional staging-specific validations
  try {
    const stagingResults = await checkStagingSpecificSecurity(stagingUrl);
    errors.push(...stagingResults.errors);
    warnings.push(...stagingResults.warnings);
    console.log('✓ Staging-specific security validation completed');
  } catch (error) {
    errors.push(`Staging-specific validation failed: ${error.message}`);
  }

  // Report results
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    warnings.forEach(w => console.log(`  - ${w}`));
  }

  if (errors.length > 0) {
    console.log('\n❌ Security validation failed:');
    errors.forEach(e => console.log(`  - ${e}`));
    process.exit(1);
  } else {
    console.log('\n✅ All security validations passed');
    process.exit(0);
  }
}

function checkSSLCertificate(hostname) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: hostname,
      port: 443,
      rejectUnauthorized: false,
      servername: hostname
    }, () => {
      const cert = socket.getPeerCertificate();
      const errors = [];
      const warnings = [];

      if (!cert || !cert.subject) {
        errors.push('No valid SSL certificate found');
        socket.end();
        resolve({ valid: false, errors, warnings });
        return;
      }

      const now = new Date();
      const validFrom = new Date(cert.valid_from);
      const validTo = new Date(cert.valid_to);

      if (now < validFrom) {
        errors.push(`SSL certificate not yet valid (valid from: ${validFrom})`);
      }

      if (now > validTo) {
        errors.push(`SSL certificate expired (expired: ${validTo})`);
      }

      // Check for weak cipher suites
      const cipher = socket.getCipher();
      if (cipher && cipher.name.includes('RC4')) {
        warnings.push('Weak cipher suite detected: ' + cipher.name);
      }

      // Check protocol version
      const protocol = socket.getProtocol();
      if (protocol && protocol.startsWith('TLSv1')) {
        warnings.push('Outdated TLS protocol: ' + protocol);
      }

      socket.end();
      resolve({ valid: errors.length === 0, errors, warnings });
    });

    socket.on('error', (error) => {
      reject(error);
    });

    socket.setTimeout(10000, () => {
      socket.destroy();
      reject(new Error('SSL connection timeout'));
    });
  });
}

function checkSecurityHeaders(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname || '/',
      method: 'GET',
      headers: {
        'User-Agent': 'Staging-Security-Validator/1.0'
      }
    };

    const req = https.request(options, (res) => {
      const headers = res.headers;
      const errors = [];
      const warnings = [];

      // Required security headers
      const requiredHeaders = {
        'strict-transport-security': 'Strict-Transport-Security (HSTS) header missing',
        'x-frame-options': 'X-Frame-Options header missing',
        'x-content-type-options': 'X-Content-Type-Options header missing',
        'content-security-policy': 'Content-Security-Policy (CSP) header missing',
        'x-xss-protection': 'X-XSS-Protection header missing'
      };

      for (const [header, message] of Object.entries(requiredHeaders)) {
        if (!headers[header.toLowerCase()]) {
          errors.push(message);
        }
      }

      // Validate HSTS
      const hsts = headers['strict-transport-security'];
      if (hsts) {
        const maxAgeMatch = hsts.match(/max-age=(\d+)/);
        if (maxAgeMatch) {
          const maxAge = parseInt(maxAgeMatch[1]);
          if (maxAge < 31536000) { // Less than 1 year
            warnings.push('HSTS max-age is less than recommended 1 year');
          }
        }
        if (!hsts.includes('includeSubDomains')) {
          warnings.push('HSTS does not include subdomains');
        }
        if (!hsts.includes('preload')) {
          warnings.push('HSTS preload not enabled');
        }
      }

      // Validate CSP
      const csp = headers['content-security-policy'];
      if (csp) {
        if (csp.includes('unsafe-inline') || csp.includes('unsafe-eval')) {
          warnings.push('CSP contains unsafe directives (unsafe-inline or unsafe-eval)');
        }
      }

      // Check for server header exposure
      if (headers['server']) {
        warnings.push('Server header is exposed (consider removing for security)');
      }

      // Check for X-Powered-By header
      if (headers['x-powered-by']) {
        warnings.push('X-Powered-By header is exposed (consider removing)');
      }

      res.on('data', () => {}); // Consume response
      res.on('end', () => {
        resolve({ errors, warnings });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('HTTP request timeout'));
    });

    req.end();
  });
}

function checkStagingSpecificSecurity(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname || '/',
      method: 'GET',
      headers: {
        'User-Agent': 'Staging-Security-Validator/1.0'
      }
    };

    const req = https.request(options, (res) => {
      const headers = res.headers;
      const errors = [];
      const warnings = [];

      // Check for staging-specific security issues
      const stagingIndicators = [
        'staging', 'stage', 'dev', 'development', 'test', 'testing'
      ];

      // Check if staging indicators are exposed in headers
      Object.values(headers).forEach(headerValue => {
        if (typeof headerValue === 'string') {
          stagingIndicators.forEach(indicator => {
            if (headerValue.toLowerCase().includes(indicator)) {
              warnings.push(`Potential staging environment exposure in header: ${headerValue}`);
            }
          });
        }
      });

      // Check for debug endpoints exposure
      const debugPaths = ['/debug', '/_debug', '/admin', '/api/debug'];
      debugPaths.forEach(path => {
        if (url.includes(path)) {
          warnings.push(`Debug endpoint may be exposed: ${path}`);
        }
      });

      // Check for development-specific headers
      if (headers['x-powered-by'] && headers['x-powered-by'].includes('Next.js')) {
        warnings.push('Next.js version exposed in X-Powered-By header');
      }

      // Check for staging-specific cookies
      if (headers['set-cookie']) {
        const cookies = Array.isArray(headers['set-cookie']) ? headers['set-cookie'] : [headers['set-cookie']];
        cookies.forEach(cookie => {
          if (cookie.includes('staging') || cookie.includes('dev')) {
            warnings.push('Staging-specific cookie detected');
          }
          // Check for secure cookie flags
          if (!cookie.includes('Secure') || !cookie.includes('HttpOnly')) {
            warnings.push('Cookie missing security flags (Secure/HttpOnly)');
          }
        });
      }

      // Check response content for staging indicators
      let responseBody = '';
      res.on('data', chunk => {
        responseBody += chunk;
      });

      res.on('end', () => {
        // Check HTML content for staging indicators
        if (responseBody.includes('<title>') && responseBody.includes('staging')) {
          warnings.push('Staging environment name exposed in page title');
        }

        // Check for development tools in HTML
        if (responseBody.includes('React Developer Tools') || responseBody.includes('Redux DevTools')) {
          warnings.push('Development tools detected in production/staging build');
        }

        resolve({ errors, warnings });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Staging security check timeout'));
    });

    req.end();
  });
}

// Run validation
validateStagingSecurity().catch((error) => {
  console.error('Validation script error:', error.message);
  process.exit(1);
});
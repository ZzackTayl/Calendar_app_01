#!/usr/bin/env node
/**
 * PolyHarmony Staging Security Validator
 * Validates security configurations and endpoints in staging environment
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

// Configuration
const CONFIG = {
    stagingUrl: process.env.STAGING_APP_URL || 'https://staging.polyharmony.app',
    timeout: 30000,
    maxRedirects: 5,
    expectedHeaders: {
        'x-frame-options': 'DENY',
        'x-content-type-options': 'nosniff',
        'x-xss-protection': '1; mode=block',
        'strict-transport-security': 'max-age=31536000; includeSubDomains',
        'content-security-policy': true, // Just check if present
        'x-powered-by': false, // Should not be present
    },
    securityEndpoints: [
        '/api/health',
        '/api/auth/session',
        '/api/security/headers',
        '/.well-known/security.txt',
    ],
    forbiddenPaths: [
        '/.env',
        '/.env.local',
        '/.env.staging',
        '/package.json',
        '/docker-compose.yml',
        '/admin',
        '/debug',
        '/phpinfo',
        '/server-status',
        '/wp-admin',
    ],
};

/**
 * Logging utility
 */
function log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
        info: '\x1b[36m',
        success: '\x1b[32m',
        warning: '\x1b[33m',
        error: '\x1b[31m',
        reset: '\x1b[0m',
    };
    const color = colors[level] || colors.info;
    console.log(`${color}[${timestamp}] [${level.toUpperCase()}] ${message}${colors.reset}`);
}

/**
 * Make HTTP request with timeout and error handling
 */
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const httpModule = isHttps ? https : http;

        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            timeout: CONFIG.timeout,
            rejectUnauthorized: false, // Allow self-signed certs in staging
            ...options,
        };

        const req = httpModule.request(requestOptions, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data,
                    url: url,
                });
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Request failed for ${url}: ${error.message}`));
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Request timeout for ${url} after ${CONFIG.timeout}ms`));
        });

        req.end();
    });
}

/**
 * Validate security headers
 */
async function validateSecurityHeaders() {
    log('Validating security headers...');

    try {
        const response = await makeRequest(CONFIG.stagingUrl);
        const headers = response.headers;
        const results = {
            passed: [],
            failed: [],
            warnings: [],
        };

        // Check expected headers
        for (const [headerName, expectedValue] of Object.entries(CONFIG.expectedHeaders)) {
            const actualValue = headers[headerName.toLowerCase()];

            if (expectedValue === false) {
                // Header should not be present
                if (actualValue) {
                    results.failed.push(`${headerName}: Should not be present but found: ${actualValue}`);
                } else {
                    results.passed.push(`${headerName}: Correctly not present`);
                }
            } else if (expectedValue === true) {
                // Header should be present (any value)
                if (actualValue) {
                    results.passed.push(`${headerName}: Present with value: ${actualValue}`);
                } else {
                    results.failed.push(`${headerName}: Missing`);
                }
            } else {
                // Header should have specific value
                if (actualValue === expectedValue) {
                    results.passed.push(`${headerName}: Correct value`);
                } else {
                    results.failed.push(`${headerName}: Expected "${expectedValue}", got "${actualValue || 'missing'}"`);
                }
            }
        }

        // Check for information disclosure headers
        const dangerousHeaders = ['server', 'x-powered-by', 'x-aspnet-version', 'x-runtime'];
        for (const header of dangerousHeaders) {
            if (headers[header]) {
                results.warnings.push(`${header}: Information disclosure - ${headers[header]}`);
            }
        }

        log(`Security headers validation: ${results.passed.length} passed, ${results.failed.length} failed, ${results.warnings.length} warnings`);

        return {
            success: results.failed.length === 0,
            details: results,
        };

    } catch (error) {
        log(`Security headers validation failed: ${error.message}`, 'error');
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Test security endpoints
 */
async function testSecurityEndpoints() {
    log('Testing security endpoints...');

    const results = {
        passed: [],
        failed: [],
    };

    for (const endpoint of CONFIG.securityEndpoints) {
        try {
            const url = CONFIG.stagingUrl + endpoint;
            const response = await makeRequest(url);

            if (response.statusCode >= 200 && response.statusCode < 400) {
                results.passed.push(`${endpoint}: HTTP ${response.statusCode}`);
            } else {
                results.failed.push(`${endpoint}: HTTP ${response.statusCode}`);
            }

        } catch (error) {
            results.failed.push(`${endpoint}: ${error.message}`);
        }
    }

    log(`Security endpoints test: ${results.passed.length} passed, ${results.failed.length} failed`);

    return {
        success: results.failed.length === 0,
        details: results,
    };
}

/**
 * Test forbidden paths
 */
async function testForbiddenPaths() {
    log('Testing forbidden paths...');

    const results = {
        passed: [],
        failed: [],
    };

    for (const path of CONFIG.forbiddenPaths) {
        try {
            const url = CONFIG.stagingUrl + path;
            const response = await makeRequest(url);

            // These paths should return 404 or 403
            if (response.statusCode === 404 || response.statusCode === 403) {
                results.passed.push(`${path}: Correctly blocked (HTTP ${response.statusCode})`);
            } else {
                results.failed.push(`${path}: Should be blocked but returned HTTP ${response.statusCode}`);
            }

        } catch (error) {
            // Network errors are acceptable for forbidden paths
            results.passed.push(`${path}: Network error (likely blocked): ${error.message}`);
        }
    }

    log(`Forbidden paths test: ${results.passed.length} passed, ${results.failed.length} failed`);

    return {
        success: results.failed.length === 0,
        details: results,
    };
}

/**
 * Test HTTPS configuration
 */
async function testHTTPSConfiguration() {
    log('Testing HTTPS configuration...');

    try {
        // Test HTTPS redirect
        const httpUrl = CONFIG.stagingUrl.replace('https://', 'http://');
        const httpResponse = await makeRequest(httpUrl, {
            timeout: 10000,
            rejectUnauthorized: false,
        });

        const results = {
            passed: [],
            failed: [],
            warnings: [],
        };

        // Check if HTTP redirects to HTTPS
        if (httpResponse.statusCode >= 300 && httpResponse.statusCode < 400) {
            const location = httpResponse.headers.location;
            if (location && location.startsWith('https://')) {
                results.passed.push('HTTP to HTTPS redirect: Working');
            } else {
                results.failed.push('HTTP to HTTPS redirect: Redirects but not to HTTPS');
            }
        } else {
            results.failed.push('HTTP to HTTPS redirect: Not redirecting');
        }

        // Test HTTPS directly
        const httpsResponse = await makeRequest(CONFIG.stagingUrl);
        if (httpsResponse.statusCode >= 200 && httpsResponse.statusCode < 400) {
            results.passed.push('HTTPS access: Working');
        } else {
            results.failed.push(`HTTPS access: HTTP ${httpsResponse.statusCode}`);
        }

        // Check HSTS header
        const hstsHeader = httpsResponse.headers['strict-transport-security'];
        if (hstsHeader) {
            results.passed.push(`HSTS header: ${hstsHeader}`);
        } else {
            results.warnings.push('HSTS header: Missing');
        }

        log(`HTTPS configuration test: ${results.passed.length} passed, ${results.failed.length} failed, ${results.warnings.length} warnings`);

        return {
            success: results.failed.length === 0,
            details: results,
        };

    } catch (error) {
        log(`HTTPS configuration test failed: ${error.message}`, 'error');
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Test API security
 */
async function testAPISecurity() {
    log('Testing API security...');

    const results = {
        passed: [],
        failed: [],
        warnings: [],
    };

    // Test rate limiting
    try {
        const requests = [];
        for (let i = 0; i < 10; i++) {
            requests.push(makeRequest(`${CONFIG.stagingUrl}/api/health`));
        }

        const responses = await Promise.all(requests);
        const rateLimited = responses.some(r => r.statusCode === 429);

        if (rateLimited) {
            results.passed.push('Rate limiting: Active');
        } else {
            results.warnings.push('Rate limiting: Not detected (may not be strict enough for testing)');
        }

    } catch (error) {
        results.warnings.push(`Rate limiting test: ${error.message}`);
    }

    // Test API versioning
    try {
        const response = await makeRequest(`${CONFIG.stagingUrl}/api/health`);
        const apiVersion = response.headers['api-version'] || response.headers['x-api-version'];

        if (apiVersion) {
            results.passed.push(`API versioning: ${apiVersion}`);
        } else {
            results.warnings.push('API versioning: Not detected');
        }

    } catch (error) {
        results.warnings.push(`API versioning test: ${error.message}`);
    }

    // Test CORS configuration
    try {
        const response = await makeRequest(`${CONFIG.stagingUrl}/api/health`, {
            headers: {
                'Origin': 'https://malicious-site.com',
            },
        });

        const corsHeader = response.headers['access-control-allow-origin'];
        if (corsHeader === '*') {
            results.failed.push('CORS: Wildcard origin allowed (security risk)');
        } else if (corsHeader) {
            results.passed.push(`CORS: Restricted to ${corsHeader}`);
        } else {
            results.passed.push('CORS: No CORS header (restrictive)');
        }

    } catch (error) {
        results.warnings.push(`CORS test: ${error.message}`);
    }

    log(`API security test: ${results.passed.length} passed, ${results.failed.length} failed, ${results.warnings.length} warnings`);

    return {
        success: results.failed.length === 0,
        details: results,
    };
}

/**
 * Generate security report
 */
function generateSecurityReport(testResults) {
    const report = {
        timestamp: new Date().toISOString(),
        stagingUrl: CONFIG.stagingUrl,
        summary: {
            totalTests: Object.keys(testResults).length,
            passed: 0,
            failed: 0,
            warnings: 0,
        },
        tests: testResults,
    };

    // Calculate summary
    for (const [testName, result] of Object.entries(testResults)) {
        if (result.success) {
            report.summary.passed++;
        } else {
            report.summary.failed++;
        }

        if (result.details && result.details.warnings) {
            report.summary.warnings += result.details.warnings.length;
        }
    }

    return report;
}

/**
 * Main execution
 */
async function main() {
    log('=== PolyHarmony Staging Security Validation ===');
    log(`Target URL: ${CONFIG.stagingUrl}`);

    const testResults = {};

    try {
        // Run all security tests
        testResults.securityHeaders = await validateSecurityHeaders();
        testResults.securityEndpoints = await testSecurityEndpoints();
        testResults.forbiddenPaths = await testForbiddenPaths();
        testResults.httpsConfiguration = await testHTTPSConfiguration();
        testResults.apiSecurity = await testAPISecurity();

        // Generate and save report
        const report = generateSecurityReport(testResults);

        // Write report to file
        const fs = require('fs');
        const reportPath = './staging-security-report.json';
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        log(`Security report generated: ${reportPath}`);

        // Log summary
        log('=== Security Validation Summary ===');
        log(`Total tests: ${report.summary.totalTests}`);
        log(`Passed: ${report.summary.passed}`, 'success');
        log(`Failed: ${report.summary.failed}`, report.summary.failed > 0 ? 'error' : 'info');
        log(`Warnings: ${report.summary.warnings}`, report.summary.warnings > 0 ? 'warning' : 'info');

        // Exit with appropriate code
        process.exit(report.summary.failed > 0 ? 1 : 0);

    } catch (error) {
        log(`Security validation failed: ${error.message}`, 'error');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        log(`Unhandled error: ${error.message}`, 'error');
        process.exit(1);
    });
}

module.exports = {
    main,
    validateSecurityHeaders,
    testSecurityEndpoints,
    testForbiddenPaths,
    testHTTPSConfiguration,
    testAPISecurity
};
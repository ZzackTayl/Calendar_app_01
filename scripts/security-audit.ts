/**
 * Comprehensive Security Audit Script
 * Validates all security controls are properly implemented
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface SecurityAuditResult {
  endpoint: string;
  path: string;
  hasAuthentication: boolean;
  hasCSRFProtection: boolean;
  hasRateLimit: boolean;
  hasInputValidation: boolean;
  hasSanitization: boolean;
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
  vulnerabilities: string[];
  recommendations: string[];
}

interface AuditSummary {
  totalEndpoints: number;
  secureEndpoints: number;
  vulnerableEndpoints: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  results: SecurityAuditResult[];
}

/**
 * Scan all API route files for security implementations
 */
export function auditAPISecurity(apiDir = join(process.cwd(), 'app', 'api')): AuditSummary {
  const results: SecurityAuditResult[] = [];
  const apiFiles = findApiFiles(apiDir);

  console.log(`🔍 Auditing ${apiFiles.length} API endpoint files...`);

  for (const filePath of apiFiles) {
    const result = auditSingleEndpoint(filePath);
    if (result) {
      results.push(result);
    }
  }

  const summary = generateAuditSummary(results);
  return summary;
}

/**
 * Find all route.ts files in the API directory
 */
function findApiFiles(dir: string): string[] {
  const files: string[] = [];

  function traverse(currentDir: string) {
    try {
      const items = readdirSync(currentDir);

      for (const item of items) {
        const itemPath = join(currentDir, item);
        const stat = statSync(itemPath);

        if (stat.isDirectory()) {
          traverse(itemPath);
        } else if (item === 'route.ts' || item === 'route.js') {
          files.push(itemPath);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${currentDir}:`, error);
    }
  }

  traverse(dir);
  return files;
}

/**
 * Audit a single API endpoint file
 */
function auditSingleEndpoint(filePath: string): SecurityAuditResult | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const endpoint = extractEndpointName(filePath);

    const audit: SecurityAuditResult = {
      endpoint,
      path: filePath,
      hasAuthentication: false,
      hasCSRFProtection: false,
      hasRateLimit: false,
      hasInputValidation: false,
      hasSanitization: false,
      securityLevel: 'low',
      vulnerabilities: [],
      recommendations: []
    };

    // Check for authentication
    if (content.includes('requireAuthentication') ||
        content.includes('getUser()') ||
        content.includes('auth.getSession')) {
      audit.hasAuthentication = true;
    } else if (!isPublicEndpoint(endpoint)) {
      audit.vulnerabilities.push('Missing authentication enforcement');
      audit.recommendations.push('Add requireAuthentication() check');
    }

    // Check for CSRF protection
    if (content.includes('validateCSRFProtection')) {
      audit.hasCSRFProtection = true;
    } else if (hasStateChangingMethods(content)) {
      audit.vulnerabilities.push('Missing CSRF protection for state-changing operations');
      audit.recommendations.push('Add validateCSRFProtection() for POST/PUT/DELETE methods');
    }

    // Check for rate limiting
    if (content.includes('checkRateLimit') ||
        content.includes('RATE_LIMITS')) {
      audit.hasRateLimit = true;
    } else {
      audit.vulnerabilities.push('Missing rate limiting');
      audit.recommendations.push('Implement rate limiting with checkRateLimit()');
    }

    // Check for input validation
    if (content.includes('z.object') ||
        content.includes('schema.parse') ||
        content.includes('.refine(')) {
      audit.hasInputValidation = true;
    } else if (hasUserInput(content)) {
      audit.vulnerabilities.push('Missing input validation schemas');
      audit.recommendations.push('Add Zod schemas for request validation');
    }

    // Check for input sanitization
    if (content.includes('sanitize') ||
        content.includes('.replace(/[<>\'"]/g') ||
        content.includes('DOMPurify') ||
        content.includes('/^[a-f0-9-]+$/i.test')) {
      audit.hasSanitization = true;
    } else if (hasUserInput(content)) {
      audit.vulnerabilities.push('Missing input sanitization');
      audit.recommendations.push('Add input sanitization for user-provided data');
    }

    // Determine security level
    audit.securityLevel = determineSecurityLevel(audit);

    return audit;

  } catch (error) {
    console.error(`Error auditing ${filePath}:`, error);
    return null;
  }
}

/**
 * Extract endpoint name from file path
 */
function extractEndpointName(filePath: string): string {
  const parts = filePath.split('/');
  const apiIndex = parts.findIndex(part => part === 'api');
  if (apiIndex === -1) return filePath;

  const endpointParts = parts.slice(apiIndex + 1);
  return '/' + endpointParts
    .filter(part => part !== 'route.ts' && part !== 'route.js')
    .map(part => part.startsWith('[') && part.endsWith(']') ? `:${part.slice(1, -1)}` : part)
    .join('/');
}

/**
 * Check if endpoint should be considered public
 */
function isPublicEndpoint(endpoint: string): boolean {
  const publicPatterns = [
    '/health',
    '/auth/',
    '/webhooks/'
  ];

  return publicPatterns.some(pattern => endpoint.startsWith(pattern));
}

/**
 * Check if content has state-changing HTTP methods
 */
function hasStateChangingMethods(content: string): boolean {
  const methods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  return methods.some(method =>
    content.includes(`export async function ${method}`) ||
    content.includes(`async function ${method}`)
  );
}

/**
 * Check if content processes user input
 */
function hasUserInput(content: string): boolean {
  return content.includes('request.json()') ||
         content.includes('searchParams.get') ||
         content.includes('params.') ||
         content.includes('request.body') ||
         content.includes('formData()');
}

/**
 * Determine security level based on vulnerabilities
 */
function determineSecurityLevel(audit: SecurityAuditResult): 'low' | 'medium' | 'high' | 'critical' {
  const criticalVulns = [
    'Missing authentication enforcement',
    'Missing CSRF protection for state-changing operations'
  ];

  const highVulns = [
    'Missing input validation schemas',
    'Missing input sanitization'
  ];

  const hasCritical = audit.vulnerabilities.some(vuln =>
    criticalVulns.some(critical => vuln.includes(critical))
  );

  const hasHigh = audit.vulnerabilities.some(vuln =>
    highVulns.some(high => vuln.includes(high))
  );

  if (hasCritical) return 'critical';
  if (hasHigh) return 'high';
  if (audit.vulnerabilities.length > 0) return 'medium';
  return 'low';
}

/**
 * Generate audit summary
 */
function generateAuditSummary(results: SecurityAuditResult[]): AuditSummary {
  const totalEndpoints = results.length;
  const secureEndpoints = results.filter(r => r.vulnerabilities.length === 0).length;
  const vulnerableEndpoints = totalEndpoints - secureEndpoints;
  const criticalVulnerabilities = results.filter(r => r.securityLevel === 'critical').length;
  const highVulnerabilities = results.filter(r => r.securityLevel === 'high').length;

  return {
    totalEndpoints,
    secureEndpoints,
    vulnerableEndpoints,
    criticalVulnerabilities,
    highVulnerabilities,
    results
  };
}

/**
 * Print audit results
 */
export function printAuditResults(summary: AuditSummary): void {
  console.log('\n🛡️  SECURITY AUDIT RESULTS\n');
  console.log('=' .repeat(50));

  console.log(`📊 Summary:`);
  console.log(`   Total Endpoints: ${summary.totalEndpoints}`);
  console.log(`   Secure Endpoints: ${summary.secureEndpoints} (${Math.round(summary.secureEndpoints / summary.totalEndpoints * 100)}%)`);
  console.log(`   Vulnerable Endpoints: ${summary.vulnerableEndpoints}`);
  console.log(`   Critical Vulnerabilities: ${summary.criticalVulnerabilities}`);
  console.log(`   High Vulnerabilities: ${summary.highVulnerabilities}`);

  if (summary.vulnerableEndpoints > 0) {
    console.log('\n🚨 VULNERABLE ENDPOINTS:\n');

    summary.results
      .filter(r => r.vulnerabilities.length > 0)
      .sort((a, b) => {
        const levelOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return levelOrder[b.securityLevel] - levelOrder[a.securityLevel];
      })
      .forEach(result => {
        const icon = getSecurityIcon(result.securityLevel);
        console.log(`${icon} ${result.endpoint} [${result.securityLevel.toUpperCase()}]`);

        result.vulnerabilities.forEach(vuln => {
          console.log(`   ❌ ${vuln}`);
        });

        result.recommendations.forEach(rec => {
          console.log(`   💡 ${rec}`);
        });

        console.log();
      });
  }

  if (summary.secureEndpoints > 0) {
    console.log('\n✅ SECURE ENDPOINTS:\n');

    summary.results
      .filter(r => r.vulnerabilities.length === 0)
      .forEach(result => {
        console.log(`✅ ${result.endpoint}`);
        console.log(`   🔒 Authentication: ${result.hasAuthentication ? '✓' : '✗'}`);
        console.log(`   🛡️  CSRF Protection: ${result.hasCSRFProtection ? '✓' : 'N/A'}`);
        console.log(`   ⏱️  Rate Limiting: ${result.hasRateLimit ? '✓' : '✗'}`);
        console.log(`   🔍 Input Validation: ${result.hasInputValidation ? '✓' : 'N/A'}`);
        console.log(`   🧹 Sanitization: ${result.hasSanitization ? '✓' : 'N/A'}`);
        console.log();
      });
  }

  console.log('\n' + '=' .repeat(50));

  if (summary.criticalVulnerabilities > 0) {
    console.log('🚨 CRITICAL: Immediate action required on critical vulnerabilities!');
  } else if (summary.highVulnerabilities > 0) {
    console.log('⚠️  HIGH: Address high-priority vulnerabilities soon.');
  } else if (summary.vulnerableEndpoints > 0) {
    console.log('⚡ MEDIUM: Address remaining vulnerabilities when possible.');
  } else {
    console.log('🎉 EXCELLENT: All endpoints have proper security controls!');
  }
}

/**
 * Get security icon based on level
 */
function getSecurityIcon(level: string): string {
  switch (level) {
    case 'critical': return '🔴';
    case 'high': return '🟠';
    case 'medium': return '🟡';
    case 'low': return '🟢';
    default: return '⚪';
  }
}

/**
 * Main audit function
 */
export function runSecurityAudit(): void {
  console.log('🚀 Starting comprehensive security audit...\n');

  const summary = auditAPISecurity();
  printAuditResults(summary);

  // Exit with appropriate code
  if (summary.criticalVulnerabilities > 0) {
    process.exit(1);
  } else if (summary.highVulnerabilities > 0) {
    process.exit(2);
  } else {
    process.exit(0);
  }
}

// Run audit if called directly
if (require.main === module) {
  runSecurityAudit();
}
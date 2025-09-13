#!/usr/bin/env node

/**
 * Comprehensive Security Audit Sweep
 * Identifies potential security issues in API endpoints
 */

const fs = require('fs').promises;
const path = require('path');

const SECURITY_RISKS = {
  // High Risk - Could cause server issues
  HIGH: {
    patterns: [
      // File operations without limits
      { regex: /createWriteStream|readFileSync|writeFileSync|appendFile/i, risk: 'Unbounded file operations' },
      // Database operations without pagination
      { regex: /\.select\(\).*(?!limit|take|first)/i, risk: 'Unbounded database queries' },
      // Recursive operations
      { regex: /async function.*\(.*\).*{[\s\S]*?await.*\1/i, risk: 'Potential infinite recursion' },
      // Process spawning
      { regex: /child_process|exec|spawn|fork/i, risk: 'Process spawning vulnerability' },
      // Memory intensive operations
      { regex: /Buffer\.alloc|new Array\(.*\)|\.repeat\(/i, risk: 'Memory exhaustion risk' },
    ]
  },
  
  // Medium Risk - Could cause performance issues or spam
  MEDIUM: {
    patterns: [
      // Email sending without rate limits
      { regex: /sendEmail|send\(|transport\.sendMail/i, risk: 'Email operations without rate limiting' },
      // External API calls without timeout
      { regex: /fetch\(|axios\.|http\.request/i, risk: 'External API calls without timeout' },
      // Batch operations without limits
      { regex: /Promise\.all\(|\.map\(async|forEach.*async/i, risk: 'Unbounded concurrent operations' },
      // Large JSON parsing
      { regex: /JSON\.parse\((?!.*\.slice|.*\.substring)/i, risk: 'Large JSON parsing without size limits' },
      // Search operations
      { regex: /search|query|filter.*body\./i, risk: 'Search operations without rate limiting' },
    ]
  },
  
  // Specific Endpoint Risks
  ENDPOINT_SPECIFIC: {
    '/api/events/parse-natural': { risk: 'NLP processing without rate limit', severity: 'MEDIUM' },
    '/api/templates': { risk: 'Template creation could be abused for storage', severity: 'MEDIUM' },
    '/api/sharing/token': { risk: 'Token generation without rate limit', severity: 'HIGH' },
    '/api/calendar/oauth': { risk: 'OAuth flow manipulation', severity: 'MEDIUM' },
    '/api/attachments': { risk: 'File upload without strict size limits', severity: 'HIGH' },
    '/api/error-reporting': { risk: 'Could be abused to flood logs', severity: 'MEDIUM' },
    '/api/onboarding': { risk: 'Multiple account setup attempts', severity: 'LOW' },
  }
};

async function analyzeEndpoint(filePath, content) {
  const issues = [];
  const relativePath = path.relative(process.cwd(), filePath);
  
  // Extract API path from file path
  const apiPath = filePath.replace(/\\/g, '/').match(/api\/(.*)\/route\.(ts|js)/)?.[1];
  const fullPath = apiPath ? `/api/${apiPath}` : null;
  
  // Check for high-risk patterns
  for (const pattern of SECURITY_RISKS.HIGH.patterns) {
    if (pattern.regex.test(content)) {
      issues.push({
        severity: 'HIGH',
        type: pattern.risk,
        file: relativePath,
        endpoint: fullPath
      });
    }
  }
  
  // Check for medium-risk patterns
  for (const pattern of SECURITY_RISKS.MEDIUM.patterns) {
    if (pattern.regex.test(content)) {
      // Skip if already has rate limiting
      if (pattern.risk.includes('rate limiting') && content.includes('checkRateLimit')) {
        continue;
      }
      issues.push({
        severity: 'MEDIUM',
        type: pattern.risk,
        file: relativePath,
        endpoint: fullPath
      });
    }
  }
  
  // Check endpoint-specific risks
  if (fullPath && SECURITY_RISKS.ENDPOINT_SPECIFIC[fullPath]) {
    const risk = SECURITY_RISKS.ENDPOINT_SPECIFIC[fullPath];
    // Check if already protected
    const hasRateLimit = content.includes('checkRateLimit');
    const hasAuth = content.includes('requireAuth') || content.includes('requireAuthentication');
    
    if (risk.severity === 'HIGH' && !hasRateLimit) {
      issues.push({
        severity: risk.severity,
        type: risk.risk,
        file: relativePath,
        endpoint: fullPath,
        needsRateLimit: true
      });
    } else if (risk.severity === 'MEDIUM' && !hasRateLimit && !hasAuth) {
      issues.push({
        severity: risk.severity,
        type: risk.risk,
        file: relativePath,
        endpoint: fullPath,
        suggestion: 'Consider rate limiting'
      });
    }
  }
  
  // Check for missing validations
  const hasPostOrPut = /export async function (POST|PUT|PATCH)/.test(content);
  const hasValidation = /z\.object|zod|validate|safeParse/.test(content);
  const hasBodyParsing = /request\.json\(\)|request\.formData\(\)/.test(content);
  
  if (hasPostOrPut && hasBodyParsing && !hasValidation) {
    issues.push({
      severity: 'MEDIUM',
      type: 'Missing input validation',
      file: relativePath,
      endpoint: fullPath
    });
  }
  
  // Check for missing error handling
  const hasTryCatch = /try\s*{[\s\S]*?}\s*catch/i.test(content);
  if (!hasTryCatch && hasPostOrPut) {
    issues.push({
      severity: 'LOW',
      type: 'Missing error handling',
      file: relativePath,
      endpoint: fullPath
    });
  }
  
  return issues;
}

async function performSecuritySweep() {
  console.log('🔍 Comprehensive Security Audit Sweep\n');
  console.log('════════════════════════════════════════\n');
  
  const apiDir = path.join(process.cwd(), 'app', 'api');
  const allIssues = [];
  let fileCount = 0;
  
  async function scanDirectory(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await scanDirectory(fullPath);
      } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
        fileCount++;
        try {
          const content = await fs.readFile(fullPath, 'utf8');
          const issues = await analyzeEndpoint(fullPath, content);
          allIssues.push(...issues);
        } catch (error) {
          console.error(`Error analyzing ${fullPath}: ${error.message}`);
        }
      }
    }
  }
  
  await scanDirectory(apiDir);
  
  // Group issues by severity
  const highRisk = allIssues.filter(i => i.severity === 'HIGH');
  const mediumRisk = allIssues.filter(i => i.severity === 'MEDIUM');
  const lowRisk = allIssues.filter(i => i.severity === 'LOW');
  
  console.log(`Analyzed ${fileCount} API endpoints\n`);
  
  if (highRisk.length > 0) {
    console.log('🚨 HIGH RISK ISSUES (Immediate attention needed):');
    console.log('─────────────────────────────────────────────────');
    highRisk.forEach(issue => {
      console.log(`\n  ❌ ${issue.endpoint || issue.file}`);
      console.log(`     Risk: ${issue.type}`);
      if (issue.needsRateLimit) {
        console.log(`     Action: ADD RATE LIMITING IMMEDIATELY`);
      }
    });
    console.log('');
  }
  
  if (mediumRisk.length > 0) {
    console.log('⚠️  MEDIUM RISK ISSUES (Should be addressed):');
    console.log('───────────────────────────────────────────');
    const grouped = {};
    mediumRisk.forEach(issue => {
      const key = issue.type;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(issue);
    });
    
    Object.entries(grouped).forEach(([type, issues]) => {
      console.log(`\n  ${type}:`);
      issues.slice(0, 5).forEach(issue => {
        console.log(`    • ${issue.endpoint || issue.file}`);
      });
      if (issues.length > 5) {
        console.log(`    ... and ${issues.length - 5} more`);
      }
    });
    console.log('');
  }
  
  if (lowRisk.length > 0) {
    console.log('ℹ️  LOW RISK ISSUES (Optional improvements):');
    console.log('──────────────────────────────────────────');
    console.log(`  Found ${lowRisk.length} minor issues\n`);
  }
  
  // Provide recommendations
  console.log('\n════════════════════════════════════════');
  console.log('📋 RECOMMENDATIONS:');
  console.log('════════════════════════════════════════\n');
  
  const needsRateLimit = allIssues.filter(i => i.needsRateLimit);
  const needsValidation = mediumRisk.filter(i => i.type === 'Missing input validation');
  
  if (needsRateLimit.length > 0) {
    console.log('1️⃣  CRITICAL - Add rate limiting to:');
    needsRateLimit.forEach(issue => {
      console.log(`   • ${issue.endpoint} - ${issue.type}`);
    });
    console.log('');
  }
  
  if (needsValidation.length > 3) {
    console.log('2️⃣  IMPORTANT - Add input validation to:');
    needsValidation.slice(0, 5).forEach(issue => {
      console.log(`   • ${issue.endpoint}`);
    });
    if (needsValidation.length > 5) {
      console.log(`   ... and ${needsValidation.length - 5} more endpoints`);
    }
    console.log('');
  }
  
  // Check specific concerning patterns
  const externalAPIs = mediumRisk.filter(i => i.type.includes('External API'));
  const emailOps = mediumRisk.filter(i => i.type.includes('Email operations'));
  const fileOps = highRisk.filter(i => i.type.includes('file operations'));
  
  if (externalAPIs.length > 0) {
    console.log('3️⃣  External API Calls - Add timeouts and error handling');
  }
  
  if (emailOps.length > 0) {
    console.log('4️⃣  Email Operations - Ensure rate limiting is in place');
  }
  
  if (fileOps.length > 0) {
    console.log('5️⃣  File Operations - Add size limits and validation');
  }
  
  // Summary
  console.log('\n════════════════════════════════════════');
  console.log('SUMMARY:');
  console.log('════════════════════════════════════════\n');
  
  const riskScore = (highRisk.length * 3) + (mediumRisk.length * 2) + lowRisk.length;
  
  if (riskScore === 0) {
    console.log('✅ Excellent! No significant security issues found.');
  } else if (riskScore < 10) {
    console.log('✅ Good! Minor issues found, but overall security is solid.');
  } else if (riskScore < 30) {
    console.log('⚠️  Fair. Some issues need attention for production readiness.');
  } else {
    console.log('🚨 Critical issues found that need immediate attention.');
  }
  
  console.log(`\nRisk Score: ${riskScore}`);
  console.log(`  High Risk: ${highRisk.length}`);
  console.log(`  Medium Risk: ${mediumRisk.length}`);
  console.log(`  Low Risk: ${lowRisk.length}`);
  
  return { highRisk, mediumRisk, lowRisk };
}

// Run the sweep
performSecuritySweep().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
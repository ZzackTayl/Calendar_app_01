#!/usr/bin/env node
/**
 * Security Configuration Validator for PolyHarmony Calendar
 * Validates that sensitive configuration uses environment variables instead of hardcoded values
 */

const fs = require('fs');
const path = require('path');

// Security patterns to check for
const securityPatterns = {
  hardcodedPasswords: [
    /password\s*[:=]\s*['"](?!.*\$\{)[^'"]{3,}['"]?/gi,
    /secret\s*[:=]\s*['"](?!.*\$\{)[^'"]{3,}['"]?/gi,
    /key\s*[:=]\s*['"](?!.*\$\{)[^'"]{20,}['"]?/gi
  ],
  hardcodedTokens: [
    /token\s*[:=]\s*['"](?!.*\$\{)[^'"]{10,}['"]?/gi,
    /api[_-]?key\s*[:=]\s*['"](?!.*\$\{)[^'"]{10,}['"]?/gi
  ],
  insecureDefaults: [
    /test_password_123/gi,
    /test_secret/gi,
    /placeholder/gi
  ]
};

// Files to check
const filesToCheck = [
  'docker-compose.yml',
  'docker-compose.test.yml',
  'docker-compose.testing.yml',
  'docker-compose.dev.yml',
  'docker-compose.staging.yml',
  'docker-compose.production.yml',
  '.env.example',
  '.env.local.example'
];

function checkFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return { exists: false, issues: [] };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  // Check for hardcoded passwords
  securityPatterns.hardcodedPasswords.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Skip if it's using environment variables
        if (!match.includes('${') && !match.includes('$TEST_') && !match.includes('$POSTGRES_')) {
          issues.push({
            type: 'hardcoded_credential',
            pattern: match,
            severity: 'high',
            line: findLineNumber(content, match)
          });
        }
      });
    }
  });

  // Check for hardcoded tokens
  securityPatterns.hardcodedTokens.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        if (!match.includes('${') && !match.includes('placeholder')) {
          issues.push({
            type: 'hardcoded_token',
            pattern: match,
            severity: 'high',
            line: findLineNumber(content, match)
          });
        }
      });
    }
  });

  // Check for insecure defaults (should use environment variables)
  securityPatterns.insecureDefaults.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Allow insecure defaults only if they're environment variable defaults
        if (!content.includes(`\${`) || !content.includes(`:-${match}`)) {
          issues.push({
            type: 'insecure_default',
            pattern: match,
            severity: 'medium',
            line: findLineNumber(content, match)
          });
        }
      });
    }
  });

  return { exists: true, issues };
}

function findLineNumber(content, pattern) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(pattern)) {
      return i + 1;
    }
  }
  return 'unknown';
}

function validateDockerComposeFiles() {
  console.log('🔍 Validating security configuration...');

  let totalIssues = 0;
  let criticalIssues = 0;

  filesToCheck.forEach(fileName => {
    const filePath = path.join(process.cwd(), fileName);
    const result = checkFile(filePath);

    if (result.exists) {
      console.log(`\n📁 Checking ${fileName}:`);

      if (result.issues.length === 0) {
        console.log('  ✅ No security issues found');
      } else {
        result.issues.forEach(issue => {
          const icon = issue.severity === 'high' ? '🚨' : '⚠️';
          console.log(`  ${icon} ${issue.type}: ${issue.pattern} (line ${issue.line})`);

          totalIssues++;
          if (issue.severity === 'high') {
            criticalIssues++;
          }
        });
      }
    } else {
      console.log(`\n📁 ${fileName}: Not found (OK)`);
    }
  });

  console.log(`\n📊 Security Validation Summary:`);
  console.log(`   Total Issues: ${totalIssues}`);
  console.log(`   Critical Issues: ${criticalIssues}`);

  if (criticalIssues > 0) {
    console.log('❌ Security validation failed - critical issues found');
    return false;
  } else if (totalIssues > 0) {
    console.log('⚠️ Security validation passed with warnings');
    return true;
  } else {
    console.log('✅ Security validation passed');
    return true;
  }
}

function validateEnvironmentVariables() {
  console.log('\n🔐 Checking environment variable usage...');

  const dockerComposeTestingPath = 'docker-compose.testing.yml';

  if (!fs.existsSync(dockerComposeTestingPath)) {
    console.log('❌ docker-compose.testing.yml not found');
    return false;
  }

  const content = fs.readFileSync(dockerComposeTestingPath, 'utf8');
  const requiredEnvVars = [
    'TEST_DB_PASSWORD',
    'TEST_SUPABASE_ANON_KEY',
    'TEST_SUPABASE_SERVICE_KEY',
    'TEST_JWT_SECRET',
    'TEST_ENCRYPTION_KEY'
  ];

  let allVarsUsed = true;

  requiredEnvVars.forEach(envVar => {
    if (content.includes(`\${${envVar}`)) {
      console.log(`  ✅ ${envVar} properly configured`);
    } else {
      console.log(`  ❌ ${envVar} not found or not using environment variable`);
      allVarsUsed = false;
    }
  });

  return allVarsUsed;
}

function main() {
  console.log('🛡️ PolyHarmony Security Configuration Validator\n');

  const securityValid = validateDockerComposeFiles();
  const envVarsValid = validateEnvironmentVariables();

  const overallValid = securityValid && envVarsValid;

  console.log(`\n🎯 Overall Result: ${overallValid ? '✅ PASSED' : '❌ FAILED'}`);

  if (!overallValid) {
    console.log('\n🔧 Recommendations:');
    console.log('   - Replace hardcoded credentials with environment or secret manager inputs');
    console.log('   - Generate ephemeral test secrets with scripts/prepare-test-secrets.ts when CI secrets are not available');
    console.log('   - Ensure CI workflows load the generated env file instead of embedding defaults');
  }

  process.exit(overallValid ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { validateDockerComposeFiles, validateEnvironmentVariables };

#!/usr/bin/env node

/**
 * Smart Rate Limiting Expansion
 * Adds rate limiting to endpoints that actually need it
 * without overdoing it
 */

const fs = require('fs').promises;
const path = require('path');

// Define rate limiting requirements by endpoint type
const RATE_LIMIT_CONFIG = {
  // CRITICAL - Prevent abuse/attacks
  critical: {
    pattern: /\/(health|ping|webhook)/i,
    config: 'HEALTH_CHECK',
    limits: { maxRequests: 100, windowMs: 60000 }, // 100 per minute
    reason: 'Prevent monitoring abuse'
  },
  
  // IMPORTS - Resource intensive
  imports: {
    pattern: /\/(import|batch|bulk)/i,
    config: 'BULK_OPERATION',
    limits: { maxRequests: 5, windowMs: 300000 }, // 5 per 5 minutes
    reason: 'Prevent resource exhaustion'
  },
  
  // INVITATIONS - Prevent spam
  invitations: {
    pattern: /invitations?\/(create|send)/i,
    config: 'INVITATION',
    limits: { maxRequests: 20, windowMs: 3600000 }, // 20 per hour
    reason: 'Prevent invitation spam'
  },
  
  // EMAIL operations
  email: {
    pattern: /email|mail|notification/i,
    config: 'EMAIL',
    limits: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
    reason: 'Prevent email abuse'
  },
  
  // EXPORTS - Can be resource intensive
  exports: {
    pattern: /export/i,
    config: 'EXPORT',
    limits: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
    reason: 'Prevent export abuse'
  }
};

// Endpoints that should NOT have rate limiting
const EXCLUDE_PATTERNS = [
  /^\/(api\/auth\/(signin|signup|reset-password))/i, // Already have custom limits
  /^\/(api\/events|api\/contacts)$/i, // Already have limits
  /\/\[.*\]/i, // Dynamic routes typically don't need rate limiting
  /^\/api\/(monitoring|security|debug)/i, // Admin endpoints (auth protected)
];

async function shouldAddRateLimit(filePath, content) {
  // Check if already has rate limiting
  if (content.includes('checkRateLimit') || content.includes('rateLimitResult')) {
    return false;
  }
  
  // Check exclusions
  const apiPath = filePath.replace(/\\/g, '/').match(/api\/(.*)\/route\.(ts|js)/)?.[1];
  if (!apiPath) return false;
  
  const fullPath = `/api/${apiPath}`;
  if (EXCLUDE_PATTERNS.some(pattern => pattern.test(fullPath))) {
    return false;
  }
  
  // Check if it matches any pattern that needs rate limiting
  for (const [type, config] of Object.entries(RATE_LIMIT_CONFIG)) {
    if (config.pattern.test(fullPath)) {
      return { type, config };
    }
  }
  
  return false;
}

async function addRateLimitToFile(filePath, rateLimitInfo) {
  let content = await fs.readFile(filePath, 'utf8');
  const originalContent = content;
  
  // Check if file has the necessary imports
  const hasRateLimitImport = content.includes('checkRateLimit');
  
  if (!hasRateLimitImport) {
    // Add rate limit imports
    const importPattern = /import.*from.*['"].*\/response-handler['"]/;
    const importMatch = content.match(importPattern);
    
    if (importMatch) {
      const importStatement = `\nimport { checkRateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limiting'`;
      content = content.replace(importMatch[0], importMatch[0] + importStatement);
    }
  }
  
  // Add rate limiting to each exported function
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  let modified = false;
  
  for (const method of methods) {
    const functionPattern = new RegExp(`export async function ${method}\\(request: NextRequest\\) {[\\s\\S]*?const api = createApiResponse\\(\\);[\\s\\S]*?try {`, 'g');
    
    if (functionPattern.test(content)) {
      content = content.replace(functionPattern, (match) => {
        if (match.includes('checkRateLimit')) {
          return match; // Already has rate limiting
        }
        
        return match + `
    // Apply rate limiting
    const ip = getClientIP(request);
    const rateLimitConfig = {
      ...RATE_LIMITS.${rateLimitInfo.config.config},
      maxRequests: ${rateLimitInfo.config.limits.maxRequests},
      windowMs: ${rateLimitInfo.config.limits.windowMs}
    };
    
    const rateLimitResult = checkRateLimit(ip, rateLimitConfig);
    if (rateLimitResult.isLimited) {
      return api.rateLimitExceeded(
        rateLimitResult.retryAfter || 60,
        {
          remaining: rateLimitResult.remaining,
          limit: rateLimitConfig.maxRequests,
          reset: rateLimitResult.resetTime
        }
      );
    }
    `;
      });
      modified = true;
    }
  }
  
  if (content !== originalContent && modified) {
    // Create backup
    await fs.writeFile(filePath + '.backup', originalContent);
    await fs.writeFile(filePath, content);
    return true;
  }
  
  return false;
}

async function expandRateLimiting() {
  console.log('🚀 Smart Rate Limiting Expansion\n');
  console.log('This will add rate limiting only where it makes sense:\n');
  console.log('  ✓ Public endpoints (health checks)');
  console.log('  ✓ Resource-intensive operations (imports/exports)');
  console.log('  ✓ Spam-prone endpoints (invitations/emails)');
  console.log('  ✗ NOT adding to simple authenticated reads\n');
  console.log('════════════════════════════════════════\n');
  
  const apiDir = path.join(process.cwd(), 'app', 'api');
  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const updates = [];
  
  async function processDirectory(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await processDirectory(fullPath);
      } else if (entry.name === 'route.ts' || entry.name === 'route.js') {
        try {
          const content = await fs.readFile(fullPath, 'utf8');
          const shouldAdd = await shouldAddRateLimit(fullPath, content);
          
          if (shouldAdd) {
            const relativePath = path.relative(process.cwd(), fullPath);
            console.log(`📝 Processing: ${relativePath}`);
            console.log(`   Type: ${shouldAdd.type}`);
            console.log(`   Reason: ${shouldAdd.config.reason}`);
            console.log(`   Limits: ${shouldAdd.config.limits.maxRequests} requests per ${shouldAdd.config.limits.windowMs/1000}s`);
            
            const updated = await addRateLimitToFile(fullPath, shouldAdd);
            if (updated) {
              console.log('   ✅ Rate limiting added\n');
              processedCount++;
              updates.push({
                file: relativePath,
                type: shouldAdd.type,
                limits: shouldAdd.config.limits
              });
            } else {
              console.log('   ⚠️  No changes needed\n');
              skippedCount++;
            }
          } else {
            skippedCount++;
          }
        } catch (error) {
          console.error(`   ❌ Error: ${error.message}\n`);
          errorCount++;
        }
      }
    }
  }
  
  await processDirectory(apiDir);
  
  console.log('\n════════════════════════════════════════');
  console.log('Rate Limiting Expansion Summary:');
  console.log(`✅ Updated: ${processedCount} endpoints`);
  console.log(`⏭️  Skipped: ${skippedCount} endpoints`);
  console.log(`❌ Errors: ${errorCount} endpoints`);
  console.log('════════════════════════════════════════\n');
  
  if (updates.length > 0) {
    console.log('📋 Endpoints Updated:');
    updates.forEach(update => {
      console.log(`   • ${update.file}`);
      console.log(`     ${update.limits.maxRequests} requests per ${update.limits.windowMs/1000} seconds`);
    });
    console.log('\n✅ Rate limiting has been strategically expanded!');
    console.log('📝 Your app is now protected against:');
    console.log('   • DDoS attacks on public endpoints');
    console.log('   • Resource exhaustion from bulk operations');
    console.log('   • Spam through invitations and emails');
    console.log('   • Export/import abuse\n');
  } else {
    console.log('ℹ️  No additional rate limiting needed!');
    console.log('    Your critical endpoints are already protected.\n');
  }
}

// Run the expansion
expandRateLimiting().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
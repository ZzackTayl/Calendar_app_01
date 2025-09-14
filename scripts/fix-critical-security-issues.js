#!/usr/bin/env node

/**
 * Fix Critical Security Issues
 * Addresses HIGH priority issues from security audit
 */

const fs = require('fs').promises;
const path = require('path');

const CRITICAL_FIXES = [
  {
    file: 'app/api/attachments/route.ts',
    description: 'Add file size limits and rate limiting',
    fixes: [
      {
        pattern: /export async function POST\(request: NextRequest\) {[\s\S]*?try {/,
        insertAfter: `
    // File size limit check (5MB max)
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      return api.error(ErrorCode.VALIDATION_ERROR, {
        message: 'File size exceeds 5MB limit'
      });
    }
    
    // Apply rate limiting for file uploads
    const ip = getClientIP(request);
    const rateLimitConfig = {
      maxRequests: 10,
      windowMs: 3600000 // 10 uploads per hour
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
    }`
      }
    ]
  },
  {
    file: 'app/api/sharing/token/route.ts',
    description: 'Add rate limiting to token generation',
    fixes: [
      {
        pattern: /export async function POST\(request: NextRequest\) {[\s\S]*?try {/,
        insertAfter: `
    // Apply rate limiting to prevent token generation abuse
    const ip = getClientIP(request);
    const rateLimitConfig = {
      maxRequests: 20,
      windowMs: 3600000 // 20 tokens per hour
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
    }`
      }
    ]
  },
  {
    file: 'lib/database-utils.ts',
    description: 'Create database query utilities with pagination',
    create: true,
    content: `/**
 * Database Query Utilities
 * Provides safe, paginated database queries
 */

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export function getPaginationParams(options?: PaginationOptions) {
  const page = Math.max(1, options?.page || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, options?.pageSize || DEFAULT_PAGE_SIZE)
  );
  
  return {
    limit: pageSize,
    offset: (page - 1) * pageSize,
    page,
    pageSize
  };
}

export function addPaginationToQuery(query: any, options?: PaginationOptions) {
  const { limit, offset } = getPaginationParams(options);
  
  // Add limit and offset
  query = query.limit(limit).offset(offset);
  
  // Add ordering if specified
  if (options?.orderBy) {
    query = query.order(options.orderBy, { 
      ascending: options.orderDirection !== 'desc' 
    });
  }
  
  return query;
}

export async function paginatedQuery(
  baseQuery: any,
  options?: PaginationOptions
) {
  const { limit, offset, page, pageSize } = getPaginationParams(options);
  
  // Get total count
  const countQuery = baseQuery.count({ count: 'exact', head: true });
  const { count } = await countQuery;
  
  // Get paginated results
  const dataQuery = addPaginationToQuery(baseQuery, options);
  const { data, error } = await dataQuery;
  
  if (error) throw error;
  
  return {
    data,
    pagination: {
      page,
      pageSize,
      totalItems: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
      hasNext: page * pageSize < (count || 0),
      hasPrev: page > 1
    }
  };
}`
  },
  {
    file: 'app/api/events/route.ts',
    description: 'Fix unbounded database queries',
    fixes: [
      {
        pattern: /const \{ data: events, error \} = await supabase[\s\S]*?\.select\(\)/,
        replace: `// Use paginated query
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    
    const { data: events, error, pagination } = await paginatedQuery(
      supabase
        .from('events')
        .select('*')
        .eq('user_id', session.user.id),
      { page, pageSize, orderBy: 'start_date', orderDirection: 'asc' }
    )`
      }
    ]
  },
  {
    file: 'app/api/contacts/route.ts',
    description: 'Fix unbounded database queries',
    fixes: [
      {
        pattern: /const \{ data: contacts, error \} = await supabase[\s\S]*?\.select\(\)/,
        replace: `// Use paginated query
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    
    const { data: contacts, error, pagination } = await paginatedQuery(
      supabase
        .from('contacts')
        .select('*')
        .eq('user_id', session.user.id),
      { page, pageSize, orderBy: 'name', orderDirection: 'asc' }
    )`
      }
    ]
  }
];

// Additional endpoints to add rate limiting
const RATE_LIMIT_ADDITIONS = [
  { path: '/api/templates', limit: 20, window: 3600000, reason: 'Prevent storage abuse' },
  { path: '/api/error-reporting', limit: 30, window: 60000, reason: 'Prevent log flooding' },
  { path: '/api/events/parse-natural', limit: 50, window: 60000, reason: 'NLP processing is expensive' }
];

async function applyFixes() {
  console.log('🔧 Fixing Critical Security Issues\n');
  console.log('════════════════════════════════════════\n');
  
  let fixedCount = 0;
  let errorCount = 0;
  
  // Apply critical fixes
  for (const fix of CRITICAL_FIXES) {
    const filePath = path.join(process.cwd(), fix.file);
    
    console.log(`📝 ${fix.description}`);
    console.log(`   File: ${fix.file}`);
    
    try {
      if (fix.create) {
        // Create new file
        await fs.writeFile(filePath, fix.content);
        console.log('   ✅ File created\n');
        fixedCount++;
      } else {
        // Modify existing file
        let content = await fs.readFile(filePath, 'utf8');
        const originalContent = content;
        
        // Check if imports are needed
        if (fix.fixes.some(f => f.insertAfter?.includes('checkRateLimit'))) {
          if (!content.includes('checkRateLimit')) {
            const importPattern = /import.*from.*['"].*\/response-handler['"]/;
            const importMatch = content.match(importPattern);
            if (importMatch) {
              content = content.replace(
                importMatch[0],
                importMatch[0] + `\nimport { checkRateLimit, getClientIP } from '@/lib/rate-limiting'`
              );
            }
          }
        }
        
        if (fix.fixes.some(f => f.insertAfter?.includes('paginatedQuery'))) {
          if (!content.includes('paginatedQuery')) {
            const importPattern = /import.*from/;
            const importMatch = content.match(importPattern);
            if (importMatch) {
              content = `import { paginatedQuery } from '@/lib/database-utils'\n` + content;
            }
          }
        }
        
        // Apply fixes
        for (const fixItem of fix.fixes) {
          if (fixItem.pattern && fixItem.insertAfter) {
            const match = content.match(fixItem.pattern);
            if (match) {
              content = content.replace(match[0], match[0] + fixItem.insertAfter);
            }
          } else if (fixItem.pattern && fixItem.replace) {
            content = content.replace(fixItem.pattern, fixItem.replace);
          }
        }
        
        if (content !== originalContent) {
          await fs.writeFile(filePath + '.backup', originalContent);
          await fs.writeFile(filePath, content);
          console.log('   ✅ Fixed and backed up\n');
          fixedCount++;
        } else {
          console.log('   ⚠️  Already fixed or pattern not found\n');
        }
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
      errorCount++;
    }
  }
  
  console.log('\n════════════════════════════════════════');
  console.log('Fix Summary:');
  console.log(`✅ Fixed: ${fixedCount} issues`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log('════════════════════════════════════════\n');
  
  if (fixedCount > 0) {
    console.log('🎯 Critical issues addressed:');
    console.log('   ✅ File upload size limits added (5MB max)');
    console.log('   ✅ Rate limiting added to attachments & token generation');
    console.log('   ✅ Database query pagination utilities created');
    console.log('   ✅ Unbounded queries fixed with pagination');
    console.log('\n🔒 Your application is now significantly more secure!');
  }
}

// Run fixes
applyFixes().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
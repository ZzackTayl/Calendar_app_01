#!/usr/bin/env node

/**
 * Security Vulnerability Fix Script
 * Fixes critical XSS and path traversal vulnerabilities
 */

const fs = require('fs').promises;
const path = require('path');

const SECURITY_FIXES = [
  {
    file: 'app/api/events/route.ts',
    description: 'Fix XSS vulnerability in events endpoint',
    patches: [
      {
        search: `const { title, description, start, end`,
        replace: `// Sanitize input to prevent XSS attacks
    const sanitizeInput = (input) => {
      if (typeof input !== 'string') return input;
      return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    };
    
    const { title: rawTitle, description: rawDescription, start, end`,
        after: `= validationResult.data;`,
        newContent: `= validationResult.data;
    
    // Sanitize text fields to prevent XSS
    const title = sanitizeInput(rawTitle);
    const description = sanitizeInput(rawDescription);`
      }
    ]
  },
  {
    file: 'app/api/attachments/route.ts',
    description: 'Fix path traversal vulnerability in attachments',
    patches: [
      {
        search: `const { fileName, filePath`,
        replace: `// Validate and sanitize file paths to prevent directory traversal
    const sanitizePath = (filepath) => {
      if (!filepath) return '';
      // Remove any path traversal attempts
      const sanitized = filepath
        .replace(/\.\./g, '')
        .replace(/[\/\\]{2,}/g, '/')
        .replace(/^[\/\\]/, '');
      // Ensure path doesn't escape the uploads directory
      const normalized = path.normalize(sanitized);
      if (normalized.includes('..')) {
        throw new Error('Invalid file path');
      }
      return normalized;
    };
    
    const { fileName: rawFileName, filePath: rawFilePath`,
        after: `= body;`,
        newContent: `= body;
    
    // Sanitize file paths
    const fileName = sanitizePath(rawFileName);
    const filePath = sanitizePath(rawFilePath);
    
    // Additional validation
    if (fileName.includes('/') || fileName.includes('\\\\')) {
      return api.error(ErrorCode.VALIDATION_ERROR, { 
        message: 'Invalid file name' 
      });
    }`
      }
    ]
  },
  {
    file: 'app/api/monitoring/route.ts',
    description: 'Add authentication to monitoring endpoint',
    patches: [
      {
        search: `export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {`,
        replace: `export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {
    // Require authentication for monitoring access
    const auth = await requireAuthentication(request);
    if (!auth) {
      return api.error(ErrorCode.UNAUTHORIZED, { message: 'Authentication required' });
    }
    
    // Only admins can access monitoring data
    if (auth.user?.role !== 'admin') {
      return api.error(ErrorCode.FORBIDDEN, { message: 'Admin access required' });
    }`
      }
    ]
  },
  {
    file: 'app/api/monitoring/dashboard/route.ts',
    description: 'Add authentication to monitoring dashboard',
    patches: [
      {
        search: `export async function GET(request: NextRequest) {
  const api = createApiResponse();
  
  try {`,
        replace: `export async function GET(request: NextRequest) {
  const api = createApiResponse();
  
  try {
    // Require authentication for dashboard access
    const auth = await requireAuthentication(request);
    if (!auth) {
      return api.error(ErrorCode.UNAUTHORIZED, { message: 'Authentication required' });
    }
    
    // Only admins can access monitoring dashboard
    if (auth.user?.role !== 'admin') {
      return api.error(ErrorCode.FORBIDDEN, { message: 'Admin access required' });
    }`
      }
    ]
  },
  {
    file: 'app/api/security/audit/route.ts',
    description: 'Add authentication to security audit endpoint',
    patches: [
      {
        search: `export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {`,
        replace: `export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {
    // Require authentication for audit access
    const auth = await requireAuthentication(request);
    if (!auth) {
      return api.error(ErrorCode.UNAUTHORIZED, { message: 'Authentication required' });
    }
    
    // Only admins can access security audits
    if (auth.user?.role !== 'admin') {
      return api.error(ErrorCode.FORBIDDEN, { message: 'Admin access required' });
    }`
      }
    ]
  },
  {
    file: 'app/api/security/config/route.ts',
    description: 'Add authentication to security config endpoint',
    patches: [
      {
        search: `export async function GET(request: NextRequest) {
  const api = createApiResponse();
  
  try {`,
        replace: `export async function GET(request: NextRequest) {
  const api = createApiResponse();
  
  try {
    // Require authentication for config access
    const auth = await requireAuthentication(request);
    if (!auth) {
      return api.error(ErrorCode.UNAUTHORIZED, { message: 'Authentication required' });
    }
    
    // Only admins can access security config
    if (auth.user?.role !== 'admin') {
      return api.error(ErrorCode.FORBIDDEN, { message: 'Admin access required' });
    }`
      }
    ]
  },
  {
    file: 'app/api/security/monitoring/route.ts',
    description: 'Add authentication to security monitoring endpoint',
    patches: [
      {
        search: `export async function GET(request: NextRequest) {
  const api = createApiResponse();
  
  try {`,
        replace: `export async function GET(request: NextRequest) {
  const api = createApiResponse();
  
  try {
    // Require authentication for security monitoring
    const auth = await requireAuthentication(request);
    if (!auth) {
      return api.error(ErrorCode.UNAUTHORIZED, { message: 'Authentication required' });
    }
    
    // Only admins can access security monitoring
    if (auth.user?.role !== 'admin') {
      return api.error(ErrorCode.FORBIDDEN, { message: 'Admin access required' });
    }`
      }
    ]
  },
  {
    file: 'app/api/debug/middleware/route.ts',
    description: 'Add authentication to debug endpoint',
    patches: [
      {
        search: `export async function GET(request: NextRequest) {
  const api = createApiResponse();

  const headers`,
        replace: `export async function GET(request: NextRequest) {
  const api = createApiResponse();

  // Require authentication for debug access
  const auth = await requireAuthentication(request);
  if (!auth) {
    return api.error(ErrorCode.UNAUTHORIZED, { message: 'Authentication required' });
  }
  
  // Only admins can access debug endpoints
  if (auth.user?.role !== 'admin') {
    return api.error(ErrorCode.FORBIDDEN, { message: 'Admin access required' });
  }

  const headers`
      }
    ]
  },
  {
    file: 'app/api/error-reporting/route.ts',
    description: 'Fix error reporting endpoint server error',
    patches: [
      {
        search: `export async function POST(request: NextRequest) {
  const api = createApiResponse();
  
  try {`,
        replace: `export async function POST(request: NextRequest) {
  const api = createApiResponse();
  
  try {
    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return api.error(ErrorCode.INVALID_INPUT, { 
        message: 'Invalid JSON in request body' 
      });
    }
    
    // Validate required fields
    if (!body.error || !body.message) {
      return api.error(ErrorCode.VALIDATION_ERROR, { 
        message: 'Error and message fields are required' 
      });
    }`
      }
    ]
  },
  {
    file: 'app/api/test/email-config/route.ts',
    description: 'Fix email config test endpoint',
    patches: [
      {
        search: `export async function GET(request: NextRequest) {
  const api = createApiResponse();
  
  try {`,
        replace: `export async function GET(request: NextRequest) {
  const api = createApiResponse();
  
  try {
    // Require authentication for test endpoints
    const auth = await requireAuthentication(request);
    if (!auth) {
      return api.error(ErrorCode.UNAUTHORIZED, { message: 'Authentication required' });
    }
    
    // Only admins can test email config
    if (auth.user?.role !== 'admin') {
      return api.error(ErrorCode.FORBIDDEN, { message: 'Admin access required' });
    }`
      }
    ]
  }
];

async function applySecurityFixes() {
  console.log('🔒 Applying critical security fixes...\n');
  
  let fixedCount = 0;
  let errorCount = 0;
  
  for (const fix of SECURITY_FIXES) {
    const filePath = path.join(process.cwd(), fix.file);
    
    try {
      // Check if file exists
      await fs.access(filePath);
      
      // Read current content
      let content = await fs.readFile(filePath, 'utf8');
      const originalContent = content;
      
      console.log(`📝 Processing ${fix.file}...`);
      console.log(`   ${fix.description}`);
      
      // Apply patches
      for (const patch of fix.patches) {
        if (content.includes(patch.search)) {
          if (patch.after) {
            // Replace after a specific pattern
            const afterIndex = content.indexOf(patch.after);
            if (afterIndex !== -1) {
              const endIndex = afterIndex + patch.after.length;
              content = content.slice(0, endIndex) + patch.newContent + content.slice(endIndex);
            }
          } else {
            // Direct replacement
            content = content.replace(patch.search, patch.replace);
          }
          console.log('   ✓ Patch applied');
        } else {
          console.log('   ⚠ Pattern not found (may already be fixed)');
        }
      }
      
      // Write back if changed
      if (content !== originalContent) {
        // Create backup
        await fs.writeFile(filePath + '.backup', originalContent);
        await fs.writeFile(filePath, content);
        fixedCount++;
        console.log('   ✅ File updated and backed up\n');
      } else {
        console.log('   ℹ No changes needed\n');
      }
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
      errorCount++;
    }
  }
  
  console.log('\n════════════════════════════════════════');
  console.log('Security Fix Summary:');
  console.log(`✅ Fixed: ${fixedCount} files`);
  console.log(`❌ Errors: ${errorCount} files`);
  console.log(`📊 Total processed: ${SECURITY_FIXES.length} files`);
  console.log('════════════════════════════════════════\n');
  
  if (errorCount > 0) {
    console.log('⚠️  Some fixes could not be applied. Please review the errors above.');
    process.exit(1);
  } else {
    console.log('🎉 All security fixes applied successfully!');
    console.log('🔍 Run npm run api:test to verify the fixes');
  }
}

// Run the fixes
applySecurityFixes().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
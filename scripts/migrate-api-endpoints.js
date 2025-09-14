/**
 * API Endpoint Migration Script
 * Updates all API endpoints to use the standardized response handler
 * and adds missing security checks
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

class APIEndpointMigrator {
  constructor() {
    this.apiDir = path.join(process.cwd(), 'app', 'api');
    this.updatedFiles = [];
    this.failedFiles = [];
    this.backupDir = path.join(process.cwd(), 'api-backup', new Date().toISOString().replace(/[:.]/g, '-'));
  }

  // Create backup directory
  createBackup() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`${colors.green}✓ Created backup directory: ${this.backupDir}${colors.reset}`);
    }
  }

  // Backup a file before modifying
  backupFile(filePath) {
    const relativePath = path.relative(process.cwd(), filePath);
    const backupPath = path.join(this.backupDir, relativePath);
    const backupDir = path.dirname(backupPath);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    fs.copyFileSync(filePath, backupPath);
  }

  // Update imports in a file
  updateImports(content) {
    let modified = false;
    let updatedContent = content;

    // Check if already has response handler
    if (content.includes('@/lib/api/response-handler')) {
      console.log(`  ${colors.yellow}⚠ Already has response handler import${colors.reset}`);
      return { content: updatedContent, modified: false };
    }

    // Add response handler import if NextResponse is imported
    if (content.includes('NextResponse') && !content.includes('response-handler')) {
      // Remove NextResponse from import if it's the only thing
      updatedContent = updatedContent.replace(
        /import\s*{\s*NextRequest\s*,\s*NextResponse\s*}\s*from\s*'next\/server'/g,
        "import { NextRequest } from 'next/server'"
      );
      
      // Add response handler import after next imports
      const nextImportMatch = updatedContent.match(/import.*from\s*['"]next\/server['"]/);
      if (nextImportMatch) {
        const insertPos = nextImportMatch.index + nextImportMatch[0].length;
        updatedContent = 
          updatedContent.slice(0, insertPos) + 
          "\nimport { createApiResponse, ErrorCode } from '@/lib/api/response-handler'" +
          updatedContent.slice(insertPos);
        modified = true;
      }
    }

    // Add authentication import if missing and needed
    if (!content.includes('requireAuthentication') && 
        !content.includes('/auth/signin') && 
        !content.includes('/auth/signup') &&
        !content.includes('/health/ping')) {
      const responseHandlerImport = updatedContent.indexOf('@/lib/api/response-handler');
      if (responseHandlerImport > -1) {
        const endOfLine = updatedContent.indexOf('\n', responseHandlerImport);
        updatedContent = 
          updatedContent.slice(0, endOfLine) + 
          "\nimport { requireAuthentication } from '@/lib/auth/session-manager'" +
          updatedContent.slice(endOfLine);
        modified = true;
      }
    }

    // Add CSRF import for POST/PUT/PATCH/DELETE methods
    if ((content.includes('export async function POST') || 
         content.includes('export async function PUT') ||
         content.includes('export async function PATCH') ||
         content.includes('export async function DELETE')) &&
        !content.includes('validateCSRFProtection')) {
      const authImport = updatedContent.indexOf('@/lib/auth/session-manager');
      if (authImport > -1) {
        const endOfLine = updatedContent.indexOf('\n', authImport);
        updatedContent = 
          updatedContent.slice(0, endOfLine) + 
          "\nimport { validateCSRFProtection } from '@/lib/security/csrf'" +
          updatedContent.slice(endOfLine);
        modified = true;
      }
    }

    return { content: updatedContent, modified };
  }

  // Update function to use response handler
  updateFunction(content, method) {
    let modified = false;
    let updatedContent = content;

    // Create regex to find the function
    const functionRegex = new RegExp(
      `export\\s+async\\s+function\\s+${method}\\s*\\([^)]*\\)\\s*{([\\s\\S]*?)^}`,
      'gm'
    );

    const match = functionRegex.exec(content);
    if (!match) {
      return { content: updatedContent, modified: false };
    }

    const functionBody = match[1];
    
    // Check if already using response handler
    if (functionBody.includes('createApiResponse')) {
      console.log(`    ${colors.yellow}⚠ ${method} already uses response handler${colors.reset}`);
      return { content: updatedContent, modified: false };
    }

    // Add api response handler initialization
    const functionStart = match.index + match[0].indexOf('{') + 1;
    const apiInit = '\n  const api = createApiResponse();\n';
    
    // Simple replacement of NextResponse.json with api methods
    let newFunctionBody = functionBody;
    
    // Replace error responses
    newFunctionBody = newFunctionBody.replace(
      /return\s+NextResponse\.json\s*\(\s*{\s*error:\s*['"`]([^'"`]+)['"`][^}]*}\s*,\s*{\s*status:\s*401[^}]*}\s*\)/g,
      'return api.error(ErrorCode.UNAUTHORIZED)'
    );
    
    newFunctionBody = newFunctionBody.replace(
      /return\s+NextResponse\.json\s*\(\s*{\s*error:\s*['"`]([^'"`]+)['"`][^}]*}\s*,\s*{\s*status:\s*403[^}]*}\s*\)/g,
      'return api.error(ErrorCode.FORBIDDEN)'
    );
    
    newFunctionBody = newFunctionBody.replace(
      /return\s+NextResponse\.json\s*\(\s*{\s*error:\s*['"`]([^'"`]+)['"`][^}]*}\s*,\s*{\s*status:\s*404[^}]*}\s*\)/g,
      'return api.error(ErrorCode.NOT_FOUND)'
    );
    
    newFunctionBody = newFunctionBody.replace(
      /return\s+NextResponse\.json\s*\(\s*{\s*error:\s*['"`]([^'"`]+)['"`][^}]*}\s*,\s*{\s*status:\s*400[^}]*}\s*\)/g,
      'return api.error(ErrorCode.VALIDATION_ERROR)'
    );
    
    newFunctionBody = newFunctionBody.replace(
      /return\s+NextResponse\.json\s*\(\s*{\s*error:\s*['"`]([^'"`]+)['"`][^}]*}\s*,\s*{\s*status:\s*500[^}]*}\s*\)/g,
      'return api.error(ErrorCode.INTERNAL_ERROR)'
    );

    // Replace success responses
    newFunctionBody = newFunctionBody.replace(
      /return\s+NextResponse\.json\s*\(\s*({[^}]+})\s*\)/g,
      'return api.success($1)'
    );

    if (newFunctionBody !== functionBody) {
      // Reconstruct the function
      const newFunction = `export async function ${method}(request: NextRequest) {${apiInit}${newFunctionBody}}`;
      updatedContent = content.substring(0, match.index) + newFunction + content.substring(match.index + match[0].length);
      modified = true;
    }

    return { content: updatedContent, modified };
  }

  // Process a single file
  async processFile(filePath) {
    console.log(`\n${colors.cyan}Processing: ${path.relative(process.cwd(), filePath)}${colors.reset}`);
    
    try {
      // Read file content
      let content = fs.readFileSync(filePath, 'utf-8');
      let modified = false;

      // Skip if already fully migrated
      if (content.includes('createApiResponse') && 
          content.includes('ErrorCode') &&
          !content.includes('NextResponse.json')) {
        console.log(`  ${colors.green}✓ Already fully migrated${colors.reset}`);
        return;
      }

      // Backup the file first
      this.backupFile(filePath);

      // Update imports
      const importResult = this.updateImports(content);
      if (importResult.modified) {
        content = importResult.content;
        modified = true;
        console.log(`  ${colors.green}✓ Updated imports${colors.reset}`);
      }

      // Update each HTTP method
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
      for (const method of methods) {
        if (content.includes(`export async function ${method}`)) {
          const methodResult = this.updateFunction(content, method);
          if (methodResult.modified) {
            content = methodResult.content;
            modified = true;
            console.log(`  ${colors.green}✓ Updated ${method} method${colors.reset}`);
          }
        }
      }

      // Save the file if modified
      if (modified) {
        fs.writeFileSync(filePath, content);
        this.updatedFiles.push(filePath);
        console.log(`  ${colors.green}✓ File updated successfully${colors.reset}`);
      } else {
        console.log(`  ${colors.yellow}⚠ No changes needed${colors.reset}`);
      }

    } catch (error) {
      console.error(`  ${colors.red}✗ Error: ${error.message}${colors.reset}`);
      this.failedFiles.push({ file: filePath, error: error.message });
    }
  }

  // Find all route files
  findRouteFiles(dir, files = []) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        this.findRouteFiles(fullPath, files);
      } else if (item.isFile() && /route\.(ts|tsx|js|jsx)$/.test(item.name)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  // Main migration process
  async migrate(options = {}) {
    console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}       API ENDPOINT MIGRATION${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);

    // Create backup
    this.createBackup();

    // Find all route files
    const routeFiles = this.findRouteFiles(this.apiDir);
    console.log(`${colors.cyan}Found ${routeFiles.length} route files to process${colors.reset}`);

    // Process files based on options
    let filesToProcess = routeFiles;
    
    if (options.priority) {
      // Process priority endpoints first
      const priorityPaths = [
        'auth/signin', 'auth/signup', 'auth/signout',
        'security/health', 'security/monitoring', 'security/audit',
        'monitoring/dashboard', 'monitoring/email'
      ];
      
      filesToProcess = routeFiles.sort((a, b) => {
        const aPriority = priorityPaths.some(p => a.includes(p));
        const bPriority = priorityPaths.some(p => b.includes(p));
        if (aPriority && !bPriority) return -1;
        if (!aPriority && bPriority) return 1;
        return 0;
      });
    }

    if (options.limit) {
      filesToProcess = filesToProcess.slice(0, options.limit);
    }

    // Process each file
    for (const file of filesToProcess) {
      await this.processFile(file);
    }

    // Print summary
    this.printSummary();
  }

  // Print migration summary
  printSummary() {
    console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}       MIGRATION SUMMARY${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);

    console.log(`${colors.bright}📊 Results:${colors.reset}`);
    console.log(`  • Updated: ${colors.green}${this.updatedFiles.length}${colors.reset}`);
    console.log(`  • Failed: ${colors.red}${this.failedFiles.length}${colors.reset}`);
    console.log(`  • Backup: ${colors.blue}${this.backupDir}${colors.reset}`);

    if (this.updatedFiles.length > 0) {
      console.log(`\n${colors.bright}${colors.green}✓ Updated Files:${colors.reset}`);
      this.updatedFiles.slice(0, 10).forEach(file => {
        console.log(`  • ${path.relative(process.cwd(), file)}`);
      });
      if (this.updatedFiles.length > 10) {
        console.log(`  ... and ${this.updatedFiles.length - 10} more`);
      }
    }

    if (this.failedFiles.length > 0) {
      console.log(`\n${colors.bright}${colors.red}✗ Failed Files:${colors.reset}`);
      this.failedFiles.forEach(({ file, error }) => {
        console.log(`  • ${path.relative(process.cwd(), file)}: ${error}`);
      });
    }

    console.log(`\n${colors.bright}📝 Next Steps:${colors.reset}`);
    console.log(`  1. Review the changes in your Git diff`);
    console.log(`  2. Run the API tests: ${colors.cyan}npm run api:test${colors.reset}`);
    console.log(`  3. If issues occur, restore from backup: ${colors.cyan}${this.backupDir}${colors.reset}`);
    console.log(`  4. Commit the changes once verified`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  priority: args.includes('--priority'),
  limit: args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null,
  dryRun: args.includes('--dry-run')
};

if (args.includes('--help')) {
  console.log(`
${colors.bright}API Endpoint Migration Tool${colors.reset}

Usage: node scripts/migrate-api-endpoints.js [options]

Options:
  --priority     Process security and auth endpoints first
  --limit <n>    Only process first n files
  --dry-run      Show what would be changed without modifying files
  --help         Show this help message

Example:
  node scripts/migrate-api-endpoints.js --priority --limit 10
  `);
  process.exit(0);
}

// Run migration
const migrator = new APIEndpointMigrator();
migrator.migrate(options).catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
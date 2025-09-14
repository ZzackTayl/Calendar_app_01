/**
 * Fix all remaining NextResponse.json calls
 */

const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // Check if file already has api response handler
  const hasApiHandler = content.includes('createApiResponse');
  
  if (!hasApiHandler) {
    console.log(`Skipping ${filePath} - no api handler`);
    return false;
  }
  
  // Replace NextResponse.json with api methods
  const patterns = [
    // Error responses with 401
    {
      pattern: /return\s+NextResponse\.json\s*\(\s*\{[^}]*error:[^}]*\}[^)]*\),\s*\{\s*status:\s*401[^}]*\}\s*\)/g,
      replacement: 'return api.error(ErrorCode.UNAUTHORIZED)'
    },
    // Error responses with 403
    {
      pattern: /return\s+NextResponse\.json\s*\(\s*\{[^}]*error:[^}]*\}[^)]*\),\s*\{\s*status:\s*403[^}]*\}\s*\)/g,
      replacement: 'return api.error(ErrorCode.FORBIDDEN)'
    },
    // Error responses with 404
    {
      pattern: /return\s+NextResponse\.json\s*\(\s*\{[^}]*error:[^}]*\}[^)]*\),\s*\{\s*status:\s*404[^}]*\}\s*\)/g,
      replacement: 'return api.error(ErrorCode.NOT_FOUND)'
    },
    // Error responses with 400
    {
      pattern: /return\s+NextResponse\.json\s*\(\s*\{[^}]*error:[^}]*\}[^)]*\),\s*\{\s*status:\s*400[^}]*\}\s*\)/g,
      replacement: 'return api.error(ErrorCode.VALIDATION_ERROR)'
    },
    // Error responses with 500
    {
      pattern: /return\s+NextResponse\.json\s*\(\s*\{[^}]*error:[^}]*\}[^)]*\),\s*\{\s*status:\s*500[^}]*\}\s*\)/g,
      replacement: 'return api.error(ErrorCode.INTERNAL_ERROR)'
    },
    // Success responses without status
    {
      pattern: /return\s+NextResponse\.json\s*\(([^)]+)\)(?!\s*,)/g,
      replacement: 'return api.success($1)'
    }
  ];
  
  for (const { pattern, replacement } of patterns) {
    const newContent = content.replace(pattern, replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ Fixed ${filePath}`);
    return true;
  }
  
  return false;
}

// Find all route files
function findRouteFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...findRouteFiles(fullPath));
    } else if (item.isFile() && /route\.(ts|js)$/.test(item.name)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Main
const apiDir = path.join(process.cwd(), 'app', 'api');
const files = findRouteFiles(apiDir);

console.log(`Found ${files.length} route files`);

let fixedCount = 0;
for (const file of files) {
  if (fixFile(file)) {
    fixedCount++;
  }
}

console.log(`\nFixed ${fixedCount} files`);
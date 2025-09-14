#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files that need fixing based on the errors
const filesToFix = [
  'app/api/attachments/route.ts',
  'app/api/auth/reset-password/route.ts',
  'app/api/auth/update-password/route.ts',
  'app/api/events/route.ts',
  'app/api/events/with-privacy/route.ts'
];

function fixImports(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  
  // Remove duplicate NextResponse imports
  const lines = content.split('\n');
  const hasNextResponseImport = lines.some(line => 
    line.includes("import") && line.includes("NextResponse") && line.includes("from 'next/server'")
  );
  
  if (hasNextResponseImport) {
    // Remove any standalone NextResponse imports
    content = content.replace(/^import\s+{\s*NextResponse\s*}\s+from\s+['"]next\/server['"];\s*$/gm, '');
    
    // Fix the main import to include NextResponse if not already there
    content = content.replace(
      /import\s+{\s*NextRequest\s*}\s+from\s+['"]next\/server['"]/,
      "import { NextRequest, NextResponse } from 'next/server'"
    );
    
    modified = true;
  }
  
  // Fix broken import statements (import { \nimport pattern)
  content = content.replace(
    /import\s+{\s*\nimport\s+{\s*NextResponse\s*}\s+from\s+['"]next\/server['"];\s*/g,
    ''
  );
  
  // Ensure proper imports
  if (!content.includes('NextResponse') && !content.includes('NextRequest')) {
    // Add import at the beginning if missing
    content = "import { NextRequest, NextResponse } from 'next/server'\n" + content;
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed imports in: ${filePath}`);
  } else {
    console.log(`✓ No changes needed: ${filePath}`);
  }
}

console.log('Fixing API route imports...\n');

filesToFix.forEach(fixImports);

console.log('\n✨ Import fixes complete!');
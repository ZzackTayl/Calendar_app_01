#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function findApiRoutesWithParams(dir) {
  const files = [];
  
  function scan(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.includes('node_modules')) {
        // Check if this is a dynamic route directory
        if (item.match(/^\[.+\]$/)) {
          // This is a dynamic route, check for route.ts inside
          const routeFile = path.join(fullPath, 'route.ts');
          if (fs.existsSync(routeFile)) {
            files.push({
              path: routeFile,
              paramName: item.slice(1, -1) // Remove brackets
            });
          }
        }
        scan(fullPath);
      }
    }
  }
  
  scan(dir);
  return files;
}

function fixRouteParams(filePath, paramName) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Pattern to match function exports that might need params
  const functionPattern = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\([^)]*\)\s*{/g;
  
  // Check each function
  let match;
  while ((match = functionPattern.exec(content)) !== null) {
    const functionName = match[1];
    const functionStart = match.index;
    const beforeFunction = content.substring(0, functionStart);
    const functionDeclaration = match[0];
    
    // Check if this function already has params
    if (!functionDeclaration.includes('params')) {
      // Check if the function body uses params
      const functionBodyStart = functionStart + functionDeclaration.length;
      let braceCount = 1;
      let functionBodyEnd = functionBodyStart;
      
      // Find the end of the function
      while (braceCount > 0 && functionBodyEnd < content.length) {
        if (content[functionBodyEnd] === '{') braceCount++;
        if (content[functionBodyEnd] === '}') braceCount--;
        functionBodyEnd++;
      }
      
      const functionBody = content.substring(functionBodyStart, functionBodyEnd);
      
      // Check if params is used in the function body
      if (functionBody.includes('params.')) {
        // Fix the function signature
        const newDeclaration = functionDeclaration.replace(
          /\(\s*(request:\s*NextRequest)\s*\)/,
          `(\n  request: NextRequest,\n  { params }: { params: { ${paramName}: string } }\n)`
        );
        
        content = content.substring(0, functionStart) + 
                  newDeclaration + 
                  content.substring(functionStart + functionDeclaration.length);
        
        modified = true;
        console.log(`  Fixed ${functionName} in ${path.basename(path.dirname(filePath))}/route.ts`);
      }
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  
  return false;
}

console.log('Scanning for API routes with dynamic parameters...\n');

const apiDir = path.join(__dirname, '..', 'app', 'api');
const routesWithParams = findApiRoutesWithParams(apiDir);

console.log(`Found ${routesWithParams.length} dynamic routes\n`);

let fixedCount = 0;

for (const route of routesWithParams) {
  if (fixRouteParams(route.path, route.paramName)) {
    fixedCount++;
  }
}

console.log(`\n✨ Fixed ${fixedCount} route files`);
console.log('All API routes should now have proper parameter handling!');
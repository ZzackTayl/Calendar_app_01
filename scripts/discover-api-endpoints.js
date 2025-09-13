/**
 * API Endpoint Discovery Tool
 * Scans the app/api directory to find all API endpoints and their methods
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

class APIEndpointDiscovery {
  constructor() {
    this.endpoints = [];
    this.apiDir = path.join(process.cwd(), 'app', 'api');
    this.routeFilePattern = /route\.(ts|js|tsx|jsx)$/;
    this.httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
  }

  // Recursively scan directory for route files
  scanDirectory(dir, basePath = '/api') {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        // Handle dynamic route segments [param]
        const segment = item.name.startsWith('[') && item.name.endsWith(']') 
          ? `:${item.name.slice(1, -1)}`
          : item.name;
        
        const newBasePath = `${basePath}/${segment}`;
        this.scanDirectory(fullPath, newBasePath);
      } else if (item.isFile() && this.routeFilePattern.test(item.name)) {
        this.analyzeRouteFile(fullPath, basePath);
      }
    }
  }

  // Analyze a route file to find exported HTTP methods
  analyzeRouteFile(filePath, apiPath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const methods = this.extractHttpMethods(content);
      
      if (methods.length > 0) {
        const endpoint = {
          path: apiPath,
          file: path.relative(process.cwd(), filePath),
          methods: methods,
          hasAuth: this.hasAuthentication(content),
          hasCSRF: this.hasCSRFProtection(content),
          hasRateLimit: this.hasRateLimiting(content),
          hasValidation: this.hasValidation(content),
          hasEncryption: this.hasEncryption(content),
          category: this.categorizeEndpoint(apiPath)
        };
        
        this.endpoints.push(endpoint);
      }
    } catch (error) {
      console.error(`${colors.red}Error analyzing ${filePath}: ${error.message}${colors.reset}`);
    }
  }

  // Extract HTTP methods from file content
  extractHttpMethods(content) {
    const methods = [];
    const exportPattern = /export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(/g;
    const constExportPattern = /export\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*=/g;
    
    let match;
    while ((match = exportPattern.exec(content)) !== null) {
      if (!methods.includes(match[2])) {
        methods.push(match[2]);
      }
    }
    
    while ((match = constExportPattern.exec(content)) !== null) {
      if (!methods.includes(match[1])) {
        methods.push(match[1]);
      }
    }
    
    return methods;
  }

  // Check for authentication
  hasAuthentication(content) {
    return content.includes('requireAuthentication') || 
           content.includes('getUser()') ||
           content.includes('auth.getSession') ||
           content.includes('auth.getUser');
  }

  // Check for CSRF protection
  hasCSRFProtection(content) {
    return content.includes('validateCSRFProtection') || 
           content.includes('csrf') ||
           content.includes('CSRF');
  }

  // Check for rate limiting
  hasRateLimiting(content) {
    return content.includes('checkRateLimit') || 
           content.includes('rateLimit') ||
           content.includes('RATE_LIMITS');
  }

  // Check for input validation
  hasValidation(content) {
    return content.includes('z.object') || 
           content.includes('zod') ||
           content.includes('.parse(') ||
           content.includes('.safeParse(');
  }

  // Check for encryption
  hasEncryption(content) {
    return content.includes('encrypt') || 
           content.includes('decrypt') ||
           content.includes('encryptSensitiveFields');
  }

  // Categorize endpoint based on path
  categorizeEndpoint(path) {
    if (path.includes('/auth')) return 'Authentication';
    if (path.includes('/events')) return 'Events';
    if (path.includes('/groups')) return 'Groups';
    if (path.includes('/relationships')) return 'Relationships';
    if (path.includes('/contacts')) return 'Contacts';
    if (path.includes('/attachments')) return 'Attachments';
    if (path.includes('/invitations')) return 'Invitations';
    if (path.includes('/calendar')) return 'Calendar Integration';
    if (path.includes('/monitoring')) return 'Monitoring';
    if (path.includes('/health')) return 'Health Check';
    if (path.includes('/error')) return 'Error Reporting';
    if (path.includes('/account')) return 'Account Management';
    if (path.includes('/privacy')) return 'Privacy';
    if (path.includes('/debug')) return 'Debug';
    return 'Other';
  }

  // Generate summary statistics
  generateStatistics() {
    const stats = {
      totalEndpoints: this.endpoints.length,
      totalMethods: 0,
      byCategory: {},
      securityCoverage: {
        authentication: 0,
        csrf: 0,
        rateLimit: 0,
        validation: 0,
        encryption: 0
      },
      methodDistribution: {}
    };

    for (const endpoint of this.endpoints) {
      // Count methods
      stats.totalMethods += endpoint.methods.length;
      
      // Category stats
      if (!stats.byCategory[endpoint.category]) {
        stats.byCategory[endpoint.category] = 0;
      }
      stats.byCategory[endpoint.category]++;
      
      // Security coverage
      if (endpoint.hasAuth) stats.securityCoverage.authentication++;
      if (endpoint.hasCSRF) stats.securityCoverage.csrf++;
      if (endpoint.hasRateLimit) stats.securityCoverage.rateLimit++;
      if (endpoint.hasValidation) stats.securityCoverage.validation++;
      if (endpoint.hasEncryption) stats.securityCoverage.encryption++;
      
      // Method distribution
      for (const method of endpoint.methods) {
        if (!stats.methodDistribution[method]) {
          stats.methodDistribution[method] = 0;
        }
        stats.methodDistribution[method]++;
      }
    }

    // Convert to percentages
    for (const key in stats.securityCoverage) {
      const percentage = ((stats.securityCoverage[key] / stats.totalEndpoints) * 100).toFixed(1);
      stats.securityCoverage[key] = `${stats.securityCoverage[key]}/${stats.totalEndpoints} (${percentage}%)`;
    }

    return stats;
  }

  // Print formatted output
  printResults() {
    console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}       API ENDPOINT DISCOVERY RESULTS${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);

    // Group endpoints by category
    const byCategory = {};
    for (const endpoint of this.endpoints) {
      if (!byCategory[endpoint.category]) {
        byCategory[endpoint.category] = [];
      }
      byCategory[endpoint.category].push(endpoint);
    }

    // Print endpoints by category
    for (const [category, endpoints] of Object.entries(byCategory)) {
      console.log(`${colors.bright}${colors.magenta}📁 ${category}${colors.reset}`);
      console.log(`${colors.yellow}${'─'.repeat(50)}${colors.reset}`);
      
      for (const endpoint of endpoints) {
        console.log(`  ${colors.green}${endpoint.path}${colors.reset}`);
        console.log(`    📄 File: ${colors.cyan}${endpoint.file}${colors.reset}`);
        console.log(`    🔧 Methods: ${endpoint.methods.map(m => `${colors.blue}${m}${colors.reset}`).join(', ')}`);
        
        // Security indicators
        const security = [];
        if (endpoint.hasAuth) security.push(`${colors.green}✓ Auth${colors.reset}`);
        else security.push(`${colors.red}✗ Auth${colors.reset}`);
        
        if (endpoint.hasCSRF) security.push(`${colors.green}✓ CSRF${colors.reset}`);
        else if (endpoint.methods.some(m => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(m))) {
          security.push(`${colors.red}✗ CSRF${colors.reset}`);
        }
        
        if (endpoint.hasRateLimit) security.push(`${colors.green}✓ Rate Limit${colors.reset}`);
        else security.push(`${colors.yellow}⚠ Rate Limit${colors.reset}`);
        
        if (endpoint.hasValidation) security.push(`${colors.green}✓ Validation${colors.reset}`);
        else if (endpoint.methods.some(m => ['POST', 'PUT', 'PATCH'].includes(m))) {
          security.push(`${colors.red}✗ Validation${colors.reset}`);
        }
        
        if (endpoint.hasEncryption) security.push(`${colors.green}✓ Encryption${colors.reset}`);
        
        console.log(`    🔒 Security: ${security.join(' | ')}`);
        console.log('');
      }
    }

    // Print statistics
    const stats = this.generateStatistics();
    console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}       STATISTICS${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);
    
    console.log(`${colors.bright}📊 Summary:${colors.reset}`);
    console.log(`  • Total Endpoints: ${colors.green}${stats.totalEndpoints}${colors.reset}`);
    console.log(`  • Total Methods: ${colors.green}${stats.totalMethods}${colors.reset}`);
    
    console.log(`\n${colors.bright}📂 By Category:${colors.reset}`);
    for (const [category, count] of Object.entries(stats.byCategory)) {
      console.log(`  • ${category}: ${colors.blue}${count}${colors.reset}`);
    }
    
    console.log(`\n${colors.bright}🔒 Security Coverage:${colors.reset}`);
    console.log(`  • Authentication: ${stats.securityCoverage.authentication}`);
    console.log(`  • CSRF Protection: ${stats.securityCoverage.csrf}`);
    console.log(`  • Rate Limiting: ${stats.securityCoverage.rateLimit}`);
    console.log(`  • Input Validation: ${stats.securityCoverage.validation}`);
    console.log(`  • Encryption: ${stats.securityCoverage.encryption}`);
    
    console.log(`\n${colors.bright}🔧 Method Distribution:${colors.reset}`);
    for (const [method, count] of Object.entries(stats.methodDistribution)) {
      console.log(`  • ${method}: ${colors.blue}${count}${colors.reset}`);
    }
  }

  // Export to JSON file
  exportToJson() {
    const output = {
      generated: new Date().toISOString(),
      endpoints: this.endpoints.sort((a, b) => a.path.localeCompare(b.path)),
      statistics: this.generateStatistics()
    };
    
    const outputPath = path.join(process.cwd(), 'api-endpoints.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n${colors.green}✓ Results exported to: ${outputPath}${colors.reset}`);
  }

  // Main execution
  run() {
    console.log(`${colors.cyan}🔍 Scanning API directory: ${this.apiDir}${colors.reset}\n`);
    
    if (!fs.existsSync(this.apiDir)) {
      console.error(`${colors.red}✗ API directory not found: ${this.apiDir}${colors.reset}`);
      process.exit(1);
    }
    
    this.scanDirectory(this.apiDir);
    this.printResults();
    this.exportToJson();
    
    // Print issues found
    console.log(`\n${colors.bright}${colors.yellow}⚠️  ISSUES TO ADDRESS:${colors.reset}`);
    
    const issues = [];
    for (const endpoint of this.endpoints) {
      const endpointIssues = [];
      
      if (!endpoint.hasAuth && endpoint.path !== '/api/health' && !endpoint.path.includes('/auth/signin')) {
        endpointIssues.push('Missing authentication');
      }
      
      if (!endpoint.hasCSRF && endpoint.methods.some(m => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(m))) {
        endpointIssues.push('Missing CSRF protection for state-changing operation');
      }
      
      if (!endpoint.hasValidation && endpoint.methods.some(m => ['POST', 'PUT', 'PATCH'].includes(m))) {
        endpointIssues.push('Missing input validation');
      }
      
      if (!endpoint.hasRateLimit) {
        endpointIssues.push('Missing rate limiting');
      }
      
      if (endpointIssues.length > 0) {
        issues.push({
          path: endpoint.path,
          issues: endpointIssues
        });
      }
    }
    
    if (issues.length > 0) {
      for (const issue of issues) {
        console.log(`\n  ${colors.red}${issue.path}:${colors.reset}`);
        for (const problem of issue.issues) {
          console.log(`    • ${problem}`);
        }
      }
    } else {
      console.log(`  ${colors.green}✓ No critical issues found!${colors.reset}`);
    }
    
    console.log(`\n${colors.bright}${colors.green}✓ Discovery complete!${colors.reset}\n`);
  }
}

// Run the discovery
const discovery = new APIEndpointDiscovery();
discovery.run();
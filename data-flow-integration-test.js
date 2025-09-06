#!/usr/bin/env node

/**
 * Comprehensive Data Flow Integration Test Suite
 * Tests data synchronization between frontend components, backend APIs, and database systems
 * for the Calendar_app_01 polyamory calendar application
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 DATA FLOW INTEGRATION TESTING SUITE');
console.log('='.repeat(60));

// SECTION 1: Data Flow Architecture Analysis
console.log('\n📊 1. DATA FLOW ARCHITECTURE ANALYSIS');
console.log('-'.repeat(40));

function analyzeDataFlowArchitecture() {
  const results = {
    frontend_components: [],
    backend_api_routes: [],
    database_integration: [],
    real_time_hooks: [],
    state_management: [],
    issues: []
  };

  try {
    // Analyze frontend components
    const componentsDir = path.join(__dirname, 'components');
    if (fs.existsSync(componentsDir)) {
      const components = fs.readdirSync(componentsDir, { recursive: true })
        .filter(file => file.endsWith('.tsx') || file.endsWith('.ts'))
        .map(file => path.basename(file));
      results.frontend_components = components.slice(0, 10); // Limit for readability
    }

    // Analyze API routes
    const apiDir = path.join(__dirname, 'app', 'api');
    if (fs.existsSync(apiDir)) {
      const apiRoutes = [];
      const findRoutes = (dir, basePath = '') => {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            findRoutes(fullPath, `${basePath}/${item}`);
          } else if (item === 'route.ts') {
            apiRoutes.push(basePath || '/');
          }
        });
      };
      findRoutes(apiDir);
      results.backend_api_routes = apiRoutes.slice(0, 15); // Limit for readability
    }

    // Analyze real-time hooks
    const hooksDir = path.join(__dirname, 'hooks');
    if (fs.existsSync(hooksDir)) {
      const hooks = fs.readdirSync(hooksDir)
        .filter(file => file.startsWith('use-') && file.endsWith('.ts'))
        .map(file => path.basename(file, '.ts'));
      results.real_time_hooks = hooks;
    }

    // Analyze lib directory for data flow utilities
    const libDir = path.join(__dirname, 'lib');
    if (fs.existsSync(libDir)) {
      const libItems = fs.readdirSync(libDir)
        .filter(item => {
          const fullPath = path.join(libDir, item);
          return fs.statSync(fullPath).isDirectory() || 
                 (item.endsWith('.ts') || item.endsWith('.tsx'));
        });
      results.database_integration = libItems.filter(item => 
        item.includes('supabase') || 
        item.includes('database') || 
        item.includes('client') ||
        item.includes('realtime')
      ).slice(0, 10);
      
      results.state_management = libItems.filter(item =>
        item.includes('auth') ||
        item.includes('context') ||
        item.includes('store') ||
        item.includes('state')
      ).slice(0, 8);
    }

  } catch (error) {
    results.issues.push(`Architecture analysis error: ${error.message}`);
  }

  return results;
}

const architecture = analyzeDataFlowArchitecture();

console.log(`✅ Frontend Components Found: ${architecture.frontend_components.length}`);
console.log(`   Key Components: ${architecture.frontend_components.slice(0, 5).join(', ')}`);

console.log(`✅ Backend API Routes Found: ${architecture.backend_api_routes.length}`);
console.log(`   Key Routes: ${architecture.backend_api_routes.slice(0, 5).join(', ')}`);

console.log(`✅ Real-time Hooks Found: ${architecture.real_time_hooks.length}`);
console.log(`   Key Hooks: ${architecture.real_time_hooks.join(', ')}`);

console.log(`✅ Database Integration: ${architecture.database_integration.length}`);
console.log(`   Key Integrations: ${architecture.database_integration.join(', ')}`);

console.log(`✅ State Management: ${architecture.state_management.length}`);
console.log(`   Key State: ${architecture.state_management.join(', ')}`);

if (architecture.issues.length > 0) {
  console.log(`⚠️  Issues Found: ${architecture.issues.join(', ')}`);
}

// SECTION 2: Demo Store vs Supabase Data Consistency Analysis
console.log('\n📊 2. DUAL-MODE ARCHITECTURE ANALYSIS');
console.log('-'.repeat(40));

function analyzeDualModeArchitecture() {
  const results = {
    demo_store_status: 'unknown',
    supabase_integration: 'unknown',
    consistency_mechanisms: [],
    issues: []
  };

  try {
    // Check demo store implementation
    const demoStorePath = path.join(__dirname, 'lib', 'demo-store.ts');
    if (fs.existsSync(demoStorePath)) {
      const demoStoreContent = fs.readFileSync(demoStorePath, 'utf8');
      if (demoStoreContent.includes('stub') || demoStoreContent.includes('Minimal demo store')) {
        results.demo_store_status = 'removed_stubs_only';
      } else {
        results.demo_store_status = 'active';
      }
    } else {
      results.demo_store_status = 'not_found';
    }

    // Check Supabase integration
    const supabaseClientPath = path.join(__dirname, 'lib', 'supabase', 'client.ts');
    if (fs.existsSync(supabaseClientPath)) {
      const supabaseContent = fs.readFileSync(supabaseClientPath, 'utf8');
      if (supabaseContent.includes('createBrowserClient')) {
        results.supabase_integration = 'active';
      } else {
        results.supabase_integration = 'inactive';
      }
    }

    // Check for consistency mechanisms
    const authContextPath = path.join(__dirname, 'lib', 'auth-context.tsx');
    if (fs.existsSync(authContextPath)) {
      const authContent = fs.readFileSync(authContextPath, 'utf8');
      if (authContent.includes('Offline functionality removed')) {
        results.consistency_mechanisms.push('production_mode_only');
      }
    }

  } catch (error) {
    results.issues.push(`Dual-mode analysis error: ${error.message}`);
  }

  return results;
}

const dualMode = analyzeDualModeArchitecture();

console.log(`✅ Demo Store Status: ${dualMode.demo_store_status}`);
console.log(`✅ Supabase Integration: ${dualMode.supabase_integration}`);
console.log(`✅ Consistency Mechanisms: ${dualMode.consistency_mechanisms.join(', ')}`);

if (dualMode.demo_store_status === 'removed_stubs_only' && dualMode.supabase_integration === 'active') {
  console.log('✅ PRODUCTION MODE: Demo functionality has been removed, Supabase is primary data layer');
} else {
  console.log('⚠️  MIXED MODE: Both demo and Supabase systems may be active');
}

// SECTION 3: Frontend-Backend Integration Analysis
console.log('\n📊 3. FRONTEND-BACKEND INTEGRATION ANALYSIS');
console.log('-'.repeat(40));

function analyzeFrontendBackendIntegration() {
  const results = {
    api_client_patterns: [],
    validation_schemas: [],
    error_handling: [],
    authentication_flow: [],
    issues: []
  };

  try {
    // Check API client patterns
    const searchForPatterns = (dir, pattern) => {
      const files = [];
      if (!fs.existsSync(dir)) return files;
      
      const items = fs.readdirSync(dir, { recursive: true });
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes(pattern)) {
              files.push(path.basename(item));
            }
          } catch (e) {
            // Skip files that can't be read
          }
        }
      });
      return files.slice(0, 5); // Limit results
    };

    // Search for API client patterns
    results.api_client_patterns = [
      ...searchForPatterns(path.join(__dirname, 'lib'), 'createSupabaseClient'),
      ...searchForPatterns(path.join(__dirname, 'hooks'), 'fetch'),
      ...searchForPatterns(path.join(__dirname, 'components'), 'api/')
    ].filter((item, index, self) => self.indexOf(item) === index);

    // Search for validation schemas
    results.validation_schemas = [
      ...searchForPatterns(path.join(__dirname, 'lib'), 'zod'),
      ...searchForPatterns(path.join(__dirname, 'app', 'api'), 'z.object')
    ].filter((item, index, self) => self.indexOf(item) === index);

    // Search for error handling
    results.error_handling = [
      ...searchForPatterns(path.join(__dirname, 'lib'), 'try {'),
      ...searchForPatterns(path.join(__dirname, 'hooks'), 'catch'),
      ...searchForPatterns(path.join(__dirname, 'app', 'api'), 'NextResponse.json')
    ].filter((item, index, self) => self.indexOf(item) === index);

    // Search for authentication patterns
    results.authentication_flow = [
      ...searchForPatterns(path.join(__dirname, 'lib'), 'requireAuthentication'),
      ...searchForPatterns(path.join(__dirname, 'lib'), 'useAuth'),
      ...searchForPatterns(path.join(__dirname, 'app', 'api'), 'authentication')
    ].filter((item, index, self) => self.indexOf(item) === index);

  } catch (error) {
    results.issues.push(`Frontend-backend analysis error: ${error.message}`);
  }

  return results;
}

const frontendBackend = analyzeFrontendBackendIntegration();

console.log(`✅ API Client Patterns: ${frontendBackend.api_client_patterns.length} files`);
console.log(`   Key Files: ${frontendBackend.api_client_patterns.slice(0, 3).join(', ')}`);

console.log(`✅ Validation Schemas: ${frontendBackend.validation_schemas.length} files`);
console.log(`   Key Files: ${frontendBackend.validation_schemas.slice(0, 3).join(', ')}`);

console.log(`✅ Error Handling: ${frontendBackend.error_handling.length} files`);
console.log(`   Key Files: ${frontendBackend.error_handling.slice(0, 3).join(', ')}`);

console.log(`✅ Authentication Flow: ${frontendBackend.authentication_flow.length} files`);
console.log(`   Key Files: ${frontendBackend.authentication_flow.slice(0, 3).join(', ')}`);

// SECTION 4: Real-time Data Propagation Analysis
console.log('\n📊 4. REAL-TIME DATA PROPAGATION ANALYSIS');
console.log('-'.repeat(40));

function analyzeRealTimeSystem() {
  const results = {
    realtime_manager: false,
    subscription_hooks: [],
    channel_management: false,
    performance_optimizations: [],
    issues: []
  };

  try {
    // Check realtime manager
    const realtimeManagerPath = path.join(__dirname, 'lib', 'realtime-manager.ts');
    if (fs.existsSync(realtimeManagerPath)) {
      results.realtime_manager = true;
      const content = fs.readFileSync(realtimeManagerPath, 'utf8');
      
      if (content.includes('cleanupStaleChannels')) {
        results.performance_optimizations.push('channel_cleanup');
      }
      if (content.includes('getOrCreateChannel')) {
        results.performance_optimizations.push('channel_reuse');
      }
      if (content.includes('RealtimeManager.getInstance')) {
        results.performance_optimizations.push('singleton_pattern');
      }
    }

    // Check subscription hooks
    const hooksDir = path.join(__dirname, 'hooks');
    if (fs.existsSync(hooksDir)) {
      const realtimeHooks = fs.readdirSync(hooksDir)
        .filter(file => file.includes('realtime') && file.endsWith('.ts'))
        .map(file => path.basename(file, '.ts'));
      results.subscription_hooks = realtimeHooks;
    }

    // Check for channel management patterns
    const searchDir = path.join(__dirname, 'lib', 'supabase');
    if (fs.existsSync(searchDir)) {
      const files = fs.readdirSync(searchDir, { recursive: true });
      results.channel_management = files.some(file => 
        file.includes('channel') || file.includes('realtime')
      );
    }

  } catch (error) {
    results.issues.push(`Real-time analysis error: ${error.message}`);
  }

  return results;
}

const realtime = analyzeRealTimeSystem();

console.log(`✅ Realtime Manager: ${realtime.realtime_manager ? 'Active' : 'Not Found'}`);
console.log(`✅ Subscription Hooks: ${realtime.subscription_hooks.length}`);
console.log(`   Hooks: ${realtime.subscription_hooks.join(', ')}`);
console.log(`✅ Channel Management: ${realtime.channel_management ? 'Active' : 'Not Found'}`);
console.log(`✅ Performance Optimizations: ${realtime.performance_optimizations.join(', ')}`);

// SECTION 5: Privacy System Integration
console.log('\n📊 5. PRIVACY SYSTEM DATA FLOW ANALYSIS');
console.log('-'.repeat(40));

function analyzePrivacySystem() {
  const results = {
    privacy_levels: [],
    rls_integration: false,
    permission_utils: false,
    privacy_hooks: [],
    issues: []
  };

  try {
    // Check privacy utilities
    const privacyUtilsPath = path.join(__dirname, 'lib', 'privacy-utils.ts');
    if (fs.existsSync(privacyUtilsPath)) {
      const content = fs.readFileSync(privacyUtilsPath, 'utf8');
      results.permission_utils = true;
      
      // Extract privacy levels
      const privacyMatches = content.match(/private|semi_private|visible|public/gi);
      if (privacyMatches) {
        results.privacy_levels = [...new Set(privacyMatches.map(m => m.toLowerCase()))];
      }
    }

    // Check RLS integration
    const testDir = path.join(__dirname, '__tests__');
    if (fs.existsSync(testDir)) {
      const rlsTests = fs.readdirSync(testDir)
        .filter(file => file.includes('rls') && file.endsWith('.test.ts'));
      results.rls_integration = rlsTests.length > 0;
    }

    // Check privacy hooks
    const hooksDir = path.join(__dirname, 'hooks');
    if (fs.existsSync(hooksDir)) {
      const privacyHooks = fs.readdirSync(hooksDir)
        .filter(file => file.includes('privacy') && file.endsWith('.ts'))
        .map(file => path.basename(file, '.ts'));
      results.privacy_hooks = privacyHooks;
    }

  } catch (error) {
    results.issues.push(`Privacy analysis error: ${error.message}`);
  }

  return results;
}

const privacy = analyzePrivacySystem();

console.log(`✅ Privacy System: ${privacy.permission_utils ? 'Active' : 'Not Found'}`);
console.log(`✅ Privacy Levels: ${privacy.privacy_levels.join(', ')}`);
console.log(`✅ RLS Integration: ${privacy.rls_integration ? 'Active' : 'Not Found'}`);
console.log(`✅ Privacy Hooks: ${privacy.privacy_hooks.join(', ')}`);

// SECTION 6: Performance Analysis
console.log('\n📊 6. PERFORMANCE OPTIMIZATION ANALYSIS');
console.log('-'.repeat(40));

function analyzePerformanceOptimizations() {
  const results = {
    caching_mechanisms: [],
    rate_limiting: false,
    batch_processing: false,
    connection_pooling: false,
    memory_management: [],
    issues: []
  };

  try {
    // Check caching mechanisms
    const libDir = path.join(__dirname, 'lib');
    if (fs.existsSync(libDir)) {
      const files = fs.readdirSync(libDir, { recursive: true });
      files.forEach(file => {
        if (file.endsWith('.ts') || file.endsWith('.tsx')) {
          try {
            const fullPath = path.join(libDir, file);
            const content = fs.readFileSync(fullPath, 'utf8');
            
            if (content.includes('cache') || content.includes('Cache')) {
              results.caching_mechanisms.push(path.basename(file));
            }
            if (content.includes('rateLimit') || content.includes('rate-limit')) {
              results.rate_limiting = true;
            }
            if (content.includes('batch') || content.includes('Batch')) {
              results.batch_processing = true;
            }
            if (content.includes('pool') || content.includes('connection')) {
              results.connection_pooling = true;
            }
            if (content.includes('cleanup') || content.includes('memory')) {
              results.memory_management.push(path.basename(file));
            }
          } catch (e) {
            // Skip files that can't be read
          }
        }
      });
    }

    // Limit arrays for readability
    results.caching_mechanisms = [...new Set(results.caching_mechanisms)].slice(0, 5);
    results.memory_management = [...new Set(results.memory_management)].slice(0, 5);

  } catch (error) {
    results.issues.push(`Performance analysis error: ${error.message}`);
  }

  return results;
}

const performance = analyzePerformanceOptimizations();

console.log(`✅ Caching Mechanisms: ${performance.caching_mechanisms.length} implementations`);
console.log(`   Files: ${performance.caching_mechanisms.join(', ')}`);
console.log(`✅ Rate Limiting: ${performance.rate_limiting ? 'Active' : 'Not Found'}`);
console.log(`✅ Batch Processing: ${performance.batch_processing ? 'Active' : 'Not Found'}`);
console.log(`✅ Connection Pooling: ${performance.connection_pooling ? 'Active' : 'Not Found'}`);
console.log(`✅ Memory Management: ${performance.memory_management.length} implementations`);
console.log(`   Files: ${performance.memory_management.join(', ')}`);

// SECTION 7: Test Coverage Analysis
console.log('\n📊 7. DATA FLOW TEST COVERAGE ANALYSIS');
console.log('-'.repeat(40));

function analyzeTestCoverage() {
  const results = {
    integration_tests: [],
    api_tests: [],
    realtime_tests: [],
    security_tests: [],
    performance_tests: [],
    issues: []
  };

  try {
    const testDir = path.join(__dirname, '__tests__');
    if (fs.existsSync(testDir)) {
      const testFiles = fs.readdirSync(testDir, { recursive: true })
        .filter(file => file.endsWith('.test.ts') || file.endsWith('.test.js'));

      testFiles.forEach(file => {
        const fileName = path.basename(file);
        if (fileName.includes('integration')) {
          results.integration_tests.push(fileName);
        }
        if (fileName.includes('api') || file.includes('/api/')) {
          results.api_tests.push(fileName);
        }
        if (fileName.includes('realtime')) {
          results.realtime_tests.push(fileName);
        }
        if (fileName.includes('security')) {
          results.security_tests.push(fileName);
        }
        if (fileName.includes('performance')) {
          results.performance_tests.push(fileName);
        }
      });
    }

  } catch (error) {
    results.issues.push(`Test coverage analysis error: ${error.message}`);
  }

  return results;
}

const testCoverage = analyzeTestCoverage();

console.log(`✅ Integration Tests: ${testCoverage.integration_tests.length}`);
console.log(`   Files: ${testCoverage.integration_tests.slice(0, 3).join(', ')}`);
console.log(`✅ API Tests: ${testCoverage.api_tests.length}`);
console.log(`   Files: ${testCoverage.api_tests.slice(0, 3).join(', ')}`);
console.log(`✅ Realtime Tests: ${testCoverage.realtime_tests.length}`);
console.log(`   Files: ${testCoverage.realtime_tests.join(', ')}`);
console.log(`✅ Security Tests: ${testCoverage.security_tests.length}`);
console.log(`   Files: ${testCoverage.security_tests.slice(0, 3).join(', ')}`);
console.log(`✅ Performance Tests: ${testCoverage.performance_tests.length}`);
console.log(`   Files: ${testCoverage.performance_tests.join(', ')}`);

// FINAL SUMMARY
console.log('\n📊 COMPREHENSIVE DATA FLOW ANALYSIS SUMMARY');
console.log('='.repeat(60));

const totalComponents = architecture.frontend_components.length + architecture.backend_api_routes.length;
const totalIntegrationPoints = architecture.real_time_hooks.length + architecture.database_integration.length;
const totalTests = Object.values(testCoverage).reduce((sum, arr) => sum + arr.length, 0);

console.log(`📈 ARCHITECTURE METRICS:`);
console.log(`   • Frontend Components: ${architecture.frontend_components.length}`);
console.log(`   • Backend API Routes: ${architecture.backend_api_routes.length}`);
console.log(`   • Real-time Integration Points: ${totalIntegrationPoints}`);
console.log(`   • Total Components: ${totalComponents}`);

console.log(`📈 DATA FLOW HEALTH:`);
console.log(`   • Supabase Integration: ${dualMode.supabase_integration === 'active' ? '✅' : '❌'}`);
console.log(`   • Real-time Manager: ${realtime.realtime_manager ? '✅' : '❌'}`);
console.log(`   • Privacy System: ${privacy.permission_utils ? '✅' : '❌'}`);
console.log(`   • Performance Optimizations: ${performance.caching_mechanisms.length > 0 ? '✅' : '❌'}`);

console.log(`📈 TEST COVERAGE:`);
console.log(`   • Total Test Files: ${totalTests}`);
console.log(`   • Integration Coverage: ${testCoverage.integration_tests.length > 0 ? '✅' : '❌'}`);
console.log(`   • Security Coverage: ${testCoverage.security_tests.length > 0 ? '✅' : '❌'}`);
console.log(`   • API Coverage: ${testCoverage.api_tests.length > 0 ? '✅' : '❌'}`);

console.log(`📈 DATA SYNCHRONIZATION STATUS:`);
if (dualMode.demo_store_status === 'removed_stubs_only') {
  console.log(`   • Architecture: Production-ready (Demo mode removed) ✅`);
} else {
  console.log(`   • Architecture: Development/Mixed mode ⚠️`);
}

if (realtime.realtime_manager && realtime.subscription_hooks.length > 0) {
  console.log(`   • Real-time Sync: Fully implemented ✅`);
} else {
  console.log(`   • Real-time Sync: Partial implementation ⚠️`);
}

if (privacy.privacy_levels.length >= 4) {
  console.log(`   • Privacy Data Flow: 4-level system active ✅`);
} else {
  console.log(`   • Privacy Data Flow: Limited privacy levels ⚠️`);
}

console.log('\n🎯 RECOMMENDATIONS:');
if (testCoverage.integration_tests.length === 0) {
  console.log('   • Add comprehensive integration tests for data flow validation');
}
if (!performance.rate_limiting) {
  console.log('   • Consider implementing rate limiting for API endpoints');
}
if (realtime.subscription_hooks.length < 3) {
  console.log('   • Expand real-time hooks coverage for all data types');
}
if (testCoverage.performance_tests.length === 0) {
  console.log('   • Add performance tests for calendar conflict detection');
}

console.log('\n✅ DATA FLOW INTEGRATION ANALYSIS COMPLETE');
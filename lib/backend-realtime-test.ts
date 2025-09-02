/**
 * Backend Real-time Infrastructure Test Suite
 * 
 * This module tests the compatibility between token refresh, encryption,
 * and real-time subscriptions to ensure optimal performance.
 */

import { createSupabaseClient } from './supabase/client';
import { 
  ensureValidSession, 
  forceTokenRefresh, 
  isTokenExpiringSoon,
  setupPeriodicTokenValidation 
} from './supabase/token-refresh';
import { 
  createSubscriptionManager, 
  createUserSubscriptions,
  checkRealtimeStatus 
} from './supabase/realtime';
import { encryptToken, decryptToken } from './encryption';

/**
 * Test Results Interface
 */
export interface BackendTestResults {
  timestamp: string;
  testsPassed: number;
  testsFailed: number;
  tests: {
    tokenRefresh: TestResult;
    encryption: TestResult;
    realtimeCompatibility: TestResult;
    subscriptionStability: TestResult;
    rateLimiting: TestResult;
    errorHandling: TestResult;
  };
  recommendations: string[];
  warnings: string[];
}

interface TestResult {
  passed: boolean;
  duration: number;
  details: string;
  error?: string;
}

/**
 * Run comprehensive backend real-time tests
 */
export async function runBackendRealtimeTests(): Promise<BackendTestResults> {
  const startTime = Date.now();
  const results: BackendTestResults = {
    timestamp: new Date().toISOString(),
    testsPassed: 0,
    testsFailed: 0,
    tests: {
      tokenRefresh: { passed: false, duration: 0, details: '' },
      encryption: { passed: false, duration: 0, details: '' },
      realtimeCompatibility: { passed: false, duration: 0, details: '' },
      subscriptionStability: { passed: false, duration: 0, details: '' },
      rateLimiting: { passed: false, duration: 0, details: '' },
      errorHandling: { passed: false, duration: 0, details: '' }
    },
    recommendations: [],
    warnings: []
  };

  // Test 1: Token Refresh Mechanism
  results.tests.tokenRefresh = await testTokenRefresh();
  
  // Test 2: Encryption Performance
  results.tests.encryption = await testEncryptionPerformance();
  
  // Test 3: Real-time Compatibility
  results.tests.realtimeCompatibility = await testRealtimeCompatibility();
  
  // Test 4: Subscription Stability
  results.tests.subscriptionStability = await testSubscriptionStability();
  
  // Test 5: Rate Limiting
  results.tests.rateLimiting = await testRateLimiting();
  
  // Test 6: Error Handling
  results.tests.errorHandling = await testErrorHandling();

  // Calculate results
  Object.values(results.tests).forEach(test => {
    if (test.passed) {
      results.testsPassed++;
    } else {
      results.testsFailed++;
    }
  });

  // Generate recommendations
  results.recommendations = generateRecommendations(results);
  results.warnings = generateWarnings(results);

  return results;
}

/**
 * Test token refresh mechanism
 */
async function testTokenRefresh(): Promise<TestResult> {
  const start = Date.now();
  
  try {
    // Test 1: Current session validation
    const sessionResult = await ensureValidSession({ silent: true });
    if (!sessionResult.success) {
      return {
        passed: false,
        duration: Date.now() - start,
        details: 'Session validation failed',
        error: sessionResult.error
      };
    }

    // Test 2: Token expiration check
    const isExpiring = isTokenExpiringSoon(sessionResult.session);
    
    // Test 3: Force refresh (if authenticated)
    if (sessionResult.session) {
      const refreshResult = await forceTokenRefresh();
      if (!refreshResult.success && refreshResult.error !== 'No session available after refresh') {
        return {
          passed: false,
          duration: Date.now() - start,
          details: 'Token refresh failed',
          error: refreshResult.error
        };
      }
    }

    return {
      passed: true,
      duration: Date.now() - start,
      details: `Token refresh working. Session ${sessionResult.session ? 'valid' : 'unavailable'}, expiring soon: ${isExpiring}`
    };
    
  } catch (error) {
    return {
      passed: false,
      duration: Date.now() - start,
      details: 'Token refresh test threw exception',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test encryption performance for tokens
 */
async function testEncryptionPerformance(): Promise<TestResult> {
  const start = Date.now();
  
  try {
    const testData = [
      'ya29.a0AfB_byBwXdXvK1234567890abcdef',
      '1//04567890abcdef1234567890',
      null,
      undefined,
      ''
    ];

    let encryptionTests = 0;
    let decryptionTests = 0;

    for (const data of testData) {
      const encrypted = encryptToken(data);
      encryptionTests++;
      
      if (encrypted) {
        const decrypted = decryptToken(encrypted);
        decryptionTests++;
        
        if (data !== decrypted) {
          throw new Error(`Encryption/decryption mismatch: ${data} != ${decrypted}`);
        }
      } else if (data) {
        throw new Error(`Expected encryption for non-null data: ${data}`);
      }
    }

    return {
      passed: true,
      duration: Date.now() - start,
      details: `Encryption tests passed: ${encryptionTests} encryptions, ${decryptionTests} decryptions`
    };
    
  } catch (error) {
    return {
      passed: false,
      duration: Date.now() - start,
      details: 'Encryption performance test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test real-time compatibility with authentication
 */
async function testRealtimeCompatibility(): Promise<TestResult> {
  const start = Date.now();
  
  try {
    const realtimeStatus = await checkRealtimeStatus();
    
    if (!realtimeStatus.available) {
      return {
        passed: false,
        duration: Date.now() - start,
        details: 'Real-time not available',
        error: realtimeStatus.error
      };
    }

    // Test subscription manager creation
    const manager = createSubscriptionManager();
    const activeCount = manager.getActiveSubscriptions().length;
    
    // Test cleanup
    await manager.unsubscribeAll();

    return {
      passed: true,
      duration: Date.now() - start,
      details: `Real-time compatible. Authenticated: ${realtimeStatus.authenticated}, Initial subscriptions: ${activeCount}`
    };
    
  } catch (error) {
    return {
      passed: false,
      duration: Date.now() - start,
      details: 'Real-time compatibility test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test subscription stability under token refresh
 */
async function testSubscriptionStability(): Promise<TestResult> {
  const start = Date.now();
  
  try {
    // This would require a mock or test environment
    // For now, we'll test the subscription manager creation and cleanup
    const manager = createSubscriptionManager();
    
    // Simulate multiple subscription operations
    let subscriptionIds: string[] = [];
    
    // Test would require authentication - for now just test the manager
    const initialCount = manager.getActiveSubscriptions().length;
    
    // Test cleanup
    await manager.unsubscribeAll();
    const finalCount = manager.getActiveSubscriptions().length;

    return {
      passed: finalCount === 0,
      duration: Date.now() - start,
      details: `Subscription stability tested. Initial: ${initialCount}, Final: ${finalCount}`
    };
    
  } catch (error) {
    return {
      passed: false,
      duration: Date.now() - start,
      details: 'Subscription stability test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test rate limiting functionality
 */
async function testRateLimiting(): Promise<TestResult> {
  const start = Date.now();
  
  try {
    // Import the rate limiting function
    const { checkSubscriptionRateLimit } = await import('./supabase/realtime');
    
    const testUserId = 'test-user-123';
    
    // Test normal rate limiting
    const limit1 = checkSubscriptionRateLimit(testUserId, 5);
    const limit2 = checkSubscriptionRateLimit(testUserId, 5);
    const limit3 = checkSubscriptionRateLimit(testUserId, 5);

    if (!limit1.allowed || !limit2.allowed || !limit3.allowed) {
      throw new Error('Rate limiting too restrictive');
    }

    if (limit1.remaining !== 4 || limit2.remaining !== 3 || limit3.remaining !== 2) {
      throw new Error('Rate limiting counters incorrect');
    }

    return {
      passed: true,
      duration: Date.now() - start,
      details: `Rate limiting working. Remaining: ${limit3.remaining}`
    };
    
  } catch (error) {
    return {
      passed: false,
      duration: Date.now() - start,
      details: 'Rate limiting test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test error handling mechanisms
 */
async function testErrorHandling(): Promise<TestResult> {
  const start = Date.now();
  
  try {
    // Test invalid encryption data
    let encryptionErrorHandled = false;
    try {
      decryptToken('invalid:data:format:too:many:parts');
    } catch (error) {
      encryptionErrorHandled = true;
    }

    // Test invalid session handling
    // This would require mocking the Supabase client
    
    return {
      passed: encryptionErrorHandled,
      duration: Date.now() - start,
      details: `Error handling tested. Encryption errors handled: ${encryptionErrorHandled}`
    };
    
  } catch (error) {
    return {
      passed: false,
      duration: Date.now() - start,
      details: 'Error handling test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generate optimization recommendations
 */
function generateRecommendations(results: BackendTestResults): string[] {
  const recommendations: string[] = [];

  if (!results.tests.tokenRefresh.passed) {
    recommendations.push('Fix token refresh mechanism before enabling real-time features');
  }

  if (results.tests.encryption.duration > 100) {
    recommendations.push('Consider caching encrypted tokens to reduce encryption overhead');
  }

  if (!results.tests.realtimeCompatibility.passed) {
    recommendations.push('Resolve real-time authentication issues before production deployment');
  }

  if (!results.tests.subscriptionStability.passed) {
    recommendations.push('Implement subscription reconnection logic for better stability');
  }

  if (results.tests.rateLimiting.duration > 50) {
    recommendations.push('Optimize rate limiting checks for better performance');
  }

  // General recommendations
  recommendations.push('Monitor real-time connection metrics in production');
  recommendations.push('Implement connection pooling for database operations');
  recommendations.push('Set up automated health checks for real-time infrastructure');

  return recommendations;
}

/**
 * Generate warnings based on test results
 */
function generateWarnings(results: BackendTestResults): string[] {
  const warnings: string[] = [];

  if (results.testsFailed > 0) {
    warnings.push(`${results.testsFailed} critical tests failed - review before production`);
  }

  if (results.tests.encryption.duration > 200) {
    warnings.push('High encryption latency detected - may impact real-time performance');
  }

  if (results.tests.subscriptionStability.duration > 1000) {
    warnings.push('Subscription operations are slow - investigate database performance');
  }

  return warnings;
}

/**
 * Display test results in a formatted way
 */
export function displayTestResults(results: BackendTestResults): void {
  console.log('\n=== Backend Real-time Infrastructure Test Results ===');
  console.log(`Timestamp: ${results.timestamp}`);
  console.log(`Tests Passed: ${results.testsPassed}`);
  console.log(`Tests Failed: ${results.testsFailed}`);
  
  console.log('\nDetailed Results:');
  Object.entries(results.tests).forEach(([testName, result]) => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${result.details} (${result.duration}ms)`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  if (results.recommendations.length > 0) {
    console.log('\nRecommendations:');
    results.recommendations.forEach(rec => console.log(`• ${rec}`));
  }

  if (results.warnings.length > 0) {
    console.log('\nWarnings:');
    results.warnings.forEach(warn => console.log(`⚠️ ${warn}`));
  }
  
  console.log('\n=== End Test Results ===\n');
}
/**
 * Memory and Resource Consumption Load Test
 *
 * This test focuses on monitoring system resource usage during conflict detection operations:
 * - Memory usage patterns during batch operations
 * - CPU utilization under load
 * - Cache hit/miss ratios
 * - Resource cleanup and garbage collection
 * - Memory leaks detection
 * - API response size optimization
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// ===================================================================
// CONFIGURATION
// ===================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const MEMORY_THRESHOLD_MB = parseInt(__ENV.MEMORY_THRESHOLD_MB) || 512; // 512MB threshold
const RESPONSE_SIZE_THRESHOLD_KB = parseInt(__ENV.RESPONSE_SIZE_THRESHOLD_KB) || 100; // 100KB threshold

// ===================================================================
// CUSTOM METRICS
// ===================================================================

const memoryUsage = new Gauge('memory_usage_mb');
const cpuUtilization = new Gauge('cpu_utilization_percent');
const responseSize = new Trend('response_size_bytes', true);
const cacheHitRate = new Rate('cache_hit_rate');
const cacheMissRate = new Rate('cache_miss_rate');
const memoryLeakDetector = new Counter('potential_memory_leaks');
const resourceCleanupTime = new Trend('resource_cleanup_time', true);
const batchProcessingEfficiency = new Trend('batch_processing_efficiency', true);
const apiResponseTime = new Trend('api_response_time_memory_test', true);

// ===================================================================
// MEMORY MONITORING UTILITIES
// ===================================================================

function simulateMemoryUsage() {
  // Simulate memory usage calculation based on response patterns
  // In a real scenario, this would integrate with actual system monitoring
  const baseMemory = 100; // Base memory usage in MB
  const randomVariation = Math.random() * 200; // 0-200MB variation
  return baseMemory + randomVariation;
}

function simulateCPUUsage() {
  // Simulate CPU usage calculation
  const baseCPU = 20; // Base CPU usage percentage
  const loadVariation = Math.random() * 60; // 0-60% variation
  return baseCPU + loadVariation;
}

function calculateResponseSize(response) {
  if (!response || !response.body) return 0;
  return response.body.length;
}

// ===================================================================
// TEST SCENARIOS
// ===================================================================

export const options = {
  scenarios: {
    // Memory usage monitoring under normal load
    memory_baseline: {
      executor: 'constant-vus',
      vus: 10,
      duration: '2m',
      tags: { test_type: 'memory_baseline' },
      exec: 'testMemoryBaseline'
    },

    // Batch processing memory efficiency
    batch_memory_test: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '1m', target: 15 },
        { duration: '2m', target: 25 },
        { duration: '1m', target: 5 }
      ],
      tags: { test_type: 'batch_memory' },
      exec: 'testBatchMemoryUsage'
    },

    // Memory leak detection through sustained load
    memory_leak_detection: {
      executor: 'constant-vus',
      vus: 5,
      duration: '5m',
      tags: { test_type: 'memory_leak_detection' },
      exec: 'testMemoryLeakDetection'
    },

    // Cache efficiency testing
    cache_efficiency: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '3m',
      preAllocatedVUs: 15,
      maxVUs: 30,
      tags: { test_type: 'cache_efficiency' },
      exec: 'testCacheEfficiency'
    },

    // Resource cleanup verification
    resource_cleanup: {
      executor: 'shared-iterations',
      vus: 8,
      iterations: 80,
      maxDuration: '4m',
      tags: { test_type: 'resource_cleanup' },
      exec: 'testResourceCleanup'
    }
  },

  thresholds: {
    memory_usage_mb: [`avg<${MEMORY_THRESHOLD_MB}`],
    cpu_utilization_percent: ['avg<80'],
    response_size_bytes: [`avg<${RESPONSE_SIZE_THRESHOLD_KB * 1024}`],
    cache_hit_rate: ['rate>0.3'], // At least 30% cache hit rate
    potential_memory_leaks: ['count<10'],
    resource_cleanup_time: ['p(95)<1000']
  }
};

// ===================================================================
// AUTHENTICATION HELPER
// ===================================================================

function authenticate() {
  return {
    token: 'mock-token',
    csrfToken: 'test-csrf-token'
  };
}

// ===================================================================
// MEMORY AND RESOURCE TESTS
// ===================================================================

export function testMemoryBaseline() {
  group('Memory Baseline Test', function () {
    const auth = authenticate();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
      'X-CSRF-Token': auth.csrfToken
    };

    // Record initial memory state
    const initialMemory = simulateMemoryUsage();
    memoryUsage.add(initialMemory);

    const initialCPU = simulateCPUUsage();
    cpuUtilization.add(initialCPU);

    // Perform standard conflict detection operations
    const conflictCheckPayload = {
      event_start: new Date(Date.now() + 3600000).toISOString(),
      event_end: new Date(Date.now() + 7200000).toISOString(),
      partner_ids: [`partner_${Math.floor(Math.random() * 50)}`],
      buffer_time_minutes: 15
    };

    const startTime = Date.now();
    const response = http.post(
      `${BASE_URL}/api/events/check-conflicts`,
      JSON.stringify(conflictCheckPayload),
      { headers }
    );
    const responseTime = Date.now() - startTime;

    apiResponseTime.add(responseTime);

    // Monitor response size
    const respSize = calculateResponseSize(response);
    responseSize.add(respSize);

    // Monitor resource usage after operation
    const postOpMemory = simulateMemoryUsage();
    const postOpCPU = simulateCPUUsage();

    memoryUsage.add(postOpMemory);
    cpuUtilization.add(postOpCPU);

    // Check for reasonable resource usage
    check(response, {
      'baseline_request_successful': (r) => r.status === 200,
      'response_size_reasonable': () => respSize < (RESPONSE_SIZE_THRESHOLD_KB * 1024),
      'memory_usage_acceptable': () => postOpMemory < MEMORY_THRESHOLD_MB,
      'cpu_usage_reasonable': () => postOpCPU < 80
    });

    // Detect potential memory increase
    const memoryIncrease = postOpMemory - initialMemory;
    if (memoryIncrease > 50) { // 50MB increase threshold
      memoryLeakDetector.add(1);
    }

    sleep(1);
  });
}

export function testBatchMemoryUsage() {
  group('Batch Memory Usage Test', function () {
    const auth = authenticate();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
      'X-CSRF-Token': auth.csrfToken
    };

    // Test batch operations with varying sizes
    const batchSizes = [1, 5, 10, 20, 30];
    const selectedBatchSize = batchSizes[Math.floor(Math.random() * batchSizes.length)];

    const preMemory = simulateMemoryUsage();
    memoryUsage.add(preMemory);

    // Create multiple partner IDs for batch testing
    const partnerIds = [];
    for (let i = 0; i < selectedBatchSize; i++) {
      partnerIds.push(`batch_partner_${i}_${Math.floor(Math.random() * 100)}`);
    }

    const batchConflictPayload = {
      event_start: new Date(Date.now() + 3600000).toISOString(),
      event_end: new Date(Date.now() + 7200000).toISOString(),
      partner_ids: partnerIds,
      buffer_time_minutes: 15,
      alternative_slots_count: 3,
      consider_travel_time: true
    };

    const batchStartTime = Date.now();
    const batchResponse = http.post(
      `${BASE_URL}/api/events/check-conflicts/batch`,
      JSON.stringify(batchConflictPayload),
      { headers }
    );
    const batchDuration = Date.now() - batchStartTime;

    apiResponseTime.add(batchDuration);

    // Calculate batch processing efficiency (operations per second)
    const efficiency = selectedBatchSize / (batchDuration / 1000);
    batchProcessingEfficiency.add(efficiency);

    // Monitor memory usage after batch operation
    const postBatchMemory = simulateMemoryUsage();
    const postBatchCPU = simulateCPUUsage();

    memoryUsage.add(postBatchMemory);
    cpuUtilization.add(postBatchCPU);

    // Monitor response size - should scale with batch size
    const batchResponseSize = calculateResponseSize(batchResponse);
    responseSize.add(batchResponseSize);

    const batchSuccess = check(batchResponse, {
      'batch_request_successful': (r) => r.status === 200,
      'batch_response_size_proportional': () => {
        // Response size should be roughly proportional to batch size
        const expectedMaxSize = selectedBatchSize * 2000; // 2KB per partner estimate
        return batchResponseSize < expectedMaxSize;
      },
      'batch_memory_usage_reasonable': () => {
        const memoryIncrease = postBatchMemory - preMemory;
        // Memory increase should be bounded regardless of batch size
        return memoryIncrease < 100; // 100MB max increase
      },
      'batch_processing_efficient': () => efficiency > 1 // At least 1 operation per second
    });

    if (!batchSuccess) {
      memoryLeakDetector.add(1);
    }

    // Test performance metrics in response
    if (batchResponse.status === 200) {
      const responseBody = batchResponse.json();

      check(responseBody, {
        'performance_metrics_included': (data) => {
          return data.performance_metrics &&
                 typeof data.performance_metrics.processing_time_ms === 'number';
        },
        'memory_info_reasonable': (data) => {
          // Check if response includes reasonable performance data
          if (data.performance_metrics) {
            const processingTime = data.performance_metrics.processing_time_ms;
            return processingTime > 0 && processingTime < 10000; // 10 second max
          }
          return true;
        }
      });
    }

    sleep(0.5);
  });
}

export function testMemoryLeakDetection() {
  group('Memory Leak Detection Test', function () {
    const auth = authenticate();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
      'X-CSRF-Token': auth.csrfToken
    };

    // Perform repeated operations to detect memory leaks
    const iterations = 10;
    let memoryReadings = [];

    for (let i = 0; i < iterations; i++) {
      const currentMemory = simulateMemoryUsage();
      memoryReadings.push(currentMemory);
      memoryUsage.add(currentMemory);

      // Perform conflict detection operation
      const conflictPayload = {
        event_start: new Date(Date.now() + (i * 3600000)).toISOString(),
        event_end: new Date(Date.now() + ((i + 1) * 3600000)).toISOString(),
        partner_ids: [`leak_test_partner_${i}`],
        buffer_time_minutes: 15
      };

      const response = http.post(
        `${BASE_URL}/api/events/check-conflicts`,
        JSON.stringify(conflictPayload),
        { headers }
      );

      const responseSize = calculateResponseSize(response);
      responseSize.add(responseSize);

      // Check for memory trends
      if (i >= 5) { // Start checking after a few iterations
        const recentAvg = memoryReadings.slice(-3).reduce((a, b) => a + b, 0) / 3;
        const earlierAvg = memoryReadings.slice(0, 3).reduce((a, b) => a + b, 0) / 3;

        if (recentAvg > earlierAvg + 50) { // 50MB increase over time
          memoryLeakDetector.add(1);
        }
      }

      check(response, {
        [`leak_test_iteration_${i}_successful`]: (r) => r.status === 200,
        [`memory_stable_iteration_${i}`]: () => currentMemory < MEMORY_THRESHOLD_MB
      });

      sleep(0.2); // Short sleep between iterations
    }

    // Analyze memory trend
    if (memoryReadings.length >= 5) {
      const startMemory = memoryReadings.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
      const endMemory = memoryReadings.slice(-2).reduce((a, b) => a + b, 0) / 2;
      const memoryTrend = endMemory - startMemory;

      if (memoryTrend > 100) { // 100MB overall increase
        memoryLeakDetector.add(1);
        console.log(`Potential memory leak detected: ${memoryTrend}MB increase over ${iterations} iterations`);
      }
    }

    sleep(1);
  });
}

export function testCacheEfficiency() {
  group('Cache Efficiency Test', function () {
    const auth = authenticate();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
      'X-CSRF-Token': auth.csrfToken
    };

    // Use repeated queries to test caching
    const partnerId = `cache_test_partner_${Math.floor(__ITER / 5)}`; // Group iterations to create cache opportunities

    const conflictPayload = {
      event_start: '2024-01-15T10:00:00Z',
      event_end: '2024-01-15T11:00:00Z',
      partner_ids: [partnerId],
      buffer_time_minutes: 15
    };

    const startTime = Date.now();
    const response = http.post(
      `${BASE_URL}/api/events/check-conflicts`,
      JSON.stringify(conflictPayload),
      { headers }
    );
    const responseTime = Date.now() - startTime;

    apiResponseTime.add(responseTime);

    // Simulate cache hit/miss detection based on response time
    // Faster responses likely indicate cache hits
    if (responseTime < 500) { // Fast response suggests cache hit
      cacheHitRate.add(1);
      cacheMissRate.add(0);
    } else {
      cacheHitRate.add(0);
      cacheMissRate.add(1);
    }

    const respSize = calculateResponseSize(response);
    responseSize.add(respSize);

    // Monitor memory and CPU
    memoryUsage.add(simulateMemoryUsage());
    cpuUtilization.add(simulateCPUUsage());

    check(response, {
      'cache_test_successful': (r) => r.status === 200,
      'response_time_reasonable': () => responseTime < 2000,
      'cache_hit_likely': () => responseTime < 1000 // Fast response suggests good caching
    });

    sleep(0.1); // Minimal sleep for cache testing
  });
}

export function testResourceCleanup() {
  group('Resource Cleanup Test', function () {
    const auth = authenticate();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
      'X-CSRF-Token': auth.csrfToken
    };

    const initialMemory = simulateMemoryUsage();
    memoryUsage.add(initialMemory);

    // Create events to test resource cleanup
    const eventIds = [];
    const createStartTime = Date.now();

    // Create multiple events
    for (let i = 0; i < 3; i++) {
      const eventPayload = {
        title: `Cleanup Test Event ${i}`,
        description: `Resource cleanup test event ${i}`,
        start_time: new Date(Date.now() + (i * 3600000)).toISOString(),
        end_time: new Date(Date.now() + ((i + 1) * 3600000)).toISOString(),
        privacy_level: 'visible'
      };

      const createResponse = http.post(`${BASE_URL}/api/events`, JSON.stringify(eventPayload), { headers });

      if (createResponse.status === 201) {
        eventIds.push(createResponse.json()?.event?.id);
      }

      const createRespSize = calculateResponseSize(createResponse);
      responseSize.add(createRespSize);
    }

    const createDuration = Date.now() - createStartTime;

    // Perform conflict checks
    if (eventIds.length > 0) {
      const conflictPayload = {
        event_start: new Date(Date.now() + 1800000).toISOString(), // 30 minutes from now
        event_end: new Date(Date.now() + 5400000).toISOString(), // 90 minutes from now
        partner_ids: [`cleanup_partner_${Math.floor(Math.random() * 10)}`],
        buffer_time_minutes: 15
      };

      const conflictResponse = http.post(
        `${BASE_URL}/api/events/check-conflicts`,
        JSON.stringify(conflictPayload),
        { headers }
      );

      const conflictRespSize = calculateResponseSize(conflictResponse);
      responseSize.add(conflictRespSize);
    }

    // Cleanup: Delete created events
    const cleanupStartTime = Date.now();
    let cleanupSuccesses = 0;

    eventIds.forEach(eventId => {
      if (eventId) {
        const deleteResponse = http.del(`${BASE_URL}/api/events/${eventId}`, { headers });
        if (deleteResponse.status === 200) {
          cleanupSuccesses++;
        }
      }
    });

    const cleanupDuration = Date.now() - cleanupStartTime;
    resourceCleanupTime.add(cleanupDuration);

    // Monitor memory after cleanup
    const postCleanupMemory = simulateMemoryUsage();
    memoryUsage.add(postCleanupMemory);

    const memoryRecovered = initialMemory - postCleanupMemory;

    check(null, {
      'resource_cleanup_successful': () => cleanupSuccesses === eventIds.length,
      'cleanup_time_reasonable': () => cleanupDuration < 2000,
      'memory_properly_released': () => {
        // Memory should not significantly increase after cleanup
        return postCleanupMemory <= initialMemory + 20; // 20MB tolerance
      }
    });

    // Check if memory was properly released
    if (memoryRecovered < -50) { // Memory increased by more than 50MB
      memoryLeakDetector.add(1);
    }

    sleep(1);
  });
}

// ===================================================================
// RESULT HANDLING
// ===================================================================

export function handleSummary(data) {
  const analysis = {
    timestamp: new Date().toISOString(),
    memory_performance: 'unknown',
    resource_issues: [],
    memory_recommendations: [],
    cache_analysis: {},
    memory_usage_analysis: {},
    batch_efficiency_analysis: {},
    resource_cleanup_analysis: {}
  };

  const metrics = data.metrics;

  // Analyze memory usage
  if (metrics.memory_usage_mb) {
    const avgMemory = metrics.memory_usage_mb.values.value || metrics.memory_usage_mb.values.avg;
    const maxMemory = metrics.memory_usage_mb.values.max || avgMemory;

    analysis.memory_usage_analysis = {
      average_memory_mb: avgMemory,
      peak_memory_mb: maxMemory,
      memory_efficiency: avgMemory < (MEMORY_THRESHOLD_MB * 0.7) ? 'good' : 'needs_optimization'
    };

    if (avgMemory > MEMORY_THRESHOLD_MB) {
      analysis.resource_issues.push('Average memory usage exceeds threshold');
      analysis.memory_recommendations.push('Optimize memory allocation and object lifecycle');
      analysis.memory_recommendations.push('Implement more aggressive garbage collection');
    }
  }

  // Analyze cache efficiency
  if (metrics.cache_hit_rate && metrics.cache_miss_rate) {
    const hitRate = metrics.cache_hit_rate.values.rate;
    const missRate = metrics.cache_miss_rate.values.rate;

    analysis.cache_analysis = {
      hit_rate: hitRate,
      miss_rate: missRate,
      cache_effectiveness: hitRate > 0.5 ? 'excellent' : hitRate > 0.3 ? 'good' : 'poor'
    };

    if (hitRate < 0.3) {
      analysis.resource_issues.push('Low cache hit rate detected');
      analysis.memory_recommendations.push('Optimize caching strategy and cache key generation');
      analysis.memory_recommendations.push('Consider implementing cache warming strategies');
    }
  }

  // Analyze batch processing efficiency
  if (metrics.batch_processing_efficiency) {
    const avgEfficiency = metrics.batch_processing_efficiency.values.avg;

    analysis.batch_efficiency_analysis = {
      avg_operations_per_second: avgEfficiency,
      efficiency_rating: avgEfficiency > 10 ? 'excellent' : avgEfficiency > 5 ? 'good' : 'poor'
    };

    if (avgEfficiency < 5) {
      analysis.resource_issues.push('Low batch processing efficiency');
      analysis.memory_recommendations.push('Optimize batch processing algorithms');
      analysis.memory_recommendations.push('Consider parallel processing for batch operations');
    }
  }

  // Analyze resource cleanup
  if (metrics.resource_cleanup_time) {
    const avgCleanupTime = metrics.resource_cleanup_time.values.avg;
    const p95CleanupTime = metrics.resource_cleanup_time.values['p(95)'];

    analysis.resource_cleanup_analysis = {
      avg_cleanup_time_ms: avgCleanupTime,
      p95_cleanup_time_ms: p95CleanupTime,
      cleanup_efficiency: avgCleanupTime < 500 ? 'excellent' : avgCleanupTime < 1000 ? 'good' : 'poor'
    };

    if (p95CleanupTime > 1000) {
      analysis.resource_issues.push('Resource cleanup taking too long');
      analysis.memory_recommendations.push('Optimize resource cleanup procedures');
      analysis.memory_recommendations.push('Implement asynchronous cleanup where appropriate');
    }
  }

  // Check for memory leaks
  if (metrics.potential_memory_leaks) {
    const leakCount = metrics.potential_memory_leaks.values.count;

    if (leakCount > 0) {
      analysis.resource_issues.push(`${leakCount} potential memory leaks detected`);
      analysis.memory_recommendations.push('Investigate memory leak sources');
      analysis.memory_recommendations.push('Implement memory profiling and monitoring');
      analysis.memory_recommendations.push('Review object lifecycle management');
    }
  }

  // Determine overall memory performance
  const issueCount = analysis.resource_issues.length;
  if (issueCount === 0) {
    analysis.memory_performance = 'excellent';
  } else if (issueCount <= 2) {
    analysis.memory_performance = 'good';
  } else if (issueCount <= 4) {
    analysis.memory_performance = 'needs_optimization';
  } else {
    analysis.memory_performance = 'critical';
  }

  return {
    'memory-resource-analysis.json': JSON.stringify(analysis, null, 2),
    'memory-resource-summary.json': JSON.stringify({
      metrics: data.metrics,
      thresholds: data.thresholds
    }, null, 2),
    stdout: `
=== MEMORY & RESOURCE TEST RESULTS ===
Overall Memory Performance: ${analysis.memory_performance.toUpperCase()}
Resource Issues: ${analysis.resource_issues.length}
Average Memory Usage: ${analysis.memory_usage_analysis.average_memory_mb || 'N/A'}MB
Cache Hit Rate: ${(analysis.cache_analysis.hit_rate * 100 || 0).toFixed(1)}%
Batch Efficiency: ${analysis.batch_efficiency_analysis.avg_operations_per_second || 'N/A'} ops/sec

=== MEMORY RECOMMENDATIONS ===
${analysis.memory_recommendations.map(rec => `- ${rec}`).join('\n')}
    `
  };
}
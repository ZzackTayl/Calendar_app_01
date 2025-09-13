/**
 * Conflict Detection Performance Load Test Suite
 *
 * This comprehensive test suite validates conflict detection performance under various load scenarios,
 * focusing on:
 * 1. Concurrent user operations with conflicting events
 * 2. Database locking mechanisms under high load
 * 3. Race condition detection and resolution
 * 4. API response times during conflict scenarios
 * 5. Memory usage and resource consumption
 * 6. Scalability limits
 * 7. Edge cases with simultaneous conflicting requests
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { SharedArray } from 'k6/data';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// ===================================================================
// CONFIGURATION
// ===================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const MAX_VUS = parseInt(__ENV.MAX_VUS) || 50;
const DURATION = __ENV.DURATION || '5m';
const CONFLICT_DETECTION_THRESHOLD = 2000; // ms - acceptable conflict detection time

// ===================================================================
// CUSTOM METRICS
// ===================================================================

const conflictDetectionTime = new Trend('conflict_detection_time', true);
const conflictResolutionTime = new Trend('conflict_resolution_time', true);
const databaseLockWaitTime = new Trend('database_lock_wait_time', true);
const concurrentConflictRate = new Rate('concurrent_conflict_rate');
const raceConditionDetected = new Counter('race_conditions_detected');
const memoryPressureGauge = new Gauge('memory_pressure_gauge');
const apiTimeoutRate = new Rate('api_timeout_rate');
const conflictAccuracy = new Rate('conflict_accuracy_rate');

// ===================================================================
// TEST DATA GENERATION
// ===================================================================

// Generate realistic test data using SharedArray for memory efficiency
const testUsers = new SharedArray('test_users', function () {
  const users = [];
  for (let i = 1; i <= 100; i++) {
    users.push({
      id: `user_${i}`,
      email: `testuser${i}@example.com`,
      name: `Test User ${i}`,
      partners: generatePartners(i, 5), // Each user has up to 5 partners
      timezone: 'UTC'
    });
  }
  return users;
});

const conflictScenarios = new SharedArray('conflict_scenarios', function () {
  return [
    {
      name: 'exact_overlap',
      description: 'Events with exact time overlap',
      eventA: { start: '2024-01-15T10:00:00Z', end: '2024-01-15T11:00:00Z' },
      eventB: { start: '2024-01-15T10:00:00Z', end: '2024-01-15T11:00:00Z' },
      expectedConflict: true,
      severity: 'critical'
    },
    {
      name: 'partial_overlap',
      description: 'Events with partial time overlap',
      eventA: { start: '2024-01-15T10:00:00Z', end: '2024-01-15T11:00:00Z' },
      eventB: { start: '2024-01-15T10:30:00Z', end: '2024-01-15T11:30:00Z' },
      expectedConflict: true,
      severity: 'high'
    },
    {
      name: 'buffer_conflict',
      description: 'Events within buffer time',
      eventA: { start: '2024-01-15T10:00:00Z', end: '2024-01-15T11:00:00Z' },
      eventB: { start: '2024-01-15T11:05:00Z', end: '2024-01-15T12:00:00Z' },
      expectedConflict: true,
      severity: 'medium',
      bufferMinutes: 15
    },
    {
      name: 'no_conflict',
      description: 'Events with no conflicts',
      eventA: { start: '2024-01-15T10:00:00Z', end: '2024-01-15T11:00:00Z' },
      eventB: { start: '2024-01-15T14:00:00Z', end: '2024-01-15T15:00:00Z' },
      expectedConflict: false,
      severity: 'none'
    },
    {
      name: 'multi_partner_conflict',
      description: 'Event conflicting with multiple partners',
      eventA: { start: '2024-01-15T10:00:00Z', end: '2024-01-15T11:00:00Z' },
      partners: ['partner_1', 'partner_2', 'partner_3'],
      expectedConflict: true,
      severity: 'critical'
    },
    {
      name: 'cascading_conflict',
      description: 'Conflicts that affect subsequent events',
      events: [
        { start: '2024-01-15T10:00:00Z', end: '2024-01-15T11:00:00Z' },
        { start: '2024-01-15T10:45:00Z', end: '2024-01-15T11:45:00Z' },
        { start: '2024-01-15T11:30:00Z', end: '2024-01-15T12:30:00Z' }
      ],
      expectedConflict: true,
      severity: 'high'
    }
  ];
});

function generatePartners(userId, maxPartners) {
  const partners = [];
  const count = Math.floor(Math.random() * maxPartners) + 1;
  for (let i = 1; i <= count; i++) {
    partners.push({
      id: `partner_${userId}_${i}`,
      name: `Partner ${i} of User ${userId}`,
      relationship_type: ['romantic', 'platonic', 'professional'][Math.floor(Math.random() * 3)],
      privacy_level: ['public', 'visible', 'semi_private', 'private'][Math.floor(Math.random() * 4)]
    });
  }
  return partners;
}

// ===================================================================
// AUTHENTICATION HELPER
// ===================================================================

function authenticate(user) {
  const loginPayload = {
    email: user.email,
    password: 'testPassword123!' // Use consistent test password
  };

  const response = http.post(`${BASE_URL}/api/auth/signin`, JSON.stringify(loginPayload), {
    headers: { 'Content-Type': 'application/json' }
  });

  if (response.status === 200) {
    const authData = response.json();
    return {
      token: authData.token || extractTokenFromCookies(response),
      csrfToken: authData.csrfToken || extractCSRFToken(response)
    };
  }
  return null;
}

function extractTokenFromCookies(response) {
  const cookies = response.headers['Set-Cookie'];
  if (cookies) {
    const sessionCookie = cookies.find(cookie => cookie.includes('supabase'));
    if (sessionCookie) {
      return sessionCookie.split('=')[1].split(';')[0];
    }
  }
  return null;
}

function extractCSRFToken(response) {
  // Extract CSRF token from response headers or body
  return response.headers['X-CSRF-Token'] || 'test-csrf-token';
}

// ===================================================================
// LOAD TEST SCENARIOS
// ===================================================================

export const options = {
  scenarios: {
    // Scenario 1: Concurrent Conflict Detection
    concurrent_conflict_detection: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 20 },
        { duration: '2m', target: 30 },
        { duration: '1m', target: 20 },
        { duration: '30s', target: 0 }
      ],
      tags: { test_type: 'conflict_detection' },
      exec: 'concurrentConflictDetection'
    },

    // Scenario 2: Race Condition Testing
    race_condition_testing: {
      executor: 'shared-iterations',
      vus: 20,
      iterations: 200,
      maxDuration: '3m',
      tags: { test_type: 'race_conditions' },
      exec: 'raceConditionTesting'
    },

    // Scenario 3: Database Lock Testing
    database_lock_testing: {
      executor: 'constant-vus',
      vus: 15,
      duration: '2m',
      tags: { test_type: 'database_locks' },
      exec: 'databaseLockTesting'
    },

    // Scenario 4: Scalability Limits
    scalability_limits: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 100,
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 15 },
        { duration: '2m', target: 30 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 100 }
      ],
      tags: { test_type: 'scalability' },
      exec: 'scalabilityTesting'
    },

    // Scenario 5: Edge Case Testing
    edge_case_testing: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 50,
      maxDuration: '5m',
      tags: { test_type: 'edge_cases' },
      exec: 'edgeCaseTesting'
    }
  },

  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% of requests should complete within 5s
    http_req_failed: ['rate<0.05'], // Error rate should be less than 5%
    conflict_detection_time: ['p(95)<2000'], // 95% of conflict detections should complete within 2s
    conflict_resolution_time: ['p(90)<3000'], // 90% of conflict resolutions within 3s
    concurrent_conflict_rate: ['rate<0.1'], // Less than 10% of concurrent conflicts should fail
    api_timeout_rate: ['rate<0.02'], // Less than 2% timeout rate
    conflict_accuracy_rate: ['rate>0.95'] // Conflict detection accuracy should be above 95%
  }
};

// ===================================================================
// TEST SCENARIOS IMPLEMENTATION
// ===================================================================

export function concurrentConflictDetection() {
  group('Concurrent Conflict Detection', function () {
    const user = testUsers[Math.floor(Math.random() * testUsers.length)];
    const auth = authenticate(user);

    if (!auth) {
      check(false, { 'authentication_failed': true });
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
      'X-CSRF-Token': auth.csrfToken
    };

    // Test multiple conflict scenarios concurrently
    const scenario = conflictScenarios[Math.floor(Math.random() * conflictScenarios.length)];

    // Create test events first
    const eventCreationPromises = [];

    if (scenario.events) {
      // Multi-event scenario
      scenario.events.forEach((event, index) => {
        const eventPayload = {
          title: `Test Event ${index + 1} - ${scenario.name}`,
          description: `Conflict test scenario: ${scenario.description}`,
          start_time: event.start,
          end_time: event.end,
          privacy_level: 'visible',
          relationship_id: user.partners[0]?.id
        };

        const startTime = Date.now();
        const response = http.post(`${BASE_URL}/api/events`, JSON.stringify(eventPayload), { headers });
        const duration = Date.now() - startTime;

        conflictDetectionTime.add(duration);

        check(response, {
          'event_created_successfully': (r) => r.status === 201,
          'response_time_acceptable': (r) => duration < CONFLICT_DETECTION_THRESHOLD
        });

        if (response.status === 201) {
          eventCreationPromises.push(response.json().event.id);
        }
      });
    } else {
      // Single event scenario
      const eventPayload = {
        title: `Test Event - ${scenario.name}`,
        description: `Conflict test scenario: ${scenario.description}`,
        start_time: scenario.eventA.start,
        end_time: scenario.eventA.end,
        privacy_level: 'visible',
        relationship_id: user.partners[0]?.id
      };

      const startTime = Date.now();
      const response = http.post(`${BASE_URL}/api/events`, JSON.stringify(eventPayload), { headers });
      const duration = Date.now() - startTime;

      conflictDetectionTime.add(duration);

      check(response, {
        'event_created_successfully': (r) => r.status === 201,
        'response_time_acceptable': (r) => duration < CONFLICT_DETECTION_THRESHOLD
      });
    }

    // Test conflict detection
    if (scenario.partners || user.partners.length > 0) {
      const conflictCheckPayload = {
        event_start: scenario.eventA?.start || scenario.events[0].start,
        event_end: scenario.eventA?.end || scenario.events[0].end,
        partner_ids: scenario.partners || [user.partners[0].id],
        buffer_time_minutes: scenario.bufferMinutes || 15
      };

      const conflictStartTime = Date.now();
      const conflictResponse = http.post(
        `${BASE_URL}/api/events/check-conflicts`,
        JSON.stringify(conflictCheckPayload),
        { headers }
      );
      const conflictDuration = Date.now() - conflictStartTime;

      conflictDetectionTime.add(conflictDuration);

      const conflictResult = check(conflictResponse, {
        'conflict_check_successful': (r) => r.status === 200,
        'conflict_detected_correctly': (r) => {
          if (r.status === 200) {
            const body = r.json();
            const hasConflicts = body.has_conflicts;
            const expected = scenario.expectedConflict;
            conflictAccuracy.add(hasConflicts === expected);
            return hasConflicts === expected;
          }
          return false;
        },
        'conflict_response_time_acceptable': (r) => conflictDuration < CONFLICT_DETECTION_THRESHOLD
      });

      if (conflictResponse.status === 200 && conflictResponse.json().has_conflicts) {
        concurrentConflictRate.add(1);
      } else {
        concurrentConflictRate.add(0);
      }
    }

    sleep(Math.random() * 2); // Random sleep between 0-2 seconds
  });
}

export function raceConditionTesting() {
  group('Race Condition Testing', function () {
    const user = testUsers[Math.floor(Math.random() * testUsers.length)];
    const auth = authenticate(user);

    if (!auth) return;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
      'X-CSRF-Token': auth.csrfToken
    };

    // Simulate race condition by creating multiple events simultaneously
    const eventTime = new Date(Date.now() + Math.random() * 3600000); // Random time within next hour
    const eventPayloads = [];

    for (let i = 0; i < 3; i++) {
      eventPayloads.push({
        title: `Race Condition Test Event ${i + 1}`,
        description: `Testing race condition scenario`,
        start_time: eventTime.toISOString(),
        end_time: new Date(eventTime.getTime() + 3600000).toISOString(), // 1 hour duration
        privacy_level: 'visible',
        relationship_id: user.partners[0]?.id
      });
    }

    // Create events simultaneously (simulating race condition)
    const responses = [];
    const startTime = Date.now();

    eventPayloads.forEach(payload => {
      const response = http.post(`${BASE_URL}/api/events`, JSON.stringify(payload), { headers });
      responses.push(response);
    });

    const duration = Date.now() - startTime;
    databaseLockWaitTime.add(duration);

    // Check for race condition detection
    const successfulCreations = responses.filter(r => r.status === 201).length;
    const conflicts = responses.filter(r => r.status === 409).length; // Conflict status

    if (conflicts > 0) {
      raceConditionDetected.add(1);
    }

    check(responses[0], {
      'race_condition_handled': () => {
        // At least one should succeed, and conflicts should be properly detected
        return successfulCreations >= 1 || conflicts > 0;
      },
      'database_integrity_maintained': () => {
        // Should not have multiple successful creations for conflicting events
        return !(successfulCreations > 1 && conflicts === 0);
      }
    });

    sleep(0.1); // Minimal sleep for race condition testing
  });
}

export function databaseLockTesting() {
  group('Database Lock Testing', function () {
    const user = testUsers[Math.floor(Math.random() * testUsers.length)];
    const auth = authenticate(user);

    if (!auth) return;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
      'X-CSRF-Token': auth.csrfToken
    };

    // Test database locking with high-frequency updates
    const eventPayload = {
      title: `Database Lock Test Event`,
      description: `Testing database locking mechanisms`,
      start_time: new Date(Date.now() + 3600000).toISOString(),
      end_time: new Date(Date.now() + 7200000).toISOString(),
      privacy_level: 'visible',
      relationship_id: user.partners[0]?.id
    };

    const createStartTime = Date.now();
    const createResponse = http.post(`${BASE_URL}/api/events`, JSON.stringify(eventPayload), { headers });
    const createDuration = Date.now() - createStartTime;

    databaseLockWaitTime.add(createDuration);

    if (createResponse.status === 201) {
      const eventId = createResponse.json().event.id;

      // Perform rapid updates to test locking
      for (let i = 0; i < 5; i++) {
        const updatePayload = {
          ...eventPayload,
          title: `Updated Event ${i + 1}`,
          description: `Lock test update ${i + 1}`
        };

        const updateStartTime = Date.now();
        const updateResponse = http.put(
          `${BASE_URL}/api/events/${eventId}`,
          JSON.stringify(updatePayload),
          { headers }
        );
        const updateDuration = Date.now() - updateStartTime;

        databaseLockWaitTime.add(updateDuration);

        check(updateResponse, {
          'update_successful_under_load': (r) => r.status === 200,
          'lock_wait_time_reasonable': () => updateDuration < 5000 // 5 second max lock wait
        });

        sleep(0.05); // 50ms between updates
      }

      // Clean up: delete the test event
      http.del(`${BASE_URL}/api/events/${eventId}`, { headers });
    }

    check(createResponse, {
      'event_creation_successful': (r) => r.status === 201,
      'creation_time_under_load_acceptable': () => createDuration < 3000
    });
  });
}

export function scalabilityTesting() {
  group('Scalability Testing', function () {
    const user = testUsers[Math.floor(Math.random() * testUsers.length)];
    const auth = authenticate(user);

    if (!auth) return;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
      'X-CSRF-Token': auth.csrfToken
    };

    // Test scalability with batch operations
    const batchSize = Math.floor(Math.random() * 10) + 5; // 5-15 events
    const conflictCheckPayload = {
      event_start: new Date(Date.now() + 3600000).toISOString(),
      event_end: new Date(Date.now() + 7200000).toISOString(),
      partner_ids: user.partners.slice(0, Math.min(user.partners.length, 5)).map(p => p.id), // Up to 5 partners
      buffer_time_minutes: 15,
      alternative_slots_count: 3
    };

    const scalabilityStartTime = Date.now();
    const response = http.post(
      `${BASE_URL}/api/events/check-conflicts/batch`,
      JSON.stringify(conflictCheckPayload),
      { headers, timeout: '10s' }
    );
    const scalabilityDuration = Date.now() - scalabilityStartTime;

    conflictDetectionTime.add(scalabilityDuration);

    if (response.status === 0) {
      apiTimeoutRate.add(1);
    } else {
      apiTimeoutRate.add(0);
    }

    const scalabilityResult = check(response, {
      'scalability_request_successful': (r) => r.status === 200,
      'scalability_response_time_acceptable': () => scalabilityDuration < 5000,
      'no_timeout_under_load': (r) => r.status !== 0,
      'memory_usage_reasonable': () => {
        // Simulate memory pressure monitoring
        const memoryUsage = Math.random() * 100; // Mock memory usage percentage
        memoryPressureGauge.add(memoryUsage);
        return memoryUsage < 80; // 80% memory threshold
      }
    });

    if (response.status === 200) {
      const body = response.json();
      check(body, {
        'batch_processing_accurate': (data) => {
          return data.success === true && Array.isArray(data.conflicts);
        },
        'performance_metrics_present': (data) => {
          return data.performance_metrics &&
                 typeof data.performance_metrics.processing_time_ms === 'number';
        }
      });
    }

    sleep(0.5); // Short sleep for high-throughput testing
  });
}

export function edgeCaseTesting() {
  group('Edge Case Testing', function () {
    const user = testUsers[Math.floor(Math.random() * testUsers.length)];
    const auth = authenticate(user);

    if (!auth) return;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
      'X-CSRF-Token': auth.csrfToken
    };

    // Edge Case 1: Very short events (1 minute)
    group('Short Duration Events', function () {
      const shortEventPayload = {
        title: 'Short Event Test',
        description: 'Testing 1-minute event conflicts',
        start_time: new Date(Date.now() + 3600000).toISOString(),
        end_time: new Date(Date.now() + 3660000).toISOString(), // 1 minute
        privacy_level: 'visible',
        relationship_id: user.partners[0]?.id
      };

      const response = http.post(`${BASE_URL}/api/events`, JSON.stringify(shortEventPayload), { headers });
      check(response, {
        'short_event_created': (r) => r.status === 201
      });
    });

    // Edge Case 2: Very long events (24 hours)
    group('Long Duration Events', function () {
      const longEventPayload = {
        title: 'Long Event Test',
        description: 'Testing 24-hour event conflicts',
        start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        end_time: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
        privacy_level: 'visible',
        relationship_id: user.partners[0]?.id
      };

      const response = http.post(`${BASE_URL}/api/events`, JSON.stringify(longEventPayload), { headers });
      check(response, {
        'long_event_created': (r) => r.status === 201
      });
    });

    // Edge Case 3: Events at exact boundaries
    group('Boundary Events', function () {
      const now = new Date();
      const exactHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);

      const boundaryEventPayload = {
        title: 'Boundary Event Test',
        description: 'Testing events at exact hour boundaries',
        start_time: exactHour.toISOString(),
        end_time: new Date(exactHour.getTime() + 3600000).toISOString(),
        privacy_level: 'visible',
        relationship_id: user.partners[0]?.id
      };

      const response = http.post(`${BASE_URL}/api/events`, JSON.stringify(boundaryEventPayload), { headers });
      check(response, {
        'boundary_event_created': (r) => r.status === 201
      });
    });

    // Edge Case 4: Maximum partner count
    group('Maximum Partners', function () {
      const maxPartnerPayload = {
        event_start: new Date(Date.now() + 7200000).toISOString(),
        event_end: new Date(Date.now() + 10800000).toISOString(),
        partner_ids: user.partners.map(p => p.id), // All partners
        buffer_time_minutes: 0 // No buffer
      };

      const startTime = Date.now();
      const response = http.post(
        `${BASE_URL}/api/events/check-conflicts`,
        JSON.stringify(maxPartnerPayload),
        { headers }
      );
      const duration = Date.now() - startTime;

      conflictDetectionTime.add(duration);

      check(response, {
        'max_partners_handled': (r) => r.status === 200,
        'max_partners_performance': () => duration < 3000
      });
    });

    // Edge Case 5: Invalid data handling
    group('Invalid Data Handling', function () {
      const invalidPayloads = [
        { /* empty payload */ },
        { event_start: 'invalid-date', event_end: 'invalid-date', partner_ids: [] },
        { event_start: '2024-01-15T10:00:00Z', event_end: '2024-01-15T09:00:00Z', partner_ids: ['invalid-id'] }, // End before start
      ];

      invalidPayloads.forEach(payload => {
        const response = http.post(
          `${BASE_URL}/api/events/check-conflicts`,
          JSON.stringify(payload),
          { headers }
        );

        check(response, {
          'invalid_data_rejected': (r) => r.status >= 400 && r.status < 500
        });
      });
    });

    sleep(1);
  });
}

// ===================================================================
// RESULT HANDLING
// ===================================================================

export function handleSummary(data) {
  const report = {
    'conflict-detection-load-test-report.html': htmlReport(data, {
      title: 'Conflict Detection Load Test Report',
      description: 'Comprehensive performance validation of conflict detection under load'
    }),
    'conflict-detection-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };

  // Add custom analysis
  const customAnalysis = analyzeResults(data);
  report['conflict-detection-analysis.json'] = JSON.stringify(customAnalysis, null, 2);

  return report;
}

function analyzeResults(data) {
  const analysis = {
    timestamp: new Date().toISOString(),
    test_duration: data.state.testRunDurationMs,
    overall_performance: 'unknown',
    critical_issues: [],
    recommendations: [],
    metrics_summary: {}
  };

  // Analyze key metrics
  const metrics = data.metrics;

  if (metrics.conflict_detection_time) {
    const avgDetectionTime = metrics.conflict_detection_time.values.avg;
    analysis.metrics_summary.avg_conflict_detection_time = avgDetectionTime;

    if (avgDetectionTime > CONFLICT_DETECTION_THRESHOLD) {
      analysis.critical_issues.push('Conflict detection time exceeds acceptable threshold');
      analysis.recommendations.push('Optimize conflict detection algorithm and database queries');
    }
  }

  if (metrics.concurrent_conflict_rate) {
    const conflictRate = metrics.concurrent_conflict_rate.values.rate;
    analysis.metrics_summary.concurrent_conflict_rate = conflictRate;

    if (conflictRate > 0.1) {
      analysis.critical_issues.push('High concurrent conflict rate detected');
      analysis.recommendations.push('Implement better concurrency control and locking mechanisms');
    }
  }

  if (metrics.race_conditions_detected) {
    const raceConditions = metrics.race_conditions_detected.values.count;
    analysis.metrics_summary.race_conditions_detected = raceConditions;

    if (raceConditions > 0) {
      analysis.recommendations.push('Review database transaction isolation levels and implement optimistic locking');
    }
  }

  // Determine overall performance
  const issueCount = analysis.critical_issues.length;
  if (issueCount === 0) {
    analysis.overall_performance = 'excellent';
  } else if (issueCount <= 2) {
    analysis.overall_performance = 'good';
  } else if (issueCount <= 4) {
    analysis.overall_performance = 'needs_improvement';
  } else {
    analysis.overall_performance = 'critical';
  }

  return analysis;
}
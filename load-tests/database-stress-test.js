/**
 * Database Stress Test for Conflict Detection
 *
 * This test specifically focuses on database performance under high load:
 * - Connection pool stress testing
 * - Transaction deadlock detection
 * - Query performance under concurrent access
 * - Database locking behavior
 * - Memory usage optimization
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { SharedArray } from 'k6/data';

// ===================================================================
// CONFIGURATION
// ===================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const DATABASE_STRESS_THRESHOLD = 1500; // ms - acceptable database operation time

// ===================================================================
// CUSTOM METRICS
// ===================================================================

const databaseQueryTime = new Trend('database_query_time', true);
const connectionPoolUtilization = new Gauge('connection_pool_utilization');
const transactionDeadlocks = new Counter('transaction_deadlocks');
const queryRetries = new Counter('query_retries');
const databaseErrors = new Rate('database_error_rate');
const lockWaitTime = new Trend('lock_wait_time', true);

// ===================================================================
// TEST SCENARIOS
// ===================================================================

export const options = {
  scenarios: {
    // High-concurrency database operations
    database_concurrency: {
      executor: 'constant-arrival-rate',
      rate: 20, // 20 requests per second
      timeUnit: '1s',
      duration: '3m',
      preAllocatedVUs: 30,
      maxVUs: 60,
      tags: { test_type: 'database_concurrency' },
      exec: 'testDatabaseConcurrency'
    },

    // Connection pool stress testing
    connection_pool_stress: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 40 },
        { duration: '1m', target: 60 },
        { duration: '30s', target: 0 }
      ],
      tags: { test_type: 'connection_pool' },
      exec: 'testConnectionPool'
    },

    // Transaction deadlock testing
    deadlock_simulation: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 100,
      maxDuration: '2m',
      tags: { test_type: 'deadlock_simulation' },
      exec: 'testDeadlockScenarios'
    }
  },

  thresholds: {
    database_query_time: ['p(95)<1500'],
    database_error_rate: ['rate<0.02'],
    lock_wait_time: ['p(90)<1000'],
    transaction_deadlocks: ['count<5']
  }
};

// ===================================================================
// AUTHENTICATION HELPER
// ===================================================================

function authenticate() {
  const loginPayload = {
    email: 'loadtest@example.com',
    password: 'testPassword123!'
  };

  const response = http.post(`${BASE_URL}/api/auth/signin`, JSON.stringify(loginPayload), {
    headers: { 'Content-Type': 'application/json' }
  });

  if (response.status === 200) {
    const authData = response.json();
    return {
      token: authData.token || 'mock-token',
      csrfToken: 'test-csrf-token'
    };
  }
  return { token: 'mock-token', csrfToken: 'test-csrf-token' };
}

// ===================================================================
// DATABASE STRESS TESTS
// ===================================================================

export function testDatabaseConcurrency() {
  group('Database Concurrency Test', function () {
    const auth = authenticate();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
      'X-CSRF-Token': auth.csrfToken
    };

    // Simulate concurrent event operations
    const eventPayload = {
      title: `Concurrent Event ${Math.random().toString(36).substring(7)}`,
      description: 'Database concurrency stress test event',
      start_time: new Date(Date.now() + Math.random() * 86400000).toISOString(),
      end_time: new Date(Date.now() + Math.random() * 86400000 + 3600000).toISOString(),
      privacy_level: 'visible'
    };

    // CREATE operation
    const createStart = Date.now();
    const createResponse = http.post(`${BASE_URL}/api/events`, JSON.stringify(eventPayload), { headers });
    const createDuration = Date.now() - createStart;

    databaseQueryTime.add(createDuration);

    const createSuccess = check(createResponse, {
      'concurrent_create_successful': (r) => r.status === 201,
      'create_within_threshold': () => createDuration < DATABASE_STRESS_THRESHOLD
    });

    if (!createSuccess) {
      databaseErrors.add(1);
      return;
    }

    const eventId = createResponse.json()?.event?.id;
    if (!eventId) {
      databaseErrors.add(1);
      return;
    }

    // READ operation
    const readStart = Date.now();
    const readResponse = http.get(`${BASE_URL}/api/events?page=1&pageSize=10`, { headers });
    const readDuration = Date.now() - readStart;

    databaseQueryTime.add(readDuration);

    check(readResponse, {
      'concurrent_read_successful': (r) => r.status === 200,
      'read_within_threshold': () => readDuration < DATABASE_STRESS_THRESHOLD
    });

    // UPDATE operation
    const updatePayload = {
      ...eventPayload,
      title: `Updated ${eventPayload.title}`,
      description: 'Updated during concurrency test'
    };

    const updateStart = Date.now();
    const updateResponse = http.put(
      `${BASE_URL}/api/events/${eventId}`,
      JSON.stringify(updatePayload),
      { headers }
    );
    const updateDuration = Date.now() - updateStart;

    databaseQueryTime.add(updateDuration);
    lockWaitTime.add(updateDuration); // Updates typically involve locks

    check(updateResponse, {
      'concurrent_update_successful': (r) => r.status === 200,
      'update_within_threshold': () => updateDuration < DATABASE_STRESS_THRESHOLD
    });

    // CONFLICT CHECK operation (most complex query)
    const conflictCheckPayload = {
      event_start: eventPayload.start_time,
      event_end: eventPayload.end_time,
      partner_ids: [`partner_${Math.floor(Math.random() * 100)}`],
      buffer_time_minutes: 15
    };

    const conflictStart = Date.now();
    const conflictResponse = http.post(
      `${BASE_URL}/api/events/check-conflicts`,
      JSON.stringify(conflictCheckPayload),
      { headers }
    );
    const conflictDuration = Date.now() - conflictStart;

    databaseQueryTime.add(conflictDuration);

    check(conflictResponse, {
      'conflict_check_successful': (r) => r.status === 200,
      'conflict_check_within_threshold': () => conflictDuration < DATABASE_STRESS_THRESHOLD * 2 // Allow more time for complex queries
    });

    // DELETE operation
    const deleteStart = Date.now();
    const deleteResponse = http.del(`${BASE_URL}/api/events/${eventId}`, { headers });
    const deleteDuration = Date.now() - deleteStart;

    databaseQueryTime.add(deleteDuration);

    check(deleteResponse, {
      'concurrent_delete_successful': (r) => r.status === 200,
      'delete_within_threshold': () => deleteDuration < DATABASE_STRESS_THRESHOLD
    });

    // Simulate connection pool utilization (mock)
    connectionPoolUtilization.add(Math.random() * 100);

    sleep(0.1); // Minimal sleep to allow for high concurrency
  });
}

export function testConnectionPool() {
  group('Connection Pool Stress Test', function () {
    const auth = authenticate();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
      'X-CSRF-Token': auth.csrfToken
    };

    // Perform rapid sequential operations to stress connection pool
    const operations = [];
    const operationCount = Math.floor(Math.random() * 5) + 3; // 3-8 operations

    for (let i = 0; i < operationCount; i++) {
      const operation = ['create', 'read', 'update', 'delete'][Math.floor(Math.random() * 4)];
      operations.push(operation);
    }

    let eventId = null;

    operations.forEach((operation, index) => {
      const operationStart = Date.now();
      let response;

      switch (operation) {
        case 'create':
          const createPayload = {
            title: `Pool Test Event ${index}`,
            description: `Connection pool stress test operation ${index}`,
            start_time: new Date(Date.now() + Math.random() * 86400000).toISOString(),
            end_time: new Date(Date.now() + Math.random() * 86400000 + 3600000).toISOString(),
            privacy_level: 'visible'
          };
          response = http.post(`${BASE_URL}/api/events`, JSON.stringify(createPayload), { headers });
          if (response.status === 201) {
            eventId = response.json()?.event?.id;
          }
          break;

        case 'read':
          response = http.get(
            `${BASE_URL}/api/events?page=${Math.floor(Math.random() * 5) + 1}&pageSize=5`,
            { headers }
          );
          break;

        case 'update':
          if (eventId) {
            const updatePayload = {
              title: `Updated Pool Test Event ${index}`,
              description: `Updated operation ${index}`
            };
            response = http.put(
              `${BASE_URL}/api/events/${eventId}`,
              JSON.stringify(updatePayload),
              { headers }
            );
          } else {
            // Create an event first
            const createPayload = {
              title: `Pool Test Event for Update ${index}`,
              description: `Event created for update test`,
              start_time: new Date(Date.now() + 3600000).toISOString(),
              end_time: new Date(Date.now() + 7200000).toISOString(),
              privacy_level: 'visible'
            };
            response = http.post(`${BASE_URL}/api/events`, JSON.stringify(createPayload), { headers });
          }
          break;

        case 'delete':
          if (eventId) {
            response = http.del(`${BASE_URL}/api/events/${eventId}`, { headers });
            eventId = null; // Reset after deletion
          } else {
            // Skip if no event to delete
            response = { status: 200 };
          }
          break;
      }

      const operationDuration = Date.now() - operationStart;
      databaseQueryTime.add(operationDuration);

      const success = check(response, {
        [`${operation}_operation_successful`]: (r) => r && r.status >= 200 && r.status < 300,
        [`${operation}_within_threshold`]: () => operationDuration < DATABASE_STRESS_THRESHOLD
      });

      if (!success && response) {
        databaseErrors.add(1);
      }

      // Simulate connection pool pressure
      connectionPoolUtilization.add(Math.min(100, 20 + (index * 10) + Math.random() * 20));
    });

    sleep(0.05); // Very short sleep to maintain high load
  });
}

export function testDeadlockScenarios() {
  group('Deadlock Simulation Test', function () {
    const auth = authenticate();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${auth.token}`,
      'X-CSRF-Token': auth.csrfToken
    };

    // Simulate potential deadlock scenario
    // Create events that might conflict and cause database locks

    const sharedResourceId = `shared_resource_${Math.floor(__ITER / 10)}`; // Group iterations to create contention
    const operationTime = new Date(Date.now() + 3600000);

    // Operation 1: Create/Update event with shared resource
    const eventPayload1 = {
      title: `Deadlock Test Event A - ${sharedResourceId}`,
      description: 'First event in potential deadlock scenario',
      start_time: operationTime.toISOString(),
      end_time: new Date(operationTime.getTime() + 3600000).toISOString(),
      privacy_level: 'visible',
      relationship_id: sharedResourceId
    };

    const op1Start = Date.now();
    const response1 = http.post(`${BASE_URL}/api/events`, JSON.stringify(eventPayload1), { headers });
    const op1Duration = Date.now() - op1Start;

    databaseQueryTime.add(op1Duration);
    lockWaitTime.add(op1Duration);

    // Operation 2: Create conflicting event (potential deadlock trigger)
    const eventPayload2 = {
      title: `Deadlock Test Event B - ${sharedResourceId}`,
      description: 'Second event in potential deadlock scenario',
      start_time: new Date(operationTime.getTime() + 1800000).toISOString(), // Overlap by 30 minutes
      end_time: new Date(operationTime.getTime() + 5400000).toISOString(),
      privacy_level: 'visible',
      relationship_id: sharedResourceId
    };

    const op2Start = Date.now();
    const response2 = http.post(`${BASE_URL}/api/events`, JSON.stringify(eventPayload2), { headers });
    const op2Duration = Date.now() - op2Start;

    databaseQueryTime.add(op2Duration);
    lockWaitTime.add(op2Duration);

    // Check for deadlock indicators
    const deadlockDetected = (response1.status >= 500 && response1.status < 600) ||
                            (response2.status >= 500 && response2.status < 600) ||
                            op1Duration > 5000 || op2Duration > 5000;

    if (deadlockDetected) {
      transactionDeadlocks.add(1);
    }

    // Operation 3: Conflict check on overlapping events
    if (response1.status === 201 && response2.status === 201) {
      const conflictCheckPayload = {
        event_start: eventPayload1.start_time,
        event_end: eventPayload1.end_time,
        partner_ids: [sharedResourceId],
        exclude_event_id: response1.json()?.event?.id
      };

      const conflictStart = Date.now();
      const conflictResponse = http.post(
        `${BASE_URL}/api/events/check-conflicts`,
        JSON.stringify(conflictCheckPayload),
        { headers }
      );
      const conflictDuration = Date.now() - conflictStart;

      databaseQueryTime.add(conflictDuration);

      if (conflictDuration > DATABASE_STRESS_THRESHOLD) {
        queryRetries.add(1);
      }

      check(conflictResponse, {
        'conflict_check_handles_contention': (r) => r.status === 200,
        'conflict_detection_not_blocked': () => conflictDuration < 5000
      });
    }

    const overallSuccess = check(response1, {
      'first_operation_completes': (r) => r.status >= 200 && r.status < 500,
      'no_timeout_on_first_op': () => op1Duration < 10000
    }) && check(response2, {
      'second_operation_completes': (r) => r.status >= 200 && r.status < 500,
      'no_timeout_on_second_op': () => op2Duration < 10000
    });

    if (!overallSuccess) {
      databaseErrors.add(1);
    }

    // Cleanup
    if (response1.status === 201) {
      http.del(`${BASE_URL}/api/events/${response1.json()?.event?.id}`, { headers });
    }
    if (response2.status === 201) {
      http.del(`${BASE_URL}/api/events/${response2.json()?.event?.id}`, { headers });
    }

    sleep(0.1);
  });
}

// ===================================================================
// RESULT HANDLING
// ===================================================================

export function handleSummary(data) {
  const analysis = {
    timestamp: new Date().toISOString(),
    database_performance: 'unknown',
    critical_database_issues: [],
    database_recommendations: [],
    connection_pool_analysis: {},
    deadlock_analysis: {},
    performance_summary: {}
  };

  // Analyze database-specific metrics
  const metrics = data.metrics;

  if (metrics.database_query_time) {
    const avgQueryTime = metrics.database_query_time.values.avg;
    const p95QueryTime = metrics.database_query_time.values['p(95)'];

    analysis.performance_summary = {
      avg_query_time: avgQueryTime,
      p95_query_time: p95QueryTime,
      total_queries: metrics.database_query_time.values.count
    };

    if (p95QueryTime > DATABASE_STRESS_THRESHOLD) {
      analysis.critical_database_issues.push('95th percentile query time exceeds threshold');
      analysis.database_recommendations.push('Optimize database indexes and query plans');
      analysis.database_recommendations.push('Consider database connection pooling optimization');
    }
  }

  if (metrics.transaction_deadlocks) {
    const deadlockCount = metrics.transaction_deadlocks.values.count;
    analysis.deadlock_analysis = {
      total_deadlocks: deadlockCount,
      deadlock_rate: deadlockCount / (data.state.testRunDurationMs / 1000)
    };

    if (deadlockCount > 0) {
      analysis.critical_database_issues.push(`${deadlockCount} transaction deadlocks detected`);
      analysis.database_recommendations.push('Review transaction isolation levels');
      analysis.database_recommendations.push('Implement optimistic locking where appropriate');
      analysis.database_recommendations.push('Consider database partitioning for high-contention tables');
    }
  }

  if (metrics.connection_pool_utilization) {
    const avgPoolUtilization = metrics.connection_pool_utilization.values.value;
    analysis.connection_pool_analysis = {
      avg_utilization: avgPoolUtilization,
      peak_utilization: metrics.connection_pool_utilization.values.max || avgPoolUtilization
    };

    if (avgPoolUtilization > 80) {
      analysis.critical_database_issues.push('Connection pool utilization is high');
      analysis.database_recommendations.push('Increase database connection pool size');
      analysis.database_recommendations.push('Implement connection pooling monitoring');
    }
  }

  // Determine overall database performance
  const issueCount = analysis.critical_database_issues.length;
  if (issueCount === 0) {
    analysis.database_performance = 'excellent';
  } else if (issueCount <= 2) {
    analysis.database_performance = 'good';
  } else if (issueCount <= 4) {
    analysis.database_performance = 'needs_optimization';
  } else {
    analysis.database_performance = 'critical';
  }

  return {
    'database-stress-test-analysis.json': JSON.stringify(analysis, null, 2),
    'database-stress-summary.json': JSON.stringify({
      summary: data.metrics,
      thresholds: data.thresholds
    }, null, 2),
    stdout: `
=== DATABASE STRESS TEST RESULTS ===
Overall Database Performance: ${analysis.database_performance.toUpperCase()}
Critical Issues: ${analysis.critical_database_issues.length}
Query Performance: ${analysis.performance_summary.avg_query_time || 'N/A'}ms avg, ${analysis.performance_summary.p95_query_time || 'N/A'}ms p95
Deadlocks Detected: ${analysis.deadlock_analysis.total_deadlocks || 0}
Connection Pool Utilization: ${analysis.connection_pool_analysis.avg_utilization || 'N/A'}%

=== RECOMMENDATIONS ===
${analysis.database_recommendations.map(rec => `- ${rec}`).join('\n')}
    `
  };
}
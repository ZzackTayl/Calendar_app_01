/**
 * Real-time System Testing Framework
 * 
 * Comprehensive testing framework for WebSocket connections, real-time subscriptions,
 * and state synchronization in the PolyHarmony Calendar application.
 */

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { getEnhancedRealtimeManager, EnhancedRealtimeManager } from '@/lib/supabase/enhanced-realtime-manager';

export interface RealtimeTestConfig {
  supabaseUrl: string;
  supabaseKey: string;
  testDuration?: number;
  maxConnections?: number;
  heartbeatInterval?: number;
}

export interface ConnectionTest {
  connectionId: string;
  userId: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  connectedAt?: number;
  disconnectedAt?: number;
  lastPing?: number;
  error?: string;
}

export interface SyncTest {
  testId: string;
  participants: string[];
  operation: 'create' | 'update' | 'delete';
  entity: 'event' | 'relationship' | 'user';
  expectedUpdates: number;
  receivedUpdates: number;
  latencies: number[];
  success: boolean;
  errors: string[];
}

export interface RecoveryTest {
  testId: string;
  connectionId: string;
  disconnectionType: 'network' | 'server' | 'client';
  recoveryTime: number;
  dataConsistency: boolean;
  missedUpdates: number;
  success: boolean;
}

export interface LoadTest {
  testId: string;
  concurrentConnections: number;
  operationsPerSecond: number;
  duration: number;
  successRate: number;
  averageLatency: number;
  peakMemoryUsage: number;
  errors: string[];
}

export interface OptimisticTest {
  testId: string;
  operation: string;
  optimisticState: any;
  serverState: any;
  conflictDetected: boolean;
  resolutionStrategy: 'client-wins' | 'server-wins' | 'merge';
  resolutionTime: number;
  success: boolean;
}

export interface ConflictTest {
  testId: string;
  conflictType: 'concurrent-edit' | 'overlapping-event' | 'relationship-status';
  participants: string[];
  detectionTime: number;
  resolutionTime: number;
  resolutionStrategy: string;
  success: boolean;
}

export class RealtimeTestFramework {
  private config: RealtimeTestConfig;
  private connections = new Map<string, SupabaseClient>();
  private realtimeManagers = new Map<string, EnhancedRealtimeManager>();
  private activeTests = new Map<string, any>();
  private testResults = new Map<string, any>();

  constructor(config: RealtimeTestConfig) {
    this.config = config;
  }

  /**
   * Initialize the testing framework
   */
  async initialize(): Promise<void> {
    console.log('[REALTIME-TEST] Initializing real-time testing framework...');
    
    // Verify Supabase connection
    const testClient = createClient(this.config.supabaseUrl, this.config.supabaseKey);
    const { error } = await testClient.from('users').select('count').limit(0);
    
    if (error) {
      throw new Error(`Failed to connect to Supabase: ${error.message}`);
    }
    
    console.log('[REALTIME-TEST] Framework initialized successfully');
  }

  /**
   * Test single user real-time connection
   */
  async testSingleUserConnection(userId: string): Promise<ConnectionTest> {
    const connectionId = `conn-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    const test: ConnectionTest = {
      connectionId,
      userId,
      status: 'connecting'
    };

    try {
      console.log(`[REALTIME-TEST] Testing single user connection: ${userId}`);
      
      // Create Supabase client for user
      const client = createClient(this.config.supabaseUrl, this.config.supabaseKey);
      
      // Create real-time manager
      const realtimeManager = getEnhancedRealtimeManager();
      await realtimeManager.initialize();
      
      // Store connections
      this.connections.set(connectionId, client);
      this.realtimeManagers.set(connectionId, realtimeManager);
      
      // Test subscription to user's events
      const subscriptionId = realtimeManager.subscribe(
        {
          table: 'events',
          filter: `user_id=eq.${userId}`,
          event: '*'
        },
        (payload) => {
          console.log(`[REALTIME-TEST] Received payload for ${userId}:`, payload);
          test.lastPing = Date.now();
        }
      );
      
      // Mark as connected
      test.status = 'connected';
      test.connectedAt = Date.now();
      
      // Wait for heartbeat
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test ping/pong
      if (test.lastPing && (Date.now() - test.lastPing < 5000)) {
        console.log(`[REALTIME-TEST] Connection test successful: ${userId}`);
      } else {
        test.status = 'error';
        test.error = 'No heartbeat received';
      }
      
    } catch (error) {
      test.status = 'error';
      test.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[REALTIME-TEST] Connection test failed: ${userId}`, error);
    }

    return test;
  }

  /**
   * Test multi-user synchronization
   */
  async testMultiUserSynchronization(userIds: string[]): Promise<SyncTest> {
    const testId = `sync-${Date.now()}`;
    const test: SyncTest = {
      testId,
      participants: userIds,
      operation: 'create',
      entity: 'event',
      expectedUpdates: userIds.length - 1, // All users except creator should receive update
      receivedUpdates: 0,
      latencies: [],
      success: false,
      errors: []
    };

    try {
      console.log(`[REALTIME-TEST] Testing multi-user synchronization with ${userIds.length} users`);
      
      // Create connections for all users
      const connections: Array<{ client: SupabaseClient; manager: EnhancedRealtimeManager }> = [];
      
      for (const userId of userIds) {
        const client = createClient(this.config.supabaseUrl, this.config.supabaseKey);
        const manager = getEnhancedRealtimeManager();
        await manager.initialize();
        
        // Subscribe to events
        manager.subscribe(
          {
            table: 'events',
            event: 'INSERT'
          },
          (payload) => {
            const receivedAt = Date.now();
            const latency = receivedAt - test.operationStartTime;
            test.latencies.push(latency);
            test.receivedUpdates++;
            
            console.log(`[REALTIME-TEST] User ${userId} received update with ${latency}ms latency`);
          }
        );
        
        connections.push({ client, manager });
      }
      
      // Wait for all connections to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create event from first user
      const creatorClient = connections[0].client;
      const eventData = {
        id: `test-event-${testId}`,
        user_id: userIds[0],
        title: `Sync Test Event ${testId}`,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString(),
        created_at: new Date().toISOString()
      };
      
      test.operationStartTime = Date.now();
      
      const { error } = await creatorClient
        .from('events')
        .insert(eventData);
      
      if (error) {
        throw new Error(`Failed to create test event: ${error.message}`);
      }
      
      // Wait for synchronization
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check results
      test.success = test.receivedUpdates >= test.expectedUpdates;
      
      if (!test.success) {
        test.errors.push(`Expected ${test.expectedUpdates} updates, received ${test.receivedUpdates}`);
      }
      
      console.log(`[REALTIME-TEST] Sync test ${test.success ? 'passed' : 'failed'}: ${testId}`);
      
      // Cleanup
      for (const { manager } of connections) {
        manager.cleanup();
      }
      
    } catch (error) {
      test.errors.push(error instanceof Error ? error.message : 'Unknown error');
      console.error(`[REALTIME-TEST] Sync test failed: ${testId}`, error);
    }

    return test;
  }

  /**
   * Test connection recovery after network interruption
   */
  async testConnectionRecovery(userId: string): Promise<RecoveryTest> {
    const testId = `recovery-${Date.now()}`;
    const connectionId = `conn-recovery-${testId}`;
    
    const test: RecoveryTest = {
      testId,
      connectionId,
      disconnectionType: 'network',
      recoveryTime: 0,
      dataConsistency: false,
      missedUpdates: 0,
      success: false
    };

    try {
      console.log(`[REALTIME-TEST] Testing connection recovery for user: ${userId}`);
      
      // Create initial connection
      const client = createClient(this.config.supabaseUrl, this.config.supabaseKey);
      const manager = getEnhancedRealtimeManager();
      await manager.initialize();
      
      let receivedUpdates = 0;
      const updates: any[] = [];
      
      // Subscribe to events
      const subscriptionId = manager.subscribe(
        {
          table: 'events',
          filter: `user_id=eq.${userId}`,
          event: '*'
        },
        (payload) => {
          receivedUpdates++;
          updates.push({ ...payload, receivedAt: Date.now() });
          console.log(`[REALTIME-TEST] Received update after recovery:`, payload);
        }
      );
      
      // Wait for initial connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create initial event to establish baseline
      const eventData = {
        id: `test-event-recovery-${testId}`,
        user_id: userId,
        title: `Recovery Test Event`,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString()
      };
      
      await client.from('events').insert(eventData);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate disconnection by recreating manager
      const disconnectTime = Date.now();
      manager.cleanup();
      
      // Create events during disconnection
      const eventsCreatedDuringDisconnection = 2;
      for (let i = 0; i < eventsCreatedDuringDisconnection; i++) {
        await client.from('events').insert({
          id: `test-event-during-disconnect-${testId}-${i}`,
          user_id: userId,
          title: `Event Created During Disconnect ${i}`,
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 3600000).toISOString()
        });
      }
      
      // Reconnect
      const reconnectTime = Date.now();
      const newManager = getEnhancedRealtimeManager();
      await newManager.initialize();
      
      // Reestablish subscription
      newManager.subscribe(
        {
          table: 'events',
          filter: `user_id=eq.${userId}`,
          event: '*'
        },
        (payload) => {
          receivedUpdates++;
          updates.push({ ...payload, receivedAt: Date.now() });
        }
      );
      
      // Create event after reconnection to test live updates
      await new Promise(resolve => setTimeout(resolve, 1000));
      await client.from('events').insert({
        id: `test-event-after-recovery-${testId}`,
        user_id: userId,
        title: `Event After Recovery`,
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString()
      });
      
      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const recoveryCompleteTime = Date.now();
      test.recoveryTime = recoveryCompleteTime - reconnectTime;
      
      // Check if we received the post-recovery event
      const postRecoveryUpdates = updates.filter(u => 
        u.receivedAt > reconnectTime && u.new?.title?.includes('After Recovery')
      );
      
      test.success = postRecoveryUpdates.length > 0;
      test.dataConsistency = test.success;
      test.missedUpdates = Math.max(0, eventsCreatedDuringDisconnection - (receivedUpdates - 1));
      
      console.log(`[REALTIME-TEST] Recovery test ${test.success ? 'passed' : 'failed'}: ${testId}`);
      console.log(`[REALTIME-TEST] Recovery time: ${test.recoveryTime}ms, Missed updates: ${test.missedUpdates}`);
      
      // Cleanup
      newManager.cleanup();
      
    } catch (error) {
      console.error(`[REALTIME-TEST] Recovery test failed: ${testId}`, error);
    }

    return test;
  }

  /**
   * Test system under load with multiple concurrent connections
   */
  async testLoadHandling(concurrentConnections: number, duration: number): Promise<LoadTest> {
    const testId = `load-${Date.now()}`;
    
    const test: LoadTest = {
      testId,
      concurrentConnections,
      operationsPerSecond: 0,
      duration,
      successRate: 0,
      averageLatency: 0,
      peakMemoryUsage: 0,
      errors: []
    };

    try {
      console.log(`[REALTIME-TEST] Testing load handling: ${concurrentConnections} connections for ${duration}ms`);
      
      const connections: Array<{
        id: string;
        client: SupabaseClient;
        manager: EnhancedRealtimeManager;
        operationCount: number;
        errors: number;
        latencies: number[];
      }> = [];
      
      // Create concurrent connections
      for (let i = 0; i < concurrentConnections; i++) {
        const connectionId = `load-conn-${i}`;
        const client = createClient(this.config.supabaseUrl, this.config.supabaseKey);
        const manager = getEnhancedRealtimeManager();
        await manager.initialize();
        
        const conn = {
          id: connectionId,
          client,
          manager,
          operationCount: 0,
          errors: 0,
          latencies: []
        };
        
        // Subscribe to events
        manager.subscribe(
          {
            table: 'events',
            event: '*'
          },
          (payload) => {
            const latency = Date.now() - payload.commit_timestamp;
            conn.latencies.push(latency);
          }
        );
        
        connections.push(conn);
      }
      
      // Wait for all connections to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const startTime = Date.now();
      const endTime = startTime + duration;
      let totalOperations = 0;
      
      // Start load generation
      const loadInterval = setInterval(async () => {
        if (Date.now() >= endTime) {
          clearInterval(loadInterval);
          return;
        }
        
        // Pick random connection and perform operation
        const randomConn = connections[Math.floor(Math.random() * connections.length)];
        
        try {
          const operationStart = Date.now();
          
          await randomConn.client.from('events').insert({
            id: `load-event-${testId}-${totalOperations}`,
            user_id: `load-user-${Math.floor(Math.random() * 10)}`,
            title: `Load Test Event ${totalOperations}`,
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 3600000).toISOString()
          });
          
          const operationTime = Date.now() - operationStart;
          randomConn.latencies.push(operationTime);
          randomConn.operationCount++;
          totalOperations++;
          
        } catch (error) {
          randomConn.errors++;
          test.errors.push(`Operation ${totalOperations}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }, 100); // 10 operations per second
      
      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, duration));
      
      // Calculate results
      const actualDuration = Date.now() - startTime;
      test.operationsPerSecond = (totalOperations / actualDuration) * 1000;
      
      const allLatencies = connections.flatMap(c => c.latencies);
      test.averageLatency = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;
      
      const totalErrors = connections.reduce((sum, c) => sum + c.errors, 0);
      test.successRate = ((totalOperations - totalErrors) / totalOperations) * 100;
      
      console.log(`[REALTIME-TEST] Load test completed: ${testId}`);
      console.log(`[REALTIME-TEST] Operations/sec: ${test.operationsPerSecond.toFixed(2)}`);
      console.log(`[REALTIME-TEST] Success rate: ${test.successRate.toFixed(2)}%`);
      console.log(`[REALTIME-TEST] Average latency: ${test.averageLatency.toFixed(2)}ms`);
      
      // Cleanup
      for (const conn of connections) {
        conn.manager.cleanup();
      }
      
    } catch (error) {
      test.errors.push(error instanceof Error ? error.message : 'Unknown error');
      console.error(`[REALTIME-TEST] Load test failed: ${testId}`, error);
    }

    return test;
  }

  /**
   * Test concurrent event creation conflict detection
   */
  async testConcurrentEventConflicts(userIds: string[]): Promise<ConflictTest> {
    const testId = `conflict-${Date.now()}`;
    
    const test: ConflictTest = {
      testId,
      conflictType: 'overlapping-event',
      participants: userIds,
      detectionTime: 0,
      resolutionTime: 0,
      resolutionStrategy: 'server-wins',
      success: false
    };

    try {
      console.log(`[REALTIME-TEST] Testing concurrent event conflicts with ${userIds.length} users`);
      
      // Create connections for all users
      const connections = [];
      for (const userId of userIds) {
        const client = createClient(this.config.supabaseUrl, this.config.supabaseKey);
        const manager = getEnhancedRealtimeManager();
        await manager.initialize();
        
        connections.push({ userId, client, manager });
      }
      
      // Define overlapping time slot
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 3600000); // 1 hour later
      
      const conflictDetectionStart = Date.now();
      
      // Create overlapping events simultaneously
      const eventPromises = connections.map((conn, index) => 
        conn.client.from('events').insert({
          id: `conflict-event-${testId}-${index}`,
          user_id: conn.userId,
          title: `Conflicting Event ${index}`,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString()
        })
      );
      
      const results = await Promise.allSettled(eventPromises);
      
      test.detectionTime = Date.now() - conflictDetectionStart;
      
      // Analyze results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      // For conflict detection to work, some operations should fail or trigger warnings
      test.success = failed > 0 || successful < connections.length;
      
      console.log(`[REALTIME-TEST] Conflict test ${test.success ? 'passed' : 'failed'}: ${testId}`);
      console.log(`[REALTIME-TEST] Successful: ${successful}, Failed: ${failed}`);
      
      // Cleanup
      for (const conn of connections) {
        conn.manager.cleanup();
      }
      
    } catch (error) {
      console.error(`[REALTIME-TEST] Conflict test failed: ${testId}`, error);
    }

    return test;
  }

  /**
   * Get comprehensive test report
   */
  generateTestReport(): any {
    return {
      framework: 'RealtimeTestFramework',
      timestamp: new Date().toISOString(),
      results: Object.fromEntries(this.testResults),
      summary: {
        totalTests: this.testResults.size,
        passedTests: Array.from(this.testResults.values()).filter(r => r.success).length,
        failedTests: Array.from(this.testResults.values()).filter(r => !r.success).length
      }
    };
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    console.log('[REALTIME-TEST] Cleaning up test framework...');
    
    for (const manager of this.realtimeManagers.values()) {
      manager.cleanup();
    }
    
    this.connections.clear();
    this.realtimeManagers.clear();
    this.activeTests.clear();
    
    console.log('[REALTIME-TEST] Cleanup completed');
  }
}

// Export factory function
export function createRealtimeTestFramework(config: RealtimeTestConfig): RealtimeTestFramework {
  return new RealtimeTestFramework(config);
}

// Export test utilities
export const REALTIME_TEST_USERS = [
  'test-realtime-user-1',
  'test-realtime-user-2', 
  'test-realtime-user-3',
  'test-realtime-user-4',
  'test-realtime-user-5'
];

export const REALTIME_TEST_SCENARIOS = {
  BASIC_CONNECTION: 'basic-connection',
  MULTI_USER_SYNC: 'multi-user-sync',
  CONNECTION_RECOVERY: 'connection-recovery',
  LOAD_TESTING: 'load-testing',
  CONFLICT_DETECTION: 'conflict-detection'
};
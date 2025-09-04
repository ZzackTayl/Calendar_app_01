/**
 * Multi-User Scenario Testing Framework
 * 
 * Comprehensive framework for testing polyamorous relationship scenarios,
 * concurrent user interactions, and complex calendar coordination workflows.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types';
import { createDatabaseLifecycleManager, DatabaseLifecycleManager, TEST_SCENARIOS } from '@/tests/db/lifecycle-manager';
import { createRealtimeTestFramework, RealtimeTestFramework } from '@/tests/realtime/realtime-test-framework';

export interface MultiUserTestConfig {
  supabaseUrl: string;
  supabaseKey: string;
  serviceRoleKey: string;
  maxConcurrentUsers: number;
  testDuration: number;
  enableRealtime: boolean;
  enablePerformanceMetrics: boolean;
}

export interface TestUser {
  id: string;
  email: string;
  displayName: string;
  role: 'primary' | 'secondary' | 'metamour' | 'friend' | 'admin';
  client?: SupabaseClient;
  authToken?: string;
}

export interface RelationshipScenario {
  scenarioId: string;
  name: string;
  description: string;
  users: TestUser[];
  relationships: Array<{
    userId: string;
    partnerId: string;
    type: 'primary' | 'secondary' | 'tertiary' | 'friendly' | 'complicated';
    status: 'confirmed' | 'pending' | 'blocked' | 'paused';
  }>;
  expectedOutcomes: {
    conflictsDetected: number;
    notificationsSent: number;
    calendarEntriesCreated: number;
    permissionsValidated: boolean;
  };
}

export interface ConcurrentEventScenario {
  scenarioId: string;
  name: string;
  description: string;
  participants: TestUser[];
  events: Array<{
    createdBy: string;
    title: string;
    startTime: string;
    endTime: string;
    invitees: string[];
    priority: 'low' | 'medium' | 'high';
  }>;
  expectedConflicts: Array<{
    type: 'time-overlap' | 'resource-conflict' | 'relationship-boundary';
    severity: 'warning' | 'error' | 'critical';
    affectedUsers: string[];
  }>;
}

export interface PermissionTestScenario {
  scenarioId: string;
  name: string;
  description: string;
  actors: Array<{
    user: TestUser;
    actions: Array<{
      action: 'read' | 'write' | 'delete' | 'share';
      target: 'own-events' | 'partner-events' | 'shared-events' | 'private-events';
      expectedResult: 'allowed' | 'denied' | 'partial';
    }>;
  }>;
}

export interface ScenarioResult {
  scenarioId: string;
  success: boolean;
  duration: number;
  metrics: {
    usersParticipated: number;
    operationsExecuted: number;
    conflictsDetected: number;
    errorsEncountered: number;
    averageResponseTime: number;
    peakMemoryUsage: number;
  };
  validations: {
    dataConsistency: boolean;
    permissionEnforcement: boolean;
    realtimeSynchronization: boolean;
    conflictResolution: boolean;
  };
  errors: string[];
  warnings: string[];
}

export class MultiUserTestFramework {
  private config: MultiUserTestConfig;
  private dbLifecycle: DatabaseLifecycleManager;
  private realtimeFramework?: RealtimeTestFramework;
  private testUsers = new Map<string, TestUser>();
  private activeScenarios = new Map<string, any>();
  private results = new Map<string, ScenarioResult>();

  constructor(config: MultiUserTestConfig) {
    this.config = config;
    
    // Initialize database lifecycle manager
    this.dbLifecycle = createDatabaseLifecycleManager({
      url: config.supabaseUrl,
      serviceRoleKey: config.serviceRoleKey,
      isolationMode: 'cleanup'
    });

    // Initialize realtime framework if enabled
    if (config.enableRealtime) {
      this.realtimeFramework = createRealtimeTestFramework({
        supabaseUrl: config.supabaseUrl,
        supabaseKey: config.supabaseKey,
        testDuration: config.testDuration,
        maxConnections: config.maxConcurrentUsers
      });
    }
  }

  /**
   * Initialize the multi-user testing framework
   */
  async initialize(): Promise<void> {
    console.log('[MULTI-USER-TEST] Initializing framework...');
    
    // Initialize database lifecycle
    await this.dbLifecycle.initialize();
    
    // Initialize realtime framework if enabled
    if (this.realtimeFramework) {
      await this.realtimeFramework.initialize();
    }
    
    console.log('[MULTI-USER-TEST] Framework initialized successfully');
  }

  /**
   * Create test users for scenarios
   */
  async createTestUsers(count: number): Promise<TestUser[]> {
    console.log(`[MULTI-USER-TEST] Creating ${count} test users...`);
    
    const users: TestUser[] = [];
    const roles: TestUser['role'][] = ['primary', 'secondary', 'metamour', 'friend'];
    
    for (let i = 0; i < count; i++) {
      const user: TestUser = {
        id: `test-user-${i + 1}-${Date.now()}`,
        email: `testuser${i + 1}@polyharmony.test`,
        displayName: `Test User ${i + 1}`,
        role: roles[i % roles.length]
      };
      
      // Create Supabase client for user
      user.client = createClient(this.config.supabaseUrl, this.config.supabaseKey);
      
      users.push(user);
      this.testUsers.set(user.id, user);
    }
    
    // Seed users into database
    const userRecords = users.map(user => ({
      id: user.id,
      email: user.email,
      display_name: user.displayName,
      created_at: new Date().toISOString()
    }));
    
    const serviceClient = createClient(this.config.supabaseUrl, this.config.serviceRoleKey);
    const { error } = await serviceClient.from('users').insert(userRecords);
    
    if (error) {
      throw new Error(`Failed to create test users: ${error.message}`);
    }
    
    console.log(`[MULTI-USER-TEST] Created ${users.length} test users successfully`);
    return users;
  }

  /**
   * Execute polyamorous relationship scenario
   */
  async executeRelationshipScenario(scenario: RelationshipScenario): Promise<ScenarioResult> {
    const startTime = Date.now();
    console.log(`[MULTI-USER-TEST] Executing relationship scenario: ${scenario.name}`);
    
    const result: ScenarioResult = {
      scenarioId: scenario.scenarioId,
      success: false,
      duration: 0,
      metrics: {
        usersParticipated: scenario.users.length,
        operationsExecuted: 0,
        conflictsDetected: 0,
        errorsEncountered: 0,
        averageResponseTime: 0,
        peakMemoryUsage: 0
      },
      validations: {
        dataConsistency: false,
        permissionEnforcement: false,
        realtimeSynchronization: false,
        conflictResolution: false
      },
      errors: [],
      warnings: []
    };

    try {
      // Set up test environment
      await this.dbLifecycle.createTestEnvironment(scenario.scenarioId);
      
      // Create relationships between users
      const serviceClient = createClient(this.config.supabaseUrl, this.config.serviceRoleKey);
      const relationshipPromises = scenario.relationships.map(async (rel, index) => {
        const operationStart = Date.now();
        
        try {
          const { error } = await serviceClient.from('relationships').insert({
            id: `test-rel-${scenario.scenarioId}-${index}`,
            user_id: rel.userId,
            partner_id: rel.partnerId,
            relationship_type: rel.type,
            status: rel.status,
            created_at: new Date().toISOString()
          });
          
          if (error) {
            throw new Error(`Failed to create relationship: ${error.message}`);
          }
          
          const operationTime = Date.now() - operationStart;
          result.metrics.operationsExecuted++;
          result.metrics.averageResponseTime = 
            (result.metrics.averageResponseTime + operationTime) / result.metrics.operationsExecuted;
          
        } catch (error) {
          result.errors.push(`Relationship creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          result.metrics.errorsEncountered++;
        }
      });
      
      await Promise.all(relationshipPromises);
      
      // Validate relationship integrity
      await this.validateRelationshipIntegrity(scenario, result);
      
      // Test relationship permissions
      await this.testRelationshipPermissions(scenario, result);
      
      // Test conflict detection if enabled
      if (scenario.expectedOutcomes.conflictsDetected > 0) {
        await this.testRelationshipConflicts(scenario, result);
      }
      
      // Validate database state
      const validation = await this.dbLifecycle.validateState();
      result.validations.dataConsistency = validation.dataConsistency;
      result.validations.permissionEnforcement = validation.securityPolicies;
      
      // Check if scenario met expected outcomes
      result.success = this.validateScenarioOutcomes(scenario, result);
      
    } catch (error) {
      result.errors.push(`Scenario execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      result.duration = Date.now() - startTime;
      
      // Cleanup test environment
      try {
        await this.dbLifecycle.cleanupTestEnvironment(scenario.scenarioId);
      } catch (cleanupError) {
        result.warnings.push(`Cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : 'Unknown error'}`);
      }
    }

    this.results.set(scenario.scenarioId, result);
    console.log(`[MULTI-USER-TEST] Relationship scenario ${result.success ? 'passed' : 'failed'}: ${scenario.name}`);
    
    return result;
  }

  /**
   * Execute concurrent event creation scenario
   */
  async executeConcurrentEventScenario(scenario: ConcurrentEventScenario): Promise<ScenarioResult> {
    const startTime = Date.now();
    console.log(`[MULTI-USER-TEST] Executing concurrent event scenario: ${scenario.name}`);
    
    const result: ScenarioResult = {
      scenarioId: scenario.scenarioId,
      success: false,
      duration: 0,
      metrics: {
        usersParticipated: scenario.participants.length,
        operationsExecuted: 0,
        conflictsDetected: 0,
        errorsEncountered: 0,
        averageResponseTime: 0,
        peakMemoryUsage: 0
      },
      validations: {
        dataConsistency: false,
        permissionEnforcement: false,
        realtimeSynchronization: false,
        conflictResolution: false
      },
      errors: [],
      warnings: []
    };

    try {
      // Set up test environment
      await this.dbLifecycle.createTestEnvironment(scenario.scenarioId);
      
      // Create concurrent events
      const eventPromises = scenario.events.map(async (event, index) => {
        const creator = scenario.participants.find(u => u.id === event.createdBy);
        if (!creator?.client) {
          throw new Error(`Creator client not found for event ${index}`);
        }
        
        const operationStart = Date.now();
        
        try {
          const { error } = await creator.client.from('events').insert({
            id: `test-event-${scenario.scenarioId}-${index}`,
            user_id: event.createdBy,
            title: event.title,
            start_time: event.startTime,
            end_time: event.endTime,
            created_at: new Date().toISOString()
          });
          
          if (error) {
            // Check if this is an expected conflict
            const isExpectedConflict = scenario.expectedConflicts.some(conflict => 
              conflict.type === 'time-overlap' && 
              conflict.affectedUsers.includes(event.createdBy)
            );
            
            if (isExpectedConflict) {
              result.metrics.conflictsDetected++;
            } else {
              throw new Error(`Unexpected event creation error: ${error.message}`);
            }
          } else {
            const operationTime = Date.now() - operationStart;
            result.metrics.operationsExecuted++;
            result.metrics.averageResponseTime = 
              (result.metrics.averageResponseTime + operationTime) / result.metrics.operationsExecuted;
          }
          
        } catch (error) {
          result.errors.push(`Event creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          result.metrics.errorsEncountered++;
        }
      });
      
      // Execute all events concurrently to test for race conditions
      await Promise.allSettled(eventPromises);
      
      // Test real-time synchronization if enabled
      if (this.realtimeFramework) {
        const syncTest = await this.realtimeFramework.testMultiUserSynchronization(
          scenario.participants.map(p => p.id)
        );
        result.validations.realtimeSynchronization = syncTest.success;
      }
      
      // Validate conflict detection
      result.validations.conflictResolution = 
        result.metrics.conflictsDetected >= scenario.expectedConflicts.length;
      
      // Validate database state
      const validation = await this.dbLifecycle.validateState();
      result.validations.dataConsistency = validation.dataConsistency;
      
      result.success = result.validations.dataConsistency && 
                      result.validations.conflictResolution &&
                      result.metrics.errorsEncountered === 0;
      
    } catch (error) {
      result.errors.push(`Scenario execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      result.duration = Date.now() - startTime;
      
      // Cleanup
      try {
        await this.dbLifecycle.cleanupTestEnvironment(scenario.scenarioId);
      } catch (cleanupError) {
        result.warnings.push(`Cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : 'Unknown error'}`);
      }
    }

    this.results.set(scenario.scenarioId, result);
    console.log(`[MULTI-USER-TEST] Concurrent event scenario ${result.success ? 'passed' : 'failed'}: ${scenario.name}`);
    
    return result;
  }

  /**
   * Execute permission testing scenario
   */
  async executePermissionScenario(scenario: PermissionTestScenario): Promise<ScenarioResult> {
    const startTime = Date.now();
    console.log(`[MULTI-USER-TEST] Executing permission scenario: ${scenario.name}`);
    
    const result: ScenarioResult = {
      scenarioId: scenario.scenarioId,
      success: false,
      duration: 0,
      metrics: {
        usersParticipated: scenario.actors.length,
        operationsExecuted: 0,
        conflictsDetected: 0,
        errorsEncountered: 0,
        averageResponseTime: 0,
        peakMemoryUsage: 0
      },
      validations: {
        dataConsistency: false,
        permissionEnforcement: false,
        realtimeSynchronization: false,
        conflictResolution: false
      },
      errors: [],
      warnings: []
    };

    try {
      // Set up test environment
      await this.dbLifecycle.createTestEnvironment(scenario.scenarioId);
      
      let permissionTestsPassed = 0;
      let totalPermissionTests = 0;
      
      // Execute permission tests for each actor
      for (const actor of scenario.actors) {
        for (const actionTest of actor.actions) {
          totalPermissionTests++;
          const operationStart = Date.now();
          
          try {
            const testPassed = await this.executePermissionTest(actor.user, actionTest);
            
            if (testPassed) {
              permissionTestsPassed++;
            } else {
              result.warnings.push(
                `Permission test failed for ${actor.user.id}: ${actionTest.action} on ${actionTest.target}`
              );
            }
            
            const operationTime = Date.now() - operationStart;
            result.metrics.operationsExecuted++;
            result.metrics.averageResponseTime = 
              (result.metrics.averageResponseTime + operationTime) / result.metrics.operationsExecuted;
            
          } catch (error) {
            result.errors.push(
              `Permission test error for ${actor.user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
            result.metrics.errorsEncountered++;
          }
        }
      }
      
      // Calculate permission enforcement success rate
      const permissionSuccessRate = permissionTestsPassed / totalPermissionTests;
      result.validations.permissionEnforcement = permissionSuccessRate >= 0.9; // 90% success rate required
      
      // Validate database state
      const validation = await this.dbLifecycle.validateState();
      result.validations.dataConsistency = validation.dataConsistency;
      
      result.success = result.validations.permissionEnforcement && 
                      result.validations.dataConsistency;
      
    } catch (error) {
      result.errors.push(`Scenario execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      result.duration = Date.now() - startTime;
      
      // Cleanup
      try {
        await this.dbLifecycle.cleanupTestEnvironment(scenario.scenarioId);
      } catch (cleanupError) {
        result.warnings.push(`Cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : 'Unknown error'}`);
      }
    }

    this.results.set(scenario.scenarioId, result);
    console.log(`[MULTI-USER-TEST] Permission scenario ${result.success ? 'passed' : 'failed'}: ${scenario.name}`);
    
    return result;
  }

  /**
   * Validate relationship integrity
   */
  private async validateRelationshipIntegrity(scenario: RelationshipScenario, result: ScenarioResult): Promise<void> {
    const serviceClient = createClient(this.config.supabaseUrl, this.config.serviceRoleKey);
    
    // Check that all expected relationships were created
    const { data: relationships, error } = await serviceClient
      .from('relationships')
      .select('*')
      .like('id', `test-rel-${scenario.scenarioId}%`);
    
    if (error) {
      result.errors.push(`Failed to validate relationships: ${error.message}`);
      return;
    }
    
    if (relationships.length !== scenario.relationships.length) {
      result.errors.push(
        `Relationship count mismatch: expected ${scenario.relationships.length}, got ${relationships.length}`
      );
    }
  }

  /**
   * Test relationship permissions
   */
  private async testRelationshipPermissions(scenario: RelationshipScenario, result: ScenarioResult): Promise<void> {
    // Test that users can only see their own relationships and confirmed partner relationships
    for (const user of scenario.users) {
      if (!user.client) continue;
      
      try {
        const { data, error } = await user.client
          .from('relationships')
          .select('*');
        
        if (error) {
          // Check if this is expected based on RLS policies
          if (error.message.includes('permission')) {
            // This might be expected behavior
            continue;
          }
          result.errors.push(`Permission test failed for user ${user.id}: ${error.message}`);
        }
        
        // Validate that user only sees appropriate relationships
        if (data) {
          const inappropriateRelationships = data.filter(rel => 
            rel.user_id !== user.id && rel.partner_id !== user.id
          );
          
          if (inappropriateRelationships.length > 0) {
            result.errors.push(
              `User ${user.id} can see inappropriate relationships: ${inappropriateRelationships.length}`
            );
          }
        }
        
      } catch (error) {
        result.errors.push(`Permission test error for user ${user.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Test relationship conflicts
   */
  private async testRelationshipConflicts(scenario: RelationshipScenario, result: ScenarioResult): Promise<void> {
    // This would test for conflicts like:
    // - Duplicate relationships
    // - Incompatible relationship types
    // - Circular relationship dependencies
    
    console.log(`[MULTI-USER-TEST] Testing relationship conflicts for scenario: ${scenario.scenarioId}`);
    // Implementation would depend on specific conflict detection logic
  }

  /**
   * Execute individual permission test
   */
  private async executePermissionTest(
    user: TestUser, 
    actionTest: PermissionTestScenario['actors'][0]['actions'][0]
  ): Promise<boolean> {
    if (!user.client) return false;
    
    try {
      switch (actionTest.action) {
        case 'read':
          const { data, error: readError } = await user.client
            .from('events')
            .select('*');
          
          if (actionTest.expectedResult === 'denied') {
            return readError !== null;
          } else if (actionTest.expectedResult === 'allowed') {
            return readError === null;
          }
          break;
          
        case 'write':
          const { error: writeError } = await user.client
            .from('events')
            .insert({
              id: `perm-test-${user.id}-${Date.now()}`,
              user_id: user.id,
              title: 'Permission Test Event',
              start_time: new Date().toISOString(),
              end_time: new Date(Date.now() + 3600000).toISOString()
            });
          
          if (actionTest.expectedResult === 'denied') {
            return writeError !== null;
          } else if (actionTest.expectedResult === 'allowed') {
            return writeError === null;
          }
          break;
          
        case 'delete':
          // Create test event first, then try to delete
          const { data: createData, error: createError } = await user.client
            .from('events')
            .insert({
              id: `del-test-${user.id}-${Date.now()}`,
              user_id: user.id,
              title: 'Delete Test Event',
              start_time: new Date().toISOString(),
              end_time: new Date(Date.now() + 3600000).toISOString()
            })
            .select()
            .single();
          
          if (createError || !createData) return false;
          
          const { error: deleteError } = await user.client
            .from('events')
            .delete()
            .eq('id', createData.id);
          
          if (actionTest.expectedResult === 'denied') {
            return deleteError !== null;
          } else if (actionTest.expectedResult === 'allowed') {
            return deleteError === null;
          }
          break;
      }
      
    } catch (error) {
      console.error(`Permission test execution error:`, error);
      return false;
    }
    
    return false;
  }

  /**
   * Validate scenario outcomes against expectations
   */
  private validateScenarioOutcomes(scenario: RelationshipScenario, result: ScenarioResult): boolean {
    const outcomes = scenario.expectedOutcomes;
    
    // Check conflicts detected
    if (outcomes.conflictsDetected > 0 && result.metrics.conflictsDetected < outcomes.conflictsDetected) {
      result.warnings.push(`Expected ${outcomes.conflictsDetected} conflicts, detected ${result.metrics.conflictsDetected}`);
      return false;
    }
    
    // Check data consistency
    if (!result.validations.dataConsistency) {
      return false;
    }
    
    // Check permission enforcement
    if (outcomes.permissionsValidated && !result.validations.permissionEnforcement) {
      return false;
    }
    
    return result.errors.length === 0;
  }

  /**
   * Generate comprehensive test report
   */
  generateReport(): any {
    const results = Array.from(this.results.values());
    
    return {
      framework: 'MultiUserTestFramework',
      timestamp: new Date().toISOString(),
      config: this.config,
      summary: {
        totalScenarios: results.length,
        passedScenarios: results.filter(r => r.success).length,
        failedScenarios: results.filter(r => !r.success).length,
        totalUsers: this.testUsers.size,
        averageDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
        totalOperations: results.reduce((sum, r) => sum + r.metrics.operationsExecuted, 0)
      },
      results: results,
      recommendations: this.generateRecommendations(results)
    };
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(results: ScenarioResult[]): string[] {
    const recommendations: string[] = [];
    
    const failedScenarios = results.filter(r => !r.success);
    if (failedScenarios.length > 0) {
      recommendations.push(`${failedScenarios.length} scenarios failed - review error logs and fix underlying issues`);
    }
    
    const slowScenarios = results.filter(r => r.duration > 10000);
    if (slowScenarios.length > 0) {
      recommendations.push(`${slowScenarios.length} scenarios took over 10 seconds - consider performance optimization`);
    }
    
    const highErrorRate = results.filter(r => r.metrics.errorsEncountered > 0);
    if (highErrorRate.length > results.length * 0.1) {
      recommendations.push('High error rate detected - review error handling and validation logic');
    }
    
    return recommendations;
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    console.log('[MULTI-USER-TEST] Cleaning up framework...');
    
    if (this.realtimeFramework) {
      await this.realtimeFramework.cleanup();
    }
    
    this.testUsers.clear();
    this.activeScenarios.clear();
    
    console.log('[MULTI-USER-TEST] Cleanup completed');
  }
}

// Export predefined scenarios
export const RELATIONSHIP_SCENARIOS: RelationshipScenario[] = [
  {
    scenarioId: 'triad-formation',
    name: 'Triad Formation',
    description: 'Three users forming a complete triad relationship',
    users: [], // Will be populated during test
    relationships: [
      { userId: 'user1', partnerId: 'user2', type: 'primary', status: 'confirmed' },
      { userId: 'user2', partnerId: 'user3', type: 'secondary', status: 'confirmed' },
      { userId: 'user3', partnerId: 'user1', type: 'secondary', status: 'confirmed' }
    ],
    expectedOutcomes: {
      conflictsDetected: 0,
      notificationsSent: 6,
      calendarEntriesCreated: 0,
      permissionsValidated: true
    }
  },
  {
    scenarioId: 'complex-poly-network',
    name: 'Complex Polyamorous Network',
    description: 'Five users with overlapping relationships and varying types',
    users: [], // Will be populated during test
    relationships: [
      { userId: 'user1', partnerId: 'user2', type: 'primary', status: 'confirmed' },
      { userId: 'user1', partnerId: 'user3', type: 'secondary', status: 'confirmed' },
      { userId: 'user2', partnerId: 'user4', type: 'secondary', status: 'confirmed' },
      { userId: 'user3', partnerId: 'user5', type: 'friendly', status: 'confirmed' },
      { userId: 'user4', partnerId: 'user5', type: 'tertiary', status: 'pending' }
    ],
    expectedOutcomes: {
      conflictsDetected: 0,
      notificationsSent: 10,
      calendarEntriesCreated: 0,
      permissionsValidated: true
    }
  }
];

export const CONCURRENT_EVENT_SCENARIOS: ConcurrentEventScenario[] = [
  {
    scenarioId: 'overlapping-dates',
    name: 'Overlapping Date Conflicts',
    description: 'Multiple partners scheduling dates at overlapping times',
    participants: [], // Will be populated during test
    events: [
      {
        createdBy: 'user1',
        title: 'Date with Partner A',
        startTime: '2024-01-15T19:00:00Z',
        endTime: '2024-01-15T22:00:00Z',
        invitees: ['user2'],
        priority: 'high'
      },
      {
        createdBy: 'user1',
        title: 'Date with Partner B',
        startTime: '2024-01-15T20:00:00Z',
        endTime: '2024-01-15T23:00:00Z',
        invitees: ['user3'],
        priority: 'medium'
      }
    ],
    expectedConflicts: [
      {
        type: 'time-overlap',
        severity: 'warning',
        affectedUsers: ['user1', 'user2', 'user3']
      }
    ]
  }
];

// Export factory function
export function createMultiUserTestFramework(config: MultiUserTestConfig): MultiUserTestFramework {
  return new MultiUserTestFramework(config);
}
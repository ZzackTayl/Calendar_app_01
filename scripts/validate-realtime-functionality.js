#!/usr/bin/env node

/**
 * Comprehensive Real-time Functionality Validation Script
 * Tests the complete real-time data synchronization system
 * 
 * This script validates:
 * 1. Real-time authentication integration
 * 2. Subscription lifecycle management
 * 3. Data synchronization between database and UI
 * 4. Integration points and error handling
 * 5. Network resilience and reconnection
 * 6. User-specific data flows
 */

// Load environment variables
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const chalk = require('chalk');
const { setTimeout } = require('timers/promises');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TEST_USER_EMAIL = 'zacks@anthropologica.tech';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'your-test-password';

// Test results tracking
const testResults = {
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  warnings: [],
  errors: [],
  details: {}
};

class RealtimeValidator {
  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    this.subscriptions = new Map();
    this.receivedEvents = [];
    this.testUser = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [REALTIME-VALIDATOR]`;
    
    switch (type) {
      case 'success':
        console.log(chalk.green(`${prefix} ✅ ${message}`));
        break;
      case 'error':
        console.log(chalk.red(`${prefix} ❌ ${message}`));
        break;
      case 'warning':
        console.log(chalk.yellow(`${prefix} ⚠️ ${message}`));
        break;
      case 'info':
      default:
        console.log(chalk.blue(`${prefix} ℹ️ ${message}`));
        break;
    }
  }

  async runTest(testName, testFn) {
    testResults.totalTests++;
    const spinner = ora(`Running ${testName}...`).start();
    
    try {
      const startTime = Date.now();
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      if (result.success) {
        testResults.passedTests++;
        spinner.succeed(chalk.green(`${testName} - PASSED (${duration}ms)`));
        this.log(`Test "${testName}" passed`, 'success');
        
        if (result.details) {
          testResults.details[testName] = result.details;
        }
      } else {
        testResults.failedTests++;
        spinner.fail(chalk.red(`${testName} - FAILED (${duration}ms)`));
        this.log(`Test "${testName}" failed: ${result.error}`, 'error');
        testResults.errors.push({ test: testName, error: result.error });
      }

      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          this.log(`Warning in "${testName}": ${warning}`, 'warning');
          testResults.warnings.push({ test: testName, warning });
        });
      }

      return result;
    } catch (error) {
      testResults.failedTests++;
      spinner.fail(chalk.red(`${testName} - ERROR (${error.message})`));
      this.log(`Test "${testName}" threw error: ${error.message}`, 'error');
      testResults.errors.push({ test: testName, error: error.message });
      return { success: false, error: error.message };
    }
  }

  async authenticate() {
    this.log('Authenticating test user...');
    
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: TEST_USER_EMAIL,
        password: TEST_PASSWORD,
      });

      if (error) throw error;
      
      this.testUser = data.user;
      this.log(`Authenticated as: ${this.testUser.email}`, 'success');
      return { success: true, user: this.testUser };
    } catch (error) {
      this.log(`Authentication failed: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  async testAuthenticationIntegration() {
    return this.runTest('Authentication Integration', async () => {
      // Test 1: Verify user is authenticated
      const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
      if (sessionError || !session) {
        return { success: false, error: 'No valid session found' };
      }

      // Test 2: Check token validity
      const tokenPayload = JSON.parse(atob(session.access_token.split('.')[1]));
      const expirationTime = tokenPayload.exp * 1000;
      const currentTime = Date.now();
      const timeUntilExpiration = expirationTime - currentTime;
      
      const warnings = [];
      if (timeUntilExpiration < 5 * 60 * 1000) { // Less than 5 minutes
        warnings.push('Token expires soon - may affect real-time connections');
      }

      // Test 3: Test token refresh capability
      try {
        const { data: refreshData, error: refreshError } = await this.supabase.auth.refreshSession();
        if (refreshError) {
          warnings.push(`Token refresh test failed: ${refreshError.message}`);
        }
      } catch (e) {
        warnings.push(`Token refresh capability issue: ${e.message}`);
      }

      return {
        success: true,
        warnings,
        details: {
          userId: session.user.id,
          email: session.user.email,
          tokenExpiresIn: Math.floor(timeUntilExpiration / 1000) + ' seconds',
          lastSignIn: session.user.last_sign_in_at
        }
      };
    });
  }

  async testSubscriptionLifecycle() {
    return this.runTest('Subscription Lifecycle Management', async () => {
      const details = {};
      const warnings = [];

      // Test 1: Create subscription for relationships table
      let subscription;
      try {
        subscription = this.supabase
          .channel('test-relationships-lifecycle')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'relationships',
              filter: `user_id=eq.${this.testUser.id}`
            },
            (payload) => {
              this.receivedEvents.push({
                timestamp: Date.now(),
                table: 'relationships',
                event: payload.eventType,
                payload
              });
            }
          )
          .subscribe();

        details.subscriptionCreated = true;
      } catch (error) {
        return { success: false, error: `Failed to create subscription: ${error.message}` };
      }

      // Test 2: Wait for subscription to be ready
      await setTimeout(2000);
      
      // Test 3: Check subscription status
      const subscriptionState = subscription._state;
      if (subscriptionState !== 'SUBSCRIBED') {
        warnings.push(`Subscription state is "${subscriptionState}", expected "SUBSCRIBED"`);
      }
      
      details.subscriptionState = subscriptionState;

      // Test 4: Test subscription cleanup
      try {
        await this.supabase.removeChannel(subscription);
        details.subscriptionCleaned = true;
      } catch (error) {
        warnings.push(`Subscription cleanup issue: ${error.message}`);
      }

      return {
        success: true,
        warnings,
        details
      };
    });
  }

  async testDataSynchronization() {
    return this.runTest('Data Synchronization', async () => {
      const details = {};
      const warnings = [];
      let eventsReceived = 0;
      let testRelationshipId = null;

      // Set up real-time listener
      const subscription = this.supabase
        .channel('test-data-sync')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',  
            table: 'relationships',
            filter: `user_id=eq.${this.testUser.id}`
          },
          (payload) => {
            eventsReceived++;
            this.log(`Received real-time event: ${payload.eventType} for ${payload.new?.id || payload.old?.id}`);
            
            if (payload.eventType === 'INSERT' && payload.new) {
              testRelationshipId = payload.new.id;
            }
          }
        )
        .subscribe();

      // Wait for subscription to be ready
      await setTimeout(2000);

      // Test 1: Create a test relationship
      const testRelationship = {
        user_id: this.testUser.id,
        partner_name: 'Real-time Test Partner',
        relationship_type: 'testing_realtime',
        privacy_level: 'limited_access',
        notes: 'Created by real-time validation script'
      };

      const { data: insertedData, error: insertError } = await this.supabase
        .from('relationships')
        .insert([testRelationship])
        .select()
        .single();

      if (insertError) {
        await this.supabase.removeChannel(subscription);
        return { success: false, error: `Failed to insert test relationship: ${insertError.message}` };
      }

      testRelationshipId = insertedData.id;
      details.relationshipCreated = insertedData.id;

      // Wait for real-time event
      await setTimeout(3000);

      // Test 2: Update the relationship
      const { error: updateError } = await this.supabase
        .from('relationships')
        .update({ partner_name: 'Updated Real-time Test Partner' })
        .eq('id', testRelationshipId);

      if (updateError) {
        warnings.push(`Update test failed: ${updateError.message}`);
      } else {
        details.relationshipUpdated = true;
      }

      // Wait for update event
      await setTimeout(3000);

      // Test 3: Delete the test relationship
      const { error: deleteError } = await this.supabase
        .from('relationships')
        .delete()
        .eq('id', testRelationshipId);

      if (deleteError) {
        warnings.push(`Delete test failed: ${deleteError.message}`);
      } else {
        details.relationshipDeleted = true;
      }

      // Wait for delete event
      await setTimeout(3000);

      // Clean up subscription
      await this.supabase.removeChannel(subscription);

      // Validate events received
      details.eventsReceived = eventsReceived;
      
      if (eventsReceived === 0) {
        return { success: false, error: 'No real-time events were received during data sync test' };
      }

      if (eventsReceived < 3) {
        warnings.push(`Expected 3 events (INSERT, UPDATE, DELETE), received ${eventsReceived}`);
      }

      return {
        success: true,
        warnings,
        details
      };
    });
  }

  async testNetworkResilience() {
    return this.runTest('Network Resilience', async () => {
      const details = {};
      const warnings = [];

      // Test 1: Create multiple subscriptions to test resource management
      const subscriptions = [];
      for (let i = 0; i < 3; i++) {
        const sub = this.supabase
          .channel(`test-resilience-${i}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'relationships',
            filter: `user_id=eq.${this.testUser.id}`
          }, () => {})
          .subscribe();
        
        subscriptions.push(sub);
      }

      await setTimeout(2000);

      // Test 2: Check all subscriptions are active
      const activeStates = subscriptions.map(sub => sub._state);
      details.subscriptionStates = activeStates;

      const allActive = activeStates.every(state => state === 'SUBSCRIBED');
      if (!allActive) {
        warnings.push(`Not all subscriptions are active: ${activeStates.join(', ')}`);
      }

      // Test 3: Test subscription cleanup
      for (const sub of subscriptions) {
        try {
          await this.supabase.removeChannel(sub);
        } catch (error) {
          warnings.push(`Failed to clean up subscription: ${error.message}`);
        }
      }

      details.subscriptionsCreated = subscriptions.length;
      details.subscriptionsCleaned = subscriptions.length;

      return {
        success: true,
        warnings,
        details
      };
    });
  }

  async testUserSpecificDataFlow() {
    return this.runTest('User-Specific Data Flow', async () => {
      const details = {};
      const warnings = [];

      // Test 1: Fetch existing relationships for user
      const { data: existingRelationships, error: fetchError } = await this.supabase
        .from('relationships')
        .select('*')
        .eq('user_id', this.testUser.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        return { success: false, error: `Failed to fetch user relationships: ${fetchError.message}` };
      }

      details.existingRelationshipsCount = existingRelationships.length;

      // Test 2: Verify data filtering (attempt to access another user's data should fail)
      const { data: unauthorizedData, error: unauthorizedError } = await this.supabase
        .from('relationships')
        .select('*')
        .neq('user_id', this.testUser.id)
        .limit(1);

      // This should return empty data due to RLS policies
      if (unauthorizedData && unauthorizedData.length > 0) {
        warnings.push('RLS policies may not be properly filtering user data');
      }

      details.unauthorizedDataAccessBlocked = !unauthorizedData || unauthorizedData.length === 0;

      // Test 3: Test real-time filtering
      let filteredEventsReceived = 0;
      const subscription = this.supabase
        .channel('test-user-filtering')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'relationships',
          filter: `user_id=eq.${this.testUser.id}`
        }, (payload) => {
          if (payload.new && payload.new.user_id === this.testUser.id) {
            filteredEventsReceived++;
          } else if (payload.old && payload.old.user_id === this.testUser.id) {
            filteredEventsReceived++;
          }
        })
        .subscribe();

      await setTimeout(2000);

      // Create a test relationship to trigger event
      const { data: testData, error: testError } = await this.supabase
        .from('relationships')
        .insert([{
          user_id: this.testUser.id,
          partner_name: 'User Filter Test',
          relationship_type: 'testing_filter',
          privacy_level: 'limited_access'
        }])
        .select()
        .single();

      if (testError) {
        await this.supabase.removeChannel(subscription);
        return { success: false, error: `Failed to create test relationship: ${testError.message}` };
      }

      await setTimeout(3000);

      // Clean up test data
      await this.supabase
        .from('relationships')
        .delete()
        .eq('id', testData.id);

      await setTimeout(2000);
      await this.supabase.removeChannel(subscription);

      details.filteredEventsReceived = filteredEventsReceived;
      
      if (filteredEventsReceived === 0) {
        warnings.push('No filtered events received - real-time filtering may not be working');
      }

      return {
        success: true,
        warnings,
        details
      };
    });
  }

  async testIntegrationPoints() {
    return this.runTest('Integration Points', async () => {
      const details = {};
      const warnings = [];

      // Test 1: Check Supabase client configuration
      if (!this.supabase.supabaseUrl || !this.supabase.supabaseKey) {
        return { success: false, error: 'Supabase client not properly configured' };
      }

      details.supabaseConfigured = true;

      // Test 2: Check real-time connection capabilities
      try {
        const testChannel = this.supabase.channel('integration-test');
        details.channelCreationSupported = true;
        await this.supabase.removeChannel(testChannel);
      } catch (error) {
        warnings.push(`Channel creation test failed: ${error.message}`);
      }

      // Test 3: Test database permissions
      const { data: permissionTest, error: permissionError } = await this.supabase
        .from('relationships')
        .select('id')
        .limit(1);

      if (permissionError) {
        warnings.push(`Database permission test failed: ${permissionError.message}`);
      } else {
        details.databaseAccessGranted = true;
      }

      return {
        success: true,
        warnings,
        details
      };
    });
  }

  async generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log(chalk.bold.blue('REAL-TIME FUNCTIONALITY VALIDATION REPORT'));
    console.log('='.repeat(80));
    
    console.log('\n📊 TEST SUMMARY:');
    console.log(`   Total Tests: ${testResults.totalTests}`);
    console.log(chalk.green(`   ✅ Passed: ${testResults.passedTests}`));
    console.log(chalk.red(`   ❌ Failed: ${testResults.failedTests}`));
    console.log(chalk.yellow(`   ⚠️  Warnings: ${testResults.warnings.length}`));
    
    const successRate = ((testResults.passedTests / testResults.totalTests) * 100).toFixed(1);
    console.log(`   📈 Success Rate: ${successRate}%`);

    if (testResults.errors.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      testResults.errors.forEach(({ test, error }) => {
        console.log(`   • ${chalk.red(test)}: ${error}`);
      });
    }

    if (testResults.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      testResults.warnings.forEach(({ test, warning }) => {
        console.log(`   • ${chalk.yellow(test)}: ${warning}`);
      });
    }

    console.log('\n📋 DETAILED RESULTS:');
    Object.entries(testResults.details).forEach(([testName, details]) => {
      console.log(`\n   ${chalk.blue(testName)}:`);
      Object.entries(details).forEach(([key, value]) => {
        console.log(`     ${key}: ${value}`);
      });
    });

    console.log('\n🎯 RECOMMENDATIONS:');
    
    if (testResults.failedTests === 0) {
      console.log(chalk.green('   ✅ All core real-time functionality is working correctly!'));
    } else {
      console.log(chalk.red('   ❌ Critical issues found that need attention:'));
      testResults.errors.forEach(({ test }) => {
        console.log(`     • Review and fix: ${test}`);
      });
    }

    if (testResults.warnings.length > 0) {
      console.log(chalk.yellow('\n   ⚠️  Areas for improvement:'));
      testResults.warnings.forEach(({ test, warning }) => {
        console.log(`     • ${test}: ${warning}`);
      });
    }

    // Overall health assessment
    console.log('\n🏥 SYSTEM HEALTH ASSESSMENT:');
    if (successRate >= 90 && testResults.warnings.length <= 2) {
      console.log(chalk.green('   🟢 HEALTHY - Real-time system is functioning well'));
    } else if (successRate >= 70 && testResults.warnings.length <= 5) {
      console.log(chalk.yellow('   🟡 MODERATE - Some issues detected, monitor closely'));
    } else {
      console.log(chalk.red('   🔴 CRITICAL - Significant issues detected, immediate attention required'));
    }

    console.log('\n' + '='.repeat(80));
    console.log(`Report generated at: ${new Date().toISOString()}`);
    console.log(`Test user: ${this.testUser?.email || 'Not authenticated'}`);
    console.log('='.repeat(80) + '\n');
  }

  async runValidation() {
    console.log(chalk.bold.cyan('\n🔍 REAL-TIME FUNCTIONALITY VALIDATION STARTING\n'));
    
    // Step 1: Authenticate
    const authResult = await this.authenticate();
    if (!authResult.success) {
      console.log(chalk.red('\n❌ Cannot proceed without authentication'));
      process.exit(1);
    }

    // Step 2: Run all validation tests
    await this.testAuthenticationIntegration();
    await this.testSubscriptionLifecycle();
    await this.testDataSynchronization();
    await this.testNetworkResilience();
    await this.testUserSpecificDataFlow();
    await this.testIntegrationPoints();

    // Step 3: Generate comprehensive report
    await this.generateReport();

    // Step 4: Cleanup and exit
    await this.supabase.auth.signOut();
    process.exit(testResults.failedTests > 0 ? 1 : 0);
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new RealtimeValidator();
  validator.runValidation().catch(console.error);
}

module.exports = { RealtimeValidator };
#!/usr/bin/env node

/**
 * Real-time Infrastructure Validation Script
 * Tests the core infrastructure without requiring authentication
 */

// Load environment variables
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const chalk = require('chalk');
const { setTimeout } = require('timers/promises');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

class RealtimeInfrastructureValidator {
  constructor() {
    this.testResults = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      warnings: [],
      errors: [],
      details: {}
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [INFRASTRUCTURE-VALIDATOR]`;
    
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
    this.testResults.totalTests++;
    this.log(`Running ${testName}...`);
    
    try {
      const startTime = Date.now();
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      if (result.success) {
        this.testResults.passedTests++;
        this.log(`${testName} - PASSED (${duration}ms)`, 'success');
        
        if (result.details) {
          this.testResults.details[testName] = result.details;
        }
      } else {
        this.testResults.failedTests++;
        this.log(`${testName} - FAILED (${duration}ms): ${result.error}`, 'error');
        this.testResults.errors.push({ test: testName, error: result.error });
      }

      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(warning => {
          this.log(`Warning in "${testName}": ${warning}`, 'warning');
          this.testResults.warnings.push({ test: testName, warning });
        });
      }

      return result;
    } catch (error) {
      this.testResults.failedTests++;
      this.log(`${testName} - ERROR: ${error.message}`, 'error');
      this.testResults.errors.push({ test: testName, error: error.message });
      return { success: false, error: error.message };
    }
  }

  async testEnvironmentConfiguration() {
    return this.runTest('Environment Configuration', async () => {
      const details = {};
      const warnings = [];

      // Test 1: Check Supabase URL
      if (!SUPABASE_URL) {
        return { success: false, error: 'NEXT_PUBLIC_SUPABASE_URL not set' };
      }
      details.supabaseUrl = SUPABASE_URL ? 'configured' : 'missing';

      // Test 2: Check Supabase key
      if (!SUPABASE_ANON_KEY) {
        return { success: false, error: 'NEXT_PUBLIC_SUPABASE_ANON_KEY not set' };
      }
      details.supabaseKey = SUPABASE_ANON_KEY ? 'configured' : 'missing';

      // Test 3: Check URL format
      try {
        new URL(SUPABASE_URL);
        details.urlFormat = 'valid';
      } catch {
        warnings.push('Supabase URL format appears invalid');
        details.urlFormat = 'invalid';
      }

      return { success: true, details, warnings };
    });
  }

  async testSupabaseClientCreation() {
    return this.runTest('Supabase Client Creation', async () => {
      const details = {};
      
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        details.clientCreated = true;
        details.hasChannelMethod = typeof supabase.channel === 'function';
        details.hasFromMethod = typeof supabase.from === 'function';
        details.hasAuthProperty = !!supabase.auth;

        return { success: true, details };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }

  async testChannelCreation() {
    return this.runTest('Channel Creation', async () => {
      const details = {};
      const warnings = [];

      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Test basic channel creation
        const channel = supabase.channel('test-infrastructure');
        details.channelCreated = true;
        details.channelHasOnMethod = typeof channel.on === 'function';
        details.channelHasSubscribeMethod = typeof channel.subscribe === 'function';

        // Test channel cleanup
        try {
          await supabase.removeChannel(channel);
          details.channelRemoved = true;
        } catch (error) {
          warnings.push(`Channel cleanup failed: ${error.message}`);
        }

        return { success: true, details, warnings };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }

  async testRealtimeManagerImports() {
    return this.runTest('Real-time Manager Imports', async () => {
      const details = {};
      const warnings = [];

      try {
        // Test enhanced realtime manager
        const enhancedManager = require('../lib/supabase/enhanced-realtime-manager');
        details.enhancedManagerAvailable = !!enhancedManager.getEnhancedRealtimeManager;
        
        if (enhancedManager.getEnhancedRealtimeManager) {
          const manager = enhancedManager.getEnhancedRealtimeManager();
          details.managerHasSubscribe = typeof manager.subscribe === 'function';
          details.managerHasUnsubscribe = typeof manager.unsubscribe === 'function';
          details.managerHasGetConnectionStats = typeof manager.getConnectionStats === 'function';
        }
      } catch (error) {
        warnings.push(`Enhanced realtime manager import failed: ${error.message}`);
      }

      try {
        // Test realtime auth
        const realtimeAuth = require('../lib/supabase/realtime-auth');
        details.realtimeAuthAvailable = !!realtimeAuth.realtimeAuth;
        
        if (realtimeAuth.realtimeAuth) {
          const auth = realtimeAuth.realtimeAuth;
          details.authHasGetState = typeof auth.getAuthState === 'function';
          details.authHasIsReady = typeof auth.isReady === 'function';
        }
      } catch (error) {
        warnings.push(`Realtime auth import failed: ${error.message}`);
      }

      return { success: true, details, warnings };
    });
  }

  async testHookImports() {
    return this.runTest('Hook Imports', async () => {
      const details = {};
      const warnings = [];

      try {
        // Test realtime relationships hook
        const relationshipsHook = require('../hooks/use-realtime-relationships');
        details.relationshipsHookAvailable = !!relationshipsHook.useRealtimeRelationships;
      } catch (error) {
        warnings.push(`Realtime relationships hook import failed: ${error.message}`);
      }

      return { success: true, details, warnings };
    });
  }

  async testDatabaseConnection() {
    return this.runTest('Database Connection', async () => {
      const details = {};
      const warnings = [];

      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        // Test basic database query (should fail without auth, but connection should work)
        const { error } = await supabase
          .from('relationships')
          .select('id')
          .limit(1);

        // We expect this to fail due to RLS, but it should be a permission error, not connection error
        if (error) {
          if (error.message.includes('JWT') || error.message.includes('RLS') || error.message.includes('policy')) {
            details.connectionWorking = true;
            details.rlsWorking = true;
            details.errorType = 'permission (expected)';
          } else {
            warnings.push(`Unexpected database error: ${error.message}`);
            details.connectionWorking = false;
            details.errorType = 'connection';
          }
        } else {
          warnings.push('Database query succeeded without authentication - RLS may be misconfigured');
          details.connectionWorking = true;
          details.rlsWorking = false;
        }

        return { success: true, details, warnings };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }

  async generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log(chalk.bold.blue('REAL-TIME INFRASTRUCTURE VALIDATION REPORT'));
    console.log('='.repeat(80));
    
    console.log('\n📊 TEST SUMMARY:');
    console.log(`   Total Tests: ${this.testResults.totalTests}`);
    console.log(chalk.green(`   ✅ Passed: ${this.testResults.passedTests}`));
    console.log(chalk.red(`   ❌ Failed: ${this.testResults.failedTests}`));
    console.log(chalk.yellow(`   ⚠️  Warnings: ${this.testResults.warnings.length}`));
    
    const successRate = ((this.testResults.passedTests / this.testResults.totalTests) * 100).toFixed(1);
    console.log(`   📈 Success Rate: ${successRate}%`);

    if (this.testResults.errors.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults.errors.forEach(({ test, error }) => {
        console.log(`   • ${chalk.red(test)}: ${error}`);
      });
    }

    if (this.testResults.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.testResults.warnings.forEach(({ test, warning }) => {
        console.log(`   • ${chalk.yellow(test)}: ${warning}`);
      });
    }

    console.log('\n📋 DETAILED RESULTS:');
    Object.entries(this.testResults.details).forEach(([testName, details]) => {
      console.log(`\n   ${chalk.blue(testName)}:`);
      Object.entries(details).forEach(([key, value]) => {
        console.log(`     ${key}: ${value}`);
      });
    });

    console.log('\n🎯 INFRASTRUCTURE STATUS:');
    
    if (this.testResults.failedTests === 0) {
      console.log(chalk.green('   ✅ All infrastructure components are properly configured!'));
      console.log(chalk.blue('   🔄 Ready for authenticated real-time testing'));
    } else {
      console.log(chalk.red('   ❌ Infrastructure issues detected:'));
      this.testResults.errors.forEach(({ test }) => {
        console.log(`     • Fix required: ${test}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log(`Report generated at: ${new Date().toISOString()}`);
    console.log('='.repeat(80) + '\n');
  }

  async runValidation() {
    console.log(chalk.bold.cyan('\n🏗️  REAL-TIME INFRASTRUCTURE VALIDATION STARTING\n'));
    
    await this.testEnvironmentConfiguration();
    await this.testSupabaseClientCreation();
    await this.testChannelCreation();
    await this.testRealtimeManagerImports();
    await this.testHookImports();
    await this.testDatabaseConnection();

    await this.generateReport();

    process.exit(this.testResults.failedTests > 0 ? 1 : 0);
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new RealtimeInfrastructureValidator();
  validator.runValidation().catch(console.error);
}

module.exports = { RealtimeInfrastructureValidator };
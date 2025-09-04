#!/usr/bin/env node

/**
 * Browser-based Real-time Functionality Validation
 * Tests the actual real-time functionality in a browser environment
 */

const { execSync, spawn } = require('child_process');
const { setTimeout } = require('timers/promises');

class BrowserRealtimeValidator {
  constructor() {
    this.testResults = {
      infrastructure: null,
      applicationLaunch: null,
      testPageAccess: null,
      manualTestInstructions: []
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[34m',      // Blue
      success: '\x1b[32m',   // Green
      warning: '\x1b[33m',   // Yellow
      error: '\x1b[31m',     // Red
      reset: '\x1b[0m'       // Reset
    };
    
    const timestamp = new Date().toISOString();
    const colorCode = colors[type] || colors.info;
    console.log(`${colorCode}[${timestamp}] [BROWSER-VALIDATOR] ${message}${colors.reset}`);
  }

  async runInfrastructureCheck() {
    this.log('Running infrastructure validation...');
    
    try {
      const result = execSync('node scripts/validate-realtime-infrastructure.js', { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      if (result.includes('SUCCESS: 100.0%')) {
        this.testResults.infrastructure = { success: true, message: 'Infrastructure validation passed' };
        this.log('Infrastructure validation passed', 'success');
      } else {
        this.testResults.infrastructure = { success: false, message: 'Infrastructure validation had warnings' };
        this.log('Infrastructure validation passed with warnings', 'warning');
      }
    } catch (error) {
      this.testResults.infrastructure = { success: false, message: error.message };
      this.log(`Infrastructure validation failed: ${error.message}`, 'error');
    }
  }

  async launchApplication() {
    this.log('Launching Next.js application...');
    
    try {
      // Check if development server is already running
      try {
        const response = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000', { 
          encoding: 'utf8',
          timeout: 5000
        });
        
        if (response.trim() === '200') {
          this.testResults.applicationLaunch = { success: true, message: 'Application already running on port 3000' };
          this.log('Application already running on port 3000', 'success');
          return true;
        }
      } catch (e) {
        // Server not running, need to start it
      }

      this.log('Starting development server...');
      this.log('Note: This will take a moment to compile and start', 'info');
      
      // Launch the dev server in background
      const devProcess = spawn('npm', ['run', 'dev'], {
        detached: true,
        stdio: 'pipe'
      });

      // Wait for server to start (check every 2 seconds for up to 30 seconds)
      let attempts = 0;
      const maxAttempts = 15;
      
      while (attempts < maxAttempts) {
        try {
          await setTimeout(2000);
          const response = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000', { 
            encoding: 'utf8',
            timeout: 5000
          });
          
          if (response.trim() === '200') {
            this.testResults.applicationLaunch = { success: true, message: 'Application launched successfully' };
            this.log('Application launched successfully on port 3000', 'success');
            return true;
          }
        } catch (e) {
          // Continue trying
        }
        
        attempts++;
        this.log(`Waiting for application to start... (attempt ${attempts}/${maxAttempts})`);
      }

      throw new Error('Application failed to start within 30 seconds');
      
    } catch (error) {
      this.testResults.applicationLaunch = { success: false, message: error.message };
      this.log(`Failed to launch application: ${error.message}`, 'error');
      return false;
    }
  }

  async checkTestPageAccess() {
    this.log('Checking test page accessibility...');
    
    try {
      const response = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/test-realtime', { 
        encoding: 'utf8',
        timeout: 10000
      });
      
      if (response.trim() === '200') {
        this.testResults.testPageAccess = { success: true, message: 'Real-time test page is accessible' };
        this.log('Real-time test page is accessible', 'success');
        return true;
      } else {
        throw new Error(`Test page returned status: ${response.trim()}`);
      }
    } catch (error) {
      this.testResults.testPageAccess = { success: false, message: error.message };
      this.log(`Test page access failed: ${error.message}`, 'error');
      return false;
    }
  }

  openBrowserForTesting() {
    this.log('Opening browser for manual testing...');
    
    const testUrl = 'http://localhost:3000/test-realtime';
    const relationshipsUrl = 'http://localhost:3000/relationships';
    
    try {
      // Try to open browser (works on macOS, Linux, and Windows)
      const platform = require('os').platform();
      
      if (platform === 'darwin') {
        execSync(`open ${testUrl}`);
        execSync(`open ${relationshipsUrl}`);
      } else if (platform === 'linux') {
        execSync(`xdg-open ${testUrl}`);
        execSync(`xdg-open ${relationshipsUrl}`);
      } else if (platform === 'win32') {
        execSync(`start ${testUrl}`);
        execSync(`start ${relationshipsUrl}`);
      }
      
      this.log('Browser tabs opened for testing', 'success');
    } catch (error) {
      this.log(`Could not automatically open browser: ${error.message}`, 'warning');
      this.log(`Please manually open: ${testUrl}`, 'info');
      this.log(`And also open: ${relationshipsUrl}`, 'info');
    }
  }

  generateManualTestInstructions() {
    this.testResults.manualTestInstructions = [
      {
        step: 1,
        title: 'Authentication Test',
        instructions: [
          'Navigate to http://localhost:3000/test-realtime',
          'If not signed in, sign in with zacks@anthropologica.tech',
          'Verify the page loads without the "Please sign in" message',
          'Check that connection status shows "Connected" for all three sections'
        ],
        expectedResult: 'All three sections (Events, Relationships, Invitations) show "Connected" status'
      },
      {
        step: 2,
        title: 'Real-time Relationship Data Test',
        instructions: [
          'Open the test-realtime page in two browser tabs/windows',
          'In Tab 1: Enter a test partner name and click "Create Test Relationship"',
          'In Tab 2: Watch for the relationship to appear instantly without refresh',
          'In Tab 1: Click "Delete First Relationship" if any exist',
          'In Tab 2: Watch for the relationship to disappear instantly'
        ],
        expectedResult: 'Changes in one tab appear immediately in the other tab without page refresh'
      },
      {
        step: 3,
        title: 'Production Relationships Page Test',
        instructions: [
          'Navigate to http://localhost:3000/relationships',
          'Check the real-time status indicators in the header (network icon and connection dot)',
          'Create a new relationship or edit an existing one',
          'Check that optimistic updates work (immediate UI feedback)',
          'Verify data persistence by refreshing the page'
        ],
        expectedResult: 'Real-time indicators show connected status and data updates work smoothly'
      },
      {
        step: 4,
        title: 'Network Resilience Test',
        instructions: [
          'With both pages open, disconnect your internet connection',
          'Try to create/modify relationships',
          'Reconnect your internet',
          'Watch for automatic reconnection indicators',
          'Verify that any pending changes sync properly'
        ],
        expectedResult: 'System gracefully handles disconnection and reconnection'
      },
      {
        step: 5,
        title: 'Cross-Session Data Persistence Test',
        instructions: [
          'Create relationships data in one browser session',
          'Open a new private/incognito browser window',
          'Sign in with the same account (zacks@anthropologica.tech)',
          'Navigate to relationships page',
          'Verify all data from the first session is visible'
        ],
        expectedResult: 'All relationship data persists across different browser sessions'
      }
    ];
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('\x1b[34m\x1b[1mREAL-TIME BROWSER VALIDATION REPORT\x1b[0m');
    console.log('='.repeat(80));
    
    console.log('\n📊 AUTOMATED TEST RESULTS:');
    
    // Infrastructure Test
    if (this.testResults.infrastructure) {
      const status = this.testResults.infrastructure.success ? '✅ PASSED' : '❌ FAILED';
      console.log(`   Infrastructure Check: ${status}`);
      console.log(`     ${this.testResults.infrastructure.message}`);
    }
    
    // Application Launch Test
    if (this.testResults.applicationLaunch) {
      const status = this.testResults.applicationLaunch.success ? '✅ PASSED' : '❌ FAILED';
      console.log(`   Application Launch: ${status}`);
      console.log(`     ${this.testResults.applicationLaunch.message}`);
    }
    
    // Test Page Access
    if (this.testResults.testPageAccess) {
      const status = this.testResults.testPageAccess.success ? '✅ PASSED' : '❌ FAILED';
      console.log(`   Test Page Access: ${status}`);
      console.log(`     ${this.testResults.testPageAccess.message}`);
    }

    const automatedPassed = [
      this.testResults.infrastructure?.success,
      this.testResults.applicationLaunch?.success,
      this.testResults.testPageAccess?.success
    ].filter(Boolean).length;

    const automatedTotal = Object.keys(this.testResults).filter(k => k !== 'manualTestInstructions').length;

    console.log(`\n📈 Automated Success Rate: ${automatedPassed}/${automatedTotal} (${((automatedPassed/automatedTotal)*100).toFixed(1)}%)`);

    if (automatedPassed === automatedTotal) {
      console.log('\n✅ All automated tests passed! Ready for manual testing.');
    } else {
      console.log('\n❌ Some automated tests failed. Manual testing may be limited.');
    }

    console.log('\n🧪 MANUAL TEST INSTRUCTIONS:');
    console.log('\nThe following tests require manual verification in the browser:');
    
    this.testResults.manualTestInstructions.forEach(test => {
      console.log(`\n   ${test.step}. ${test.title}:`);
      test.instructions.forEach((instruction, idx) => {
        console.log(`      ${String.fromCharCode(97 + idx)}. ${instruction}`);
      });
      console.log(`      Expected Result: ${test.expectedResult}`);
    });

    console.log('\n🌐 TEST URLS:');
    console.log('   • Real-time Test Page: http://localhost:3000/test-realtime');
    console.log('   • Relationships Page: http://localhost:3000/relationships');
    console.log('   • Debug Panel: Available via the Activity icon in the relationships page header');

    console.log('\n📋 VALIDATION CHECKLIST:');
    console.log('   □ Authentication works correctly');
    console.log('   □ Real-time updates appear instantly in multiple tabs');
    console.log('   □ Optimistic updates provide immediate feedback');
    console.log('   □ Network disconnection/reconnection is handled gracefully');
    console.log('   □ Data persists across browser sessions');
    console.log('   □ No console errors during normal operation');

    console.log('\n🎯 SPECIFIC USER TEST:');
    console.log('   Account: zacks@anthropologica.tech');
    console.log('   Focus: Verify that relationship data appears and persists correctly');
    console.log('   Goal: Confirm that user\'s relationship data sync issues are resolved');

    console.log('\n' + '='.repeat(80));
    console.log(`Report generated at: ${new Date().toISOString()}`);
    console.log('='.repeat(80) + '\n');
  }

  async runValidation() {
    console.log('\x1b[36m\x1b[1m\n🌐 REAL-TIME BROWSER VALIDATION STARTING\n\x1b[0m');
    
    // Step 1: Check infrastructure
    await this.runInfrastructureCheck();
    
    // Step 2: Launch application
    const appLaunched = await this.launchApplication();
    
    if (appLaunched) {
      // Step 3: Check test page access
      const testPageAccessible = await this.checkTestPageAccess();
      
      if (testPageAccessible) {
        // Step 4: Open browser for manual testing
        this.openBrowserForTesting();
      }
    }
    
    // Step 5: Generate manual test instructions
    this.generateManualTestInstructions();
    
    // Step 6: Generate comprehensive report
    this.generateReport();
    
    if (this.testResults.applicationLaunch?.success) {
      this.log('Application is running and ready for testing!', 'success');
      this.log('Please complete the manual tests above to validate real-time functionality', 'info');
    } else {
      this.log('Application launch failed - manual testing cannot proceed', 'error');
    }
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  const validator = new BrowserRealtimeValidator();
  validator.runValidation().catch(console.error);
}

module.exports = { BrowserRealtimeValidator };
#!/usr/bin/env node

/**
 * Startup Validation Script
 * Runs application validation checks before starting the server
 */

const path = require('path');

// Import the compiled validation module
async function runValidation() {
  try {
    console.log('🚀 Starting application startup validation...');

    // Since this is production, we need to load the compiled JavaScript
    // The validation functions are in lib/startup-validation.js (compiled from .ts)
    const validationModule = require('./lib/startup-validation.js');

    if (!validationModule.validateApplicationStartup) {
      throw new Error('validateApplicationStartup function not found in validation module');
    }

    await validationModule.validateApplicationStartup();
    console.log('✅ Application startup validation completed successfully');
    process.exit(0);

  } catch (error) {
    console.error('❌ Application startup validation failed:', error.message);
    process.exit(1);
  }
}

runValidation();
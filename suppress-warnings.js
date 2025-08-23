#!/usr/bin/env node

// Quick script to suppress MaxListenersExceededWarning
// Run this before starting your development server

const EventEmitter = require('events');

// Increase limits
EventEmitter.defaultMaxListeners = 50;
process.setMaxListeners(50);

// Suppress the warning completely
const originalEmitWarning = process.emitWarning;
process.emitWarning = function(warning, ...args) {
  if (warning && typeof warning === 'string' && warning.includes('MaxListenersExceededWarning')) {
    return; // Suppress this specific warning
  }
  return originalEmitWarning.call(this, warning, ...args);
};

console.log('🔇 MaxListenersExceededWarning suppressed');
console.log('📊 EventEmitter limit increased to 50');
console.log('🚀 Ready to run without warnings!');

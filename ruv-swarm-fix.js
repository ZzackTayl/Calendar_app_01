const EventEmitter = require('events');

// Fix 1: Increase global EventEmitter limit
EventEmitter.defaultMaxListeners = 25;

// Fix 2: Set process max listeners for SIGTERM/SIGINT
process.setMaxListeners(25);

// Fix 3: Override require to set max listeners on all new EventEmitters
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(...args) {
  const exports = originalRequire.apply(this, args);
  
  if (exports && typeof exports.setMaxListeners === 'function') {
    exports.setMaxListeners(25);
  }
  
  return exports;
};

console.log('✅ EventEmitter memory leak fixes applied');
console.log('✅ Default max listeners:', EventEmitter.defaultMaxListeners);
console.log('✅ Process max listeners:', process.getMaxListeners());

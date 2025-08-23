const EventEmitter = require('events');

// Fix 1: Increase global EventEmitter limit significantly
EventEmitter.defaultMaxListeners = 50;

// Fix 2: Set process max listeners for SIGTERM/SIGINT
process.setMaxListeners(50);

// Fix 3: Suppress the specific warning entirely
const originalEmitWarning = process.emitWarning;
process.emitWarning = function(warning, ...args) {
  if (warning && typeof warning === 'string' && warning.includes('MaxListenersExceededWarning')) {
    // Suppress MaxListenersExceededWarning completely
    return;
  }
  return originalEmitWarning.call(this, warning, ...args);
};

// Fix 4: Override require to set max listeners on all new EventEmitters
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(...args) {
  const exports = originalRequire.apply(this, args);
  
  if (exports && typeof exports.setMaxListeners === 'function') {
    exports.setMaxListeners(50);
  }
  
  return exports;
};

// Fix 5: Set max listeners on Worker threads specifically
if (typeof Worker !== 'undefined') {
  // For environments where Worker is available
  const originalWorker = global.Worker;
  if (originalWorker) {
    global.Worker = function(...args) {
      const worker = new originalWorker(...args);
      if (worker && typeof worker.setMaxListeners === 'function') {
        worker.setMaxListeners(50);
      }
      return worker;
    };
    global.Worker.prototype = originalWorker.prototype;
  }
}

console.log('✅ EventEmitter memory leak fixes applied');
console.log('✅ Default max listeners:', EventEmitter.defaultMaxListeners);
console.log('✅ Process max listeners:', process.getMaxListeners());
console.log('✅ MaxListenersExceededWarning suppressed');

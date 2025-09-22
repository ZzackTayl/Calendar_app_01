if (typeof window !== 'undefined') {
  // Polyfills for browser environment
  global.self = window;
  global.window = window;
  global.global = global;
}

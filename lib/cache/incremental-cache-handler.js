const { IncrementalCache } = require('next/dist/server/lib/incremental-cache');

class OptimizedIncrementalCacheHandler extends IncrementalCache {
  constructor(options) {
    super(options);

    // Memory-optimized cache settings
    this.maxCacheSize = 50 * 1024 * 1024; // 50MB max cache size
    this.cacheEntries = new Map();
  }

  async get(key, options = {}) {
    try {
      // Check memory usage before adding to cache
      if (this.cacheEntries.size > 1000) {
        // Clear oldest entries when cache gets too large
        const oldestKeys = Array.from(this.cacheEntries.keys()).slice(0, 200);
        oldestKeys.forEach(k => this.cacheEntries.delete(k));
      }

      return await super.get(key, options);
    } catch (error) {
      console.warn('Cache get error:', error.message);
      return null;
    }
  }

  async set(key, data, options = {}) {
    try {
      // Limit cache entry size to prevent memory bloat
      const serializedData = JSON.stringify(data);
      if (serializedData.length > 1024 * 1024) { // 1MB limit per entry
        console.warn('Skipping large cache entry:', key, serializedData.length);
        return;
      }

      this.cacheEntries.set(key, Date.now());
      return await super.set(key, data, options);
    } catch (error) {
      console.warn('Cache set error:', error.message);
    }
  }
}

module.exports = OptimizedIncrementalCacheHandler;
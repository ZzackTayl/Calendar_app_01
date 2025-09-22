class LargeModuleOptimizerPlugin {
  constructor(options = {}) {
    this.options = {
      maxSize: options.maxSize || 500000, // 500KB threshold
      excludePatterns: options.excludePatterns || [],
      ...options
    };
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('LargeModuleOptimizer', (compilation) => {
      compilation.hooks.optimizeModules.tap('LargeModuleOptimizer', (modules) => {
        for (const webpackModule of modules) {
          if (this.isLargeModule(webpackModule)) {
            this.optimizeModule(webpackModule, compilation);
          }
        }
      });
    });
  }

  isLargeModule(webpackModule) {
    if (!webpackModule.size || typeof webpackModule.size !== 'function') {
      return false;
    }

    const size = webpackModule.size();
    if (size < this.options.maxSize) {
      return false;
    }

    // Check if module matches exclusion patterns
    const resource = webpackModule.resource || webpackModule.identifier();
    return !this.options.excludePatterns.some(pattern =>
      resource && resource.includes(pattern)
    );
  }

  optimizeModule(webpackModule, compilation) {
    try {
      // For googleapis and other large libraries, we'll mark them for external loading
      if (webpackModule.resource && webpackModule.resource.includes('googleapis')) {
        // Mark as external to reduce bundle size
        webpackModule.external = true;
        webpackModule.externalType = 'commonjs';
      }
    } catch (error) {
      compilation.warnings.push(
        new Error(`LargeModuleOptimizer: Failed to optimize module ${webpackModule.identifier()}: ${error.message}`)
      );
    }
  }
}

module.exports = LargeModuleOptimizerPlugin;
"use strict";
/**
 * Centralized Runtime Configuration System
 * Provides security profiles and performance optimizations for different environments
 *
 * Security Profiles:
 * - production: Full enterprise-grade security (current behavior preserved)
 * - staging: Production security with enhanced diagnostics
 * - development: Lightweight security for fast development
 * - demo: Local/offline demo mode
 */
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggingConfig = exports.performanceConfig = exports.securityFeatures = exports.sessionConfig = exports.rateLimits = exports.csrfMode = exports.nodeEnv = exports.isDemo = exports.isStaging = exports.isDev = exports.isProd = exports.profile = exports.runtimeConfig = void 0;
exports.getRuntimeConfig = getRuntimeConfig;
exports.resetRuntimeConfig = resetRuntimeConfig;
exports.isProductionLike = isProductionLike;
exports.supportsOptimizations = supportsOptimizations;
exports.getConfigValue = getConfigValue;
const runtime_flags_1 = require("./runtime-flags");
/**
 * Determine security profile from environment
 */
function determineSecurityProfile() {
    const explicitProfile = process.env.SECURITY_PROFILE;
    const nodeEnv = process.env.NODE_ENV || 'development';
    // Explicit profile takes precedence
    if (explicitProfile && ['production', 'staging', 'development', 'demo'].includes(explicitProfile)) {
        return explicitProfile;
    }
    // Demo mode detection
    if (process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
        return 'demo';
    }
    // Environment-based defaults
    switch (nodeEnv) {
        case 'production':
            return 'production';
        case 'test':
            return 'development'; // Use development profile for tests
        default:
            // Check for staging indicators
            if (process.env.VERCEL_ENV === 'preview' || process.env.STAGING === 'true') {
                return 'staging';
            }
            return 'development';
    }
}
/**
 * Get rate limiting configuration for profile
 */
function getRateLimitConfig(profile) {
    switch (profile) {
        case 'production':
            return {
                auth: { windowMs: 15 * 60 * 1000, max: 5 }, // 5 attempts per 15 min
                api: { windowMs: 60 * 1000, max: 100 }, // 100 requests per minute
                events: { windowMs: 60 * 1000, max: 30 }, // 30 events per minute
                uploads: { windowMs: 60 * 1000, max: 10 } // 10 uploads per minute
            };
        case 'staging':
            return {
                auth: { windowMs: 10 * 60 * 1000, max: 10 }, // More lenient for testing
                api: { windowMs: 60 * 1000, max: 200 },
                events: { windowMs: 60 * 1000, max: 50 },
                uploads: { windowMs: 60 * 1000, max: 20 }
            };
        case 'development':
            return {
                auth: { windowMs: 5 * 60 * 1000, max: 20 }, // Very lenient for dev
                api: { windowMs: 60 * 1000, max: 500 },
                events: { windowMs: 60 * 1000, max: 200 },
                uploads: { windowMs: 60 * 1000, max: 50 }
            };
        case 'demo':
            return {
                auth: { windowMs: 60 * 1000, max: 100 }, // Very permissive for demo
                api: { windowMs: 60 * 1000, max: 1000 },
                events: { windowMs: 60 * 1000, max: 500 },
                uploads: { windowMs: 60 * 1000, max: 100 }
            };
    }
}
/**
 * Get session configuration for profile
 */
function getSessionConfig(profile) {
    switch (profile) {
        case 'production':
            return {
                ttlSeconds: 60 * 60, // 1 hour session
                cacheTtlSeconds: 5, // 5 second cache
                strictValidation: true,
                requireDeviceFingerprinting: true,
                maxConcurrentSessions: 3
            };
        case 'staging':
            return {
                ttlSeconds: 2 * 60 * 60, // 2 hour session
                cacheTtlSeconds: 10, // 10 second cache
                strictValidation: true,
                requireDeviceFingerprinting: false, // Disabled for easier testing
                maxConcurrentSessions: 5
            };
        case 'development':
            return {
                ttlSeconds: 4 * 60 * 60, // 4 hour session
                cacheTtlSeconds: 60, // 1 minute cache for performance
                strictValidation: false, // More permissive validation
                requireDeviceFingerprinting: false,
                maxConcurrentSessions: 10
            };
        case 'demo':
            return {
                ttlSeconds: 24 * 60 * 60, // 24 hour session
                cacheTtlSeconds: 300, // 5 minute cache
                strictValidation: false,
                requireDeviceFingerprinting: false,
                maxConcurrentSessions: 50
            };
    }
}
/**
 * Get security features configuration for profile
 */
function getSecurityFeatures(profile) {
    switch (profile) {
        case 'production':
            return {
                enableDeviceFingerprinting: true,
                enableGeoAnomalyChecks: true,
                enableCaptcha: true,
                enableDetailedAuditLogging: true,
                enableBotDetection: true,
                enableAdvancedThreatDetection: true,
                enableSessionReplay: true,
                enableRealTimeAlerts: true
            };
        case 'staging':
            return {
                enableDeviceFingerprinting: false, // Easier testing
                enableGeoAnomalyChecks: false,
                enableCaptcha: false,
                enableDetailedAuditLogging: true, // Keep logging for debugging
                enableBotDetection: true,
                enableAdvancedThreatDetection: false,
                enableSessionReplay: false,
                enableRealTimeAlerts: true
            };
        case 'development':
            return {
                enableDeviceFingerprinting: false, // All heavy features disabled
                enableGeoAnomalyChecks: false,
                enableCaptcha: false,
                enableDetailedAuditLogging: false, // Minimal logging
                enableBotDetection: false,
                enableAdvancedThreatDetection: false,
                enableSessionReplay: false,
                enableRealTimeAlerts: false
            };
        case 'demo':
            return {
                enableDeviceFingerprinting: false, // All features disabled for demo
                enableGeoAnomalyChecks: false,
                enableCaptcha: false,
                enableDetailedAuditLogging: false,
                enableBotDetection: false,
                enableAdvancedThreatDetection: false,
                enableSessionReplay: false,
                enableRealTimeAlerts: false
            };
    }
}
/**
 * Get performance configuration for profile
 */
function getPerformanceConfig(profile) {
    const isDev = profile === 'development';
    const isDemo = profile === 'demo';
    return {
        enableMiddlewareCache: isDev || isDemo,
        enableAggressiveCaching: isDev || isDemo,
        minimalLogging: isDev && process.env.MINIMAL_MIDDLEWARE_LOGS === 'true',
        skipSecurityHeaders: isDev && process.env.SKIP_DEV_SECURITY_HEADERS === 'true',
        batchSecurityChecks: isDev || isDemo,
        useOptimizedValidation: isDev || isDemo,
        cacheValidationResults: true // Always enabled for performance
    };
}
/**
 * Get CSRF mode for profile
 */
function getCsrfMode(profile) {
    switch (profile) {
        case 'production':
            return 'strict';
        case 'staging':
            return 'strict';
        case 'development':
            return process.env.CSRF_MODE || 'relaxed';
        case 'demo':
            return 'disabled';
    }
}
/**
 * Get logging configuration for profile
 */
function getLoggingConfig(profile) {
    switch (profile) {
        case 'production':
            return {
                level: 'warn',
                enableStructuredLogging: true,
                enablePerformanceMetrics: true,
                enableSecurityMetrics: true
            };
        case 'staging':
            return {
                level: 'info',
                enableStructuredLogging: true,
                enablePerformanceMetrics: true,
                enableSecurityMetrics: true
            };
        case 'development':
            return {
                level: process.env.LOG_LEVEL || 'debug',
                enableStructuredLogging: false,
                enablePerformanceMetrics: true,
                enableSecurityMetrics: false
            };
        case 'demo':
            return {
                level: 'error',
                enableStructuredLogging: false,
                enablePerformanceMetrics: false,
                enableSecurityMetrics: false
            };
    }
}
/**
 * Build complete runtime configuration
 */
function buildRuntimeConfig() {
    const profile = determineSecurityProfile();
    const nodeEnv = process.env.NODE_ENV || 'development';
    return {
        profile,
        environment: {
            nodeEnv,
            isProd: profile === 'production',
            isStaging: profile === 'staging',
            isDev: profile === 'development',
            isDemo: profile === 'demo',
            isBuild: (0, runtime_flags_1.isBuildTime)()
        },
        security: {
            csrfMode: getCsrfMode(profile),
            rateLimits: getRateLimitConfig(profile),
            session: getSessionConfig(profile),
            features: getSecurityFeatures(profile)
        },
        performance: getPerformanceConfig(profile),
        logging: getLoggingConfig(profile)
    };
}
// Create and cache the runtime configuration
let _runtimeConfig = null;
/**
 * Get the current runtime configuration (singleton)
 */
function getRuntimeConfig() {
    if (!_runtimeConfig) {
        _runtimeConfig = buildRuntimeConfig();
        // Log configuration in development
        if (_runtimeConfig.environment.isDev && !_runtimeConfig.performance.minimalLogging) {
            console.log('[RUNTIME-CONFIG] Initialized with profile:', _runtimeConfig.profile);
            console.log('[RUNTIME-CONFIG] Performance optimizations:', {
                caching: _runtimeConfig.performance.enableMiddlewareCache,
                minimalLogging: _runtimeConfig.performance.minimalLogging,
                optimizedValidation: _runtimeConfig.performance.useOptimizedValidation
            });
        }
    }
    return _runtimeConfig;
}
/**
 * Reset runtime configuration (for testing)
 */
function resetRuntimeConfig() {
    _runtimeConfig = null;
}
/**
 * Check if current environment is production-like
 */
function isProductionLike() {
    const config = getRuntimeConfig();
    return config.profile === 'production' || config.profile === 'staging';
}
/**
 * Check if current environment supports performance optimizations
 */
function supportsOptimizations() {
    const config = getRuntimeConfig();
    return config.performance.enableMiddlewareCache || config.performance.enableAggressiveCaching;
}
/**
 * Get environment-specific configuration value
 * @param key - Configuration key path (e.g., 'security.features.enableCaptcha')
 * @param fallback - Fallback value if key not found
 */
function getConfigValue(key, fallback) {
    const config = getRuntimeConfig();
    const keys = key.split('.');
    let value = config;
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        }
        else {
            return fallback;
        }
    }
    return value !== undefined ? value : fallback;
}
/**
 * Export the default runtime configuration instance
 */
exports.runtimeConfig = getRuntimeConfig();
// Legacy compatibility exports
_a = getRuntimeConfig(), exports.profile = _a.profile, _b = _a.environment, exports.isProd = _b.isProd, exports.isDev = _b.isDev, exports.isStaging = _b.isStaging, exports.isDemo = _b.isDemo, exports.nodeEnv = _b.nodeEnv, _c = _a.security, exports.csrfMode = _c.csrfMode, exports.rateLimits = _c.rateLimits, exports.sessionConfig = _c.session, exports.securityFeatures = _c.features, exports.performanceConfig = _a.performance, exports.loggingConfig = _a.logging;

/**
 * Production Security Configuration
 * Provides production-specific security settings and hardening measures
 */

export interface ProductionSecurityConfig {
  // Environment validation
  environment: {
    enforceProduction: boolean;
    allowedOrigins: string[];
    requireHttps: boolean;
    strictTransportSecurity: boolean;
  };

  // Authentication security
  authentication: {
    sessionTimeout: number; // minutes
    maxLoginAttempts: number;
    lockoutDuration: number; // minutes
    requireEmailVerification: boolean;
    enforceStrongPasswords: boolean;
    enableMFA: boolean;
  };

  // Rate limiting
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
  };

  // Security headers
  securityHeaders: {
    contentSecurityPolicy: string;
    contentSecurityPolicyNonce?: string;
    strictTransportSecurity: string;
    xFrameOptions: string;
    xContentTypeOptions: string;
    referrerPolicy: string;
    permissionsPolicy: string;
  };

  // Monitoring and alerting
  monitoring: {
    enableRealTimeAlerts: boolean;
    alertThresholds: {
      authFailures: number;
      suspiciousActivity: number;
      criticalEvents: number;
    };
    logRetentionDays: number;
    enableAuditTrail: boolean;
  };

  // Demo mode restrictions
  demoMode: {
    allowInProduction: boolean;
    maxDemoSessions: number;
    demoSessionTimeout: number; // minutes
    restrictedFeatures: string[];
  };

  // API security
  apiSecurity: {
    enableCors: boolean;
    corsOrigins: string[];
    enableApiKeyValidation: boolean;
    requireUserAgent: boolean;
    blockSuspiciousUserAgents: boolean;
  };

  // Incident response
  incidentResponse: {
    enableAutoResponse: boolean;
    escalationThresholds: {
      criticalAlerts: number;
      timeWindow: number; // minutes
    };
    notificationChannels: string[];
    emergencyContacts: string[];
  };
}

/**
 * Generate secure CSP nonce for production
 */
function generateCSPNonce(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  // Fallback for environments without crypto.randomUUID
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate production CSP policy with strict security
 */
function generateProductionCSP(): string {
  const nonce = generateCSPNonce();

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests"
  ].join('; ') + ';';
}

/**
 * Generate development CSP policy with necessary permissions but still secure
 */
function generateDevelopmentCSP(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://localhost:* http://localhost:*", // unsafe-eval required for Next.js hot reloading
    "style-src 'self' 'unsafe-inline'", // Allow inline styles in dev for hot reload
    "img-src 'self' data: https: http:",
    "font-src 'self' data:",
    "connect-src 'self' http://localhost:* ws://localhost:* https://*.supabase.co wss://*.supabase.co",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ') + ';';
}

/**
 * Get production security configuration based on environment
 */
export function getProductionSecurityConfig(): ProductionSecurityConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    environment: {
      enforceProduction: isProduction,
      allowedOrigins: isProduction 
        ? [
            'https://polyharmony.app',
            'https://www.polyharmony.app',
            'https://app.polyharmony.app'
          ]
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
      requireHttps: isProduction,
      strictTransportSecurity: isProduction
    },

    authentication: {
      sessionTimeout: isProduction ? 60 : 480, // 1 hour prod, 8 hours dev
      maxLoginAttempts: isProduction ? 3 : 10,
      lockoutDuration: isProduction ? 15 : 5, // 15 min prod, 5 min dev
      requireEmailVerification: isProduction,
      enforceStrongPasswords: isProduction,
      enableMFA: false // Future feature
    },

    rateLimiting: {
      enabled: isProduction,
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: isProduction ? 100 : 1000,
      skipSuccessfulRequests: false,
      skipFailedRequests: false
    },

    securityHeaders: {
      contentSecurityPolicy: isProduction
        ? generateProductionCSP()
        : generateDevelopmentCSP(),
      contentSecurityPolicyNonce: isProduction ? generateCSPNonce() : undefined,
      strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
      xFrameOptions: 'DENY',
      xContentTypeOptions: 'nosniff',
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
    },

    monitoring: {
      enableRealTimeAlerts: isProduction,
      alertThresholds: {
        authFailures: isProduction ? 5 : 20,
        suspiciousActivity: isProduction ? 3 : 10,
        criticalEvents: 1 // Always alert on critical events
      },
      logRetentionDays: isProduction ? 90 : 7,
      enableAuditTrail: isProduction
    },

    demoMode: {
      allowInProduction: false, // Never allow demo mode in production
      maxDemoSessions: isDevelopment ? 10 : 0,
      demoSessionTimeout: 30, // 30 minutes
      restrictedFeatures: [
        'user_deletion',
        'data_export',
        'admin_functions',
        'payment_processing'
      ]
    },

    apiSecurity: {
      enableCors: true,
      corsOrigins: isProduction 
        ? ['https://polyharmony.app', 'https://www.polyharmony.app']
        : ['http://localhost:3000'],
      enableApiKeyValidation: isProduction,
      requireUserAgent: isProduction,
      blockSuspiciousUserAgents: isProduction
    },

    incidentResponse: {
      enableAutoResponse: isProduction,
      escalationThresholds: {
        criticalAlerts: 3,
        timeWindow: 15 // 15 minutes
      },
      notificationChannels: ['console', 'webhook'],
      emergencyContacts: process.env.SECURITY_CONTACTS?.split(',') || []
    }
  };
}

/**
 * Validate production security configuration
 */
export function validateProductionConfig(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // Required environment variables for production
  if (isProduction) {
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'ENCRYPTION_KEY'
    ];

    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        errors.push(`Missing required environment variable: ${varName}`);
      }
    });

    // Validate encryption key format
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (encryptionKey && (encryptionKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(encryptionKey))) {
      errors.push('ENCRYPTION_KEY must be a 64-character hexadecimal string');
    }

    // Check for secure URLs
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
      errors.push('NEXT_PUBLIC_SUPABASE_URL must use HTTPS in production');
    }

    // Validate NextAuth URL
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    if (nextAuthUrl && !nextAuthUrl.startsWith('https://')) {
      errors.push('NEXTAUTH_URL must use HTTPS in production');
    }

    // Check for demo mode indicators
    if (process.env.ENABLE_DEMO_MODE === 'true') {
      errors.push('Demo mode must not be enabled in production');
    }
  }

  // Warnings for development
  if (!isProduction) {
    if (!process.env.ENCRYPTION_KEY) {
      warnings.push('ENCRYPTION_KEY not set - calendar integrations will not work');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Apply production security headers to response
 */
export function applySecurityHeaders(headers: Headers): void {
  const config = getProductionSecurityConfig();
  
  headers.set('Content-Security-Policy', config.securityHeaders.contentSecurityPolicy);
  headers.set('X-Frame-Options', config.securityHeaders.xFrameOptions);
  headers.set('X-Content-Type-Options', config.securityHeaders.xContentTypeOptions);
  headers.set('Referrer-Policy', config.securityHeaders.referrerPolicy);
  headers.set('Permissions-Policy', config.securityHeaders.permissionsPolicy);
  
  if (config.environment.strictTransportSecurity) {
    headers.set('Strict-Transport-Security', config.securityHeaders.strictTransportSecurity);
  }
}

/**
 * Check if demo mode is allowed in current environment
 */
export function isDemoModeAllowed(): boolean {
  const config = getProductionSecurityConfig();
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && !config.demoMode.allowInProduction) {
    return false;
  }
  
  return true;
}

/**
 * Get security incident response configuration
 */
export function getIncidentResponseConfig() {
  const config = getProductionSecurityConfig();
  return config.incidentResponse;
}

/**
 * Get CSP nonce for current request
 */
export function getCSPNonce(): string | undefined {
  const config = getProductionSecurityConfig();
  return config.securityHeaders.contentSecurityPolicyNonce;
}

/**
 * Generate and apply CSP with dynamic nonce
 */
export function generateDynamicCSP(): { policy: string; nonce: string } {
  const nonce = generateCSPNonce();
  const isProduction = process.env.NODE_ENV === 'production';

  let policy: string;
  if (isProduction) {
    policy = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      `style-src 'self' 'nonce-${nonce}'`,
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ') + ';';
  } else {
    policy = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://localhost:* http://localhost:*`, // unsafe-eval required for Next.js hot reloading
      `style-src 'self' 'nonce-${nonce}' 'unsafe-inline'`,
      "img-src 'self' data: https: http:",
      "font-src 'self' data:",
      "connect-src 'self' http://localhost:* ws://localhost:* https://*.supabase.co wss://*.supabase.co",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ') + ';';
  }

  return { policy, nonce };
}

/**
 * Initialize production security monitoring
 */
export function initializeProductionSecurity(): void {
  const config = getProductionSecurityConfig();
  const validation = validateProductionConfig();
  
  // Log configuration validation results
  if (!validation.isValid) {
    console.error('[SECURITY] Production configuration validation failed:', validation.errors);
    
    // In production, exit if critical security configuration is invalid
    if (process.env.NODE_ENV === 'production') {
      console.error('[SECURITY] Exiting due to invalid production security configuration');
      process.exit(1);
    }
  }
  
  if (validation.warnings.length > 0) {
    console.warn('[SECURITY] Configuration warnings:', validation.warnings);
  }
  
  console.log('[SECURITY] Production security configuration initialized', {
    environment: process.env.NODE_ENV,
    demoModeAllowed: config.demoMode.allowInProduction,
    realTimeAlertsEnabled: config.monitoring.enableRealTimeAlerts,
    rateLimitingEnabled: config.rateLimiting.enabled
  });
}
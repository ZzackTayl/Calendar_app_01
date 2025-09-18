/**
 * Production Security Monitoring System
 * Real-time security event detection and alerting
 */

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: SecuritySeverity;
  source: string;
  details: Record<string, any>;
  userId?: string;
  ip?: string;
  userAgent?: string;
  location?: string;
}

export enum SecurityEventType {
  AUTH_BYPASS_ATTEMPT = 'auth_bypass_attempt',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  CSP_VIOLATION = 'csp_violation',
  INVALID_TOKEN = 'invalid_token',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  DATA_EXFILTRATION = 'data_exfiltration',
  INJECTION_ATTEMPT = 'injection_attempt',
  BRUTE_FORCE_ATTACK = 'brute_force_attack',
  ENCRYPTION_FAILURE = 'encryption_failure',
  WEAK_AUTHENTICATION = 'weak_authentication',
  CONFIG_VIOLATION = 'config_violation',
  ENV_VAR_LEAK = 'env_var_leak'
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private events: Map<string, SecurityEvent> = new Map();
  private alertThresholds: Map<SecurityEventType, number> = new Map();
  private isProduction: boolean;

  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.initializeThresholds();

    const lifecycleEvent = process.env.npm_lifecycle_event;
    const isBuildPhase = lifecycleEvent === 'build' || lifecycleEvent === 'vercel-build';
    const isTestEnv = process.env.NODE_ENV === 'test';

    if (typeof window === 'undefined' && !isBuildPhase && !isTestEnv) {
      this.startMonitoring();
    }
  }

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  /**
   * Initialize alert thresholds for different event types
   */
  private initializeThresholds(): void {
    this.alertThresholds.set(SecurityEventType.AUTH_BYPASS_ATTEMPT, 1); // Immediate alert
    this.alertThresholds.set(SecurityEventType.UNAUTHORIZED_ACCESS, 3);
    this.alertThresholds.set(SecurityEventType.RATE_LIMIT_EXCEEDED, 5);
    this.alertThresholds.set(SecurityEventType.SUSPICIOUS_ACTIVITY, 2);
    this.alertThresholds.set(SecurityEventType.CSP_VIOLATION, 10);
    this.alertThresholds.set(SecurityEventType.INVALID_TOKEN, 5);
    this.alertThresholds.set(SecurityEventType.PRIVILEGE_ESCALATION, 1);
    this.alertThresholds.set(SecurityEventType.DATA_EXFILTRATION, 1);
    this.alertThresholds.set(SecurityEventType.INJECTION_ATTEMPT, 1);
    this.alertThresholds.set(SecurityEventType.BRUTE_FORCE_ATTACK, 3);
    this.alertThresholds.set(SecurityEventType.ENCRYPTION_FAILURE, 1);
    this.alertThresholds.set(SecurityEventType.WEAK_AUTHENTICATION, 2);
    this.alertThresholds.set(SecurityEventType.CONFIG_VIOLATION, 1);
    this.alertThresholds.set(SecurityEventType.ENV_VAR_LEAK, 1);
  }

  /**
   * Log a security event
   */
  logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...event
    };

    this.events.set(securityEvent.id, securityEvent);

    // Log to console (would be replaced with proper logging service)
    console.log('🚨 SECURITY EVENT:', JSON.stringify(securityEvent, null, 2));

    // Check if alert threshold is exceeded
    this.checkAlertThresholds(securityEvent);

    // In production, send to security information and event management (SIEM)
    if (this.isProduction) {
      this.sendToSIEM(securityEvent);
    }

    // Cleanup old events (keep last 1000)
    if (this.events.size > 1000) {
      const oldestKey = this.events.keys().next().value;
      if (oldestKey) {
        this.events.delete(oldestKey);
      }
    }
  }

  /**
   * Check if alert thresholds are exceeded
   */
  private checkAlertThresholds(event: SecurityEvent): void {
    const threshold = this.alertThresholds.get(event.type) || 5;
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    const cutoff = new Date(Date.now() - timeWindow);

    // Count events of same type in time window
    const recentEvents = Array.from(this.events.values())
      .filter(e => e.type === event.type && e.timestamp > cutoff);

    if (recentEvents.length >= threshold) {
      this.triggerAlert(event.type, recentEvents);
    }

    // Immediate alerts for critical events
    if (event.severity === SecuritySeverity.CRITICAL) {
      this.triggerCriticalAlert(event);
    }
  }

  /**
   * Trigger security alert
   */
  private triggerAlert(eventType: SecurityEventType, events: SecurityEvent[]): void {
    const alert = {
      timestamp: new Date(),
      eventType,
      eventCount: events.length,
      severity: SecuritySeverity.HIGH,
      message: `Security threshold exceeded: ${events.length} ${eventType} events in last 5 minutes`,
      events: events.map(e => e.id)
    };

    console.error('🚨 SECURITY ALERT:', JSON.stringify(alert, null, 2));

    // In production, send to alerting system
    if (this.isProduction) {
      this.sendToAlertingSystem(alert);
    }
  }

  /**
   * Trigger critical security alert
   */
  private triggerCriticalAlert(event: SecurityEvent): void {
    const alert = {
      timestamp: new Date(),
      eventId: event.id,
      severity: SecuritySeverity.CRITICAL,
      message: `CRITICAL SECURITY EVENT: ${event.type}`,
      event
    };

    console.error('🚨 CRITICAL SECURITY ALERT:', JSON.stringify(alert, null, 2));

    // In production, send immediate notification
    if (this.isProduction) {
      this.sendCriticalNotification(alert);
    }
  }

  /**
   * Start continuous monitoring
   */
  private startMonitoring(): void {
    // Monitor authentication bypass attempts
    this.monitorAuthBypass();

    // Monitor rate limiting violations
    this.monitorRateLimiting();

    // Monitor CSP violations
    this.monitorCSPViolations();

    // Monitor encryption failures
    this.monitorEncryptionHealth();

    // Monitor authentication security
    this.monitorAuthenticationSecurity();

    // Monitor environment variable security
    this.monitorEnvironmentSecurity();

    // Check system health every minute
    setInterval(() => {
      this.performHealthCheck();
    }, 60 * 1000);
  }

  /**
   * Monitor for authentication bypass attempts
   */
  private monitorAuthBypass(): void {
    // Check for dev auth bypass in production
    if (this.isProduction && process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true') {
      this.logSecurityEvent({
        type: SecurityEventType.AUTH_BYPASS_ATTEMPT,
        severity: SecuritySeverity.CRITICAL,
        source: 'environment_check',
        details: {
          message: 'Development authentication bypass enabled in production',
          environment: process.env.NODE_ENV,
          bypassValue: process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS
        }
      });
    }
  }

  /**
   * Monitor rate limiting violations
   */
  private monitorRateLimiting(): void {
    // This would integrate with the rate limiter to monitor violations
    // Implementation depends on rate limiter integration
  }

  /**
   * Monitor CSP violations
   */
  private monitorCSPViolations(): void {
    // Listen for CSP violation reports
    if (typeof window !== 'undefined') {
      document.addEventListener('securitypolicyviolation', (e) => {
        this.logSecurityEvent({
          type: SecurityEventType.CSP_VIOLATION,
          severity: SecuritySeverity.MEDIUM,
          source: 'csp_report',
          details: {
            directive: e.violatedDirective,
            blockedURI: e.blockedURI,
            documentURI: e.documentURI,
            originalPolicy: e.originalPolicy
          }
        });
      });
    }
  }

  /**
   * Monitor encryption health and failures
   */
  private monitorEncryptionHealth(): void {
    // Check encryption key configuration
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey && this.isProduction) {
      this.logSecurityEvent({
        type: SecurityEventType.ENCRYPTION_FAILURE,
        severity: SecuritySeverity.CRITICAL,
        source: 'encryption_monitor',
        details: {
          message: 'Encryption key missing in production',
          environment: process.env.NODE_ENV
        }
      });
    }

    // Validate encryption key strength
    if (encryptionKey && encryptionKey.length < 64) {
      this.logSecurityEvent({
        type: SecurityEventType.WEAK_AUTHENTICATION,
        severity: SecuritySeverity.HIGH,
        source: 'encryption_monitor',
        details: {
          message: 'Encryption key length below recommended 64 characters',
          keyLength: encryptionKey.length
        }
      });
    }
  }

  /**
   * Monitor authentication security configuration
   */
  private monitorAuthenticationSecurity(): void {
    // Check for weak JWT secrets
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 32) {
      this.logSecurityEvent({
        type: SecurityEventType.WEAK_AUTHENTICATION,
        severity: SecuritySeverity.CRITICAL,
        source: 'auth_monitor',
        details: {
          message: 'JWT secret below minimum required length',
          secretLength: jwtSecret.length
        }
      });
    }

    // Check NextAuth configuration
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    if (this.isProduction && (!nextAuthSecret || nextAuthSecret.length < 32)) {
      this.logSecurityEvent({
        type: SecurityEventType.WEAK_AUTHENTICATION,
        severity: SecuritySeverity.CRITICAL,
        source: 'auth_monitor',
        details: {
          message: 'NextAuth secret missing or too weak in production',
          secretProvided: !!nextAuthSecret,
          secretLength: nextAuthSecret?.length || 0
        }
      });
    }
  }

  /**
   * Monitor environment variable security
   */
  private monitorEnvironmentSecurity(): void {
    // Check for environment variable leaks
    const publicEnvVars = Object.keys(process.env)
      .filter(key => key.startsWith('NEXT_PUBLIC_'));

    const sensitivePatterns = ['SECRET', 'KEY', 'PASSWORD', 'TOKEN', 'PRIVATE'];

    publicEnvVars.forEach(key => {
      if (sensitivePatterns.some(pattern => key.toUpperCase().includes(pattern))) {
        this.logSecurityEvent({
          type: SecurityEventType.ENV_VAR_LEAK,
          severity: SecuritySeverity.CRITICAL,
          source: 'env_monitor',
          details: {
            message: 'Sensitive environment variable may be exposed to client',
            envVar: key,
            value: '***REDACTED***'
          }
        });
      }
    });

    // Check for insecure configurations
    if (this.isProduction) {
      const insecureConfigs = [
        { key: 'NODE_ENV', value: 'development', message: 'Development mode enabled in production' },
        { key: 'DEBUG', value: 'true', message: 'Debug mode enabled in production' },
        { key: 'ENABLE_DEMO_MODE', value: 'true', message: 'Demo mode enabled in production' }
      ];

      insecureConfigs.forEach(config => {
        if (process.env[config.key] === config.value) {
          this.logSecurityEvent({
            type: SecurityEventType.CONFIG_VIOLATION,
            severity: SecuritySeverity.HIGH,
            source: 'env_monitor',
            details: {
              message: config.message,
              configKey: config.key,
              configValue: config.value
            }
          });
        }
      });
    }
  }

  /**
   * Perform system health check
   */
  private performHealthCheck(): void {
    const healthMetrics = {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      eventCount: this.events.size,
      timestamp: new Date()
    };

    // Check for memory leaks or resource exhaustion
    if (healthMetrics.memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
      this.logSecurityEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.MEDIUM,
        source: 'health_check',
        details: {
          message: 'High memory usage detected',
          ...healthMetrics
        }
      });
    }
  }

  /**
   * Send event to SIEM system
   */
  private sendToSIEM(event: SecurityEvent): void {
    // Implementation would send to actual SIEM system
    console.log('📤 Sending to SIEM:', event.id);
  }

  /**
   * Send alert to alerting system
   */
  private sendToAlertingSystem(alert: any): void {
    // Implementation would send to actual alerting system (PagerDuty, etc.)
    console.log('📤 Sending alert to alerting system:', alert);
  }

  /**
   * Send critical notification
   */
  private sendCriticalNotification(alert: any): void {
    // Implementation would send immediate notification (SMS, webhook, etc.)
    console.log('📤 Sending critical notification:', alert);
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get security event statistics
   */
  getStatistics(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    recentCriticalEvents: SecurityEvent[];
  } {
    const eventsByType: Record<string, number> = {};
    const eventsBySeverity: Record<string, number> = {};
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentCriticalEvents = Array.from(this.events.values())
      .filter(e => e.severity === SecuritySeverity.CRITICAL && e.timestamp > last24Hours);

    Array.from(this.events.values()).forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
    });

    return {
      totalEvents: this.events.size,
      eventsByType,
      eventsBySeverity,
      recentCriticalEvents
    };
  }
}

/**
 * Helper functions for common security events
 */
export const SecurityEvents = {
  authBypassAttempt: (details: Record<string, any>, userId?: string) => {
    SecurityMonitor.getInstance().logSecurityEvent({
      type: SecurityEventType.AUTH_BYPASS_ATTEMPT,
      severity: SecuritySeverity.CRITICAL,
      source: 'auth_middleware',
      details,
      userId
    });
  },

  unauthorizedAccess: (details: Record<string, any>, userId?: string) => {
    SecurityMonitor.getInstance().logSecurityEvent({
      type: SecurityEventType.UNAUTHORIZED_ACCESS,
      severity: SecuritySeverity.HIGH,
      source: 'access_control',
      details,
      userId
    });
  },

  rateLimitExceeded: (details: Record<string, any>, userId?: string) => {
    SecurityMonitor.getInstance().logSecurityEvent({
      type: SecurityEventType.RATE_LIMIT_EXCEEDED,
      severity: SecuritySeverity.MEDIUM,
      source: 'rate_limiter',
      details,
      userId
    });
  },

  suspiciousActivity: (details: Record<string, any>, userId?: string) => {
    SecurityMonitor.getInstance().logSecurityEvent({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      severity: SecuritySeverity.MEDIUM,
      source: 'behavior_analysis',
      details,
      userId
    });
  },

  encryptionFailure: (details: Record<string, any>, userId?: string) => {
    SecurityMonitor.getInstance().logSecurityEvent({
      type: SecurityEventType.ENCRYPTION_FAILURE,
      severity: SecuritySeverity.CRITICAL,
      source: 'encryption_system',
      details,
      userId
    });
  },

  weakAuthentication: (details: Record<string, any>, userId?: string) => {
    SecurityMonitor.getInstance().logSecurityEvent({
      type: SecurityEventType.WEAK_AUTHENTICATION,
      severity: SecuritySeverity.HIGH,
      source: 'authentication_system',
      details,
      userId
    });
  },

  configViolation: (details: Record<string, any>) => {
    SecurityMonitor.getInstance().logSecurityEvent({
      type: SecurityEventType.CONFIG_VIOLATION,
      severity: SecuritySeverity.HIGH,
      source: 'configuration_monitor',
      details
    });
  },

  environmentVariableLeak: (details: Record<string, any>) => {
    SecurityMonitor.getInstance().logSecurityEvent({
      type: SecurityEventType.ENV_VAR_LEAK,
      severity: SecuritySeverity.CRITICAL,
      source: 'environment_monitor',
      details
    });
  }
};

/**
 * Validate integration between security systems
 */
export async function validateSecurityIntegration(): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
  criticalIssues: string[];
  systemStatus: Record<string, boolean>;
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const criticalIssues: string[] = [];
  const systemStatus: Record<string, boolean> = {};

  try {
    // 1. Validate CSP and security headers integration
    const cspValid = await validateCSPIntegration();
    systemStatus.csp = cspValid.isValid;
    if (!cspValid.isValid) {
      criticalIssues.push(...cspValid.criticalIssues);
      errors.push(...cspValid.errors);
      warnings.push(...cspValid.warnings);
    }

    // 2. Validate encryption system integration
    const encryptionValid = await validateEncryptionIntegration();
    systemStatus.encryption = encryptionValid.isValid;
    if (!encryptionValid.isValid) {
      criticalIssues.push(...encryptionValid.criticalIssues);
      errors.push(...encryptionValid.errors);
      warnings.push(...encryptionValid.warnings);
    }

    // 3. Validate authentication system integration
    const authValid = await validateAuthenticationIntegration();
    systemStatus.authentication = authValid.isValid;
    if (!authValid.isValid) {
      criticalIssues.push(...authValid.criticalIssues);
      errors.push(...authValid.errors);
      warnings.push(...authValid.warnings);
    }

    // 4. Validate session security integration
    const sessionValid = await validateSessionSecurityIntegration();
    systemStatus.sessionSecurity = sessionValid.isValid;
    if (!sessionValid.isValid) {
      criticalIssues.push(...sessionValid.criticalIssues);
      errors.push(...sessionValid.errors);
      warnings.push(...sessionValid.warnings);
    }

    // 5. Validate environment variable security
    const envValid = await validateEnvironmentIntegration();
    systemStatus.environment = envValid.isValid;
    if (!envValid.isValid) {
      criticalIssues.push(...envValid.criticalIssues);
      errors.push(...envValid.errors);
      warnings.push(...envValid.warnings);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    criticalIssues.push(`Security integration validation failed: ${errorMessage}`);
    console.error('Security integration validation error:', error);
  }

  return {
    isValid: criticalIssues.length === 0 && errors.length === 0,
    errors,
    warnings,
    criticalIssues,
    systemStatus
  };
}

/**
 * Validate CSP integration with other security systems
 */
async function validateCSPIntegration(): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
  criticalIssues: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const criticalIssues: string[] = [];

  try {
    // Import production config to test CSP
    const { generateDynamicCSP, getProductionSecurityConfig } = await import('../security/production-config');

    const config = getProductionSecurityConfig();
    const cspTest = generateDynamicCSP();

    // Validate CSP doesn't contain unsafe directives
    if (cspTest.policy.includes("'unsafe-inline'") || cspTest.policy.includes("'unsafe-eval'")) {
      criticalIssues.push('CRITICAL: CSP contains unsafe directives in production');
    }

    // Validate nonce generation
    if (!cspTest.nonce || cspTest.nonce.length < 16) {
      criticalIssues.push('CRITICAL: CSP nonce generation is weak or missing');
    }

    // Check CSP completeness
    const requiredDirectives = ['default-src', 'script-src', 'style-src', 'object-src', 'base-uri'];
    requiredDirectives.forEach(directive => {
      if (!cspTest.policy.includes(directive)) {
        errors.push(`Missing required CSP directive: ${directive}`);
      }
    });

    console.log('✅ CSP integration validation completed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    criticalIssues.push(`CSP integration validation failed: ${errorMessage}`);
  }

  return { isValid: criticalIssues.length === 0 && errors.length === 0, errors, warnings, criticalIssues };
}

/**
 * Validate encryption system integration
 */
async function validateEncryptionIntegration(): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
  criticalIssues: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const criticalIssues: string[] = [];

  try {
    // Test encryption system availability
    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey) {
      criticalIssues.push('CRITICAL: Encryption key not available');
      return { isValid: false, errors, warnings, criticalIssues };
    }

    // Validate encryption key format
    if (encryptionKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(encryptionKey)) {
      criticalIssues.push('CRITICAL: Encryption key format invalid');
    }

    // Try to import and test encryption module
    const { encrypt, decrypt } = await import('../encryption');

    // Test encryption/decryption functionality
    const testData = 'security-integration-test';
    try {
      const encrypted = await encrypt(testData);
      const decrypted = await decrypt(encrypted);

      if (decrypted !== testData) {
        criticalIssues.push('CRITICAL: Encryption/decryption test failed');
      }
    } catch (encryptError) {
      const errorMessage = encryptError instanceof Error ? encryptError.message : 'Unknown error';
      criticalIssues.push(`CRITICAL: Encryption system test failed: ${errorMessage}`);
    }

    console.log('✅ Encryption integration validation completed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    criticalIssues.push(`Encryption integration validation failed: ${errorMessage}`);
  }

  return { isValid: criticalIssues.length === 0 && errors.length === 0, errors, warnings, criticalIssues };
}

/**
 * Validate authentication system integration
 */
async function validateAuthenticationIntegration(): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
  criticalIssues: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const criticalIssues: string[] = [];

  try {
    // Check authentication configuration
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;
    const jwtSecret = process.env.JWT_SECRET;

    if (!nextAuthSecret || nextAuthSecret.length < 32) {
      criticalIssues.push('CRITICAL: NextAuth secret missing or too weak');
    }

    if (!jwtSecret || jwtSecret.length < 32) {
      criticalIssues.push('CRITICAL: JWT secret missing or too weak');
    }

    // Check for authentication bypass
    if (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true' && process.env.NODE_ENV === 'production') {
      criticalIssues.push('CRITICAL: Authentication bypass enabled in production');
    }

    // Test session security integration
    try {
      const { generateSessionFingerprint } = await import('../auth/session-security');
      const fingerprint = generateSessionFingerprint();

      if (!fingerprint || !fingerprint.timestamp) {
        warnings.push('Session fingerprinting may not be working correctly');
      }
    } catch (sessionError) {
      const errorMessage = sessionError instanceof Error ? sessionError.message : 'Unknown error';
      warnings.push(`Session security integration warning: ${errorMessage}`);
    }

    console.log('✅ Authentication integration validation completed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    criticalIssues.push(`Authentication integration validation failed: ${errorMessage}`);
  }

  return { isValid: criticalIssues.length === 0 && errors.length === 0, errors, warnings, criticalIssues };
}

/**
 * Validate session security integration
 */
async function validateSessionSecurityIntegration(): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
  criticalIssues: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const criticalIssues: string[] = [];

  try {
    // Test session security modules
    const sessionModules = [
      '../auth/session-security',
      '../auth/session-validation',
      '../auth/session-manager'
    ];

    for (const modulePath of sessionModules) {
      try {
        await import(modulePath);
      } catch (importError) {
        const errorMessage = importError instanceof Error ? importError.message : 'Unknown error';
        warnings.push(`Session module ${modulePath} could not be imported: ${errorMessage}`);
      }
    }

    console.log('✅ Session security integration validation completed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    criticalIssues.push(`Session security integration validation failed: ${errorMessage}`);
  }

  return { isValid: criticalIssues.length === 0 && errors.length === 0, errors, warnings, criticalIssues };
}

/**
 * Validate environment variable security integration
 */
async function validateEnvironmentIntegration(): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
  criticalIssues: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const criticalIssues: string[] = [];

  try {
    // Import environment validator
    const {
      validateProductionEnvironment,
      detectEnvironmentLeaks,
      sanitizeEnvForLogging
    } = await import('../security/env-validator');

    // Run environment validation
    const envValidation = validateProductionEnvironment();
    criticalIssues.push(...envValidation.criticalIssues);
    errors.push(...envValidation.errors);
    warnings.push(...envValidation.warnings);

    // Check for environment leaks
    const leakValidation = detectEnvironmentLeaks();
    criticalIssues.push(...leakValidation.criticalIssues);
    errors.push(...leakValidation.errors);
    warnings.push(...leakValidation.warnings);

    // Test environment sanitization
    const sanitized = sanitizeEnvForLogging();
    if (!sanitized || typeof sanitized !== 'object') {
      warnings.push('Environment sanitization function may not be working correctly');
    }

    console.log('✅ Environment integration validation completed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    criticalIssues.push(`Environment integration validation failed: ${errorMessage}`);
  }

  return { isValid: criticalIssues.length === 0 && errors.length === 0, errors, warnings, criticalIssues };
}

/**
 * Initialize security monitoring
 */
export function initializeSecurityMonitoring(): SecurityMonitor {
  return SecurityMonitor.getInstance();
}

/**
 * Initialize security monitoring with integration validation
 */
export async function initializeSecurityMonitoringWithValidation(): Promise<{
  monitor: SecurityMonitor;
  validation: Awaited<ReturnType<typeof validateSecurityIntegration>>;
}> {
  const monitor = SecurityMonitor.getInstance();

  console.log('🔒 Starting security integration validation...');
  const validation = await validateSecurityIntegration();

  if (validation.isValid) {
    console.log('✅ All security systems validated and integrated successfully');
  } else {
    console.error('❌ Security integration validation failed');

    if (validation.criticalIssues.length > 0) {
      console.error('🚨 CRITICAL ISSUES:', validation.criticalIssues);
    }
    if (validation.errors.length > 0) {
      console.error('❌ ERRORS:', validation.errors);
    }
    if (validation.warnings.length > 0) {
      console.warn('⚠️ WARNINGS:', validation.warnings);
    }
  }

  console.log('📊 System Status:', validation.systemStatus);

  return { monitor, validation };
}

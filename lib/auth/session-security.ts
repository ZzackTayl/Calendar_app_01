/**
 * Session Security Utilities
 * 
 * Provides advanced security measures to prevent session hijacking,
 * identity confusion, and unauthorized access
 */

import { User } from '@supabase/supabase-js';

interface SessionFingerprint {
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  timestamp: number;
}

interface SecurityAlert {
  type: 'session_hijack' | 'identity_confusion' | 'suspicious_activity' | 'fingerprint_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  details: Record<string, any>;
}

/**
 * Generate a device/browser fingerprint for session security
 */
export function generateSessionFingerprint(): SessionFingerprint {
  if (typeof window === 'undefined') {
    return {
      userAgent: 'server-side',
      screenResolution: 'unknown',
      timezone: 'UTC',
      language: 'en',
      timestamp: Date.now()
    };
  }

  return {
    userAgent: navigator.userAgent.substring(0, 100), // Truncate for storage
    screenResolution: `${screen.width}x${screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    timestamp: Date.now()
  };
}

/**
 * Compare fingerprints to detect potential session hijacking
 */
export function validateSessionFingerprint(
  stored: SessionFingerprint, 
  current: SessionFingerprint
): SecurityAlert[] {
  const alerts: SecurityAlert[] = [];

  // Check user agent changes (high severity - could indicate hijacking)
  if (stored.userAgent !== current.userAgent) {
    alerts.push({
      type: 'fingerprint_mismatch',
      severity: 'high',
      message: 'User agent changed during session',
      timestamp: Date.now(),
      details: {
        storedUserAgent: stored.userAgent,
        currentUserAgent: current.userAgent,
        timeDiff: current.timestamp - stored.timestamp
      }
    });
  }

  // Check screen resolution changes (medium severity)
  if (stored.screenResolution !== current.screenResolution) {
    alerts.push({
      type: 'fingerprint_mismatch',
      severity: 'medium',
      message: 'Screen resolution changed during session',
      timestamp: Date.now(),
      details: {
        storedResolution: stored.screenResolution,
        currentResolution: current.screenResolution
      }
    });
  }

  // Check timezone changes (medium severity - could indicate location change)
  if (stored.timezone !== current.timezone) {
    alerts.push({
      type: 'suspicious_activity',
      severity: 'medium',
      message: 'Timezone changed during session',
      timestamp: Date.now(),
      details: {
        storedTimezone: stored.timezone,
        currentTimezone: current.timezone
      }
    });
  }

  return alerts;
}

/**
 * Store session fingerprint securely
 */
export function storeSessionFingerprint(userId: string, fingerprint: SessionFingerprint): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = `ph_session_fp_${userId}`;
    const data = {
      ...fingerprint,
      encrypted: true, // Future: implement actual encryption
      version: '1.0'
    };
    
    sessionStorage.setItem(key, JSON.stringify(data));
    
    console.log('SessionSecurity: Fingerprint stored for user:', userId);
  } catch (error) {
    console.error('SessionSecurity: Failed to store fingerprint:', error);
  }
}

/**
 * Retrieve stored session fingerprint
 */
export function getStoredSessionFingerprint(userId: string): SessionFingerprint | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = `ph_session_fp_${userId}`;
    const stored = sessionStorage.getItem(key);
    
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    return {
      userAgent: data.userAgent,
      screenResolution: data.screenResolution,
      timezone: data.timezone,
      language: data.language,
      timestamp: data.timestamp
    };
  } catch (error) {
    console.error('SessionSecurity: Failed to retrieve fingerprint:', error);
    return null;
  }
}

/**
 * Clear session fingerprint on logout
 */
export function clearSessionFingerprint(userId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = `ph_session_fp_${userId}`;
    sessionStorage.removeItem(key);
    
    console.log('SessionSecurity: Fingerprint cleared for user:', userId);
  } catch (error) {
    console.error('SessionSecurity: Failed to clear fingerprint:', error);
  }
}

/**
 * Validate user identity consistency
 */
export function validateUserIdentity(
  storedUser: User | null, 
  currentUser: User | null
): SecurityAlert[] {
  const alerts: SecurityAlert[] = [];

  // Both users must exist for comparison
  if (!storedUser || !currentUser) return alerts;

  // Check for user ID changes (critical - indicates session hijacking)
  if (storedUser.id !== currentUser.id) {
    alerts.push({
      type: 'identity_confusion',
      severity: 'critical',
      message: 'User ID changed during session - possible session hijacking',
      timestamp: Date.now(),
      details: {
        storedUserId: storedUser.id,
        currentUserId: currentUser.id,
        storedEmail: storedUser.email,
        currentEmail: currentUser.email
      }
    });
  }

  // Check for email changes without proper verification flow
  if (storedUser.email !== currentUser.email) {
    alerts.push({
      type: 'identity_confusion',
      severity: 'high',
      message: 'Email address changed during session without verification',
      timestamp: Date.now(),
      details: {
        storedEmail: storedUser.email,
        currentEmail: currentUser.email,
        emailVerified: !!currentUser.email_confirmed_at
      }
    });
  }

  // Check for suspicious metadata changes
  const storedMetadata = storedUser.user_metadata || {};
  const currentMetadata = currentUser.user_metadata || {};
  
  if (storedMetadata.full_name !== currentMetadata.full_name && 
      Math.abs(Date.now() - new Date(currentUser.updated_at || 0).getTime()) < 60000) {
    alerts.push({
      type: 'suspicious_activity',
      severity: 'medium',
      message: 'User metadata changed recently during session',
      timestamp: Date.now(),
      details: {
        storedName: storedMetadata.full_name,
        currentName: currentMetadata.full_name,
        lastUpdated: currentUser.updated_at
      }
    });
  }

  return alerts;
}

/**
 * Handle security alerts with appropriate responses
 */
export function handleSecurityAlert(alert: SecurityAlert): 'continue' | 'warn' | 'terminate' {
  // Log all security alerts
  const logLevel = alert.severity === 'critical' || alert.severity === 'high' ? 'error' : 'warn';
  console[logLevel]('SessionSecurity: Security alert detected:', {
    type: alert.type,
    severity: alert.severity,
    message: alert.message,
    timestamp: new Date(alert.timestamp).toISOString(),
    details: alert.details
  });

  // Determine response based on severity
  switch (alert.severity) {
    case 'critical':
      // Terminate session immediately
      return 'terminate';
      
    case 'high':
      // Session hijacking attempts should terminate session
      if (alert.type === 'session_hijack' || alert.type === 'identity_confusion') {
        return 'terminate';
      }
      return 'warn';
      
    case 'medium':
      return 'warn';
      
    case 'low':
    default:
      return 'continue';
  }
}

/**
 * Comprehensive session security check
 */
export function performSecurityCheck(
  userId: string,
  currentUser: User | null,
  storedUser: User | null
): { alerts: SecurityAlert[], action: 'continue' | 'warn' | 'terminate' } {
  const alerts: SecurityAlert[] = [];
  
  // Generate current fingerprint and compare with stored
  const currentFingerprint = generateSessionFingerprint();
  const storedFingerprint = getStoredSessionFingerprint(userId);
  
  if (storedFingerprint) {
    alerts.push(...validateSessionFingerprint(storedFingerprint, currentFingerprint));
  } else if (currentUser) {
    // Store fingerprint for future checks
    storeSessionFingerprint(userId, currentFingerprint);
  }
  
  // Validate user identity consistency
  alerts.push(...validateUserIdentity(storedUser, currentUser));
  
  // Determine worst-case action needed
  let worstAction: 'continue' | 'warn' | 'terminate' = 'continue';
  
  for (const alert of alerts) {
    const action = handleSecurityAlert(alert);
    if (action === 'terminate') {
      worstAction = 'terminate';
      break; // No need to check further
    } else if (action === 'warn' && worstAction === 'continue') {
      worstAction = 'warn';
    }
  }
  
  return { alerts, action: worstAction };
}

/**
 * Session security audit log
 */
export function auditSessionSecurity(
  userId: string,
  event: 'login' | 'logout' | 'refresh' | 'validation' | 'security_alert',
  details: Record<string, any> = {}
): void {
  const auditEntry = {
    timestamp: new Date().toISOString(),
    userId,
    event,
    userAgent: typeof window !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'server',
    details
  };
  
  // Log for debugging - in production, this should go to a secure audit log
  console.log('SessionSecurity: AUDIT:', auditEntry);
  
  // Future: Send to secure audit logging service
}
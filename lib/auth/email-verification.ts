/**
 * Email Verification Security Utilities
 * 
 * This module provides utilities for enforcing email verification requirements
 * across the application. It ensures that unverified users cannot access
 * protected resources and provides consistent error messaging.
 */

import { User } from '@supabase/supabase-js'

/**
 * Checks if a user's email address has been verified
 * 
 * @param user - The user object from Supabase
 * @returns true if the email is verified, false otherwise
 */
export function isEmailVerified(user: User | null): boolean {
  if (!user) {
    return false
  }

  // Check if email_confirmed_at is set
  return !!user.email_confirmed_at
}

/**
 * Validates that a user is authenticated and email verified
 * 
 * @param user - The user object from Supabase
 * @returns object with validation result and error message if applicable
 */
export function validateUserAccess(user: User | null): {
  isValid: boolean
  error?: string
  requiresEmailVerification?: boolean
} {
  if (!user) {
    return {
      isValid: false,
      error: 'Authentication required'
    }
  }

  if (!isEmailVerified(user)) {
    return {
      isValid: false,
      error: 'Please check your email and click the confirmation link to verify your account before signing in.',
      requiresEmailVerification: true
    }
  }

  return {
    isValid: true
  }
}

/**
 * Standard error message for unverified email addresses
 */
export const EMAIL_VERIFICATION_ERROR = 'Please check your email and click the confirmation link to verify your account before signing in.'

/**
 * Security event types for logging
 */
export enum SecurityEventType {
  UNVERIFIED_LOGIN_ATTEMPT = 'UNVERIFIED_LOGIN_ATTEMPT',
  UNVERIFIED_ACCESS_BLOCKED = 'UNVERIFIED_ACCESS_BLOCKED',
  EMAIL_VERIFICATION_BYPASS_ATTEMPT = 'EMAIL_VERIFICATION_BYPASS_ATTEMPT'
}

/**
 * Logs a security event related to email verification
 * 
 * @param eventType - The type of security event
 * @param userEmail - The email address involved
 * @param additionalData - Additional context data
 */
export function logEmailVerificationSecurityEvent(
  eventType: SecurityEventType,
  userEmail: string,
  additionalData?: Record<string, any>
) {
  const securityEvent = {
    type: eventType,
    email: userEmail,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
    ...additionalData
  }

  // Log to console (in production, you'd send this to a security monitoring service)
  console.warn('Security Event:', securityEvent)

  // In production, you would also:
  // - Send to security monitoring service
  // - Store in audit log database
  // - Trigger alerts if needed
}
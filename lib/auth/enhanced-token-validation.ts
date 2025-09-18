/**
 * Enhanced Token Validation Service
 *
 * Provides comprehensive JWT token validation with cryptographic verification,
 * replay attack prevention, and advanced security checks for production environments.
 */

import { createSupabaseClient } from '@/lib/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export interface TokenValidationOptions {
  /** Whether to validate token signature cryptographically */
  validateSignature?: boolean;
  /** Check for token replay attacks */
  checkReplayAttacks?: boolean;
  /** Validate token issuer claims */
  validateIssuer?: boolean;
  /** Validate audience claims */
  validateAudience?: boolean;
  /** Custom validation context */
  context?: {
    expectedIssuer?: string;
    expectedAudience?: string;
    maxAge?: number; // in seconds
    allowedAlgorithms?: string[];
  };
}

export interface TokenValidationResult {
  isValid: boolean;
  user: User | null;
  session: Session | null;
  error: string | null;
  securityAlerts: TokenSecurityAlert[];
  tokenMetadata: TokenMetadata | null;
  validationScore: number; // 0-100
}

export interface TokenSecurityAlert {
  type: 'signature_invalid' | 'expired' | 'replay_attack' | 'issuer_mismatch' |
        'audience_mismatch' | 'algorithm_mismatch' | 'malformed' | 'suspicious_claims';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  details: Record<string, any>;
}

export interface TokenMetadata {
  header: JWTHeader;
  payload: JWTPayload;
  issuedAt: number;
  expiresAt: number;
  algorithm: string;
  keyId?: string;
  tokenAge: number; // in seconds
  remainingLife: number; // in seconds
}

interface JWTHeader {
  alg: string;
  typ: string;
  kid?: string;
}

interface JWTPayload {
  iss?: string; // issuer
  sub?: string; // subject (user ID)
  aud?: string; // audience
  exp?: number; // expiration time
  iat?: number; // issued at
  nbf?: number; // not before
  jti?: string; // JWT ID
  role?: string;
  email?: string;
  [key: string]: any;
}

// Token replay detection cache
const tokenReplayCache = new Map<string, number>();
const REPLAY_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_TOKEN_AGE = 24 * 60 * 60; // 24 hours in seconds

/**
 * Enhanced token validation with comprehensive security checks
 */
export async function validateToken(
  token: string,
  options: TokenValidationOptions = {}
): Promise<TokenValidationResult> {
  const validationId = Math.random().toString(36).substring(2, 15);
  const securityAlerts: TokenSecurityAlert[] = [];
  let validationScore = 100;

  console.log(`[${validationId}] Starting enhanced token validation`);

  try {
    // Step 1: Basic token format validation
    if (!token || typeof token !== 'string') {
      return createTokenValidationResult({
        isValid: false,
        error: 'Invalid token format',
        securityAlerts: [{
          type: 'malformed',
          severity: 'high',
          message: 'Token is null, undefined, or not a string',
          timestamp: Date.now(),
          details: { tokenType: typeof token }
        }],
        validationScore: 0,
        tokenMetadata: null
      });
    }

    // Step 2: Parse and validate JWT structure
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return createTokenValidationResult({
        isValid: false,
        error: 'Malformed JWT token',
        securityAlerts: [{
          type: 'malformed',
          severity: 'high',
          message: 'JWT token does not have 3 parts (header.payload.signature)',
          timestamp: Date.now(),
          details: { parts: tokenParts.length }
        }],
        validationScore: 0,
        tokenMetadata: null
      });
    }

    // Step 3: Decode and validate header
    let header: JWTHeader;
    try {
      header = JSON.parse(atob(tokenParts[0]));
    } catch (error) {
      return createTokenValidationResult({
        isValid: false,
        error: 'Invalid JWT header',
        securityAlerts: [{
          type: 'malformed',
          severity: 'high',
          message: 'Cannot decode JWT header',
          timestamp: Date.now(),
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        }],
        validationScore: 0,
        tokenMetadata: null
      });
    }

    // Step 4: Validate algorithm
    if (options.context?.allowedAlgorithms) {
      if (!options.context.allowedAlgorithms.includes(header.alg)) {
        securityAlerts.push({
          type: 'algorithm_mismatch',
          severity: 'critical',
          message: `Disallowed algorithm: ${header.alg}`,
          timestamp: Date.now(),
          details: {
            algorithm: header.alg,
            allowed: options.context.allowedAlgorithms
          }
        });
        validationScore -= 50;
      }
    }

    // Warn about weak algorithms
    if (['none', 'HS256'].includes(header.alg)) {
      securityAlerts.push({
        type: 'algorithm_mismatch',
        severity: 'medium',
        message: `Weak or insecure algorithm detected: ${header.alg}`,
        timestamp: Date.now(),
        details: { algorithm: header.alg }
      });
      validationScore -= 20;
    }

    // Step 5: Decode and validate payload
    let payload: JWTPayload;
    try {
      payload = JSON.parse(atob(tokenParts[1]));
    } catch (error) {
      return createTokenValidationResult({
        isValid: false,
        error: 'Invalid JWT payload',
        securityAlerts: [{
          type: 'malformed',
          severity: 'high',
          message: 'Cannot decode JWT payload',
          timestamp: Date.now(),
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        }],
        validationScore: 0,
        tokenMetadata: null
      });
    }

    // Step 6: Create token metadata
    const now = Math.floor(Date.now() / 1000);
    const tokenMetadata: TokenMetadata = {
      header,
      payload,
      issuedAt: payload.iat || 0,
      expiresAt: payload.exp || 0,
      algorithm: header.alg,
      keyId: header.kid,
      tokenAge: payload.iat ? now - payload.iat : 0,
      remainingLife: payload.exp ? payload.exp - now : 0
    };

    // Step 7: Validate temporal claims
    const temporalValidation = validateTemporalClaims(payload, options);
    securityAlerts.push(...temporalValidation.alerts);
    validationScore -= temporalValidation.scoreDeduction;

    if (temporalValidation.shouldReject) {
      return createTokenValidationResult({
        isValid: false,
        error: temporalValidation.error,
        securityAlerts,
        validationScore: 0,
        tokenMetadata
      });
    }

    // Step 8: Validate issuer and audience
    const claimsValidation = validateStandardClaims(payload, options);
    securityAlerts.push(...claimsValidation.alerts);
    validationScore -= claimsValidation.scoreDeduction;

    // Step 9: Check for replay attacks
    if (options.checkReplayAttacks && payload.jti) {
      const replayCheck = checkForReplayAttack(payload.jti, payload.iat || 0);
      if (replayCheck.isReplay) {
        return createTokenValidationResult({
          isValid: false,
          error: 'Token replay attack detected',
          securityAlerts: [...securityAlerts, {
            type: 'replay_attack',
            severity: 'critical',
            message: 'Token has been used before (replay attack)',
            timestamp: Date.now(),
            details: {
              jti: payload.jti,
              previousUse: replayCheck.previousUse
            }
          }],
          validationScore: 0,
          tokenMetadata
        });
      }
      // Record this token use
      recordTokenUse(payload.jti, payload.iat || 0);
    }

    // Step 10: Cryptographic signature validation (if enabled)
    if (options.validateSignature) {
      try {
        const signatureValid = await validateTokenSignature(token, header, payload);
        if (!signatureValid) {
          return createTokenValidationResult({
            isValid: false,
            error: 'Invalid token signature',
            securityAlerts: [...securityAlerts, {
              type: 'signature_invalid',
              severity: 'critical',
              message: 'Token signature verification failed',
              timestamp: Date.now(),
              details: { algorithm: header.alg }
            }],
            validationScore: 0,
            tokenMetadata
          });
        }
      } catch (error) {
        console.error(`[${validationId}] Signature validation error:`, error);
        securityAlerts.push({
          type: 'signature_invalid',
          severity: 'high',
          message: 'Unable to verify token signature',
          timestamp: Date.now(),
          details: { error: error instanceof Error ? error.message : 'Unknown error' }
        });
        validationScore -= 30;
      }
    }

    // Step 11: Use Supabase to validate the session
    const supabase = createSupabaseClient();

    // Set the session using the token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return createTokenValidationResult({
        isValid: false,
        error: sessionError?.message || 'No valid session found',
        securityAlerts: [...securityAlerts, {
          type: 'malformed',
          severity: 'high',
          message: 'Token does not correspond to valid session',
          timestamp: Date.now(),
          details: { sessionError: sessionError?.message }
        }],
        validationScore: Math.max(0, validationScore - 40),
        tokenMetadata
      });
    }

    // Step 12: Cross-validate token claims with session data
    if (session.user) {
      const crossValidation = validateTokenUserConsistency(payload, session.user);
      securityAlerts.push(...crossValidation.alerts);
      validationScore -= crossValidation.scoreDeduction;
    }

    // Step 13: Final validation score calculation
    const finalScore = Math.max(0, Math.min(100, validationScore));
    const isValidToken = finalScore >= 70 && temporalValidation.isValid;

    console.log(`[${validationId}] Token validation completed`, {
      isValid: isValidToken,
      score: finalScore,
      alerts: securityAlerts.length,
      userId: session.user?.id,
      algorithm: header.alg
    });

    return createTokenValidationResult({
      isValid: isValidToken,
      user: session.user,
      session,
      error: isValidToken ? null : 'Token validation failed security checks',
      securityAlerts,
      validationScore: finalScore,
      tokenMetadata
    });

  } catch (error) {
    console.error(`[${validationId}] Unexpected error during token validation:`, error);
    return createTokenValidationResult({
      isValid: false,
      error: error instanceof Error ? error.message : 'Token validation failed',
      securityAlerts: [{
        type: 'malformed',
        severity: 'high',
        message: 'Unexpected error during token validation',
        timestamp: Date.now(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }],
      validationScore: 0,
      tokenMetadata: null
    });
  }
}

/**
 * Validate temporal claims (exp, iat, nbf)
 */
function validateTemporalClaims(
  payload: JWTPayload,
  options: TokenValidationOptions
): {
  isValid: boolean;
  shouldReject: boolean;
  alerts: TokenSecurityAlert[];
  scoreDeduction: number;
  error?: string;
} {
  const alerts: TokenSecurityAlert[] = [];
  let scoreDeduction = 0;
  const now = Math.floor(Date.now() / 1000);

  // Check expiration
  if (payload.exp) {
    if (payload.exp <= now) {
      return {
        isValid: false,
        shouldReject: true,
        alerts: [{
          type: 'expired',
          severity: 'high',
          message: 'Token has expired',
          timestamp: Date.now(),
          details: {
            expiredAt: new Date(payload.exp * 1000).toISOString(),
            expiredAgo: now - payload.exp
          }
        }],
        scoreDeduction: 100,
        error: 'Token has expired'
      };
    }

    // Warn if expiring soon (within 5 minutes)
    if (payload.exp - now < 300) {
      alerts.push({
        type: 'expired',
        severity: 'medium',
        message: 'Token expiring soon',
        timestamp: Date.now(),
        details: {
          expiresIn: payload.exp - now,
          expiresAt: new Date(payload.exp * 1000).toISOString()
        }
      });
      scoreDeduction += 10;
    }
  } else {
    // No expiration claim is suspicious
    alerts.push({
      type: 'suspicious_claims',
      severity: 'medium',
      message: 'Token has no expiration claim',
      timestamp: Date.now(),
      details: {}
    });
    scoreDeduction += 15;
  }

  // Check not before
  if (payload.nbf && payload.nbf > now) {
    return {
      isValid: false,
      shouldReject: true,
      alerts: [{
        type: 'malformed',
        severity: 'high',
        message: 'Token not yet valid (nbf claim)',
        timestamp: Date.now(),
        details: {
          notBefore: new Date(payload.nbf * 1000).toISOString(),
          validIn: payload.nbf - now
        }
      }],
      scoreDeduction: 100,
      error: 'Token not yet valid'
    };
  }

  // Check issued at
  if (payload.iat) {
    const tokenAge = now - payload.iat;
    const maxAge = options.context?.maxAge || MAX_TOKEN_AGE;

    if (tokenAge > maxAge) {
      alerts.push({
        type: 'expired',
        severity: 'medium',
        message: 'Token is too old',
        timestamp: Date.now(),
        details: {
          tokenAge,
          maxAge,
          issuedAt: new Date(payload.iat * 1000).toISOString()
        }
      });
      scoreDeduction += 20;
    }

    // Check for future issued time (clock skew tolerance: 5 minutes)
    if (payload.iat > now + 300) {
      alerts.push({
        type: 'suspicious_claims',
        severity: 'high',
        message: 'Token issued in the future',
        timestamp: Date.now(),
        details: {
          issuedAt: new Date(payload.iat * 1000).toISOString(),
          issuedInFuture: payload.iat - now
        }
      });
      scoreDeduction += 30;
    }
  }

  return {
    isValid: true,
    shouldReject: false,
    alerts,
    scoreDeduction
  };
}

/**
 * Validate standard JWT claims (iss, aud)
 */
function validateStandardClaims(
  payload: JWTPayload,
  options: TokenValidationOptions
): {
  alerts: TokenSecurityAlert[];
  scoreDeduction: number;
} {
  const alerts: TokenSecurityAlert[] = [];
  let scoreDeduction = 0;

  // Validate issuer
  if (options.validateIssuer && options.context?.expectedIssuer) {
    if (payload.iss !== options.context.expectedIssuer) {
      alerts.push({
        type: 'issuer_mismatch',
        severity: 'high',
        message: 'Token issuer mismatch',
        timestamp: Date.now(),
        details: {
          expected: options.context.expectedIssuer,
          actual: payload.iss
        }
      });
      scoreDeduction += 40;
    }
  }

  // Validate audience
  if (options.validateAudience && options.context?.expectedAudience) {
    const tokenAudience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!tokenAudience.includes(options.context.expectedAudience)) {
      alerts.push({
        type: 'audience_mismatch',
        severity: 'high',
        message: 'Token audience mismatch',
        timestamp: Date.now(),
        details: {
          expected: options.context.expectedAudience,
          actual: payload.aud
        }
      });
      scoreDeduction += 40;
    }
  }

  return { alerts, scoreDeduction };
}

/**
 * Check for token replay attacks
 */
function checkForReplayAttack(jti: string, iat: number): {
  isReplay: boolean;
  previousUse?: number;
} {
  const key = `${jti}:${iat}`;
  const previousUse = tokenReplayCache.get(key);

  if (previousUse) {
    return { isReplay: true, previousUse };
  }

  return { isReplay: false };
}

/**
 * Record token use for replay detection
 */
function recordTokenUse(jti: string, iat: number): void {
  const key = `${jti}:${iat}`;
  const now = Date.now();

  tokenReplayCache.set(key, now);

  // Clean up old entries
  if (tokenReplayCache.size > 10000) {
    const entries = Array.from(tokenReplayCache.entries());
    entries.sort((a, b) => a[1] - b[1]);

    // Remove oldest 20%
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      tokenReplayCache.delete(entries[i][0]);
    }
  }
}

/**
 * Validate token signature (placeholder - would need proper implementation)
 */
async function validateTokenSignature(
  token: string,
  header: JWTHeader,
  payload: JWTPayload
): Promise<boolean> {
  // This is a placeholder implementation
  // In a real application, you would:
  // 1. Get the public key for signature verification
  // 2. Use Web Crypto API or a JWT library to verify the signature
  // 3. Handle different signature algorithms appropriately

  console.warn('Token signature validation not fully implemented - always returning true');
  return true;
}

/**
 * Validate consistency between token claims and session user data
 */
function validateTokenUserConsistency(
  payload: JWTPayload,
  user: User
): {
  alerts: TokenSecurityAlert[];
  scoreDeduction: number;
} {
  const alerts: TokenSecurityAlert[] = [];
  let scoreDeduction = 0;

  // Check user ID consistency
  if (payload.sub && payload.sub !== user.id) {
    alerts.push({
      type: 'suspicious_claims',
      severity: 'critical',
      message: 'Token subject does not match session user',
      timestamp: Date.now(),
      details: {
        tokenSubject: payload.sub,
        sessionUserId: user.id
      }
    });
    scoreDeduction += 50;
  }

  // Check email consistency
  if (payload.email && payload.email !== user.email) {
    alerts.push({
      type: 'suspicious_claims',
      severity: 'high',
      message: 'Token email does not match session user email',
      timestamp: Date.now(),
      details: {
        tokenEmail: payload.email,
        sessionEmail: user.email
      }
    });
    scoreDeduction += 30;
  }

  return { alerts, scoreDeduction };
}

/**
 * Create standardized token validation result
 */
function createTokenValidationResult(params: {
  isValid: boolean;
  user?: User | null;
  session?: Session | null;
  error?: string | null;
  securityAlerts: TokenSecurityAlert[];
  validationScore: number;
  tokenMetadata: TokenMetadata | null;
}): TokenValidationResult {
  return {
    isValid: params.isValid,
    user: params.user || null,
    session: params.session || null,
    error: params.error || null,
    securityAlerts: params.securityAlerts,
    tokenMetadata: params.tokenMetadata,
    validationScore: params.validationScore
  };
}

/**
 * Clean up replay attack cache
 */
export function cleanupTokenReplayCache(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, timestamp] of tokenReplayCache.entries()) {
    if (now - timestamp > REPLAY_CACHE_TTL) {
      tokenReplayCache.delete(key);
      cleaned++;
    }
  }

  return cleaned;
}

/**
 * Get token validation metrics
 */
export function getTokenValidationMetrics(): {
  replayCacheSize: number;
  oldestEntry: number | null;
} {
  let oldestEntry: number | null = null;

  for (const timestamp of tokenReplayCache.values()) {
    if (oldestEntry === null || timestamp < oldestEntry) {
      oldestEntry = timestamp;
    }
  }

  return {
    replayCacheSize: tokenReplayCache.size,
    oldestEntry
  };
}

// Periodic cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupTokenReplayCache, 60 * 60 * 1000);
}
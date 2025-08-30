/**
 * Password Breach Detection Utilities
 * Provides client-side checks against known password breaches using HaveIBeenPwned API
 * This serves as an additional layer of protection alongside Supabase's built-in protection
 */

import { createHash } from 'crypto';

interface BreachCheckResult {
  isBreached: boolean;
  breachCount?: number;
  error?: string;
}

/**
 * Check if a password has been compromised in known data breaches
 * Uses k-anonymity model - only sends first 5 characters of SHA-1 hash
 */
export async function checkPasswordBreach(password: string): Promise<BreachCheckResult> {
  try {
    // Generate SHA-1 hash of password
    const hash = createHash('sha1').update(password).digest('hex').toLowerCase();
    const prefix = hash.substring(0, 5);
    const suffix = hash.substring(5);

    // Query HaveIBeenPwned API with k-anonymity
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'PolyHarmony-Calendar-Security-Check',
      },
    });

    if (!response.ok) {
      return { isBreached: false, error: 'Service unavailable' };
    }

    const data = await response.text();
    const lines = data.split('\n');
    
    // Check if our hash suffix appears in the results
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix.toLowerCase() === suffix) {
        return { 
          isBreached: true, 
          breachCount: parseInt(count.trim(), 10)
        };
      }
    }

    return { isBreached: false };
  } catch (error) {
    console.error('Password breach check failed:', error);
    return { isBreached: false, error: 'Check failed' };
  }
}

/**
 * Validate password strength and breach status
 */
export interface PasswordValidation {
  isValid: boolean;
  isBreached: boolean;
  breachCount?: number;
  strength: 'weak' | 'medium' | 'strong';
  issues: string[];
}

export async function validatePasswordSecurity(password: string): Promise<PasswordValidation> {
  const issues: string[] = [];
  let strength: 'weak' | 'medium' | 'strong' = 'weak';

  // Basic strength checks
  if (password.length < 12) {
    issues.push('Password must be at least 12 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    issues.push('Password must contain lowercase letters');
  }
  
  if (!/[A-Z]/.test(password)) {
    issues.push('Password must contain uppercase letters');
  }
  
  if (!/\d/.test(password)) {
    issues.push('Password must contain numbers');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) {
    issues.push('Password must contain special characters');
  }

  // Determine strength
  if (issues.length === 0 && password.length >= 16) {
    strength = 'strong';
  } else if (issues.length <= 2 && password.length >= 12) {
    strength = 'medium';
  }

  // Check for breaches
  const breachResult = await checkPasswordBreach(password);
  
  if (breachResult.isBreached) {
    issues.push(`This password has been found in ${breachResult.breachCount} data breaches`);
  }

  return {
    isValid: issues.length === 0,
    isBreached: breachResult.isBreached,
    breachCount: breachResult.breachCount,
    strength,
    issues
  };
}
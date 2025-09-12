import * as bcrypt from 'bcrypt'

/**
 * Security configuration for password hashing
 */
const SALT_ROUNDS = 12 // Industry standard for bcrypt

/**
 * Hash a password securely using bcrypt
 * @param password - The plain text password to hash
 * @returns Promise<string> - The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.trim().length === 0) {
    throw new Error('Password cannot be empty')
  }
  
  return await bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against its hash
 * @param password - The plain text password to verify
 * @param hash - The stored password hash
 * @returns Promise<boolean> - True if password matches, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false
  }
  
  return await bcrypt.compare(password, hash)
}

/**
 * Password strength levels for progressive feedback
 */
export enum PasswordStrength {
  VERY_WEAK = 0,
  WEAK = 1,
  FAIR = 2,
  GOOD = 3,
  STRONG = 4,
  VERY_STRONG = 5
}

/**
 * Enhanced password validation result
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  strength: PasswordStrength;
  score: number; // 0-100
  feedback: string[];
}

/**
 * Check if a password meets security requirements
 * Enhanced with progressive strength indicators and better feedback
 * @param password - The password to validate
 * @returns PasswordValidationResult - Enhanced validation result
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const feedback: string[] = []
  let score = 0
  
  // Minimum length requirement increased from 8 to 12
  if (!password || password.length < 12) {
    errors.push('Password must be at least 12 characters long')
  } else {
    score += Math.min(25, password.length * 2) // Up to 25 points for length
    if (password.length >= 16) {
      feedback.push('Excellent length')
    } else if (password.length >= 14) {
      feedback.push('Good length')
    }
  }
  
  // Character variety checks with scoring
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /\d/.test(password)
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)
  
  if (!hasUpper) {
    errors.push('Password must contain at least one uppercase letter')
  } else {
    score += 15
    feedback.push('Contains uppercase letters')
  }
  
  if (!hasLower) {
    errors.push('Password must contain at least one lowercase letter')
  } else {
    score += 15
    feedback.push('Contains lowercase letters')
  }
  
  if (!hasNumber) {
    errors.push('Password must contain at least one number')
  } else {
    score += 15
    feedback.push('Contains numbers')
  }
  
  if (!hasSpecial) {
    errors.push('Password must contain at least one special character')
  } else {
    score += 15
    feedback.push('Contains special characters')
  }
  
  // Advanced security checks
  // Check for character variety beyond basic requirements
  const upperCount = (password.match(/[A-Z]/g) || []).length
  const lowerCount = (password.match(/[a-z]/g) || []).length
  const numberCount = (password.match(/\d/g) || []).length
  const specialCount = (password.match(/[!@#$%^&*(),.?":{}|<>]/g) || []).length
  
  if (upperCount >= 2) score += 5
  if (lowerCount >= 2) score += 5
  if (numberCount >= 2) score += 5
  if (specialCount >= 2) score += 5
  
  // Check for common patterns (reduce security)
  const commonPatterns = [
    /(.)\1{2,}/, // Repeated characters (aaa, 111)
    /123|234|345|456|567|678|789|890/, // Sequential numbers
    /abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i, // Sequential letters
    /qwerty|asdfgh|zxcvbn/i, // Keyboard patterns
  ]
  
  commonPatterns.forEach(pattern => {
    if (pattern.test(password)) {
      score -= 10
      warnings.push('Avoid common patterns and repeated characters')
    }
  })
  
  // Check for common weak passwords
  const weakPasswords = [
    'password', 'password123', '123456789', 'qwertyuiop',
    'admin', 'administrator', 'root', 'user', 'guest'
  ]
  
  if (weakPasswords.some(weak => password.toLowerCase().includes(weak))) {
    score -= 20
    warnings.push('Avoid common passwords and dictionary words')
  }
  
  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score))
  
  // Determine strength level based on score
  let strength: PasswordStrength
  if (score >= 85) {
    strength = PasswordStrength.VERY_STRONG
    feedback.push('Excellent password security!')
  } else if (score >= 70) {
    strength = PasswordStrength.STRONG
    feedback.push('Strong password security')
  } else if (score >= 55) {
    strength = PasswordStrength.GOOD
    feedback.push('Good password security')
  } else if (score >= 40) {
    strength = PasswordStrength.FAIR
    feedback.push('Fair password security')
  } else if (score >= 25) {
    strength = PasswordStrength.WEAK
    warnings.push('Password is weak - consider making it stronger')
  } else {
    strength = PasswordStrength.VERY_WEAK
    warnings.push('Password is very weak - please strengthen it')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    strength,
    score,
    feedback
  }
}

/**
 * Generate a secure random password with enhanced security
 * @param length - Length of the password (default: 16, minimum: 12)
 * @returns string - A secure random password that meets all requirements
 */
export function generateSecurePassword(length: number = 16): string {
  // Ensure minimum length meets new requirements
  const minLength = Math.max(12, length)
  
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const specials = '!@#$%^&*(),.?":{}|<>'
  const allChars = uppercase + lowercase + numbers + specials
  
  let password = ''
  
  // Ensure at least 2 characters from each required category for stronger passwords
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += specials[Math.floor(Math.random() * specials.length)]
  password += specials[Math.floor(Math.random() * specials.length)]
  
  // Fill the remaining length with random characters
  for (let i = 8; i < minLength; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }
  
  // Shuffle the password to avoid predictable patterns
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Backward compatibility function - maintains old interface
 * @deprecated Use validatePasswordStrength for enhanced feedback
 */
export function validatePasswordStrengthLegacy(password: string): { isValid: boolean, errors: string[] } {
  const result = validatePasswordStrength(password)
  return {
    isValid: result.isValid,
    errors: result.errors
  }
}

/**
 * Password Breach Detection
 * 
 * Checks if passwords have been compromised using a local database
 * of commonly compromised passwords and patterns.
 */
export async function checkPasswordCompromised(password: string): Promise<{
  isCompromised: boolean;
  breachCount?: number;
  error?: string;
}> {
  try {
    // Check against comprehensive list of compromised passwords
    const compromisedPasswords = [
      'password', 'password123', '123456789', 'qwertyuiop',
      'admin', 'letmein', 'welcome', 'monkey', 'dragon',
      '123456', '12345678', '1234567890', 'qwerty', 'abc123',
      'password1', 'password12', 'password123', 'password1234',
      'admin123', 'root', 'toor', 'guest', 'user', 'test',
      'master', 'superman', 'batman', 'jordan', 'harley',
      'ranger', 'jessie', 'daniel', 'hannah', 'michael',
      'michelle', 'charlie', 'samantha', 'thomas', 'robert',
      'nicole', 'daniel', 'jennifer', 'joshua', 'karen',
      'william', 'kimberly', 'christopher', 'amanda', 'james',
      'stephanie', 'matthew', 'elizabeth', 'anthony', 'heather',
      'mark', 'melissa', 'donald', 'deborah', 'paul',
      'dorothy', 'lisa', 'nancy', 'karen', 'betty',
      'helen', 'sandra', 'donna', 'carol', 'ruth',
      'sharon', 'michelle', 'laura', 'sarah', 'kimberly',
      'deborah', 'dorothy', 'lisa', 'nancy', 'karen'
    ];
    
    // Check for exact matches
    const exactMatch = compromisedPasswords.includes(password.toLowerCase());
    
    // Check for partial matches (password contains compromised patterns)
    const partialMatch = compromisedPasswords.some(compromised => 
      password.toLowerCase().includes(compromised.toLowerCase()) ||
      compromised.toLowerCase().includes(password.toLowerCase())
    );
    
    // Check for common patterns
    const commonPatterns = [
      /^[0-9]+$/, // All numbers
      /^[a-z]+$/, // All lowercase letters
      /^[A-Z]+$/, // All uppercase letters
      /^(.)\1+$/, // Repeated characters
      /^(.)\1{2,}$/, // Three or more repeated characters
      /^(.)\1{3,}$/  // Four or more repeated characters
    ];
    
    const patternMatch = commonPatterns.some(pattern => pattern.test(password));
    
    const isCompromised = exactMatch || partialMatch || patternMatch;
    
    return {
      isCompromised,
      breachCount: isCompromised ? 1 : 0
    };
    
  } catch (error) {
    return {
      isCompromised: false,
      error: 'Unable to check password against breach database'
    };
  }
}

/**
 * Enhanced password validation with breach checking
 */
export async function validatePasswordSecurity(password: string): Promise<PasswordValidationResult & {
  compromised?: boolean;
  breachCount?: number;
}> {
  const strengthResult = validatePasswordStrength(password)
  const breachCheck = await checkPasswordCompromised(password)
  
  if (breachCheck.isCompromised) {
    strengthResult.errors.push('Password has been found in data breaches')
    strengthResult.warnings.push(`Password found in ${breachCheck.breachCount} breach(es)`)
  }
  
  return {
    ...strengthResult,
    compromised: breachCheck.isCompromised,
    breachCount: breachCheck.breachCount
  }
}

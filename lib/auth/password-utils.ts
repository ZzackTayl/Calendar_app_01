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
 * Check if a password meets security requirements
 * @param password - The password to validate
 * @returns { isValid: boolean, errors: string[] } - Validation result
 */
export function validatePasswordStrength(password: string): { isValid: boolean, errors: string[] } {
  const errors: string[] = []
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Generate a secure random password
 * @param length - Length of the password (default: 16)
 * @returns string - A secure random password
 */
export function generateSecurePassword(length: number = 16): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  
  // Ensure at least one character from each required category
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)] // uppercase
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)] // lowercase
  password += '0123456789'[Math.floor(Math.random() * 10)] // number
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)] // special
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

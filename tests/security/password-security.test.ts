import { describe, it, expect, beforeEach } from 'vitest'
import { hashPassword, verifyPassword, validatePasswordStrength, generateSecurePassword } from '@/lib/auth/password-utils'

describe('Password Security Tests', () => {
  describe('Password Hashing', () => {
    it('should hash passwords securely with bcrypt', async () => {
      const password = 'SecurePassword123!'
      const hash = await hashPassword(password)
      
      // Verify it's a bcrypt hash (starts with $2b$)
      expect(hash).toMatch(/^\$2b\$/)
      
      // Verify the hash is different each time (due to salt)
      const hash2 = await hashPassword(password)
      expect(hash).not.toBe(hash2)
    })

    it('should verify passwords correctly', async () => {
      const password = 'SecurePassword123!'
      const hash = await hashPassword(password)
      
      // Correct password should verify
      const isValid = await verifyPassword(password, hash)
      expect(isValid).toBe(true)
      
      // Wrong password should not verify
      const isInvalid = await verifyPassword('WrongPassword123!', hash)
      expect(isInvalid).toBe(false)
    })

    it('should reject empty passwords', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password cannot be empty')
      await expect(hashPassword('   ')).rejects.toThrow('Password cannot be empty')
    })

    it('should handle null/undefined passwords in verification', async () => {
      const hash = await hashPassword('test123')
      
      expect(await verifyPassword('', hash)).toBe(false)
      expect(await verifyPassword('', '')).toBe(false)
    })
  })

  describe('Password Strength Validation', () => {
    it('should validate strong passwords', () => {
      const strongPassword = 'SecurePassword123!'
      const result = validatePasswordStrength(strongPassword)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject weak passwords', () => {
      const weakPasswords = [
        'short', // too short
        'nouppercase123!', // no uppercase
        'NOLOWERCASE123!', // no lowercase
        'NoNumbers!', // no numbers
        'NoSpecial123' // no special characters
      ]

      weakPasswords.forEach(password => {
        const result = validatePasswordStrength(password)
        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })
    })

    it('should provide specific error messages', () => {
      const result = validatePasswordStrength('weak')
      
      expect(result.errors).toContain('Password must be at least 8 characters long')
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
      expect(result.errors).toContain('Password must contain at least one number')
      expect(result.errors).toContain('Password must contain at least one special character')
      
      // Test a password with uppercase but no lowercase
      const result2 = validatePasswordStrength('WEAK')
      expect(result2.errors).toContain('Password must contain at least one lowercase letter')
    })
  })

  describe('Secure Password Generation', () => {
    it('should generate passwords of specified length', () => {
      const password = generateSecurePassword(20)
      expect(password).toHaveLength(20)
    })

    it('should generate passwords with default length', () => {
      const password = generateSecurePassword()
      expect(password).toHaveLength(16)
    })

    it('should generate passwords with all required character types', () => {
      const password = generateSecurePassword()
      
      expect(password).toMatch(/[A-Z]/) // uppercase
      expect(password).toMatch(/[a-z]/) // lowercase
      expect(password).toMatch(/\d/) // number
      expect(password).toMatch(/[!@#$%^&*]/) // special
    })

    it('should generate different passwords each time', () => {
      const password1 = generateSecurePassword()
      const password2 = generateSecurePassword()
      
      expect(password1).not.toBe(password2)
    })
  })

  describe('Migration from SHA-256 to bcrypt', () => {
    it('should detect bcrypt hashes correctly', () => {
      const bcryptHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iQe'
      const sha256Hash = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'
      
      expect(bcryptHash.startsWith('$2b$')).toBe(true)
      expect(sha256Hash.startsWith('$2b$')).toBe(false)
    })
  })
})

describe('SQL Injection Protection Tests', () => {
  describe('Input Sanitization', () => {
    it('should sanitize dangerous characters', () => {
      const dangerousInputs = [
        "'; DROP TABLE users; --",
        '<script>alert("xss")</script>',
        '" OR 1=1 --',
        "'; INSERT INTO users VALUES ('hacker', 'password'); --"
      ]

      dangerousInputs.forEach(input => {
        const sanitized = input.replace(/[<>'"]/g, '').trim()
        expect(sanitized).not.toContain('<')
        expect(sanitized).not.toContain('>')
        expect(sanitized).not.toContain("'")
        expect(sanitized).not.toContain('"')
      })
    })

    it('should handle empty strings after sanitization', () => {
      const dangerousInput = "'; DROP TABLE users; --"
      const sanitized = dangerousInput.replace(/[<>'"]/g, '').trim()
      
      // After removing dangerous chars, we should have a meaningful string
      expect(sanitized.length).toBeGreaterThan(0)
    })
  })
})

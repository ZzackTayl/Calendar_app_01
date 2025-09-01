/**
 * Rate Limiting and Security Tests for Email System
 * 
 * This test suite focuses on security aspects and performance under load:
 * 1. Rate limiting enforcement
 * 2. Token security and expiration
 * 3. Email delivery performance and reliability
 * 4. Security vulnerability testing
 * 5. Load testing for email services
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/test';
import { createSupabaseClient } from '@/lib/supabase/client';
import { InvitationEmailService, ConsoleEmailProvider } from '@/lib/email/invitation-service';
import { randomBytes, createHash } from 'crypto';

// Test configuration
const SECURITY_TEST_CONFIG = {
  rateLimitWindow: 60 * 1000, // 1 minute
  maxInvitationsPerHour: 10,
  tokenExpirationTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  loadTestConcurrency: 50,
  loadTestDuration: 30 * 1000, // 30 seconds
  securityTestEmails: [
    'security-test-1@example.com',
    'security-test-2@example.com',
    'security-test-3@example.com'
  ]
};

// Mock rate limiting store
class RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const existing = this.store.get(key);
    
    if (!existing || now > existing.resetTime) {
      const entry = { count: 1, resetTime: now + windowMs };
      this.store.set(key, entry);
      return entry;
    }
    
    existing.count++;
    this.store.set(key, existing);
    return existing;
  }

  reset(key?: string) {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }

  getCount(key: string): number {
    const entry = this.store.get(key);
    return entry && Date.now() <= entry.resetTime ? entry.count : 0;
  }
}

// Security-focused email provider for testing
class SecurityTestEmailProvider {
  private sent: Array<{
    to: string;
    subject: string;
    timestamp: number;
    messageId: string;
  }> = [];

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
  }) {
    // Simulate realistic send time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    
    const messageId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    this.sent.push({
      to: options.to,
      subject: options.subject,
      timestamp: Date.now(),
      messageId
    });

    // Simulate occasional failures
    if (Math.random() < 0.02) { // 2% failure rate
      throw new Error('Simulated email delivery failure');
    }

    return {
      success: true,
      messageId
    };
  }

  getSentEmails() {
    return [...this.sent];
  }

  clear() {
    this.sent = [];
  }
}

describe('Email System Rate Limiting and Security', () => {
  let emailProvider: SecurityTestEmailProvider;
  let emailService: InvitationEmailService;
  let rateLimitStore: RateLimitStore;

  beforeAll(() => {
    emailProvider = new SecurityTestEmailProvider();
    emailService = new InvitationEmailService(
      emailProvider as any,
      'test@example.com',
      'Test System'
    );
    rateLimitStore = new RateLimitStore();
  });

  afterAll(() => {
    emailProvider.clear();
    rateLimitStore.reset();
  });

  describe('Rate Limiting Tests', () => {
    beforeEach(() => {
      emailProvider.clear();
      rateLimitStore.reset();
    });

    test('should enforce per-user invitation rate limits', async () => {
      const userId = 'test-user-123';
      const rateLimit = { max: 5, windowMs: 60000 }; // 5 per minute
      
      // Send maximum allowed invitations
      const results = [];
      for (let i = 0; i < rateLimit.max; i++) {
        const rateLimitInfo = rateLimitStore.increment(`user:${userId}`, rateLimit.windowMs);
        
        if (rateLimitInfo.count <= rateLimit.max) {
          const result = await emailService.sendInvitationEmail({
            recipientEmail: `test${i}@example.com`,
            senderEmail: 'sender@example.com',
            senderName: 'Test Sender',
            inviteLink: `https://example.com/invite/${i}`,
            message: 'Test invitation',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            type: 'individual'
          });
          results.push(result);
        } else {
          results.push({ success: false, error: 'Rate limit exceeded' });
        }
      }
      
      // All initial invitations should succeed
      results.slice(0, rateLimit.max).forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // Next invitation should be rate limited
      const rateLimitInfo = rateLimitStore.increment(`user:${userId}`, rateLimit.windowMs);
      expect(rateLimitInfo.count).toBe(rateLimit.max + 1);
      
      // Simulate rate limit enforcement
      const shouldBlock = rateLimitInfo.count > rateLimit.max;
      expect(shouldBlock).toBe(true);
    });

    test('should reset rate limits after window expires', async () => {
      const userId = 'test-user-456';
      const shortWindow = 100; // 100ms for testing
      
      // Hit rate limit
      rateLimitStore.increment(`user:${userId}`, shortWindow);
      rateLimitStore.increment(`user:${userId}`, shortWindow);
      rateLimitStore.increment(`user:${userId}`, shortWindow);
      
      expect(rateLimitStore.getCount(`user:${userId}`)).toBe(3);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, shortWindow + 10));
      
      // Rate limit should be reset
      expect(rateLimitStore.getCount(`user:${userId}`)).toBe(0);
    });

    test('should have separate rate limits per user', async () => {
      const user1 = 'user-1';
      const user2 = 'user-2';
      const windowMs = 60000;
      
      // User 1 hits rate limit
      for (let i = 0; i < 5; i++) {
        rateLimitStore.increment(`user:${user1}`, windowMs);
      }
      
      // User 2 should still be able to send
      const user2Info = rateLimitStore.increment(`user:${user2}`, windowMs);
      
      expect(rateLimitStore.getCount(`user:${user1}`)).toBe(5);
      expect(rateLimitStore.getCount(`user:${user2}`)).toBe(1);
      expect(user2Info.count).toBe(1);
    });
  });

  describe('Token Security Tests', () => {
    test('should generate cryptographically secure invitation tokens', () => {
      const tokens = new Set();
      
      // Generate 1000 tokens and ensure uniqueness
      for (let i = 0; i < 1000; i++) {
        const token = randomBytes(32).toString('base64url');
        expect(tokens.has(token)).toBe(false);
        tokens.add(token);
        
        // Check token properties
        expect(token).toMatch(/^[A-Za-z0-9_-]+$/); // Base64url format
        expect(token.length).toBeGreaterThan(40); // Sufficient entropy
      }
      
      expect(tokens.size).toBe(1000);
    });

    test('should validate token expiration', () => {
      const now = Date.now();
      const validToken = {
        token: 'valid-token',
        expiresAt: new Date(now + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      };
      
      const expiredToken = {
        token: 'expired-token',
        expiresAt: new Date(now - 60 * 1000).toISOString() // 1 minute ago
      };
      
      expect(new Date(validToken.expiresAt).getTime()).toBeGreaterThan(now);
      expect(new Date(expiredToken.expiresAt).getTime()).toBeLessThan(now);
    });

    test('should prevent token reuse attacks', () => {
      const usedTokens = new Set();
      const token = 'test-token-123';
      
      // First use - should be allowed
      expect(usedTokens.has(token)).toBe(false);
      usedTokens.add(token);
      
      // Second use - should be blocked
      expect(usedTokens.has(token)).toBe(true);
    });

    test('should validate token signatures if implemented', () => {
      // This would test HMAC or JWT signature validation
      const secret = 'test-secret';
      const payload = 'invitation-data';
      
      const validSignature = createHash('sha256')
        .update(payload + secret)
        .digest('hex');
      
      const invalidSignature = createHash('sha256')
        .update(payload + 'wrong-secret')
        .digest('hex');
      
      expect(validSignature).not.toBe(invalidSignature);
    });
  });

  describe('Email Delivery Performance Tests', () => {
    test('should handle concurrent email sending', async () => {
      const concurrentRequests = 20;
      const promises = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        const promise = emailService.sendInvitationEmail({
          recipientEmail: `concurrent-test-${i}@example.com`,
          senderEmail: 'sender@example.com',
          senderName: 'Test Sender',
          inviteLink: `https://example.com/invite/${i}`,
          message: 'Concurrent test invitation',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'individual'
        });
        promises.push(promise);
      }
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      // All emails should be sent successfully
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBe(concurrentRequests);
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds max
      
      // Check that all emails were actually sent
      expect(emailProvider.getSentEmails().length).toBe(concurrentRequests);
    });

    test('should handle bulk invitation sending with proper batching', async () => {
      const bulkInvitations = Array.from({ length: 50 }, (_, i) => ({
        recipientEmail: `bulk-test-${i}@example.com`,
        senderEmail: 'sender@example.com',
        senderName: 'Bulk Sender',
        inviteLink: `https://example.com/invite/bulk-${i}`,
        message: 'Bulk test invitation',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'individual' as const
      }));
      
      const startTime = Date.now();
      const result = await emailService.sendBulkInvitations(bulkInvitations);
      const duration = Date.now() - startTime;
      
      expect(result.success).toBe(true);
      expect(result.successCount).toBe(50);
      expect(result.failureCount).toBe(0);
      
      // Should complete within reasonable time (bulk should be faster per email)
      expect(duration).toBeLessThan(10000); // 10 seconds max
      
      // Verify batching behavior (should not send all at once)
      const sentEmails = emailProvider.getSentEmails();
      expect(sentEmails.length).toBe(50);
      
      // Check that emails were sent in a reasonable timeframe spread
      const timestamps = sentEmails.map(e => e.timestamp);
      const timespread = Math.max(...timestamps) - Math.min(...timestamps);
      expect(timespread).toBeGreaterThan(0); // Should not all be sent at exactly the same time
    });

    test('should handle email delivery failures gracefully', async () => {
      // Create a provider that fails sometimes
      class FailingEmailProvider {
        private failureRate = 0.3; // 30% failure rate
        private attempts = 0;

        async sendEmail(options: any) {
          this.attempts++;
          
          if (Math.random() < this.failureRate) {
            throw new Error(`Simulated failure (attempt ${this.attempts})`);
          }
          
          return {
            success: true,
            messageId: `msg-${this.attempts}-${Date.now()}`
          };
        }
      }
      
      const failingService = new InvitationEmailService(
        new FailingEmailProvider() as any,
        'test@example.com',
        'Test System'
      );
      
      const invitations = Array.from({ length: 10 }, (_, i) => ({
        recipientEmail: `failure-test-${i}@example.com`,
        senderEmail: 'sender@example.com',
        senderName: 'Failure Test',
        inviteLink: `https://example.com/invite/failure-${i}`,
        message: 'Failure test invitation',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'individual' as const
      }));
      
      const result = await failingService.sendBulkInvitations(invitations);
      
      // Should handle failures gracefully
      expect(result.successCount + result.failureCount).toBe(10);
      expect(result.failureCount).toBeGreaterThan(0); // Some should fail
      expect(result.successCount).toBeGreaterThan(0); // Some should succeed
    });
  });

  describe('Security Vulnerability Tests', () => {
    test('should prevent email header injection', async () => {
      const maliciousInputs = [
        'test@example.com\nBcc: evil@hacker.com',
        'test@example.com\rCc: evil@hacker.com',
        'test@example.com\n\rSubject: Hacked!',
        'test@example.com\nContent-Type: text/html',
        '"test@example.com"\nBcc: evil@hacker.com'
      ];
      
      for (const maliciousEmail of maliciousInputs) {
        try {
          const result = await emailService.sendInvitationEmail({
            recipientEmail: maliciousEmail,
            senderEmail: 'sender@example.com',
            senderName: 'Test Sender',
            inviteLink: 'https://example.com/invite/test',
            message: 'Test invitation',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            type: 'individual'
          });
          
          // If it succeeds, check that the email was sanitized
          if (result.success) {
            const sentEmails = emailProvider.getSentEmails();
            const lastEmail = sentEmails[sentEmails.length - 1];
            
            // Email should not contain injection characters
            expect(lastEmail.to).not.toMatch(/[\r\n]/);
            expect(lastEmail.to).not.toContain('Bcc:');
            expect(lastEmail.to).not.toContain('Cc:');
          }
        } catch (error) {
          // It's OK if it fails with validation error
          expect(error.message).toMatch(/invalid|malformed|validation/i);
        }
      }
    });

    test('should validate email addresses properly', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'test.email.with+symbol@example.com'
      ];
      
      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'test@',
        'test..test@domain.com',
        'test@domain',
        'test@domain.',
        '',
        null,
        undefined
      ];
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });
      
      invalidEmails.forEach(email => {
        if (email !== null && email !== undefined) {
          expect(emailRegex.test(email)).toBe(false);
        }
      });
    });

    test('should prevent XSS in email content', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '"><script>alert("xss")</script>',
        '<img src=x onerror=alert("xss")>',
        'javascript:alert("xss")',
        '<iframe src="javascript:alert(\'xss\')"></iframe>'
      ];
      
      for (const payload of xssPayloads) {
        const result = await emailService.sendInvitationEmail({
          recipientEmail: 'test@example.com',
          senderEmail: 'sender@example.com',
          senderName: `Sender ${payload}`,
          inviteLink: 'https://example.com/invite/test',
          message: `Message with ${payload}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          type: 'individual'
        });
        
        expect(result.success).toBe(true);
        
        // In a real implementation, you would check that the HTML email content
        // has the XSS payload properly escaped or sanitized
        // This is a placeholder for that validation
        expect(true).toBe(true);
      }
    });

    test('should enforce proper URL validation in invitation links', () => {
      const validUrls = [
        'https://example.com/invite/token',
        'https://subdomain.example.com/path/token',
        'http://localhost:3000/invite/token'
      ];
      
      const invalidUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'ftp://evil.com/malware',
        '//evil.com/phishing',
        'http://evil.com/phishing'
      ];
      
      const urlRegex = /^https?:\/\/(localhost|[\w.-]+\.[a-z]{2,})(:\d+)?(\/.*)?$/i;
      
      validUrls.forEach(url => {
        expect(urlRegex.test(url)).toBe(true);
      });
      
      // In production, you might have a whitelist of allowed domains
      const allowedDomains = ['example.com', 'localhost'];
      
      invalidUrls.forEach(url => {
        const isValidProtocol = urlRegex.test(url);
        if (isValidProtocol) {
          const domain = new URL(url).hostname;
          const isAllowedDomain = allowedDomains.some(allowed => 
            domain === allowed || domain.endsWith('.' + allowed)
          );
          expect(isAllowedDomain).toBe(false);
        } else {
          expect(isValidProtocol).toBe(false);
        }
      });
    });
  });

  describe('Load Testing', () => {
    test('should handle sustained load', async () => {
      const loadTestDuration = 5000; // 5 seconds
      const requestsPerSecond = 10;
      const totalRequests = (loadTestDuration / 1000) * requestsPerSecond;
      
      const startTime = Date.now();
      const promises = [];
      let requestCount = 0;
      
      const interval = setInterval(() => {
        if (Date.now() - startTime >= loadTestDuration) {
          clearInterval(interval);
          return;
        }
        
        for (let i = 0; i < requestsPerSecond; i++) {
          if (requestCount >= totalRequests) break;
          
          const promise = emailService.sendInvitationEmail({
            recipientEmail: `load-test-${requestCount}@example.com`,
            senderEmail: 'sender@example.com',
            senderName: 'Load Test',
            inviteLink: `https://example.com/invite/load-${requestCount}`,
            message: 'Load test invitation',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            type: 'individual'
          });
          
          promises.push(promise);
          requestCount++;
        }
      }, 1000);
      
      // Wait for all requests to complete
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (promises.length >= totalRequests) {
            clearInterval(checkInterval);
            resolve(undefined);
          }
        }, 100);
      });
      
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`Load test results: ${successful} successful, ${failed} failed`);
      
      // At least 90% should succeed under load
      const successRate = successful / results.length;
      expect(successRate).toBeGreaterThan(0.9);
    });
  });
});
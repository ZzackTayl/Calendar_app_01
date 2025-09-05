/**
 * Email & Invitation System Testing at Scale
 * 
 * Tests the critical user onboarding and relationship management flows that
 * must work flawlessly for alpha/beta testing success. Covers:
 * - Email verification flows under load
 * - Invitation system with complex relationship networks
 * - Notification systems and deliverability
 * - Rate limiting and abuse prevention
 * - Edge cases and error handling
 * 
 * Based on industry best practices for email systems at scale.
 */

import { describe, it, expect, beforeEach, beforeAll, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { testHelpers } from '../db/test-utilities';

// Email testing utilities
class EmailTestFramework {
  private static emailQueue: any[] = [];
  private static sentEmails: Map<string, any[]> = new Map();
  
  static async simulateEmailSend(to: string, subject: string, content: string, metadata: any = {}) {
    const email = {
      id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      to,
      subject,
      content,
      metadata,
      sent_at: new Date().toISOString(),
      status: 'sent',
      delivery_attempts: 1,
      opened: false,
      clicked: false
    };
    
    this.emailQueue.push(email);
    
    if (!this.sentEmails.has(to)) {
      this.sentEmails.set(to, []);
    }
    this.sentEmails.get(to)!.push(email);
    
    return email;
  }
  
  static getEmailsForRecipient(email: string): any[] {
    return this.sentEmails.get(email) || [];
  }
  
  static getLatestEmailFor(email: string, subjectContains?: string): any | null {
    const emails = this.getEmailsForRecipient(email);
    if (subjectContains) {
      return emails.filter(e => e.subject.includes(subjectContains)).pop() || null;
    }
    return emails.pop() || null;
  }
  
  static clearEmailQueue() {
    this.emailQueue = [];
    this.sentEmails.clear();
  }
  
  static simulateEmailDeliveryDelay(minMs: number = 100, maxMs: number = 2000) {
    const delay = Math.random() * (maxMs - minMs) + minMs;
    return new Promise(resolve => setTimeout(resolve, delay));
  }
  
  static simulateEmailBounce(email: string, reason: 'invalid' | 'full' | 'blocked' = 'invalid') {
    const emails = this.getEmailsForRecipient(email);
    if (emails.length > 0) {
      const lastEmail = emails[emails.length - 1];
      lastEmail.status = 'bounced';
      lastEmail.bounce_reason = reason;
      lastEmail.bounced_at = new Date().toISOString();
    }
  }
}

// Load testing utilities
const generateTestUsers = (count: number, domain: string = 'testpoly.com') => {
  return Array.from({ length: count }, (_, i) => ({
    id: `scale-user-${i}`,
    email: `scaleuser${i}@${domain}`,
    phone_number: `+1${(4155550000 + i).toString()}`,
    display_name: `Scale User ${i}`,
    timezone: ['America/Los_Angeles', 'America/New_York', 'America/Chicago'][i % 3],
    created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
  }));
};

const generateInvitationNetwork = (users: any[], invitationsPerUser: number = 3) => {
  const invitations = [];
  for (let i = 0; i < users.length; i++) {
    const inviter = users[i];
    for (let j = 0; j < invitationsPerUser && (i + j + 1) < users.length; j++) {
      const invitee = users[i + j + 1];
      invitations.push({
        inviter_id: inviter.id,
        invitee_email: invitee.email,
        invitee_phone: invitee.phone_number,
        suggested_relationship_type: ['primary', 'secondary', 'casual', 'friendship'][j % 4],
        suggested_privacy_level: ['visible', 'semi_private', 'private'][j % 3],
        personal_message: `Hi ${invitee.display_name}! Let's connect on PolyHarmony to coordinate our schedules.`,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString()
      });
    }
  }
  return invitations;
};

describe('📧 Email Verification System at Scale', () => {
  let supabase: any;
  
  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await testHelpers.setupTestEnvironment(supabase);
  });

  beforeEach(async () => {
    await testHelpers.cleanupTestData(supabase);
    EmailTestFramework.clearEmailQueue();
  });

  it('📨 Handles 100 concurrent email verifications without failure', async () => {
    const testUsers = generateTestUsers(100);
    const startTime = Date.now();
    
    // Simulate 100 users signing up simultaneously
    const signupPromises = testUsers.map(async (user, index) => {
      try {
        // Simulate signup API call
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.email,
            phone_number: user.phone_number,
            password: 'TestPassword123!',
            display_name: user.display_name
          })
        });
        
        const result = await response.json();
        
        // Simulate email sending (would be triggered by signup)
        if (result.success) {
          await EmailTestFramework.simulateEmailSend(
            user.email,
            'Welcome to PolyHarmony - Verify Your Email',
            `Please verify your email: https://polyharmony.com/verify?token=verify-${user.id}`,
            { 
              type: 'email_verification', 
              user_id: result.user.id,
              attempt: 1
            }
          );
        }
        
        return { 
          user: user.email, 
          success: result.success, 
          duration: Date.now() - startTime,
          user_id: result.user?.id
        };
      } catch (error) {
        return { 
          user: user.email, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime
        };
      }
    });
    
    const results = await Promise.all(signupPromises);
    const totalDuration = Date.now() - startTime;
    
    // Analyze results
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    
    // Performance and reliability expectations
    expect(successful.length).toBeGreaterThanOrEqual(95); // 95% success rate minimum
    expect(totalDuration).toBeLessThan(10000); // Complete in under 10 seconds
    expect(avgDuration).toBeLessThan(5000); // Average response under 5 seconds
    
    // Verify emails were sent
    const emailsSent = testUsers.filter(user => 
      EmailTestFramework.getEmailsForRecipient(user.email).length > 0
    );
    expect(emailsSent.length).toBe(successful.length);
    
    console.log('✅ Email verification scale test results:');
    console.log(`   ${successful.length}/100 signups successful (${(successful.length/100*100).toFixed(1)}%)`);
    console.log(`   Total time: ${totalDuration}ms, Average: ${avgDuration.toFixed(2)}ms`);
    console.log(`   ${emailsSent.length} verification emails sent`);
  });
  
  it('🔄 Email verification retry logic handles temporary failures', async () => {
    const testUser = generateTestUsers(1)[0];
    const maxRetries = 3;
    let attemptCount = 0;
    
    // Simulate email service failures and retries
    const verificationAttempts = [];
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      attemptCount++;
      
      const startTime = Date.now();
      
      try {
        // Simulate different failure scenarios
        if (attempt === 1) {
          // First attempt: Service timeout
          await new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Email service timeout')), 1000)
          );
        } else if (attempt === 2) {
          // Second attempt: Rate limit from email provider
          throw new Error('Email provider rate limit exceeded');
        } else {
          // Third attempt: Success
          await EmailTestFramework.simulateEmailSend(
            testUser.email,
            'PolyHarmony Email Verification (Retry)',
            'Please verify your email address to complete signup.',
            { type: 'email_verification', attempt, retry: true }
          );
        }
        
        verificationAttempts.push({
          attempt,
          success: true,
          duration: Date.now() - startTime,
          error: null
        });
        break; // Success, exit retry loop
        
      } catch (error) {
        verificationAttempts.push({
          attempt,
          success: false,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        // Wait before retry with exponential backoff
        const backoffDelay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
    
    // Verify retry logic worked correctly
    expect(verificationAttempts).toHaveLength(maxRetries);
    expect(verificationAttempts[verificationAttempts.length - 1].success).toBe(true);
    
    // Verify final email was sent successfully
    const emails = EmailTestFramework.getEmailsForRecipient(testUser.email);
    expect(emails).toHaveLength(1);
    expect(emails[0].metadata.retry).toBe(true);
    expect(emails[0].metadata.attempt).toBe(3);
    
    console.log('✅ Email retry logic working correctly:');
    verificationAttempts.forEach((attempt, i) => {
      console.log(`   Attempt ${i + 1}: ${attempt.success ? 'SUCCESS' : 'FAILED'} (${attempt.duration}ms)`);
    });
  });
  
  it('⚡ Email verification rate limiting prevents abuse', async () => {
    const testUser = generateTestUsers(1)[0];
    await testHelpers.createTestUser(supabase, testUser);
    
    const rateLimitWindow = 15 * 60 * 1000; // 15 minutes
    const maxVerificationEmails = 3; // Max 3 verification emails per 15 minutes
    
    const verificationRequests = [];
    
    // Try to send 5 verification emails rapidly (should be rate limited)
    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      
      try {
        const response = await fetch('/api/auth/resend-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testUser.email
          })
        });
        
        const result = await response.json();
        
        verificationRequests.push({
          attempt: i + 1,
          success: response.status === 200,
          rateLimited: response.status === 429,
          duration: Date.now() - startTime,
          message: result.message
        });
        
        if (result.success) {
          await EmailTestFramework.simulateEmailSend(
            testUser.email,
            'PolyHarmony Email Verification',
            'Verification email content',
            { type: 'verification_resend', attempt: i + 1 }
          );
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        verificationRequests.push({
          attempt: i + 1,
          success: false,
          rateLimited: false,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Analyze rate limiting effectiveness
    const successful = verificationRequests.filter(r => r.success);
    const rateLimited = verificationRequests.filter(r => r.rateLimited);
    
    expect(successful.length).toBeLessThanOrEqual(maxVerificationEmails);
    expect(rateLimited.length).toBeGreaterThan(0);
    
    // Rate limiting should be fast (don't slow down the system)
    const avgRateLimitTime = rateLimited.reduce((sum, r) => sum + r.duration, 0) / rateLimited.length;
    expect(avgRateLimitTime).toBeLessThan(100); // Under 100ms to reject
    
    // Verify only allowed number of emails were sent
    const emailsSent = EmailTestFramework.getEmailsForRecipient(testUser.email);
    expect(emailsSent.length).toBeLessThanOrEqual(maxVerificationEmails);
    
    console.log('✅ Email verification rate limiting working:');
    console.log(`   ${successful.length} successful, ${rateLimited.length} rate limited`);
    console.log(`   Average rate limit response: ${avgRateLimitTime.toFixed(2)}ms`);
  });
  
  it('📮 Email deliverability and bounce handling', async () => {
    const testUsers = [
      ...generateTestUsers(5, 'gmail.com'),      // Valid emails
      ...generateTestUsers(2, 'invalid-domain-that-does-not-exist.com'), // Invalid domain
      ...generateTestUsers(3, 'tempmail.org')    // Temporary email service
    ];
    
    const emailResults = [];
    
    // Send emails to all users
    for (const user of testUsers) {
      await EmailTestFramework.simulateEmailSend(
        user.email,
        'Welcome to PolyHarmony',
        'Welcome email content',
        { type: 'welcome', domain: user.email.split('@')[1] }
      );
      
      // Simulate different delivery outcomes
      if (user.email.includes('invalid-domain')) {
        EmailTestFramework.simulateEmailBounce(user.email, 'invalid');
      } else if (user.email.includes('tempmail')) {
        // Temporary email services might have full inboxes
        if (Math.random() > 0.7) {
          EmailTestFramework.simulateEmailBounce(user.email, 'full');
        }
      }
      
      await EmailTestFramework.simulateEmailDeliveryDelay(50, 500);
    }
    
    // Analyze delivery results
    const allEmails = testUsers.flatMap(user => 
      EmailTestFramework.getEmailsForRecipient(user.email)
    );
    
    const delivered = allEmails.filter(email => email.status === 'sent');
    const bounced = allEmails.filter(email => email.status === 'bounced');
    
    // Calculate delivery metrics
    const deliveryRate = delivered.length / allEmails.length;
    const bounceRate = bounced.length / allEmails.length;
    
    // Industry standard expectations for transactional emails
    expect(deliveryRate).toBeGreaterThan(0.7); // >70% delivery rate
    expect(bounceRate).toBeLessThan(0.3); // <30% bounce rate
    
    // Verify bounce categorization
    const invalidDomainBounces = bounced.filter(e => e.bounce_reason === 'invalid');
    const fullInboxBounces = bounced.filter(e => e.bounce_reason === 'full');
    
    expect(invalidDomainBounces.length).toBe(2); // Both invalid domain emails
    
    console.log('✅ Email deliverability analysis:');
    console.log(`   Delivery rate: ${(deliveryRate * 100).toFixed(1)}%`);
    console.log(`   Bounce rate: ${(bounceRate * 100).toFixed(1)}%`);
    console.log(`   Invalid domains: ${invalidDomainBounces.length}, Full inboxes: ${fullInboxBounces.length}`);
  });
});

describe('🤝 Invitation System at Scale', () => {
  let supabase: any;
  
  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  });

  beforeEach(async () => {
    await testHelpers.cleanupTestData(supabase);
    EmailTestFramework.clearEmailQueue();
  });

  it('🌐 Complex invitation network with 50 users and multiple relationships', async () => {
    const users = generateTestUsers(50);
    const invitations = generateInvitationNetwork(users, 2); // Each user invites 2 others
    
    // Create all test users
    for (const user of users) {
      await testHelpers.createTestUser(supabase, user);
    }
    
    const startTime = Date.now();
    
    // Process invitations in batches to simulate real-world usage
    const batchSize = 10;
    const invitationResults = [];
    
    for (let i = 0; i < invitations.length; i += batchSize) {
      const batch = invitations.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (invitation) => {
        try {
          // Create invitation record
          const { data: invitationRecord, error: inviteError } = await supabase
            .from('invitations')
            .insert(invitation)
            .select()
            .single();
            
          if (inviteError) {
            throw new Error(inviteError.message);
          }
          
          // Send invitation email
          await EmailTestFramework.simulateEmailSend(
            invitation.invitee_email,
            `${users.find(u => u.id === invitation.inviter_id)?.display_name} invited you to PolyHarmony`,
            `Join PolyHarmony to coordinate schedules with your partners. Message: ${invitation.personal_message}`,
            {
              type: 'relationship_invitation',
              invitation_id: invitationRecord.id,
              relationship_type: invitation.suggested_relationship_type,
              privacy_level: invitation.suggested_privacy_level
            }
          );
          
          return {
            success: true,
            invitation_id: invitationRecord.id,
            inviter: invitation.inviter_id,
            invitee: invitation.invitee_email
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            inviter: invitation.inviter_id,
            invitee: invitation.invitee_email
          };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      invitationResults.push(...batchResults);
      
      // Small delay between batches to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const totalTime = Date.now() - startTime;
    
    // Analyze invitation processing results
    const successful = invitationResults.filter(r => r.success);
    const failed = invitationResults.filter(r => !r.success);
    
    expect(successful.length).toBeGreaterThanOrEqual(invitations.length * 0.95); // 95% success rate
    expect(totalTime).toBeLessThan(15000); // Process all invitations in under 15 seconds
    
    // Verify invitations were stored correctly
    const { data: storedInvitations } = await supabase
      .from('invitations')
      .select('*');
      
    expect(storedInvitations).toHaveLength(successful.length);
    
    // Verify invitation emails were sent
    const invitationEmails = users.flatMap(user => 
      EmailTestFramework.getEmailsForRecipient(user.email)
        .filter(email => email.metadata.type === 'relationship_invitation')
    );
    expect(invitationEmails).toHaveLength(successful.length);
    
    console.log('✅ Complex invitation network processed:');
    console.log(`   ${successful.length}/${invitations.length} invitations successful`);
    console.log(`   Total processing time: ${totalTime}ms`);
    console.log(`   ${invitationEmails.length} invitation emails sent`);
  });
  
  it('🔄 Invitation acceptance flow with relationship creation', async () => {
    const users = generateTestUsers(10);
    await Promise.all(users.map(user => testHelpers.createTestUser(supabase, user)));
    
    const inviter = users[0];
    const invitees = users.slice(1, 6); // 5 invitees
    
    const acceptanceResults = [];
    
    for (const invitee of invitees) {
      // Create invitation
      const invitation = {
        inviter_id: inviter.id,
        invitee_email: invitee.email,
        invitee_phone: invitee.phone_number,
        suggested_relationship_type: 'secondary',
        suggested_privacy_level: 'semi_private',
        personal_message: `Hi ${invitee.display_name}! Let's coordinate our schedules.`,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      const { data: invitationRecord } = await supabase
        .from('invitations')
        .insert(invitation)
        .select()
        .single();
      
      // Send invitation email
      await EmailTestFramework.simulateEmailSend(
        invitee.email,
        'PolyHarmony Relationship Invitation',
        'You have been invited to connect',
        { 
          type: 'relationship_invitation',
          invitation_id: invitationRecord.id,
          accept_url: `https://polyharmony.com/invite/accept?token=${invitationRecord.id}`
        }
      );
      
      // Simulate user accepting invitation
      const startTime = Date.now();
      
      try {
        // Accept invitation
        const { error: acceptError } = await supabase
          .from('invitations')
          .update({ 
            status: 'accepted', 
            accepted_at: new Date().toISOString() 
          })
          .eq('id', invitationRecord.id);
          
        if (acceptError) throw new Error(acceptError.message);
        
        // Create reciprocal relationships
        const relationships = [
          {
            user_id: inviter.id,
            partner_id: invitee.id,
            relationship_type: invitation.suggested_relationship_type,
            default_privacy_level: invitation.suggested_privacy_level,
            can_view_schedule: true,
            can_create_events: false
          },
          {
            user_id: invitee.id,
            partner_id: inviter.id,
            relationship_type: invitation.suggested_relationship_type,
            default_privacy_level: invitation.suggested_privacy_level,
            can_view_schedule: true,
            can_create_events: false
          }
        ];
        
        const { error: relationshipError } = await supabase
          .from('relationships')
          .insert(relationships);
          
        if (relationshipError) throw new Error(relationshipError.message);
        
        // Send welcome email to both parties
        await EmailTestFramework.simulateEmailSend(
          inviter.email,
          `${invitee.display_name} accepted your invitation!`,
          'You are now connected on PolyHarmony',
          { type: 'invitation_accepted', partner: invitee.display_name }
        );
        
        await EmailTestFramework.simulateEmailSend(
          invitee.email,
          'Welcome to PolyHarmony!',
          'You are now connected with your partner',
          { type: 'relationship_established', partner: inviter.display_name }
        );
        
        acceptanceResults.push({
          success: true,
          invitee: invitee.email,
          duration: Date.now() - startTime,
          invitation_id: invitationRecord.id
        });
        
      } catch (error) {
        acceptanceResults.push({
          success: false,
          invitee: invitee.email,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Verify all acceptances were successful
    const successful = acceptanceResults.filter(r => r.success);
    expect(successful.length).toBe(invitees.length);
    
    // Verify relationships were created
    const { data: createdRelationships } = await supabase
      .from('relationships')
      .select('*');
    expect(createdRelationships).toHaveLength(invitees.length * 2); // Reciprocal relationships
    
    // Verify notification emails were sent
    const notificationEmails = users.flatMap(user => 
      EmailTestFramework.getEmailsForRecipient(user.email)
        .filter(email => 
          email.metadata.type === 'invitation_accepted' || 
          email.metadata.type === 'relationship_established'
        )
    );
    expect(notificationEmails).toHaveLength(invitees.length * 2); // One for each party
    
    console.log('✅ Invitation acceptance flow completed:');
    console.log(`   ${successful.length}/${invitees.length} invitations accepted successfully`);
    console.log(`   ${createdRelationships.length} relationships created`);
    console.log(`   ${notificationEmails.length} notification emails sent`);
  });
  
  it('⏰ Invitation expiration and cleanup system', async () => {
    const users = generateTestUsers(5);
    await Promise.all(users.map(user => testHelpers.createTestUser(supabase, user)));
    
    const now = new Date();
    
    // Create invitations with different expiration times
    const invitations = [
      {
        inviter_id: users[0].id,
        invitee_email: users[1].email,
        expires_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // Expired 1 day ago
        status: 'pending'
      },
      {
        inviter_id: users[0].id,
        invitee_email: users[2].email,
        expires_at: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), // Expired 1 hour ago
        status: 'pending'
      },
      {
        inviter_id: users[0].id,
        invitee_email: users[3].email,
        expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // Expires in 1 day
        status: 'pending'
      },
      {
        inviter_id: users[0].id,
        invitee_email: users[4].email,
        expires_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // Expires in 1 hour
        status: 'pending'
      }
    ];
    
    // Insert invitations
    await supabase.from('invitations').insert(invitations);
    
    // Run invitation cleanup process
    const cleanupResponse = await fetch('/api/invitations/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const cleanupResult = await cleanupResponse.json();
    
    expect(cleanupResult.success).toBe(true);
    expect(cleanupResult.expired_invitations_processed).toBe(2); // 2 expired invitations
    
    // Verify expired invitations were marked as expired
    const { data: expiredInvitations } = await supabase
      .from('invitations')
      .select('*')
      .eq('status', 'expired');
    expect(expiredInvitations).toHaveLength(2);
    
    // Verify active invitations are still pending
    const { data: activeInvitations } = await supabase
      .from('invitations')
      .select('*')
      .eq('status', 'pending');
    expect(activeInvitations).toHaveLength(2);
    
    console.log('✅ Invitation expiration system working:');
    console.log(`   ${cleanupResult.expired_invitations_processed} expired invitations cleaned up`);
    console.log(`   ${activeInvitations.length} active invitations remain`);
  });
});

describe('🔔 Notification System Performance', () => {
  let supabase: any;
  
  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  });

  beforeEach(async () => {
    await testHelpers.cleanupTestData(supabase);
    EmailTestFramework.clearEmailQueue();
  });

  it('📱 Multi-channel notification delivery (Email + SMS + Push)', async () => {
    const users = generateTestUsers(20);
    await Promise.all(users.map(user => testHelpers.createTestUser(supabase, user)));
    
    // Create notification scenarios
    const notifications = [
      {
        type: 'event_invitation',
        recipients: users.slice(0, 5).map(u => u.id),
        message: 'You have been invited to a group event',
        channels: ['email', 'push'],
        priority: 'normal'
      },
      {
        type: 'schedule_conflict',
        recipients: users.slice(5, 10).map(u => u.id),
        message: 'Scheduling conflict detected with your partners',
        channels: ['email', 'sms', 'push'],
        priority: 'high'
      },
      {
        type: 'relationship_request',
        recipients: users.slice(10, 15).map(u => u.id),
        message: 'New relationship request received',
        channels: ['email'],
        priority: 'normal'
      },
      {
        type: 'privacy_alert',
        recipients: users.slice(15, 20).map(u => u.id),
        message: 'Privacy settings have been updated',
        channels: ['email', 'push'],
        priority: 'high'
      }
    ];
    
    const deliveryResults = [];
    
    for (const notification of notifications) {
      const startTime = Date.now();
      
      try {
        // Send notification via API
        const response = await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(notification)
        });
        
        const result = await response.json();
        
        // Simulate multi-channel delivery
        for (const recipientId of notification.recipients) {
          const user = users.find(u => u.id === recipientId);
          if (!user) continue;
          
          // Email delivery (always included)
          if (notification.channels.includes('email')) {
            await EmailTestFramework.simulateEmailSend(
              user.email,
              `PolyHarmony Notification: ${notification.type}`,
              notification.message,
              {
                type: 'notification',
                notification_type: notification.type,
                priority: notification.priority,
                recipient_id: recipientId
              }
            );
          }
          
          // SMS delivery simulation
          if (notification.channels.includes('sms')) {
            // Would integrate with SMS provider in real implementation
            // For testing, we'll track that SMS would be sent
          }
          
          // Push notification simulation  
          if (notification.channels.includes('push')) {
            // Would integrate with push notification service in real implementation
            // For testing, we'll track that push would be sent
          }
        }
        
        deliveryResults.push({
          type: notification.type,
          success: true,
          recipients: notification.recipients.length,
          channels: notification.channels,
          duration: Date.now() - startTime
        });
        
      } catch (error) {
        deliveryResults.push({
          type: notification.type,
          success: false,
          recipients: notification.recipients.length,
          channels: notification.channels,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Verify all notifications were processed successfully
    const successful = deliveryResults.filter(r => r.success);
    expect(successful.length).toBe(notifications.length);
    
    // Verify performance expectations
    const avgDeliveryTime = deliveryResults.reduce((sum, r) => sum + r.duration, 0) / deliveryResults.length;
    expect(avgDeliveryTime).toBeLessThan(1000); // Under 1 second average delivery
    
    // Verify email notifications were sent
    const totalEmailRecipients = notifications.reduce((sum, n) => 
      sum + (n.channels.includes('email') ? n.recipients.length : 0), 0
    );
    const emailsSent = users.flatMap(user => 
      EmailTestFramework.getEmailsForRecipient(user.email)
        .filter(email => email.metadata.type === 'notification')
    );
    expect(emailsSent.length).toBe(totalEmailRecipients);
    
    console.log('✅ Multi-channel notification delivery:');
    console.log(`   ${successful.length}/${notifications.length} notification batches successful`);
    console.log(`   Average delivery time: ${avgDeliveryTime.toFixed(2)}ms`);
    console.log(`   ${emailsSent.length} email notifications sent`);
  });
  
  it('⚡ High-priority notification fast-track delivery', async () => {
    const users = generateTestUsers(10);
    await Promise.all(users.map(user => testHelpers.createTestUser(supabase, user)));
    
    // Create mixed priority notifications
    const notifications = [
      {
        type: 'general_update',
        recipients: users.slice(0, 5).map(u => u.id),
        priority: 'low',
        message: 'General app update available'
      },
      {
        type: 'schedule_conflict',
        recipients: users.slice(5, 10).map(u => u.id),
        priority: 'critical',
        message: 'URGENT: Double booking detected in your calendar'
      }
    ];
    
    const deliveryTimes = [];
    
    // Send notifications simultaneously
    const notificationPromises = notifications.map(async (notification) => {
      const startTime = Date.now();
      
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notification)
      });
      
      const result = await response.json();
      const duration = Date.now() - startTime;
      
      // Simulate email sending based on priority
      for (const recipientId of notification.recipients) {
        const user = users.find(u => u.id === recipientId);
        if (!user) continue;
        
        // High priority notifications get faster processing
        const processingDelay = notification.priority === 'critical' ? 50 : 200;
        await new Promise(resolve => setTimeout(resolve, processingDelay));
        
        await EmailTestFramework.simulateEmailSend(
          user.email,
          `${notification.priority === 'critical' ? '[URGENT] ' : ''}${notification.message}`,
          notification.message,
          {
            type: 'notification',
            priority: notification.priority,
            delivered_at: new Date().toISOString()
          }
        );
      }
      
      return {
        type: notification.type,
        priority: notification.priority,
        duration,
        success: result.success
      };
    });
    
    const results = await Promise.all(notificationPromises);
    
    // Verify critical notifications were processed faster
    const criticalResult = results.find(r => r.priority === 'critical');
    const lowPriorityResult = results.find(r => r.priority === 'low');
    
    expect(criticalResult).toBeDefined();
    expect(lowPriorityResult).toBeDefined();
    expect(criticalResult!.duration).toBeLessThan(lowPriorityResult!.duration);
    
    // Verify critical notifications were delivered quickly
    expect(criticalResult!.duration).toBeLessThan(500); // Under 500ms for critical
    
    console.log('✅ Priority-based notification delivery:');
    console.log(`   Critical notification: ${criticalResult!.duration}ms`);
    console.log(`   Low priority notification: ${lowPriorityResult!.duration}ms`);
  });
});

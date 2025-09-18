import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createHash } from 'crypto';
import {
  generateInviteToken,
  validateInviteToken,
  markTokenAsUsed,
  cleanupExpiredInvites,
  checkInvitationRateLimit,
} from '@/lib/invitations/token-utils';

/**
 * Email/Invitation System Load Testing (CRITICAL FOR PRODUCTION)
 *
 * These tests exercise the invitation token lifecycle, cleanup, and rate limiting
 * behaviours using mocked Supabase responses. They focus on guaranteeing that the
 * invitation pipeline keeps working when the system is under heavy usage.
 */

const supabaseMock = { from: vi.fn() };

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseClient: vi.fn(() => supabaseMock),
}));

function createQueryChain(result: { data?: any; error?: any; count?: number }) {
  const chain: any = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.gte = vi.fn().mockReturnValue(chain);
  chain.lt = vi.fn().mockReturnValue(chain);
  chain.in = vi.fn().mockReturnValue(chain);
  chain.not = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject);
  chain.catch = (reject: any) => Promise.resolve(result).catch(reject);
  chain.finally = (callback: any) => Promise.resolve(result).finally(callback);
  return chain;
}

function futureDate(minutesAhead: number) {
  return new Date(Date.now() + minutesAhead * 60 * 1000).toISOString();
}

function pastDate(minutesAgo: number) {
  return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
}

describe('Email/Invitation System Load Tests', () => {
  beforeAll(async () => {
    console.log('📧 Starting Email/Invitation System Load Tests - CRITICAL FOR PRODUCTION');
  });

  afterAll(async () => {
    console.log('📧 Email/Invitation System Load Tests completed');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Email Verification Load Testing', () => {
    it('should generate cryptographically random invitation tokens', () => {
      const first = generateInviteToken();
      const second = generateInviteToken();

      expect(first.token).toHaveLength(64);
      expect(first.tokenHash).toHaveLength(64);
      expect(second.token).not.toBe(first.token);
      expect(second.tokenHash).not.toBe(first.tokenHash);
    });

    it('should validate individual invitation tokens and surface metadata', async () => {
      const token = 'individual-token-under-load';
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const invitationRecord = {
        id: 'token-1',
        expires_at: futureDate(30),
        used_at: null,
        invitations: {
          id: 'invite-1',
          status: 'pending',
          expires_at: futureDate(25),
          sender_id: 'sender-1',
          recipient_email: 'invitee@example.com',
          invitation_type: 'relationship_invitation',
        },
      };

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === 'invitation_tokens') {
          const chain = createQueryChain({ data: invitationRecord, error: null });
          return chain;
        }
        if (table === 'group_invitation_tokens') {
          return createQueryChain({ data: null, error: null });
        }
        throw new Error(`Unexpected table: ${table}`);
      });

      const result = await validateInviteToken(token);

      expect(result.isValid).toBe(true);
      expect(result.invitationType).toBe('individual');
      expect(result.invitation?.sender_id).toBe('sender-1');

      const chain = supabaseMock.from.mock.results[0]?.value as any;
      expect(chain.eq).toHaveBeenCalledWith('token_hash', tokenHash);
    });

    it('should fall back to group invitations when individual token is missing', async () => {
      const token = 'group-token';
      const groupInvitationRecord = {
        id: 'group-token-1',
        expires_at: futureDate(45),
        used_at: null,
        group_invitations: {
          id: 'group-invite-1',
          status: 'pending',
          expires_at: futureDate(40),
          group_id: 'group-123',
          inviter_id: 'inviter-1',
          invitee_email: 'invitee@polyharmony.app',
        },
      };

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === 'invitation_tokens') {
          return createQueryChain({ data: null, error: null });
        }
        if (table === 'group_invitation_tokens') {
          return createQueryChain({ data: groupInvitationRecord, error: null });
        }
        throw new Error(`Unexpected table: ${table}`);
      });

      const result = await validateInviteToken(token);

      expect(result.isValid).toBe(true);
      expect(result.invitationType).toBe('group');
      expect(result.invitation?.group_id).toBe('group-123');
    });

    it('should reject expired tokens immediately', async () => {
      const token = 'expired-token';
      const expiredRecord = {
        id: 'token-expired',
        expires_at: pastDate(5),
        used_at: null,
        invitations: {
          id: 'invite-expired',
          status: 'pending',
          expires_at: pastDate(1),
        },
      };

      supabaseMock.from.mockImplementation((table: string) => {
        if (table === 'invitation_tokens') {
          return createQueryChain({ data: expiredRecord, error: null });
        }
        return createQueryChain({ data: null, error: null });
      });

      const result = await validateInviteToken(token);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Token has expired');
    });
  });

  describe('Invitation Workflow Scalability', () => {
    it('should mark tokens as used with request metadata captured', async () => {
      const token = 'metadata-token';
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const updateChain = createQueryChain({ data: null, error: null });

      supabaseMock.from.mockReturnValue(updateChain);

      const outcome = await markTokenAsUsed(token, 'individual', {
        ip: '203.0.113.1',
        userAgent: 'LoadTestAgent/1.0',
      });

      expect(outcome.success).toBe(true);
      expect(updateChain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          used_at: expect.any(String),
          used_by_ip: '203.0.113.1',
          used_by_user_agent: 'LoadTestAgent/1.0',
        }),
      );
      expect(updateChain.eq).toHaveBeenCalledWith('token_hash', tokenHash);
    });

    it('should aggregate cleanup results across invitation token tables', async () => {
      const invitationTokensChain = createQueryChain({ data: null, error: null, count: 5 });
      const groupTokensChain = createQueryChain({ data: null, error: null, count: 3 });
      const invitationUpdateChain = createQueryChain({ data: null, error: null });
      const groupInvitationUpdateChain = createQueryChain({ data: null, error: null });

      supabaseMock.from
        .mockImplementationOnce(() => invitationTokensChain)
        .mockImplementationOnce(() => groupTokensChain)
        .mockImplementationOnce(() => invitationUpdateChain)
        .mockImplementationOnce(() => groupInvitationUpdateChain);

      const result = await cleanupExpiredInvites();

      expect(result.success).toBe(true);
      expect(result.deletedCount).toBe(8);
      expect(invitationTokensChain.delete).toHaveBeenCalledWith({ count: 'exact' });
      expect(invitationUpdateChain.update).toHaveBeenCalledWith({ status: 'expired' });
    });

    it('should handle partial cleanup failures gracefully', async () => {
      const invitationTokensChain = createQueryChain({ data: null, error: new Error('write failure'), count: undefined });
      const groupTokensChain = createQueryChain({ data: null, error: null, count: 2 });
      const invitationUpdateChain = createQueryChain({ data: null, error: null });
      const groupInvitationUpdateChain = createQueryChain({ data: null, error: null });

      supabaseMock.from
        .mockImplementationOnce(() => invitationTokensChain)
        .mockImplementationOnce(() => groupTokensChain)
        .mockImplementationOnce(() => invitationUpdateChain)
        .mockImplementationOnce(() => groupInvitationUpdateChain);

      const result = await cleanupExpiredInvites();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Some cleanup operations failed');
    });
  });

  describe('Notification Deliverability', () => {
    it('should calculate invitation rate limits when under heavy load', async () => {
      const invitationsChain = createQueryChain({ data: null, error: null, count: 7 });
      const groupInvitationsChain = createQueryChain({ data: null, error: null, count: 5 });

      supabaseMock.from
        .mockImplementationOnce(() => invitationsChain)
        .mockImplementationOnce(() => groupInvitationsChain);

      const result = await checkInvitationRateLimit('user-123', 60, 10);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.resetTime).toBeInstanceOf(Date);
    });

    it('should report remaining invitation capacity for normal usage', async () => {
      const invitationsChain = createQueryChain({ data: null, error: null, count: 2 });
      const groupInvitationsChain = createQueryChain({ data: null, error: null, count: 1 });

      supabaseMock.from
        .mockImplementationOnce(() => invitationsChain)
        .mockImplementationOnce(() => groupInvitationsChain);

      const result = await checkInvitationRateLimit('user-456', 30, 10);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(7);
      expect(result.resetTime).toBeInstanceOf(Date);
    });
  });
});

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { PrivacyLevel } from '@/lib/supabase/types';
import { checkRateLimit } from '@/lib/rate-limiting';

let EnhancedMultiPartnerChecker: typeof import('../../lib/conflict-detection/enhanced-multi-partner-checker').EnhancedMultiPartnerChecker;

describe('Performance & Reliability Tests', () => {
  beforeAll(async () => {
    const actualModule = await vi.importActual<typeof import('../../lib/conflict-detection/enhanced-multi-partner-checker')>(
      '../../lib/conflict-detection/enhanced-multi-partner-checker'
    );
    EnhancedMultiPartnerChecker = actualModule.EnhancedMultiPartnerChecker;
    console.log('⚡ Starting Performance & Reliability Tests - CRITICAL FOR PRODUCTION');
  });

  afterAll(() => {
    console.log('⚡ Performance & Reliability Tests completed');
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseTime = new Date('2024-01-06T12:00:00.000Z');

  function buildEvent(
    partnerId: string,
    startOffsetMinutes: number,
    durationMinutes: number,
    privacyLevel: PrivacyLevel = 'visible',
    relationshipPrivacy: PrivacyLevel = 'visible',
  ) {
    const start = new Date(baseTime.getTime() + startOffsetMinutes * 60 * 1000);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    return {
      id: `${partnerId}-${startOffsetMinutes}`,
      title: `Calendar event for ${partnerId}`,
      description: 'Stress test event',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      location: 'PolyHarmony HQ',
      is_all_day: false,
      privacy_level: privacyLevel,
      buffer_time_before: 0,
      buffer_time_after: 0,
      travel_time_to_location: null,
      relationships: {
        partner_name: `Partner ${partnerId}`,
        user_id: 'user-123',
        partner_id: partnerId,
        default_privacy_level: relationshipPrivacy,
      },
    };
  }

  function createSupabaseMock(events: any[], error?: Error) {
    return {
      from: vi.fn(() => {
        const chain: any = {};
        chain.select = vi.fn().mockReturnValue(chain);
        chain.in = vi.fn().mockReturnValue(chain);
        chain.eq = vi.fn().mockReturnValue(chain);
        chain.lt = vi.fn().mockReturnValue(chain);
        chain.gt = vi.fn().mockReturnValue(chain);
        chain.not = vi.fn().mockReturnValue(chain);
        const result = error ? { data: null, error } : { data: events, error: null };
        chain.then = (resolve: any, reject?: any) => Promise.resolve(result).then(resolve, reject);
        chain.catch = (reject: any) => Promise.resolve(result).catch(reject);
        return chain;
      }),
    };
  }

  describe('Calendar Conflict Detection Performance', () => {
    it('should detect overlapping conflicts for multiple partners well within two seconds', async () => {
      const events = [
        buildEvent('partner-a', 30, 90, 'semi_private', 'visible'),
        buildEvent('partner-b', -30, 150, 'visible', 'visible'),
      ];
      const supabase = createSupabaseMock(events);
      const checker = new EnhancedMultiPartnerChecker(supabase as any);

      const response = await checker.checkBatch({
        event_start: new Date(baseTime.getTime() + 60 * 60 * 1000).toISOString(),
        event_end: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        partner_ids: ['partner-a', 'partner-b'],
        buffer_time_minutes: 15,
        alternative_slots_count: 2,
      }, 'user-123');
      expect(response.success).toBe(true);
      expect(response.has_conflicts).toBe(true);
      expect(response.conflicts).toHaveLength(2);
      expect(response.performance_metrics.partners_checked).toBe(2);
      expect(response.performance_metrics.processing_time_ms).toBeLessThan(2000);
      expect(response.privacy_summary.total_events_checked).toBe(events.length);
      expect((supabase.from as any).mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    it('should reuse cached conflict results on repeated evaluations', async () => {
      const events = [buildEvent('partner-a', 0, 60), buildEvent('partner-a', 90, 60)];
      const supabase = createSupabaseMock(events);
      const checker = new EnhancedMultiPartnerChecker(supabase as any);

      const request = {
        event_start: new Date(baseTime.getTime() + 30 * 60 * 1000).toISOString(),
        event_end: new Date(baseTime.getTime() + 90 * 60 * 1000).toISOString(),
        partner_ids: ['partner-a'],
        buffer_time_minutes: 10,
      };

      const first = await checker.checkBatch(request, 'user-123');
      const second = await checker.checkBatch(request, 'user-123');

      expect(first.performance_metrics.cache_hit_ratio).toBe(0);
      expect(second.performance_metrics.cache_hit_ratio).toBe(1);
    });

    it('should handle dense schedules exceeding 100 events without degrading', async () => {
      const events: any[] = [];
      const partnerIds = ['partner-a', 'partner-b', 'partner-c'];
      partnerIds.forEach((partnerId, index) => {
        for (let i = 0; i < 40; i += 1) {
          events.push(buildEvent(partnerId, index * 15 + i * 30, 25, 'private', 'semi_private'));
        }
      });

      const supabase = createSupabaseMock(events);
      const checker = new EnhancedMultiPartnerChecker(supabase as any);

      const response = await checker.checkBatch({
        event_start: new Date(baseTime.getTime() + 6 * 60 * 60 * 1000).toISOString(),
        event_end: new Date(baseTime.getTime() + 7 * 60 * 60 * 1000).toISOString(),
        partner_ids: partnerIds,
        buffer_time_minutes: 15,
      }, 'user-123');

      expect(response.success).toBe(true);
      expect(response.performance_metrics.database_queries).toBe(1);
      expect(response.privacy_summary.total_events_checked).toBe(events.length);
      expect(response.performance_metrics.processing_time_ms).toBeLessThan(2000);
    });

    it('should surface a safe error payload when Supabase queries fail', async () => {
      const supabase = createSupabaseMock([], new Error('database offline'));
      const checker = new EnhancedMultiPartnerChecker(supabase as any);

      const response = await checker.checkBatch({
        event_start: new Date(baseTime.getTime() + 60 * 60 * 1000).toISOString(),
        event_end: new Date(baseTime.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        partner_ids: ['partner-a'],
      }, 'user-123');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Database query failed: database offline');
      expect(response.performance_metrics.database_queries).toBe(0);
    });
  });

  describe('API Rate Limiting Performance', () => {
    it('should allow normal traffic and throttle exceeding clients', () => {
      const options = { windowMs: 60_000, maxRequests: 5, blockDuration: 5_000 };
      const identifier = `user-${Math.random().toString(36).slice(2)}`;
      let result;

      for (let i = 0; i < 5; i += 1) {
        result = checkRateLimit(identifier, options);
        expect(result.isLimited).toBe(false);
      }

      const limited = checkRateLimit(identifier, options);
      expect(limited.isLimited).toBe(true);
      expect(limited.remaining).toBe(0);
    });

    it('should progressively block abusive clients after repeated violations', () => {
      const options = { windowMs: 60_000, maxRequests: 2, blockDuration: 10_000 };
      const identifier = `abusive-${Math.random().toString(36).slice(2)}`;

      checkRateLimit(identifier, options);
      checkRateLimit(identifier, options);

      const third = checkRateLimit(identifier, options);
      const fourth = checkRateLimit(identifier, options);
      const fifth = checkRateLimit(identifier, options);

      expect(third.isLimited).toBe(true);
      expect(fourth.blocked || fifth.blocked).toBe(true);
      const retryAfter = fourth.blocked ? fourth.retryAfter : fifth.retryAfter;
      expect(retryAfter).toBeGreaterThan(0);
    });
  });
});

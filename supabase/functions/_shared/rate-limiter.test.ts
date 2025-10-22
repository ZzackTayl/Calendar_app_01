/**
 * Tests for Rate Limiter
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { checkRateLimit, RateLimitConfig } from "./rate-limiter.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// Mock Supabase client for testing
function createMockSupabase() {
  const logs: Array<{ user_id: string; action: string; created_at: string }> =
    [];

  return {
    from: (table: string) => ({
      select: (
        columns: string,
        options?: { count?: string; head?: boolean },
      ) => ({
        eq: (column: string, value: string) => ({
          eq: (column2: string, value2: string) => ({
            gte: (column3: string, value3: string) => ({
              then: () =>
                Promise.resolve({
                  data: logs.filter(
                    (log) =>
                      log.user_id === value &&
                      log.action === value2 &&
                      new Date(log.created_at) >= new Date(value3),
                  ),
                  error: null,
                }),
            }),
          }),
        }),
      }),
      insert: (data: any) => ({
        then: () => {
          logs.push(data);
          return Promise.resolve({ data, error: null });
        },
      }),
    }),
  } as any;
}

Deno.test("Rate Limiter - allows requests within limit", async () => {
  const supabase = createMockSupabase();
  const config: RateLimitConfig = {
    maxRequests: 5,
    windowSeconds: 60,
    action: "test_action",
  };

  // First request should be allowed
  const result1 = await checkRateLimit(supabase, "user-123", config);

  assertEquals(result1.allowed, true);
  assertEquals(result1.remaining, 4);
  assertExists(result1.resetAt);
});

Deno.test("Rate Limiter - blocks requests over limit", async () => {
  const supabase = createMockSupabase();
  const config: RateLimitConfig = {
    maxRequests: 3,
    windowSeconds: 60,
    action: "test_action",
  };

  // Make 3 requests (at the limit)
  await checkRateLimit(supabase, "user-123", config);
  await checkRateLimit(supabase, "user-123", config);
  await checkRateLimit(supabase, "user-123", config);

  // 4th request should be blocked
  const result4 = await checkRateLimit(supabase, "user-123", config);

  assertEquals(result4.allowed, false);
  assertEquals(result4.remaining, 0);
  assertExists(result4.message);
  assertEquals(
    result4.message?.includes("Rate limit exceeded"),
    true,
  );
});

Deno.test("Rate Limiter - different users have separate limits", async () => {
  const supabase = createMockSupabase();
  const config: RateLimitConfig = {
    maxRequests: 2,
    windowSeconds: 60,
    action: "test_action",
  };

  // User 1 makes 2 requests (at limit)
  await checkRateLimit(supabase, "user-1", config);
  await checkRateLimit(supabase, "user-1", config);

  // User 2 should still be allowed
  const result = await checkRateLimit(supabase, "user-2", config);

  assertEquals(result.allowed, true);
});

Deno.test("Rate Limiter - different actions have separate limits", async () => {
  const supabase = createMockSupabase();

  // Action 1 at limit
  await checkRateLimit(supabase, "user-123", {
    maxRequests: 1,
    windowSeconds: 60,
    action: "action_1",
  });

  // Action 2 should still be allowed
  const result = await checkRateLimit(supabase, "user-123", {
    maxRequests: 1,
    windowSeconds: 60,
    action: "action_2",
  });

  assertEquals(result.allowed, true);
});

Deno.test("Rate Limiter - handles database errors gracefully", async () => {
  // Create a mock that simulates database error
  const errorSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            gte: () => ({
              then: () =>
                Promise.resolve({
                  data: null,
                  error: { message: "Database error" },
                }),
            }),
          }),
        }),
      }),
      insert: () => ({
        then: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
  } as any;

  const config: RateLimitConfig = {
    maxRequests: 5,
    windowSeconds: 60,
    action: "test_action",
  };

  // Should fail open (allow request) on database errors
  const result = await checkRateLimit(errorSupabase, "user-123", config);

  assertEquals(result.allowed, true);
  assertEquals(result.remaining, 5);
});

Deno.test("Rate Limiter - returns correct reset time", async () => {
  const supabase = createMockSupabase();
  const config: RateLimitConfig = {
    maxRequests: 5,
    windowSeconds: 60,
    action: "test_action",
  };

  const before = Date.now();
  const result = await checkRateLimit(supabase, "user-123", config);
  const after = Date.now();

  assertExists(result.resetAt);

  const resetTime = result.resetAt.getTime();
  const expectedMin = before + 60 * 1000;
  const expectedMax = after + 60 * 1000;

  assertEquals(resetTime >= expectedMin, true);
  assertEquals(resetTime <= expectedMax, true);
});

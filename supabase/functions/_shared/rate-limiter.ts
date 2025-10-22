/**
 * Rate Limiter for Supabase Edge Functions
 * 
 * Uses database-based tracking to prevent abuse and control costs.
 * Implements sliding window rate limiting per user.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in seconds */
  windowSeconds: number;
  /** Action being rate limited (for logging) */
  action: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  message?: string;
}

/**
 * Check if user has exceeded rate limit
 * 
 * @param supabase Supabase client
 * @param userId User ID to check
 * @param config Rate limit configuration
 * @returns Result indicating if request is allowed
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowSeconds * 1000);

  try {
    // Create rate_limit_log table on first use (migrations will handle this properly)
    // This is a safeguard for development environments
    await ensureRateLimitTable(supabase);

    // Count requests in current window
    const { data: recentRequests, error: countError } = await supabase
      .from("rate_limit_log")
      .select("id", { count: "exact", head: false })
      .eq("user_id", userId)
      .eq("action", config.action)
      .gte("created_at", windowStart.toISOString());

    if (countError) {
      console.error("Rate limit check error:", countError);
      // Fail open on database errors to avoid blocking legitimate users
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: new Date(now.getTime() + config.windowSeconds * 1000),
      };
    }

    const requestCount = (recentRequests?.length || 0);
    const remaining = Math.max(0, config.maxRequests - requestCount);
    const resetAt = new Date(now.getTime() + config.windowSeconds * 1000);

    // Check if limit exceeded
    if (requestCount >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        message: `Rate limit exceeded. Maximum ${config.maxRequests} ${config.action} per ${config.windowSeconds}s. Try again at ${resetAt.toISOString()}.`,
      };
    }

    // Log this request
    await supabase.from("rate_limit_log").insert({
      user_id: userId,
      action: config.action,
      created_at: now.toISOString(),
    });

    return {
      allowed: true,
      remaining: remaining - 1, // Account for current request
      resetAt,
    };
  } catch (error) {
    console.error("Rate limit error:", error);
    // Fail open on unexpected errors
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(now.getTime() + config.windowSeconds * 1000),
    };
  }
}

/**
 * Ensure rate_limit_log table exists
 * In production, this should be handled by migrations
 */
async function ensureRateLimitTable(supabase: SupabaseClient): Promise<void> {
  // This is handled by migrations in production
  // This function is a no-op placeholder for future migration checks
  return;
}

/**
 * Clean up old rate limit logs (run periodically)
 * Removes entries older than 24 hours
 */
export async function cleanupRateLimitLogs(
  supabase: SupabaseClient,
): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  await supabase
    .from("rate_limit_log")
    .delete()
    .lt("created_at", cutoff.toISOString());
}

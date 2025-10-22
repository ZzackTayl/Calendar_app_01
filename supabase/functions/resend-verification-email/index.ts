import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { checkRateLimit } from "../_shared/rate-limiter.ts";

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { email } = body ?? {};

    if (!email || typeof email !== "string") {
      return jsonError("email required", 400);
    }

    const supabase = createSupabaseClient(req);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return jsonError("unauthorized", 401);
    }

    // Verify the email belongs to the current user
    if (user.email !== email) {
      return jsonError("email mismatch", 403);
    }

    // Check if user is already verified
    if (user.email_confirmed_at) {
      return new Response(
        JSON.stringify({
          error: "email already verified",
          alreadyVerified: true,
        }),
        {
          status: 400,
          headers: { "content-type": "application/json" },
        }
      );
    }

    // Check rate limit: 3 verification emails per 15 minutes
    const rateLimitResult = await checkRateLimit(supabase, user.id, {
      maxRequests: 3,
      windowSeconds: 900, // 15 minutes
      action: "resend_verification_email",
    });

    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: rateLimitResult.message,
          remaining: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt,
        }),
        {
          status: 429,
          headers: {
            "content-type": "application/json",
            "X-RateLimit-Limit": "3",
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": rateLimitResult.resetAt.toISOString(),
          },
        }
      );
    }

    // Use Supabase Admin API to resend verification email
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Supabase environment not configured");
      return jsonError("Service unavailable", 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Generate new verification token and send email
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "signup",
      email: email,
      options: {
        redirectTo: `${Deno.env.get("APP_URL") || "https://myorbit.app"}/verify-email`,
      },
    });

    if (error) {
      console.error("Failed to generate verification link:", error);
      return jsonError("Failed to send verification email", 500);
    }

    console.log("Verification email resent successfully", {
      email: email,
      userId: user.id,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Verification email sent",
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );
  } catch (error) {
    console.error("resend-verification-email error", error);
    return jsonError("internal error", 500);
  }
});

function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function createSupabaseClient(req: Request) {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!url || !anonKey) {
    throw new Error("Supabase environment not configured");
  }

  return createClient(url, anonKey, {
    global: {
      headers: { Authorization: req.headers.get("Authorization") ?? "" },
    },
  });
}

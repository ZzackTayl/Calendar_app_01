import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { checkRateLimit } from "../_shared/rate-limiter.ts";

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const {
      sender_id,
      recipient_phone_number,
      recipient_name,
      sender_name,
      personal_message,
    } = body ?? {};

    if (!recipient_phone_number || typeof recipient_phone_number !== "string") {
      return jsonError("recipient_phone_number required", 400);
    }

    // Validate E.164 phone number format
    if (!isValidE164Phone(recipient_phone_number)) {
      return jsonError(
        "Invalid phone number format. Use E.164 format (e.g., +1234567890).",
        400,
      );
    }

    if (!sender_id || typeof sender_id !== "string") {
      return jsonError("sender_id required", 400);
    }

    const supabase = createSupabaseClient(req);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonError("unauthorized", 401);
    }
    if (user.id !== sender_id) {
      return jsonError("sender mismatch", 403);
    }

    // Check rate limit: 5 SMS invitations per minute (more conservative than email)
    const rateLimitResult = await checkRateLimit(supabase, user.id, {
      maxRequests: 5,
      windowSeconds: 60,
      action: "send_sms_invitation",
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
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": rateLimitResult.resetAt.toISOString(),
          },
        },
      );
    }

    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      console.error("Twilio configuration missing");
      return jsonError("SMS service unavailable", 500);
    }

    const messageBody = buildMessage({
      senderName: sender_name,
      recipientName: recipient_name,
      personalMessage: personal_message,
    });

    const formData = new URLSearchParams({
      From: twilioFromNumber,
      To: recipient_phone_number,
      Body: messageBody,
    });

    const authString = `${twilioAccountSid}:${twilioAuthToken}`;
    const response = await fetch(
      `${TWILIO_API_BASE}/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(authString)}`,
        },
        body: formData,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Twilio error", errorText);
      return jsonError("failed to send sms", 502);
    }

    const payload = await response.json();

    return new Response(JSON.stringify({ ok: true, sid: payload.sid }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("send-contact-invitation-sms error", error);
    return jsonError("internal error", 500);
  }
});

function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isValidE164Phone(phone: string): boolean {
  const e164Regex = /^\+\d{1,15}$/;
  return e164Regex.test(phone);
}

function buildMessage({
  senderName,
  recipientName,
  personalMessage,
}: {
  senderName?: string;
  recipientName?: string;
  personalMessage?: string;
}): string {
  const intro = `${senderName ?? "A MyOrbit user"} invited ${
    recipientName ?? "you"
  } to connect.`;
  if (personalMessage && personalMessage.trim().length > 0) {
    // Sanitize personal message for SMS (limit length)
    const sanitized = personalMessage.trim().substring(0, 300);
    return `${intro}\n\nMessage: ${sanitized}`;
  }
  return intro;
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

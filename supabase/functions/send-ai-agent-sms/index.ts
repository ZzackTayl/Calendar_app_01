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
    const {
      user_id,
      recipient_phone_number,
      message_body,
      agent_type, // 'outreach', 'availability', 'confirmation'
      context_data, // Additional data for agent context (e.g., event_id, contact_id)
    } = body ?? {};

    if (!user_id || typeof user_id !== "string") {
      return jsonError("user_id required", 400);
    }

    if (!recipient_phone_number || typeof recipient_phone_number !== "string") {
      return jsonError("recipient_phone_number required", 400);
    }

    if (!message_body || typeof message_body !== "string") {
      return jsonError("message_body required", 400);
    }

    if (!agent_type || typeof agent_type !== "string") {
      return jsonError("agent_type required", 400);
    }

    // Validate phone number format (E.164)
    if (!isValidE164Phone(recipient_phone_number)) {
      return jsonError("Invalid phone number format. Use E.164 format (e.g., +1234567890).", 400);
    }

    const supabase = createSupabaseClient(req);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError("unauthorized", 401);
    }

    if (user.id !== user_id) {
      return jsonError("user mismatch", 403);
    }

    // Check rate limit: 20 AI agent SMS per minute (higher limit for automated messages)
    const rateLimitResult = await checkRateLimit(supabase, user.id, {
      maxRequests: 20,
      windowSeconds: 60,
      action: "send_ai_agent_sms",
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
            "X-RateLimit-Limit": "20",
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": rateLimitResult.resetAt.toISOString(),
          },
        },
      );
    }

    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");
    const webhookUrl = Deno.env.get("TWILIO_WEBHOOK_URL"); // For inbound SMS

    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      console.error("Twilio configuration missing");
      return jsonError("SMS service unavailable", 500);
    }

    // Record in SMS conversation log for tracking
    const { data: smsRecord, error: smsInsertError } = await supabase
      .from("sms_conversations")
      .insert({
        user_id,
        agent_type,
        recipient_phone_number,
        message_body,
        direction: "outbound",
        context_data: context_data || {},
        status: "pending",
      })
      .select("id")
      .single();

    if (smsInsertError) {
      console.error("Failed to record SMS conversation", smsInsertError);
      return jsonError("failed to record message", 500);
    }

    // Send via Twilio
    const formData = new URLSearchParams({
      From: twilioFromNumber,
      To: recipient_phone_number,
      Body: message_body,
      // Optional: Add webhook for status updates
      StatusCallback: webhookUrl
        ? `${webhookUrl}?record_id=${smsRecord.id}`
        : "",
    });

    const authString = `${twilioAccountSid}:${twilioAuthToken}`;
    const twilioResponse = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(authString)}`,
        },
        body: formData,
      },
    );

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text();
      console.error("Twilio error", errorText);

      // Update record with failure
      await supabase
        .from("sms_conversations")
        .update({ status: "failed" })
        .eq("id", smsRecord.id);

      return jsonError("failed to send sms", 502);
    }

    const twilioPayload = await twilioResponse.json();

    // Update record with success
    await supabase
      .from("sms_conversations")
      .update({
        status: "sent",
        twilio_sid: twilioPayload.sid,
      })
      .eq("id", smsRecord.id);

    console.log("AI agent SMS sent successfully", {
      recipient: recipient_phone_number,
      agent_type,
      messageId: twilioPayload.sid,
      recordId: smsRecord.id,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        sid: twilioPayload.sid,
        record_id: smsRecord.id,
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  } catch (error) {
    console.error("send-ai-agent-sms error", error);
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

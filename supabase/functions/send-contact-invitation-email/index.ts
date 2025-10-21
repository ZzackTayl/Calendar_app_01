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
      sender_id,
      recipient_name,
      recipient_email,
      personal_message,
      permission,
    } = body ?? {};

    if (!recipient_email || typeof recipient_email !== "string") {
      return jsonError("recipient_email required", 400);
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

    // Check rate limit: 10 email invitations per minute
    const rateLimitResult = await checkRateLimit(supabase, user.id, {
      maxRequests: 10,
      windowSeconds: 60,
      action: "send_email_invitation",
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
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "X-RateLimit-Reset": rateLimitResult.resetAt.toISOString(),
          },
        },
      );
    }

    // Fetch sender's profile for display name
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("display_name, email")
      .eq("id", sender_id)
      .single();

    const senderName = senderProfile?.display_name || senderProfile?.email || "A MyOrbit user";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("Resend API key not configured");
      return jsonError("Email service unavailable", 500);
    }

    const emailBody = buildEmailBody({
      senderName,
      recipientName: recipient_name || "there",
      personalMessage,
    });

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "invitations@myorbit.app",
        to: recipient_email,
        subject: `${senderName} invited you to connect on MyOrbit`,
        html: emailBody,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend error", errorText);
      return jsonError("failed to send email", 502);
    }

    const payload = await emailResponse.json();

    console.log("Email sent successfully", {
      recipient: recipient_email,
      messageId: payload.id,
    });

    return new Response(JSON.stringify({ ok: true, id: payload.id }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (error) {
    console.error("send-contact-invitation-email error", error);
    return jsonError("internal error", 500);
  }
});

function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildEmailBody({
  senderName,
  recipientName,
  personalMessage,
}: {
  senderName: string;
  recipientName: string;
  personalMessage?: string;
}): string {
  // Escape all user-provided content to prevent XSS
  const safeSenderName = escapeHtml(senderName);
  const safeRecipientName = escapeHtml(recipientName);
  const safePersonalMessage = personalMessage
    ? escapeHtml(personalMessage)
    : null;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #000; margin: 0; font-size: 24px; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .message { font-style: italic; color: #666; padding: 15px; background: #fff; border-left: 4px solid #007AFF; margin: 15px 0; }
    .cta-button { display: inline-block; padding: 12px 24px; background: #007AFF; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You're invited to MyOrbit</h1>
    </div>
    
    <div class="content">
      <p>Hi ${safeRecipientName},</p>
      
      <p><strong>${safeSenderName}</strong> invited you to connect on MyOrbit Calendar.</p>
      
      ${
        safePersonalMessage
          ? `<div class="message"><p><strong>Personal message:</strong><br>${safePersonalMessage}</p></div>`
          : ""
      }
      
      <p>MyOrbit helps teams coordinate schedules and share availability instantly. Accept the invitation to start collaborating.</p>
      
      <center>
        <a href="https://myorbit.app/invitations" class="cta-button">View Invitation</a>
      </center>
    </div>
    
    <div class="footer">
      <p>© 2024 MyOrbit. All rights reserved.</p>
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
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

// Minimal Edge Function stub: send-contact-invitation-email
// Validates input, logs, and returns 200

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req: Request) => {
  try {
    const { recipient_email, recipient_name, sender_name, message } = await req.json();
    if (!recipient_email || !recipient_name) {
      return new Response(JSON.stringify({ error: "recipient_email and recipient_name required" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    console.log("send-contact-invitation-email", { recipient_email, recipient_name, sender_name, message });
    // Integrate with your email provider here (e.g., Resend, Postmark)

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
});

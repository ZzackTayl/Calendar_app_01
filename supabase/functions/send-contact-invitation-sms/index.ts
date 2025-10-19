// Minimal Edge Function stub: send-contact-invitation-sms
// Validates input, logs, and returns 200

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req: Request) => {
  try {
    const { recipient_phone_number, recipient_name, sender_name, message } = await req.json();
    if (!recipient_phone_number) {
      return new Response(JSON.stringify({ error: "recipient_phone_number required" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

    console.log("send-contact-invitation-sms", { recipient_phone_number, recipient_name, sender_name, message });
    // Integrate with your SMS provider here (e.g., Twilio)

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

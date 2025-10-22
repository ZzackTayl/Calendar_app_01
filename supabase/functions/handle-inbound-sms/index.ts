import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  validateTwilioSignature,
  formDataToParams,
} from "../_shared/twilio-validator.ts";

/**
 * Webhook handler for inbound SMS messages from Twilio.
 * This function:
 * 1. Receives SMS replies from users/contacts
 * 2. Records the message in the SMS conversation log
 * 3. Triggers AI agent processing for two-way conversations
 * 4. Returns a Twilio-compatible XML response
 */
serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Verify Twilio webhook signature to prevent spoofing
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioSignature = req.headers.get("X-Twilio-Signature");

    if (!twilioAuthToken) {
      console.error("TWILIO_AUTH_TOKEN not configured");
      return new Response("Server configuration error", { status: 500 });
    }

    // Parse Twilio webhook payload (form-encoded)
    const formData = await req.formData();
    const params = formDataToParams(formData);

    // Validate signature
    const isValid = await validateTwilioSignature(
      twilioSignature,
      req.url,
      params,
      twilioAuthToken,
    );

    if (!isValid) {
      console.error("Invalid Twilio signature - possible spoofing attempt", {
        url: req.url,
        signature: twilioSignature?.substring(0, 10) + "...",
      });
      return new Response("Forbidden", { status: 403 });
    }

    const messageBody = formData.get("Body") as string;
    const fromPhone = formData.get("From") as string;
    const toPhone = formData.get("To") as string;
    const messageSmsSid = formData.get("MessageSid") as string;
    const numMedia = formData.get("NumMedia") as string;

    if (!messageBody || !fromPhone || !toPhone || !messageSmsSid) {
      console.error("Missing required Twilio fields", {
        messageBody,
        fromPhone,
        toPhone,
        messageSmsSid,
      });
      return twilioResponse("Invalid request");
    }

    console.log("Inbound SMS received", {
      from: fromPhone,
      to: toPhone,
      body: messageBody,
      sid: messageSmsSid,
    });

    const supabase = createSupabaseClient();

    // Find user by phone number (look up from user profiles or contacts)
    const { data: userProfiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, phone_number")
      .eq("phone_number", fromPhone)
      .limit(1);

    if (profileError) {
      console.error("Error looking up user profile", profileError);
      return twilioResponse("Error processing message");
    }

    if (!userProfiles || userProfiles.length === 0) {
      console.warn("No user found for phone", fromPhone);
      return twilioResponse("User not found");
    }

    const userId = userProfiles[0].id;

    // Check for duplicate message using Twilio SID
    const { data: existingMessage, error: dupError } = await supabase
      .from("sms_conversations")
      .select("id")
      .eq("twilio_sid", messageSmsSid)
      .limit(1)
      .maybeSingle();

    if (dupError) {
      console.error("Error checking for duplicate message", dupError);
    }

    if (existingMessage) {
      console.log("Duplicate message detected (Twilio retry), ignoring", {
        sid: messageSmsSid,
        existing_id: existingMessage.id,
      });
      // Return success to Twilio to stop retries
      return twilioResponse("Message already processed");
    }

    // Find active conversation for this phone number (within last 24 hours)
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString();
    
    const { data: conversation, error: convError } = await supabase
      .from("sms_conversations")
      .select("*")
      .eq("user_id", userId)
      .eq("recipient_phone_number", fromPhone)
      .gte("created_at", twentyFourHoursAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (convError && convError.code !== "PGRST116") {
      // PGRST116 = no rows found (ok), other errors not ok
      console.error("Error fetching conversation", convError);
    }

    // Record inbound message
    const { data: inboundRecord, error: insertError } = await supabase
      .from("sms_conversations")
      .insert({
        user_id: userId,
        recipient_phone_number: fromPhone,
        message_body: messageBody,
        direction: "inbound",
        twilio_sid: messageSmsSid,
        agent_type: conversation?.agent_type || "general",
        context_data: {
          ...((conversation?.context_data as Record<string, unknown>) || {}),
          inbound_reply: true,
          original_message_id: conversation?.id,
        },
        status: "received",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error recording inbound SMS", insertError);
      return twilioResponse("Error recording message");
    }

    // Trigger AI agent processing via Supabase function
    // This allows async processing of the reply
    triggerAgentProcessing(userId, inboundRecord.id, messageBody, conversation)
      .catch((e) => {
        console.error("Error triggering agent processing", e);
      });

    // Return success to Twilio
    return twilioResponse(
      "Message received and is being processed. Thank you!",
    );
  } catch (error) {
    console.error("handle-inbound-sms error", error);
    return twilioResponse("Error processing request");
  }
});

/**
 * Trigger AI agent to process the inbound message
 * This can dispatch to different agents based on message content and context
 */
async function triggerAgentProcessing(
  userId: string,
  recordId: string,
  messageBody: string,
  conversation: any,
): Promise<void> {
  const supabase = createSupabaseClient();

  // Mark record as being processed
  await supabase
    .from("sms_conversations")
    .update({ status: "processing" })
    .eq("id", recordId);

  // Dispatch to appropriate agent based on context
  const agentType = conversation?.agent_type || "general";

  try {
    switch (agentType) {
      case "outreach":
        // Agent specialized in reaching out and initiating conversations
        await triggerOutreachAgent(userId, recordId, messageBody, conversation);
        break;

      case "availability":
        // Agent specialized in sharing and discussing availability
        await triggerAvailabilityAgent(
          userId,
          recordId,
          messageBody,
          conversation,
        );
        break;

      case "confirmation":
        // Agent specialized in confirming/updating calendar events
        await triggerConfirmationAgent(
          userId,
          recordId,
          messageBody,
          conversation,
        );
        break;

      default:
        // General conversation handling
        await triggerGeneralAgent(userId, recordId, messageBody, conversation);
    }

    await supabase
      .from("sms_conversations")
      .update({ status: "processed" })
      .eq("id", recordId);
  } catch (error) {
    console.error("Error in agent processing", error);
    await supabase
      .from("sms_conversations")
      .update({
        status: "error",
        error_message: error instanceof Error ? error.message : String(error),
      })
      .eq("id", recordId);
  }
}

/**
 * Stub functions for each agent type - these will call your AI agent system
 * In production, these would call your AI orchestration layer
 */

async function triggerOutreachAgent(
  userId: string,
  recordId: string,
  messageBody: string,
  conversation: any,
): Promise<void> {
  console.log("Outreach agent processing", { userId, recordId, messageBody });
  // TODO: Implement outreach agent logic
  // This agent handles initial connections and relationship building
}

async function triggerAvailabilityAgent(
  userId: string,
  recordId: string,
  messageBody: string,
  conversation: any,
): Promise<void> {
  console.log(
    "Availability agent processing",
    { userId, recordId, messageBody },
  );
  // TODO: Implement availability agent logic
  // This agent shares current availability, suggests times, etc.
}

async function triggerConfirmationAgent(
  userId: string,
  recordId: string,
  messageBody: string,
  conversation: any,
): Promise<void> {
  console.log(
    "Confirmation agent processing",
    { userId, recordId, messageBody },
  );
  // TODO: Implement confirmation agent logic
  // This agent confirms availability, updates calendar, sends notifications
}

async function triggerGeneralAgent(
  userId: string,
  recordId: string,
  messageBody: string,
  conversation: any,
): Promise<void> {
  console.log("General agent processing", { userId, recordId, messageBody });
  // TODO: Implement general agent logic
}

function createSupabaseClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceKey) {
    throw new Error("Supabase environment not configured");
  }

  return createClient(url, serviceKey);
}

/**
 * Return a Twilio-compatible XML response
 * This tells Twilio we received the message successfully
 */
function twilioResponse(message: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;

  return new Response(xml, {
    status: 200,
    headers: { "content-type": "application/xml" },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

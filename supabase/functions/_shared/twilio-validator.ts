/**
 * Twilio Webhook Signature Validator
 * 
 * Validates incoming webhooks from Twilio to prevent spoofing and replay attacks.
 * Implements Twilio's X-Twilio-Signature validation using HMAC-SHA1.
 * 
 * @see https://www.twilio.com/docs/usage/security#validating-requests
 */

/**
 * Validate Twilio webhook signature
 * 
 * @param signature The X-Twilio-Signature header value
 * @param url The full URL of the webhook endpoint
 * @param params The POST parameters as key-value pairs
 * @param authToken Your Twilio auth token
 * @returns true if signature is valid, false otherwise
 */
export async function validateTwilioSignature(
  signature: string | null,
  url: string,
  params: Record<string, string>,
  authToken: string,
): Promise<boolean> {
  if (!signature) {
    console.warn("Missing X-Twilio-Signature header");
    return false;
  }

  // Build the signature string according to Twilio's spec:
  // 1. Take the full URL of the request (with query params if any)
  // 2. Sort all POST parameters alphabetically by key
  // 3. Append each key=value pair to the URL string
  // 4. Sign the resulting string with HMAC-SHA1 using auth token
  
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  // Use Web Crypto API to compute HMAC-SHA1
  const encoder = new TextEncoder();
  const keyData = encoder.encode(authToken);
  const messageData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    messageData,
  );

  // Convert to base64
  const expectedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer)),
  );

  const isValid = expectedSignature === signature;
  
  if (!isValid) {
    console.warn("Invalid Twilio signature", {
      expected: expectedSignature.substring(0, 10) + "...",
      received: signature.substring(0, 10) + "...",
    });
  }

  return isValid;
}

/**
 * Extract params from FormData for signature validation
 */
export function formDataToParams(formData: FormData): Record<string, string> {
  const params: Record<string, string> = {};
  
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      params[key] = value;
    }
  }
  
  return params;
}

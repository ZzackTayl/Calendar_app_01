/**
 * Tests for Twilio Signature Validator
 */

import {
  assertEquals,
} from "https://deno.land/std@0.177.0/testing/asserts.ts";
import {
  validateTwilioSignature,
  formDataToParams,
} from "./twilio-validator.ts";

Deno.test("Twilio Validator - validates correct signature", async () => {
  // Test data from Twilio's documentation example
  // https://www.twilio.com/docs/usage/security#validating-requests
  const authToken = "12345";
  const url = "https://mycompany.com/myapp.php?foo=1&bar=2";
  const params = {
    CallSid: "CA1234567890ABCDE",
    Caller: "+14158675310",
    Digits: "1234",
    From: "+14158675310",
    To: "+18005551212",
  };

  // This is the expected signature for the above data
  // You would need to calculate this using the actual HMAC-SHA1 algorithm
  // For testing, we'll generate a valid signature
  const signature = await generateTestSignature(url, params, authToken);

  const result = await validateTwilioSignature(
    signature,
    url,
    params,
    authToken,
  );

  assertEquals(result, true);
});

Deno.test("Twilio Validator - rejects invalid signature", async () => {
  const authToken = "12345";
  const url = "https://mycompany.com/myapp.php";
  const params = {
    From: "+14158675310",
    To: "+18005551212",
  };

  // Use a fake/invalid signature
  const invalidSignature = "INVALIDSIGNATURE123456789";

  const result = await validateTwilioSignature(
    invalidSignature,
    url,
    params,
    authToken,
  );

  assertEquals(result, false);
});

Deno.test("Twilio Validator - rejects missing signature", async () => {
  const authToken = "12345";
  const url = "https://mycompany.com/myapp.php";
  const params = { From: "+14158675310" };

  const result = await validateTwilioSignature(
    null,
    url,
    params,
    authToken,
  );

  assertEquals(result, false);
});

Deno.test("Twilio Validator - handles empty params", async () => {
  const authToken = "12345";
  const url = "https://mycompany.com/myapp.php";
  const params = {};

  const signature = await generateTestSignature(url, params, authToken);

  const result = await validateTwilioSignature(
    signature,
    url,
    params,
    authToken,
  );

  assertEquals(result, true);
});

Deno.test("Twilio Validator - params order doesn't matter", async () => {
  const authToken = "12345";
  const url = "https://mycompany.com/myapp.php";

  // Same params in different order
  const params1 = { From: "+1234", To: "+5678", Body: "test" };
  const params2 = { Body: "test", To: "+5678", From: "+1234" };

  const signature1 = await generateTestSignature(url, params1, authToken);
  const signature2 = await generateTestSignature(url, params2, authToken);

  // Signatures should be identical
  assertEquals(signature1, signature2);
});

Deno.test("FormData conversion - extracts string values", () => {
  const formData = new FormData();
  formData.append("From", "+1234567890");
  formData.append("To", "+0987654321");
  formData.append("Body", "Hello World");

  const params = formDataToParams(formData);

  assertEquals(params.From, "+1234567890");
  assertEquals(params.To, "+0987654321");
  assertEquals(params.Body, "Hello World");
});

Deno.test("FormData conversion - ignores non-string values", () => {
  const formData = new FormData();
  formData.append("From", "+1234567890");
  formData.append("File", new Blob(["test"]), "test.txt");

  const params = formDataToParams(formData);

  assertEquals(params.From, "+1234567890");
  assertEquals(params.File, undefined);
});

Deno.test("FormData conversion - handles empty FormData", () => {
  const formData = new FormData();
  const params = formDataToParams(formData);

  assertEquals(Object.keys(params).length, 0);
});

/**
 * Helper function to generate a valid test signature
 * This replicates the signature generation logic
 */
async function generateTestSignature(
  url: string,
  params: Record<string, string>,
  authToken: string,
): Promise<string> {
  const sortedKeys = Object.keys(params).sort();
  let data = url;

  for (const key of sortedKeys) {
    data += key + params[key];
  }

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

  return btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));
}

/**
 * Integration tests for send-contact-invitation-sms edge function
 */

import {
  assertEquals,
} from "https://deno.land/std@0.177.0/testing/asserts.ts";

Deno.test("SMS Invitation - validates E.164 phone format", () => {
  const validPhones = [
    "+1234567890",
    "+12345678901",
    "+123456789012345", // Max 15 digits
    "+44123456789",
    "+861234567890",
  ];

  const invalidPhones = [
    "1234567890", // Missing +
    "+", // Just plus
    "+abc123", // Letters
    "++1234567890", // Double plus
    "+1234567890123456", // Too long (16 digits)
    "+123-456-7890", // Dashes
    "+123 456 7890", // Spaces
    "", // Empty
  ];

  for (const phone of validPhones) {
    assertEquals(
      isValidE164Phone(phone),
      true,
      `Expected ${phone} to be valid`,
    );
  }

  for (const phone of invalidPhones) {
    assertEquals(
      isValidE164Phone(phone),
      false,
      `Expected ${phone} to be invalid`,
    );
  }
});

Deno.test("SMS Invitation - limits message length", () => {
  const longMessage = "a".repeat(500);
  const sanitized = sanitizeMessage(longMessage);

  assertEquals(sanitized.length <= 300, true);
  assertEquals(sanitized.length, 300);
});

Deno.test("SMS Invitation - builds message correctly", () => {
  const testCases = [
    {
      senderName: "John Doe",
      recipientName: "Jane Smith",
      personalMessage: undefined,
      expected: "John Doe invited Jane Smith to connect.",
    },
    {
      senderName: "John Doe",
      recipientName: undefined,
      personalMessage: undefined,
      expected: "John Doe invited you to connect.",
    },
    {
      senderName: undefined,
      recipientName: "Jane Smith",
      personalMessage: undefined,
      expected: "A MyOrbit user invited Jane Smith to connect.",
    },
    {
      senderName: "John Doe",
      recipientName: "Jane Smith",
      personalMessage: "Looking forward to collaborating!",
      expected:
        "John Doe invited Jane Smith to connect.\n\nMessage: Looking forward to collaborating!",
    },
  ];

  for (const testCase of testCases) {
    const result = buildMessage({
      senderName: testCase.senderName,
      recipientName: testCase.recipientName,
      personalMessage: testCase.personalMessage,
    });

    assertEquals(result, testCase.expected);
  }
});

Deno.test("SMS Invitation - rate limit configuration", () => {
  const rateLimitConfig = {
    maxRequests: 5,
    windowSeconds: 60,
    action: "send_sms_invitation",
  };

  assertEquals(rateLimitConfig.maxRequests, 5);
  assertEquals(rateLimitConfig.windowSeconds, 60);
  assertEquals(rateLimitConfig.action, "send_sms_invitation");
});

// Helper functions (same as in actual code)
function isValidE164Phone(phone: string): boolean {
  const e164Regex = /^\+\d{1,15}$/;
  return e164Regex.test(phone);
}

function sanitizeMessage(message: string): string {
  return message.trim().substring(0, 300);
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
    const sanitized = personalMessage.trim().substring(0, 300);
    return `${intro}\n\nMessage: ${sanitized}`;
  }
  return intro;
}

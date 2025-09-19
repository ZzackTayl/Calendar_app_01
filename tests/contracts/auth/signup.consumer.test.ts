import { describe, it, expect } from 'vitest';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';

const CONTRACT_DIR = 'contracts/pact';

function createAuthPact(description: string) {
  return new PactV3({
    consumer: 'CalendarWebApp',
    provider: 'AuthAPI',
    logLevel: process.env.PACT_LOG_LEVEL ?? 'info',
    dir: CONTRACT_DIR,
    spec: 3,
    pactfileWriteMode: 'update',
  });
}

describe('Auth Signup Contracts', () => {
  it('returns 201 for valid signup with new user', async () => {
    const pact = createAuthPact('valid-signup');

    pact
      .given('User does not exist')
      .uponReceiving('a request to sign up with valid credentials')
      .withRequest({
        method: 'POST',
        path: '/api/auth/signup',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PACT-CLIENT',
        },
        body: {
          email: 'newuser@example.com',
          password: process.env.TEST_USER_PASSWORD!,
          timezone: 'America/New_York',
        },
      })
      .willRespondWith({
        status: 201,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: {
          message: MatchersV3.like('Signup successful. Please check your email to confirm your account.'),
          user: {
            id: MatchersV3.uuid('d83a6eb6-b5db-4a58-9db5-8d6c5d9f3ef2'),
            email: MatchersV3.like('newuser@example.com'),
            email_confirmed_at: null,
            created_at: MatchersV3.timestamp(
              "yyyy-MM-dd'T'HH:mm:ss.SSSX",
              '2025-09-19T00:00:00.000Z',
            ),
          },
        },
      });

    await pact.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PACT-CLIENT',
        },
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: process.env.TEST_USER_PASSWORD!,
          timezone: 'America/New_York',
        }),
      });

      expect(response.status).toBe(201);
      const payload = await response.json();
      expect(payload.message).toContain('Signup successful');
      expect(payload.user?.email).toBe('newuser@example.com');
      expect(payload.user?.email_confirmed_at).toBeNull();
    });
  });

  it('returns 409 for existing user email', async () => {
    const pact = createAuthPact('existing-user-signup');

    pact
      .given('User already exists')
      .uponReceiving('a request to sign up with existing email')
      .withRequest({
        method: 'POST',
        path: '/api/auth/signup',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PACT-CLIENT',
        },
        body: {
          email: 'existing@example.com',
          password: process.env.TEST_USER_PASSWORD!,
          timezone: 'America/New_York',
        },
      })
      .willRespondWith({
        status: 409,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: {
          error: MatchersV3.like('UserExists'),
          message: MatchersV3.regex(
            '^User with this email already exists.*$',
            'User with this email already exists. Please sign in instead.',
          ),
        },
      });

    await pact.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PACT-CLIENT',
        },
        body: JSON.stringify({
          email: 'existing@example.com',
          password: process.env.TEST_USER_PASSWORD!,
          timezone: 'America/New_York',
        }),
      });

      expect(response.status).toBe(409);
      const payload = await response.json();
      expect(payload.error).toBe('UserExists');
    });
  });

  it('returns 400 for invalid password strength', async () => {
    const pact = createAuthPact('weak-password-signup');

    pact
      .given('User does not exist')
      .uponReceiving('a request to sign up with weak password')
      .withRequest({
        method: 'POST',
        path: '/api/auth/signup',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PACT-CLIENT',
        },
        body: {
          email: 'newuser@example.com',
          password: '123',
          timezone: 'America/New_York',
        },
      })
      .willRespondWith({
        status: 400,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: {
          error: MatchersV3.like('ValidationError'),
          message: MatchersV3.regex(
            '^Password does not meet security requirements.*$',
            'Password does not meet security requirements. Must be at least 8 characters with uppercase, lowercase, number, and special character.',
          ),
          details: {
            field: 'password',
            requirements: MatchersV3.eachLike('minimum_length', 1),
          },
        },
      });

    await pact.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PACT-CLIENT',
        },
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: '123',
          timezone: 'America/New_York',
        }),
      });

      expect(response.status).toBe(400);
      const payload = await response.json();
      expect(payload.error).toBe('ValidationError');
      expect(payload.details?.field).toBe('password');
    });
  });

  it('returns 429 when signup rate limit exceeded', async () => {
    const pact = createAuthPact('signup-rate-limit');

    pact
      .given('Signup rate limit threshold reached for IP')
      .uponReceiving('a request to sign up after exceeding rate limit')
      .withRequest({
        method: 'POST',
        path: '/api/auth/signup',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PACT-CLIENT',
        },
        body: {
          email: 'newuser@example.com',
          password: process.env.TEST_USER_PASSWORD!,
          timezone: 'America/New_York',
        },
      })
      .willRespondWith({
        status: 429,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Retry-After': MatchersV3.integer(300),
        },
        body: {
          error: MatchersV3.like('TooManyRequests'),
          message: MatchersV3.regex(
            '^Too many signup attempts.*$',
            'Too many signup attempts. Please try again later.',
          ),
        },
      });

    await pact.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PACT-CLIENT',
        },
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: process.env.TEST_USER_PASSWORD!,
          timezone: 'America/New_York',
        }),
      });

      expect(response.status).toBe(429);
      expect(response.headers.get('retry-after')).toBeTruthy();
    });
  });
});
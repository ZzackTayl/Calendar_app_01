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

describe('Auth Signin Contracts', () => {
  it('returns 200 for valid credentials with confirmed email', async () => {
    const pact = createAuthPact('valid-signin');

    pact
      .given('User exists and is confirmed')
      .uponReceiving('a request to sign in with valid credentials')
      .withRequest({
        method: 'POST',
        path: '/api/auth/signin',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PACT-CLIENT',
        },
        body: {
          email: 'confirmed-user@example.com',
          password: 'DemoPass123!',
        },
      })
      .willRespondWith({
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Set-Cookie': MatchersV3.regex(
            '^sb:token=.+HttpOnly; Path=/; SameSite=Strict.*$',
            'sb:token=sample; HttpOnly; Path=/; SameSite=Strict',
          ),
        },
        body: {
          message: 'Authentication successful',
          user: {
            id: MatchersV3.uuid('d83a6eb6-b5db-4a58-9db5-8d6c5d9f3ef1'),
            email: MatchersV3.like('confirmed-user@example.com'),
            last_sign_in_at: MatchersV3.timestamp(
              "yyyy-MM-dd'T'HH:mm:ss.SSSX",
              '2025-09-19T00:00:00.000Z',
            ),
          },
        },
      });

    await pact.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PACT-CLIENT',
        },
        body: JSON.stringify({
          email: 'confirmed-user@example.com',
          password: 'DemoPass123!',
        }),
      });

      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.message).toBe('Authentication successful');
      expect(payload.user?.email).toBeDefined();
    });
  });

  it('returns generic 401 for invalid credentials', async () => {
    const pact = createAuthPact('invalid-credentials');

    pact
      .given('User exists and is confirmed')
      .uponReceiving('a request to sign in with an invalid password')
      .withRequest({
        method: 'POST',
        path: '/api/auth/signin',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PACT-CLIENT',
        },
        body: {
          email: 'confirmed-user@example.com',
          password: 'WrongPass!99',
        },
      })
      .willRespondWith({
        status: 401,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: {
          error: MatchersV3.like('InvalidCredentials'),
          message: MatchersV3.regex(
            '^Invalid email or password.*$',
            'Invalid email or password. If you recently signed up, check your inbox to confirm your account.',
          ),
        },
      });

    await pact.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PACT-CLIENT',
        },
        body: JSON.stringify({
          email: 'confirmed-user@example.com',
          password: 'WrongPass!99',
        }),
      });

      expect(response.status).toBe(401);
      const payload = await response.json();
      expect(payload.error).toBeTruthy();
    });
  });

  it('returns 429 when rate limit exceeded', async () => {
    const pact = createAuthPact('rate-limit');

    pact
      .given('Rate limit threshold reached for IP')
      .uponReceiving('a request to sign in after exceeding rate limit')
      .withRequest({
        method: 'POST',
        path: '/api/auth/signin',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PACT-CLIENT',
        },
        body: {
          email: 'confirmed-user@example.com',
          password: 'DemoPass123!',
        },
      })
      .willRespondWith({
        status: 429,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Retry-After': MatchersV3.integer(60),
        },
        body: {
          error: MatchersV3.like('TooManyRequests'),
          message: MatchersV3.regex(
            '^Too many login attempts.*$',
            'Too many login attempts. Please try again later.',
          ),
        },
      });

    await pact.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/api/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PACT-CLIENT',
        },
        body: JSON.stringify({
          email: 'confirmed-user@example.com',
          password: 'DemoPass123!',
        }),
      });

      expect(response.status).toBe(429);
      expect(response.headers.get('retry-after')).toBeTruthy();
    });
  });
});

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

describe('Auth Signout Contracts', () => {
  it('returns 200 for valid signout with authenticated user', async () => {
    const pact = createAuthPact('valid-signout');

    pact
      .given('User is authenticated')
      .uponReceiving('a request to sign out')
      .withRequest({
        method: 'POST',
        path: '/api/auth/signout',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PACT-CLIENT',
          'Cookie': MatchersV3.regex(
            '^sb:token=.+$',
            'sb:token=valid-session-token',
          ),
        },
      })
      .willRespondWith({
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Set-Cookie': MatchersV3.regex(
            '^sb:token=; expires=Thu, 01 Jan 1970.*$',
            'sb:token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; Path=/; SameSite=Strict',
          ),
        },
        body: {
          message: MatchersV3.like('Sign out successful'),
          success: true,
        },
      });

    await pact.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/api/auth/signout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PACT-CLIENT',
          'Cookie': 'sb:token=valid-session-token',
        },
      });

      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.message).toBe('Sign out successful');
      expect(payload.success).toBe(true);

      // Verify cookie is cleared
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('sb:token=;');
      expect(setCookieHeader).toContain('expires=Thu, 01 Jan 1970');
    });
  });

  it('returns 200 for signout without authentication (idempotent)', async () => {
    const pact = createAuthPact('unauthenticated-signout');

    pact
      .given('User is not authenticated')
      .uponReceiving('a request to sign out without valid session')
      .withRequest({
        method: 'POST',
        path: '/api/auth/signout',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PACT-CLIENT',
        },
      })
      .willRespondWith({
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Set-Cookie': MatchersV3.regex(
            '^sb:token=; expires=Thu, 01 Jan 1970.*$',
            'sb:token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; Path=/; SameSite=Strict',
          ),
        },
        body: {
          message: MatchersV3.like('Sign out successful'),
          success: true,
        },
      });

    await pact.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/api/auth/signout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PACT-CLIENT',
        },
      });

      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.message).toBe('Sign out successful');
      expect(payload.success).toBe(true);
    });
  });

  it('handles CSRF protection properly', async () => {
    const pact = createAuthPact('csrf-protected-signout');

    pact
      .given('User is authenticated with CSRF protection enabled')
      .uponReceiving('a request to sign out with CSRF token')
      .withRequest({
        method: 'POST',
        path: '/api/auth/signout',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PACT-CLIENT',
          'Cookie': MatchersV3.regex(
            '^sb:token=.+; csrf-token=.+$',
            'sb:token=valid-session-token; csrf-token=valid-csrf-token',
          ),
          'X-CSRF-Token': MatchersV3.regex(
            '^[a-zA-Z0-9\\-_]+$',
            'valid-csrf-token',
          ),
        },
      })
      .willRespondWith({
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Set-Cookie': MatchersV3.regex(
            '^sb:token=; expires=Thu, 01 Jan 1970.*$',
            'sb:token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; Path=/; SameSite=Strict',
          ),
        },
        body: {
          message: MatchersV3.like('Sign out successful'),
          success: true,
        },
      });

    await pact.executeTest(async (mockServer) => {
      const response = await fetch(`${mockServer.url}/api/auth/signout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PACT-CLIENT',
          'Cookie': 'sb:token=valid-session-token; csrf-token=valid-csrf-token',
          'X-CSRF-Token': 'valid-csrf-token',
        },
      });

      expect(response.status).toBe(200);
      const payload = await response.json();
      expect(payload.success).toBe(true);
    });
  });
});
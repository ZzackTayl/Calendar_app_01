/**
 * Provider Test Helper Utilities
 *
 * Shared utilities for provider verification tests,
 * integrating with existing contract infrastructure.
 */

import type { VerifierOptions } from '@pact-foundation/pact';
import { contractStateCoordinator, type ProviderState } from '../../states/supabase';
import { getProviderConfig } from './provider-config';

/**
 * Base options for provider verification
 */
export function createBaseVerifierOptions(): Partial<VerifierOptions> {
  const config = getProviderConfig();

  return {
    provider: 'AuthAPI',
    providerBaseUrl: config.providerBaseUrl,
    logLevel: config.logLevel,
    timeout: config.timeouts.test,
    stateHandlers: createStateHandlers(),
    beforeEach: async () => {
      // Reset state coordinator before each test
      await contractStateCoordinator.resetAll();
    },
    afterEach: async () => {
      // Clean up after each test
      await contractStateCoordinator.resetAll();
    },
  };
}

/**
 * Creates state handlers for provider verification
 */
export function createStateHandlers(): Record<string, () => Promise<void>> {
  const handlers: Record<string, () => Promise<void>> = {};

  // Add handlers for each defined provider state
  const states: ProviderState[] = [
    { name: 'User exists and is confirmed', setup: async () => {} },
    { name: 'User exists but is unconfirmed', setup: async () => {} },
    { name: 'Rate limit threshold reached for IP', setup: async () => {} },
    { name: 'User does not exist', setup: async () => {} },
  ];

  states.forEach(state => {
    handlers[state.name] = async () => {
      await contractStateCoordinator.applyState(state.name);
    };
  });

  return handlers;
}

/**
 * Helper to wait for a condition with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 100 } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Helper to validate response structure
 */
export function validateResponseStructure(
  response: any,
  expectedFields: string[],
  context: string = 'response'
): void {
  for (const field of expectedFields) {
    if (!(field in response)) {
      throw new Error(`Expected field '${field}' missing from ${context}`);
    }
  }
}

/**
 * Helper to validate error response structure
 */
export function validateErrorResponse(
  response: any,
  expectedError?: string,
  context: string = 'error response'
): void {
  validateResponseStructure(response, ['error', 'message'], context);

  if (expectedError && response.error !== expectedError) {
    throw new Error(
      `Expected error '${expectedError}' but got '${response.error}' in ${context}`
    );
  }
}

/**
 * Helper to create test user data
 */
export function createTestUserData(overrides: Partial<any> = {}) {
  return {
    email: 'test-user@example.com',
    password: 'TestPass123!',
    ...overrides,
  };
}

/**
 * Helper to extract Set-Cookie header value
 */
export function extractSetCookieValue(headers: Headers, cookieName: string): string | null {
  const setCookieHeader = headers.get('set-cookie');
  if (!setCookieHeader) return null;

  const cookies = setCookieHeader.split(',').map(cookie => cookie.trim());
  const targetCookie = cookies.find(cookie => cookie.startsWith(`${cookieName}=`));

  if (!targetCookie) return null;

  return targetCookie.split(';')[0].split('=')[1];
}

/**
 * Helper to check if a URL is accessible
 */
export async function checkUrlAccessible(url: string, timeout: number = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Creates a test context with common setup
 */
export interface TestContext {
  config: ReturnType<typeof getProviderConfig>;
  coordinator: typeof contractStateCoordinator;
  helpers: {
    waitFor: typeof waitFor;
    validateResponseStructure: typeof validateResponseStructure;
    validateErrorResponse: typeof validateErrorResponse;
    createTestUserData: typeof createTestUserData;
    extractSetCookieValue: typeof extractSetCookieValue;
  };
}

export function createTestContext(): TestContext {
  return {
    config: getProviderConfig(),
    coordinator: contractStateCoordinator,
    helpers: {
      waitFor,
      validateResponseStructure,
      validateErrorResponse,
      createTestUserData,
      extractSetCookieValue,
    },
  };
}
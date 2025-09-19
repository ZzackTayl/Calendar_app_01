/**
 * Provider Test Configuration
 *
 * Manages configuration for provider verification tests,
 * integrating with existing contract state management.
 */

export interface ProviderTestConfig {
  /** Base URL for the provider service being tested */
  providerBaseUrl: string;
  /** Port for the provider test server */
  providerPort: number;
  /** PACT broker configuration (if using broker) */
  pactBroker?: {
    url: string;
    token?: string;
  };
  /** Timeout configuration for provider tests */
  timeouts: {
    setup: number;
    test: number;
    teardown: number;
  };
  /** Supabase configuration for provider handlers */
  supabase: {
    url: string;
    serviceRoleKey: string;
  };
  /** Log level for provider tests */
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

/**
 * Default configuration for provider tests
 */
export const defaultProviderConfig: ProviderTestConfig = {
  providerBaseUrl: process.env.PROVIDER_BASE_URL || 'http://localhost:3000',
  providerPort: Number(process.env.PROVIDER_TEST_PORT) || 9124,
  timeouts: {
    setup: 30000,    // 30 seconds for setup
    test: 10000,     // 10 seconds per test
    teardown: 15000, // 15 seconds for cleanup
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  logLevel: (process.env.PACT_LOG_LEVEL as any) || 'info',
  pactBroker: process.env.PACT_BROKER_URL ? {
    url: process.env.PACT_BROKER_URL,
    token: process.env.PACT_BROKER_TOKEN,
  } : undefined,
};

/**
 * Validates provider test configuration
 */
export function validateProviderConfig(config: ProviderTestConfig): void {
  const errors: string[] = [];

  if (!config.providerBaseUrl) {
    errors.push('Provider base URL is required');
  }

  if (!config.providerPort || config.providerPort < 1 || config.providerPort > 65535) {
    errors.push('Valid provider port is required (1-65535)');
  }

  if (!config.supabase.url) {
    errors.push('Supabase URL is required (NEXT_PUBLIC_SUPABASE_URL)');
  }

  if (!config.supabase.serviceRoleKey) {
    errors.push('Supabase service role key is required (SUPABASE_SERVICE_ROLE_KEY)');
  }

  if (errors.length > 0) {
    throw new Error(`Provider configuration errors:\n${errors.join('\n')}`);
  }
}

/**
 * Gets configuration for provider tests with validation
 */
export function getProviderConfig(overrides?: Partial<ProviderTestConfig>): ProviderTestConfig {
  const config = {
    ...defaultProviderConfig,
    ...overrides,
  };

  validateProviderConfig(config);
  return config;
}

/**
 * Environment variable requirements for provider tests
 */
export const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

/**
 * Optional environment variables for provider tests
 */
export const OPTIONAL_ENV_VARS = [
  'PROVIDER_BASE_URL',
  'PROVIDER_TEST_PORT',
  'PACT_LOG_LEVEL',
  'PACT_BROKER_URL',
  'PACT_BROKER_TOKEN',
] as const;

/**
 * Checks if all required environment variables are set
 */
export function checkRequiredEnvironment(): { valid: boolean; missing: string[] } {
  const missing = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);

  return {
    valid: missing.length === 0,
    missing,
  };
}
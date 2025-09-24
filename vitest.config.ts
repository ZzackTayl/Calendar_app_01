import { defineConfig } from 'vitest/config';
import path from 'path';
import os from 'os';
import { loadEnv } from 'vite';
import './config/testing/register-test-secrets';

export default defineConfig(({ mode }) => {
  // Load environment variables based on mode
  const env = loadEnv(mode, process.cwd(), '');

  const resolvedEnv: Record<string, string> = {};
  const propagateEnv = (key: string) => {
    const value = process.env[key];
    if (typeof value === 'string' && value.length > 0) {
      resolvedEnv[key] = value;
    }
  };

  [
    'TEST_SUPABASE_URL',
    'TEST_SUPABASE_ANON_KEY',
    'TEST_SUPABASE_SERVICE_KEY',
    'TEST_DB_PASSWORD',
    'TEST_CSRF_SECRET',
    'TEST_ENCRYPTION_KEY',
    'TEST_JWT_SECRET',
    'SUPABASE_DB_PASSWORD',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'NEXTAUTH_SECRET',
    'ENCRYPTION_KEY',
    'CSRF_SECRET',
    'DATABASE_URL',
    'KEY_DERIVATION_SECRET',
  ].forEach(propagateEnv);

  // Determine test type based on environment or file patterns
  const isIntegrationTest = process.env.TEST_TYPE === 'integration' || mode === 'integration';
  const isContractTest = process.env.TEST_TYPE === 'contract' || mode === 'contract';
  const isUnitTest = !isIntegrationTest && !isContractTest;
  const cpuCount = os.cpus()?.length ?? 1;
  const defaultMaxThreads = Math.min(Math.max(cpuCount - 1, 2), cpuCount);
  const integrationMaxThreads = cpuCount >= 4
    ? Math.min(Math.floor(cpuCount / 2), 4)
    : Math.min(cpuCount, 2);

  return {
    test: {
      environment: isContractTest ? 'node' : 'jsdom',
      globals: true,
      environmentOptions: {
        jsdom: {
          url: 'http://localhost:3000',
          resources: 'usable',
          runScripts: 'dangerously',
          pretendToBeVisual: true,
        },
      },

      // Use different setup files based on test type
      setupFiles: isIntegrationTest
        ? ['./tests/setup-integration.ts']
        : isContractTest
          ? ['./tests/setup-contracts.ts']
          : ['./tests/setup-unit.ts'],

      // Include patterns based on test type
      include: isIntegrationTest
        ? [
            './tests/**/integration/**/*.test.{js,ts,tsx}',
            './__tests__/**/integration/**/*.{test,spec}.{js,ts,tsx}',
          ]
        : isContractTest
          ? ['./tests/contracts/**/*.test.{js,ts,tsx}']
          : [
              './tests/**/*.test.{js,ts,tsx}',
              './__tests__/**/*.{test,spec}.{js,ts,tsx}',
            ],

      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.next/**',
        '**/cypress/**',
        '**/tests/e2e/**',
        '**/tests/accessibility/**',
        '**/tests/ux/**',
        '**/*.spec.ts', // Playwright tests
        '**/*.spec.tsx',
        // Exclude heavier suites from unit test runs
        ...(isUnitTest
          ? [
              '**/tests/**/integration/**',
              '**/__tests__/**/integration/**',
              'tests/contracts/**',
              'tests/performance/**',
              '**/__tests__/**/production-readiness*.test.*',
            ]
          : []),
        ...(isContractTest ? [] : []),
      ],

      // Test timeouts based on type - allow more headroom for crypto-heavy unit tests
      testTimeout: isIntegrationTest ? 30000 : isContractTest ? 10000 : 25000,
      hookTimeout: isIntegrationTest ? 15000 : isContractTest ? 5000 : 10000,

      // Pool configuration for better performance
      pool: 'threads',
      poolOptions: {
        threads: {
          singleThread: false,
          maxThreads: isIntegrationTest
            ? integrationMaxThreads
            : isContractTest
              ? Math.min(2, defaultMaxThreads)
              : defaultMaxThreads,
          minThreads: Math.min(
            2,
            isIntegrationTest
              ? integrationMaxThreads
              : isContractTest
                ? Math.min(2, defaultMaxThreads)
                : defaultMaxThreads,
          ),
          useAtomics: true,
        },
      },
      sequence: {
        concurrent: !isIntegrationTest,
        shuffle: false,
      },

      // Coverage configuration
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          '.next/',
          'tests/',
          'coverage/',
          '**/*.d.ts',
          '**/*.config.{js,ts}',
          '**/mocks/**',
          '**/setup*.ts'
        ],
        thresholds: {
          global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
          }
        }
      },

      // Retry configuration
      retry: isIntegrationTest ? 2 : isContractTest ? 1 : 0,

      // Environment variables
      env: {
        NODE_ENV: 'test',
        TEST_TYPE: isIntegrationTest ? 'integration' : isContractTest ? 'contract' : 'unit',
        ...env,
        ...resolvedEnv,
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
        '@/components': path.resolve(__dirname, './components'),
        '@/lib': path.resolve(__dirname, './lib'),
        '@/hooks': path.resolve(__dirname, './hooks'),
        '@/types': path.resolve(__dirname, './types'),
        '@/app': path.resolve(__dirname, './app'),
        '@/tests': path.resolve(__dirname, './tests'),
        '@/config': path.resolve(__dirname, './config'),
      },
    },
  };
});

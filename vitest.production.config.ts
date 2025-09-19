import { defineConfig } from 'vitest/config';
import path from 'path';
import { loadEnv } from 'vite';
import './config/testing/register-test-secrets';

export default defineConfig(({ mode }) => {
  // Load environment variables based on mode
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    test: {
      environment: 'jsdom',
      globals: true,
      
      // Use production readiness setup that allows real crypto
      setupFiles: ['./tests/setup-production-readiness.ts'],
      
      // Include only production readiness tests
      include: [
        './__tests__/key-management/production-readiness.test.ts',
        './__tests__/encryption/core-encryption.test.ts',
        './__tests__/security/**/*.test.ts'
      ],
      
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.next/**',
        '**/cypress/**'
      ],
      
      // Longer timeouts for crypto operations
      testTimeout: 30000,
      hookTimeout: 15000,
      
      // Pool configuration for consistent crypto operations
      pool: 'threads',
      poolOptions: {
        threads: {
          singleThread: true, // Ensure consistent crypto behavior
        },
      },
      
      // Environment variables
      env: (() => {
        const resolved: Record<string, string> = {
          NODE_ENV: 'test',
          TEST_TYPE: 'production_readiness',
          ...env,
        };

        [
          'ENCRYPTION_KEY',
          'KEY_DERIVATION_SECRET',
          'NEXT_PUBLIC_SUPABASE_URL',
          'NEXT_PUBLIC_SUPABASE_ANON_KEY',
          'SUPABASE_URL',
          'SUPABASE_ANON_KEY',
          'SUPABASE_SERVICE_ROLE_KEY',
          'NEXTAUTH_SECRET',
        ].forEach((key) => {
          const value = process.env[key];
          if (typeof value === 'string' && value.length > 0) {
            resolved[key] = value;
          }
        });

        return resolved;
      })(),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
  };
});

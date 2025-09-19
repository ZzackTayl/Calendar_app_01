import { defineConfig } from 'vitest/config';
import path from 'path';
import './config/testing/register-test-secrets';

export default defineConfig({
  test: {
    name: 'encryption-validation',
    root: process.cwd(),
    environment: 'node',
    globals: true,
    // No setup files - we want raw crypto functions, no mocks
    // setupFiles: [], // Explicitly empty
    include: ['__tests__/encryption/core-encryption.test.ts'],
    exclude: ['node_modules/**', '**/*.integration.test.ts'],
    env: (() => {
      const env: Record<string, string> = {
        NODE_ENV: 'test',
      };

      [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'ENCRYPTION_KEY',
        'KEY_DERIVATION_SECRET',
      ].forEach((key) => {
        const value = process.env[key];
        if (typeof value === 'string' && value.length > 0) {
          env[key] = value;
        }
      });

      return env;
    })(),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});

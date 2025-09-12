import { defineConfig } from 'vitest/config';
import path from 'path';

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
    env: {
      NODE_ENV: 'test',
      NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'mock_anon_key',
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_ANON_KEY: 'mock_anon_key',
      SUPABASE_SERVICE_ROLE_KEY: 'mock_service_role_key',
      ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});

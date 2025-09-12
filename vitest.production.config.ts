import { defineConfig } from 'vitest/config';
import path from 'path';
import { loadEnv } from 'vite';

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
      env: {
        NODE_ENV: 'test',
        TEST_TYPE: 'production_readiness',
        ...env,
        
        // Encryption key for tests
        ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        KEY_DERIVATION_SECRET: 'production-test-derivation-secret-for-crypto-validation'
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
  };
});
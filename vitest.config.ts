import { defineConfig } from 'vitest/config';
import path from 'path';
import { loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load environment variables based on mode
  const env = loadEnv(mode, process.cwd(), '');
  
  // Determine test type based on environment or file patterns
  const isIntegrationTest = process.env.TEST_TYPE === 'integration' || mode === 'integration';
  const isUnitTest = process.env.TEST_TYPE === 'unit' || mode === 'unit' || !isIntegrationTest;
  
  return {
    test: {
      environment: 'jsdom',
      globals: true,
      
      // Use different setup files based on test type
      setupFiles: isIntegrationTest 
        ? ['./tests/setup-integration.ts']
        : ['./tests/setup-unit.ts'],
      
      // Include patterns based on test type
      include: isIntegrationTest ? [
        './tests/**/integration/**/*.test.{js,ts,tsx}',
        './__tests__/**/integration/**/*.{test,spec}.{js,ts,tsx}'
      ] : [
        './tests/**/*.test.{js,ts,tsx}',
        './__tests__/**/*.{test,spec}.{js,ts,tsx}'
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
        // Exclude integration tests from unit test runs
        ...(isUnitTest ? [
          '**/tests/**/integration/**',
          '**/__tests__/**/integration/**'
        ] : [])
      ],
      
      // Test timeouts based on type
      testTimeout: isIntegrationTest ? 30000 : 10000, // 30s for integration, 10s for unit
      hookTimeout: isIntegrationTest ? 15000 : 5000,   // 15s for integration, 5s for unit
      
      // Pool configuration for better performance
      pool: 'threads',
      poolOptions: {
        threads: {
          singleThread: isIntegrationTest, // Single thread for integration tests
        },
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
      retry: isIntegrationTest ? 2 : 0, // Retry integration tests due to potential flakiness
      
      // Environment variables
      env: {
        NODE_ENV: 'test',
        TEST_TYPE: isIntegrationTest ? 'integration' : 'unit',
        ...env,
        
        // Test database configuration
        TEST_SUPABASE_URL: process.env.TEST_SUPABASE_URL || 'http://localhost:54321',
        TEST_SUPABASE_ANON_KEY: process.env.TEST_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
        TEST_SUPABASE_SERVICE_KEY: process.env.TEST_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
        
        // App configuration for tests
        NEXT_PUBLIC_SUPABASE_URL: process.env.TEST_SUPABASE_URL || 'http://localhost:54321',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.TEST_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
        SUPABASE_SERVICE_ROLE_KEY: process.env.TEST_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
        
        // Encryption key for tests
        ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
  };
});

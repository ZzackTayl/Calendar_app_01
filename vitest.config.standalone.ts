import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    name: 'standalone',
    environment: 'node', // Use node environment for crypto tests
    globals: true,
    setupFiles: ['./tests/setup-standalone.ts'],
    include: [
      './__tests__/standalone/**/*.test.{js,ts,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**'
    ],
    testTimeout: 30000, // 30 seconds for crypto operations
    hookTimeout: 10000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false, // Allow parallel execution
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});

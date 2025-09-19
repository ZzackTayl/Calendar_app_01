import { beforeAll, afterAll } from 'vitest';
import { initializeTestSecrets } from '@/config/testing/test-secrets';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.PACT_LOG_LEVEL = process.env.PACT_LOG_LEVEL ?? 'info';

initializeTestSecrets();

beforeAll(() => {
  console.log('📄 Contract test setup initialized');
});

afterAll(() => {
  console.log('📄 Contract test suite completed');
});

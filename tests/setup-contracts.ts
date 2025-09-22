import { beforeAll, afterAll } from 'vitest';
import { initializeTestSecrets } from '../config/testing/test-secrets';

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.PACT_LOG_LEVEL = process.env.PACT_LOG_LEVEL ?? 'warn';

initializeTestSecrets();

beforeAll(() => {
  console.log('📄 Contract test setup initialized');
  console.log('📄 Using test environment:', {
    supabaseUrl: process.env.TEST_SUPABASE_URL ? '✅ Configured' : '❌ Missing',
    databaseUrl: process.env.DATABASE_URL ? '✅ Configured' : '❌ Missing',
    encryptionKey: process.env.TEST_ENCRYPTION_KEY ? '✅ Configured' : '❌ Missing'
  });
});

afterAll(() => {
  console.log('📄 Contract test suite completed');
});

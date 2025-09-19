import { initializeTestSecrets } from './test-secrets';

if (process.env.TEST_SECRETS_INITIALIZED !== 'true') {
  initializeTestSecrets();
  process.env.TEST_SECRETS_INITIALIZED = 'true';
}

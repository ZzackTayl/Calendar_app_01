/**
 * Test Helpers for Production Testing
 * Use these utilities to identify and manage test data in production
 */

// Test email patterns to identify test accounts
export const TEST_EMAIL_PATTERNS = [
  /^polyharmonytest(\+\w+)?@gmail\.com$/,
  /^.*test.*@.*$/i,
  /^.*demo.*@.*$/i,
] as const;

// Test user identifiers
export const TEST_USERS = {
  WA_DEV_1: 'polyharmonytest+wa1@gmail.com',
  WA_DEV_2: 'polyharmonytest+wa2@gmail.com', 
  WA_DEV_3: 'polyharmonytest+wa3@gmail.com',
  NY_DEV_1: 'polyharmonytest+ny1@gmail.com',
} as const;

/**
 * Check if a user is a test account
 */
export function isTestUser(email: string): boolean {
  return TEST_EMAIL_PATTERNS.some(pattern => pattern.test(email));
}

/**
 * Get test user display name
 */
export function getTestUserName(email: string): string {
  const userMap: Record<string, string> = {
    [TEST_USERS.WA_DEV_1]: 'WA Developer 1',
    [TEST_USERS.WA_DEV_2]: 'WA Developer 2',
    [TEST_USERS.WA_DEV_3]: 'WA Developer 3',
    [TEST_USERS.NY_DEV_1]: 'NY Developer',
  };
  
  return userMap[email] || 'Test User';
}

/**
 * Test data prefixes for easy identification
 */
export const TEST_DATA_PREFIXES = {
  EVENT: '[TEST]',
  GROUP: '[TEST-GROUP]',
  RELATIONSHIP: '[TEST-REL]',
} as const;

/**
 * Create test event title
 */
export function createTestEventTitle(title: string): string {
  return `${TEST_DATA_PREFIXES.EVENT} ${title}`;
}

/**
 * Create test group name
 */
export function createTestGroupName(name: string): string {
  return `${TEST_DATA_PREFIXES.GROUP} ${name}`;
}

/**
 * Check if data is test data
 */
export function isTestData(title: string): boolean {
  return Object.values(TEST_DATA_PREFIXES).some(prefix => 
    title.startsWith(prefix)
  );
}

/**
 * Test scenarios configuration
 */
export const TEST_SCENARIOS = {
  BASIC_SIGNUP: 'Basic user signup and profile creation',
  EVENT_CRUD: 'Create, read, update, delete events',
  INVITATIONS: 'Send and accept invitations',
  GROUP_MANAGEMENT: 'Create and manage groups',
  PRIVACY_SETTINGS: 'Test privacy controls',
  TIME_ZONES: 'Cross-timezone functionality (WA vs NY)',
  NOTIFICATIONS: 'Email notification system',
  CALENDAR_SHARING: 'Calendar visibility and sharing',
} as const;

export default {
  TEST_USERS,
  isTestUser,
  getTestUserName,
  createTestEventTitle,
  createTestGroupName,
  isTestData,
  TEST_SCENARIOS,
};
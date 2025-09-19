import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { config as loadEnvFromFile } from 'dotenv';

interface SecretSpec {
  name: string;
  bytes: number;
  encoding: 'hex' | 'base64' | 'base64url';
}

interface EnsureOptions {
  persistPath?: string | false;
  log?: boolean;
}

interface EnsureResult {
  generated: Record<string, string>;
  snapshot: Record<string, string>;
  persistedPath?: string;
  loadedFiles: string[];
}

const SECRET_SPECS: SecretSpec[] = [
  { name: 'TEST_DB_PASSWORD', bytes: 24, encoding: 'base64url' },
  { name: 'SUPABASE_DB_PASSWORD', bytes: 24, encoding: 'base64url' },
  { name: 'TEST_SUPABASE_ANON_KEY', bytes: 32, encoding: 'base64url' },
  { name: 'TEST_SUPABASE_SERVICE_KEY', bytes: 48, encoding: 'base64url' },
  { name: 'TEST_JWT_SECRET', bytes: 32, encoding: 'base64url' },
  { name: 'TEST_ENCRYPTION_KEY', bytes: 32, encoding: 'hex' },
  { name: 'TEST_CSRF_SECRET', bytes: 32, encoding: 'base64url' },
  { name: 'KEY_DERIVATION_SECRET', bytes: 32, encoding: 'hex' },
  { name: 'TEST_USER_PASSWORD', bytes: 16, encoding: 'base64url' },
];

const NON_SECRET_DEFAULTS: Record<string, string> = {
  TEST_SUPABASE_URL: 'http://127.0.0.1:54321',
  TEST_DB_HOST: '127.0.0.1',
  TEST_DB_PORT: '5433',
  TEST_DB_NAME: 'polyharmony_test',
  TEST_DB_USER: 'postgres',
  NEXTAUTH_URL: 'http://localhost:3000',
};

const DERIVED_KEYS: Array<{ target: string; source: string; }> = [
  { target: 'NEXTAUTH_SECRET', source: 'TEST_JWT_SECRET' },
  { target: 'ENCRYPTION_KEY', source: 'TEST_ENCRYPTION_KEY' },
  { target: 'CSRF_SECRET', source: 'TEST_CSRF_SECRET' },
  { target: 'SUPABASE_SERVICE_ROLE_KEY', source: 'TEST_SUPABASE_SERVICE_KEY' },
  { target: 'SUPABASE_ANON_KEY', source: 'TEST_SUPABASE_ANON_KEY' },
  { target: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', source: 'TEST_SUPABASE_ANON_KEY' },
  { target: 'SUPABASE_URL', source: 'TEST_SUPABASE_URL' },
  { target: 'NEXT_PUBLIC_SUPABASE_URL', source: 'TEST_SUPABASE_URL' },
];

const DEFAULT_PERSIST_PATH = path.resolve(process.cwd(), 'config/testing/.env.testing.generated');

function generateValue(spec: SecretSpec): string {
  // Special handling for test user passwords to meet complexity requirements
  if (spec.name === 'TEST_USER_PASSWORD') {
    return generateTestPassword();
  }

  const value = randomBytes(spec.bytes);
  switch (spec.encoding) {
    case 'hex':
      return value.toString('hex');
    case 'base64':
      return value.toString('base64');
    case 'base64url':
      return value.toString('base64url');
    default:
      return value.toString('hex');
  }
}

function generateTestPassword(): string {
  // Generate a secure test password that meets complexity requirements
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const special = '!@#$%^&*';

  let password = '';
  // Ensure at least one of each required character type
  password += chars.charAt(Math.floor(Math.random() * 26)); // uppercase
  password += chars.charAt(Math.floor(Math.random() * 26) + 26); // lowercase
  password += chars.charAt(Math.floor(Math.random() * 10) + 52); // number
  password += special.charAt(Math.floor(Math.random() * special.length)); // special

  // Fill remaining length with random characters
  for (let i = 4; i < 12; i++) {
    const allChars = chars + special;
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  // Shuffle the password to randomize character positions
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

function loadEnvFile(filePath: string, override: boolean): boolean {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  loadEnvFromFile({ path: filePath, override });
  return true;
}

export function loadTestEnvFiles(): string[] {
  const cwd = process.cwd();
  const candidateFiles = [
    path.resolve(cwd, 'config/testing/.env.testing'),
    path.resolve(cwd, 'config/testing/.env.testing.generated'),
    path.resolve(cwd, 'config/testing/.env.testing.local'),
  ];

  if (process.env.TEST_ENV_FILE) {
    candidateFiles.push(path.resolve(cwd, process.env.TEST_ENV_FILE));
  }

  const loaded: string[] = [];
  candidateFiles.forEach((filePath) => {
    const override = filePath.endsWith('.env.testing.local') || filePath === path.resolve(cwd, process.env.TEST_ENV_FILE ?? '');
    if (loadEnvFile(filePath, override)) {
      loaded.push(filePath);
    }
  });

  return loaded;
}

export function ensureTestSecrets(options: EnsureOptions = {}): EnsureResult {
  const generated: Record<string, string> = {};
  const snapshot: Record<string, string> = {};

  SECRET_SPECS.forEach((spec) => {
    if (!process.env[spec.name]) {
      const value = generateValue(spec);
      process.env[spec.name] = value;
      generated[spec.name] = value;
      if (options.log) {
        console.log(`Generated ${spec.name}`);
      }
    }
    snapshot[spec.name] = process.env[spec.name] as string;
  });

  Object.entries(NON_SECRET_DEFAULTS).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
    }
    snapshot[key] = process.env[key] as string;
  });

  DERIVED_KEYS.forEach(({ target, source }) => {
    if (!process.env[target] && process.env[source]) {
      process.env[target] = process.env[source];
      snapshot[target] = process.env[target] as string;
    } else if (process.env[target]) {
      snapshot[target] = process.env[target] as string;
    }
  });

  if (!process.env.DATABASE_URL && process.env.TEST_DB_PASSWORD) {
    const host = process.env.TEST_DB_HOST ?? NON_SECRET_DEFAULTS.TEST_DB_HOST;
    const port = process.env.TEST_DB_PORT ?? NON_SECRET_DEFAULTS.TEST_DB_PORT;
    const name = process.env.TEST_DB_NAME ?? NON_SECRET_DEFAULTS.TEST_DB_NAME;
    const user = process.env.TEST_DB_USER ?? NON_SECRET_DEFAULTS.TEST_DB_USER;
    process.env.DATABASE_URL = `postgresql://${user}:${process.env.TEST_DB_PASSWORD}@${host}:${port}/${name}`;
  }
  if (process.env.DATABASE_URL) {
    snapshot.DATABASE_URL = process.env.DATABASE_URL;
  }

  const persistPath = options.persistPath === false ? undefined : options.persistPath ?? DEFAULT_PERSIST_PATH;
  let persistedPath: string | undefined;

  if (persistPath) {
    const dir = path.dirname(persistPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const persistKeys = new Set<string>([
      ...SECRET_SPECS.map((spec) => spec.name),
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'TEST_SUPABASE_URL',
      'TEST_DB_HOST',
      'TEST_DB_PORT',
      'TEST_DB_NAME',
      'TEST_DB_USER',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
      'ENCRYPTION_KEY',
      'CSRF_SECRET',
      'DATABASE_URL',
    ]);

    const lines: string[] = [];
    persistKeys.forEach((key) => {
      const value = process.env[key];
      if (value === undefined) {
        return;
      }
      snapshot[key] = value;
      const escaped = value.replace(/\n/g, '\\n');
      lines.push(`${key}=${escaped}`);
    });

    fs.writeFileSync(persistPath, `${lines.join('\n')}\n`, { encoding: 'utf8', mode: 0o600 });
    persistedPath = persistPath;
  }

  return {
    generated,
    snapshot,
    persistedPath,
    loadedFiles: loadTestEnvFiles(),
  };
}

export function initializeTestSecrets(): EnsureResult {
  const loadedFiles = loadTestEnvFiles();
  const result = ensureTestSecrets({ persistPath: false });
  result.loadedFiles = Array.from(new Set([...loadedFiles, ...result.loadedFiles]));
  return result;
}

export function ensureTestSecretsAndPersist(persistPath?: string, log?: boolean): EnsureResult {
  loadTestEnvFiles();
  return ensureTestSecrets({ persistPath, log });
}

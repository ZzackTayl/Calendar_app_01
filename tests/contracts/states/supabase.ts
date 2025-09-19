import { randomUUID } from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { databaseSeeder, type DatabaseSeedState } from './database-seeder';

export interface ProviderState {
  name: string;
  setup: () => Promise<void> | void;
  teardown?: () => Promise<void> | void;
}

type AuthState = 'confirmed' | 'unconfirmed' | 'absent';
type RateLimitState = 'open' | 'limited';

interface SeededUser {
  id: string;
  email: string;
  password: string;
  emailConfirmedAt: string | null;
}

class ContractStateCoordinator {
  private adminClient: SupabaseClient | null = null;
  private readonly seededUsers = new Map<string, SeededUser>();
  private readonly createdUserIds = new Set<string>();
  private pendingCookies: string[] = [];
  private authState: AuthState = 'absent';
  private rateLimitState: RateLimitState = 'open';
  private authFailures = new Map<string, number>();

  // State replay and verification support
  private currentStateSnapshot: DatabaseSeedState | null = null;
  private providerVerificationMode = false;
  private stateReplayLog: Array<{ stateName: string; timestamp: string; snapshot: DatabaseSeedState }> = [];

  readonly testEmail = 'confirmed-user@example.com';
  readonly testPassword = 'DemoPass123!';
  readonly fallbackUnconfirmedEmail = 'pending-user@example.com';
  readonly testIpAddress = '203.0.113.25';

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      try {
        this.adminClient = createClient(supabaseUrl, serviceRoleKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
      } catch (error) {
        console.warn('[ContractStateCoordinator] Failed to initialize Supabase client:', error);
        this.adminClient = null;
      }
    }
  }

  async applyState(stateName: string): Promise<void> {
    console.log(`[ContractStateCoordinator] Applying state: ${stateName}`);

    // Clear previous state
    await this.resetAll();

    try {
      switch (stateName) {
        // Legacy auth states (for backward compatibility)
        case 'User exists and is confirmed':
          await this.ensureConfirmedUser(this.testEmail, this.testPassword);
          this.rateLimitState = 'open';
          break;
        case 'User exists but is unconfirmed':
          await this.ensureUnconfirmedUser(this.fallbackUnconfirmedEmail, this.testPassword);
          this.rateLimitState = 'open';
          break;
        case 'Rate limit threshold reached for IP':
          await this.ensureConfirmedUser(this.testEmail, this.testPassword);
          this.rateLimitState = 'limited';
          break;
        case 'User does not exist':
          await this.removeUser(this.testEmail);
          this.rateLimitState = 'open';
          break;

        // Enhanced database seeding states
        case 'User with relationships and events exists':
          await databaseSeeder.seedUserScenario('confirmed-user-with-relationships');
          this.rateLimitState = 'open';
          this.authState = 'confirmed';
          break;
        case 'User with events and contacts exists':
          await databaseSeeder.seedUserScenario('user-with-events-and-contacts');
          this.rateLimitState = 'open';
          this.authState = 'confirmed';
          break;
        case 'Multiple users with shared events exist':
          await databaseSeeder.seedUserScenario('multi-user-scenario');
          this.rateLimitState = 'open';
          this.authState = 'confirmed';
          break;
        case 'Unconfirmed user exists':
          await databaseSeeder.seedUserScenario('unconfirmed-user');
          this.rateLimitState = 'open';
          this.authState = 'unconfirmed';
          break;
        case 'Empty database':
          await databaseSeeder.seedUserScenario('empty-database');
          this.rateLimitState = 'open';
          this.authState = 'absent';
          break;
        case 'Signup rate limit threshold reached for IP':
          await databaseSeeder.seedUserScenario('confirmed-user-with-relationships');
          this.rateLimitState = 'limited';
          this.authState = 'confirmed';
          break;

        default:
          console.warn(`[ContractStateCoordinator] Unknown provider state: ${stateName}`);
          return;
      }

      // Capture state snapshot for provider verification replay
      this.currentStateSnapshot = databaseSeeder.getStateSnapshot();
      this.logStateReplay(stateName);

      console.log(`[ContractStateCoordinator] Successfully applied state: ${stateName}`);
    } catch (error) {
      console.error(`[ContractStateCoordinator] Failed to apply state ${stateName}:`, error);
      throw error;
    }
  }

  async resetAll(): Promise<void> {
    this.rateLimitState = 'open';
    this.authState = 'absent';
    this.pendingCookies = [];
    this.authFailures.clear();

    // Clear database seeder state
    await databaseSeeder.clearAllData();

    if (this.adminClient) {
      const admin = this.adminClient;
      await Promise.allSettled(
        Array.from(this.createdUserIds).map((id) => admin.auth.admin.deleteUser(id)),
      );
    }

    this.seededUsers.clear();
    this.createdUserIds.clear();
    this.currentStateSnapshot = null;

    console.log('[ContractStateCoordinator] State reset completed');
  }

  consumePendingCookie(): string | null {
    return this.pendingCookies.shift() ?? null;
  }

  clearAuthFailure(): void {
    this.authFailures.delete(this.testIpAddress);
  }

  getAuthFailureState(): { shouldDelay: boolean; delaySeconds: number; attempts: number } {
    const attempts = this.authFailures.get(this.testIpAddress) ?? 0;
    return {
      shouldDelay: false,
      delaySeconds: 0,
      attempts,
    };
  }

  getRateLimitResult(): {
    isLimited: boolean;
    remaining: number;
    retryAfter: number;
    resetTime: number;
    blocked: boolean;
  } {
    if (this.rateLimitState === 'limited') {
      return {
        isLimited: true,
        remaining: 0,
        retryAfter: 60,
        resetTime: Math.floor(Date.now() / 1000) + 60,
        blocked: true,
      };
    }

    return {
      isLimited: false,
      remaining: 5,
      retryAfter: 0,
      resetTime: Math.floor(Date.now() / 1000) + 60,
      blocked: false,
    };
  }

  createSupabaseMock() {
    return {
      auth: {
        signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
          const normalizedEmail = email.trim().toLowerCase();

          // Try seeded users from database seeder first
          const seededUser = databaseSeeder.getSeededUser(normalizedEmail);
          if (seededUser && seededUser.password === password) {
            // Simulate Supabase setting secure cookies on success
            this.pendingCookies.push(
              'sb:token=sample; HttpOnly; Path=/; SameSite=Strict'
            );

            const user = {
              id: seededUser.id,
              email: seededUser.email,
              email_confirmed_at: seededUser.email_confirmed_at,
              last_sign_in_at: new Date().toISOString(),
            };

            return {
              data: { user },
              error: null,
            };
          }

          // Fallback to legacy seeded users
          const record = this.seededUsers.get(normalizedEmail);
          if (!record || record.password !== password) {
            const attempts = this.authFailures.get(this.testIpAddress) ?? 0;
            this.authFailures.set(this.testIpAddress, attempts + 1);
            return {
              data: { user: null },
              error: { message: 'Invalid login credentials' },
            };
          }

          // Simulate Supabase setting secure cookies on success
          this.pendingCookies.push(
            'sb:token=sample; HttpOnly; Path=/; SameSite=Strict'
          );

          const user = {
            id: record.id,
            email: record.email,
            email_confirmed_at: record.emailConfirmedAt,
            last_sign_in_at: new Date().toISOString(),
          };

          return {
            data: { user },
            error: null,
          };
        },
        signOut: async () => ({ error: null }),
      },
    };
  }

  /**
   * Provider verification and state replay methods
   */
  enableProviderVerificationMode(): void {
    this.providerVerificationMode = true;
    console.log('[ContractStateCoordinator] Provider verification mode enabled');
  }

  disableProviderVerificationMode(): void {
    this.providerVerificationMode = false;
    console.log('[ContractStateCoordinator] Provider verification mode disabled');
  }

  private logStateReplay(stateName: string): void {
    if (this.currentStateSnapshot) {
      const entry = {
        stateName,
        timestamp: new Date().toISOString(),
        snapshot: this.currentStateSnapshot,
      };
      this.stateReplayLog.push(entry);

      // Keep only the last 10 state transitions for memory management
      if (this.stateReplayLog.length > 10) {
        this.stateReplayLog.shift();
      }

      console.log(`[ContractStateCoordinator] State replay logged: ${stateName}`);
    }
  }

  getStateReplayLog(): Array<{ stateName: string; timestamp: string; snapshot: DatabaseSeedState }> {
    return [...this.stateReplayLog];
  }

  getCurrentStateSnapshot(): DatabaseSeedState | null {
    return this.currentStateSnapshot;
  }

  /**
   * Replay a specific state for provider verification
   */
  async replayState(stateName: string): Promise<void> {
    console.log(`[ContractStateCoordinator] Replaying state for provider verification: ${stateName}`);

    if (!this.providerVerificationMode) {
      console.warn('[ContractStateCoordinator] State replay requested but provider verification mode is not enabled');
    }

    await this.applyState(stateName);
  }

  /**
   * Verify that the current database state matches expected state
   */
  async verifyStateIntegrity(expectedStateName: string): Promise<{ isValid: boolean; discrepancies: string[] }> {
    const discrepancies: string[] = [];

    if (!this.currentStateSnapshot) {
      discrepancies.push('No current state snapshot available');
      return { isValid: false, discrepancies };
    }

    try {
      // Verify auth state consistency
      const seededUsers = databaseSeeder.getSeededUsers();
      const currentSnapshot = databaseSeeder.getStateSnapshot();

      // Check user count consistency
      if (this.currentStateSnapshot.users.size !== currentSnapshot.users.size) {
        discrepancies.push(
          `User count mismatch: expected ${this.currentStateSnapshot.users.size}, got ${currentSnapshot.users.size}`
        );
      }

      // Check specific state requirements
      switch (expectedStateName) {
        case 'User with relationships and events exists':
          if (currentSnapshot.relationships.size === 0) {
            discrepancies.push('Expected relationships but none found');
          }
          if (currentSnapshot.events.size === 0) {
            discrepancies.push('Expected events but none found');
          }
          break;

        case 'Empty database':
          if (currentSnapshot.users.size > 0) {
            discrepancies.push(`Expected empty database but found ${currentSnapshot.users.size} users`);
          }
          break;

        case 'Multiple users with shared events exist':
          if (currentSnapshot.users.size < 2) {
            discrepancies.push(`Expected multiple users but found only ${currentSnapshot.users.size}`);
          }
          break;
      }

      const isValid = discrepancies.length === 0;
      console.log(`[ContractStateCoordinator] State integrity verification: ${isValid ? 'PASS' : 'FAIL'}`);

      if (discrepancies.length > 0) {
        console.warn('[ContractStateCoordinator] State discrepancies:', discrepancies);
      }

      return { isValid, discrepancies };
    } catch (error) {
      console.error('[ContractStateCoordinator] State integrity verification failed:', error);
      discrepancies.push(`Verification failed: ${error}`);
      return { isValid: false, discrepancies };
    }
  }

  /**
   * Get summary of current seeded data for debugging
   */
  getDebugSummary(): object {
    const snapshot = this.currentStateSnapshot || databaseSeeder.getStateSnapshot();
    return {
      authState: this.authState,
      rateLimitState: this.rateLimitState,
      providerVerificationMode: this.providerVerificationMode,
      userCount: snapshot.users.size,
      relationshipCount: snapshot.relationships.size,
      eventCount: snapshot.events.size,
      contactCount: snapshot.contacts.size,
      stateReplayLogLength: this.stateReplayLog.length,
      lastReplayedState: this.stateReplayLog[this.stateReplayLog.length - 1]?.stateName || 'none',
    };
  }

  private async ensureConfirmedUser(email: string, password: string): Promise<void> {
    const normalized = email.toLowerCase();
    this.authState = 'confirmed';

    if (this.seededUsers.has(normalized)) {
      const existing = this.seededUsers.get(normalized)!;
      this.seededUsers.set(normalized, {
        ...existing,
        password,
        emailConfirmedAt: existing.emailConfirmedAt ?? new Date().toISOString(),
      });
      return;
    }

    if (this.adminClient) {
      try {
        const { data } = await this.adminClient.auth.admin.getUserByEmail(normalized);
        if (data?.user) {
          await this.adminClient.auth.admin.updateUserById(data.user.id, {
            password,
            email_confirm: true,
          });
          this.seededUsers.set(normalized, {
            id: data.user.id,
            email: normalized,
            password,
            emailConfirmedAt: data.user.email_confirmed_at ?? new Date().toISOString(),
          });
          this.createdUserIds.add(data.user.id);
          return;
        }
      } catch (error) {
        console.warn('[ContractStateCoordinator] Failed to fetch existing user (confirmed):', error);
      }

      try {
        const { data, error } = await this.adminClient.auth.admin.createUser({
          email: normalized,
          password,
          email_confirm: true,
        });

        if (error) {
          throw error;
        }

        if (data?.user) {
          this.seededUsers.set(normalized, {
            id: data.user.id,
            email: normalized,
            password,
            emailConfirmedAt: data.user.email_confirmed_at ?? new Date().toISOString(),
          });
          this.createdUserIds.add(data.user.id);
          return;
        }
      } catch (error) {
        console.warn('[ContractStateCoordinator] Failed to create confirmed user:', error);
      }
    }

    // Fallback to in-memory record
    this.seededUsers.set(normalized, {
      id: randomUUID(),
      email: normalized,
      password,
      emailConfirmedAt: new Date().toISOString(),
    });
  }

  private async ensureUnconfirmedUser(email: string, password: string): Promise<void> {
    const normalized = email.toLowerCase();
    this.authState = 'unconfirmed';

    if (this.seededUsers.has(normalized)) {
      const existing = this.seededUsers.get(normalized)!;
      this.seededUsers.set(normalized, {
        ...existing,
        password,
        emailConfirmedAt: null,
      });
      return;
    }

    if (this.adminClient) {
      try {
        const { data } = await this.adminClient.auth.admin.getUserByEmail(normalized);
        if (data?.user) {
          await this.adminClient.auth.admin.updateUserById(data.user.id, {
            password,
            email_confirm: false,
          });
          this.seededUsers.set(normalized, {
            id: data.user.id,
            email: normalized,
            password,
            emailConfirmedAt: null,
          });
          this.createdUserIds.add(data.user.id);
          return;
        }
      } catch (error) {
        console.warn('[ContractStateCoordinator] Failed to fetch existing user (unconfirmed):', error);
      }

      try {
        const { data, error } = await this.adminClient.auth.admin.createUser({
          email: normalized,
          password,
          email_confirm: false,
        });

        if (error) {
          throw error;
        }

        if (data?.user) {
          this.seededUsers.set(normalized, {
            id: data.user.id,
            email: normalized,
            password,
            emailConfirmedAt: null,
          });
          this.createdUserIds.add(data.user.id);
          return;
        }
      } catch (error) {
        console.warn('[ContractStateCoordinator] Failed to create unconfirmed user:', error);
      }
    }

    // Fallback to in-memory record
    this.seededUsers.set(normalized, {
      id: randomUUID(),
      email: normalized,
      password,
      emailConfirmedAt: null,
    });
  }

  private async removeUser(email: string): Promise<void> {
    const normalized = email.toLowerCase();

    if (this.adminClient) {
      try {
        const { data } = await this.adminClient.auth.admin.getUserByEmail(normalized);
        if (data?.user) {
          await this.adminClient.auth.admin.deleteUser(data.user.id);
        }
      } catch (error) {
        console.warn('[ContractStateCoordinator] Failed to delete Supabase user:', error);
      }
    }

    this.seededUsers.delete(normalized);
  }
}

export const contractStateCoordinator = new ContractStateCoordinator();

export const authProviderStates: ProviderState[] = [
  // Legacy auth states (for backward compatibility)
  {
    name: 'User exists and is confirmed',
    setup: async () => {
      await contractStateCoordinator.applyState('User exists and is confirmed');
    },
    teardown: async () => {
      await contractStateCoordinator.resetAll();
    },
  },
  {
    name: 'User exists but is unconfirmed',
    setup: async () => {
      await contractStateCoordinator.applyState('User exists but is unconfirmed');
    },
    teardown: async () => {
      await contractStateCoordinator.resetAll();
    },
  },
  {
    name: 'Rate limit threshold reached for IP',
    setup: async () => {
      await contractStateCoordinator.applyState('Rate limit threshold reached for IP');
    },
    teardown: async () => {
      await contractStateCoordinator.resetAll();
    },
  },
  {
    name: 'User does not exist',
    setup: async () => {
      await contractStateCoordinator.applyState('User does not exist');
    },
    teardown: async () => {
      await contractStateCoordinator.resetAll();
    },
  },

  // Enhanced database seeding states
  {
    name: 'User with relationships and events exists',
    setup: async () => {
      await contractStateCoordinator.applyState('User with relationships and events exists');
    },
    teardown: async () => {
      await contractStateCoordinator.resetAll();
    },
  },
  {
    name: 'User with events and contacts exists',
    setup: async () => {
      await contractStateCoordinator.applyState('User with events and contacts exists');
    },
    teardown: async () => {
      await contractStateCoordinator.resetAll();
    },
  },
  {
    name: 'Multiple users with shared events exist',
    setup: async () => {
      await contractStateCoordinator.applyState('Multiple users with shared events exist');
    },
    teardown: async () => {
      await contractStateCoordinator.resetAll();
    },
  },
  {
    name: 'Unconfirmed user exists',
    setup: async () => {
      await contractStateCoordinator.applyState('Unconfirmed user exists');
    },
    teardown: async () => {
      await contractStateCoordinator.resetAll();
    },
  },
  {
    name: 'Empty database',
    setup: async () => {
      await contractStateCoordinator.applyState('Empty database');
    },
    teardown: async () => {
      await contractStateCoordinator.resetAll();
    },
  },
  {
    name: 'Signup rate limit threshold reached for IP',
    setup: async () => {
      await contractStateCoordinator.applyState('Signup rate limit threshold reached for IP');
    },
    teardown: async () => {
      await contractStateCoordinator.resetAll();
    },
  },

  // Provider verification states (for testing state replay)
  {
    name: 'User already exists',
    setup: async () => {
      await contractStateCoordinator.applyState('User with relationships and events exists');
    },
    teardown: async () => {
      await contractStateCoordinator.resetAll();
    },
  },
];

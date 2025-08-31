/**
 * Database Cleanup and Reset Utilities
 * 
 * Provides safe and efficient methods to clean up test databases
 * and reset them to a known state for testing.
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '../../lib/supabase/types';

// Test database configuration
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'http://localhost:54321';
const TEST_SUPABASE_SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY || 'test_service_key';

export class DatabaseCleaner {
  private client: ReturnType<typeof createClient<Database>>;

  constructor() {
    this.client = createClient<Database>(
      TEST_SUPABASE_URL,
      TEST_SUPABASE_SERVICE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  /**
   * Truncate all tables in the correct order to handle foreign key constraints
   */
  async truncateAllTables(): Promise<void> {
    console.log('🧹 Starting database cleanup...');

    // Order matters due to foreign key constraints
    // Clean dependent tables first, then parent tables
    const tables = [
      // Most dependent tables first
      'permission_audit_logs',
      'event_attachments',
      'custom_holidays',
      'reminders',
      'event_visibility',
      'event_permissions',
      'contact_tag_relationships',
      'contact_group_members',
      'relationship_group_members',
      'invitation_tokens',
      
      // Medium dependency tables
      'calendar_shares',
      'calendar_integrations',
      'invitations',
      'contact_groups',
      'contact_tags',
      'events',
      'contacts',
      'relationships',
      'relationship_groups',
      'user_preferences',
      'user_profiles',
      
      // Base tables last
      'users'
    ];

    for (const table of tables) {
      try {
        const { error } = await this.client
          .from(table as any)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

        if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
          console.warn(`⚠️  Warning cleaning table ${table}:`, error.message);
        } else if (!error) {
          console.log(`✅ Cleaned table: ${table}`);
        }
      } catch (error) {
        console.warn(`⚠️  Warning cleaning table ${table}:`, error);
      }
    }

    console.log('🎯 Database cleanup completed');
  }

  /**
   * Reset sequences to ensure consistent IDs for testing
   */
  async resetSequences(): Promise<void> {
    console.log('🔄 Resetting database sequences...');

    const sequences = [
      'users_id_seq',
      'events_id_seq',
      'contacts_id_seq',
      'relationships_id_seq',
      'relationship_groups_id_seq',
      'invitations_id_seq',
      'calendar_integrations_id_seq'
    ];

    for (const sequence of sequences) {
      try {
        // Use raw SQL to reset sequences since Supabase client doesn't support this directly
        const { error } = await (this.client as any).rpc('execute_sql', {
          sql: `ALTER SEQUENCE IF EXISTS ${sequence} RESTART WITH 1;`
        });

        if (error) {
          console.warn(`⚠️  Warning resetting sequence ${sequence}:`, error.message);
        } else {
          console.log(`✅ Reset sequence: ${sequence}`);
        }
      } catch (error) {
        console.warn(`⚠️  Warning resetting sequence ${sequence}:`, error);
      }
    }

    console.log('🎯 Sequence reset completed');
  }

  /**
   * Clean specific tables by name
   */
  async cleanTables(tableNames: string[]): Promise<void> {
    console.log(`🧹 Cleaning specific tables: ${tableNames.join(', ')}`);

    for (const table of tableNames) {
      try {
        const { error } = await this.client
          .from(table as any)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

        if (error) {
          console.warn(`⚠️  Warning cleaning table ${table}:`, error.message);
        } else {
          console.log(`✅ Cleaned table: ${table}`);
        }
      } catch (error) {
        console.warn(`⚠️  Warning cleaning table ${table}:`, error);
      }
    }
  }

  /**
   * Clean records created by specific user
   */
  async cleanUserData(userId: string): Promise<void> {
    console.log(`🧹 Cleaning data for user: ${userId}`);

    const userTables = [
      'events',
      'contacts',
      'relationships',
      'relationship_groups',
      'user_preferences',
      'calendar_integrations',
      'custom_holidays',
      'contact_groups',
      'contact_tags'
    ];

    for (const table of userTables) {
      try {
        const { error } = await this.client
          .from(table as any)
          .delete()
          .eq('user_id', userId);

        if (error) {
          console.warn(`⚠️  Warning cleaning user data from ${table}:`, error.message);
        } else {
          console.log(`✅ Cleaned user data from: ${table}`);
        }
      } catch (error) {
        console.warn(`⚠️  Warning cleaning user data from ${table}:`, error);
      }
    }

    // Clean user profile and user record
    try {
      await this.client.from('user_profiles').delete().eq('id', userId);
      await this.client.from('users').delete().eq('id', userId);
      console.log(`✅ Cleaned user profile and record for: ${userId}`);
    } catch (error) {
      console.warn(`⚠️  Warning cleaning user record:`, error);
    }
  }

  /**
   * Verify database is clean and ready for testing
   */
  async verifyCleanState(): Promise<boolean> {
    console.log('🔍 Verifying database clean state...');

    const tables = ['users', 'events', 'contacts', 'relationships'];
    let isClean = true;

    for (const table of tables) {
      try {
        const { count, error } = await this.client
          .from(table as any)
          .select('id', { count: 'exact', head: true });

        if (error) {
          console.warn(`⚠️  Warning checking ${table}:`, error.message);
          isClean = false;
        } else if (count && count > 0) {
          console.warn(`⚠️  Table ${table} still has ${count} records`);
          isClean = false;
        } else {
          console.log(`✅ Table ${table} is clean`);
        }
      } catch (error) {
        console.warn(`⚠️  Warning checking table ${table}:`, error);
        isClean = false;
      }
    }

    if (isClean) {
      console.log('🎯 Database is in clean state');
    } else {
      console.log('❌ Database is not completely clean');
    }

    return isClean;
  }

  /**
   * Full database reset - truncate all tables and reset sequences
   */
  async fullReset(): Promise<void> {
    console.log('🔄 Starting full database reset...');

    await this.truncateAllTables();
    await this.resetSequences();
    
    const isClean = await this.verifyCleanState();
    
    if (isClean) {
      console.log('🎉 Full database reset completed successfully!');
    } else {
      console.log('⚠️  Database reset completed with warnings');
    }
  }

  /**
   * Backup database state before running destructive operations
   */
  async createBackup(backupName: string): Promise<void> {
    console.log(`💾 Creating backup: ${backupName}`);
    
    // Note: This would typically use pg_dump in a real scenario
    // For testing purposes, we'll just log the operation
    console.log(`📦 Backup ${backupName} created (placeholder implementation)`);
  }

  /**
   * Get database statistics for monitoring
   */
  async getDatabaseStats(): Promise<Record<string, number>> {
    console.log('📊 Gathering database statistics...');

    const tables = [
      'users', 'events', 'contacts', 'relationships', 
      'relationship_groups', 'invitations', 'calendar_integrations'
    ];

    const stats: Record<string, number> = {};

    for (const table of tables) {
      try {
        const { count, error } = await this.client
          .from(table as any)
          .select('id', { count: 'exact', head: true });

        if (error) {
          console.warn(`⚠️  Warning getting count for ${table}:`, error.message);
          stats[table] = -1; // Indicate error
        } else {
          stats[table] = count || 0;
        }
      } catch (error) {
        console.warn(`⚠️  Warning getting count for ${table}:`, error);
        stats[table] = -1; // Indicate error
      }
    }

    console.log('Database statistics:', stats);
    return stats;
  }
}

// Export utility functions for easy use in tests
export async function cleanTestDatabase(): Promise<void> {
  const cleaner = new DatabaseCleaner();
  await cleaner.fullReset();
}

export async function cleanUserTestData(userId: string): Promise<void> {
  const cleaner = new DatabaseCleaner();
  await cleaner.cleanUserData(userId);
}

export async function verifyDatabaseClean(): Promise<boolean> {
  const cleaner = new DatabaseCleaner();
  return await cleaner.verifyCleanState();
}
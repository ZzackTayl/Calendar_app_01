/**
 * Migration Testing Framework
 * 
 * Validates database migrations, rollbacks, and schema changes
 * to ensure data integrity and consistency across migration operations.
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '../../lib/supabase/types';
import fs from 'fs';
import path from 'path';

// Test database configuration
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'http://localhost:54321';
const TEST_SUPABASE_SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY || 'test_service_key';

export interface MigrationTestResult {
  migrationFile: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  executionTime: number;
  rollbackTested?: boolean;
  dataIntegrityChecks?: Record<string, boolean>;
}

export interface MigrationSuite {
  suiteName: string;
  migrations: MigrationTestResult[];
  totalPassed: number;
  totalFailed: number;
  executionTime: number;
}

export class MigrationTester {
  private client: ReturnType<typeof createClient<Database>>;
  private migrationsPath: string;

  constructor(migrationsPath?: string) {
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
    
    this.migrationsPath = migrationsPath || path.join(process.cwd(), 'supabase', 'migrations');
  }

  /**
   * Get all migration files in chronological order
   */
  getMigrationFiles(): string[] {
    try {
      const files = fs.readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Chronological order based on filename timestamps

      return files;
    } catch (error) {
      console.error('Failed to read migrations directory:', error);
      return [];
    }
  }

  /**
   * Apply a single migration and test its execution
   */
  async testMigration(migrationFile: string): Promise<MigrationTestResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log(`🔄 Testing migration: ${migrationFile}`);

    try {
      // Read migration file
      const migrationPath = path.join(this.migrationsPath, migrationFile);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      // Execute migration
      const { error } = await (this.client as any).rpc('execute_migration', {
        migration_sql: migrationSQL
      });

      if (error) {
        errors.push(`Migration execution failed: ${error.message}`);
      }

      // Test basic connectivity after migration
      const { error: connectError } = await this.client
        .from('users')
        .select('id')
        .limit(1);

      if (connectError) {
        errors.push(`Database connectivity test failed after migration: ${connectError.message}`);
      }

      // Validate schema integrity after migration
      const schemaValidation = await this.validateSchemaAfterMigration();
      if (!schemaValidation.passed) {
        errors.push(...schemaValidation.errors);
        warnings.push(...schemaValidation.warnings);
      }

    } catch (error) {
      errors.push(`Exception during migration test: ${error}`);
    }

    const executionTime = Date.now() - startTime;

    return {
      migrationFile,
      passed: errors.length === 0,
      errors,
      warnings,
      executionTime
    };
  }

  /**
   * Test migration rollback (if rollback script exists)
   */
  async testMigrationRollback(migrationFile: string): Promise<boolean> {
    console.log(`🔄 Testing rollback for: ${migrationFile}`);

    try {
      // Look for rollback file
      const rollbackFile = migrationFile.replace('.sql', '_rollback.sql');
      const rollbackPath = path.join(this.migrationsPath, rollbackFile);

      if (!fs.existsSync(rollbackPath)) {
        console.log(`⚠️  No rollback file found for ${migrationFile}`);
        return false;
      }

      // Execute rollback
      const rollbackSQL = fs.readFileSync(rollbackPath, 'utf8');
      const { error } = await (this.client as any).rpc('execute_migration', {
        migration_sql: rollbackSQL
      });

      if (error) {
        console.error(`❌ Rollback failed: ${error.message}`);
        return false;
      }

      console.log(`✅ Rollback successful for ${migrationFile}`);
      return true;

    } catch (error) {
      console.error(`❌ Exception during rollback test: ${error}`);
      return false;
    }
  }

  /**
   * Test data integrity during migrations
   */
  async testDataIntegrity(): Promise<Record<string, boolean>> {
    const checks: Record<string, boolean> = {};

    try {
      // Test 1: Check for orphaned records
      const orphanedEvents = await this.checkOrphanedRecords('events', 'user_id', 'users', 'id');
      checks['no_orphaned_events'] = orphanedEvents === 0;

      const orphanedRelationships = await this.checkOrphanedRecords('relationships', 'user_id', 'users', 'id');
      checks['no_orphaned_relationships'] = orphanedRelationships === 0;

      // Test 2: Check enum constraints
      const invalidPrivacyLevels = await this.checkEnumConstraints('events', 'privacy_level', ['private', 'visible', 'semi_private', 'public']);
      checks['valid_privacy_levels'] = invalidPrivacyLevels === 0;

      // Test 3: Check date consistency
      const invalidEventDates = await this.checkDateConsistency('events', 'start_time', 'end_time');
      checks['valid_event_dates'] = invalidEventDates === 0;

      // Test 4: Check unique constraints
      const duplicateEmails = await this.checkUniqueConstraints('users', 'email');
      checks['unique_emails'] = duplicateEmails === 0;

      // Test 5: Check NOT NULL constraints
      const nullUserEmails = await this.checkNotNullConstraints('users', 'email');
      checks['no_null_emails'] = nullUserEmails === 0;

    } catch (error) {
      console.error('Data integrity check failed:', error);
      checks['integrity_check_error'] = false;
    }

    return checks;
  }

  /**
   * Helper: Check for orphaned records
   */
  private async checkOrphanedRecords(
    childTable: string,
    childColumn: string,
    parentTable: string,
    parentColumn: string
  ): Promise<number> {
    const { count, error } = await (this.client as any)
      .rpc('count_orphaned_records', {
        child_table: childTable,
        child_column: childColumn,
        parent_table: parentTable,
        parent_column: parentColumn
      });

    if (error) {
      console.warn(`Warning checking orphaned records: ${error.message}`);
      return -1; // Indicate check failed
    }

    return count || 0;
  }

  /**
   * Helper: Check enum constraints
   */
  private async checkEnumConstraints(
    tableName: string,
    columnName: string,
    validValues: string[]
  ): Promise<number> {
    const { count, error } = await this.client
      .from(tableName as any)
      .select('id', { count: 'exact', head: true })
      .not(columnName, 'in', `(${validValues.map(v => `'${v}'`).join(',')})`);

    if (error) {
      console.warn(`Warning checking enum constraints: ${error.message}`);
      return -1;
    }

    return count || 0;
  }

  /**
   * Helper: Check date consistency
   */
  private async checkDateConsistency(
    tableName: string,
    startColumn: string,
    endColumn: string
  ): Promise<number> {
    const { count, error } = await this.client
      .from(tableName as any)
      .select('id', { count: 'exact', head: true })
      .gte(startColumn, endColumn); // start_time >= end_time (invalid)

    if (error) {
      console.warn(`Warning checking date consistency: ${error.message}`);
      return -1;
    }

    return count || 0;
  }

  /**
   * Helper: Check unique constraints
   */
  private async checkUniqueConstraints(
    tableName: string,
    columnName: string
  ): Promise<number> {
    const { count, error } = await (this.client as any)
      .rpc('count_duplicate_values', {
        table_name: tableName,
        column_name: columnName
      });

    if (error) {
      console.warn(`Warning checking unique constraints: ${error.message}`);
      return -1;
    }

    return count || 0;
  }

  /**
   * Helper: Check NOT NULL constraints
   */
  private async checkNotNullConstraints(
    tableName: string,
    columnName: string
  ): Promise<number> {
    const { count, error } = await this.client
      .from(tableName as any)
      .select('id', { count: 'exact', head: true })
      .is(columnName, null);

    if (error) {
      console.warn(`Warning checking NOT NULL constraints: ${error.message}`);
      return -1;
    }

    return count || 0;
  }

  /**
   * Validate schema integrity after migration
   */
  private async validateSchemaAfterMigration(): Promise<{ passed: boolean; errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check that critical tables still exist
      const criticalTables = ['users', 'events', 'relationships', 'contacts'];
      
      for (const table of criticalTables) {
        const { error } = await this.client
          .from(table as any)
          .select('id')
          .limit(1);

        if (error && error.message.includes('does not exist')) {
          errors.push(`Critical table missing after migration: ${table}`);
        }
      }

      // Check that RLS is still enabled
      const { data: rlsStatus, error: rlsError } = await (this.client as any)
        .rpc('check_rls_status');

      if (rlsError) {
        warnings.push(`Could not verify RLS status: ${rlsError.message}`);
      } else if (!rlsStatus) {
        errors.push('RLS appears to be disabled after migration');
      }

    } catch (error) {
      errors.push(`Schema validation error: ${error}`);
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Run comprehensive migration test suite
   */
  async runMigrationTests(): Promise<MigrationSuite> {
    console.log('🧪 Starting migration test suite...');
    
    const startTime = Date.now();
    const migrations = this.getMigrationFiles();
    const results: MigrationTestResult[] = [];

    for (const migrationFile of migrations) {
      const result = await this.testMigration(migrationFile);
      
      // Test rollback if applicable
      result.rollbackTested = await this.testMigrationRollback(migrationFile);
      
      // Test data integrity
      result.dataIntegrityChecks = await this.testDataIntegrity();
      
      results.push(result);

      // Log result
      if (result.passed) {
        console.log(`✅ ${migrationFile} passed`);
      } else {
        console.log(`❌ ${migrationFile} failed: ${result.errors.join(', ')}`);
      }
    }

    const totalPassed = results.filter(r => r.passed).length;
    const totalFailed = results.length - totalPassed;
    const executionTime = Date.now() - startTime;

    const suite: MigrationSuite = {
      suiteName: 'Migration Test Suite',
      migrations: results,
      totalPassed,
      totalFailed,
      executionTime
    };

    console.log(`🎯 Migration tests completed: ${totalPassed}/${results.length} passed`);

    return suite;
  }

  /**
   * Generate migration test report
   */
  generateReport(suite: MigrationSuite): string {
    let report = '# Migration Test Report\n\n';
    report += `**Suite:** ${suite.suiteName}\n`;
    report += `**Status:** ${suite.totalFailed === 0 ? '✅ PASSED' : '❌ FAILED'}\n`;
    report += `**Summary:** ${suite.totalPassed}/${suite.migrations.length} migrations passed\n`;
    report += `**Execution Time:** ${suite.executionTime}ms\n\n`;

    report += '## Migration Results\n\n';

    for (const migration of suite.migrations) {
      report += `### ${migration.migrationFile}\n`;
      report += `- **Status:** ${migration.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
      report += `- **Execution Time:** ${migration.executionTime}ms\n`;
      report += `- **Rollback Tested:** ${migration.rollbackTested ? 'Yes' : 'No'}\n`;

      if (migration.errors.length > 0) {
        report += `- **Errors:**\n`;
        migration.errors.forEach(error => {
          report += `  - ${error}\n`;
        });
      }

      if (migration.warnings.length > 0) {
        report += `- **Warnings:**\n`;
        migration.warnings.forEach(warning => {
          report += `  - ${warning}\n`;
        });
      }

      if (migration.dataIntegrityChecks) {
        report += `- **Data Integrity Checks:**\n`;
        Object.entries(migration.dataIntegrityChecks).forEach(([check, passed]) => {
          report += `  - ${check}: ${passed ? '✅' : '❌'}\n`;
        });
      }

      report += '\n';
    }

    return report;
  }
}

// Export utility functions
export async function testAllMigrations(): Promise<MigrationSuite> {
  const tester = new MigrationTester();
  return await tester.runMigrationTests();
}

export async function generateMigrationTestReport(): Promise<string> {
  const tester = new MigrationTester();
  const suite = await tester.runMigrationTests();
  return tester.generateReport(suite);
}
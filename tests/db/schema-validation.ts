/**
 * Database Schema Validation Framework
 * 
 * Comprehensive testing framework to validate database schema consistency,
 * constraints, indexes, and TypeScript type alignment.
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '../../lib/supabase/types';

// Test database configuration
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'http://localhost:54321';
const TEST_SUPABASE_SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY || 'test_service_key';

export interface SchemaValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, any>;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  constraints: ConstraintInfo[];
  indexes: IndexInfo[];
  policies: PolicyInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references?: string;
}

export interface ConstraintInfo {
  name: string;
  type: string;
  definition: string;
  columns: string[];
}

export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
  type: string;
}

export interface PolicyInfo {
  name: string;
  table: string;
  operation: string;
  definition: string;
}

export class SchemaValidator {
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
   * Validate that all expected tables exist with correct structure
   */
  async validateTablesExist(): Promise<SchemaValidationResult> {
    const expectedTables = [
      'users', 'user_profiles', 'events', 'contacts', 'contact_tags',
      'contact_tag_relationships', 'contact_groups', 'contact_group_members',
      'relationships', 'relationship_groups', 'relationship_group_members',
      'event_permissions', 'event_visibility', 'event_attachments',
      'invitations', 'invitation_tokens', 'calendar_integrations',
      'calendar_shares', 'reminders', 'user_preferences',
      'permission_audit_logs', 'custom_holidays'
    ];

    const errors: string[] = [];
    const warnings: string[] = [];
    const foundTables: string[] = [];

    try {
      // Get all tables in the public schema
      const { data: tables, error } = await this.client
        .rpc('get_schema_tables', { schema_name: 'public' });

      if (error) {
        errors.push(`Failed to retrieve table list: ${error.message}`);
        return { passed: false, errors, warnings, details: {} };
      }

      const tableNames = tables?.map((t: any) => t.table_name) || [];
      foundTables.push(...tableNames);

      // Check for missing tables
      for (const expectedTable of expectedTables) {
        if (!tableNames.includes(expectedTable)) {
          errors.push(`Missing required table: ${expectedTable}`);
        }
      }

      // Check for unexpected tables (warnings only)
      for (const foundTable of tableNames) {
        if (!expectedTables.includes(foundTable) && 
            !foundTable.startsWith('auth.') && 
            !foundTable.startsWith('storage.')) {
          warnings.push(`Unexpected table found: ${foundTable}`);
        }
      }

    } catch (error) {
      errors.push(`Exception during table validation: ${error}`);
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      details: { foundTables, expectedTables }
    };
  }

  /**
   * Validate enum types exist and have correct values
   */
  async validateEnumTypes(): Promise<SchemaValidationResult> {
    const expectedEnums = {
      privacy_level_enum: ['private', 'visible', 'semi_private', 'public'],
      relationship_type_enum: ['primary', 'secondary', 'nesting', 'long_distance', 'casual', 'friendship', 'other'],
      event_status_enum: ['confirmed', 'tentative', 'cancelled'],
      invitation_status_enum: ['pending', 'accepted', 'declined', 'expired', 'cancelled']
    };

    const errors: string[] = [];
    const warnings: string[] = [];
    const foundEnums: Record<string, string[]> = {};

    try {
      // Get all enum types
      const { data: enums, error } = await this.client
        .rpc('get_enum_types');

      if (error) {
        errors.push(`Failed to retrieve enum types: ${error.message}`);
        return { passed: false, errors, warnings, details: {} };
      }

      // Check each expected enum
      for (const [enumName, expectedValues] of Object.entries(expectedEnums)) {
        const foundEnum = enums?.find((e: any) => e.enum_name === enumName);
        
        if (!foundEnum) {
          errors.push(`Missing enum type: ${enumName}`);
          continue;
        }

        const actualValues = foundEnum.enum_values || [];
        foundEnums[enumName] = actualValues;

        // Check for missing values
        for (const expectedValue of expectedValues) {
          if (!actualValues.includes(expectedValue)) {
            errors.push(`Missing enum value '${expectedValue}' in ${enumName}`);
          }
        }

        // Check for unexpected values (warnings)
        for (const actualValue of actualValues) {
          if (!expectedValues.includes(actualValue)) {
            warnings.push(`Unexpected enum value '${actualValue}' in ${enumName}`);
          }
        }
      }

    } catch (error) {
      errors.push(`Exception during enum validation: ${error}`);
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      details: { foundEnums, expectedEnums }
    };
  }

  /**
   * Validate foreign key constraints are properly set up
   */
  async validateForeignKeyConstraints(): Promise<SchemaValidationResult> {
    const expectedConstraints = [
      { table: 'user_profiles', column: 'id', references: 'users.id' },
      { table: 'events', column: 'user_id', references: 'users.id' },
      { table: 'events', column: 'relationship_id', references: 'relationships.id' },
      { table: 'relationships', column: 'user_id', references: 'users.id' },
      { table: 'relationships', column: 'partner_id', references: 'users.id' },
      { table: 'relationships', column: 'group_id', references: 'relationship_groups.id' },
      { table: 'contacts', column: 'user_id', references: 'users.id' },
      { table: 'invitations', column: 'sender_id', references: 'users.id' },
      { table: 'calendar_integrations', column: 'user_id', references: 'users.id' }
    ];

    const errors: string[] = [];
    const warnings: string[] = [];
    const foundConstraints: any[] = [];

    try {
      // Get all foreign key constraints
      const { data: constraints, error } = await this.client
        .rpc('get_foreign_key_constraints');

      if (error) {
        errors.push(`Failed to retrieve foreign key constraints: ${error.message}`);
        return { passed: false, errors, warnings, details: {} };
      }

      foundConstraints.push(...(constraints || []));

      // Check each expected constraint
      for (const expected of expectedConstraints) {
        const found = constraints?.find((c: any) => 
          c.table_name === expected.table &&
          c.column_name === expected.column &&
          c.foreign_table_name === expected.references.split('.')[0] &&
          c.foreign_column_name === expected.references.split('.')[1]
        );

        if (!found) {
          errors.push(`Missing foreign key: ${expected.table}.${expected.column} -> ${expected.references}`);
        }
      }

    } catch (error) {
      errors.push(`Exception during foreign key validation: ${error}`);
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      details: { foundConstraints, expectedConstraints }
    };
  }

  /**
   * Validate RLS policies are properly configured
   */
  async validateRLSPolicies(): Promise<SchemaValidationResult> {
    const expectedPolicies = [
      'Users can view own profile',
      'Users can update own profile',
      'Users can manage own profiles',
      'Users can manage own groups',
      'Users can manage own relationships',
      'Users can manage own events',
      'Users can manage own contacts'
    ];

    const errors: string[] = [];
    const warnings: string[] = [];
    const foundPolicies: string[] = [];

    try {
      // Get all RLS policies
      const { data: policies, error } = await this.client
        .rpc('get_rls_policies');

      if (error) {
        errors.push(`Failed to retrieve RLS policies: ${error.message}`);
        return { passed: false, errors, warnings, details: {} };
      }

      const policyNames = policies?.map((p: any) => p.policyname) || [];
      foundPolicies.push(...policyNames);

      // Check for missing policies (warnings only, as policy names might vary)
      for (const expectedPolicy of expectedPolicies) {
        const found = policyNames.some((name: string) => 
          name.toLowerCase().includes(expectedPolicy.toLowerCase()) ||
          expectedPolicy.toLowerCase().includes(name.toLowerCase())
        );

        if (!found) {
          warnings.push(`Expected policy not found: ${expectedPolicy}`);
        }
      }

    } catch (error) {
      errors.push(`Exception during RLS policy validation: ${error}`);
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      details: { foundPolicies, expectedPolicies }
    };
  }

  /**
   * Validate critical indexes exist for performance
   */
  async validateIndexes(): Promise<SchemaValidationResult> {
    const expectedIndexes = [
      { table: 'users', columns: ['email'] },
      { table: 'events', columns: ['user_id', 'start_time'] },
      { table: 'events', columns: ['start_time', 'end_time'] },
      { table: 'relationships', columns: ['user_id', 'is_active'] },
      { table: 'contacts', columns: ['user_id', 'email'] },
      { table: 'invitations', columns: ['sender_id', 'status'] }
    ];

    const errors: string[] = [];
    const warnings: string[] = [];
    const foundIndexes: any[] = [];

    try {
      // Get all indexes
      const { data: indexes, error } = await this.client
        .rpc('get_table_indexes');

      if (error) {
        errors.push(`Failed to retrieve indexes: ${error.message}`);
        return { passed: false, errors, warnings, details: {} };
      }

      foundIndexes.push(...(indexes || []));

      // Check each expected index
      for (const expected of expectedIndexes) {
        const found = indexes?.find((idx: any) => 
          idx.table_name === expected.table &&
          JSON.stringify(idx.column_names?.sort()) === JSON.stringify(expected.columns.sort())
        );

        if (!found) {
          warnings.push(`Recommended index not found: ${expected.table}(${expected.columns.join(', ')})`);
        }
      }

    } catch (error) {
      errors.push(`Exception during index validation: ${error}`);
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      details: { foundIndexes, expectedIndexes }
    };
  }

  /**
   * Validate privacy level enum consistency across tables
   */
  async validatePrivacyLevelConsistency(): Promise<SchemaValidationResult> {
    const tablesWithPrivacy = [
      'users.default_privacy_level',
      'relationships.default_privacy_level',
      'events.privacy_level',
      'event_visibility.privacy_level',
      'event_permissions.permission_level',
      'calendar_shares.permission_level'
    ];

    const errors: string[] = [];
    const warnings: string[] = [];
    const findings: Record<string, any> = {};

    try {
      // Check each table's privacy level column
      for (const tableColumn of tablesWithPrivacy) {
        const [tableName, columnName] = tableColumn.split('.');
        
        const { data: columnInfo, error } = await this.client
          .rpc('get_column_info', { table_name: tableName, column_name: columnName });

        if (error) {
          warnings.push(`Could not verify privacy level in ${tableColumn}: ${error.message}`);
          continue;
        }

        findings[tableColumn] = columnInfo;

        // Verify it's using the privacy_level_enum type
        if (columnInfo && !columnInfo.data_type?.includes('privacy_level_enum')) {
          errors.push(`Column ${tableColumn} is not using privacy_level_enum type`);
        }
      }

    } catch (error) {
      errors.push(`Exception during privacy level validation: ${error}`);
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      details: findings
    };
  }

  /**
   * Run comprehensive schema validation
   */
  async validateSchema(): Promise<SchemaValidationResult> {
    console.log('🔍 Starting comprehensive schema validation...');

    const results = {
      tables: await this.validateTablesExist(),
      enums: await this.validateEnumTypes(),
      foreignKeys: await this.validateForeignKeyConstraints(),
      policies: await this.validateRLSPolicies(),
      indexes: await this.validateIndexes(),
      privacyConsistency: await this.validatePrivacyLevelConsistency()
    };

    const allErrors = Object.values(results).flatMap(r => r.errors);
    const allWarnings = Object.values(results).flatMap(r => r.warnings);

    const overallResult: SchemaValidationResult = {
      passed: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
      details: results
    };

    if (overallResult.passed) {
      console.log('✅ Schema validation passed!');
    } else {
      console.log(`❌ Schema validation failed with ${allErrors.length} errors`);
    }

    if (allWarnings.length > 0) {
      console.log(`⚠️  Schema validation has ${allWarnings.length} warnings`);
    }

    return overallResult;
  }

  /**
   * Generate schema validation report
   */
  generateReport(result: SchemaValidationResult): string {
    let report = '# Database Schema Validation Report\n\n';
    report += `**Status:** ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`;
    report += `**Summary:** ${result.errors.length} errors, ${result.warnings.length} warnings\n\n`;

    if (result.errors.length > 0) {
      report += '## ❌ Errors\n\n';
      result.errors.forEach(error => {
        report += `- ${error}\n`;
      });
      report += '\n';
    }

    if (result.warnings.length > 0) {
      report += '## ⚠️  Warnings\n\n';
      result.warnings.forEach(warning => {
        report += `- ${warning}\n`;
      });
      report += '\n';
    }

    report += '## 📊 Details\n\n';
    report += '```json\n';
    report += JSON.stringify(result.details, null, 2);
    report += '\n```\n';

    return report;
  }
}

// Export utility functions for easy use in tests
export async function validateTestDatabaseSchema(): Promise<SchemaValidationResult> {
  const validator = new SchemaValidator();
  return await validator.validateSchema();
}

export async function generateSchemaValidationReport(): Promise<string> {
  const validator = new SchemaValidator();
  const result = await validator.validateSchema();
  return validator.generateReport(result);
}
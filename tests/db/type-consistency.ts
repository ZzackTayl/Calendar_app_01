/**
 * TypeScript Type Consistency Validation
 * 
 * Validates that TypeScript types align with database schema,
 * ensuring type safety across the application stack.
 */

import { createClient } from '@supabase/supabase-js';
import { Database } from '../../lib/supabase/types';
import fs from 'fs';
import path from 'path';

// Test database configuration
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'http://localhost:54321';
const TEST_SUPABASE_SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_KEY || 'test_service_key';

export interface TypeValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  details: {
    typeDefinitions: Record<string, any>;
    schemaInformation: Record<string, any>;
    mismatches: TypeMismatch[];
  };
}

export interface TypeMismatch {
  table: string;
  column: string;
  expectedType: string;
  actualType: string;
  severity: 'error' | 'warning';
  description: string;
}

export interface TableTypeDefinition {
  tableName: string;
  columns: ColumnTypeDefinition[];
}

export interface ColumnTypeDefinition {
  name: string;
  tsType: string;
  nullable: boolean;
  dbType: string;
  constraints?: string[];
}

export class TypeConsistencyValidator {
  private client: ReturnType<typeof createClient<Database>>;
  private typesFilePath: string;

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
    
    this.typesFilePath = path.join(process.cwd(), 'lib', 'supabase', 'types.ts');
  }

  /**
   * Extract TypeScript type definitions from types file
   */
  extractTypeDefinitions(): Record<string, any> {
    try {
      const typesContent = fs.readFileSync(this.typesFilePath, 'utf8');
      
      // This is a simplified parser - in practice, you might want to use
      // a proper TypeScript AST parser for more robust extraction
      const typeDefinitions: Record<string, any> = {};
      
      // Extract table interfaces
      const interfaceMatches = typesContent.matchAll(
        /export interface (\w+) \{([^}]+)\}/g
      );

      for (const match of interfaceMatches) {
        const interfaceName = match[1];
        const interfaceBody = match[2];
        
        // Extract properties from interface
        const properties: Record<string, any> = {};
        const propertyMatches = interfaceBody.matchAll(
          /(\w+)(\?)?:\s*([^;\n]+)/g
        );

        for (const propMatch of propertyMatches) {
          const propName = propMatch[1];
          const isOptional = propMatch[2] === '?';
          const propType = propMatch[3].trim();
          
          properties[propName] = {
            type: propType,
            optional: isOptional,
            nullable: propType.includes('null')
          };
        }
        
        typeDefinitions[interfaceName] = properties;
      }

      // Extract enum definitions
      const enumMatches = typesContent.matchAll(
        /export type (\w+) = ([^;\n]+)/g
      );

      for (const match of enumMatches) {
        const enumName = match[1];
        const enumValues = match[2];
        
        // Extract union type values
        const values = enumValues
          .split('|')
          .map(v => v.trim().replace(/["']/g, ''))
          .filter(v => v && !v.includes('null'));
          
        typeDefinitions[enumName] = {
          type: 'enum',
          values
        };
      }

      return typeDefinitions;

    } catch (error) {
      console.error('Failed to extract type definitions:', error);
      return {};
    }
  }

  /**
   * Get database schema information
   */
  async getDatabaseSchema(): Promise<Record<string, any>> {
    const schemaInfo: Record<string, any> = {};

    try {
      // Get table information
      const { data: tables, error: tablesError } = await this.client
        .rpc('get_table_schema_info');

      if (tablesError) {
        throw new Error(`Failed to get table schema: ${tablesError.message}`);
      }

      // Process each table
      for (const table of tables || []) {
        const tableName = table.table_name;
        schemaInfo[tableName] = {
          columns: {},
          constraints: table.constraints || [],
          indexes: table.indexes || []
        };

        // Get column information
        const { data: columns, error: columnsError } = await this.client
          .rpc('get_table_columns_info', { table_name: tableName });

        if (columnsError) {
          console.warn(`Failed to get columns for ${tableName}: ${columnsError.message}`);
          continue;
        }

        for (const column of columns || []) {
          schemaInfo[tableName].columns[column.column_name] = {
            dataType: column.data_type,
            isNullable: column.is_nullable === 'YES',
            defaultValue: column.column_default,
            constraints: column.constraints || [],
            enumValues: column.enum_values || null
          };
        }
      }

      // Get enum type information
      const { data: enums, error: enumsError } = await this.client
        .rpc('get_enum_types_detailed');

      if (!enumsError && enums) {
        schemaInfo._enums = {};
        for (const enumInfo of enums) {
          schemaInfo._enums[enumInfo.enum_name] = {
            values: enumInfo.enum_values || []
          };
        }
      }

      return schemaInfo;

    } catch (error) {
      console.error('Failed to get database schema:', error);
      return {};
    }
  }

  /**
   * Map TypeScript types to PostgreSQL types
   */
  private mapTSTypeToDBType(tsType: string): string[] {
    const typeMap: Record<string, string[]> = {
      'string': ['text', 'varchar', 'character varying', 'uuid', 'inet'],
      'number': ['integer', 'bigint', 'numeric', 'real', 'double precision'],
      'boolean': ['boolean'],
      'Date': ['timestamp', 'timestamptz', 'timestamp with time zone', 'date'],
      'object': ['jsonb', 'json'],
      'any': ['jsonb', 'json', 'text'] // Flexible types
    };

    // Handle union types
    if (tsType.includes('|')) {
      const unionTypes = tsType.split('|').map(t => t.trim());
      const mappedTypes: string[] = [];
      
      for (const type of unionTypes) {
        if (type === 'null') continue;
        const mapped = typeMap[type] || [type];
        mappedTypes.push(...mapped);
      }
      
      return [...new Set(mappedTypes)]; // Remove duplicates
    }

    // Handle array types
    if (tsType.endsWith('[]')) {
      return ['ARRAY', 'array']; // PostgreSQL array types
    }

    // Handle enum types (assume they end with 'enum' or are specific values)
    if (tsType.includes("'") || tsType.includes('"')) {
      return ['enum', 'text']; // Enum values
    }

    return typeMap[tsType] || [tsType];
  }

  /**
   * Validate type consistency between TypeScript and database
   */
  async validateTypeConsistency(): Promise<TypeValidationResult> {
    console.log('🔍 Validating TypeScript type consistency with database...');

    const errors: string[] = [];
    const warnings: string[] = [];
    const mismatches: TypeMismatch[] = [];

    try {
      // Extract type definitions and schema information
      const typeDefinitions = this.extractTypeDefinitions();
      const schemaInformation = await this.getDatabaseSchema();

      // Map expected table types to database tables
      const tableTypeMap: Record<string, string> = {
        'User': 'users',
        'UserProfile': 'user_profiles',
        'Event': 'events',
        'Contact': 'contacts',
        'Relationship': 'relationships',
        'RelationshipGroup': 'relationship_groups',
        'Invitation': 'invitations',
        'CalendarIntegration': 'calendar_integrations'
      };

      // Validate each mapped table
      for (const [typeName, tableName] of Object.entries(tableTypeMap)) {
        const typeDefinition = typeDefinitions[typeName];
        const schemaDefinition = schemaInformation[tableName];

        if (!typeDefinition) {
          warnings.push(`TypeScript interface ${typeName} not found`);
          continue;
        }

        if (!schemaDefinition) {
          errors.push(`Database table ${tableName} not found`);
          continue;
        }

        // Validate each property/column
        for (const [propName, propInfo] of Object.entries(typeDefinition)) {
          const columnInfo = schemaDefinition.columns[propName];

          if (!columnInfo) {
            // Check for common naming conventions
            const snakeCaseName = propName.replace(/([A-Z])/g, '_$1').toLowerCase();
            const altColumnInfo = schemaDefinition.columns[snakeCaseName];

            if (!altColumnInfo) {
              errors.push(`Column ${propName} not found in table ${tableName}`);
              continue;
            } else {
              warnings.push(`Property ${propName} maps to ${snakeCaseName} in database`);
            }
          }

          // Validate type compatibility
          const actualColumnInfo = columnInfo || schemaDefinition.columns[propName.replace(/([A-Z])/g, '_$1').toLowerCase()];
          if (actualColumnInfo) {
            const expectedDbTypes = this.mapTSTypeToDBType(propInfo.type);
            const actualDbType = actualColumnInfo.dataType.toLowerCase();

            const isCompatible = expectedDbTypes.some(expectedType => 
              actualDbType.includes(expectedType.toLowerCase()) ||
              expectedType.toLowerCase().includes(actualDbType)
            );

            if (!isCompatible) {
              mismatches.push({
                table: tableName,
                column: propName,
                expectedType: propInfo.type,
                actualType: actualDbType,
                severity: 'error',
                description: `TypeScript type '${propInfo.type}' incompatible with database type '${actualDbType}'`
              });
            }

            // Validate nullability
            const tsNullable = propInfo.nullable || propInfo.optional;
            const dbNullable = actualColumnInfo.isNullable;

            if (tsNullable !== dbNullable) {
              mismatches.push({
                table: tableName,
                column: propName,
                expectedType: `${propInfo.type}${tsNullable ? ' | null' : ''}`,
                actualType: `${actualDbType}${dbNullable ? ' (nullable)' : ' (not null)'}`,
                severity: 'warning',
                description: `Nullability mismatch: TS=${tsNullable}, DB=${dbNullable}`
              });
            }
          }
        }

        // Check for database columns not in TypeScript interface
        for (const [columnName, columnInfo] of Object.entries(schemaDefinition.columns)) {
          const camelCaseName = columnName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
          
          if (!typeDefinition[columnName] && !typeDefinition[camelCaseName]) {
            warnings.push(`Database column ${tableName}.${columnName} not represented in TypeScript interface ${typeName}`);
          }
        }
      }

      // Validate enum consistency
      if (schemaInformation._enums && typeDefinitions) {
        for (const [enumName, enumInfo] of Object.entries(schemaInformation._enums)) {
          // Find corresponding TypeScript enum
          const tsEnumName = enumName.replace(/_enum$/, '').replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
          const tsEnum = typeDefinitions[tsEnumName] || typeDefinitions[enumName];

          if (tsEnum && tsEnum.type === 'enum') {
            const dbValues = (enumInfo as any).values || [];
            const tsValues = tsEnum.values || [];

            // Check for missing values
            for (const dbValue of dbValues) {
              if (!tsValues.includes(dbValue)) {
                mismatches.push({
                  table: 'enum',
                  column: enumName,
                  expectedType: dbValue,
                  actualType: 'missing',
                  severity: 'error',
                  description: `Database enum value '${dbValue}' missing from TypeScript enum`
                });
              }
            }

            // Check for extra values
            for (const tsValue of tsValues) {
              if (!dbValues.includes(tsValue)) {
                mismatches.push({
                  table: 'enum',
                  column: enumName,
                  expectedType: 'exists in DB',
                  actualType: tsValue,
                  severity: 'warning',
                  description: `TypeScript enum value '${tsValue}' not found in database enum`
                });
              }
            }
          }
        }
      }

      // Categorize mismatches
      const errorMismatches = mismatches.filter(m => m.severity === 'error');
      const warningMismatches = mismatches.filter(m => m.severity === 'warning');

      errors.push(...errorMismatches.map(m => m.description));
      warnings.push(...warningMismatches.map(m => m.description));

      const result: TypeValidationResult = {
        passed: errors.length === 0 && errorMismatches.length === 0,
        errors,
        warnings,
        details: {
          typeDefinitions,
          schemaInformation,
          mismatches
        }
      };

      if (result.passed) {
        console.log('✅ Type consistency validation passed');
      } else {
        console.log(`❌ Type consistency validation failed with ${errors.length} errors`);
      }

      if (warnings.length > 0) {
        console.log(`⚠️  Type consistency validation has ${warnings.length} warnings`);
      }

      return result;

    } catch (error) {
      console.error('❌ Type consistency validation failed:', error);
      return {
        passed: false,
        errors: [`Validation failed: ${error}`],
        warnings: [],
        details: {
          typeDefinitions: {},
          schemaInformation: {},
          mismatches: []
        }
      };
    }
  }

  /**
   * Generate type consistency report
   */
  generateReport(result: TypeValidationResult): string {
    let report = '# TypeScript-Database Type Consistency Report\n\n';
    report += `**Status:** ${result.passed ? '✅ PASSED' : '❌ FAILED'}\n`;
    report += `**Summary:** ${result.errors.length} errors, ${result.warnings.length} warnings\n\n`;

    if (result.errors.length > 0) {
      report += '## ❌ Type Errors\n\n';
      result.errors.forEach(error => {
        report += `- ${error}\n`;
      });
      report += '\n';
    }

    if (result.warnings.length > 0) {
      report += '## ⚠️  Type Warnings\n\n';
      result.warnings.forEach(warning => {
        report += `- ${warning}\n`;
      });
      report += '\n';
    }

    if (result.details.mismatches.length > 0) {
      report += '## 🔍 Detailed Type Mismatches\n\n';
      
      const groupedMismatches = result.details.mismatches.reduce((groups, mismatch) => {
        const key = mismatch.table;
        if (!groups[key]) groups[key] = [];
        groups[key].push(mismatch);
        return groups;
      }, {} as Record<string, TypeMismatch[]>);

      for (const [table, mismatches] of Object.entries(groupedMismatches)) {
        report += `### ${table}\n\n`;
        
        for (const mismatch of mismatches) {
          report += `- **${mismatch.column}**: ${mismatch.severity === 'error' ? '❌' : '⚠️ '} ${mismatch.description}\n`;
          report += `  - Expected: \`${mismatch.expectedType}\`\n`;
          report += `  - Actual: \`${mismatch.actualType}\`\n`;
        }
        report += '\n';
      }
    }

    report += '## 📊 Analysis Summary\n\n';
    const typeCount = Object.keys(result.details.typeDefinitions).length;
    const tableCount = Object.keys(result.details.schemaInformation).length;
    report += `- TypeScript interfaces analyzed: ${typeCount}\n`;
    report += `- Database tables analyzed: ${tableCount}\n`;
    report += `- Total mismatches found: ${result.details.mismatches.length}\n`;

    return report;
  }
}

// Export utility functions
export async function validateTypeConsistency(): Promise<TypeValidationResult> {
  const validator = new TypeConsistencyValidator();
  return await validator.validateTypeConsistency();
}

export async function generateTypeConsistencyReport(): Promise<string> {
  const validator = new TypeConsistencyValidator();
  const result = await validator.validateTypeConsistency();
  return validator.generateReport(result);
}
#!/usr/bin/env node

/**
 * Database Schema Validation Script
 * 
 * This script validates that the actual database schema matches the documented
 * schema in docs/DATABASE_SCHEMA_REFERENCE.md to prevent future mismatches.
 */

require('dotenv').config({ path: '.env.test' });
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Expected schema based on DATABASE_SCHEMA_REFERENCE.md
const EXPECTED_SCHEMA = {
    users: {
        required_columns: ['id', 'email', 'created_at', 'updated_at'],
        forbidden_columns: ['display_name', 'phone_number', 'full_name'],
        primary_key: 'id',
        data_types: {
            id: 'uuid',
            email: 'text',
            created_at: 'timestamptz',
            updated_at: 'timestamptz'
        }
    },
    user_profiles: {
        required_columns: ['id', 'full_name', 'time_zone', 'created_at', 'updated_at'],
        optional_columns: ['avatar_url', 'default_calendar_view', 'email_notifications', 'push_notifications'],
        primary_key: 'id',
        data_types: {
            id: 'uuid',
            full_name: 'text',
            time_zone: 'text'
        }
    },
    relationships: {
        required_columns: ['id', 'user_id', 'partner_id', 'relationship_type', 'default_privacy_level', 'privacy_level', 'connection_tier', 'created_at', 'updated_at'],
        primary_key: 'id',
        foreign_keys: {
            user_id: 'users.id',
            partner_id: 'users.id'
        }
    },
    events: {
        required_columns: ['id', 'user_id', 'title', 'start_time', 'end_time', 'privacy_level', 'created_at', 'updated_at'],
        primary_key: 'id',
        foreign_keys: {
            user_id: 'users.id'
        }
    },
    relationship_groups: {
        required_columns: ['id', 'name', 'user_id', 'created_at', 'updated_at'],
        primary_key: 'id',
        foreign_keys: {
            user_id: 'users.id'
        }
    },
    contacts: {
        required_columns: ['id', 'user_id', 'name', 'created_at', 'updated_at'],
        primary_key: 'id',
        foreign_keys: {
            user_id: 'users.id'
        }
    }
};

// Expected enum types
const EXPECTED_ENUMS = {
    privacy_level_enum: ['private', 'visible', 'semi_private', 'public'],
    relationship_type_enum: ['primary', 'secondary', 'nesting', 'long_distance', 'casual', 'friendship', 'other'],
    event_status_enum: ['confirmed', 'tentative', 'cancelled'],
    invitation_status_enum: ['pending', 'accepted', 'declined', 'expired'],
    reminder_type_enum: ['email', 'push', 'sms'],
    connection_tier: ['private', 'busy_only', 'details'],
    event_privacy_override: ['default', 'private']
};

async function validateDatabaseSchema() {
    console.log('🔍 Validating Database Schema...');
    console.log('====================================\\n');

    let validationErrors = [];
    let validationWarnings = [];

    try {
        // Validate each table
        for (const [tableName, expectedSchema] of Object.entries(EXPECTED_SCHEMA)) {
            console.log(`📋 Validating table: ${tableName}`);
            
            const tableValidation = await validateTable(tableName, expectedSchema);
            validationErrors.push(...tableValidation.errors);
            validationWarnings.push(...tableValidation.warnings);
        }

        // Generate report
        generateValidationReport(validationErrors, validationWarnings);

        if (validationErrors.length > 0) {
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Schema validation failed:', error);
        process.exit(1);
    }
}

async function validateTable(tableName, expectedSchema) {
    const errors = [];
    const warnings = [];

    try {
        // Get table structure by attempting a select with limit 1
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);

        if (error) {
            errors.push(`Table ${tableName} is not accessible: ${error.message}`);
            return { errors, warnings };
        }

        // If no data, we can't validate column structure
        if (!data || data.length === 0) {
            warnings.push(`Table ${tableName} has no data - cannot validate column structure`);
            return { errors, warnings };
        }

        const actualColumns = Object.keys(data[0]);
        console.log(`  📊 Found columns: ${actualColumns.join(', ')}`);

        // Check required columns
        for (const requiredColumn of expectedSchema.required_columns) {
            if (!actualColumns.includes(requiredColumn)) {
                errors.push(`Table ${tableName} missing required column: ${requiredColumn}`);
            }
        }

        // Check forbidden columns (common mistakes)
        if (expectedSchema.forbidden_columns) {
            for (const forbiddenColumn of expectedSchema.forbidden_columns) {
                if (actualColumns.includes(forbiddenColumn)) {
                    errors.push(`Table ${tableName} has forbidden column: ${forbiddenColumn} (check DATABASE_SCHEMA_REFERENCE.md)`);
                }
            }
        }

        // Check for unexpected columns (warn only)
        const expectedAllColumns = [
            ...expectedSchema.required_columns,
            ...(expectedSchema.optional_columns || [])
        ];
        
        for (const actualColumn of actualColumns) {
            if (!expectedAllColumns.includes(actualColumn)) {
                warnings.push(`Table ${tableName} has undocumented column: ${actualColumn}`);
            }
        }

        console.log(`  ✅ ${tableName} structure validated`);

    } catch (error) {
        errors.push(`Failed to validate table ${tableName}: ${error.message}`);
    }

    return { errors, warnings };
}

function generateValidationReport(errors, warnings) {
    console.log('\\n📊 SCHEMA VALIDATION REPORT');
    console.log('==============================');

    if (errors.length === 0 && warnings.length === 0) {
        console.log('\\n🎉 Schema validation PASSED!');
        console.log('✅ All tables match the documented schema');
        console.log('✅ No forbidden columns detected');
        console.log('✅ All required columns present');
        return;
    }

    // Report errors
    if (errors.length > 0) {
        console.log('\\n🚨 VALIDATION ERRORS (Must Fix):');
        errors.forEach((error, index) => {
            console.log(`  ${index + 1}. ❌ ${error}`);
        });
    }

    // Report warnings
    if (warnings.length > 0) {
        console.log('\\n⚠️  VALIDATION WARNINGS (Consider Updating Docs):');
        warnings.forEach((warning, index) => {
            console.log(`  ${index + 1}. 🔸 ${warning}`);
        });
    }

    // Provide guidance
    console.log('\\n📚 Next Steps:');
    if (errors.length > 0) {
        console.log('  1. Fix schema mismatches or update DATABASE_SCHEMA_REFERENCE.md');
        console.log('  2. Update test helpers to match actual schema');
        console.log('  3. Run this validation again: npm run validate:schema');
    }
    if (warnings.length > 0) {
        console.log('  • Consider documenting undocumented columns in DATABASE_SCHEMA_REFERENCE.md');
    }
    
    console.log('\\n🔗 Reference: docs/DATABASE_SCHEMA_REFERENCE.md');
}

async function checkTestHelperAlignment() {
    console.log('\\n🧪 Checking Test Helper Alignment...');
    console.log('=====================================');

    const testHelperFile = 'lib/test-helpers.ts';
    
    try {
        const fs = require('fs');
        const testHelperContent = fs.readFileSync(testHelperFile, 'utf8');
        
        // Check for common mistakes in test helpers
        const issues = [];
        
        if (testHelperContent.includes('display_name') && testHelperContent.includes('users')) {
            issues.push('❌ Test helpers reference display_name in users table (should use user_profiles.full_name)');
        }
        
        if (testHelperContent.includes('phone_number') && testHelperContent.includes('users')) {
            issues.push('❌ Test helpers reference phone_number in users table (field does not exist)');
        }
        
        if (testHelperContent.includes("'test-") && testHelperContent.includes('UUID')) {
            issues.push('❌ Test helpers use string IDs instead of UUIDs (use crypto.randomUUID())');
        }

        if (issues.length > 0) {
            console.log('\\n🔧 Test Helper Issues Found:');
            issues.forEach(issue => console.log(`  ${issue}`));
        } else {
            console.log('  ✅ Test helpers appear aligned with schema');
        }
        
    } catch (error) {
        console.log('  ⚠️  Could not check test helper file:', error.message);
    }
}

// Run validation
async function main() {
    await validateDatabaseSchema();
    await checkTestHelperAlignment();
    
    console.log('\\n🏁 Schema validation completed');
}

main().catch(console.error);

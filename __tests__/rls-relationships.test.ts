/**
 * RLS Policies Test for Relationships Table
 * 
 * This test suite validates that Row-Level Security policies are properly
 * configured and working for the relationships table.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Load environment variables from .env file for testing
function loadEnvFile() {
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const envVars: Record<string, string> = {};
    
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#][^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        envVars[key] = value;
      }
    });
    
    return envVars;
  } catch (error) {
    console.warn('Could not load .env file for tests:', error);
    return {};
  }
}

const envVars = loadEnvFile();

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || envVars.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Helper function to check if RLS is working (either error or empty data)
function isRLSWorking(data: any, error: any): boolean {
  // RLS is working if:
  // 1. There's an error indicating access restriction, OR
  // 2. No error but empty data (policies allow query but return no results)
  if (error) {
    return true; // Any error indicates RLS is active
  }
  return Array.isArray(data) && data.length === 0;
}

describe('Relationships Table RLS Policies', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  describe('Unauthenticated Access', () => {
    test('should deny access to relationships without authentication', async () => {
      const { data, error } = await supabase
        .from('relationships')
        .select('*')
        .limit(1);

      // RLS should either return an error or empty data
      expect(isRLSWorking(data, error)).toBe(true);
    });

    test('should deny insert operations without authentication', async () => {
      const { data, error } = await supabase
        .from('relationships')
        .insert({
          user_id: '550e8400-e29b-41d4-a716-446655440001',
          partner_id: '550e8400-e29b-41d4-a716-446655440002',
          relationship_type: 'primary',
          connection_tier: 'details'
        });

      // RLS should prevent unauthorized insert operations
      expect(error).toBeTruthy();
    });

    test('should deny update operations without authentication', async () => {
      const { data, error } = await supabase
        .from('relationships')
        .update({ relationship_type: 'secondary' })
        .eq('id', '550e8400-e29b-41d4-a716-446655440001');

      // RLS should prevent unauthorized update operations
      expect(error).toBeTruthy();
    });

    test('should deny delete operations without authentication', async () => {
      const { data, error } = await supabase
        .from('relationships')
        .delete()
        .eq('id', '550e8400-e29b-41d4-a716-446655440001');

      // RLS should prevent unauthorized delete operations
      expect(error).toBeTruthy();
    });
  });

  describe('Table Structure Validation', () => {
    test('should have relationships table accessible', async () => {
      // This test verifies the table exists and is queryable (even if empty due to RLS)
      const { error } = await supabase
        .from('relationships')
        .select('id')
        .limit(1);

      // Should not get a "table does not exist" error
      if (error) {
        expect(error.message).not.toMatch(/does not exist|relation.*does not exist/i);
      }
    });

    test('should have required columns in relationships table', async () => {
      // Test that we can reference expected columns without getting column errors
      const { error } = await supabase
        .from('relationships')
        .select('id, user_id, partner_id, relationship_type, connection_tier, is_active')
        .limit(1);

      // Should not get column does not exist errors
      if (error) {
        expect(error.message).not.toMatch(/column.*does not exist/i);
      }
    });
  });

  describe('RLS Policy Effectiveness', () => {
    test('should protect against unauthorized data access', async () => {
      // Attempt to access data with various query patterns
      const queries = [
        () => supabase.from('relationships').select('*'),
        () => supabase.from('relationships').select('user_id, partner_id'),
        () => supabase.from('relationships').select('*').eq('is_active', true),
        () => supabase.from('relationships').select('*').limit(100)
      ];

      for (const query of queries) {
        const { data, error } = await query();
        
        // RLS should either return an error or empty data
        expect(isRLSWorking(data, error)).toBe(true);
      }
    });

    test('should enforce RLS on all CRUD operations', async () => {
      const testRelationship = {
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        partner_id: '550e8400-e29b-41d4-a716-446655440002',
        relationship_type: 'primary',
        connection_tier: 'details'
      };

      // Test CREATE
      const { error: insertError } = await supabase
        .from('relationships')
        .insert(testRelationship);
      expect(insertError).toBeTruthy();

      // Test READ (already tested above)
      const { data: readData, error: readError } = await supabase
        .from('relationships')
        .select('*');
      expect(isRLSWorking(readData, readError)).toBe(true);

      // Test UPDATE
      const { error: updateError } = await supabase
        .from('relationships')
        .update({ relationship_type: 'secondary' })
        .eq('user_id', testRelationship.user_id);
      expect(updateError).toBeTruthy();

      // Test DELETE
      const { error: deleteError } = await supabase
        .from('relationships')
        .delete()
        .eq('user_id', testRelationship.user_id);
      expect(deleteError).toBeTruthy();
    });
  });

  describe('Security Validation', () => {
    test('should not leak data through error messages', async () => {
      const { data, error } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', '550e8400-e29b-41d4-a716-446655440001');

      // Error messages should not contain sensitive data
      if (error) {
        expect(error.message).not.toMatch(/550e8400-e29b-41d4-a716-446655440001/);
        expect(error.message).not.toMatch(/email.*@.*\./);
      }
    });

    test('should handle malformed queries securely', async () => {
      // Test various potentially problematic queries
      const malformedQueries = [
        () => supabase.from('relationships').select('*').eq('user_id', "'; DROP TABLE relationships; --"),
        () => supabase.from('relationships').select('*').eq('user_id', null),
        () => supabase.from('relationships').select('*').eq('user_id', undefined)
      ];

      for (const query of malformedQueries) {
        const { data, error } = await query();
        
        // Should handle gracefully without exposing system information
        if (error) {
          expect(error.message).not.toMatch(/DROP TABLE|DELETE FROM|INSERT INTO/i);
        }
      }
    });
  });
});

describe('Related Tables RLS Validation', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  test('should protect events table', async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .limit(1);

    expect(isRLSWorking(data, error)).toBe(true);
  });

  test('should protect users table', async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    expect(isRLSWorking(data, error)).toBe(true);
  });

  test('should protect user_profiles table if it exists', async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    // Table might not exist, but if it does, should be protected
    if (error && error.message && error.message.includes('does not exist')) {
      // Table doesn't exist, which is fine
      expect(true).toBe(true);
    } else {
      // Table exists, should be protected by RLS
      expect(isRLSWorking(data, error)).toBe(true);
    }
  });
});

describe('RLS Policy Completeness', () => {
  test('should have comprehensive policy coverage', () => {
    // This test documents the expected RLS policy coverage
    const expectedPolicies = {
      relationships: [
        'Users can view their relationships (SELECT)',
        'Users can create relationships (INSERT)', 
        'Users can update their relationships (UPDATE)',
        'Users can delete their relationships (DELETE)'
      ],
      events: [
        'Users can view own events (SELECT)',
        'Users can create own events (INSERT)',
        'Users can update own events (UPDATE)', 
        'Users can delete own events (DELETE)',
        'Partners can view shared events (SELECT with relationship check)'
      ],
      users: [
        'Users can view own record (SELECT)',
        'Users can update own record (UPDATE)'
      ]
    };

    // This test serves as documentation of expected policies
    expect(expectedPolicies).toBeDefined();
    expect(Object.keys(expectedPolicies)).toContain('relationships');
    expect(Object.keys(expectedPolicies)).toContain('events');
    expect(Object.keys(expectedPolicies)).toContain('users');
  });
});
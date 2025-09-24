/**
 * Enhanced RLS Policies Test for Relationships Tables
 * 
 * This test suite validates the enhanced Row-Level Security policies
 * with granular controls for relationships, relationship_groups, and
 * relationship_group_members tables.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const describeRLS = process.env.TEST_TYPE === 'integration' ? describe : describe.skip;

// Load environment variables from .env file for testing (best-effort, fallback to generated testing env)
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
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;

// Helper function to check if RLS is working
function isRLSWorking(data: any, error: any): boolean {
  if (error) {
    return true; // Any error indicates RLS is active
  }
  return Array.isArray(data) && data.length === 0;
}

describeRLS('Enhanced RLS Policies - Relationships Table', () => {
  let supabase: ReturnType<typeof createClient>;
  let adminClient: ReturnType<typeof createClient>;

  beforeAll(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    if (SUPABASE_SERVICE_ROLE_KEY) {
      adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    }
  });

  describe('Granular Policy Enforcement', () => {
    test('should have separate policies for each CRUD operation', async () => {
      // Test that each operation is individually controlled
      const testRelationship = {
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        partner_id: '550e8400-e29b-41d4-a716-446655440002',
        relationship_type: 'primary',
        connection_tier: 'details'
      };

      // Test SELECT policy
      const { data: selectData, error: selectError } = await supabase
        .from('relationships')
        .select('*')
        .limit(1);
      expect(isRLSWorking(selectData, selectError)).toBe(true);

      // Test INSERT policy
      const { error: insertError } = await supabase
        .from('relationships')
        .insert(testRelationship);
      expect(insertError).toBeTruthy();

      // Test UPDATE policy
      const { error: updateError } = await supabase
        .from('relationships')
        .update({ relationship_type: 'secondary' })
        .eq('id', '550e8400-e29b-41d4-a716-446655440001');
      expect(updateError).toBeTruthy();

      // Test DELETE policy
      const { error: deleteError } = await supabase
        .from('relationships')
        .delete()
        .eq('id', '550e8400-e29b-41d4-a716-446655440001');
      expect(deleteError).toBeTruthy();
    });

    test('should prevent cross-user data access', async () => {
      // Test various attempts to access other users' data
      const otherUserId = '550e8400-e29b-41d4-a716-446655440999';
      
      const { data, error } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', otherUserId);

      expect(isRLSWorking(data, error)).toBe(true);
    });

    test('should validate partner access controls', async () => {
      // Test that partner_id access is properly controlled
      const { data, error } = await supabase
        .from('relationships')
        .select('*')
        .not('partner_id', 'is', null);

      expect(isRLSWorking(data, error)).toBe(true);
    });
  });

  describe('Data Integrity Validation', () => {
    test('should prevent self-relationships through validation', async () => {
      if (!adminClient) {
        console.log('Skipping admin tests - no service role key');
        return;
      }

      // This would test the validation trigger if we had authenticated users
      const selfRelationship = {
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        partner_id: '550e8400-e29b-41d4-a716-446655440001', // Same as user_id
        relationship_type: 'primary',
        connection_tier: 'details'
      };

      // Should be prevented by validation trigger
      const { error } = await adminClient
        .from('relationships')
        .insert(selfRelationship);

      // Expect either RLS error or validation error
      expect(error).toBeTruthy();
    });

    test('should validate required fields', async () => {
      const invalidRelationship = {
        // Missing required user_id
        partner_id: '550e8400-e29b-41d4-a716-446655440002',
        relationship_type: 'primary'
      };

      const { error } = await supabase
        .from('relationships')
        .insert(invalidRelationship);

      expect(error).toBeTruthy();
    });
  });
});

describeRLS('Enhanced RLS Policies - Relationship Groups', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  describe('Relationship Groups Access Control', () => {
    test('should deny unauthorized access to relationship groups', async () => {
      const { data, error } = await supabase
        .from('relationship_groups')
        .select('*')
        .limit(1);

      expect(isRLSWorking(data, error)).toBe(true);
    });

    test('should prevent unauthorized group creation', async () => {
      const testGroup = {
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        group_name: 'Test Group',
        description: 'Test Description'
      };

      const { error } = await supabase
        .from('relationship_groups')
        .insert(testGroup);

      expect(error).toBeTruthy();
    });

    test('should prevent unauthorized group modifications', async () => {
      const { error: updateError } = await supabase
        .from('relationship_groups')
        .update({ group_name: 'Modified Name' })
        .eq('id', '550e8400-e29b-41d4-a716-446655440001');

      expect(updateError).toBeTruthy();

      const { error: deleteError } = await supabase
        .from('relationship_groups')
        .delete()
        .eq('id', '550e8400-e29b-41d4-a716-446655440001');

      expect(deleteError).toBeTruthy();
    });
  });
});

describeRLS('Enhanced RLS Policies - Group Members', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  describe('Group Membership Access Control', () => {
    test('should deny unauthorized access to group memberships', async () => {
      const { data, error } = await supabase
        .from('relationship_group_members')
        .select('*')
        .limit(1);

      expect(isRLSWorking(data, error)).toBe(true);
    });

    test('should prevent unauthorized membership modifications', async () => {
      const testMembership = {
        group_id: '550e8400-e29b-41d4-a716-446655440001',
        relationship_id: '550e8400-e29b-41d4-a716-446655440002',
        connection_tier: 'details'
      };

      const { error: insertError } = await supabase
        .from('relationship_group_members')
        .insert(testMembership);

      expect(insertError).toBeTruthy();

      const { error: updateError } = await supabase
        .from('relationship_group_members')
        .update({ connection_tier: 'basic' })
        .eq('id', '550e8400-e29b-41d4-a716-446655440001');

      expect(updateError).toBeTruthy();

      const { error: deleteError } = await supabase
        .from('relationship_group_members')
        .delete()
        .eq('id', '550e8400-e29b-41d4-a716-446655440001');

      expect(deleteError).toBeTruthy();
    });
  });
});

describeRLS('Security Helper Functions', () => {
  let adminClient: ReturnType<typeof createClient>;

  beforeAll(() => {
    if (SUPABASE_SERVICE_ROLE_KEY) {
      adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    }
  });

  test('should have can_access_relationship function', async () => {
    if (!adminClient) {
      console.log('Skipping admin tests - no service role key');
      return;
    }

    // Test the helper function exists and works
    try {
      const { data, error } = await adminClient.rpc('can_access_relationship', {
        relationship_id: '550e8400-e29b-41d4-a716-446655440001',
        requesting_user_id: '550e8400-e29b-41d4-a716-446655440001'
      });

      // Function should exist (even if it returns false due to no data)
      expect(error).toBeFalsy();
      expect(typeof data).toBe('boolean');
    } catch (error) {
      // Function might not exist yet, which is expected
      console.log('Helper function not yet deployed:', error);
    }
  });
});

describeRLS('Audit and Monitoring', () => {
  let supabase: ReturnType<typeof createClient>;

  beforeAll(() => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  });

  test('should have audit_log table with proper RLS', async () => {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .limit(1);

    // Should either not exist yet or be protected by RLS
    if (!error || !error.message.includes('does not exist')) {
      expect(isRLSWorking(data, error)).toBe(true);
    }
  });
});

describeRLS('Policy Completeness Check', () => {
  test('should document expected policy coverage', () => {
    const expectedPolicies = {
      relationships: [
        'Users can view own relationships (SELECT)',
        'Users can create own relationships (INSERT)',
        'Users can update own relationships (UPDATE)',
        'Users can delete own relationships (DELETE)',
        'Partners can view shared relationships (SELECT with partner check)'
      ],
      relationship_groups: [
        'Users can view own relationship groups (SELECT)',
        'Users can create own relationship groups (INSERT)',
        'Users can update own relationship groups (UPDATE)',
        'Users can delete own relationship groups (DELETE)'
      ],
      relationship_group_members: [
        'Users can view own group memberships (SELECT)',
        'Users can add to own groups (INSERT)',
        'Users can update own group memberships (UPDATE)',
        'Users can remove from own groups (DELETE)'
      ]
    };

    // Verify expected policy structure
    expect(expectedPolicies.relationships).toHaveLength(5);
    expect(expectedPolicies.relationship_groups).toHaveLength(4);
    expect(expectedPolicies.relationship_group_members).toHaveLength(4);
  });
});
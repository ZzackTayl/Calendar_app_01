/**
 * Database Schema Inspection
 * 
 * This test helps us understand your actual database schema
 * so we can fix the test helpers to match your real structure.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('🔍 Database Schema Inspection', () => {
  let supabase: any;
  
  beforeAll(async () => {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  });

  it('should inspect users table structure', async () => {
    try {
      // Get table info by trying to insert with minimal data
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      console.log('📊 Users table sample:', data);
      if (error) console.log('Users table error:', error.message);
    } catch (error) {
      console.log('Users table inspection error:', error);
    }
  });

  it('should inspect relationships table structure', async () => {
    try {
      const { data, error } = await supabase
        .from('relationships')
        .select('*')
        .limit(1);
      
      console.log('📊 Relationships table sample:', data);
      if (error) console.log('Relationships table error:', error.message);
    } catch (error) {
      console.log('Relationships table inspection error:', error);
    }
  });

  it('should inspect events table structure', async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .limit(1);
      
      console.log('📊 Events table sample:', data);
      if (error) console.log('Events table error:', error.message);
    } catch (error) {
      console.log('Events table inspection error:', error);
    }
  });

  it('should list all available tables', async () => {
    try {
      // Try to get schema information
      const { data, error } = await supabase
        .rpc('get_schema_info', {});
      
      console.log('📊 Schema info:', data);
      if (error) console.log('Schema info error:', error.message);
    } catch (error) {
      // If that doesn't work, try getting table list another way
      console.log('Schema inspection method 1 failed, trying alternative...');
      
      try {
        const { data: tablesData, error: tablesError } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public');
          
        console.log('📊 Available tables:', tablesData);
        if (tablesError) console.log('Tables query error:', tablesError.message);
      } catch (alternativeError) {
        console.log('Alternative schema inspection also failed:', alternativeError);
      }
    }
  });
});

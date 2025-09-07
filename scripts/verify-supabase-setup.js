#!/usr/bin/env node

/**
 * Verify Supabase Database and Storage Setup
 * This script checks your Supabase project for proper configuration
 */

const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_03e5b92a1f8fe90932054ec813d036e1cf628310';
const PROJECT_REF = 'mqmtsiqalclkfeursrsa';

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('❌ SUPABASE_ACCESS_TOKEN is required');
  process.exit(1);
}

async function checkSupabaseSetup() {
  console.log('🔍 Verifying Supabase Project Setup...\n');
  
  // Check project details
  console.log('1️⃣ Checking Project Details...');
  try {
    const projectResponse = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!projectResponse.ok) {
      throw new Error(`Failed to fetch project: ${projectResponse.status}`);
    }
    
    const project = await projectResponse.json();
    console.log(`✅ Project Name: ${project.name}`);
    console.log(`✅ Region: ${project.region}`);
    console.log(`✅ Status: ${project.status}\n`);
  } catch (error) {
    console.error(`❌ Failed to check project details: ${error.message}\n`);
  }

  // Check storage buckets
  console.log('2️⃣ Checking Storage Buckets...');
  try {
    const bucketsResponse = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/storage/buckets`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!bucketsResponse.ok) {
      console.log('⚠️  Unable to fetch storage buckets via Management API');
      console.log('   Please verify manually in Supabase Dashboard:\n');
      console.log('   Required Storage Buckets:');
      console.log('   - attachments (for event file uploads)\n');
    } else {
      const buckets = await bucketsResponse.json();
      if (buckets.length === 0) {
        console.log('❌ No storage buckets found!');
        console.log('   Required: "attachments" bucket\n');
      } else {
        console.log('✅ Found storage buckets:');
        buckets.forEach(bucket => {
          console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
        });
        
        const hasAttachments = buckets.some(b => b.name === 'attachments');
        if (!hasAttachments) {
          console.log('\n⚠️  Missing "attachments" bucket!');
        }
        console.log('');
      }
    }
  } catch (error) {
    console.error(`❌ Failed to check storage buckets: ${error.message}\n`);
  }

  // Provide manual verification steps
  console.log('3️⃣ Manual Database Verification Required\n');
  console.log('Please check the following in your Supabase Dashboard:');
  console.log('🔗 https://supabase.com/dashboard/project/mqmtsiqalclkfeursrsa\n');
  
  console.log('📊 Required Tables (Table Editor):');
  const requiredTables = [
    'users',
    'relationships',
    'events', 
    'event_permissions',
    'event_visibility',
    'relationship_groups',
    'relationship_group_members',
    'contacts',
    'user_profiles'
  ];
  
  requiredTables.forEach(table => {
    console.log(`   ☐ ${table}`);
  });

  console.log('\n🔐 Row Level Security (Authentication > Policies):');
  console.log('   ☐ RLS enabled on all tables');
  console.log('   ☐ Policies exist for user data access');
  console.log('   ☐ Helper functions: can_view_user_calendar, can_view_event_details');

  console.log('\n🗄️ Storage Buckets (Storage):');
  console.log('   ☐ "attachments" bucket exists');
  console.log('   ☐ Appropriate policies for file uploads/downloads');

  console.log('\n🔧 Database Functions (SQL Editor):');
  console.log('   ☐ can_view_user_calendar(viewer_id, calendar_owner_id)');
  console.log('   ☐ can_view_event_details(event_id, viewer_id)');
  console.log('   ☐ verify_rls_policies()');

  console.log('\n📝 Environment Variables (.env.local):');
  console.log('   ☐ NEXT_PUBLIC_SUPABASE_URL');
  console.log('   ☐ NEXT_PUBLIC_SUPABASE_ANON_KEY');
  console.log('   ☐ SUPABASE_SERVICE_ROLE_KEY (for server-side operations)');

  // Test RLS verification function
  console.log('\n4️⃣ To verify RLS policies are properly set up, run this in SQL Editor:');
  console.log('```sql');
  console.log('SELECT * FROM verify_rls_policies() ORDER BY table_name;');
  console.log('```');
  console.log('All tables should show status = "COMPLETE"\n');

  console.log('✅ Verification script completed!');
}

// Run the verification
checkSupabaseSetup().catch(console.error);

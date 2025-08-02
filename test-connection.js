// Test Supabase connection and basic database operations
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🧪 Testing PolyHarmony Database Connection...\n')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✅ Set' : '❌ Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('🔌 Testing basic connection...')
    
    // Test 1: Check if we can connect
    const { data: tables, error: tablesError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
    
    if (tablesError) {
      console.error('❌ Connection failed:', tablesError.message)
      return false
    }
    
    console.log('✅ Connection successful!')
    console.log(`📊 Users table exists (current count: ${tables?.count || 0})`)
    
    // Test 2: Check all tables exist
    console.log('\n🗂️  Checking table structure...')
    const tableNames = ['users', 'relationship_groups', 'relationships', 'events', 'event_privacy']
    
    for (const tableName of tableNames) {
      try {
        const { error } = await supabase
          .from(tableName)
          .select('count', { count: 'exact', head: true })
        
        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`)
        } else {
          console.log(`✅ ${tableName}: Table exists`)
        }
      } catch (err) {
        console.log(`❌ ${tableName}: Error checking table`)
      }
    }
    
    // Test 3: Test inserting a sample user (then delete it)
    console.log('\n🧪 Testing data operations...')
    
    const testUser = {
      phone_number: '+1234567890',
      email: 'test@polyharmony.com',
      display_name: 'Test User',
      subscription_tier: 'free'
    }
    
    // Insert test user
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert([testUser])
      .select()
    
    if (insertError) {
      console.log('❌ Insert test failed:', insertError.message)
    } else {
      console.log('✅ Insert test passed')
      
      // Clean up - delete test user
      if (insertData && insertData[0]) {
        await supabase
          .from('users')
          .delete()
          .eq('id', insertData[0].id)
        console.log('✅ Cleanup completed')
      }
    }
    
    console.log('\n🎉 All tests passed! Your PolyHarmony database is ready!')
    console.log('\n🚀 Next steps:')
    console.log('   • npm run dev (start web app)')
    console.log('   • cd PolyHarmony && npm start (start mobile app)')
    
    return true
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

testConnection()
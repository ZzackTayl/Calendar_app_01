const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testSetup() {
  console.log('🧪 Testing PolyHarmony Development Environment Setup\n')
  
  // Check environment variables
  console.log('📋 Environment Variables Check:')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log(`   Supabase URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`)
  console.log(`   Supabase Key: ${supabaseKey ? '✅ Set' : '❌ Missing'}`)
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ Environment variables not properly configured')
    return
  }
  
  // Test Supabase connection
  console.log('\n🔗 Testing Supabase Connection:')
  try {
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Test basic connection
    const { data, error } = await supabase.auth.getSession()
    if (error && error.message !== 'Auth session missing!') {
      console.log(`   ❌ Connection failed: ${error.message}`)
      return
    }
    console.log('   ✅ Supabase connection successful')
    
    // Test database access (this will fail if schema is not deployed)
    try {
      const { data: users, error: dbError } = await supabase
        .from('users')
        .select('count')
        .limit(1)
      
      if (dbError) {
        console.log(`   ⚠️  Database schema not deployed: ${dbError.message}`)
        console.log('   📝 Next step: Deploy mvp_schema.sql in Supabase dashboard')
      } else {
        console.log('   ✅ Database schema accessible')
      }
    } catch (dbErr) {
      console.log(`   ⚠️  Database test failed: ${dbErr.message}`)
    }
    
  } catch (err) {
    console.log(`   ❌ Supabase connection failed: ${err.message}`)
  }
  
  // Check React Native environment
  console.log('\n📱 React Native Environment Check:')
  const fs = require('fs')
  const path = require('path')
  
  const rnEnvPath = path.join(__dirname, 'PolyHarmony', '.env')
  if (fs.existsSync(rnEnvPath)) {
    console.log('   ✅ React Native .env file exists')
    const rnEnvContent = fs.readFileSync(rnEnvPath, 'utf8')
    const hasUrl = rnEnvContent.includes('EXPO_PUBLIC_SUPABASE_URL')
    const hasKey = rnEnvContent.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY')
    console.log(`   EXPO_PUBLIC_SUPABASE_URL: ${hasUrl ? '✅ Set' : '❌ Missing'}`)
    console.log(`   EXPO_PUBLIC_SUPABASE_ANON_KEY: ${hasKey ? '✅ Set' : '❌ Missing'}`)
  } else {
    console.log('   ❌ React Native .env file missing')
  }
  
  // Check package.json dependencies
  console.log('\n📦 Dependencies Check:')
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'))
    const hasSupabase = packageJson.dependencies['@supabase/supabase-js']
    console.log(`   Next.js @supabase/supabase-js: ${hasSupabase ? '✅ Installed' : '❌ Missing'}`)
    
    const rnPackageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'PolyHarmony', 'package.json'), 'utf8'))
    const rnHasSupabase = rnPackageJson.dependencies['@supabase/supabase-js']
    const rnHasSecureStore = rnPackageJson.dependencies['expo-secure-store']
    console.log(`   React Native @supabase/supabase-js: ${rnHasSupabase ? '✅ Installed' : '❌ Missing'}`)
    console.log(`   React Native expo-secure-store: ${rnHasSecureStore ? '✅ Installed' : '❌ Missing'}`)
  } catch (err) {
    console.log(`   ❌ Error checking dependencies: ${err.message}`)
  }
  
  console.log('\n🎉 Setup Test Complete!')
  console.log('\n📋 Next Steps:')
  console.log('   1. Deploy mvp_schema.sql in Supabase dashboard SQL editor')
  console.log('   2. Run "npm run dev" to start Next.js development server')
  console.log('   3. Run "cd PolyHarmony && npm start" to start React Native development server')
  console.log('   4. Test authentication and database operations in both apps')
}

testSetup().catch(console.error)
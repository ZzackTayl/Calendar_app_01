const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Connecting to Supabase...')
console.log('URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function deploySchema() {
  try {
    // Read the MVP schema file
    const schemaPath = path.join(__dirname, 'mvp_schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')
    
    console.log('Deploying schema...')
    console.log('Schema content preview:', schema.substring(0, 200) + '...')
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`Executing statement ${i + 1}/${statements.length}...`)
      console.log('Statement:', statement.substring(0, 100) + '...')
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      
      if (error) {
        console.error(`Error in statement ${i + 1}:`, error)
        // Continue with other statements
      } else {
        console.log(`Statement ${i + 1} executed successfully`)
      }
    }
    
    console.log('Schema deployment completed!')
    
    // Test the connection by checking if tables exist
    console.log('\nTesting database connection...')
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
    
    if (tablesError) {
      console.error('Error checking tables:', tablesError)
    } else {
      console.log('Tables in database:', tables?.map(t => t.table_name))
    }
    
  } catch (error) {
    console.error('Error deploying schema:', error)
  }
}

deploySchema()
#!/usr/bin/env node

/**
 * Migration script to update SHA-256 password hashes to bcrypt
 * This script should be run once to migrate existing password-protected shares
 */

const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcrypt')
require('dotenv').config()

const SALT_ROUNDS = 12

async function migratePasswordHashes() {
  console.log('🔐 Starting password hash migration...')
  
  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin operations
  )
  
  try {
    // Get all password-protected shares with SHA-256 hashes
    const { data: shares, error } = await supabase
      .from('calendar_shares')
      .select('id, password_hash, share_type')
      .eq('share_type', 'password_protected')
      .not('password_hash', 'is', null)
    
    if (error) {
      console.error('❌ Error fetching shares:', error)
      return
    }
    
    console.log(`📊 Found ${shares.length} password-protected shares to migrate`)
    
    let migratedCount = 0
    let skippedCount = 0
    
    for (const share of shares) {
      try {
        // Check if the hash is already bcrypt (starts with $2b$)
        if (share.password_hash && share.password_hash.startsWith('$2b$')) {
          console.log(`⏭️  Share ${share.id} already uses bcrypt, skipping...`)
          skippedCount++
          continue
        }
        
        // For SHA-256 hashes, we need to generate a new secure password
        // since we can't reverse the hash. We'll create a temporary password
        // that users will need to reset.
        const tempPassword = generateSecurePassword()
        const newHash = await bcrypt.hash(tempPassword, SALT_ROUNDS)
        
        // Update the share with the new hash
        const { error: updateError } = await supabase
          .from('calendar_shares')
          .update({ 
            password_hash: newHash,
            updated_at: new Date().toISOString()
          })
          .eq('id', share.id)
        
        if (updateError) {
          console.error(`❌ Error updating share ${share.id}:`, updateError)
          continue
        }
        
        console.log(`✅ Migrated share ${share.id} - Temporary password: ${tempPassword}`)
        migratedCount++
        
        // Log the migration for audit purposes
        await supabase
          .from('security_audit_log')
          .insert({
            action: 'password_hash_migration',
            table_name: 'calendar_shares',
            record_id: share.id,
            details: {
              old_hash_type: 'sha256',
              new_hash_type: 'bcrypt',
              temp_password: tempPassword,
              migrated_at: new Date().toISOString()
            }
          })
        
      } catch (shareError) {
        console.error(`❌ Error processing share ${share.id}:`, shareError)
      }
    }
    
    console.log(`\n📈 Migration Summary:`)
    console.log(`   ✅ Successfully migrated: ${migratedCount} shares`)
    console.log(`   ⏭️  Already using bcrypt: ${skippedCount} shares`)
    console.log(`   📝 Total processed: ${shares.length} shares`)
    
    if (migratedCount > 0) {
      console.log(`\n⚠️  IMPORTANT: Users with migrated shares need to reset their passwords!`)
      console.log(`   The temporary passwords are shown above.`)
      console.log(`   Consider implementing a password reset notification system.`)
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

function generateSecurePassword(length = 16) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  
  // Ensure at least one character from each required category
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
  password += '0123456789'[Math.floor(Math.random() * 10)]
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)]
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migratePasswordHashes()
    .then(() => {
      console.log('🎉 Migration completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error)
      process.exit(1)
    })
}

module.exports = { migratePasswordHashes }

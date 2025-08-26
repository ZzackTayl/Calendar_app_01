#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Generate a secure 256-bit encryption key for Apple Calendar credential storage
 * 
 * This script generates a cryptographically secure random key suitable for AES-256-GCM encryption.
 * The key is 32 bytes (256 bits) and is output as a 64-character hexadecimal string.
 */

console.log('🔐 Generating secure encryption key for Apple Calendar integration...\n');

// Generate 32 random bytes (256 bits) for AES-256
const encryptionKey = crypto.randomBytes(32).toString('hex');

console.log('✅ Generated 256-bit encryption key:');
console.log(`ENCRYPTION_KEY=${encryptionKey}\n`);

console.log('🔧 Setup Instructions:');
console.log('1. Copy the ENCRYPTION_KEY value above');
console.log('2. Add it to your .env.local file');
console.log('3. Make sure .env.local is in your .gitignore');
console.log('4. NEVER commit this key to version control\n');

console.log('⚠️  Security Notes:');
console.log('- This key encrypts Apple Calendar credentials');
console.log('- Store it securely in your environment variables');
console.log('- Use different keys for different environments');
console.log('- If compromised, regenerate and re-encrypt all credentials\n');

// Optionally write to .env.local if it exists
const envLocalPath = path.join(__dirname, '..', '.env.local');
const envExamplePath = path.join(__dirname, '..', '.env.example');

try {
  let envContent = '';
  
  if (fs.existsSync(envLocalPath)) {
    envContent = fs.readFileSync(envLocalPath, 'utf8');
    
    // Check if ENCRYPTION_KEY already exists
    if (envContent.includes('ENCRYPTION_KEY=')) {
      console.log('⚠️  ENCRYPTION_KEY already exists in .env.local');
      console.log('   Delete the existing line if you want to replace it.');
    } else {
      // Add the key to the end of the file
      envContent += `\n# Apple Calendar Encryption Key (Generated: ${new Date().toISOString()})\nENCRYPTION_KEY=${encryptionKey}\n`;
      fs.writeFileSync(envLocalPath, envContent);
      console.log('✅ Added ENCRYPTION_KEY to .env.local');
    }
  } else {
    console.log('💡 No .env.local file found. Create one and add the ENCRYPTION_KEY manually.');
  }
} catch (error) {
  console.log('⚠️  Could not automatically add to .env.local:', error.message);
  console.log('   Please add the ENCRYPTION_KEY manually to your environment file.');
}

console.log('\n🚀 Your Apple Calendar integration is ready to use secure encryption!');
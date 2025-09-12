#!/usr/bin/env node

/**
 * Get Current Vercel Production URL
 * 
 * This script helps you get your current Vercel production URL
 * which you need to configure in Supabase for email confirmations.
 */

const { execSync } = require('child_process');

async function getCurrentVercelURL() {
  console.log('🔍 Getting current Vercel production URL...\n');

  try {
    // Get the current production deployment
    const deploymentInfo = execSync('vercel list --prod --limit 1', { encoding: 'utf8' });
    console.log('📋 Recent production deployment:');
    console.log(deploymentInfo);

    // Try to get the exact URL
    const urlMatch = deploymentInfo.match(/https:\/\/[^\s]+\.vercel\.app/);
    
    if (urlMatch) {
      const productionURL = urlMatch[0];
      console.log('\n🎯 PRODUCTION URL FOUND:');
      console.log('=' .repeat(50));
      console.log(productionURL);
      console.log('=' .repeat(50));
      
      console.log('\n📝 USE THIS URL IN SUPABASE:');
      console.log('\n1. Site URL:');
      console.log(`   ${productionURL}`);
      
      console.log('\n2. Redirect URLs (add all of these):');
      console.log(`   ${productionURL}/auth/callback`);
      console.log(`   http://localhost:3000/auth/callback`);
      console.log(`   ${productionURL}/auth/confirm-email`);
      console.log(`   ${productionURL}/**`);
      
      console.log('\n🔧 NEXT STEPS:');
      console.log('1. Copy the URLs above');
      console.log('2. Go to https://supabase.com/dashboard');
      console.log('3. Select your project');
      console.log('4. Go to Authentication > URL Configuration');
      console.log('5. Update the Site URL and Redirect URLs');
      console.log('6. Save the changes');
      console.log('7. Test email confirmation again');
      
      return productionURL;
    } else {
      console.log('❌ Could not extract production URL from Vercel output');
      console.log('\n💡 MANUAL ALTERNATIVE:');
      console.log('1. Run: vercel --prod');
      console.log('2. Copy the production URL from the output');
      console.log('3. Use that URL in the Supabase configuration');
      return null;
    }

  } catch (error) {
    console.error('❌ Error getting Vercel URL:', error.message);
    console.log('\n💡 TROUBLESHOOTING:');
    console.log('1. Make sure Vercel CLI is installed: npm install -g vercel');
    console.log('2. Make sure you are logged in: vercel login');
    console.log('3. Make sure you have deployed recently: vercel --prod');
    return null;
  }
}

// Run if called directly
if (require.main === module) {
  getCurrentVercelURL();
}

module.exports = { getCurrentVercelURL };

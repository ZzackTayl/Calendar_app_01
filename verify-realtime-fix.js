/**
 * Verify the real-time connection fix
 * Run after starting the dev server with: node verify-realtime-fix.js
 */

const WebSocket = require('ws');

// Test the debug API endpoint
async function testDebugAPI() {
  try {
    console.log('🔍 Testing debug API endpoint...');

    const response = await fetch('http://localhost:3000/api/debug/realtime');
    const data = await response.json();

    console.log('📊 Debug API Results:');
    console.log(JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('✅ Debug API is working');

      if (data.database.connected) {
        console.log('✅ Database connection: WORKING');
      } else {
        console.log('❌ Database connection: FAILED');
      }

      if (data.realtime.manager.status === 'connected') {
        console.log('✅ Real-time connection: CONNECTED');
      } else {
        console.log('⚠️  Real-time connection: ' + data.realtime.manager.status.toUpperCase());
      }

    } else {
      console.log('❌ Debug API failed:', data.error);
    }

  } catch (error) {
    console.error('❌ Failed to test debug API:', error.message);
  }
}

// Wait for dev server to start
console.log('⏳ Waiting for dev server to start...');
setTimeout(() => {
  testDebugAPI();
}, 3000);

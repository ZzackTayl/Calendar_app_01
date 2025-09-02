# CSRF Debugging Guide

Since the CSRF validation is still failing, let's debug this step by step using your browser's developer tools.

## 🔍 Step 1: Open Browser Developer Tools

1. **Go to your app** at `human-drivensolutions.com`
2. **Sign in** to your account
3. **Open Developer Tools** (F12 or right-click → Inspect)
4. **Go to the Network tab**

## 🔍 Step 2: Monitor Network Requests

1. **Clear the network log** (click the 🚫 icon)
2. **Try to create an event** (fill out the form and click "Create Event")
3. **Look for these specific requests:**

### Expected Requests:
- `GET /api/auth/csrf-token` - Should return a CSRF token
- `POST /api/events` - Should create the event

### What to Check:

#### For `/api/auth/csrf-token` request:
- **Status**: Should be 200 (OK)
- **Response**: Should contain `{"csrf_token": "...", "expires": ...}`
- **If status is 401**: You're not authenticated
- **If status is 500**: Server error

#### For `/api/events` request:
- **Status**: Should be 201 (Created) or 200 (OK)
- **Request Headers**: Should include `X-CSRF-Token: [token]`
- **If status is 403**: CSRF validation failed
- **Response**: Should contain the created event data

## 🔍 Step 3: Check Console Errors

1. **Go to the Console tab** in Developer Tools
2. **Look for any JavaScript errors** when you try to create an event
3. **Common errors to look for:**
   - `Failed to fetch CSRF token`
   - `CSRF validation failed`
   - Network errors
   - Authentication errors

## 🔍 Step 4: Check Application State

1. **Go to the Application tab** in Developer Tools
2. **Check Local Storage** for any CSRF tokens
3. **Check Cookies** for authentication cookies
4. **Look for:**
   - `sb-[project-ref]-auth-token` cookie
   - Any CSRF-related storage

## 🔍 Step 5: Test CSRF Endpoint Directly

1. **In the Console tab**, run this test:
```javascript
// Test CSRF token endpoint
fetch('/api/auth/csrf-token', {
  method: 'GET',
  credentials: 'include'
})
.then(response => {
  console.log('Status:', response.status);
  return response.json();
})
.then(data => {
  console.log('Response:', data);
})
.catch(error => {
  console.error('Error:', error);
});
```

## 🔍 Step 6: Test Event Creation Directly

1. **First get a CSRF token** (run the test above)
2. **Then test event creation:**
```javascript
// Replace [CSRF_TOKEN] with the actual token from step 5
fetch('/api/events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': '[CSRF_TOKEN]'
  },
  credentials: 'include',
  body: JSON.stringify({
    title: 'Test Event',
    description: 'Test Description',
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    privacy_level: 'private'
  })
})
.then(response => {
  console.log('Status:', response.status);
  return response.json();
})
.then(data => {
  console.log('Response:', data);
})
.catch(error => {
  console.error('Error:', error);
});
```

## 🎯 What to Report Back

Please tell me:

1. **What status codes** you see for each request
2. **What error messages** appear in the console
3. **What the response** looks like for the CSRF token request
4. **Whether you see** the `X-CSRF-Token` header in the events request
5. **Any authentication issues** (401 errors)

This will help me identify exactly where the CSRF validation is failing!

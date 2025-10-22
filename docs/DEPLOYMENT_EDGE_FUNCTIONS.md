# Edge Functions & SMS Infrastructure Deployment Guide

**Last Updated:** October 21, 2024  
**Scope:** Deployment instructions for all MyOrbit edge functions and SMS services

---

## Overview

This guide covers deploying three core edge functions:
1. **send-contact-invitation-email** - Send email invitations via Resend
2. **send-contact-invitation-sms** - Send SMS invitations via Twilio  
3. **send-ai-agent-sms** - AI agent SMS outreach and messaging
4. **handle-inbound-sms** - Webhook handler for inbound SMS replies

---

## Prerequisites

- Supabase project already created
- Supabase CLI installed (`npm install -g supabase`)
- Authenticated with Supabase (`supabase login`)
- Twilio account (for SMS functionality)
- Resend account (for email functionality)

---

## Part 1: Database Setup

### 1.1 Apply SMS Conversations Migration

Deploy the database table for tracking SMS conversations:

```bash
cd /path/to/calendar_app
supabase migrations up
```

This creates the `sms_conversations` table with proper indexes and RLS policies.

---

## Part 2: Email Setup (Resend)

### 2.1 Create Resend Account & API Key

1. Go to https://resend.com
2. Sign up and create a new account
3. Navigate to API Keys
4. Create a new API key
5. Copy the key (you'll need it in step 2.3)

### 2.2 Configure Domain (Optional but Recommended)

For production, add your domain:
1. In Resend dashboard, go to "Domains"
2. Add your domain (e.g., `myorbit.app`)
3. Configure DNS records as shown in Resend
4. Once verified, use `invitations@myorbit.app` as sender

For testing/MVP, use Resend's default sender: `onboarding@resend.dev`

### 2.3 Set Resend Secret in Supabase

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
```

Replace `re_xxxx...` with your actual Resend API key.

### 2.4 Verify Email Function

Test the email function:

```bash
supabase functions invoke send-contact-invitation-email \
  --body '{
    "sender_id": "user-id-here",
    "recipient_name": "John Doe",
    "recipient_email": "john@example.com",
    "personal_message": "Hey, let'"'"'s sync up!"
  }'
```

---

## Part 3: SMS Setup (Twilio)

### 3.1 Create Twilio Account

1. Go to https://www.twilio.com/console
2. Sign up for a free account (includes $15 free credit)
3. Navigate to "Account" → "Settings"
4. Note your **Account SID** and **Auth Token**

### 3.2 Get a Twilio Phone Number

1. In Twilio Console, go to "Phone Numbers" → "Manage"
2. Click "Buy a Number" (or use trial number)
3. Choose country and search for available numbers
4. Purchase and note the number (e.g., `+1 (XXX) XXX-XXXX`)

**Important:** Twilio phone numbers must be in E.164 format (e.g., `+12025551234`)

### 3.3 Set Twilio Secrets in Supabase

```bash
supabase secrets set \
  TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  TWILIO_AUTH_TOKEN=your_auth_token_here \
  TWILIO_PHONE_NUMBER=+12025551234
```

Replace with your actual credentials.

### 3.4 Configure Webhook URL (For Inbound SMS)

In Twilio Console:
1. Go to "Phone Numbers" → "Manage" → Select your number
2. In "Messaging" section, find "A Message Comes In"
3. Select "Webhook" and paste your webhook URL:

```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/handle-inbound-sms
```

Replace `YOUR_PROJECT_ID` with your actual Supabase project ID.

4. Method: **HTTP POST**
5. Save

### 3.5 Set Webhook URL Secret in Supabase

```bash
supabase secrets set \
  TWILIO_WEBHOOK_URL=https://YOUR_PROJECT_ID.supabase.co/functions/v1/handle-inbound-sms
```

---

## Part 4: Deploy Edge Functions

### 4.1 Deploy Contact Invitation Email Function

```bash
supabase functions deploy send-contact-invitation-email
```

### 4.2 Deploy Contact Invitation SMS Function

```bash
supabase functions deploy send-contact-invitation-sms
```

### 4.3 Deploy AI Agent SMS Function

```bash
supabase functions deploy send-ai-agent-sms
```

### 4.4 Deploy Inbound SMS Webhook Handler

```bash
supabase functions deploy handle-inbound-sms
```

### 4.5 Verify All Functions Deployed

```bash
supabase functions list
```

You should see all four functions listed with status "ACTIVE".

---

## Part 5: Testing

### 5.1 Test Email Invitations

```bash
supabase functions invoke send-contact-invitation-email \
  --body '{
    "sender_id": "YOUR_USER_ID",
    "recipient_name": "Test User",
    "recipient_email": "your-test-email@example.com",
    "personal_message": "Testing email invitation system"
  }'
```

Check your email inbox for the invitation.

### 5.2 Test SMS Contact Invitations

For SMS contact invitations (limited number of attempts with Twilio trial account):

```bash
supabase functions invoke send-contact-invitation-sms \
  --body '{
    "sender_id": "YOUR_USER_ID",
    "recipient_name": "John",
    "recipient_phone_number": "+1XXXXXXXXXX",
    "personal_message": "Join me on MyOrbit"
  }'
```

Replace `+1XXXXXXXXXX` with a real phone number in E.164 format.

### 5.3 Test AI Agent SMS

```bash
supabase functions invoke send-ai-agent-sms \
  --body '{
    "user_id": "YOUR_USER_ID",
    "recipient_phone_number": "+1XXXXXXXXXX",
    "message_body": "Hi! This is an AI agent checking your availability for next Tuesday.",
    "agent_type": "availability",
    "context_data": {"event_id": "abc123", "event_name": "Team Standup"}
  }'
```

### 5.4 Check SMS Conversation Logs

View all SMS conversations for a phone number:

```bash
supabase functions invoke query-sms-conversations \
  --body '{
    "phone_number": "+1XXXXXXXXXX"
  }'
```

Or query directly in Supabase:
1. Go to SQL Editor
2. Run: `SELECT * FROM sms_conversations ORDER BY created_at DESC LIMIT 10;`

---

## Part 6: Environment Variables Summary

Here's a checklist of all secrets that need to be set:

```bash
# Resend (Email)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx

# Twilio (SMS)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
TWILIO_WEBHOOK_URL=https://YOUR_PROJECT_ID.supabase.co/functions/v1/handle-inbound-sms

# Supabase (automatically available)
# SUPABASE_URL=https://xxx.supabase.co
# SUPABASE_ANON_KEY=eyJ...
# SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Part 7: Troubleshooting

### Email Issues

**Problem:** "Resend API key not configured"
- **Solution:** Verify secret was set: `supabase secrets list`
- **Solution:** Check email function logs in Supabase dashboard

**Problem:** Emails going to spam
- **Solution:** Set up domain verification in Resend
- **Solution:** Use authenticated domain in send address

**Problem:** "Email service unavailable"
- **Solution:** Check Resend API status: https://status.resend.com

### SMS Issues

**Problem:** "SMS service unavailable"
- **Solution:** Verify Twilio credentials: `supabase secrets list`
- **Solution:** Check Twilio account has available credit
- **Solution:** Verify phone number is in E.164 format

**Problem:** "Invalid phone number format"
- **Solution:** Phone must be in E.164 format: +[country_code][number]
  - ✅ Correct: `+12025551234`
  - ❌ Wrong: `202-555-1234` or `2025551234`

**Problem:** Inbound SMS not being received
- **Solution:** Verify webhook URL in Twilio console
- **Solution:** Check `handle-inbound-sms` function logs in Supabase
- **Solution:** Ensure phone number matches a user's phone in profiles table

**Problem:** "Unauthorized" error
- **Solution:** Verify user_id matches authenticated user
- **Solution:** Check RLS policies on sms_conversations table

### General Issues

**Problem:** Function deploy fails
- **Solution:** Verify Supabase CLI is authenticated: `supabase projects list`
- **Solution:** Check function syntax with `deno check path/to/function/index.ts`

**Problem:** Function logs not showing
- **Solution:** Check Supabase dashboard: Settings → Logs → Edge Functions
- **Solution:** Verify function deployment completed: `supabase functions list`

---

## Part 8: API Usage in Flutter App

### Send Email Invitation
```dart
final result = await ContactInvitationApi.sendContactInvitation(
  recipientName: 'John Doe',
  recipientEmail: 'john@example.com',
  method: 'email',
  personalMessage: 'Hey, let\'s sync up!',
);
```

### Send SMS Contact Invitation
```dart
final result = await ContactInvitationApi.sendContactInvitation(
  recipientName: 'John Doe',
  recipientEmail: 'john@example.com',
  method: 'sms',
  recipientPhoneNumber: '+12025551234',
  personalMessage: 'Hey, let\'s sync up!',
);
```

### Send AI Agent SMS
```dart
final result = await AiAgentSmsApi.sendAiAgentSms(
  phoneNumber: '+12025551234',
  messageBody: 'Hi! What\'s your availability next Tuesday?',
  agentType: 'availability',
  contextData: {'event_id': 'abc123', 'event_name': 'Team Standup'},
);

if (result.isSuccess) {
  print('SMS sent with SID: ${result.value}');
} else {
  print('Failed to send SMS: ${result.error}');
}
```

### Get SMS Conversation History
```dart
final result = await AiAgentSmsApi.getSmsConversationHistory('+12025551234');

if (result.isSuccess) {
  for (final msg in result.value) {
    print('${msg['direction']}: ${msg['message_body']}');
  }
}
```

### Stream SMS Conversations (Real-time)
```dart
AiAgentSmsApi.streamRecentSmsConversations().listen((conversations) {
  print('Got ${conversations.length} recent SMS conversations');
});
```

---

## Part 9: Monitoring & Maintenance

### Check Edge Function Health

```bash
supabase functions describe send-contact-invitation-email
supabase functions describe send-ai-agent-sms
supabase functions describe handle-inbound-sms
```

### View Logs

In Supabase Dashboard:
1. Go to Edge Functions
2. Click on function name
3. View recent invocations and logs

### Rotate Credentials (Recommended Quarterly)

**For Twilio:**
1. Go to Twilio console
2. Generate new Auth Token
3. Update secret: `supabase secrets set TWILIO_AUTH_TOKEN=new_token`

**For Resend:**
1. Go to Resend dashboard
2. Create new API key
3. Update secret: `supabase secrets set RESEND_API_KEY=new_key`
4. Delete old key

---

## Part 10: Production Checklist

- [ ] SMS conversations table migrated
- [ ] All edge functions deployed
- [ ] Resend API key configured
- [ ] Twilio credentials configured
- [ ] Webhook URL configured in Twilio
- [ ] Email function tested with real recipient
- [ ] SMS function tested with valid phone
- [ ] Database RLS policies reviewed
- [ ] Error logging monitored
- [ ] Budget alerts set up in Twilio
- [ ] Domain verified in Resend (optional)
- [ ] SMS rate limits understood (Twilio account limits)
- [ ] Backup phone number noted for testing

---

## Costs

### Twilio SMS
- Inbound SMS: ~$0.0075 per message
- Outbound SMS: ~$0.0075 per message
- Phone number: ~$1/month per number
- At your estimated volume (43k messages/month): ~$645/month

### Resend Email
- Free: Up to 100/month
- Paid: $20/month for 10,000/month
- At your estimated volume: ~$20/month

### Total Monthly: ~$665/month

---

## Support

- **Twilio Support:** https://www.twilio.com/help
- **Resend Support:** https://resend.com/support
- **Supabase Support:** https://supabase.com/support
- **Project Logs:** Supabase Dashboard → Logs → Edge Functions

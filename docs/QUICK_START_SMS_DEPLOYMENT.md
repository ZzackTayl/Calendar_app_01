# Quick Start: SMS & Email Deployment (5-Minute Setup)

**For:** Founder ready to deploy SMS infrastructure  
**Time:** ~20 minutes total (5 min signup + 15 min config)

---

## Step 1: Get Resend API Key (5 minutes)

1. Go to https://resend.com
2. Sign up with email
3. Navigate to **API Keys** (left sidebar)
4. Click **Create API Key**
5. Copy the key that starts with `re_`
6. Save it somewhere safe

**Your key looks like:** `re_xxxxxxxxxxxxxxxx`

---

## Step 2: Get Twilio Credentials (5 minutes)

1. Go to https://www.twilio.com/console
2. Sign up (free trial includes $15 credit)
3. **Note down your Account SID** from dashboard
4. **Note down your Auth Token** from dashboard
5. Go to **Phone Numbers** → **Buy a Number**
6. Select country (e.g., United States)
7. Choose any available number and buy it
8. **Note down your phone number** (e.g., +1 (XXX) XXX-XXXX)

**You'll need:**
- Account SID: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Auth Token: `long_string_of_characters`
- Phone Number: `+1234567890` (in E.164 format)

---

## Step 3: Configure Twilio Webhook (2 minutes)

1. In Twilio console, go to **Phone Numbers** → **Manage Numbers**
2. Click your purchased number
3. Scroll to **Messaging** section
4. Under **A Message Comes In**, select **Webhook**
5. Paste this URL (replace PROJECT_ID with your Supabase project ID):
   ```
   https://PROJECT_ID.supabase.co/functions/v1/handle-inbound-sms
   ```
6. Method: **HTTP POST**
7. Click **Save**

**Find your Project ID:**
- Supabase Dashboard → Settings → General → Project URL
- Extract from URL: `https://PROJECT_ID.supabase.co`

---

## Step 4: Deploy Everything (3 commands)

Open terminal and run these 3 commands from your project root:

### Command 1: Set Resend Key
```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
```

### Command 2: Set Twilio Credentials
```bash
supabase secrets set \
  TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  TWILIO_AUTH_TOKEN=your_auth_token_here \
  TWILIO_PHONE_NUMBER=+1234567890 \
  TWILIO_WEBHOOK_URL=https://PROJECT_ID.supabase.co/functions/v1/handle-inbound-sms
```

### Command 3: Deploy Functions & Migrate Database
```bash
supabase migrations up && \
supabase functions deploy send-contact-invitation-email && \
supabase functions deploy send-contact-invitation-sms && \
supabase functions deploy send-ai-agent-sms && \
supabase functions deploy handle-inbound-sms
```

---

## Step 5: Verify It Works (2 minutes)

### Test Email Invitation

In Supabase Dashboard, go to **SQL Editor** and run:
```sql
SELECT auth.uid() as my_user_id;
```

Copy your user ID, then in terminal:
```bash
supabase functions invoke send-contact-invitation-email \
  --body '{
    "sender_id": "your-user-id-from-above",
    "recipient_name": "Test Person",
    "recipient_email": "your-test-email@example.com",
    "personal_message": "Testing SMS/Email system"
  }'
```

✅ Check your email inbox for the invitation

### Test SMS Invitation

```bash
supabase functions invoke send-contact-invitation-sms \
  --body '{
    "sender_id": "your-user-id-from-above",
    "recipient_name": "Test",
    "recipient_phone_number": "+12025551234",
    "personal_message": "Hi from MyOrbit"
  }'
```

✅ You should receive an SMS (if phone is real and Twilio has credit)

### Test AI Agent SMS

```bash
supabase functions invoke send-ai-agent-sms \
  --body '{
    "user_id": "your-user-id-from-above",
    "recipient_phone_number": "+12025551234",
    "message_body": "Hi! What time works for you next Tuesday?",
    "agent_type": "availability",
    "context_data": {"event_type": "meeting"}
  }'
```

✅ Should see SMS sent in Twilio console

---

## You're Done! 🎉

Your SMS infrastructure is now live. Next steps:

1. **Build your AI agents** - Modify `triggerOutreachAgent()`, `triggerAvailabilityAgent()`, etc. in `handle-inbound-sms/index.ts`

2. **Start using SMS in your app** - Call from Flutter:
   ```dart
   await AiAgentSmsApi.sendAiAgentSms(
     phoneNumber: '+12025551234',
     messageBody: 'Your message here',
     agentType: 'availability',
   );
   ```

3. **Monitor** - Check SMS conversations in Supabase:
   ```sql
   SELECT * FROM sms_conversations ORDER BY created_at DESC LIMIT 20;
   ```

---

## Troubleshooting

**"RESEND_API_KEY not set"**
→ Run: `supabase secrets set RESEND_API_KEY=re_xxx...`

**"TWILIO credentials missing"**
→ Run all three `supabase secrets set` commands above

**Email not arriving**
→ Check spam folder, or verify Resend domain in dashboard

**SMS not arriving**
→ Make sure phone number is real and Twilio account has credit

**Webhook not firing**
→ Verify webhook URL in Twilio console (no typos)

---

## Monthly Cost Check

| Service | Estimate | Link |
|---------|----------|------|
| Twilio SMS | ~$322/mo | https://www.twilio.com/pricing |
| Resend Email | ~$20/mo | https://resend.com/pricing |
| **Total** | **~$342/mo** | — |

Monitor usage in respective dashboards.

---

## Full Documentation

For detailed info, see:
- `docs/DEPLOYMENT_EDGE_FUNCTIONS.md` - Complete setup guide
- `docs/SMS_IMPLEMENTATION_SUMMARY.md` - Architecture overview

---

That's it! Your SMS system is ready to go. 🚀

# Founder Guide: Enabling Secure SMS via Supabase Edge Functions

**Audience:** Founder / operator (no coding required)  
**Purpose:** Deploy the `send-contact-invitation-sms` Edge Function, store Twilio credentials securely, and verify SMS delivery.  
**Last Updated:** October 20, 2025

---

## 1. Prerequisites
- Supabase project already created (per `FOUNDER_AUTH_SETUP_GUIDE.md`)
- Twilio account with:
  - Account SID
  - Auth Token
  - Verified sender phone number (E.164 format, e.g. `+15551234567`)
- Supabase CLI installed locally  
  ```bash
  npm install -g supabase
  supabase --version
  ```

## 2. Authenticate Supabase CLI
```bash
supabase login
```
Paste the personal access token from the Supabase dashboard when prompted.

## 3. Set Twilio Secrets (per environment)
Run the following from the repository root, replacing the placeholder values with your real Twilio credentials:

```bash
supabase secrets set \
  TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  TWILIO_AUTH_TOKEN=your_auth_token \
  TWILIO_PHONE_NUMBER=+15551234567
```

Repeat this command for each Supabase environment (`dev`, `staging`, `prod`) by passing the `--project-ref <project-id>` flag if you manage more than one project:

```bash
supabase secrets set \
  --project-ref myorbit-staging \
  TWILIO_ACCOUNT_SID=AC... \
  TWILIO_AUTH_TOKEN=... \
  TWILIO_PHONE_NUMBER=...
```

> **Tip:** Secrets live exclusively inside Supabase. They will not be bundled into the mobile app.

## 4. Deploy the Edge Function
```bash
supabase functions deploy send-contact-invitation-sms
```

This uploads the updated function under `supabase/functions/send-contact-invitation-sms/index.ts`.

## 5. Verify Access Policy (one-time)
Edge functions run with the caller’s Supabase session. No extra setup is required, but confirm that:
- The client app is authenticated before invoking the function.
- The Supabase project URL and anon key are correctly configured in `.env`.

## 6. Test the Flow
1. Launch the app on a device/emulator and sign in.
2. Send an SMS invitation to your own verified number.
3. Confirm the function returns `{ ok: true, sid: "<Twilio SID>" }` and the message arrives.
4. In Supabase dashboard, inspect Edge Function logs for confirmation (Settings → Logs → Edge Functions).

## 7. Ongoing Maintenance
- Rotate Twilio credentials directly in Supabase with `supabase secrets set ...` whenever needed.
- Review Supabase Edge Function logs regularly for abuse or errors.
- If you pause SMS temporarily, run `supabase secrets unset TWILIO_ACCOUNT_SID ...` to disable the function without code changes.

## 8. Support
- **Supabase CLI docs:** https://supabase.com/docs/guides/cli  
- **Twilio console:** https://www.twilio.com/console  
- **Supabase support:** https://supabase.com/support  

Keep this guide next to your founder setup checklist so you can redeploy or rotate secrets quickly after each release.

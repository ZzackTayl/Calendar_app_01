# Resend Verification Email Edge Function

This Supabase Edge Function allows users to resend their email verification link.

## Features

- ✅ Rate limiting (3 requests per 15 minutes per user)
- ✅ Authentication required
- ✅ Validates email belongs to the authenticated user
- ✅ Checks if email is already verified
- ✅ Uses Supabase Admin API to generate verification links

## Deployment

To deploy this edge function to Supabase:

```bash
# Deploy the function
supabase functions deploy resend-verification-email

# Set required environment variables (if not already set)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase secrets set APP_URL=https://myorbit.app
```

## Environment Variables

The function requires these environment variables:
- `SUPABASE_URL` - Your Supabase project URL (automatically available)
- `SUPABASE_ANON_KEY` - Your Supabase anon key (automatically available)
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin API)
- `APP_URL` - Your app URL for redirect after verification (optional, defaults to https://myorbit.app)

## API Usage

### Request

```bash
POST https://your-project.supabase.co/functions/v1/resend-verification-email
Authorization: Bearer <user-session-token>
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Success Response (200)

```json
{
  "ok": true,
  "message": "Verification email sent"
}
```

### Error Responses

#### Already Verified (400)
```json
{
  "error": "email already verified",
  "alreadyVerified": true
}
```

#### Rate Limited (429)
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "remaining": 0,
  "resetAt": "2024-01-01T12:00:00.000Z"
}
```

#### Unauthorized (401)
```json
{
  "error": "unauthorized"
}
```

#### Email Mismatch (403)
```json
{
  "error": "email mismatch"
}
```

## Rate Limiting

- **Limit**: 3 requests per 15 minutes per user
- **Action Key**: `resend_verification_email`
- Uses the shared `rate-limiter.ts` module

## Testing

Test the function locally:

```bash
# Start Supabase locally
supabase start

# Deploy function locally
supabase functions serve resend-verification-email

# Test with curl (replace with actual session token)
curl -X POST http://localhost:54321/functions/v1/resend-verification-email \
  -H "Authorization: Bearer <session-token>" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## Implementation Details

1. **Authentication**: Verifies user is authenticated via Supabase Auth
2. **Authorization**: Ensures the email being verified belongs to the authenticated user
3. **Rate Limiting**: Prevents abuse by limiting requests to 3 per 15 minutes
4. **Verification Check**: Returns success if email is already verified
5. **Admin API**: Uses Supabase Admin API with service role key to generate verification links
6. **Email Delivery**: Supabase Auth automatically sends the verification email

## Client Integration

The Flutter app calls this function in `email_verification_screen.dart`:

```dart
final response = await client.functions.invoke(
  'resend-verification-email',
  body: {'email': widget.email},
);
```

The screen handles:
- Loading state while sending
- Success message display
- Error handling
- 60-second cooldown timer after successful send

# Group Invitation System - Setup & Configuration Guide

## Overview

The PolyHarmony Calendar App includes a complete group invitation system that allows users to invite others via shareable links. This system supports both individual friend invitations and group invitations with automatic email notifications.

## 🎯 Features Implemented

### ✅ Core Features
- **Shareable Invitation Links**: Secure token-based links that users can send to friends
- **Group & Individual Invitations**: Support for both friend requests and group memberships
- **Email Notifications**: Automatic email sending when invitations are created
- **Rate Limiting**: Prevents spam with configurable invitation limits
- **Token Security**: SHA-256 hashed tokens with expiration
- **Signup Integration**: New users can accept invitations during account creation
- **Permission Management**: Users set their own privacy permissions when accepting

### ✅ Technical Components
- **Backend APIs**: Complete REST endpoints for invitation CRUD operations
- **Database Schema**: Tables for invitations, tokens, and permissions
- **Frontend Pages**: Invitation acceptance page with token validation
- **Email Templates**: Professional HTML/text email templates
- **Validation**: Comprehensive input validation and error handling
- **Cleanup**: Automatic expired invitation cleanup

## 🚀 Quick Start

### 1. Database Setup
The invitation system requires these tables (already in your schema):
- `invitations` - Individual friend invitations
- `group_invitations` - Group membership invitations
- `invitation_tokens` - Secure tokens for individual invitations
- `group_invitation_tokens` - Secure tokens for group invitations

### 2. Environment Variables
Add these to your `.env.local`:

```env
# Email Service Configuration
INVITATION_FROM_EMAIL=invites@yourdomain.com
INVITATION_FROM_NAME="Your App Name"

# App URL for generating invitation links
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Email Service Provider Settings (choose one)
# SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key

# AWS SES
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Resend
RESEND_API_KEY=your_resend_api_key

# Nodemailer (SMTP)
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

### 3. Email Service Integration
Replace the console email provider with your preferred service:

```typescript
// lib/email/invitation-service.ts
import { SendGridEmailProvider } from './providers/sendgrid';

export function createInvitationEmailService(): InvitationEmailService {
  const emailProvider = new SendGridEmailProvider(process.env.SENDGRID_API_KEY!);
  return new InvitationEmailService(emailProvider);
}
```

## 📧 Email Service Providers

### Option 1: SendGrid (Recommended)
```bash
npm install @sendgrid/mail
```

Create `lib/email/providers/sendgrid.ts`:
```typescript
import sgMail from '@sendgrid/mail';
import { EmailServiceProvider, EmailSendResult } from '../invitation-service';

export class SendGridEmailProvider implements EmailServiceProvider {
  constructor(apiKey: string) {
    sgMail.setApiKey(apiKey);
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
  }): Promise<EmailSendResult> {
    try {
      const [response] = await sgMail.send({
        to: options.to,
        from: options.from || process.env.INVITATION_FROM_EMAIL!,
        subject: options.subject,
        html: options.html,
        text: options.text
      });

      return {
        success: true,
        messageId: response.headers['x-message-id'] as string
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email'
      };
    }
  }
}
```

### Option 2: Resend
```bash
npm install resend
```

Create `lib/email/providers/resend.ts`:
```typescript
import { Resend } from 'resend';
import { EmailServiceProvider, EmailSendResult } from '../invitation-service';

export class ResendEmailProvider implements EmailServiceProvider {
  private resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
  }): Promise<EmailSendResult> {
    try {
      const { data, error } = await this.resend.emails.send({
        from: options.from || process.env.INVITATION_FROM_EMAIL!,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        messageId: data?.id
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email'
      };
    }
  }
}
```

### Option 3: AWS SES
```bash
npm install @aws-sdk/client-ses
```

Create `lib/email/providers/aws-ses.ts`:
```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { EmailServiceProvider, EmailSendResult } from '../invitation-service';

export class AWSEmailProvider implements EmailServiceProvider {
  private sesClient: SESClient;

  constructor() {
    this.sesClient = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
      }
    });
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
  }): Promise<EmailSendResult> {
    try {
      const command = new SendEmailCommand({
        Source: options.from || process.env.INVITATION_FROM_EMAIL!,
        Destination: {
          ToAddresses: [options.to]
        },
        Message: {
          Subject: {
            Data: options.subject,
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: options.html,
              Charset: 'UTF-8'
            },
            Text: options.text ? {
              Data: options.text,
              Charset: 'UTF-8'
            } : undefined
          }
        }
      });

      const response = await this.sesClient.send(command);

      return {
        success: true,
        messageId: response.MessageId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email'
      };
    }
  }
}
```

## 🔧 API Endpoints

### Create Individual Invitation
```
POST /api/invitations/create
```
```json
{
  "recipient_email": "friend@example.com",
  "recipient_phone": "+1234567890",
  "message": "Let's stay connected!",
  "invitation_type": "friend_request"
}
```

### Create Group Invitation
```
POST /api/groups/invitations/create
```
```json
{
  "group_id": "uuid",
  "invitee_email": "member@example.com",
  "invitee_phone": "+1234567890",
  "message": "Join our team group!"
}
```

### Accept Invitation (Token)
```
POST /api/invitations/accept/{token}
```

### Validate Invitation
```
GET /api/invitations/validate/{token}
```

## 🎨 Frontend Components

### Using the Invitation Components
```tsx
import { InvitationSender } from '@/components/ui/invitation-sender';
import { GroupInvitationSender } from '@/components/ui/group-invitation-sender';
import { InvitationList } from '@/components/ui/invitation-list';

// Send friend invitations
<InvitationSender onInvitationSent={() => console.log('Sent!')} />

// Send group invitations
<GroupInvitationSender 
  groupId="group-uuid"
  groupName="My Group"
  onInvitationSent={() => console.log('Group invite sent!')}
/>

// List received invitations
<InvitationList 
  onInvitationAccepted={() => console.log('Accepted!')}
  onInvitationDeclined={() => console.log('Declined!')}
/>
```

### Invitation Acceptance Page
The system automatically handles invitation links at:
- `/invitations/accept/{token}` - Main acceptance page
- User signup/signin flows include invitation context

## ⚙️ Configuration Options

### Rate Limiting
Modify in `lib/invitations/token-utils.ts`:
```typescript
export async function checkInvitationRateLimit(
  userId: string,
  windowMinutes: number = 60,    // Time window
  maxInvitations: number = 10    // Max invitations per window
): Promise<RateLimitResult>
```

### Token Expiration
Default: 30 days. Modify in invitation creation APIs:
```typescript
expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
```

### Email Template Customization
Edit templates in `lib/email/invitation-service.ts`:
- `generateIndividualInvitationTemplate()`
- `generateGroupInvitationTemplate()`
- `generateTextVersion()`

## 🔒 Security Features

### Token Security
- SHA-256 hashed tokens stored in database
- Unique tokens per invitation
- Single-use tokens (marked as used)
- Expiration timestamps
- IP and user agent tracking

### Rate Limiting
- Per-user invitation limits
- Configurable time windows
- Combined limits for individual + group invitations

### Validation
- Email format validation
- Required field validation
- Permission checks (group membership, invite permissions)
- Duplicate invitation prevention

## 🧪 Testing the System

### 1. Test Invitation Creation
```bash
# Individual invitation
curl -X POST http://localhost:3000/api/invitations/create \
  -H "Content-Type: application/json" \
  -d '{"recipient_email": "test@example.com", "message": "Test invite"}'

# Group invitation  
curl -X POST http://localhost:3000/api/groups/invitations/create \
  -H "Content-Type: application/json" \
  -d '{"group_id": "uuid", "invitee_email": "test@example.com"}'
```

### 2. Test Token Validation
```bash
curl http://localhost:3000/api/invitations/validate/{token}
```

### 3. Test Acceptance Flow
1. Create invitation → Get invite link
2. Visit link in browser → Should show acceptance page
3. Sign up/sign in → Should automatically accept invitation

## 🐛 Troubleshooting

### Common Issues

#### Email Not Sending
1. Check environment variables
2. Verify email service credentials
3. Check console logs for email errors
4. Test with ConsoleEmailProvider first

#### Invalid Token Errors
1. Check token expiration
2. Verify token hasn't been used
3. Check database token hash

#### Rate Limit Issues
1. Adjust limits in `checkInvitationRateLimit()`
2. Clear test data from database
3. Wait for rate limit window to reset

#### Database Errors
1. Run migrations: `supabase db reset`
2. Check table structure matches schema
3. Verify foreign key constraints

### Debug Mode
Enable debug logging:
```typescript
// In invitation APIs
console.log('Invitation data:', invitationData);
console.log('Token generated:', { token, tokenHash });
console.log('Email send result:', emailResult);
```

## 📈 Monitoring & Analytics

### Key Metrics to Track
- Invitation creation rate
- Acceptance rate by type (individual vs group)
- Email delivery success rate
- Token usage and expiration
- User signup conversion from invitations

### Database Queries for Metrics
```sql
-- Invitation acceptance rate
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM invitations 
GROUP BY status;

-- Recent invitation activity
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as invitations_sent
FROM invitations 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date;
```

## 🚀 Production Deployment

### Pre-Deployment Checklist
- [ ] Email service configured and tested
- [ ] Environment variables set
- [ ] Database migrations applied  
- [ ] Rate limits configured appropriately
- [ ] Email templates reviewed and branded
- [ ] Domain configured for email sending
- [ ] HTTPS enabled for invitation links
- [ ] Error monitoring setup

### Performance Considerations
- Use connection pooling for database
- Implement email queue for high volume
- Add Redis for rate limiting state
- Monitor invitation API response times
- Set up alerts for email delivery failures

## 🔗 Related Documentation
- [Database Schema](./schemas/polyharmony_schema.sql)
- [API Documentation](./api-docs.md)
- [Frontend Components](./components-guide.md)
- [Authentication System](./auth-setup.md)

---

## Need Help?

If you encounter issues or need to customize the invitation system further:

1. Check the troubleshooting section above
2. Review the console logs for error details
3. Test with the ConsoleEmailProvider to isolate email issues
4. Verify your database schema matches the expected structure

The invitation system is designed to be production-ready with proper error handling, security measures, and extensibility for future enhancements.

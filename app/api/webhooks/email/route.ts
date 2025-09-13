import { NextResponse } from 'next/server';
/**
 * Email Webhook Handler
 * 
 * Handles webhooks from email service providers (Resend, SendGrid, etc.)
 * to track email delivery status and update monitoring metrics.
 */

import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { EmailWebhookHandlers, emailMonitor } from '@/lib/monitoring/email-monitoring';
import { createHmac, timingSafeEqual } from 'crypto';

// Webhook verification for different providers
class WebhookVerifier {
  static verifyResend(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    const providedSignature = signature.replace('sha256=', '');
    
    return timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
  }

  static verifySendGrid(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('base64');
    
    return timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  }
}

export async function POST(request: NextRequest) {
  const api = createApiResponse();

  try {
    const provider = request.nextUrl.searchParams.get('provider');
    const rawBody = await request.text();
    
    // Verify webhook signature based on provider
    const isVerified = await verifyWebhook(provider, rawBody, request);
    
    if (!isVerified) {
      console.error('Webhook signature verification failed');
      return api.error(ErrorCode.UNAUTHORIZED);
    }

    // Parse payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error('Invalid JSON payload:', error);
      return api.error(ErrorCode.VALIDATION_ERROR);
    }

    // Process webhook based on provider
    switch (provider) {
      case 'resend':
        EmailWebhookHandlers.handleResendWebhook(payload);
        break;
        
      case 'sendgrid':
        // SendGrid sends an array of events
        const events = Array.isArray(payload) ? payload : [payload];
        EmailWebhookHandlers.handleSendGridWebhook(events);
        break;
        
      default:
        console.warn(`Unknown email provider: ${provider}`);
        return api.error(ErrorCode.VALIDATION_ERROR);
    }

    console.log(`✅ Processed ${provider} webhook successfully`);
    
    return api.success({ success: true });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}

async function verifyWebhook(
  provider: string | null, 
  payload: string, 
  request: NextRequest
): Promise<boolean> {
  // In development, skip verification for testing
  if (process.env.NODE_ENV === 'development' && !process.env.WEBHOOK_VERIFY_IN_DEV) {
    return true;
  }

  const signature = request.headers.get('signature') || 
                   request.headers.get('x-webhook-signature') ||
                   request.headers.get('authorization');
  
  if (!signature) {
    console.error('Missing webhook signature');
    return false;
  }

  try {
    switch (provider) {
      case 'resend':
        const resendSecret = process.env.RESEND_WEBHOOK_SECRET;
        if (!resendSecret) {
          console.error('RESEND_WEBHOOK_SECRET not configured');
          return false;
        }
        return WebhookVerifier.verifyResend(payload, signature, resendSecret);
        
      case 'sendgrid':
        const sendgridSecret = process.env.SENDGRID_WEBHOOK_SECRET;
        if (!sendgridSecret) {
          console.error('SENDGRID_WEBHOOK_SECRET not configured');
          return false;
        }
        return WebhookVerifier.verifySendGrid(payload, signature, sendgridSecret);
        
      default:
        console.error(`No verification method for provider: ${provider}`);
        return false;
    }
  } catch (error) {
    console.error('Webhook verification error:', error);
    return false;
  }
}

// Handle other HTTP methods
export async function GET(request: NextRequest) {
  return api.success(
    { 
      message: 'Email webhook endpoint',
      endpoints: {
        resend: '/api/webhooks/email?provider=resend',
        sendgrid: '/api/webhooks/email?provider=sendgrid'
      }
    },
    { status: 200 }
  );
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Signature',
    },
  });
}
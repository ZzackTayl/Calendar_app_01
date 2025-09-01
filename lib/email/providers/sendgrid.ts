import * as sgMail from '@sendgrid/mail';
import { EmailServiceProvider, EmailSendResult } from '../invitation-service';

export class SendGridEmailProvider implements EmailServiceProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
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
      // Validate required parameters
      if (!this.apiKey || !this.apiKey.startsWith('SG.')) {
        throw new Error('Valid SendGrid API key is required');
      }

      if (!options.to || !options.subject || !options.html) {
        throw new Error('Missing required email parameters: to, subject, html');
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(options.to)) {
        throw new Error(`Invalid recipient email address: ${options.to}`);
      }

      const fromEmail = options.from || process.env.INVITATION_FROM_EMAIL || 'noreply@polyharmony.app';
      
      // Prepare email data with mobile optimization headers
      const emailData = {
        to: options.to,
        from: fromEmail,
        subject: options.subject,
        html: options.html,
        text: options.text,
        // Mobile-specific headers for better compatibility
        headers: {
          'X-Priority': '3',
          'X-Mailer': 'PolyHarmony',
          'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN',
          // Prevent auto-linking on mobile devices
          'X-MS-Format-Detection': 'none',
          'format': 'flowed'
        },
        // Mobile optimization settings
        trackingSettings: {
          clickTracking: {
            enable: true,
            enableText: false
          },
          openTracking: {
            enable: true
          }
        },
        // Better mobile rendering
        mailSettings: {
          sandboxMode: {
            enable: false
          }
        }
      };

      const [response] = await sgMail.send(emailData);

      console.log(`✅ SendGrid email sent successfully to ${options.to}`);
      
      return {
        success: true,
        messageId: response.headers['x-message-id'] as string || `sg-${Date.now()}`
      };

    } catch (error: any) {
      console.error('❌ SendGrid email error:', error);
      
      // Handle specific SendGrid errors
      let errorMessage = 'Failed to send email via SendGrid';
      
      if (error.response?.body?.errors) {
        const sgError = error.response.body.errors[0];
        errorMessage = `SendGrid Error: ${sgError.message}`;
      } else if (error.code) {
        switch (error.code) {
          case 401:
            errorMessage = 'SendGrid API key is invalid or expired';
            break;
          case 403:
            errorMessage = 'SendGrid account does not have permission to send emails';
            break;
          case 413:
            errorMessage = 'Email content is too large';
            break;
          case 429:
            errorMessage = 'SendGrid rate limit exceeded';
            break;
          default:
            errorMessage = `SendGrid API Error (${error.code}): ${error.message}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Test the email service configuration
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // SendGrid doesn't have a direct test endpoint, so we'll validate the API key format
      if (!this.apiKey || !this.apiKey.startsWith('SG.')) {
        return {
          success: false,
          error: 'Invalid SendGrid API key format'
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
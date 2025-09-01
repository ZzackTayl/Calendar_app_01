import { Resend } from 'resend';
import { EmailServiceProvider, EmailSendResult } from '../invitation-service';

export class ResendEmailProvider implements EmailServiceProvider {
  private resend: Resend;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
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
      // Validate required parameters
      if (!this.apiKey || !this.apiKey.startsWith('re_')) {
        throw new Error('Valid Resend API key is required');
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

      // Prepare email data with mobile optimization
      const emailData = {
        from: fromEmail,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        // Mobile-friendly headers
        headers: {
          'X-Priority': '3',
          'X-Mailer': 'PolyHarmony',
          'X-Auto-Response-Suppress': 'OOF, DR, RN, NRN',
          // Better mobile rendering
          'format': 'flowed',
          'X-MS-Format-Detection': 'none'
        },
        // Tags for tracking mobile vs desktop opens
        tags: [
          {
            name: 'category',
            value: 'invitation'
          },
          {
            name: 'source',
            value: 'polyharmony-app'
          }
        ]
      };

      const { data, error } = await this.resend.emails.send(emailData);

      if (error) {
        console.error('❌ Resend email error:', error);
        return { 
          success: false, 
          error: `Resend Error: ${error.message}` 
        };
      }

      console.log(`✅ Resend email sent successfully to ${options.to}`);

      return {
        success: true,
        messageId: data?.id || `resend-${Date.now()}`
      };

    } catch (error: any) {
      console.error('❌ Resend email error:', error);
      
      // Handle specific Resend errors
      let errorMessage = 'Failed to send email via Resend';
      
      if (error.message) {
        if (error.message.includes('API key')) {
          errorMessage = 'Resend API key is invalid or expired';
        } else if (error.message.includes('rate limit')) {
          errorMessage = 'Resend rate limit exceeded';
        } else if (error.message.includes('domain')) {
          errorMessage = 'Resend domain not verified';
        } else {
          errorMessage = `Resend Error: ${error.message}`;
        }
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
      // Validate API key format
      if (!this.apiKey || !this.apiKey.startsWith('re_')) {
        return {
          success: false,
          error: 'Invalid Resend API key format'
        };
      }

      // Test with Resend API health endpoint
      try {
        const { data } = await this.resend.domains.list();
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: 'Unable to connect to Resend API'
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
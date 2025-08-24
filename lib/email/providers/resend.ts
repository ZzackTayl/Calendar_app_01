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
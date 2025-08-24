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
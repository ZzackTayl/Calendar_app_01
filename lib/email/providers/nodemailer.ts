import * as nodemailer from 'nodemailer';
import { EmailServiceProvider, EmailSendResult } from '../invitation-service';

export class NodemailerEmailProvider implements EmailServiceProvider {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Validate required environment variables
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      throw new Error('SMTP configuration is incomplete. Required: SMTP_HOST, SMTP_USER, SMTP_PASSWORD');
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD, // Fixed: was SMTP_PASS, should be SMTP_PASSWORD
      },
      // Additional security options
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      },
      logger: process.env.NODE_ENV === 'development',
      debug: process.env.NODE_ENV === 'development'
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
      const info = await this.transporter.sendMail({
        from: options.from || process.env.INVITATION_FROM_EMAIL,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email'
      };
    }
  }
}
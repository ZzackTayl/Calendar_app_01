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
/**
 * Email notification service for invitations
 * This service handles sending email notifications when invitations are created
 */

export interface InvitationEmailData {
  recipientEmail: string;
  recipientName?: string;
  senderName?: string;
  senderEmail?: string;
  inviteLink: string;
  message?: string;
  expiresAt: string;
  type: 'individual' | 'group';
  
  // For group invitations
  groupName?: string;
  groupDescription?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Base email service interface
 * Implement this interface with your preferred email service
 */
export interface EmailServiceProvider {
  sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
  }): Promise<EmailSendResult>;
}

/**
 * HTML email template for individual invitations
 */
function generateIndividualInvitationTemplate(data: InvitationEmailData): string {
  const expiryDate = new Date(data.expiresAt).toLocaleDateString();
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited!</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 8px 8px; }
    .btn { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .btn:hover { background: #5a6fd8; }
    .message-box { background: #f8f9fa; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px; }
    .details { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .expiry { color: #e74c3c; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 You've been invited!</h1>
      <p>Someone wants to connect with you on PolyHarmony</p>
    </div>
    
    <div class="content">
      <p>Hi there!</p>
      
      <p><strong>${data.senderName || data.senderEmail || 'Someone'}</strong> has sent you a friend invitation on PolyHarmony.</p>
      
      ${data.message ? `
        <div class="message-box">
          <h3>Personal message:</h3>
          <p><em>"${data.message}"</em></p>
        </div>
      ` : ''}
      
      <div class="details">
        <p><strong>From:</strong> ${data.senderEmail || 'Unknown'}</p>
        <p><strong>To:</strong> ${data.recipientEmail}</p>
        <p><strong>Expires:</strong> <span class="expiry">${expiryDate}</span></p>
      </div>
      
      <p>To accept this invitation and start connecting:</p>
      
      <div style="text-align: center;">
        <a href="${data.inviteLink}" class="btn">Accept Invitation</a>
      </div>
      
      <p><small>If you don't have an account yet, clicking the link above will guide you through creating one.</small></p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e1e5e9;">
      
      <p><strong>What is PolyHarmony?</strong></p>
      <p>PolyHarmony is a calendar and relationship management platform that helps you coordinate schedules and maintain connections with the people who matter most.</p>
    </div>
    
    <div class="footer">
      <p><small>This invitation will expire on ${expiryDate}. If you didn't expect this invitation, you can safely ignore this email.</small></p>
      <p><small>Can't click the button? Copy and paste this link: ${data.inviteLink}</small></p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * HTML email template for group invitations
 */
function generateGroupInvitationTemplate(data: InvitationEmailData): string {
  const expiryDate = new Date(data.expiresAt).toLocaleDateString();
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to join a group!</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 8px 8px; }
    .btn { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .btn:hover { background: #5a6fd8; }
    .message-box { background: #f8f9fa; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px; }
    .group-box { background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #b8daff; }
    .details { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .expiry { color: #e74c3c; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>👥 Group Invitation</h1>
      <p>You've been invited to join a group on PolyHarmony</p>
    </div>
    
    <div class="content">
      <p>Hi there!</p>
      
      <p><strong>${data.senderName || data.senderEmail || 'Someone'}</strong> has invited you to join a group on PolyHarmony.</p>
      
      <div class="group-box">
        <h2 style="margin-top: 0; color: #1565c0;">📋 ${data.groupName || 'Group Invitation'}</h2>
        ${data.groupDescription ? `<p>${data.groupDescription}</p>` : ''}
      </div>
      
      ${data.message ? `
        <div class="message-box">
          <h3>Personal message:</h3>
          <p><em>"${data.message}"</em></p>
        </div>
      ` : ''}
      
      <div class="details">
        <p><strong>From:</strong> ${data.senderEmail || 'Unknown'}</p>
        <p><strong>To:</strong> ${data.recipientEmail}</p>
        <p><strong>Group:</strong> ${data.groupName || 'Unnamed Group'}</p>
        <p><strong>Expires:</strong> <span class="expiry">${expiryDate}</span></p>
      </div>
      
      <p>To accept this group invitation:</p>
      
      <div style="text-align: center;">
        <a href="${data.inviteLink}" class="btn">Join Group</a>
      </div>
      
      <p><small>If you don't have an account yet, clicking the link above will guide you through creating one. Once you join, you'll be able to coordinate schedules and events with other group members.</small></p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e1e5e9;">
      
      <p><strong>What are PolyHarmony Groups?</strong></p>
      <p>Groups allow you to coordinate schedules, share events, and manage permissions with multiple people at once. Perfect for families, teams, friend groups, or any collection of people who need to stay coordinated.</p>
    </div>
    
    <div class="footer">
      <p><small>This invitation will expire on ${expiryDate}. If you didn't expect this invitation, you can safely ignore this email.</small></p>
      <p><small>Can't click the button? Copy and paste this link: ${data.inviteLink}</small></p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate plain text version of invitation email
 */
function generateTextVersion(data: InvitationEmailData): string {
  const expiryDate = new Date(data.expiresAt).toLocaleDateString();
  const isGroup = data.type === 'group';
  
  return `
${isGroup ? 'GROUP INVITATION' : 'FRIEND INVITATION'}

Hi there!

${data.senderName || data.senderEmail || 'Someone'} has ${isGroup ? 'invited you to join a group' : 'sent you a friend invitation'} on PolyHarmony.

${isGroup && data.groupName ? `Group: ${data.groupName}` : ''}
${isGroup && data.groupDescription ? `Description: ${data.groupDescription}` : ''}

${data.message ? `Personal message: "${data.message}"` : ''}

DETAILS:
- From: ${data.senderEmail || 'Unknown'}
- To: ${data.recipientEmail}
- Expires: ${expiryDate}

To accept this invitation, visit: ${data.inviteLink}

If you don't have an account yet, the link will guide you through creating one.

${isGroup 
  ? 'Groups allow you to coordinate schedules, share events, and manage permissions with multiple people at once.'
  : 'PolyHarmony is a calendar and relationship management platform that helps you coordinate schedules and maintain connections.'
}

This invitation will expire on ${expiryDate}. If you didn't expect this invitation, you can safely ignore this email.
  `.trim();
}

/**
 * Main invitation email service
 */
export class InvitationEmailService {
  private emailProvider: EmailServiceProvider;
  private fromEmail: string;
  private fromName: string;

  constructor(
    emailProvider: EmailServiceProvider, 
    fromEmail: string = 'invites@polyharmony.app',
    fromName: string = 'PolyHarmony'
  ) {
    this.emailProvider = emailProvider;
    this.fromEmail = fromEmail;
    this.fromName = fromName;
  }

  /**
   * Send an invitation email
   */
  async sendInvitationEmail(data: InvitationEmailData): Promise<EmailSendResult> {
    try {
      const isGroup = data.type === 'group';
      
      // Generate email content
      const html = isGroup 
        ? generateGroupInvitationTemplate(data)
        : generateIndividualInvitationTemplate(data);
      
      const text = generateTextVersion(data);
      
      // Generate subject line
      const subject = isGroup
        ? `You've been invited to join "${data.groupName || 'a group'}" on PolyHarmony`
        : `${data.senderName || 'Someone'} wants to connect with you on PolyHarmony`;

      // Send email
      const result = await this.emailProvider.sendEmail({
        to: data.recipientEmail,
        subject,
        html,
        text,
        from: `${this.fromName} <${this.fromEmail}>`
      });

      return result;

    } catch (error) {
      console.error('Error sending invitation email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email'
      };
    }
  }

  /**
   * Send a bulk of invitation emails
   */
  async sendBulkInvitations(invitations: InvitationEmailData[]): Promise<{
    success: boolean;
    results: Array<{ email: string; result: EmailSendResult }>;
    successCount: number;
    failureCount: number;
  }> {
    const results: Array<{ email: string; result: EmailSendResult }> = [];
    let successCount = 0;
    let failureCount = 0;

    // Send emails in parallel but with some reasonable concurrency limit
    const batchSize = 5;
    for (let i = 0; i < invitations.length; i += batchSize) {
      const batch = invitations.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (invitation) => {
        const result = await this.sendInvitationEmail(invitation);
        const emailResult = { email: invitation.recipientEmail, result };
        
        if (result.success) {
          successCount++;
        } else {
          failureCount++;
        }
        
        return emailResult;
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return {
      success: failureCount === 0,
      results,
      successCount,
      failureCount
    };
  }
}

/**
 * Example implementation using a hypothetical email service
 * Replace this with your actual email service (SendGrid, AWS SES, etc.)
 */
export class ConsoleEmailProvider implements EmailServiceProvider {
  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
  }): Promise<EmailSendResult> {
    console.log('📧 INVITATION EMAIL (Console Provider)');
    console.log('To:', options.to);
    console.log('From:', options.from);
    console.log('Subject:', options.subject);
    console.log('---');
    console.log('Text version:');
    console.log(options.text);
    console.log('---');
    
    return {
      success: true,
      messageId: `console-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }
}

/**
 * Factory function to create the email service with the appropriate provider
 */
export function createInvitationEmailService(): InvitationEmailService {
  // TODO: Replace with your actual email service provider
  // Examples:
  // - SendGrid: new SendGridEmailProvider(apiKey)
  // - AWS SES: new AWSEmailProvider(config)
  // - Resend: new ResendEmailProvider(apiKey)
  // - Nodemailer: new NodemailerEmailProvider(config)
  
  const emailProvider = new ConsoleEmailProvider();
  
  return new InvitationEmailService(
    emailProvider,
    process.env.INVITATION_FROM_EMAIL || 'invites@polyharmony.app',
    process.env.INVITATION_FROM_NAME || 'PolyHarmony'
  );
}

/**
 * Utility function to send invitation email (used by API routes)
 */
export async function sendInvitationNotification(data: InvitationEmailData): Promise<EmailSendResult> {
  const emailService = createInvitationEmailService();
  return await emailService.sendInvitationEmail(data);
}

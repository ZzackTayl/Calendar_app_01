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
  
  // Mobile optimization
  mobileAppLink?: string;
  userAgent?: string;
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
 * HTML email template for individual invitations with mobile optimization
 */
function generateIndividualInvitationTemplate(data: InvitationEmailData): string {
  const expiryDate = new Date(data.expiresAt).toLocaleDateString();
  
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>You've been invited to PolyHarmony!</title>
  <!--[if !mso]><!-->
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 10px !important; }
      .header { padding: 20px 15px !important; }
      .content { padding: 20px 15px !important; }
      .footer { padding: 15px !important; }
      .btn { 
        width: 100% !important; 
        display: block !important; 
        padding: 18px 20px !important; 
        font-size: 18px !important; 
        min-height: 56px !important;
        box-sizing: border-box !important;
        -webkit-appearance: none !important;
        -moz-appearance: none !important;
        appearance: none !important;
      }
      .details { padding: 16px !important; }
      .message-box { padding: 16px !important; margin: 20px 0 !important; }
      h1 { font-size: 28px !important; line-height: 1.2 !important; }
      h2 { font-size: 24px !important; line-height: 1.2 !important; }
      h3 { font-size: 20px !important; line-height: 1.2 !important; }
      p { font-size: 17px !important; line-height: 1.4 !important; }
      .mobile-hidden { display: none !important; }
      .mobile-center { text-align: center !important; }
      
      /* Enhanced app store badge mobile styles */
      .app-store-container { 
        flex-direction: column !important; 
        align-items: center !important; 
        gap: 12px !important;
      }
      .app-store-badge { 
        width: 100% !important; 
        max-width: 200px !important; 
        height: auto !important; 
        min-height: 44px !important;
        display: block !important;
        margin: 8px 0 !important;
      }
      .app-store-badge img { 
        width: 100% !important; 
        height: auto !important; 
        max-height: 60px !important;
      }
    }
    
    /* Email client specific styles */
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      line-height: 1.6; 
      color: #333333; 
      margin: 0; 
      padding: 0; 
      background-color: #f4f4f4;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
      background-color: #ffffff;
    }
    
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 30px; 
      text-align: center; 
      border-radius: 8px 8px 0 0; 
      -webkit-border-radius: 8px 8px 0 0;
      -moz-border-radius: 8px 8px 0 0;
    }
    
    .content { 
      background: white; 
      padding: 30px; 
      border: 1px solid #e1e5e9; 
      border-top: none; 
    }
    
    .footer { 
      background: #f8f9fa; 
      padding: 20px; 
      text-align: center; 
      border: 1px solid #e1e5e9; 
      border-top: none; 
      border-radius: 0 0 8px 8px; 
      -webkit-border-radius: 0 0 8px 8px;
      -moz-border-radius: 0 0 8px 8px;
    }
    
    .btn { 
      display: inline-block; 
      background: #667eea; 
      color: white !important; 
      padding: 15px 30px; 
      text-decoration: none; 
      border-radius: 8px; 
      -webkit-border-radius: 8px;
      -moz-border-radius: 8px;
      font-weight: 600; 
      font-size: 16px;
      margin: 20px 0; 
      border: none;
      cursor: pointer;
      text-align: center;
      /* Enhanced touch target for mobile */
      min-height: 44px;
      line-height: 1.2;
      /* Prevent text selection on mobile */
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    
    .btn:hover { 
      background: #5a6fd8 !important; 
    }
    
    .message-box { 
      background: #f8f9fa; 
      padding: 15px; 
      border-left: 4px solid #667eea; 
      margin: 20px 0; 
      border-radius: 4px; 
      -webkit-border-radius: 4px;
      -moz-border-radius: 4px;
    }
    
    .details { 
      background: #f8f9fa; 
      padding: 15px; 
      border-radius: 6px; 
      -webkit-border-radius: 6px;
      -moz-border-radius: 6px;
      margin: 20px 0; 
    }
    
    .expiry { 
      color: #e74c3c; 
      font-weight: 600; 
    }
    
    /* Link styling for better mobile compatibility */
    a {
      color: #667eea;
    }
    
    a:visited {
      color: #5a6fd8;
    }
    
    /* Prevent auto-linking in some email clients */
    .no-link a {
      color: #333333 !important;
      text-decoration: none !important;
    }
    
    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .content {
        background: #1a1a1a !important;
        color: #ffffff !important;
      }
      .details {
        background: #2a2a2a !important;
      }
      .message-box {
        background: #2a2a2a !important;
      }
    }
  </style>
  <!--<![endif]-->
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px; font-weight: 700;">🎉 You've been invited!</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Someone wants to connect with you on PolyHarmony</p>
    </div>
    
    <div class="content">
      <p style="margin: 0 0 20px 0;">Hi there!</p>
      
      <p style="margin: 0 0 20px 0;"><strong>${data.senderName || data.senderEmail || 'Someone'}</strong> has sent you a friend invitation on PolyHarmony.</p>
      
      ${data.message ? `
        <div class="message-box">
          <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #667eea;">Personal message:</h3>
          <p style="margin: 0; font-style: italic;">"${data.message}"</p>
        </div>
      ` : ''}
      
      <div class="details">
        <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${data.senderEmail || 'Unknown'}</p>
        <p style="margin: 0 0 10px 0;"><strong>To:</strong> ${data.recipientEmail}</p>
        <p style="margin: 0;"><strong>Expires:</strong> <span class="expiry">${expiryDate}</span></p>
      </div>
      
      <p style="margin: 20px 0 0 0;">To accept this invitation and start connecting:</p>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${data.inviteLink}" class="btn" style="color: white !important;">Accept Invitation</a>
      </div>
      
      ${data.mobileAppLink ? `
        <div style="text-align: center; margin: 15px 0;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Or open in the PolyHarmony app:</p>
          <a href="${data.mobileAppLink}" style="color: #667eea; text-decoration: underline; font-size: 14px;">Open in App</a>
        </div>
      ` : ''}
      
      <p style="margin: 20px 0 0 0; font-size: 14px; color: #666;"><em>If you don't have an account yet, clicking the link above will guide you through creating one.</em></p>
      
      <div style="text-align: center; margin: 30px 0 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
        <p style="margin: 0 0 15px 0; font-size: 14px; color: #666; font-weight: 600;">Get the PolyHarmony Mobile App</p>
        <div style="display: inline-block; margin: 5px; min-height: 44px;">
          <a href="https://apps.apple.com/app/polyharmony" style="display: inline-block; min-height: 44px; min-width: 135px;">
            <img src="https://polyharmony.app/images/app-store-badge.svg" alt="Download on App Store" style="height: 40px; width: 120px; border-radius: 4px;" />
          </a>
        </div>
        <div style="display: inline-block; margin: 5px; min-height: 44px;">
          <a href="https://play.google.com/store/apps/details?id=com.polyharmony.app" style="display: inline-block; min-height: 44px; min-width: 135px;">
            <img src="https://polyharmony.app/images/google-play-badge.svg" alt="Get it on Google Play" style="height: 40px; width: 135px; border-radius: 4px;" />
          </a>
        </div>
      </div>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e1e5e9;">
      
      <h3 style="margin: 0 0 10px 0; font-size: 18px;">What is PolyHarmony?</h3>
      <p style="margin: 0;">PolyHarmony is a calendar and relationship management platform that helps you coordinate schedules and maintain connections with the people who matter most.</p>
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 10px 0; font-size: 12px; color: #666;">This invitation will expire on ${expiryDate}. If you didn't expect this invitation, you can safely ignore this email.</p>
      <p style="margin: 0; font-size: 12px; color: #666;">Can't click the button? Copy and paste this link: <span class="no-link" style="word-break: break-all;">${data.inviteLink}</span></p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * HTML email template for group invitations with mobile optimization
 */
function generateGroupInvitationTemplate(data: InvitationEmailData): string {
  const expiryDate = new Date(data.expiresAt).toLocaleDateString();
  
  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>You've been invited to join a group on PolyHarmony!</title>
  <!--[if !mso]><!-->
  <style type="text/css">
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 10px !important; }
      .header { padding: 20px 15px !important; }
      .content { padding: 20px 15px !important; }
      .footer { padding: 15px !important; }
      .btn { width: 100% !important; display: block !important; padding: 15px 20px !important; font-size: 18px !important; }
      .details { padding: 12px !important; }
      .message-box { padding: 12px !important; margin: 15px 0 !important; }
      .group-box { padding: 15px !important; margin: 15px 0 !important; }
      h1 { font-size: 24px !important; }
      h2 { font-size: 20px !important; }
      h3 { font-size: 18px !important; }
      p { font-size: 16px !important; line-height: 1.5 !important; }
      .mobile-hidden { display: none !important; }
      .mobile-center { text-align: center !important; }
    }
    
    /* Email client specific styles */
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      line-height: 1.6; 
      color: #333333; 
      margin: 0; 
      padding: 0; 
      background-color: #f4f4f4;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      padding: 20px; 
      background-color: #ffffff;
    }
    
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
      color: white; 
      padding: 30px; 
      text-align: center; 
      border-radius: 8px 8px 0 0; 
      -webkit-border-radius: 8px 8px 0 0;
      -moz-border-radius: 8px 8px 0 0;
    }
    
    .content { 
      background: white; 
      padding: 30px; 
      border: 1px solid #e1e5e9; 
      border-top: none; 
    }
    
    .footer { 
      background: #f8f9fa; 
      padding: 20px; 
      text-align: center; 
      border: 1px solid #e1e5e9; 
      border-top: none; 
      border-radius: 0 0 8px 8px; 
      -webkit-border-radius: 0 0 8px 8px;
      -moz-border-radius: 0 0 8px 8px;
    }
    
    .btn { 
      display: inline-block; 
      background: #667eea; 
      color: white !important; 
      padding: 15px 30px; 
      text-decoration: none; 
      border-radius: 8px; 
      -webkit-border-radius: 8px;
      -moz-border-radius: 8px;
      font-weight: 600; 
      font-size: 16px;
      margin: 20px 0; 
      border: none;
      cursor: pointer;
      text-align: center;
      /* Enhanced touch target for mobile */
      min-height: 44px;
      line-height: 1.2;
      /* Prevent text selection on mobile */
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
    }
    
    .btn:hover { 
      background: #5a6fd8 !important; 
    }
    
    .message-box { 
      background: #f8f9fa; 
      padding: 15px; 
      border-left: 4px solid #667eea; 
      margin: 20px 0; 
      border-radius: 4px; 
      -webkit-border-radius: 4px;
      -moz-border-radius: 4px;
    }
    
    .group-box { 
      background: #e8f4fd; 
      padding: 20px; 
      border-radius: 8px; 
      -webkit-border-radius: 8px;
      -moz-border-radius: 8px;
      margin: 20px 0; 
      border: 1px solid #b8daff; 
    }
    
    .details { 
      background: #f8f9fa; 
      padding: 15px; 
      border-radius: 6px; 
      -webkit-border-radius: 6px;
      -moz-border-radius: 6px;
      margin: 20px 0; 
    }
    
    .expiry { 
      color: #e74c3c; 
      font-weight: 600; 
    }
    
    /* Link styling for better mobile compatibility */
    a {
      color: #667eea;
    }
    
    a:visited {
      color: #5a6fd8;
    }
    
    /* Prevent auto-linking in some email clients */
    .no-link a {
      color: #333333 !important;
      text-decoration: none !important;
    }
    
    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .content {
        background: #1a1a1a !important;
        color: #ffffff !important;
      }
      .details {
        background: #2a2a2a !important;
      }
      .message-box {
        background: #2a2a2a !important;
      }
      .group-box {
        background: #2c3e50 !important;
        border-color: #34495e !important;
      }
    }
  </style>
  <!--<![endif]-->
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 28px; font-weight: 700;">👥 Group Invitation</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">You've been invited to join a group on PolyHarmony</p>
    </div>
    
    <div class="content">
      <p style="margin: 0 0 20px 0;">Hi there!</p>
      
      <p style="margin: 0 0 20px 0;"><strong>${data.senderName || data.senderEmail || 'Someone'}</strong> has invited you to join a group on PolyHarmony.</p>
      
      <div class="group-box">
        <h2 style="margin: 0 0 10px 0; color: #1565c0; font-size: 20px;">📋 ${data.groupName || 'Group Invitation'}</h2>
        ${data.groupDescription ? `<p style="margin: 0; color: #2c3e50;">${data.groupDescription}</p>` : ''}
      </div>
      
      ${data.message ? `
        <div class="message-box">
          <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #667eea;">Personal message:</h3>
          <p style="margin: 0; font-style: italic;">"${data.message}"</p>
        </div>
      ` : ''}
      
      <div class="details">
        <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${data.senderEmail || 'Unknown'}</p>
        <p style="margin: 0 0 10px 0;"><strong>To:</strong> ${data.recipientEmail}</p>
        <p style="margin: 0 0 10px 0;"><strong>Group:</strong> ${data.groupName || 'Unnamed Group'}</p>
        <p style="margin: 0;"><strong>Expires:</strong> <span class="expiry">${expiryDate}</span></p>
      </div>
      
      <p style="margin: 20px 0 0 0;">To accept this group invitation:</p>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${data.inviteLink}" class="btn" style="color: white !important;">Join Group</a>
      </div>
      
      ${data.mobileAppLink ? `
        <div style="text-align: center; margin: 15px 0;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Or open in the PolyHarmony app:</p>
          <a href="${data.mobileAppLink}" style="color: #667eea; text-decoration: underline; font-size: 14px;">Open in App</a>
        </div>
      ` : ''}
      
      <p style="margin: 20px 0 0 0; font-size: 14px; color: #666;"><em>If you don't have an account yet, clicking the link above will guide you through creating one. Once you join, you'll be able to coordinate schedules and events with other group members.</em></p>
      
      <div style="text-align: center; margin: 30px 0 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px;">
        <p style="margin: 0 0 15px 0; font-size: 14px; color: #666; font-weight: 600;">Get the PolyHarmony Mobile App</p>
        <div style="display: inline-block; margin: 5px; min-height: 44px;">
          <a href="https://apps.apple.com/app/polyharmony" style="display: inline-block; min-height: 44px; min-width: 135px;">
            <img src="https://polyharmony.app/images/app-store-badge.svg" alt="Download on App Store" style="height: 40px; width: 120px; border-radius: 4px;" />
          </a>
        </div>
        <div style="display: inline-block; margin: 5px; min-height: 44px;">
          <a href="https://play.google.com/store/apps/details?id=com.polyharmony.app" style="display: inline-block; min-height: 44px; min-width: 135px;">
            <img src="https://polyharmony.app/images/google-play-badge.svg" alt="Get it on Google Play" style="height: 40px; width: 135px; border-radius: 4px;" />
          </a>
        </div>
      </div>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e1e5e9;">
      
      <h3 style="margin: 0 0 10px 0; font-size: 18px;">What are PolyHarmony Groups?</h3>
      <p style="margin: 0;">Groups allow you to coordinate schedules, share events, and manage permissions with multiple people at once. Perfect for families, teams, friend groups, or any collection of people who need to stay coordinated.</p>
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 10px 0; font-size: 12px; color: #666;">This invitation will expire on ${expiryDate}. If you didn't expect this invitation, you can safely ignore this email.</p>
      <p style="margin: 0; font-size: 12px; color: #666;">Can't click the button? Copy and paste this link: <span class="no-link" style="word-break: break-all;">${data.inviteLink}</span></p>
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

// Import email providers
import { SendGridEmailProvider } from './providers/sendgrid';
import { ResendEmailProvider } from './providers/resend';
import { AWSEmailProvider } from './providers/aws-ses';
import { NodemailerEmailProvider } from './providers/nodemailer';

// Import unified configuration
import { getEnvironmentConfig } from '../config/env-validation';

// Import mobile-optimized link utilities
// import { createSmartInviteLink } from '../invitations/token-utils';

/**
 * Factory function to create the email service with the appropriate provider
 * Uses unified configuration validation
 */
export function createInvitationEmailService(): InvitationEmailService {
  let emailProvider: EmailServiceProvider;
  
  try {
    // Get validated email configuration
    const config = getEnvironmentConfig();
    const emailConfig = config.email;
    
    console.log(`📧 Email provider detected: ${emailConfig.provider}`);
    
    // Select email provider based on validated configuration
    switch (emailConfig.provider) {
      case 'resend':
        if (!emailConfig.resend.apiKey) {
          throw new Error('Resend API key is required but not configured');
        }
        console.log('✅ Using Resend email provider');
        emailProvider = new ResendEmailProvider(emailConfig.resend.apiKey);
        break;
        
      case 'sendgrid':
        if (!emailConfig.sendgrid.apiKey) {
          throw new Error('SendGrid API key is required but not configured');
        }
        console.log('✅ Using SendGrid email provider');
        emailProvider = new SendGridEmailProvider(emailConfig.sendgrid.apiKey);
        break;
        
      case 'aws_ses':
        if (!emailConfig.awsSes.accessKeyId || !emailConfig.awsSes.secretAccessKey) {
          throw new Error('AWS credentials are required but not configured');
        }
        console.log('✅ Using AWS SES email provider');
        emailProvider = new AWSEmailProvider();
        break;
        
      case 'smtp':
        if (!emailConfig.smtp.host || !emailConfig.smtp.user || !emailConfig.smtp.password) {
          throw new Error('SMTP configuration is incomplete');
        }
        console.log('✅ Using SMTP email provider');
        emailProvider = new NodemailerEmailProvider();
        break;
        
      case 'console':
      default:
        console.log('⚠️  Using Console email provider (emails will be logged to console)');
        emailProvider = new ConsoleEmailProvider();
        break;
    }
    
    return new InvitationEmailService(
      emailProvider,
      emailConfig.sender.email,
      emailConfig.sender.name
    );
    
  } catch (error) {
    console.error('❌ Email service configuration error:', error);
    console.log('🔄 Falling back to console email provider');
    
    return new InvitationEmailService(
      new ConsoleEmailProvider(),
      process.env.INVITATION_FROM_EMAIL || 'fallback@polyharmony.app',
      process.env.INVITATION_FROM_NAME || 'PolyHarmony (Fallback)'
    );
  }
}

/**
 * Utility function to send invitation email (used by API routes)
 */
export async function sendInvitationNotification(data: InvitationEmailData): Promise<EmailSendResult> {
  const emailService = createInvitationEmailService();
  return await emailService.sendInvitationEmail(data);
}

// Twilio SMS Provider Implementation
// Based on SMS_TECHNICAL_SPECIFICATION.md

import { Twilio } from 'twilio';
import {
  SMSServiceProvider,
  SMSSendOptions,
  SMSResult,
  PhoneValidationResult,
  SMSDeliveryStatus,
  AccountBalance,
  SMSStatus,
  SMSError
} from '../types';

export class TwilioSMSProvider implements SMSServiceProvider {
  private twilio: Twilio;
  private accountSid: string;
  private authToken: string;
  private phoneNumber: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID!;
    this.authToken = process.env.TWILIO_AUTH_TOKEN!;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER!;
    
    if (!this.accountSid || !this.authToken || !this.phoneNumber) {
      throw new SMSError(
        'Twilio configuration is incomplete. Please check environment variables.',
        'TWILIO_CONFIG_MISSING',
        { 
          hasAccountSid: !!this.accountSid,
          hasAuthToken: !!this.authToken,
          hasPhoneNumber: !!this.phoneNumber
        }
      );
    }

    this.twilio = new Twilio(this.accountSid, this.authToken);
  }

  async sendSMS(options: SMSSendOptions): Promise<SMSResult> {
    try {
      // Validate phone number first
      const validation = await this.validatePhoneNumber(options.to);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error || 'Invalid phone number'
        };
      }

      // Send SMS via Twilio
      const message = await this.twilio.messages.create({
        body: options.message,
        from: options.from || this.phoneNumber,
        to: validation.formattedNumber!,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/webhook`,
        maxPrice: options.costLimit || 0.05 // Default $0.05 max per message
      });

      return {
        success: true,
        messageId: message.sid,
        twilioMessageSid: message.sid,
        cost: this.calculateCost(message),
        status: this.mapTwilioStatus(message.status)
      };

    } catch (error: any) {
      console.error('Twilio SMS error:', error);
      
      // Handle specific Twilio errors
      if (error.code === 21614) {
        return {
          success: false,
          error: 'Invalid phone number format'
        };
      } else if (error.code === 21408) {
        return {
          success: false,
          error: 'Permission denied - phone number may not be verified'
        };
      } else if (error.code === 21610) {
        return {
          success: false,
          error: 'Phone number is not reachable or blocked'
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown SMS sending error'
      };
    }
  }

  async validatePhoneNumber(phone: string): Promise<PhoneValidationResult> {
    try {
      // Basic format validation first
      const cleanPhone = this.sanitizePhoneNumber(phone);
      if (!this.isValidPhoneFormat(cleanPhone)) {
        return {
          isValid: false,
          error: 'Phone number must be in E.164 format (e.g., +1234567890)'
        };
      }

      // Use Twilio Lookup API for validation
      const lookup = await this.twilio.lookups.v2.phoneNumbers(cleanPhone).fetch();
      
      return {
        isValid: lookup.valid || false,
        formattedNumber: lookup.phoneNumber,
        countryCode: lookup.countryCode
      };
    } catch (error: any) {
      console.error('Phone validation error:', error);
      
      // If Twilio lookup fails, fall back to basic validation
      const cleanPhone = this.sanitizePhoneNumber(phone);
      if (this.isValidPhoneFormat(cleanPhone)) {
        return {
          isValid: true,
          formattedNumber: cleanPhone,
          error: 'Basic validation only - Twilio lookup unavailable'
        };
      }

      return {
        isValid: false,
        error: 'Invalid phone number format'
      };
    }
  }

  async getDeliveryStatus(messageId: string): Promise<SMSDeliveryStatus> {
    try {
      const message = await this.twilio.messages(messageId).fetch();
      return {
        messageId,
        status: this.mapTwilioStatus(message.status),
        deliveredAt: message.dateUpdated,
        errorCode: message.errorCode?.toString(),
        errorMessage: message.errorMessage
      };
    } catch (error: any) {
      console.error('Delivery status error:', error);
      return {
        messageId,
        status: 'unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getAccountBalance(): Promise<AccountBalance> {
    try {
      const account = await this.twilio.api.accounts(this.accountSid).fetch();
      return {
        balance: parseFloat(account.balance),
        currency: account.currency,
        lastUpdated: new Date()
      };
    } catch (error: any) {
      console.error('Account balance error:', error);
      throw new SMSError(
        'Failed to fetch Twilio account balance',
        'TWILIO_BALANCE_ERROR',
        error
      );
    }
  }

  private sanitizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Add + if not present and number starts with digit
    if (!cleaned.startsWith('+') && /^\d/.test(cleaned)) {
      // Assume US number if no country code
      if (cleaned.length === 10) {
        return '+1' + cleaned;
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return '+' + cleaned;
      }
      return '+' + cleaned;
    }
    
    return cleaned;
  }

  private isValidPhoneFormat(phone: string): boolean {
    // E.164 format: + followed by 1-15 digits
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phone);
  }

  private calculateCost(message: any): number {
    // Twilio pricing varies by destination
    // This is a simplified calculation - in production, use actual pricing data
    const baseRate = 0.0075; // ~$0.0075 per SMS in US
    
    // Additional charges for long messages (over 160 characters)
    const segments = Math.ceil((message.body?.length || 0) / 160);
    return baseRate * segments;
  }

  private mapTwilioStatus(status: string): SMSStatus {
    const statusMap: Record<string, SMSStatus> = {
      'accepted': 'pending',
      'queued': 'pending', 
      'sending': 'pending',
      'sent': 'sent',
      'delivered': 'delivered',
      'undelivered': 'undelivered',
      'failed': 'failed',
      'receiving': 'pending',
      'received': 'delivered'
    };
    
    return statusMap[status.toLowerCase()] || 'unknown';
  }
}
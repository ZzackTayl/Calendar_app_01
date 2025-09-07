# 📱 SMS Technical Specification

## 🏗️ **Architecture Overview**

### **SMS Service Layer**
```
┌─────────────────────────────────────────────────────────────┐
│                    SMS Service Layer                        │
├─────────────────────────────────────────────────────────────┤
│  SMS Service Factory                                        │
│  ├── Twilio SMS Provider                                    │
│  ├── Console SMS Provider (Dev)                            │
│  └── Mock SMS Provider (Testing)                           │
├─────────────────────────────────────────────────────────────┤
│  SMS Templates Engine                                       │
│  ├── Availability Inquiry Templates                         │
│  ├── Event Invitation Templates                            │
│  ├── Event Reminder Templates                              │
│  └── Group Notification Templates                          │
├─────────────────────────────────────────────────────────────┤
│  SMS Utilities                                              │
│  ├── Phone Number Validation                                │
│  ├── Message Sanitization                                   │
│  ├── Rate Limiting                                          │
│  └── Cost Calculation                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 **Core Components**

### **1. SMS Service Provider Interface**

```typescript
// lib/sms/types.ts
export interface SMSServiceProvider {
  sendSMS(options: SMSSendOptions): Promise<SMSResult>;
  validatePhoneNumber(phone: string): Promise<PhoneValidationResult>;
  getDeliveryStatus(messageId: string): Promise<SMSDeliveryStatus>;
  getAccountBalance(): Promise<AccountBalance>;
}

export interface SMSSendOptions {
  to: string;
  message: string;
  from?: string;
  template?: string;
  templateData?: Record<string, any>;
  userId: string;
  costLimit?: number;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  twilioMessageSid?: string;
  error?: string;
  cost?: number;
  status?: SMSStatus;
}

export interface PhoneValidationResult {
  isValid: boolean;
  formattedNumber?: string;
  countryCode?: string;
  error?: string;
}

export interface SMSDeliveryStatus {
  messageId: string;
  status: SMSStatus;
  deliveredAt?: Date;
  errorCode?: string;
  errorMessage?: string;
}

export type SMSStatus = 
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'failed'
  | 'undelivered'
  | 'unknown';

export interface AccountBalance {
  balance: number;
  currency: string;
  lastUpdated: Date;
}
```

### **2. Twilio SMS Provider**

```typescript
// lib/sms/providers/twilio-sms.ts
import { Twilio } from 'twilio';
import { SMSServiceProvider, SMSSendOptions, SMSResult } from '../types';

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
      throw new Error('Twilio configuration is incomplete');
    }

    this.twilio = new Twilio(this.accountSid, this.authToken);
  }

  async sendSMS(options: SMSSendOptions): Promise<SMSResult> {
    try {
      // Validate phone number
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
        from: this.phoneNumber,
        to: validation.formattedNumber!,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/webhook`
      });

      return {
        success: true,
        messageId: message.sid,
        twilioMessageSid: message.sid,
        cost: this.calculateCost(message),
        status: this.mapTwilioStatus(message.status)
      };

    } catch (error) {
      console.error('Twilio SMS error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async validatePhoneNumber(phone: string): Promise<PhoneValidationResult> {
    try {
      const lookup = await this.twilio.lookups.v1.phoneNumbers(phone).fetch();
      return {
        isValid: true,
        formattedNumber: lookup.phoneNumber,
        countryCode: lookup.countryCode
      };
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      throw new Error('Failed to fetch account balance');
    }
  }

  private calculateCost(message: any): number {
    // Twilio pricing: ~$0.0075 per SMS in US
    return 0.0075;
  }

  private mapTwilioStatus(status: string): SMSStatus {
    const statusMap: Record<string, SMSStatus> = {
      'queued': 'pending',
      'sending': 'pending',
      'sent': 'sent',
      'delivered': 'delivered',
      'undelivered': 'undelivered',
      'failed': 'failed'
    };
    return statusMap[status] || 'unknown';
  }
}
```

### **3. SMS Service Factory**

```typescript
// lib/sms/sms-service.ts
import { SMSServiceProvider } from './types';
import { TwilioSMSProvider } from './providers/twilio-sms';
import { ConsoleSMSProvider } from './providers/console-sms';
import { MockSMSProvider } from './providers/mock-sms';

export class SMSService {
  private provider: SMSServiceProvider;

  constructor(provider?: SMSServiceProvider) {
    this.provider = provider || this.createProvider();
  }

  private createProvider(): SMSServiceProvider {
    const environment = process.env.NODE_ENV;
    const smsProvider = process.env.SMS_PROVIDER || 'twilio';

    switch (smsProvider) {
      case 'twilio':
        return new TwilioSMSProvider();
      case 'console':
        return new ConsoleSMSProvider();
      case 'mock':
        return new MockSMSProvider();
      default:
        throw new Error(`Unknown SMS provider: ${smsProvider}`);
    }
  }

  async sendSMS(options: SMSSendOptions): Promise<SMSResult> {
    // Validate options
    this.validateSMSOptions(options);

    // Check rate limits
    await this.checkRateLimits(options.userId, options.to);

    // Check cost limits
    await this.checkCostLimits(options.userId, options.costLimit);

    // Send SMS
    const result = await this.provider.sendSMS(options);

    // Log SMS attempt
    await this.logSMSAttempt(options, result);

    return result;
  }

  private validateSMSOptions(options: SMSSendOptions): void {
    if (!options.to || !options.message || !options.userId) {
      throw new Error('Missing required SMS options');
    }

    if (options.message.length > 1600) {
      throw new Error('SMS message too long (max 1600 characters)');
    }
  }

  private async checkRateLimits(userId: string, phoneNumber: string): Promise<void> {
    // Implementation for rate limiting
    // Check user daily limit, phone number limit, etc.
  }

  private async checkCostLimits(userId: string, costLimit?: number): Promise<void> {
    // Implementation for cost limiting
    // Check user monthly spending, etc.
  }

  private async logSMSAttempt(options: SMSSendOptions, result: SMSResult): Promise<void> {
    // Log to database for tracking and analytics
  }
}

export function createSMSService(): SMSService {
  return new SMSService();
}
```

---

## 🗄️ **Database Schema**

### **SMS Messages Table**
```sql
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  recipient_phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  cost DECIMAL(10,4),
  twilio_message_sid VARCHAR(100),
  template_used VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sms_messages_user_id ON sms_messages(user_id);
CREATE INDEX idx_sms_messages_status ON sms_messages(status);
CREATE INDEX idx_sms_messages_sent_at ON sms_messages(sent_at);
CREATE INDEX idx_sms_messages_recipient_phone ON sms_messages(recipient_phone);
```

### **User SMS Preferences Table**
```sql
CREATE TABLE user_sms_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  sms_enabled BOOLEAN DEFAULT false,
  availability_inquiries BOOLEAN DEFAULT true,
  event_reminders BOOLEAN DEFAULT true,
  group_notifications BOOLEAN DEFAULT true,
  max_sms_per_day INTEGER DEFAULT 50,
  max_cost_per_month DECIMAL(10,2) DEFAULT 5.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_user_sms_preferences_user_id ON user_sms_preferences(user_id);
```

### **SMS Delivery Status Table**
```sql
CREATE TABLE sms_delivery_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES sms_messages(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(20) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_code VARCHAR(20),
  error_message TEXT
);

-- Indexes
CREATE INDEX idx_sms_delivery_status_message_id ON sms_delivery_status(message_id);
CREATE INDEX idx_sms_delivery_status_timestamp ON sms_delivery_status(timestamp);
```

### **SMS Rate Limits Table**
```sql
CREATE TABLE sms_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  phone_number VARCHAR(20),
  limit_type VARCHAR(20) NOT NULL, -- 'daily', 'hourly', 'monthly'
  count INTEGER DEFAULT 0,
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sms_rate_limits_user_id ON sms_rate_limits(user_id);
CREATE INDEX idx_sms_rate_limits_phone_number ON sms_rate_limits(phone_number);
CREATE INDEX idx_sms_rate_limits_reset_at ON sms_rate_limits(reset_at);
```

---

## 🛣️ **API Routes**

### **1. Send SMS Route**
```typescript
// app/api/sms/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase/server';
import { createSMSService } from '@/lib/sms/sms-service';
import { SMSSendOptions } from '@/lib/sms/types';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to, message, template, templateData } = body;

    // Validate required fields
    if (!to || !message) {
      return NextResponse.json({ 
        error: 'Phone number and message are required' 
      }, { status: 400 });
    }

    // Check user SMS preferences
    const { data: preferences } = await supabase
      .from('user_sms_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!preferences?.sms_enabled) {
      return NextResponse.json({ 
        error: 'SMS is not enabled for this user' 
      }, { status: 403 });
    }

    // Send SMS
    const smsService = createSMSService();
    const result = await smsService.sendSMS({
      to,
      message,
      template,
      templateData,
      userId: user.id
    });

    if (!result.success) {
      return NextResponse.json({ 
        error: result.error 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      cost: result.cost
    });

  } catch (error) {
    console.error('SMS send error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
```

### **2. SMS Preferences Route**
```typescript
// app/api/sms/preferences/route.ts
export async function GET(request: NextRequest) {
  // Get user SMS preferences
}

export async function PUT(request: NextRequest) {
  // Update user SMS preferences
}
```

### **3. SMS Webhook Route**
```typescript
// app/api/sms/webhook/route.ts
export async function POST(request: NextRequest) {
  // Handle Twilio delivery status webhooks
}
```

---

## 📊 **Rate Limiting Implementation**

### **Rate Limiting Service**
```typescript
// lib/sms/rate-limiting.ts
export class SMSRateLimiter {
  async checkUserDailyLimit(userId: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: count } = await supabase
      .from('sms_messages')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', today.toISOString());

    const userPreferences = await this.getUserPreferences(userId);
    const dailyLimit = userPreferences?.max_sms_per_day || 50;

    return (count || 0) < dailyLimit;
  }

  async checkPhoneNumberLimit(phoneNumber: string): Promise<boolean> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: count } = await supabase
      .from('sms_messages')
      .select('id', { count: 'exact' })
      .eq('recipient_phone', phoneNumber)
      .gte('created_at', today.toISOString());

    return (count || 0) < 10; // Max 10 SMS per day per phone number
  }

  async checkHourlyLimit(userId: string): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const { data: count } = await supabase
      .from('sms_messages')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', oneHourAgo.toISOString());

    return (count || 0) < 20; // Max 20 SMS per hour
  }
}
```

---

## 🔒 **Security Implementation**

### **Phone Number Validation**
```typescript
// lib/sms/validation.ts
export class PhoneNumberValidator {
  private static readonly PHONE_REGEX = /^\+[1-9]\d{1,14}$/;
  
  static validate(phone: string): boolean {
    return this.PHONE_REGEX.test(phone);
  }

  static format(phone: string): string {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Add + if not present
    if (!cleaned.startsWith('+')) {
      return '+' + cleaned;
    }
    
    return cleaned;
  }

  static sanitize(phone: string): string {
    return phone.replace(/[^\d+]/g, '');
  }
}
```

### **Message Content Validation**
```typescript
// lib/sms/content-validation.ts
export class MessageContentValidator {
  private static readonly SPAM_KEYWORDS = [
    'free', 'win', 'congratulations', 'urgent', 'act now'
  ];

  static validate(message: string): { isValid: boolean; error?: string } {
    // Check length
    if (message.length > 1600) {
      return { isValid: false, error: 'Message too long' };
    }

    // Check for spam keywords
    const lowerMessage = message.toLowerCase();
    for (const keyword of this.SPAM_KEYWORDS) {
      if (lowerMessage.includes(keyword)) {
        return { isValid: false, error: 'Message contains restricted content' };
      }
    }

    // Check for excessive caps
    const capsCount = (message.match(/[A-Z]/g) || []).length;
    if (capsCount > message.length * 0.7) {
      return { isValid: false, error: 'Message contains excessive capitalization' };
    }

    return { isValid: true };
  }
}
```

---

## 📈 **Monitoring and Analytics**

### **SMS Analytics Service**
```typescript
// lib/sms/analytics.ts
export class SMSAnalyticsService {
  async getDeliveryStats(userId: string, days: number = 30): Promise<DeliveryStats> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const { data: messages } = await supabase
      .from('sms_messages')
      .select('status, created_at, cost')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString());

    const total = messages?.length || 0;
    const delivered = messages?.filter(m => m.status === 'delivered').length || 0;
    const failed = messages?.filter(m => m.status === 'failed').length || 0;
    const totalCost = messages?.reduce((sum, m) => sum + (m.cost || 0), 0) || 0;

    return {
      total,
      delivered,
      failed,
      deliveryRate: total > 0 ? (delivered / total) * 100 : 0,
      totalCost,
      averageCost: total > 0 ? totalCost / total : 0
    };
  }

  async getUsageTrends(userId: string, days: number = 30): Promise<UsageTrend[]> {
    // Implementation for usage trends
  }
}
```

---

## 🧪 **Testing Strategy**

### **Unit Tests**
```typescript
// __tests__/sms/twilio-sms.test.ts
describe('TwilioSMSProvider', () => {
  let provider: TwilioSMSProvider;

  beforeEach(() => {
    provider = new TwilioSMSProvider();
  });

  it('should send SMS successfully', async () => {
    const result = await provider.sendSMS({
      to: '+1234567890',
      message: 'Test message',
      userId: 'test-user'
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it('should validate phone numbers', async () => {
    const valid = await provider.validatePhoneNumber('+1234567890');
    expect(valid.isValid).toBe(true);

    const invalid = await provider.validatePhoneNumber('invalid');
    expect(invalid.isValid).toBe(false);
  });
});
```

### **Integration Tests**
```typescript
// __tests__/sms/integration.test.ts
describe('SMS Integration', () => {
  it('should send SMS through API', async () => {
    const response = await fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: '+1234567890',
        message: 'Test message'
      })
    });

    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
  });
});
```

---

## 🚀 **Deployment Configuration**

### **Environment Variables**
```bash
# Required
TWILIO_ACCOUNT_SID=[Your Twilio Account SID]
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Optional
SMS_PROVIDER=twilio  # twilio, console, mock
SMS_RATE_LIMIT_DAILY=50
SMS_RATE_LIMIT_HOURLY=20
SMS_COST_LIMIT_MONTHLY=5.00
SMS_WEBHOOK_URL=https://your-domain.com/api/sms/webhook
```

### **Vercel Configuration**
```json
// vercel.json
{
  "functions": {
    "app/api/sms/webhook/route.ts": {
      "maxDuration": 10
    }
  }
}
```

---

**Document Version**: 1.0  
**Last Updated**: September 6, 2025  
**Next Review**: September 13, 2025

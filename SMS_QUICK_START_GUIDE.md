# 🚀 SMS Quick Start Guide

## 🎯 **Immediate Next Steps (This Week)**

### **Step 1: Create Core SMS Infrastructure** (Day 1-2)

#### **1.1 Create SMS Service Structure**
```bash
mkdir -p lib/sms/providers
mkdir -p lib/sms/templates
mkdir -p lib/sms/types
```

#### **1.2 Create TypeScript Interfaces**
```typescript
// lib/sms/types.ts
export interface SMSServiceProvider {
  sendSMS(options: SMSSendOptions): Promise<SMSResult>;
}

export interface SMSSendOptions {
  to: string;
  message: string;
  userId: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
```

#### **1.3 Create Twilio Provider**
```typescript
// lib/sms/providers/twilio-sms.ts
import { Twilio } from 'twilio';

export class TwilioSMSProvider implements SMSServiceProvider {
  private twilio: Twilio;

  constructor() {
    this.twilio = new Twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
  }

  async sendSMS(options: SMSSendOptions): Promise<SMSResult> {
    try {
      const message = await this.twilio.messages.create({
        body: options.message,
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: options.to
      });

      return {
        success: true,
        messageId: message.sid
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
```

### **Step 2: Create Basic API Route** (Day 2-3)

#### **2.1 Create SMS Send API**
```typescript
// app/api/sms/send/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase/server';
import { TwilioSMSProvider } from '@/lib/sms/providers/twilio-sms';

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, message } = await request.json();

    if (!to || !message) {
      return NextResponse.json({ 
        error: 'Phone number and message are required' 
      }, { status: 400 });
    }

    const smsProvider = new TwilioSMSProvider();
    const result = await smsProvider.sendSMS({
      to,
      message,
      userId: user.id
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### **Step 3: Test SMS Functionality** (Day 3-4)

#### **3.1 Create Test Script**
```typescript
// test-sms.js
const testSMS = async () => {
  const response = await fetch('http://localhost:3000/api/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: '+1234567890', // Your phone number
      message: 'Test SMS from PolyHarmony Calendar App!'
    })
  });

  const result = await response.json();
  console.log('SMS Test Result:', result);
};

testSMS();
```

#### **3.2 Test Commands**
```bash
# Start your development server
npm run dev

# In another terminal, run the test
node test-sms.js
```

### **Step 4: Add SMS to Invitation System** (Day 4-5)

#### **4.1 Update Invitation Sender Component**
```typescript
// components/ui/invitation-sender.tsx
// Add SMS option to existing invitation form
const [sendSMS, setSendSMS] = useState(false);
const [phoneNumber, setPhoneNumber] = useState('');

// Add SMS checkbox and phone input
<div className="space-y-4">
  <div className="flex items-center space-x-2">
    <Checkbox 
      id="send-sms" 
      checked={sendSMS}
      onCheckedChange={setSendSMS}
    />
    <Label htmlFor="send-sms">Also send via SMS</Label>
  </div>
  
  {sendSMS && (
    <div>
      <Label htmlFor="phone">Phone Number</Label>
      <Input
        id="phone"
        type="tel"
        placeholder="+1234567890"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
      />
    </div>
  )}
</div>
```

#### **4.2 Update Invitation API**
```typescript
// app/api/invitations/create/route.ts
// Add SMS sending logic after email invitation
if (recipient_phone && sendSMS) {
  try {
    const smsResponse = await fetch('/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipient_phone,
        message: `You're invited to join PolyHarmony! ${inviteLink}`
      })
    });
    
    if (smsResponse.ok) {
      console.log('SMS invitation sent successfully');
    }
  } catch (error) {
    console.error('SMS invitation failed:', error);
  }
}
```

---

## 🎯 **Week 1 Goals**

### **✅ By End of Week 1:**
- [ ] SMS service infrastructure created
- [ ] Twilio SMS provider implemented
- [ ] Basic SMS API route working
- [ ] SMS integration with invitations
- [ ] SMS testing completed
- [ ] Basic error handling implemented

### **📊 Success Metrics:**
- SMS can be sent successfully via API
- SMS integration works with invitation system
- Error handling prevents crashes
- Basic logging for debugging

---

## 🚀 **Week 2 Goals**

### **Phase 2: Database and Advanced Features**
- [ ] Database schema for SMS tracking
- [ ] SMS preferences management
- [ ] Rate limiting implementation
- [ ] SMS delivery status tracking
- [ ] Cost tracking and limits
- [ ] SMS templates system

### **Phase 3: UI Integration**
- [ ] SMS preferences in user settings
- [ ] SMS options in invitation forms
- [ ] SMS history display
- [ ] Phone number management in contacts

---

## 🔧 **Development Commands**

### **Start Development**
```bash
# Install dependencies (if not already done)
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### **Test SMS Functionality**
```bash
# Test SMS API
curl -X POST http://localhost:3000/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{"to": "+1234567890", "message": "Test message"}'
```

### **Deploy to Vercel**
```bash
# Deploy with SMS changes
vercel --prod
```

---

## 🐛 **Common Issues and Solutions**

### **Issue 1: Twilio Authentication Error**
**Error**: `Authentication Error - No credentials provided`
**Solution**: Check environment variables are set correctly
```bash
vercel env ls
```

### **Issue 2: Invalid Phone Number**
**Error**: `Invalid phone number format`
**Solution**: Use E.164 format (+1234567890)
```typescript
// Format phone number
const formatPhone = (phone: string) => {
  return phone.replace(/[^\d+]/g, '').replace(/^(\d)/, '+$1');
};
```

### **Issue 3: Rate Limiting**
**Error**: `Rate limit exceeded`
**Solution**: Implement rate limiting
```typescript
// Check rate limits before sending
const checkRateLimit = async (userId: string) => {
  // Implementation here
};
```

---

## 📞 **Support Resources**

### **Twilio Documentation**
- [SMS API Reference](https://www.twilio.com/docs/sms/api)
- [Phone Number Validation](https://www.twilio.com/docs/lookup/api)
- [Webhooks](https://www.twilio.com/docs/messaging/webhooks)

### **Testing Tools**
- [Twilio Console](https://www.twilio.com/console)
- [Phone Number Lookup](https://www.twilio.com/lookup)
- [Message Logs](https://www.twilio.com/console/sms/logs)

### **Debugging**
- Check Vercel logs: `vercel logs`
- Check Twilio console for message status
- Use browser dev tools for API debugging

---

## 🎯 **Next Steps After Quick Start**

1. **Implement Database Schema** (Week 2)
2. **Add Rate Limiting** (Week 2)
3. **Create SMS Templates** (Week 3)
4. **Add User Preferences** (Week 3)
5. **Implement Monitoring** (Week 4)
6. **Add Compliance Features** (Week 4)

---

**Ready to start? Begin with Step 1 and work through each step systematically!**

**Document Version**: 1.0  
**Last Updated**: September 6, 2025  
**Next Review**: September 13, 2025

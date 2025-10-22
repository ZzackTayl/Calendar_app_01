-- Create SMS conversations table for AI agent two-way messaging
--
-- DEPLOYMENT ORDER: This migration MUST be applied to the database
-- BEFORE deploying any code that uses AiAgentSmsApi in lib/logic/services/api_service.dart
--
-- Dependencies:
--   - Twilio account with SMS capabilities
--   - Environment variables: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
--   - Edge functions: send-ai-agent-sms, handle-inbound-sms
--
CREATE TABLE sms_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  recipient_phone_number TEXT NOT NULL,
  message_body TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  agent_type TEXT NOT NULL DEFAULT 'general' CHECK (agent_type IN ('outreach', 'availability', 'confirmation', 'general')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'received', 'processing', 'processed', 'failed', 'error')),
  twilio_sid TEXT,
  error_message TEXT,
  context_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_sms_conversations_user_id 
  ON sms_conversations(user_id);

CREATE INDEX idx_sms_conversations_user_phone 
  ON sms_conversations(user_id, recipient_phone_number);

CREATE INDEX idx_sms_conversations_created_at 
  ON sms_conversations(user_id, created_at DESC);

CREATE INDEX idx_sms_conversations_status 
  ON sms_conversations(user_id, status);

-- Enable Row Level Security
ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only see their own SMS conversations
CREATE POLICY sms_conversations_user_policy 
  ON sms_conversations 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Create policy: Users can insert their own SMS conversations
CREATE POLICY sms_conversations_insert_policy 
  ON sms_conversations 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Create policy: Users can update their own SMS conversations
CREATE POLICY sms_conversations_update_policy 
  ON sms_conversations 
  FOR UPDATE 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sms_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER sms_conversations_updated_at_trigger
BEFORE UPDATE ON sms_conversations
FOR EACH ROW
EXECUTE FUNCTION update_sms_conversations_updated_at();

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON sms_conversations TO authenticated;

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Send, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { CreateInvitationRequest } from '@/lib/supabase/types';

interface InvitationSenderProps {
  onInvitationSent?: () => void;
  className?: string;
}

export function InvitationSender({ onInvitationSent, className }: InvitationSenderProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setErrorMessage('Email is required');
      setStatus('error');
      return;
    }

    setIsLoading(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const invitationData: CreateInvitationRequest = {
        recipient_email: email.trim(),
        recipient_phone: phone.trim() || undefined,
        message: message.trim() || undefined
      };

      const response = await fetch('/api/invitations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invitationData),
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        setEmail('');
        setPhone('');
        setMessage('');
        onInvitationSent?.();
        
        // Reset success status after 3 seconds
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setErrorMessage(result.error || 'Failed to send invitation');
        setStatus('error');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      setErrorMessage('Failed to send invitation. Please try again.');
      setStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Send Friend Invitation
        </CardTitle>
        <CardDescription>
          Invite someone to connect with you on PolyHarmony. They&apos;ll receive an email invitation to join.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Status Messages */}
          {status === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Invitation sent successfully! Your friend will receive an email with the invitation link.
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Friend&apos;s Email *
            </label>
            <Input
              id="email"
              type="email"
              placeholder="friend@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="w-full"
            />
          </div>

          {/* Phone Input (Optional) */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number (Optional)
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isLoading}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Adding a phone number helps with account verification
            </p>
          </div>

          {/* Message Input (Optional) */}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Personal Message (Optional)
            </label>
            <textarea
              id="message"
              placeholder="Hey! I'd love to connect with you on PolyHarmony..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isLoading}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Add a personal touch to your invitation
            </p>
          </div>

          {/* Privacy Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <p className="text-sm text-blue-800 font-medium mb-1">Privacy & Permissions</p>
                <p className="text-xs text-blue-700">
                  When your friend accepts the invitation, they can choose their privacy settings. 
                  If they skip the setup, they won&apos;t be able to see your events.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending Invitation...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

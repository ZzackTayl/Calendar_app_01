'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Clock, Mail, Users, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface InvitationDetails {
  id: string;
  type: 'individual' | 'group';
  sender_name?: string;
  sender_email?: string;
  recipient_email: string;
  message?: string;
  expires_at: string;
  created_at: string;
  status: string;
  
  // For group invitations
  group_name?: string;
  group_description?: string;
  group_color?: string;
  
  // For individual invitations
  invitation_type?: string;
}

interface ValidationResponse {
  isValid: boolean;
  requiresSignup: boolean;
  invitation?: InvitationDetails;
  error?: string;
}

interface AcceptResponse {
  success: boolean;
  error?: string;
  redirect_url?: string;
}

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const token = params.token as string;

  const [validationStatus, setValidationStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired'>('loading');
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [requiresSignup, setRequiresSignup] = useState(false);

  // Validate invitation token
  useEffect(() => {
    if (!token) {
      setValidationStatus('invalid');
      setError('Invalid invitation link');
      return;
    }

    validateInvitation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const validateInvitation = async () => {
    try {
      const response = await fetch(`/api/invitations/validate/${token}`);
      const data: ValidationResponse = await response.json();

      if (data.isValid && data.invitation) {
        setValidationStatus('valid');
        setInvitation(data.invitation);
        setRequiresSignup(data.requiresSignup);
      } else {
        setValidationStatus('invalid');
        setError(data.error || 'Invalid invitation');
      }
    } catch (error) {
      console.error('Error validating invitation:', error);
      setValidationStatus('invalid');
      setError('Failed to validate invitation');
    }
  };

  const handleAcceptInvitation = async () => {
    if (!user) {
      // Redirect to signup with invitation context
      const signupUrl = `/auth/signup?invitation_token=${token}&email=${encodeURIComponent(invitation?.recipient_email || '')}`;
      router.push(signupUrl);
      return;
    }

    setAccepting(true);
    try {
      const response = await fetch(`/api/invitations/accept/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data: AcceptResponse = await response.json();

      if (data.success) {
        // Show success and redirect
        router.push(data.redirect_url || '/dashboard?invitation_accepted=true');
      } else {
        setError(data.error || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      setError('Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineInvitation = async () => {
    try {
      const response = await fetch(`/api/invitations/decline/${token}`, {
        method: 'POST',
      });

      if (response.ok) {
        router.push('/dashboard?invitation_declined=true');
      } else {
        setError('Failed to decline invitation');
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
      setError('Failed to decline invitation');
    }
  };

  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Expired';
    } else if (diffDays === 0) {
      return 'Expires today';
    } else if (diffDays === 1) {
      return 'Expires tomorrow';
    } else {
      return `Expires in ${diffDays} days`;
    }
  };

  // Loading state
  if (authLoading || validationStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Validating invitation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid invitation
  if (validationStatus === 'invalid' || !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-700">Invalid Invitation</CardTitle>
            <CardDescription>
              {error || 'This invitation link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/dashboard">
              <Button className="w-full">
                Return to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if invitation is expired
  const isExpired = new Date(invitation.expires_at) < new Date();
  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Clock className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <CardTitle className="text-orange-700">Invitation Expired</CardTitle>
            <CardDescription>
              This invitation has expired and is no longer valid.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/dashboard">
              <Button className="w-full">
                Return to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mb-4">
            {invitation.type === 'group' ? (
              <Users className="h-12 w-12 text-blue-600 mx-auto" />
            ) : (
              <Mail className="h-12 w-12 text-blue-600 mx-auto" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {invitation.type === 'group' ? 'Group Invitation' : 'Friend Invitation'}
          </CardTitle>
          <CardDescription>
            You&apos;ve been invited to join{' '}
            {invitation.type === 'group' 
              ? `the group "${invitation.group_name}"` 
              : 'a new connection'
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Invitation Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">From:</span>
              <span className="text-sm">{invitation.sender_email || 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">To:</span>
              <span className="text-sm">{invitation.recipient_email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Status:</span>
              <Badge variant="outline" className="text-green-600 border-green-200">
                {formatExpiryDate(invitation.expires_at)}
              </Badge>
            </div>
            {invitation.type === 'group' && invitation.group_description && (
              <div>
                <span className="text-sm font-medium text-gray-500">Description:</span>
                <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md">
                  {invitation.group_description}
                </p>
              </div>
            )}
            {invitation.message && (
              <div>
                <span className="text-sm font-medium text-gray-500">Personal Message:</span>
                <p className="text-sm mt-1 p-3 bg-gray-50 rounded-md">
                  {invitation.message}
                </p>
              </div>
            )}
          </div>

          {/* Authentication Check */}
          {!user && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You need to sign up or sign in to accept this invitation.
              </AlertDescription>
            </Alert>
          )}

          {/* Error Display */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleAcceptInvitation}
              disabled={accepting}
              className="flex-1"
            >
              {accepting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {user ? 'Accepting...' : 'Redirecting...'}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {user ? 'Accept Invitation' : 'Sign Up & Accept'}
                </>
              )}
            </Button>
            
            {user && (
              <Button
                variant="outline"
                onClick={handleDeclineInvitation}
                disabled={accepting}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Decline
              </Button>
            )}
          </div>

          {/* Alternative Actions */}
          <div className="text-center space-y-2">
            {user && (
              <p className="text-sm text-gray-600">
                Signed in as {user.email}
              </p>
            )}
            {!user && (
              <div className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link 
                  href={`/auth/signin?invitation_token=${token}`}
                  className="text-blue-600 hover:underline"
                >
                  Sign in instead
                </Link>
              </div>
            )}
            <Link href="/dashboard" className="text-sm text-gray-500 hover:underline block">
              Return to Dashboard
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, Clock, User, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { GroupInvitation, PendingGroupInvitationsResponse } from '@/lib/supabase/types';
import { formatDistanceToNow } from 'date-fns';

interface GroupInvitationListProps {
  onInvitationAccepted?: () => void;
  onInvitationDeclined?: () => void;
  className?: string;
}

export function GroupInvitationList({ onInvitationAccepted, onInvitationDeclined, className }: GroupInvitationListProps) {
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchInvitations = async () => {
    try {
      const response = await fetch('/api/groups/invitations/pending');
      const result: PendingGroupInvitationsResponse = await response.json();

      if (result.success) {
        setInvitations(result.invitations);
        setError('');
      } else {
        setError(result.error || 'Failed to fetch group invitations');
      }
    } catch (error) {
      console.error('Error fetching group invitations:', error);
      setError('Failed to fetch group invitations');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleAccept = async (invitationId: string) => {
    try {
      const response = await fetch('/api/groups/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitation_id: invitationId,
          member_permissions: []
        }),
      });

      const result = await response.json();

      if (result.success) {
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        onInvitationAccepted?.();
      } else {
        setError(result.error || 'Failed to accept group invitation');
      }
    } catch (error) {
      console.error('Error accepting group invitation:', error);
      setError('Failed to accept group invitation');
    }
  };

  const handleDecline = async (invitationId: string) => {
    try {
      const response = await fetch(`/api/groups/invitations/${invitationId}/decline`, {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        onInvitationDeclined?.();
      } else {
        setError(result.error || 'Failed to decline group invitation');
      }
    } catch (error) {
      console.error('Error declining group invitation:', error);
      setError('Failed to decline group invitation');
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchInvitations();
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          <span className="ml-2 text-gray-600">Loading group invitations...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Pending Group Invitations
            </CardTitle>
            <CardDescription>
              You have {invitations.length} pending group invitation{invitations.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="border-red-200 bg-red-50 mb-4">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {invitations.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No pending group invitations</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-900">
                      {invitation.inviter?.phone_number || 'Unknown User'}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      Group Invitation
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                  </div>
                </div>

                <div className="mb-3">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {invitation.group?.group_name || 'Unknown Group'}
                  </h4>
                  {invitation.message && (
                    <p className="text-gray-600 text-sm italic">
                      &quot;{invitation.message}&quot;
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Expires {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDecline(invitation.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAccept(invitation.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Accept
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

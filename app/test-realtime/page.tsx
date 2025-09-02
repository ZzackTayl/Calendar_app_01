'use client';

import { useState } from 'react';
import { useRealtimeEvents } from '@/hooks/use-realtime-events';
import { useRealtimeRelationships } from '@/hooks/use-realtime-relationships';
import { useRealtimeInvitations } from '@/hooks/use-realtime-invitations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { format } from 'date-fns';

export default function TestRealtimePage() {
  const { user, demoMode } = useAuth();
  const supabase = createSupabaseClient();
  
  const [testEventTitle, setTestEventTitle] = useState('Test Event ' + Date.now());
  const [testRelationshipName, setTestRelationshipName] = useState('Test Partner ' + Date.now());
  
  // Use all real-time hooks
  const { 
    events, 
    loading: eventsLoading, 
    error: eventsError,
    optimisticUpdate: updateEvent 
  } = useRealtimeEvents({ 
    enableOptimisticUpdates: true 
  });
  
  const { 
    relationships, 
    loading: relationshipsLoading, 
    error: relationshipsError,
    optimisticUpdate: updateRelationship,
    optimisticDelete: deleteRelationship
  } = useRealtimeRelationships({ 
    enableOptimisticUpdates: true 
  });
  
  const { 
    invitations, 
    loading: invitationsLoading, 
    error: invitationsError 
  } = useRealtimeInvitations({ 
    enableOptimisticUpdates: true 
  });

  const createTestEvent = async () => {
    if (!user || demoMode) return;
    
    try {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later
      
      const { data, error } = await supabase
        .from('events')
        .insert({
          user_id: user.id,
          title: testEventTitle,
          description: 'Created for real-time testing',
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          privacy_level: 'public'
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Optimistic update
      if (data) {
        updateEvent(data);
      }
      
      setTestEventTitle('Test Event ' + Date.now());
    } catch (error) {
      console.error('Failed to create test event:', error);
    }
  };

  const createTestRelationship = async () => {
    if (!user || demoMode) return;
    
    try {
      const { data, error } = await supabase
        .from('relationships')
        .insert({
          user_id: user.id,
          partner_name: testRelationshipName,
          relationship_type: 'friendship',
          privacy_level: 'visible'
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Optimistic update
      if (data) {
        updateRelationship(data);
      }
      
      setTestRelationshipName('Test Partner ' + Date.now());
    } catch (error) {
      console.error('Failed to create test relationship:', error);
    }
  };

  const deleteFirstRelationship = async () => {
    if (!user || demoMode || relationships.length === 0) return;
    
    const firstRelationship = relationships[0];
    
    try {
      // Optimistic delete
      deleteRelationship(firstRelationship.id);
      
      const { error } = await supabase
        .from('relationships')
        .delete()
        .eq('id', firstRelationship.id)
        .eq('user_id', user.id);
        
      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete test relationship:', error);
    }
  };

  if (demoMode) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Real-time Testing</h1>
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            Real-time testing is not available in demo mode.
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Real-time Testing</h1>
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Please sign in to test real-time functionality.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Real-time Sync Testing</h1>
        
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Testing Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Open this page in multiple browser tabs or windows</li>
            <li>Create events or relationships in one tab</li>
            <li>Watch them appear instantly in other tabs</li>
            <li>Delete relationships to test real-time removal</li>
            <li>Changes should sync without page refresh</li>
          </ol>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Events Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Events 
                <Badge variant="outline">
                  {eventsLoading ? 'Loading...' : `${events.length} items`}
                </Badge>
              </CardTitle>
              {eventsError && (
                <div className="text-red-600 text-sm">{eventsError}</div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="Test event title"
                  value={testEventTitle}
                  onChange={(e) => setTestEventTitle(e.target.value)}
                />
                <Button onClick={createTestEvent} className="w-full">
                  Create Test Event
                </Button>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {events.map((event) => (
                  <div key={event.id} className="p-2 bg-gray-50 rounded text-sm">
                    <div className="font-medium">{event.title}</div>
                    <div className="text-gray-600">
                      {format(new Date(event.start_time), 'MMM d, h:mm a')}
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <div className="text-gray-500 text-center py-4">
                    No events yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Relationships Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Relationships
                <Badge variant="outline">
                  {relationshipsLoading ? 'Loading...' : `${relationships.length} items`}
                </Badge>
              </CardTitle>
              {relationshipsError && (
                <div className="text-red-600 text-sm">{relationshipsError}</div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="Test partner name"
                  value={testRelationshipName}
                  onChange={(e) => setTestRelationshipName(e.target.value)}
                />
                <Button onClick={createTestRelationship} className="w-full">
                  Create Test Relationship
                </Button>
                <Button 
                  onClick={deleteFirstRelationship} 
                  variant="destructive" 
                  className="w-full"
                  disabled={relationships.length === 0}
                >
                  Delete First Relationship
                </Button>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {relationships.map((relationship) => (
                  <div key={relationship.id} className="p-2 bg-gray-50 rounded text-sm">
                    <div className="font-medium">{relationship.partner_name}</div>
                    <div className="text-gray-600 capitalize">
                      {relationship.relationship_type?.replace('_', ' ')}
                    </div>
                  </div>
                ))}
                {relationships.length === 0 && (
                  <div className="text-gray-500 text-center py-4">
                    No relationships yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Invitations Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Invitations
                <Badge variant="outline">
                  {invitationsLoading ? 'Loading...' : `${invitations.length} items`}
                </Badge>
              </CardTitle>
              {invitationsError && (
                <div className="text-red-600 text-sm">{invitationsError}</div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-600 mb-4">
                Invitations are created when you send relationship invitations from the Relationships page.
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="p-2 bg-gray-50 rounded text-sm">
                    <div className="font-medium">{invitation.recipient_email}</div>
                    <div className="text-gray-600 flex items-center justify-between">
                      <span className="capitalize">{invitation.status}</span>
                      <Badge variant="secondary" className="text-xs">
                        {invitation.invitation_type?.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
                {invitations.length === 0 && (
                  <div className="text-gray-500 text-center py-4">
                    No invitations yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Connection Status */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Connection Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-sm font-medium">Events</div>
                  <div className={`text-xs ${eventsError ? 'text-red-600' : 'text-green-600'}`}>
                    {eventsError ? 'Error' : 'Connected'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">Relationships</div>
                  <div className={`text-xs ${relationshipsError ? 'text-red-600' : 'text-green-600'}`}>
                    {relationshipsError ? 'Error' : 'Connected'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">Invitations</div>
                  <div className={`text-xs ${invitationsError ? 'text-red-600' : 'text-green-600'}`}>
                    {invitationsError ? 'Error' : 'Connected'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
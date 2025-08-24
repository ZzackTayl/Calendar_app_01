'use client';

import { useState } from 'react';
import { InvitationSender } from '@/components/ui/invitation-sender';
import { InvitationList } from '@/components/ui/invitation-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Mail, Settings } from 'lucide-react';

export default function InvitationsPage() {
  const [activeTab, setActiveTab] = useState('send');

  const handleInvitationSent = () => {
    // Refresh the pending invitations list
    setActiveTab('pending');
  };

  const handleInvitationAccepted = () => {
    // Could show a success message or redirect
    console.log('Invitation accepted');
  };

  const handleInvitationDeclined = () => {
    // Could show a message
    console.log('Invitation declined');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Invitations</h1>
        <p className="text-gray-600">
          Send invitations to friends and manage your pending invitations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Send Invitation
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Pending Invitations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-6">
          <InvitationSender 
            onInvitationSent={handleInvitationSent}
            className="max-w-2xl"
          />
          
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Send Invitation</p>
                    <p className="text-sm text-gray-600">
                      Enter your friend&apos;s email and optionally add a personal message.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Friend Receives Invitation</p>
                    <p className="text-sm text-gray-600">
                      Your friend gets an email with a secure invitation link.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Setup Permissions</p>
                    <p className="text-sm text-gray-600">
                      Your friend can set individual and group permissions, create relationships, and organize connections.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Start Sharing</p>
                    <p className="text-sm text-gray-600">
                      Once connected, you can see each other&apos;s events based on the privacy settings you&apos;ve chosen.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-6">
          <InvitationList 
            onInvitationAccepted={handleInvitationAccepted}
            onInvitationDeclined={handleInvitationDeclined}
            className="max-w-2xl"
          />
          
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Privacy & Permissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Individual vs Group Permissions</h4>
                <p className="text-sm text-blue-700 mb-3">
                  You can set different permissions for the same person in different contexts:
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <strong>Individual:</strong> When you interact directly with this person</li>
                  <li>• <strong>Group:</strong> When this person is part of a group you&apos;re both in</li>
                  <li>• <strong>Hierarchy:</strong> The most permissive setting will be used when both apply</li>
                </ul>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">Skip Setup Option</h4>
                <p className="text-sm text-green-700">
                  You can skip the permission setup entirely. In this case, you won&apos;t be able to see each other&apos;s events, 
                  but you&apos;ll still be connected and can set up permissions later.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

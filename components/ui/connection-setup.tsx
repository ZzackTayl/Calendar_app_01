'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Settings, Users, Shield, SkipForward, CheckCircle, XCircle } from 'lucide-react';
import { AcceptInvitationRequest, ConnectionSetupResponse, RelationshipType, PrivacyLevel } from '@/lib/supabase/types';
import { createSupabaseClient } from '@/lib/supabase/client';

interface ConnectionSetupProps {
  invitationId: string;
  onSetupComplete?: (response: ConnectionSetupResponse) => void;
  onSkip?: () => void;
  className?: string;
}

export function ConnectionSetup({ invitationId, onSetupComplete, onSkip, className }: ConnectionSetupProps) {
  const [step, setStep] = useState<'permissions' | 'relationship' | 'groups' | 'complete'>('permissions');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Individual permission settings
  const [userAToBIndividualPermission, setUserAToBIndividualPermission] = useState<PrivacyLevel>('limited_access');
  const [userBToAIndividualPermission, setUserBToAIndividualPermission] = useState<PrivacyLevel>('limited_access');
  
  // Group permission settings (if assigned to group)
  const [userAToBGroupPermission, setUserAToBGroupPermission] = useState<PrivacyLevel>('limited_access');
  const [userBToAGroupPermission, setUserBToAGroupPermission] = useState<PrivacyLevel>('limited_access');
  
  // Relationship settings
  const [createRelationship, setCreateRelationship] = useState(false);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('romantic');
  const [customRelationshipName, setCustomRelationshipName] = useState('');
  
  // Group settings
  const [assignToGroup, setAssignToGroup] = useState(false);
  const [createNewGroup, setCreateNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [existingGroups, setExistingGroups] = useState<any[]>([]);

  const supabase = createSupabaseClient();

  useEffect(() => {
    fetchExistingGroups();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchExistingGroups = async () => {
    try {
      const { data: groups } = await supabase
        .from('relationship_groups')
        .select('id, group_name, description')
        .order('group_name');
      
      setExistingGroups(groups || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setError('');

    try {
      const setupData: AcceptInvitationRequest = {
        invitation_id: invitationId,
        setup_permissions: true,
        create_relationship,
        relationship_type: createRelationship ? relationshipType : undefined,
        custom_relationship_name: createRelationship && relationshipType === 'custom' ? customRelationshipName : undefined,
        assign_to_group: assignToGroup,
        group_id: assignToGroup && !createNewGroup ? selectedGroupId : undefined,
        create_new_group: createNewGroup,
        new_group_name: createNewGroup ? newGroupName : undefined,
        new_group_description: createNewGroup ? newGroupDescription : undefined,
        // Individual permissions
        user_a_to_b_individual_permission: userAToBIndividualPermission,
        user_b_to_a_individual_permission: userBToAIndividualPermission,
        // Group permissions (if assigned to group)
        user_a_to_b_group_permission: assignToGroup ? userAToBGroupPermission : undefined,
        user_b_to_a_group_permission: assignToGroup ? userBToAGroupPermission : undefined
      };

      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(setupData),
      });

      const result: ConnectionSetupResponse = await response.json();

      if (result.success) {
        setStep('complete');
        onSetupComplete?.(result);
      } else {
        setError(result.error || 'Failed to complete setup');
      }
    } catch (error) {
      console.error('Error completing setup:', error);
      setError('Failed to complete setup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    onSkip?.();
  };

  const renderPermissionsStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy & Permissions</h3>
        <p className="text-sm text-gray-600 mb-6">
          Set up how you and your friend can see each other&apos;s events and information.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-4">
          <div>
            <h4 className="text-md font-medium text-gray-800 mb-3">Individual Permissions (Direct Connection)</h4>
            <p className="text-sm text-gray-600 mb-4">
              These permissions apply when you interact directly with this person, outside of any groups.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What can your friend see about you (individually)?
            </label>
            <select
              value={userAToBIndividualPermission}
              onChange={(e) => setUserAToBIndividualPermission(e.target.value as PrivacyLevel)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              aria-label="What can your friend see about you individually"
            >
              <option value="full_access">Full Access - See all events and details</option>
              <option value="limited_access">Limited Access - See basic event info only</option>
              <option value="busy_only">Busy Only - See when you&apos;re busy, not details</option>
              <option value="hidden">Hidden - No access to your calendar</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What can you see about your friend (individually)?
            </label>
            <select
              value={userBToAIndividualPermission}
              onChange={(e) => setUserBToAIndividualPermission(e.target.value as PrivacyLevel)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              aria-label="What can you see about your friend individually"
            >
              <option value="full_access">Full Access - See all events and details</option>
              <option value="limited_access">Limited Access - See basic event info only</option>
              <option value="busy_only">Busy Only - See when they&apos;re busy, not details</option>
              <option value="hidden">Hidden - No access to their calendar</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800 mb-1">Privacy Note</p>
            <p className="text-xs text-blue-700">
              You can always change these settings later in your privacy preferences. 
              If you choose &quot;Hidden&quot; for both, you won&apos;t be able to see each other&apos;s events.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRelationshipStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Relationship Setup</h3>
        <p className="text-sm text-gray-600 mb-6">
          Optionally create a relationship connection to better organize your calendar.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center">
          <input
            id="create-relationship"
            type="checkbox"
            checked={createRelationship}
            onChange={(e) => setCreateRelationship(e.target.checked)}
            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
          />
          <label htmlFor="create-relationship" className="ml-2 block text-sm text-gray-700">
            Create a relationship connection
          </label>
        </div>

        {createRelationship && (
          <div className="space-y-4 pl-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Relationship Type
              </label>
              <select
                value={relationshipType}
                onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                aria-label="Relationship type"
              >
                <option value="romantic">Romantic</option>
                <option value="platonic">Platonic</option>
                <option value="primary_partner">Primary Partner</option>
                <option value="secondary_partner">Secondary Partner</option>
                <option value="nesting_partner">Nesting Partner</option>
                <option value="long_distance">Long Distance</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {relationshipType === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Relationship Name
                </label>
                <Input
                  value={customRelationshipName}
                  onChange={(e) => setCustomRelationshipName(e.target.value)}
                  placeholder="e.g., Comet, Play Partner, etc."
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderGroupsStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Group Assignment</h3>
        <p className="text-sm text-gray-600 mb-6">
          Optionally add this connection to a group for better organization.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center">
          <input
            id="assign-to-group"
            type="checkbox"
            checked={assignToGroup}
            onChange={(e) => setAssignToGroup(e.target.checked)}
            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
          />
          <label htmlFor="assign-to-group" className="ml-2 block text-sm text-gray-700">
            Add to a group
          </label>
        </div>

        {assignToGroup && (
          <div className="space-y-4 pl-6">
            <div className="flex items-center">
              <input
                id="create-new-group"
                type="radio"
                checked={createNewGroup}
                onChange={() => setCreateNewGroup(true)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
              />
              <label htmlFor="create-new-group" className="ml-2 block text-sm text-gray-700">
                Create a new group
              </label>
            </div>

            <div className="flex items-center">
              <input
                id="use-existing-group"
                type="radio"
                checked={!createNewGroup}
                onChange={() => setCreateNewGroup(false)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
              />
              <label htmlFor="use-existing-group" className="ml-2 block text-sm text-gray-700">
                Use an existing group
              </label>
            </div>

            {createNewGroup && (
              <div className="space-y-3 pl-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name
                  </label>
                  <Input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g., Close Friends, Polycule, etc."
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (Optional)
                  </label>
                  <textarea
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="Describe this group..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                  />
                </div>
              </div>
            )}

            {!createNewGroup && existingGroups.length > 0 && (
              <div className="pl-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Group
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                  aria-label="Select group"
                >
                  <option value="">Choose a group...</option>
                  {existingGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.group_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Group Permissions */}
            {assignToGroup && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-3">Group Permissions</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    These permissions apply when this person is in the selected group context.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What can your friend see about you (in group context)?
                    </label>
                    <select
                      value={userAToBGroupPermission}
                      onChange={(e) => setUserAToBGroupPermission(e.target.value as PrivacyLevel)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                      aria-label="What can your friend see about you in group context"
                    >
                      <option value="full_access">Full Access - See all events and details</option>
                      <option value="limited_access">Limited Access - See basic event info only</option>
                      <option value="busy_only">Busy Only - See when you&apos;re busy, not details</option>
                      <option value="hidden">Hidden - No access to your calendar</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What can you see about your friend (in group context)?
                    </label>
                    <select
                      value={userBToAGroupPermission}
                      onChange={(e) => setUserBToAGroupPermission(e.target.value as PrivacyLevel)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
                      aria-label="What can you see about your friend in group context"
                    >
                      <option value="full_access">Full Access - See all events and details</option>
                      <option value="limited_access">Limited Access - See basic event info only</option>
                      <option value="busy_only">Busy Only - See when they&apos;re busy, not details</option>
                      <option value="hidden">Hidden - No access to their calendar</option>
                    </select>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm text-blue-800 font-medium mb-1">Permission Hierarchy</p>
                      <p className="text-xs text-blue-700">
                        Group permissions can override individual permissions when both apply. 
                        The most permissive setting will be used.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="text-center space-y-4">
      <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
      <h3 className="text-lg font-medium text-gray-900">Setup Complete!</h3>
      <p className="text-sm text-gray-600">
        Your connection has been established. You can now see each other&apos;s events based on your privacy settings.
      </p>
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 'permissions':
        return renderPermissionsStep();
      case 'relationship':
        return renderRelationshipStep();
      case 'groups':
        return renderGroupsStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'permissions':
        return true;
      case 'relationship':
        return !createRelationship || (createRelationship && relationshipType !== 'custom' || customRelationshipName.trim());
      case 'groups':
        return !assignToGroup || 
               (assignToGroup && createNewGroup && newGroupName.trim()) ||
               (assignToGroup && !createNewGroup && selectedGroupId);
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 'permissions') setStep('relationship');
    else if (step === 'relationship') setStep('groups');
    else if (step === 'groups') handleComplete();
  };

  const handleBack = () => {
    if (step === 'relationship') setStep('permissions');
    else if (step === 'groups') setStep('relationship');
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Connection Setup
        </CardTitle>
        <CardDescription>
          Configure your connection with your friend
        </CardDescription>
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

        {/* Step Indicator */}
        {step !== 'complete' && (
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'permissions' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className="w-8 h-1 bg-gray-200"></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'relationship' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
              <div className="w-8 h-1 bg-gray-200"></div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'groups' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                3
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="mb-6">
          {renderStepContent()}
        </div>

        {/* Action Buttons */}
        {step !== 'complete' && (
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {step !== 'permissions' && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={isLoading}
                >
                  Back
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleSkip}
                disabled={isLoading}
                className="text-gray-600"
              >
                <SkipForward className="w-4 h-4 mr-2" />
                Skip Setup
              </Button>
            </div>
            
            <Button
              onClick={handleNext}
              disabled={isLoading || !canProceed()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting up...
                </>
              ) : step === 'groups' ? (
                'Complete Setup'
              ) : (
                'Next'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

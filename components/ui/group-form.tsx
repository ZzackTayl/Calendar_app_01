'use client';

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type RelationshipGroup, type Relationship } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users2, 
  Save, 
  Plus, 
  X
} from 'lucide-react'
import { ColorPicker } from './color-picker'
import { SimplifiedPrivacySelector, type SimplifiedPrivacyLevel } from './simplified-privacy-selector'

interface GroupFormProps {
  group?: RelationshipGroup
  onSubmit: (data: GroupFormData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

interface GroupFormData {
  group_name: string
  color: string
  members: GroupMemberData[]
}

interface GroupMemberData {
  relationship_id: string
  privacy_level: 'visible' | 'private' | 'semi_private'
  relationship: Relationship
}


export function GroupForm({ group, onSubmit, onCancel, loading = false }: GroupFormProps) {
  const { user } = useAuth()
  const supabase = createSupabaseClient()
  
  const [groupName, setGroupName] = useState(group?.group_name || '')
  const [groupColor, setGroupColor] = useState(group?.color || '#2563eb')
  const [defaultPrivacyLevel, setDefaultPrivacyLevel] = useState<SimplifiedPrivacyLevel>('private')
  const [selectedMembers, setSelectedMembers] = useState<GroupMemberData[]>([])
  const [availableRelationships, setAvailableRelationships] = useState<Relationship[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')
  const [loadingRelationships, setLoadingRelationships] = useState(false)

  useEffect(() => {
    if (user) {
      loadRelationships()
      if (group) {
        loadExistingMembers()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, group])



  const loadRelationships = async () => {
    try {
      setLoadingRelationships(true)
      const { data, error } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('partner_name')

      if (error) throw error
      setAvailableRelationships(data || [])
    } catch (e) {
      console.error('Error loading relationships:', e)
      setError('Failed to load relationships')
    } finally {
      setLoadingRelationships(false)
    }
  }

  const loadExistingMembers = async () => {
    if (!group) return
    
    try {
      const { data, error } = await supabase
        .from('relationship_group_members')
        .select(`
          *,
          relationship:relationships(*)
        `)
        .eq('group_id', group.id)

      if (error) throw error
      
      const members = (data || []).map((member: any) => ({
        relationship_id: member.relationship_id,
        privacy_level: member.privacy_level,
        relationship: member.relationship
      }))
      
      setSelectedMembers(members)
    } catch (e) {
      console.error('Error loading existing members:', e)
      setError('Failed to load existing members')
    }
  }

  const handleAddMember = (relationship: Relationship) => {
    if (selectedMembers.some(m => m.relationship_id === relationship.id)) {
      return // Already added
    }

    setSelectedMembers(prev => [...prev, {
      relationship_id: relationship.id,
      privacy_level: defaultPrivacyLevel,
      relationship
    }])
  }

  const handleRemoveMember = (relationshipId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.relationship_id !== relationshipId))
  }




  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!groupName.trim()) {
      setError('Group name is required')
      return
    }

    if (selectedMembers.length === 0) {
      setError('At least one member is required')
      return
    }

    try {
      await onSubmit({
        group_name: groupName.trim(),
        color: groupColor,
        members: selectedMembers
      })
    } catch (e) {
      console.error('Error submitting form:', e)
      setError('Failed to save group')
    }
  }

  const filteredRelationships = availableRelationships.filter(relationship =>
    !selectedMembers.some(m => m.relationship_id === relationship.id) &&
    (relationship.partner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     relationship.partner_email?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getPrivacyLevelBadge = (level: string) => {
    const badges = {
      visible: { label: 'Visible', variant: 'default' as const },
      private: { label: 'Private', variant: 'secondary' as const },
      semi_private: { label: 'Semi-Private', variant: 'outline' as const }
    }
    return badges[level as keyof typeof badges] || badges.private
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}


      {/* Basic Group Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5" />
            Group Details
          </CardTitle>
          <CardDescription>
            Give your group a name and color
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="groupName">Group Name *</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter a name for your group"
                required
                className="text-base"
              />
            </div>
            
            <div>
              <ColorPicker
                value={groupColor}
                onChange={setGroupColor}
                disabled={loading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
          <CardDescription>
            Choose how much of your calendar this group can see
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimplifiedPrivacySelector
            value={defaultPrivacyLevel}
            onChange={(level) => {
              setDefaultPrivacyLevel(level)
              // Apply to all existing members
              setSelectedMembers(prev => prev.map(member => ({
                ...member,
                privacy_level: level
              })))
            }}
            disabled={loading}
          />
        </CardContent>
      </Card>

      {/* Member Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5" />
            Group Members ({selectedMembers.length})
          </CardTitle>
          <CardDescription>
            Select relationships to include in this group and set their privacy levels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div className="space-y-3">
              <Label>Selected Members</Label>
              {selectedMembers.map((member) => {
                const privacyBadge = getPrivacyLevelBadge(member.privacy_level)
                const simplePrivacy = mapFromTechnicalPrivacy(member.privacy_level)
                
                return (
                  <div
                    key={member.relationship_id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-sm"
                        style={{ backgroundColor: member.relationship.color || groupColor }}
                      >
                        {member.relationship.partner_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">
                          {member.relationship.partner_name}
                        </div>
                        {member.relationship.partner_email && (
                          <div className="text-sm text-muted-foreground truncate">
                            {member.relationship.partner_email}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          Privacy: <span className="font-medium">
                            {simplePrivacy === 'everything' && 'Can see everything'}
                            {simplePrivacy === 'custom' && 'You choose per event'}
                            {simplePrivacy === 'visible_private' && 'Only sees "busy"'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge {...getPrivacyLevelBadge(member.privacy_level)} />
                      
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.relationship_id)}
                        className="hover:bg-destructive hover:text-destructive-foreground"
                        title="Remove from group"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
              

            </div>
          )}

          {/* Add New Members */}
          <div className="space-y-3">
            <Label>Add Members</Label>
            
            <Input
              placeholder="Search relationships..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {loadingRelationships ? (
              <div className="text-center py-4 text-muted-foreground">
                Loading relationships...
              </div>
            ) : filteredRelationships.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                {searchTerm ? 'No relationships match your search.' : 'No relationships available to add.'}
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredRelationships.map((relationship) => (
                  <div
                    key={relationship.id}
                    className="flex items-center justify-between p-2 border rounded hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: relationship.color || '#6b7280' }}
                      >
                        {relationship.partner_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{relationship.partner_name}</div>
                        {relationship.relationship_type && (
                          <div className="text-xs text-muted-foreground">
                            {relationship.relationship_type}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddMember(relationship)}
                      className="hover:bg-primary hover:text-primary-foreground"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading || !groupName.trim() || selectedMembers.length === 0}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {group ? 'Update Group' : 'Create Group'}
        </Button>
      </div>
    </form>
  )
}

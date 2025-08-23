'use client';

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type RelationshipGroup, type Relationship } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users2, 
  Save, 
  Plus, 
  X,
  Shield,
  Eye,
  EyeOff,
  Calendar,
  Lock,
  Settings
} from 'lucide-react'
import { PrivacyLevelSelector } from './privacy-level-selector'

interface GroupFormProps {
  group?: RelationshipGroup
  onSubmit: (data: GroupFormData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

interface GroupFormData {
  group_name: string
  description?: string
  members: GroupMemberData[]
}

interface GroupMemberData {
  relationship_id: string
  privacy_level: 'full_access' | 'limited_access' | 'busy_only' | 'hidden'
  relationship: Relationship
}

const permissionTemplates = [
  {
    id: 'family',
    name: 'Family',
    description: 'Full access for close family members',
    icon: Users2,
    defaultPrivacy: 'full_access' as const
  },
  {
    id: 'friends',
    name: 'Friends',
    description: 'Limited access for social connections',
    icon: Users2,
    defaultPrivacy: 'limited_access' as const
  },
  {
    id: 'work',
    name: 'Work',
    description: 'Busy-only visibility for professional contacts',
    icon: Calendar,
    defaultPrivacy: 'busy_only' as const
  },
  {
    id: 'private',
    name: 'Private',
    description: 'Hidden from most views',
    icon: Lock,
    defaultPrivacy: 'hidden' as const
  }
]

export function GroupForm({ group, onSubmit, onCancel, loading = false }: GroupFormProps) {
  const { user } = useAuth()
  const supabase = createSupabaseClient()
  
  const [groupName, setGroupName] = useState(group?.group_name || '')
  const [description, setDescription] = useState(group?.description || '')
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

  const handleAddMember = (relationship: Relationship, privacyLevel: 'full_access' | 'limited_access' | 'busy_only' | 'hidden' = 'limited_access') => {
    if (selectedMembers.some(m => m.relationship_id === relationship.id)) {
      return // Already added
    }

    setSelectedMembers(prev => [...prev, {
      relationship_id: relationship.id,
      privacy_level: privacyLevel,
      relationship
    }])
  }

  const handleRemoveMember = (relationshipId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.relationship_id !== relationshipId))
  }

  const handleUpdateMemberPrivacy = (relationshipId: string, privacyLevel: 'full_access' | 'limited_access' | 'busy_only' | 'hidden') => {
    setSelectedMembers(prev => prev.map(m => 
      m.relationship_id === relationshipId 
        ? { ...m, privacy_level: privacyLevel }
        : m
    ))
  }

  const handleApplyTemplate = (template: typeof permissionTemplates[0]) => {
    setSelectedMembers(prev => prev.map(member => ({
      ...member,
      privacy_level: template.defaultPrivacy
    })))
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
        description: description.trim() || undefined,
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
      full_access: { label: 'Full Access', variant: 'default' as const, icon: Eye },
      limited_access: { label: 'Limited', variant: 'secondary' as const, icon: EyeOff },
      busy_only: { label: 'Busy Only', variant: 'outline' as const, icon: Calendar },
      hidden: { label: 'Hidden', variant: 'destructive' as const, icon: Lock }
    }
    return badges[level as keyof typeof badges] || badges.limited_access
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
          <CardTitle>Group Information</CardTitle>
          <CardDescription>
            Basic details about your group
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name *</Label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for the group"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Permission Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Permission Templates
          </CardTitle>
          <CardDescription>
            Quick templates to set privacy levels for all members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {permissionTemplates.map((template) => {
              const IconComponent = template.icon
              return (
                <Button
                  key={template.id}
                  type="button"
                  variant="outline"
                  className="h-auto p-3 justify-start"
                  onClick={() => handleApplyTemplate(template)}
                  disabled={selectedMembers.length === 0}
                >
                  <IconComponent className="h-4 w-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">{template.name}</div>
                    <div className="text-xs text-muted-foreground">{template.description}</div>
                  </div>
                </Button>
              )
            })}
          </div>
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
                const IconComponent = privacyBadge.icon
                
                return (
                  <div
                    key={member.relationship_id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: member.relationship.color || '#6b7280' }}
                      >
                        {member.relationship.partner_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-medium">{member.relationship.partner_name}</div>
                        {member.relationship.partner_email && (
                          <div className="text-sm text-muted-foreground">
                            {member.relationship.partner_email}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <PrivacyLevelSelector
                        value={member.privacy_level}
                        onChange={(level) => handleUpdateMemberPrivacy(member.relationship_id, level as 'full_access' | 'limited_access' | 'busy_only' | 'hidden')}
                      />
                      
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.relationship_id)}
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

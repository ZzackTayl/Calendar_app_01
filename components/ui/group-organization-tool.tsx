'use client';

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type RelationshipGroup, type Relationship, type GroupWithMembers } from '@/lib/supabase/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Users2, 
  Plus, 
  Search, 
  Eye, 
  EyeOff, 
  Calendar, 
  Lock,
  Save,
  RefreshCw,
  Grid3X3,
  List,
  Palette
} from 'lucide-react'

interface GroupOrganizationToolProps {
  onGroupsChange?: (groups: GroupWithMembers[]) => void
  className?: string
}

interface DragState {
  isDragging: boolean
  draggedItem: Relationship | null
  sourceGroup: string | null
}

export function GroupOrganizationTool({ onGroupsChange, className }: GroupOrganizationToolProps) {
  const { user } = useAuth()
  const supabase = createSupabaseClient()
  
  const [groups, setGroups] = useState<GroupWithMembers[]>([])
  const [availableRelationships, setAvailableRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    sourceGroup: null
  })

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load groups with members
      const { data: groupsData, error: groupsError } = await supabase
        .from('relationship_groups')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
      
      if (groupsError) throw groupsError

      const groupsWithMembers = await Promise.all(
        (groupsData || []).map(async (group: RelationshipGroup) => {
          const { data: membersData, error: membersError } = await supabase
            .from('relationship_group_members')
            .select(`
              *,
              relationship:relationships(*)
            `)
            .eq('group_id', group.id)
          
          if (membersError) {
            console.error('Error fetching members for group:', group.id, membersError)
            return { ...group, members: [], member_count: 0 }
          }

          return {
            ...group,
            members: membersData || [],
            member_count: membersData?.length || 0
          }
        })
      )
      
      setGroups(groupsWithMembers)

      // Load available relationships
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('partner_name')

      if (relationshipsError) throw relationshipsError
      setAvailableRelationships(relationshipsData || [])

    } catch (e) {
      console.error('Error loading data:', e)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (relationship: Relationship, sourceGroupId: string | null) => {
    setDragState({
      isDragging: true,
      draggedItem: relationship,
      sourceGroup: sourceGroupId
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (targetGroupId: string | null) => {
    if (!dragState.draggedItem) return

    try {
      const relationship = dragState.draggedItem
      const sourceGroupId = dragState.sourceGroup

      // Remove from source group if it exists
      if (sourceGroupId) {
        await supabase
          .from('relationship_group_members')
          .delete()
          .eq('group_id', sourceGroupId)
          .eq('relationship_id', relationship.id)
      }

      // Add to target group if specified
      if (targetGroupId) {
        await supabase
          .from('relationship_group_members')
          .insert({
            group_id: targetGroupId,
            relationship_id: relationship.id,
            privacy_level: 'limited_access' // Default privacy level
          })
      }

      // Refresh data
      await loadData()
      onGroupsChange?.(groups)

    } catch (e) {
      console.error('Error moving relationship:', e)
      setError('Failed to move relationship')
    } finally {
      setDragState({
        isDragging: false,
        draggedItem: null,
        sourceGroup: null
      })
    }
  }

  const handleSaveChanges = async () => {
    setSaving(true)
    setError('')
    
    try {
      // Save all group changes
      for (const group of groups) {
        // Remove existing members
        await supabase
          .from('relationship_group_members')
          .delete()
          .eq('group_id', group.id)

        // Add current members
        if (group.members && group.members.length > 0) {
          const memberData = group.members.map(member => ({
            group_id: group.id,
            relationship_id: member.relationship_id,
            privacy_level: member.privacy_level
          }))

          await supabase
            .from('relationship_group_members')
            .insert(memberData)
        }
      }

      setError('')
      onGroupsChange?.(groups)
    } catch (e) {
      console.error('Error saving changes:', e)
      setError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const getPrivacyLevelBadge = (level: string) => {
    const badges = {
      full_access: { label: 'Full Access', variant: 'default' as const, icon: Eye },
      limited_access: { label: 'Limited', variant: 'secondary' as const, icon: EyeOff },
      busy_only: { label: 'Busy Only', variant: 'outline' as const, icon: Calendar },
      hidden: { label: 'Hidden', variant: 'destructive' as const, icon: Lock }
    }
    return badges[level as keyof typeof badges] || badges.limited_access
  }

  const filteredGroups = groups.filter(group =>
    group.group_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const ungroupedRelationships = availableRelationships.filter(relationship =>
    !groups.some(group => 
      group.members?.some(member => member.relationship_id === relationship.id)
    )
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription className="break-words">{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Input
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64 min-w-0"
          />
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Button
            onClick={handleSaveChanges}
            disabled={saving}
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Groups Grid/List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
        {filteredGroups.map((group) => (
          <Card
            key={group.id}
            className={`relative ${dragState.isDragging ? 'ring-2 ring-primary' : ''}`}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(group.id)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 min-w-0 groups-card-content">
                <Users2 className="h-5 w-5 flex-shrink-0 groups-flex-item" />
                <span className="truncate groups-card-title">{group.group_name}</span>
              </CardTitle>
              {group.description && (
                <CardDescription className="break-words groups-card-description">{group.description}</CardDescription>
              )}
              <div className="text-sm text-muted-foreground">
                {group.member_count} member{group.member_count !== 1 ? 's' : ''}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3 groups-card-content">
              {group.members?.map((member) => {
                const privacyBadge = getPrivacyLevelBadge(member.privacy_level)
                const IconComponent = privacyBadge.icon
                
                return (
                  <div
                    key={member.id}
                    draggable
                    onDragStart={() => handleDragStart(member.relationship, group.id)}
                    className="flex items-center justify-between p-2 border rounded hover:bg-muted/50 transition-colors cursor-move groups-relationship-item"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 groups-flex-container">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium relationship-avatar flex-shrink-0 groups-flex-item"
                        data-color={member.relationship.color || '#6b7280'}
                      >
                        {member.relationship.partner_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="text-sm min-w-0 flex-1 groups-flex-grow">
                        <div className="font-medium truncate groups-relationship-name">{member.relationship.partner_name}</div>
                        <div className="text-xs text-muted-foreground truncate groups-relationship-type">
                          {member.relationship.relationship_type}
                        </div>
                      </div>
                    </div>
                    
                    <Badge variant={privacyBadge.variant} className="flex items-center gap-1 flex-shrink-0 groups-flex-item">
                      <IconComponent className="h-3 w-3" />
                      <span className="hidden sm:inline">{privacyBadge.label}</span>
                    </Badge>
                  </div>
                )
              })}
              
              {(!group.members || group.members.length === 0) && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Drop relationships here
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ungrouped Relationships */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users2 className="h-5 w-5 flex-shrink-0 groups-flex-item" />
            Ungrouped Relationships
          </CardTitle>
          <CardDescription className="break-words groups-card-description">
            Relationships not assigned to any group. Drag them to a group or leave them ungrouped.
          </CardDescription>
        </CardHeader>
        
        <CardContent
          className="min-h-[200px] border-2 border-dashed border-muted-foreground/20 rounded-lg p-4"
          onDragOver={handleDragOver}
          onDrop={() => handleDrop(null)}
        >
          {ungroupedRelationships.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground break-words groups-page-description">
              All relationships are organized into groups
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ungroupedRelationships.map((relationship) => (
                <div
                  key={relationship.id}
                  draggable
                  onDragStart={() => handleDragStart(relationship, null)}
                  className="flex items-center gap-2 p-2 border rounded hover:bg-muted/50 transition-colors cursor-move groups-relationship-item"
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium relationship-avatar flex-shrink-0 groups-flex-item"
                    data-color={relationship.color || '#6b7280'}
                  >
                    {relationship.partner_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="text-sm min-w-0 flex-1 groups-flex-grow">
                    <div className="font-medium truncate groups-relationship-name">{relationship.partner_name}</div>
                    <div className="text-xs text-muted-foreground truncate groups-relationship-type">
                      {relationship.relationship_type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client';

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type RelationshipGroup, type GroupWithMembers, type GroupMember } from '@/lib/supabase/types'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft, 
  Users2, 
  Edit, 
  Trash2, 
  UserPlus,
  Settings,
  Calendar,
  Shield,
  MoreHorizontal,
  Eye,
  EyeOff,
  Lock,
  Unlock
} from 'lucide-react'
import { format } from 'date-fns'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface GroupMemberWithDetails extends GroupMember {
  relationship: {
    id: string
    partner_name: string
    partner_email?: string
    relationship_type: string
    color?: string
  }
}

export default function GroupDetailPage() {
  const { user } = useAuth()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  const [group, setGroup] = useState<RelationshipGroup | null>(null)
  const [members, setMembers] = useState<GroupMemberWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }
    loadGroupData()
  }, [user, groupId, router])

  const loadGroupData = async () => {
    try {
      setLoading(true)
      
      // Load group details
      const { data: groupData, error: groupError } = await supabase
        .from('relationship_groups')
        .select('*')
        .eq('id', groupId)
        .eq('user_id', user?.id)
        .single()

      if (groupError) throw groupError
      setGroup(groupData)

      // Load group members with relationship details
      const { data: membersData, error: membersError } = await supabase
        .from('relationship_group_members')
        .select(`
          *,
          relationship:relationships(
            id,
            partner_name,
            partner_email,
            relationship_type,
            color
          )
        `)
        .eq('group_id', groupId)

      if (membersError) throw membersError
      setMembers(membersData || [])

    } catch (e) {
      console.error('Error loading group data:', e)
      setError('Failed to load group data')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!confirm('Are you sure you want to delete this group? This will remove all members but not the relationships themselves.')) {
      return
    }

    try {
      // Delete group members first
      await supabase
        .from('relationship_group_members')
        .delete()
        .eq('group_id', groupId)

      // Then delete the group
      const { error } = await supabase
        .from('relationship_groups')
        .delete()
        .eq('id', groupId)

      if (error) throw error
      router.push('/groups')
    } catch (e) {
      console.error('Error deleting group:', e)
      setError('Failed to delete group')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the group?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('relationship_group_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error
      loadGroupData() // Refresh data
    } catch (e) {
      console.error('Error removing member:', e)
      setError('Failed to remove member')
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

  const filteredMembers = members.filter(member =>
    member.relationship.partner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.relationship.partner_email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="mb-4">Group not found.</p>
            <Button onClick={() => router.push('/groups')}>Back to Groups</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card/80 backdrop-blur border-b border-border sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/groups')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <div className="flex-1">
              <h1 className="text-xl font-semibold">{group.group_name}</h1>
              {group.description && (
                <p className="text-sm text-muted-foreground">{group.description}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/groups/${groupId}/edit`)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/groups/${groupId}/members`)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Manage Members
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDeleteGroup} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Group Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users2 className="h-5 w-5" />
              Group Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{members.length}</div>
                <div className="text-sm text-muted-foreground">Total Members</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {members.filter(m => m.privacy_level === 'full_access').length}
                </div>
                <div className="text-sm text-muted-foreground">Full Access</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {members.filter(m => m.privacy_level === 'limited_access').length}
                </div>
                <div className="text-sm text-muted-foreground">Limited Access</div>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Created: {format(new Date(group.created_at), 'PPP')}
              {group.updated_at !== group.created_at && 
                ` • Updated: ${format(new Date(group.updated_at), 'PPP')}`
              }
            </div>
          </CardContent>
        </Card>

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users2 className="h-5 w-5" />
                Members ({members.length})
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/groups/${groupId}/members`)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Members
              </Button>
            </CardTitle>
            <CardDescription>
              Manage group members and their privacy levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                placeholder="Search members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? 'No members match your search.' : 'No members in this group yet.'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMembers.map((member) => {
                  const privacyBadge = getPrivacyLevelBadge(member.privacy_level)
                  const IconComponent = privacyBadge.icon
                  
                  return (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                          style={{ backgroundColor: member.relationship.color || '#6b7280' }}
                        >
                          {member.relationship.partner_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{member.relationship.partner_name}</div>
                          {member.relationship.partner_email && (
                            <div className="text-sm text-muted-foreground">
                              {member.relationship.partner_email}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {member.relationship.relationship_type}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant={privacyBadge.variant} className="flex items-center gap-1">
                          <IconComponent className="h-3 w-3" />
                          {privacyBadge.label}
                        </Badge>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/relationships/${member.relationship.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Relationship
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleRemoveMember(member.id)}
                              className="text-destructive"
                            >
                              <UserPlus className="h-4 w-4 mr-2" />
                              Remove from Group
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

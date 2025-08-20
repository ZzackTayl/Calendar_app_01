'use client';

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type GroupWithMembers, type RelationshipGroup } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft, 
  Plus, 
  Users2, 
  Search, 
  Edit, 
  Trash2, 
  UserPlus,
  Settings
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupWithMembers[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    fetchGroups()
  }, [user, router])

  const fetchGroups = async () => {
    try {
      // First get groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('relationship_groups')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
      
      if (groupsError) throw groupsError

      // Then get member counts for each group
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
    } catch (error) {
      console.error('Error fetching groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
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
        .eq('user_id', user?.id)

      if (error) throw error

      // Refresh the list
      fetchGroups()
    } catch (error) {
      console.error('Error deleting group:', error)
      alert('Failed to delete group. Please try again.')
    }
  }

  const filteredGroups = groups.filter(group =>
    group.group_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/dashboard')}
                className="mr-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Users2 className="w-6 h-6 text-primary mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Relationship Groups</h1>
            </div>
            <Button onClick={() => router.push('/groups/create')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Groups Grid */}
        {filteredGroups.length === 0 ? (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="text-center py-12">
              <Users2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm ? 'No groups found' : 'No groups yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : 'Create your first group to organize your relationships by shared contexts like "Close Partners", "Work Friends", or "Family"'
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => router.push('/groups/create')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Group
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
              <Card 
                key={group.id}
                className="border-0 shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all duration-300 cursor-pointer group"
                onClick={() => router.push(`/groups/${group.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg group-hover:text-primary transition-colors">
                        {group.group_name}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {group.member_count || 0} {(group.member_count || 0) === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {(group.member_count || 0) === 0 ? 'Empty' : 'Active'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {group.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {group.description}
                    </p>
                  )}
                  
                  {/* Show some member previews */}
                  {group.members && group.members.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-700">Members:</p>
                      <div className="flex flex-wrap gap-1">
                        {group.members.slice(0, 3).map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center space-x-1 bg-gray-100 rounded-full px-2 py-1"
                          >
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: member.relationship?.color || '#6B7280' }}
                            />
                            <span className="text-xs text-gray-700">
                              {member.relationship?.partner_name || 'Unknown'}
                            </span>
                          </div>
                        ))}
                        {(group.member_count || 0) > 3 && (
                          <div className="flex items-center space-x-1 bg-gray-100 rounded-full px-2 py-1">
                            <span className="text-xs text-gray-700">
                              +{(group.member_count || 0) - 3} more
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-500">
                      Created {format(new Date(group.created_at), 'MMM d, yyyy')}
                    </span>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/groups/${group.id}/members`)
                        }}
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/groups/${group.id}/edit`)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteGroup(group.id)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats */}
        {groups.length > 0 && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur mt-8">
            <CardContent className="py-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{groups.length}</p>
                  <p className="text-sm text-gray-600">Total Groups</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-secondary">
                    {groups.reduce((sum, group) => sum + (group.member_count || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-600">Total Memberships</p>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <p className="text-2xl font-bold text-accent">
                    {Math.round(groups.reduce((sum, group) => sum + (group.member_count || 0), 0) / Math.max(groups.length, 1))}
                  </p>
                  <p className="text-sm text-gray-600">Avg Members/Group</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
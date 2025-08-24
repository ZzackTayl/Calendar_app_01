'use client';

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type GroupWithMembers, type RelationshipGroup } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Plus, 
  Users2, 
  Search, 
  Edit, 
  Trash2, 
  UserPlus,
  Settings,
  Grid3X3,
  Eye
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { GroupOrganizationTool } from '@/components/ui/group-organization-tool'

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupWithMembers[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('list')
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    fetchGroups()
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

      if (error) throw error
      fetchGroups() // Refresh the data
    } catch (error) {
      console.error('Error deleting group:', error)
    }
  }

  const handleGroupsChange = (updatedGroups: GroupWithMembers[]) => {
    setGroups(updatedGroups)
  }

  const filteredGroups = groups.filter(group =>
    group.group_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card/80 backdrop-blur border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-20 py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
              className="mr-4 flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <div className="flex-1 min-w-0 px-2">
              <h1 className="text-xl font-semibold truncate groups-page-title leading-tight">Groups</h1>
              <p className="text-sm text-muted-foreground break-words groups-page-description leading-tight mt-1">
                Organize your relationships into meaningful groups for easier management
              </p>
            </div>

            <Button
              onClick={() => router.push('/groups/create')}
              className="ml-4 flex-shrink-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Group
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <Users2 className="h-4 w-4" />
              Group List
            </TabsTrigger>
            <TabsTrigger value="organize" className="flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              Visual Organizer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-6">
            {/* Search and Stats */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Search groups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                <div className="text-sm text-muted-foreground">
                  {filteredGroups.length} of {groups.length} groups
                </div>
              </div>
            </div>

            {/* Groups Grid */}
            {filteredGroups.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Users2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No groups found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm ? 'No groups match your search.' : 'Create your first group to get started.'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => router.push('/groups/create')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Group
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGroups.map((group) => (
                  <Card key={group.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Users2 className="h-5 w-5" />
                          {group.group_name}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/groups/${group.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteGroup(group.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardTitle>
                      {group.description && (
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                      )}
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Members</span>
                        <Badge variant="secondary">{group.member_count}</Badge>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Created: {format(new Date(group.created_at), 'MMM d, yyyy')}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/groups/${group.id}`)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/groups/${group.id}/members`)}
                          className="flex-1"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Members
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="organize" className="space-y-6">
            <div className="bg-muted/30 rounded-lg p-4">
              <h3 className="font-medium mb-2">Visual Group Organizer</h3>
              <p className="text-sm text-muted-foreground break-words groups-page-description">
                Drag and drop relationships between groups to organize them visually. 
                Use the grid or list view to see your organization from different perspectives.
              </p>
            </div>
            
            <GroupOrganizationTool onGroupsChange={handleGroupsChange} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
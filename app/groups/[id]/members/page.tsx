'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type Relationship, type GroupMember, type RelationshipGroup } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft, 
  Users2, 
  Search, 
  UserPlus,
  UserMinus,
  Shield,
  Eye,
  Clock,
  EyeOff
} from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'

export default function GroupMembersPage() {
  const [group, setGroup] = useState<RelationshipGroup | null>(null)
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [members, setMembers] = useState<(GroupMember & { relationship: Relationship })[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const supabase = createSupabaseClient()
  const groupId = params.id as string

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    fetchData()
  }, [user, router, groupId])

  const fetchData = async () => {
    try {
      // Fetch group info
      const { data: groupData, error: groupError } = await supabase
        .from('relationship_groups')
        .select('*')
        .eq('id', groupId)
        .eq('user_id', user?.id)
        .single()
      
      if (groupError) throw groupError
      setGroup(groupData)

      // Fetch all user's relationships
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', user?.id)
        .order('partner_name', { ascending: true })
      
      if (relationshipsError) throw relationshipsError
      setRelationships(relationshipsData || [])

      // Fetch current group members
      const { data: membersData, error: membersError } = await supabase
        .from('relationship_group_members')
        .select(`
          *,
          relationship:relationships(*)
        `)
        .eq('group_id', groupId)
      
      if (membersError) throw membersError
      setMembers(membersData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      setError('Failed to load group data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMember = async (relationshipId: string, privacyLevel: 'full_access' | 'limited_access' | 'busy_only' | 'hidden' = 'full_access') => {
    try {
      const { error } = await supabase
        .from('relationship_group_members')
        .insert({
          group_id: groupId,
          relationship_id: relationshipId,
          privacy_level: privacyLevel
        })

      if (error) throw error
      fetchData() // Refresh the data
    } catch (error) {
      console.error('Error adding member:', error)
      setError('Failed to add member to group')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('relationship_group_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error
      fetchData() // Refresh the data
    } catch (error) {
      console.error('Error removing member:', error)
      setError('Failed to remove member from group')
    }
  }

  const handleUpdatePrivacy = async (memberId: string, privacyLevel: string) => {
    try {
      const { error } = await supabase
        .from('relationship_group_members')
        .update({ privacy_level: privacyLevel })
        .eq('id', memberId)

      if (error) throw error
      fetchData() // Refresh the data
    } catch (error) {
      console.error('Error updating privacy:', error)
      setError('Failed to update privacy level')
    }
  }

  const getPrivacyIcon = (level: string) => {
    switch (level) {
      case 'full_access': return <Eye className="w-4 h-4" />
      case 'limited_access': return <Shield className="w-4 h-4" />
      case 'busy_only': return <Clock className="w-4 h-4" />
      case 'hidden': return <EyeOff className="w-4 h-4" />
      default: return <Eye className="w-4 h-4" />
    }
  }

  const getPrivacyLabel = (level: string) => {
    switch (level) {
      case 'full_access': return 'Full Access'
      case 'limited_access': return 'Limited'
      case 'busy_only': return 'Busy Only'
      case 'hidden': return 'Hidden'
      default: return 'Full Access'
    }
  }

  const getPrivacyVariant = (level: string): "default" | "secondary" | "outline" => {
    switch (level) {
      case 'full_access': return 'default'
      case 'limited_access': return 'secondary'
      case 'busy_only': return 'outline'
      case 'hidden': return 'outline'
      default: return 'default'
    }
  }

  const memberRelationshipIds = members.map(m => m.relationship_id)
  const availableRelationships = relationships.filter(r => !memberRelationshipIds.includes(r.id))
  
  const filteredAvailable = availableRelationships.filter(relationship =>
    relationship.partner_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredMembers = members.filter(member =>
    member.relationship?.partner_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Group not found</h3>
            <p className="text-gray-600 mb-6">This group doesn't exist or you don't have permission to view it.</p>
            <Button onClick={() => router.push('/groups')}>
              Back to Groups
            </Button>
          </CardContent>
        </Card>
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
                onClick={() => router.push('/groups')}
                className="mr-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Users2 className="w-6 h-6 text-primary mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">{group.group_name}</h1>
                <p className="text-sm text-gray-600">Manage group members</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search relationships..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Members */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users2 className="w-5 h-5 mr-2" />
                Group Members ({members.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredMembers.length === 0 ? (
                <div className="text-center py-8">
                  <Users2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {searchTerm ? 'No members match your search' : 'No members in this group yet'}
                  </p>
                </div>
              ) : (
                filteredMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: member.relationship?.color || '#6B7280' }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.relationship?.partner_name || 'Unknown'}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={getPrivacyVariant(member.privacy_level)} className="text-xs">
                            {getPrivacyIcon(member.privacy_level)}
                            <span className="ml-1">{getPrivacyLabel(member.privacy_level)}</span>
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={member.privacy_level}
                        onChange={(e) => handleUpdatePrivacy(member.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="full_access">Full Access</option>
                        <option value="limited_access">Limited</option>
                        <option value="busy_only">Busy Only</option>
                        <option value="hidden">Hidden</option>
                      </select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Available Relationships */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center">
                <UserPlus className="w-5 h-5 mr-2" />
                Add Members ({availableRelationships.length} available)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredAvailable.length === 0 ? (
                <div className="text-center py-8">
                  <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    {searchTerm 
                      ? 'No available relationships match your search'
                      : availableRelationships.length === 0
                        ? 'All your relationships are already in this group'
                        : 'No relationships to add'
                    }
                  </p>
                  {availableRelationships.length === 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => router.push('/relationships/add')}
                    >
                      Add More Relationships
                    </Button>
                  )}
                </div>
              ) : (
                filteredAvailable.map((relationship) => (
                  <div key={relationship.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: relationship.color }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          {relationship.partner_name}
                        </p>
                        <p className="text-sm text-gray-500 capitalize">
                          {relationship.relationship_type.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        className="text-xs border border-gray-300 rounded px-2 py-1"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddMember(relationship.id, e.target.value as any)
                            e.target.value = '' // Reset select
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="">Add with...</option>
                        <option value="full_access">Full Access</option>
                        <option value="limited_access">Limited Access</option>
                        <option value="busy_only">Busy Only</option>
                        <option value="hidden">Hidden</option>
                      </select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700"
                        onClick={() => handleAddMember(relationship.id)}
                      >
                        <UserPlus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Privacy Levels Info */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur mt-8">
          <CardHeader>
            <CardTitle className="text-sm">Privacy Level Explanations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start space-x-2">
                <Eye className="w-4 h-4 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium">Full Access</p>
                  <p className="text-gray-600">Can see all event details including title, time, location, and description</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium">Limited Access</p>
                  <p className="text-gray-600">Can see that you're busy but with limited details</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <Clock className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium">Busy Only</p>
                  <p className="text-gray-600">Can only see that you have something scheduled (time blocks)</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <EyeOff className="w-4 h-4 text-gray-600 mt-0.5" />
                <div>
                  <p className="font-medium">Hidden</p>
                  <p className="text-gray-600">Cannot see any information about these events</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
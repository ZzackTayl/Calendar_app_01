'use client';

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type RelationshipGroup } from '@/lib/supabase/types'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Users2, Save } from 'lucide-react'
import { GroupForm } from '@/components/ui/group-form'

interface GroupFormData {
  group_name: string
  description?: string
  members: {
    relationship_id: string
    privacy_level: 'full_access' | 'limited_access' | 'busy_only' | 'hidden'
    relationship: any
  }[]
}

export default function EditGroupPage() {
  const { user } = useAuth()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  const [group, setGroup] = useState<RelationshipGroup | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }
    loadGroup()
  }, [user, groupId, router])

  const loadGroup = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('relationship_groups')
        .select('*')
        .eq('id', groupId)
        .eq('user_id', user?.id)
        .single()
      
      if (error) throw error
      setGroup(data as any)
    } catch (e) {
      console.error(e)
      setError('Failed to load group')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (data: GroupFormData) => {
    setSaving(true)
    setError('')
    
    try {
      // Update group details
      const { error: groupError } = await supabase
        .from('relationship_groups')
        .update({ 
          group_name: data.group_name.trim(), 
          description: data.description?.trim() || null 
        })
        .eq('id', groupId)
        .eq('user_id', user?.id)
      
      if (groupError) throw groupError

      // Remove existing members
      await supabase
        .from('relationship_group_members')
        .delete()
        .eq('group_id', groupId)

      // Add new members
      if (data.members.length > 0) {
        const memberData = data.members.map(member => ({
          group_id: groupId,
          relationship_id: member.relationship_id,
          privacy_level: member.privacy_level
        }))

        const { error: membersError } = await supabase
          .from('relationship_group_members')
          .insert(memberData)

        if (membersError) throw membersError
      }

      router.push(`/groups/${groupId}`)
    } catch (e) {
      console.error('Error updating group:', e)
      setError('Failed to update group')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push(`/groups/${groupId}`)
  }

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
              onClick={() => router.push(`/groups/${groupId}`)}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <div className="flex-1">
              <h1 className="text-xl font-semibold">Edit Group</h1>
              <p className="text-sm text-muted-foreground">
                Update group information and manage members
              </p>
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

        <GroupForm
          group={group}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={saving}
        />
      </main>
    </div>
  )
}

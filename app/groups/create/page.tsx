'use client';

import { useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Users2 } from 'lucide-react'
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

export default function CreateGroupPage() {
  const { user } = useAuth()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const router = useRouter()
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (data: GroupFormData) => {
    setSaving(true)
    setError('')
    
    try {
      // Create the group
      const { data: groupData, error: groupError } = await supabase
        .from('relationship_groups')
        .insert({
          user_id: user?.id,
          group_name: data.group_name.trim(),
          description: data.description?.trim() || null
        })
        .select()
        .single()
      
      if (groupError) throw groupError

      // Add members to the group
      if (data.members.length > 0) {
        const memberData = data.members.map(member => ({
          group_id: groupData.id,
          relationship_id: member.relationship_id,
          privacy_level: member.privacy_level
        }))

        const { error: membersError } = await supabase
          .from('relationship_group_members')
          .insert(memberData)

        if (membersError) throw membersError
      }

      router.push(`/groups/${groupData.id}`)
    } catch (e) {
      console.error('Error creating group:', e)
      setError('Failed to create group')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    router.push('/groups')
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
              <h1 className="text-xl font-semibold">Create New Group</h1>
              <p className="text-sm text-muted-foreground">
                Organize your relationships into meaningful groups
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
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={saving}
        />
      </main>
    </div>
  )
}
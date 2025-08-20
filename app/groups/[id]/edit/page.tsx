'use client';

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type RelationshipGroup } from '@/lib/supabase/types'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Users2, Save } from 'lucide-react'

export default function EditGroupPage() {
  const { user } = useAuth()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  const [group, setGroup] = useState<RelationshipGroup | null>(null)
  const [groupName, setGroupName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('relationship_groups')
          .select('*')
          .eq('id', groupId)
          .eq('user_id', user.id)
          .single()
        if (error) throw error
        setGroup(data as any)
        setGroupName((data as any).group_name || '')
        setDescription((data as any).description || '')
      } catch (e) {
        console.error(e)
        setError('Failed to load group')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, groupId, router, supabase])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { error } = await supabase
        .from('relationship_groups')
        .update({ group_name: groupName.trim(), description: description.trim() || null })
        .eq('id', groupId)
        .eq('user_id', user?.id)
      if (error) throw error
      router.push(`/groups/${groupId}/members`)
    } catch (e) {
      console.error(e)
      setError('Failed to save changes')
    } finally {
      setSaving(false)
    }
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
            <Button onClick={() => router.push('/groups')}>Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card/80 backdrop-blur border-b border-border sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/groups/${groupId}/members`)} className="mr-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Users2 className="w-6 h-6 text-primary mr-3" />
            <h1 className="text-xl font-bold">Edit Group</h1>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Update Group Details</CardTitle>
            <CardDescription>Change the group name and description</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Group name</label>
                  <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} required maxLength={100} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Description (optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => router.push(`/groups/${groupId}/members`)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

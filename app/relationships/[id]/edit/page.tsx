'use client';

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type Relationship } from '@/lib/supabase/types'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Users, Save, Mail, User, Palette } from 'lucide-react'
import { DemoStore } from '@/lib/demo-store'
import { useToast } from '@/hooks/use-toast'

const relationshipTypes = [
  { value: 'primary', label: 'Primary Partner' },
  { value: 'secondary', label: 'Secondary Partner' },
  { value: 'nesting', label: 'Nesting Partner' },
  { value: 'long_distance', label: 'Long Distance' },
  { value: 'casual', label: 'Casual Partner' },
  { value: 'other', label: 'Other' }
]

const relationshipColors = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280', '#EC4899', '#14B8A6'
]

const privacyLevels = [
  { value: 'full_access', label: 'Full Access' },
  { value: 'limited_access', label: 'Limited Access' },
  { value: 'no_access', label: 'Private' },
]

export default function EditRelationshipPage() {
  const { user, demoMode } = useAuth()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const params = useParams()
  const router = useRouter()
  const relationshipId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [partnerName, setPartnerName] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [relationshipType, setRelationshipType] = useState('primary')
  const [selectedColor, setSelectedColor] = useState(relationshipColors[0])
  const [privacyLevel, setPrivacyLevel] = useState('limited_access')
  const [notes, setNotes] = useState('')

  const { toast } = useToast()

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('relationships')
          .select('*')
          .eq('id', relationshipId)
          .eq('user_id', user.id)
          .single()
        if (error) throw error
        const rel = data as Relationship
        setPartnerName(rel.partner_name || '')
        setPartnerEmail(rel.partner_email || '')
        setRelationshipType(rel.relationship_type || '')
        setSelectedColor(rel.color || '#6B7280')
        setPrivacyLevel(rel.privacy_level || 'limited_access')
        setNotes(rel.notes || '')
      } catch (e) {
        console.error(e)
        setError('Failed to load relationship')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, relationshipId, router, supabase])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!partnerName.trim()) {
      setError('Partner name is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (demoMode) {
        DemoStore.updateRelationship(relationshipId, {
          partner_name: partnerName.trim(),
          partner_email: partnerEmail.trim() || undefined,
          relationship_type: relationshipType as any,
          color: selectedColor,
          privacy_level: privacyLevel as any,
          notes: notes.trim() || undefined,
        } as any)
        toast({ title: 'Relationship updated' })
        router.push(`/relationships/${relationshipId}`)
        return
      }

      const { error } = await supabase
        .from('relationships')
        .update({
          partner_name: partnerName.trim(),
          partner_email: partnerEmail.trim() || null,
          relationship_type: relationshipType,
          color: selectedColor,
          privacy_level: privacyLevel,
          notes: notes.trim() || null,
        })
        .eq('id', relationshipId)
        .eq('user_id', user?.id)
      if (error) throw error
      toast({ title: 'Relationship updated' })
      router.push(`/relationships/${relationshipId}`)
    } catch (e) {
      console.error(e)
      setError('Failed to save changes')
      toast({ title: 'Error', description: 'Failed to save changes' })
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

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card/80 backdrop-blur border-b border-border sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button variant="ghost" size="icon" onClick={() => router.push(`/relationships/${relationshipId}`)} className="mr-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Users className="w-6 h-6 text-primary mr-3" />
            <h1 className="text-xl font-bold">Edit Relationship</h1>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Update Details</CardTitle>
            <CardDescription>Modify partner information and privacy</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Partner's name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email (optional)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input type="email" value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)} className="pl-10" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">We can invite them later to collaborate</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Relationship type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {relationshipTypes.map((type) => (
                      <button key={type.value} type="button" onClick={() => setRelationshipType(type.value)}
                        className={`p-3 rounded-lg border text-sm transition-all ${relationshipType === type.value ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Calendar color</label>
                  <div className="flex flex-wrap gap-3">
                    {relationshipColors.map((color) => (
                      <button key={color} type="button" onClick={() => setSelectedColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all color-button ${selectedColor === color ? 'border-gray-800 scale-110' : 'border-gray-300 hover:border-gray-400'}`}
                        data-color={color}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Privacy level</label>
                  <div className="flex flex-wrap gap-2">
                    {privacyLevels.map((p) => (
                      <button key={p.value} type="button" onClick={() => setPrivacyLevel(p.value)}
                        className={`px-3 py-2 rounded-lg border text-sm transition-all ${privacyLevel === p.value ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Add any notes about this relationship..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => router.push(`/relationships/${relationshipId}`)}>Cancel</Button>
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

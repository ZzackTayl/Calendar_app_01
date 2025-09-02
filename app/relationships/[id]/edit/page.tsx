'use client';

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type Relationship, type ConnectionTier } from '@/lib/supabase/types'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Users, Save, Mail, User, Palette, Calendar } from 'lucide-react'
import { DemoStore } from '@/lib/demo-store'
import { useToast } from '@/hooks/use-toast'

const relationshipTypes = [
  { value: 'custom', label: 'Type your own' },
  { value: 'primary', label: 'Primary Connection' },
  { value: 'secondary', label: 'Secondary Connection' },
  { value: 'nesting', label: 'Nesting Connection' },
  { value: 'long_distance', label: 'Long Distance' },
  { value: 'casual', label: 'Casual Connection' },
  { value: 'friendship', label: 'Friendship' }
]

const relationshipColors = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280', '#EC4899', '#14B8A6'
]

const privacyLevels = [
  { 
    value: 'full_access', 
    label: 'Full Access', 
    description: 'Can see your entire calendar including event names (family privileges)' 
  },
  { 
    value: 'limited_access', 
    label: 'Limited Access', 
    description: 'Friends see "busy" unless manually approved to see more details. You control what they can view event by event or through groups.' 
  },
  { 
    value: 'no_access', 
    label: 'Private', 
    description: 'Cannot see your calendar or events' 
  }
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
  const [relationshipType, setRelationshipType] = useState('custom')
  const [customType, setCustomType] = useState('')
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
        // Check if the relationship type is a predefined one or custom
        const predefinedTypes = relationshipTypes.map(t => t.value)
        if (predefinedTypes.includes(rel.relationship_type || '')) {
          setRelationshipType(rel.relationship_type || 'custom')
        } else {
          setRelationshipType('custom')
          setCustomType(rel.relationship_type || '')
        }
        setSelectedColor(rel.color || '#6B7280')
        setPrivacyLevel(rel.connection_tier || 'private')
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
    if (relationshipType === 'custom' && !customType.trim()) {
      setError('Custom relationship type is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (demoMode) {
        DemoStore.updateRelationship(relationshipId, {
          partner_name: partnerName.trim(),
          partner_email: partnerEmail.trim() || undefined,
          relationship_type: relationshipType === 'custom' && customType 
            ? customType 
            : relationshipTypes.find(t => t.value === relationshipType)?.label || relationshipType,
          color: selectedColor,
          connection_tier: privacyLevel as ConnectionTier,
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
          relationship_type: relationshipType === 'custom' && customType 
            ? customType 
            : relationshipTypes.find(t => t.value === relationshipType)?.label || relationshipType,
          color: selectedColor,
          connection_tier: privacyLevel,
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
                  <label htmlFor="partnerName" className="block text-sm font-medium mb-2">Partner&apos;s name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input id="partnerName" value={partnerName} onChange={(e) => setPartnerName(e.target.value)} className="pl-10" required />
                  </div>
                </div>
                <div>
                  <label htmlFor="partnerEmail" className="block text-sm font-medium mb-2">Email (optional)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input id="partnerEmail" type="email" value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)} className="pl-10" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Optional - helps with future collaboration features</p>
                </div>

                <div>
                  <label htmlFor="relationshipType" className="block text-sm font-medium mb-3">Relationship type</label>
                  <Select value={relationshipType} onValueChange={setRelationshipType}>
                    <SelectTrigger id="relationshipType" className="w-full">
                      <SelectValue placeholder="Choose or type your own relationship type" />
                    </SelectTrigger>
                    <SelectContent>
                      {relationshipTypes.map((type) => (
                        <SelectItem 
                          key={type.value} 
                          value={type.value}
                        >
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {relationshipType === 'custom' && (
                    <div className="mt-3">
                      <label htmlFor="customType" className="sr-only">Custom Relationship Type</label>
                      <Input
                        id="customType"
                        value={customType}
                        onChange={(e) => setCustomType(e.target.value)}
                        placeholder="e.g., 'My Adventure Buddy', 'Coffee Date Partner', 'Gaming Companion'..."
                        className="mt-2"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Create a unique, personal identifier that feels right for your relationship
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Calendar color</label>
                  <div className="flex flex-wrap gap-3">
                    {relationshipColors.map((color) => (
                      <button key={color} type="button" onClick={() => setSelectedColor(color)}
                        style={{ backgroundColor: color }}
                        className={`w-8 h-8 rounded-full border-2 transition-all color-button ${selectedColor === color ? 'border-gray-800 scale-110' : 'border-gray-300 hover:border-gray-400'}`}
                        data-color={color}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-3">Privacy level</label>
                  <div className="space-y-3">
                    {privacyLevels.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setPrivacyLevel(level.value)}
                        className={`w-full p-4 rounded-lg border text-left transition-all ${
                          privacyLevel === level.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium mb-1">{level.label}</div>
                        <p className="text-sm text-muted-foreground">{level.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="notes" className="block text-sm font-medium mb-2">Notes</label>
                  <textarea
                    id="notes"
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

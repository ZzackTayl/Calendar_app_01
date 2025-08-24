'use client';

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type Event, type Relationship } from '@/lib/supabase/types'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Calendar, Clock, MapPin, Users, Save, Shield, Globe, Settings } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { DemoStore } from '@/lib/demo-store'

export default function EditEventPage() {
  const { user, demoMode } = useAuth()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [privacyLevel, setPrivacyLevel] = useState<'public' | 'private' | 'custom'>('public')
  const [selectedRelationship, setSelectedRelationship] = useState('')
  const [visibleToRelationships, setVisibleToRelationships] = useState<string[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }
    const load = async () => {
      try {
        // Load relationships for dropdowns
        const { data: rels } = await supabase
          .from('relationships')
          .select('*')
          .eq('user_id', user.id)
          .order('partner_name', { ascending: true })
        setRelationships(rels || [])

        // Load event
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .eq('owner_id', user.id)
          .single()
        if (error) throw error
        const ev = data as Event
        setTitle(ev.title)
        setDescription(ev.description || '')
        const s = parseISO(ev.start_time)
        const e = parseISO(ev.end_time)
        setStartDate(format(s, 'yyyy-MM-dd'))
        setStartTime(format(s, 'HH:mm'))
        setEndDate(format(e, 'yyyy-MM-dd'))
        setEndTime(format(e, 'HH:mm'))
        setLocation(ev.location || '')
        setPrivacyLevel(ev.privacy_level)
        setSelectedRelationship(ev.relationship_id || '')
        setVisibleToRelationships(ev.visible_to_relationships || [])
      } catch (e) {
        console.error(e)
        setError('Failed to load event')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, eventId, router, supabase])

  const handleRelationshipToggle = (relationshipId: string) => {
    setVisibleToRelationships(prev =>
      prev.includes(relationshipId)
        ? prev.filter(id => id !== relationshipId)
        : [...prev, relationshipId]
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Event title is required')
      return
    }
    if (!startDate || !startTime || !endDate || !endTime) {
      setError('Start and end date/time are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const startDateTime = new Date(`${startDate}T${startTime}`)
      const endDateTime = new Date(`${endDate}T${endTime}`)
      const updatePayload: Partial<Event> = {
        title: title.trim(),
        description: (description.trim() || undefined) as any,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location: location.trim() || undefined,
        privacy_level: privacyLevel,
        relationship_id: selectedRelationship || undefined,
        visible_to_relationships: privacyLevel === 'custom' ? visibleToRelationships : undefined,
      }

      if (demoMode) {
        DemoStore.updateEvent(eventId, updatePayload as any)
        router.push(`/events/${eventId}`)
        return
      }

      const { error } = await supabase
        .from('events')
        .update(updatePayload)
        .eq('id', eventId)
        .eq('owner_id', user?.id)
      if (error) throw error
      router.push(`/events/${eventId}`)
    } catch (e) {
      console.error(e)
      setError('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-700 sticky top-0 z-40">
        <div className="mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center h-14 sm:h-16">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push(`/events/${eventId}`)} 
              className="mr-2 h-8 w-8 p-0 sm:h-10 sm:w-10"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary mr-2 sm:mr-3 flex-shrink-0" />
            <h1 className="text-lg sm:text-xl font-bold text-white truncate">Edit Event</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <Card className="border-0 shadow-xl bg-slate-800/90 backdrop-blur border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Update Event</CardTitle>
            <CardDescription className="text-slate-300">Modify details and privacy settings</CardDescription>
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
                  <label className="block text-sm font-medium text-white mb-2">Event title *</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none placeholder-slate-400"
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white flex items-center">
                    <Clock className="w-5 h-5 mr-2" /> When
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Start date *</label>
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Start time *</label>
                      <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">End date *</label>
                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">End time *</label>
                      <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" /> Location
                  </label>
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Where is this happening?" />
                </div>

                {relationships.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      <Users className="w-4 h-4 inline mr-1" /> Associated relationship
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRelationship('')}
                        className={`p-3 rounded-lg border text-sm transition-all ${
                          selectedRelationship === '' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-600 hover:border-slate-600'
                        }`}
                      >
                        No specific relationship
                      </button>
                      {relationships.map((relationship) => (
                        <button
                          key={relationship.id}
                          type="button"
                          onClick={() => setSelectedRelationship(relationship.id)}
                          className={`p-3 rounded-lg border text-sm transition-all ${
                            selectedRelationship === relationship.id ? 'border-primary bg-primary/5 text-primary' : 'border-slate-600 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center">
                            <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: relationship.color }} />
                            {relationship.partner_name}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-white mb-3">
                    <Shield className="w-4 h-4 inline mr-1" /> Privacy level
                  </label>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setPrivacyLevel('public')}
                      className={`w-full p-4 rounded-lg border text-left transition-all ${
                        privacyLevel === 'public' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-600 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center mb-1"><Globe className="w-4 h-4 mr-2" /><span className="font-medium">Public</span></div>
                      <p className="text-sm text-slate-300">All your partners can see this event</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrivacyLevel('private')}
                      className={`w-full p-4 rounded-lg border text-left transition-all ${
                        privacyLevel === 'private' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-600 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center mb-1"><Shield className="w-4 h-4 mr-2" /><span className="font-medium">Private</span></div>
                      <p className="text-sm text-slate-300">Only you can see this event</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrivacyLevel('custom')}
                      className={`w-full p-4 rounded-lg border text-left transition-all ${
                        privacyLevel === 'custom' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-600 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center mb-1"><Settings className="w-4 h-4 mr-2" /><span className="font-medium">Custom</span></div>
                      <p className="text-sm text-slate-300">Choose specific partners who can see this</p>
                    </button>
                  </div>
                  {privacyLevel === 'custom' && relationships.length > 0 && (
                    <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
                      <p className="text-sm font-medium text-white mb-3">Who can see this event?</p>
                      <div className="space-y-2">
                        {relationships.map((relationship) => (
                          <label key={relationship.id} className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={visibleToRelationships.includes(relationship.id)}
                              onChange={() => handleRelationshipToggle(relationship.id)}
                              className="rounded border-slate-600 text-primary focus:ring-primary"
                            />
                            <div className="flex items-center ml-3">
                              <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: relationship.color }} />
                              <span className="text-sm text-white">{relationship.partner_name}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex space-x-4 pt-6">
                <Button type="button" variant="outline" onClick={() => router.push(`/events/${eventId}`)} className="flex-1">Cancel</Button>
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

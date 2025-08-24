'use client';

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type Event, type Relationship } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Calendar, Clock, MapPin, Users, Edit, Trash2, Share, Lock, Globe, Settings } from 'lucide-react'
import { useRouter, useParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { DemoStore } from '@/lib/demo-store'

export default function EventDetailPage() {
  const [event, setEvent] = useState<Event | null>(null)
  const [relationship, setRelationship] = useState<Relationship | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const { user, demoMode } = useAuth()
  const router = useRouter()
  const params = useParams()
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (!user && !demoMode) {
      router.push('/auth/signin')
      return
    }

    fetchEvent()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, params.id, demoMode])

  const fetchEvent = async () => {
    try {
      if (demoMode) {
        const ev = DemoStore.getEvent(params.id as string)
        setEvent(ev)
        if (ev?.relationship_id) {
          setRelationship(DemoStore.getRelationship(ev.relationship_id) as any)
        }
        setLoading(false)
        return
      }

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', params.id)
        .eq('owner_id', user?.id)
        .single()
      
      if (eventError) throw eventError
      setEvent(eventData)

      if (eventData.relationship_id) {
        const { data: relationshipData } = await supabase
          .from('relationships')
          .select('*')
          .eq('id', eventData.relationship_id)
          .single()
        setRelationship(relationshipData)
      }
    } catch (error) {
      console.error('Error fetching event:', error)
      router.push('/calendar')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!event || !confirm('Are you sure you want to delete this event?')) return

    setDeleting(true)
    try {
      if (demoMode) {
        DemoStore.deleteEvent(event.id)
        router.push('/calendar')
        return
      }
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id)
        .eq('owner_id', user?.id)

      if (error) throw error
      router.push('/calendar')
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Failed to delete event')
    } finally {
      setDeleting(false)
    }
  }

  const getPrivacyIcon = (level: string) => {
    switch (level) {
      case 'public': return <Globe className="w-4 h-4" />
      case 'private': return <Lock className="w-4 h-4" />
      case 'custom': return <Settings className="w-4 h-4" />
      default: return <Globe className="w-4 h-4" />
    }
  }

  const getPrivacyLabel = (level: string) => {
    switch (level) {
      case 'public': return 'Public'
      case 'private': return 'Private'
      case 'custom': return 'Custom'
      default: return 'Public'
    }
  }

  const getPrivacyDescription = (level: string) => {
    switch (level) {
      case 'public': return 'All your partners can see this event'
      case 'private': return 'Only you can see this event'
      case 'custom': return 'Selected partners can see this event'
      default: return 'All your partners can see this event'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event not found</h2>
          <p className="text-gray-600 mb-4">The event you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
          <Button onClick={() => router.push('/calendar')}>
            Back to Calendar
          </Button>
        </div>
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
                onClick={() => router.push('/calendar')}
                className="mr-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Calendar className="w-6 h-6 text-primary mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Event Details</h1>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => router.push(`/events/${event.id}/edit`)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{event.title}</CardTitle>
                {event.description && (
                  <CardDescription className="mt-2 text-base">
                    {event.description}
                  </CardDescription>
                )}
              </div>
              <Badge 
                variant="outline" 
                className={`privacy-indicator-${event.privacy_level} flex items-center space-x-1`}
              >
                {getPrivacyIcon(event.privacy_level)}
                <span>{getPrivacyLabel(event.privacy_level)}</span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date and Time */}
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Date & Time</h3>
                <p className="text-gray-600">
                  {format(parseISO(event.start_time), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-gray-600">
                  {format(parseISO(event.start_time), 'h:mm a')} - {format(parseISO(event.end_time), 'h:mm a')}
                </p>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Location</h3>
                  <p className="text-gray-600">{event.location}</p>
                </div>
              </div>
            )}

            {/* Associated Relationship */}
            {relationship && (
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Associated Relationship</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: relationship.color }}
                    />
                    <span className="text-gray-600">{relationship.partner_name}</span>
                    <Badge variant="outline" className="capitalize">
                      {relationship.relationship_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Privacy Details */}
            <div className="flex items-start space-x-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                {getPrivacyIcon(event.privacy_level)}
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Privacy Settings</h3>
                <p className="text-gray-600">{getPrivacyDescription(event.privacy_level)}</p>
                {event.privacy_level === 'custom' && event.visible_to_relationships && (
                  <p className="text-sm text-gray-500 mt-1">
                    Visible to {event.visible_to_relationships.length} selected partner(s)
                  </p>
                )}
              </div>
            </div>

            {/* Event Metadata */}
            <div className="pt-6 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                <div>
                  <p className="font-medium">Created</p>
                  <p>{format(parseISO(event.created_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
                <div>
                  <p className="font-medium">Last Updated</p>
                  <p>{format(parseISO(event.updated_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-4">
              <Button
                onClick={() => router.push(`/events/${event.id}/edit`)}
                className="flex-1"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Event
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={async () => {
                  const shareData = {
                    title: event.title,
                    text: `${event.title} - ${format(parseISO(event.start_time), 'MMM d, yyyy h:mm a')}`,
                    url: typeof window !== 'undefined' ? window.location.href : undefined,
                  }
                  try {
                    if (navigator.share) {
                      await navigator.share(shareData)
                    } else if (navigator.clipboard && shareData.url) {
                      await navigator.clipboard.writeText(shareData.url)
                      alert('Link copied to clipboard')
                    } else {
                      alert('Sharing not supported on this device')
                    }
                  } catch {
                    // Ignore user cancellation
                  }
                }}
              >
                <Share className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
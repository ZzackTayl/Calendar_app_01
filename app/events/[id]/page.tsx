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

import { getPrivacyLevelBadge, getPrivacyIcon, getPrivacyLabel, getPrivacyDescription } from '@/lib/privacy-utils';

export default function EventDetailPage() {
  const [event, setEvent] = useState<Event | null>(null)
  const [relationship, setRelationship] = useState<Relationship | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    fetchEvent()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, params.id])

  const fetchEvent = async () => {
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user?.id)
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
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id)
        .eq('user_id', user?.id)

      if (error) throw error
      router.push('/calendar')
    } catch (error) {
      console.error('Error deleting event:', error)
      alert('Failed to delete event')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Event not found</h2>
          <p className="text-slate-300 mb-4">The event you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
          <Button onClick={() => router.push('/calendar')}>
            Back to Calendar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-700 sticky top-0 z-40">
        <div className="mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center min-w-0 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/calendar')}
                className="mr-2 h-8 w-8 p-0 sm:h-10 sm:w-10"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary mr-2 sm:mr-3 flex-shrink-0" />
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">Event Details</h1>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 ml-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/events/${event.id}/edit`)}
                className="h-8 w-8 p-0 sm:h-10 sm:w-10"
              >
                <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
                className="h-8 w-8 p-0 sm:h-10 sm:w-10"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <Card className="border-0 shadow-xl bg-slate-800/90 backdrop-blur border-slate-700">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl text-white">{event.title}</CardTitle>
                {event.description && (
                  <CardDescription className="mt-2 text-base text-slate-300">
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
                <h3 className="font-medium text-white">Date & Time</h3>
                <p className="text-slate-300">
                  {format(parseISO(event.start_time), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-slate-300">
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
                  <h3 className="font-medium text-white">Location</h3>
                  <p className="text-slate-300">{event.location}</p>
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
                  <h3 className="font-medium text-white">Associated Relationship</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: relationship.color }}
                    />
                    <span className="text-slate-300">{relationship.partner_name}</span>
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
                <h3 className="font-medium text-white">Privacy Settings</h3>
                <p className="text-slate-300">{getPrivacyDescription(event.privacy_level)}</p>
                {event.visible_to_relationships && event.visible_to_relationships.length > 0 && (
                  <p className="text-sm text-slate-400 mt-1">
                    Visible to {event.visible_to_relationships.length} selected partner(s)
                  </p>
                )}
              </div>
            </div>

            {/* Event Metadata */}
            <div className="pt-6 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-400">
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
                    if (typeof navigator !== 'undefined' && navigator.share) {
                      await navigator.share(shareData)
                    } else if (typeof navigator !== 'undefined' && navigator.clipboard && shareData.url) {
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

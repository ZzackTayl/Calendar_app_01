'use client';

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type Relationship, type Event } from '@/lib/supabase/types'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Users, Calendar as CalendarIcon, Edit, Mail, Calendar, Clock, MapPin } from 'lucide-react'
import { format, parseISO } from 'date-fns'

export default function RelationshipDetailPage() {
  const { user } = useAuth()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const params = useParams()
  const router = useRouter()
  const relationshipId = params.id as string

  const [relationship, setRelationship] = useState<Relationship | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Only redirect if completely unauthenticated (no user)
    // Note: Unverified users (those with user but no email_confirmed_at) are handled by middleware
    // The middleware will redirect them to /auth/confirm-email appropriately
    if (!user) {
      router.push('/auth/signin')
      return
    }
    
    // For unverified users, let middleware handle the redirect - don't interfere here
    // The middleware will redirect unverified users to /auth/confirm-email
    const load = async () => {
      try {
        const [relRes, eventsRes] = await Promise.all([
          supabase
            .from('relationships')
            .select('*')
            .eq('id', relationshipId)
            .eq('user_id', user.id)
            .single(),
          supabase
            .from('events')
            .select('*')
            .eq('user_id', user.id)
            .eq('relationship_id', relationshipId)
            .order('start_time', { ascending: false })
            .limit(10)
        ])
        if (relRes.error) throw relRes.error
        setRelationship(relRes.data as any)
        if (!eventsRes.error) setEvents(eventsRes.data || [])
      } catch (e) {
        console.error(e)
        router.push('/relationships')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, relationshipId, router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!relationship) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="mb-4">Relationship not found.</p>
            <Button onClick={() => router.push('/relationships')}>Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card/80 backdrop-blur border-b border-border sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button variant="ghost" size="icon" onClick={() => router.push('/relationships')} className="mr-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Users className="w-6 h-6 text-primary mr-3" />
              <h1 className="text-xl font-bold">Relationship</h1>
            </div>
            <Button onClick={() => router.push(`/relationships/${relationship.id}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: relationship.color }} />
              {relationship.partner_name}
              <Badge variant="secondary" className="capitalize ml-2">
                {relationship.relationship_type.replace('_', ' ')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {relationship.partner_email && (
              <div className="flex items-center"><Mail className="w-4 h-4 mr-2" />{relationship.partner_email}</div>
            )}
            {relationship.start_date && (
              <div className="flex items-center"><Calendar className="w-4 h-4 mr-2" />Since {format(new Date(relationship.start_date), 'MMM d, yyyy')}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><CalendarIcon className="w-5 h-5 mr-2" />Recent Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.length === 0 ? (
              <p className="text-muted-foreground">No events yet for this relationship.</p>
            ) : (
              events.map((event) => (
                <div key={event.id} className="p-3 border rounded-lg flex items-start justify-between">
                  <div>
                    <div className="font-medium">{event.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      {format(parseISO(event.start_time), 'MMM d, yyyy h:mm a')}
                      {event.location && (<span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>)}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/events/${event.id}`)}>View</Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

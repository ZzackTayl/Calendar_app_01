'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type Relationship, type Event } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Calendar, Users, Heart, Settings, LogOut, Home, BarChart3 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format, startOfToday, addDays, isToday, isTomorrow } from 'date-fns'

export default function Dashboard() {
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const { user, demoMode, signOut } = useAuth()
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (!user && !demoMode) {
      router.push('/auth/signin')
      return
    }

    fetchData()
  }, [user, demoMode, router])

  const fetchData = async () => {
    if (demoMode) {
      // Load demo data
      setRelationships([
        {
          id: 'demo-rel-1',
          partner_name: 'Alex',
          color: '#3B82F6',
          relationship_type: 'primary'
        } as any
      ])
      setUpcomingEvents([
        {
          id: 'demo-1',
          title: 'Coffee with Alex',
          start_time: new Date().toISOString(),
          privacy_level: 'public'
        } as any
      ])
      setLoading(false)
      return
    }

    try {
      // Fetch relationships
      const { data: relationshipsData, error: relationshipsError } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', user?.id || '')
        .order('created_at', { ascending: false })
      
      if (relationshipsError) throw relationshipsError
      setRelationships(relationshipsData || [])

      // Fetch upcoming events
      const today = startOfToday()
      const nextWeek = addDays(today, 7)
      
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user?.id || '')
        .gte('start_time', today.toISOString())
        .lte('start_time', nextWeek.toISOString())
        .order('start_time', { ascending: true })
        .limit(5)
      
      if (eventsError) throw eventsError
      setUpcomingEvents(eventsData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const getRelationshipColor = (relationshipId: string) => {
    const relationship = relationships.find(r => r.id === relationshipId)
    return relationship?.color || '#6B7280'
  }

  const formatEventTime = (startTime: string) => {
    const date = new Date(startTime)
    if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`
    if (isTomorrow(date)) return `Tomorrow at ${format(date, 'h:mm a')}`
    return format(date, 'MMM d at h:mm a')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Heart className="w-8 h-8 text-primary mr-3" />
              <h1 className="text-xl font-bold text-gray-900">PolyHarmony</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/calendar')}
                className="touch-target"
              >
                <Calendar className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/relationships')}
                className="touch-target"
              >
                <Users className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="touch-target"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.user_metadata?.full_name || (demoMode ? 'Demo User' : 'there')}!
          </h2>
          {demoMode && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-yellow-800 text-sm">
                You're in demo mode. <Button variant="link" className="p-0 h-auto text-yellow-800 underline" onClick={() => router.push('/auth/signup')}>Create an account</Button> to save your data.
              </p>
            </div>
          )}
          <p className="text-gray-600">
            Your relationship dashboard for {format(new Date(), 'EEEE, MMMM d')}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Button 
            onClick={() => router.push('/events/create')}
            className="h-20 flex flex-col items-center justify-center space-y-2 bg-primary hover:bg-primary/90"
          >
            <Plus className="w-6 h-6" />
            <span className="text-sm">New Event</span>
          </Button>
          <Button 
            variant="outline"
            onClick={() => router.push('/calendar')}
            className="h-20 flex flex-col items-center justify-center space-y-2"
          >
            <Calendar className="w-6 h-6" />
            <span className="text-sm">Calendar</span>
          </Button>
          <Button 
            variant="outline"
            onClick={() => router.push('/relationships')}
            className="h-20 flex flex-col items-center justify-center space-y-2"
          >
            <Users className="w-6 h-6" />
            <span className="text-sm">Partners</span>
          </Button>
          <Button 
            variant="outline"
            onClick={() => router.push('/settings')}
            className="h-20 flex flex-col items-center justify-center space-y-2"
          >
            <Settings className="w-6 h-6" />
            <span className="text-sm">Settings</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upcoming Events */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Upcoming Events
                </CardTitle>
                <CardDescription>
                  Your schedule for the next 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No upcoming events</p>
                    <Button onClick={() => router.push('/events/create')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create your first event
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start space-x-4 p-4 rounded-lg border border-gray-100 hover:bg-gray-50/50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/events/${event.id}`)}
                      >
                        <div
                          className="w-3 h-3 rounded-full mt-2 flex-shrink-0"
                          style={{ backgroundColor: event.relationship_id ? getRelationshipColor(event.relationship_id) : '#6B7280' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{event.title}</p>
                          <p className="text-sm text-gray-600">{formatEventTime(event.start_time)}</p>
                          {event.location && (
                            <p className="text-sm text-gray-500">{event.location}</p>
                          )}
                        </div>
                        <Badge variant="outline" className={`privacy-indicator-${event.privacy_level}`}>
                          {event.privacy_level}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Relationships Summary */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Your Relationships
                </CardTitle>
              </CardHeader>
              <CardContent>
                {relationships.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-600 mb-4">No relationships yet</p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => router.push('/relationships/add')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Partner
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {relationships.slice(0, 4).map((relationship) => (
                      <div key={relationship.id} className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ backgroundColor: relationship.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {relationship.partner_name}
                          </p>
                          <p className="text-sm text-gray-500 capitalize">
                            {relationship.relationship_type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    ))}
                    {relationships.length > 4 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={() => router.push('/relationships')}
                      >
                        View all {relationships.length} relationships
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Future Features Placeholder */}
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Relationship Insights
                </CardTitle>
                <CardDescription>Coming Soon</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <BarChart3 className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Time allocation and relationship analytics will be available soon.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="w-5 h-5 mr-2" />
                  Relationship Agreements
                </CardTitle>
                <CardDescription>Coming Soon</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Heart className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Track and manage relationship agreements and boundaries.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
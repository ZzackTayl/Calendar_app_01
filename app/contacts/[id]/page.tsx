'use client';

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type Relationship } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  Tag,
  Calendar,
  Clock,
  MapPin,
  Share,
  User,
  Shield,
  CalendarClock,
  Users,
  MessagesSquare,
  Heart,
  Plus,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { DemoStore } from '@/lib/demo-store'
import { useToast } from '@/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Extended Relationship type with additional contact fields
interface Contact extends Relationship {
  tags?: string[]
  phone?: string
  address?: string
  birthday?: string
  contact_frequency?: 'frequent' | 'regular' | 'occasional' | 'rare'
  last_contact?: string
  notes?: string
  
  // Demo fields for history
  communication_history?: Array<{
    id: string
    type: 'call' | 'message' | 'meeting' | 'email'
    date: string
    notes?: string
  }>
  
  // Demo fields for associated events
  upcoming_events?: Array<{
    id: string
    title: string
    date: string
    type: string
  }>
  past_events?: Array<{
    id: string
    title: string
    date: string
    type: string
  }>
}

export default function ContactDetailPage({ params }: { params: { id: string } }) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDelete, setShowDelete] = useState(false)
  const { user, demoMode } = useAuth()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { toast } = useToast()
  
  useEffect(() => {
    if (!user && !demoMode) {
      router.push('/auth/signin')
      return
    }
    
    fetchContact()
  }, [user, router, demoMode, params.id])
  
  const fetchContact = async () => {
    try {
      if (demoMode) {
        // Fetch from demo store
        const relationship = DemoStore.getRelationship(params.id)
        if (!relationship) {
          router.push('/contacts')
          return
        }
        
        // Add demo data
        const enhancedContact: Contact = {
          ...relationship,
          tags: ['Primary', 'Close'],
          phone: '+1 555-123-4567',
          address: '123 Poly Lane, Relationship City, RC 12345',
          birthday: '1990-06-15',
          contact_frequency: 'frequent',
          last_contact: new Date(Date.now() - (Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
          notes: 'This is a demo contact with sample information. In a real application, you would store detailed notes and preferences here.',
          
          // Demo communication history
          communication_history: [
            { 
              id: '1', 
              type: 'meeting', 
              date: new Date(Date.now() - (3 * 24 * 60 * 60 * 1000)).toISOString(),
              notes: 'Coffee meetup to discuss upcoming vacation plans' 
            },
            { 
              id: '2', 
              type: 'call', 
              date: new Date(Date.now() - (5 * 24 * 60 * 60 * 1000)).toISOString(),
              notes: 'Quick check-in call' 
            },
            { 
              id: '3', 
              type: 'message', 
              date: new Date(Date.now() - (1 * 24 * 60 * 60 * 1000)).toISOString(),
              notes: 'Text about dinner plans' 
            },
          ],
          
          // Demo events
          upcoming_events: [
            {
              id: 'e1',
              title: 'Dinner Date',
              date: new Date(Date.now() + (2 * 24 * 60 * 60 * 1000)).toISOString(),
              type: 'date'
            },
            {
              id: 'e2',
              title: 'Movie Night',
              date: new Date(Date.now() + (5 * 24 * 60 * 60 * 1000)).toISOString(),
              type: 'entertainment'
            }
          ],
          past_events: [
            {
              id: 'e3',
              title: 'Breakfast Meeting',
              date: new Date(Date.now() - (10 * 24 * 60 * 60 * 1000)).toISOString(),
              type: 'meeting'
            },
            {
              id: 'e4',
              title: 'Weekend Getaway',
              date: new Date(Date.now() - (20 * 24 * 60 * 60 * 1000)).toISOString(),
              type: 'trip'
            }
          ]
        }
        
        setContact(enhancedContact)
        setLoading(false)
        return
      }
      
      // Real implementation would fetch from database
      const { data, error } = await supabase
        .from('relationships')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user?.id)
        .single()
      
      if (error || !data) {
        router.push('/contacts')
        return
      }
      
      // In real implementation, fetch additional contact data
      // from a contacts table related to this relationship
      setContact(data)
      
    } catch (error) {
      console.error('Error fetching contact:', error)
      router.push('/contacts')
    } finally {
      setLoading(false)
    }
  }
  
  const handleDelete = async () => {
    try {
      if (demoMode) {
        DemoStore.deleteRelationship(params.id)
        toast({ title: 'Contact deleted' })
        router.push('/contacts')
        return
      }
      
      const { error } = await supabase
        .from('relationships')
        .delete()
        .eq('id', params.id)
        .eq('user_id', user?.id)
        
      if (error) throw error
      
      toast({ title: 'Contact deleted' })
      router.push('/contacts')
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: 'Failed to delete contact' })
    } finally {
      setShowDelete(false)
    }
  }
  
  const getRelationshipTypeLabel = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
  
  const getPrivacyLevelBadge = (level: string) => {
    const badges = {
      full_access: { label: 'Full Access', variant: 'default' as const },
      limited_access: { label: 'Limited', variant: 'secondary' as const },
      no_access: { label: 'Private', variant: 'outline' as const }
    }
    return badges[level as keyof typeof badges] || badges.limited_access
  }
  
  const getFrequencyColor = (frequency?: string) => {
    switch (frequency) {
      case 'frequent': return 'text-green-600'
      case 'regular': return 'text-blue-600'
      case 'occasional': return 'text-amber-600'
      case 'rare': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }
  
  const getCommunicationTypeIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone className="w-4 h-4" />
      case 'message': return <MessagesSquare className="w-4 h-4" />
      case 'meeting': return <Users className="w-4 h-4" />
      case 'email': return <Mail className="w-4 h-4" />
      default: return <MessagesSquare className="w-4 h-4" />
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  if (!contact) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
          <CardContent className="text-center py-12">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Contact not found
            </h3>
            <p className="text-gray-600 mb-6">
              This contact may have been deleted or doesn't exist
            </p>
            <Button onClick={() => router.push('/contacts')}>
              Go to Contacts
            </Button>
          </CardContent>
        </Card>
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
                onClick={() => router.push('/contacts')}
                className="mr-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div
                className="w-5 h-5 rounded-full mr-3"
                style={{ backgroundColor: contact.color || '#6B7280' }}
              />
              <h1 className="text-xl font-bold text-gray-900">{contact.partner_name}</h1>
              <Badge className="ml-2" {...getPrivacyLevelBadge(contact.privacy_level || 'limited_access')} />
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/contacts/${contact.id}/edit`)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the contact and all associated data. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Information Card */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur sticky top-24">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Relationship Type */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Relationship</span>
                  <span className="text-sm text-gray-900">
                    {getRelationshipTypeLabel(contact.relationship_type)}
                  </span>
                </div>
                
                {/* Contact Frequency */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Frequency</span>
                  <span className={`text-sm font-medium ${getFrequencyColor(contact.contact_frequency)}`}>
                    {contact.contact_frequency?.toUpperCase() || 'UNSET'}
                  </span>
                </div>
                
                {/* Last Contact */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Last Contact</span>
                  <span className="text-sm text-gray-900">
                    {contact.last_contact ? format(new Date(contact.last_contact), 'MMM d, yyyy') : 'Never'}
                  </span>
                </div>
                
                <div className="border-t border-gray-200 my-2"></div>
                
                {/* Email Address */}
                {contact.partner_email && (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 text-gray-500 mr-2" />
                    <a href={`mailto:${contact.partner_email}`} className="text-sm text-primary hover:underline">
                      {contact.partner_email}
                    </a>
                  </div>
                )}
                
                {/* Phone Number */}
                {contact.phone && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 text-gray-500 mr-2" />
                    <a href={`tel:${contact.phone}`} className="text-sm text-primary hover:underline">
                      {contact.phone}
                    </a>
                  </div>
                )}
                
                {/* Address */}
                {contact.address && (
                  <div className="flex items-start">
                    <MapPin className="w-4 h-4 text-gray-500 mr-2 mt-0.5" />
                    <span className="text-sm text-gray-900">
                      {contact.address}
                    </span>
                  </div>
                )}
                
                {/* Birthday */}
                {contact.birthday && (
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-sm text-gray-900">
                      {format(parseISO(contact.birthday), 'MMMM d, yyyy')}
                    </span>
                  </div>
                )}
                
                <div className="border-t border-gray-200 my-2"></div>
                
                {/* Tags */}
                {contact.tags && contact.tags.length > 0 && (
                  <div>
                    <div className="flex items-center mb-2">
                      <Tag className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm font-medium text-gray-500">Tags</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {contact.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Privacy Settings */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <div className="flex items-center mb-2">
                    <Shield className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-sm font-medium text-gray-500">Privacy Settings</span>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Calendar Visibility</span>
                      <Badge variant="outline">
                        {getPrivacyLevelBadge(contact.privacy_level || 'limited_access').label}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => router.push(`/settings/privacy?contact=${contact.id}`)}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Manage Privacy
                  </Button>
                </div>
                
                <div className="flex flex-col space-y-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push(`/calendar?with=${contact.id}`)}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    View Shared Calendar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push(`/events/create?contact=${contact.id}`)}
                  >
                    <CalendarClock className="w-4 h-4 mr-2" />
                    Schedule Event
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="overview">
              <TabsList className="mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="history">Communication</TabsTrigger>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>
              
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle>Relationship Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Heart className="w-5 h-5 text-red-500" />
                      <span className="font-medium">
                        {getRelationshipTypeLabel(contact.relationship_type)} Relationship
                      </span>
                    </div>
                    
                    {contact.start_date && (
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 text-gray-500 mr-2" />
                        <span>
                          Since {format(new Date(contact.start_date), 'MMMM d, yyyy')}
                          <span className="text-gray-500 ml-2">
                            ({Math.floor((Date.now() - new Date(contact.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30))} months)
                          </span>
                        </span>
                      </div>
                    )}
                    
                    {/* Relationship notes summary */}
                    {contact.notes && (
                      <p className="text-sm text-gray-600 mt-2">
                        {contact.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
                
                {/* Recent Communication */}
                {contact.communication_history && contact.communication_history.length > 0 && (
                  <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="text-base">Recent Communication</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {contact.communication_history.slice(0, 3).map((comm) => (
                        <div key={comm.id} className="flex items-start space-x-3">
                          <div className="p-2 bg-gray-100 rounded-full">
                            {getCommunicationTypeIcon(comm.type)}
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {comm.type.charAt(0).toUpperCase() + comm.type.slice(1)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(comm.date), 'MMM d, yyyy')}
                            </p>
                            {comm.notes && (
                              <p className="text-xs text-gray-600 mt-1">
                                {comm.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      <Button variant="link" className="text-sm p-0" onClick={() => document.getElementById('tab-history')?.click()}>
                        View all communication
                      </Button>
                    </CardContent>
                  </Card>
                )}
                
                {/* Upcoming Events */}
                {contact.upcoming_events && contact.upcoming_events.length > 0 && (
                  <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
                    <CardHeader>
                      <CardTitle className="text-base">Upcoming Events</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {contact.upcoming_events.map((event) => (
                        <div key={event.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-md transition-colors">
                          <CalendarClock className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-sm font-medium">{event.title}</p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(event.date), 'EEEE, MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      ))}
                      <Button variant="link" className="text-sm p-0" onClick={() => document.getElementById('tab-events')?.click()}>
                        View all events
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              {/* Communication History Tab */}
              <TabsContent value="history" className="space-y-6">
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle>Communication History</CardTitle>
                    <CardDescription>
                      Record of your interactions with {contact.partner_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button className="mb-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Log New Interaction
                    </Button>
                    
                    {contact.communication_history && contact.communication_history.length > 0 ? (
                      <div className="space-y-4">
                        {contact.communication_history.map((comm) => (
                          <div key={comm.id} className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg">
                            <div className="p-2 bg-white rounded-full">
                              {getCommunicationTypeIcon(comm.type)}
                            </div>
                            <div className="flex-grow">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">
                                  {comm.type.charAt(0).toUpperCase() + comm.type.slice(1)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {format(new Date(comm.date), 'MMM d, yyyy')}
                                </p>
                              </div>
                              {comm.notes && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {comm.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <MessagesSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No communication history recorded</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Events Tab */}
              <TabsContent value="events" className="space-y-6">
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle>Events</CardTitle>
                    <CardDescription>
                      Calendar events with {contact.partner_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button onClick={() => router.push(`/events/create?contact=${contact.id}`)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Event
                    </Button>
                    
                    {/* Upcoming Events */}
                    <div>
                      <h3 className="text-base font-medium mb-3">Upcoming Events</h3>
                      {contact.upcoming_events && contact.upcoming_events.length > 0 ? (
                        <div className="space-y-3">
                          {contact.upcoming_events.map((event) => (
                            <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <CalendarClock className="w-5 h-5 text-primary" />
                                <div>
                                  <p className="font-medium">{event.title}</p>
                                  <p className="text-xs text-gray-500">
                                    {format(new Date(event.date), 'EEEE, MMM d, yyyy')}
                                  </p>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => router.push(`/events/${event.id}`)}>
                                View
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No upcoming events</p>
                      )}
                    </div>
                    
                    {/* Past Events */}
                    <div className="mt-6">
                      <h3 className="text-base font-medium mb-3">Past Events</h3>
                      {contact.past_events && contact.past_events.length > 0 ? (
                        <div className="space-y-3">
                          {contact.past_events.map((event) => (
                            <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                <Calendar className="w-5 h-5 text-gray-500" />
                                <div>
                                  <p className="font-medium">{event.title}</p>
                                  <p className="text-xs text-gray-500">
                                    {format(new Date(event.date), 'EEEE, MMM d, yyyy')}
                                  </p>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => router.push(`/events/${event.id}`)}>
                                View
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No past events</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Notes Tab */}
              <TabsContent value="notes" className="space-y-6">
                <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
                  <CardHeader>
                    <CardTitle>Notes</CardTitle>
                    <CardDescription>
                      Private notes about {contact.partner_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Notes
                    </Button>
                    
                    {contact.notes ? (
                      <div className="p-4 bg-gray-50 rounded-lg whitespace-pre-line">
                        {contact.notes}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <MessagesSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No notes added yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}

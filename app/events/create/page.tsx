'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type Relationship } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Calendar, Clock, MapPin, Users, Lock, Globe, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format, addHours, startOfHour } from 'date-fns'

export default function CreateEventPage() {
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    // Set default datetime values
    const now = startOfHour(new Date())
    const oneHourLater = addHours(now, 1)
    
    setStartDate(format(now, 'yyyy-MM-dd'))
    setStartTime(format(now, 'HH:mm'))
    setEndDate(format(oneHourLater, 'yyyy-MM-dd'))
    setEndTime(format(oneHourLater, 'HH:mm'))

    fetchRelationships()
  }, [user, router])

  const fetchRelationships = async () => {
    try {
      const { data, error } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', user?.id)
        .order('partner_name', { ascending: true })
      
      if (error) throw error
      setRelationships(data || [])
    } catch (error) {
      console.error('Error fetching relationships:', error)
    }
  }

  const handleRelationshipToggle = (relationshipId: string) => {
    setVisibleToRelationships(prev => 
      prev.includes(relationshipId)
        ? prev.filter(id => id !== relationshipId)
        : [...prev, relationshipId]
    )
  }

  const parseNaturalLanguage = async (input: string) => {
    // Simple natural language parsing - in production, this would use AI
    const lowerInput = input.toLowerCase()
    
    // Extract time patterns
    const timePattern = /(\d{1,2}):?(\d{2})?\s*(am|pm)/i
    const timeMatch = lowerInput.match(timePattern)
    
    // Extract date patterns
    const datePatterns = [
      /tomorrow/i,
      /today/i,
      /next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /(\d{1,2})\/(\d{1,2})/
    ]
    
    let suggestedTitle = input
    let suggestedDate = startDate
    let suggestedTime = startTime
    
    if (timeMatch) {
      let hour = parseInt(timeMatch[1])
      const minutes = timeMatch[2] || '00'
      const ampm = timeMatch[3]?.toLowerCase()
      
      if (ampm === 'pm' && hour !== 12) hour += 12
      if (ampm === 'am' && hour === 12) hour = 0
      
      suggestedTime = `${hour.toString().padStart(2, '0')}:${minutes}`
      
      // Remove time from title
      suggestedTitle = input.replace(timeMatch[0], '').trim()
    }
    
    if (lowerInput.includes('tomorrow')) {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      suggestedDate = format(tomorrow, 'yyyy-MM-dd')
      suggestedTitle = suggestedTitle.replace(/tomorrow/i, '').trim()
    }
    
    return { suggestedTitle, suggestedDate, suggestedTime }
  }

  const handleNaturalLanguageInput = async (input: string) => {
    if (input.length > 10) { // Only parse longer inputs
      const { suggestedTitle, suggestedDate, suggestedTime } = await parseNaturalLanguage(input)
      
      if (suggestedTitle !== input) {
        setTitle(suggestedTitle)
        setStartDate(suggestedDate)
        setStartTime(suggestedTime)
        
        // Calculate end time (1 hour later)
        const [hours, minutes] = suggestedTime.split(':')
        const endDateTime = new Date()
        endDateTime.setHours(parseInt(hours) + 1, parseInt(minutes))
        setEndTime(format(endDateTime, 'HH:mm'))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!title.trim()) {
      setError('Event title is required')
      return
    }

    if (!startDate || !startTime) {
      setError('Start date and time are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const startDateTime = new Date(`${startDate}T${startTime}`)
      const endDateTime = endDate && endTime 
        ? new Date(`${endDate}T${endTime}`)
        : addHours(startDateTime, 1)

      const { error } = await supabase
        .from('events')
        .insert({
          user_id: user?.id,
          title: title.trim(),
          description: description.trim() || null,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          location: location.trim() || null,
          privacy_level: privacyLevel,
          relationship_id: selectedRelationship || null,
          visible_to_relationships: privacyLevel === 'custom' ? visibleToRelationships : null
        })

      if (error) {
        setError(error.message)
      } else {
        router.push('/calendar')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard')}
              className="mr-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Calendar className="w-6 h-6 text-primary mr-3" />
            <h1 className="text-xl font-bold text-gray-900">Create Event</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Create New Event</CardTitle>
            <CardDescription>
              Add a new event to your calendar with privacy controls for your relationships.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-6">
                {/* Natural Language Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick create (try: "Dinner with Alex tomorrow 7pm")
                  </label>
                  <Input
                    placeholder="Describe your event naturally..."
                    onBlur={(e) => handleNaturalLanguageInput(e.target.value)}
                    className="mb-2"
                  />
                  <p className="text-xs text-gray-500">
                    Type naturally and we'll help fill in the details
                  </p>
                </div>

                {/* Basic Event Details */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Event title *
                    </label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What's happening?"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add more details..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                    />
                  </div>
                </div>

                {/* Date and Time */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    When
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start date *
                      </label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start time *
                      </label>
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End date
                      </label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End time
                      </label>
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Location (optional)
                  </label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Where is this happening?"
                  />
                </div>

                {/* Relationship Association */}
                {relationships.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <Users className="w-4 h-4 inline mr-1" />
                      Associated relationship (optional)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRelationship('')}
                        className={`p-3 rounded-lg border text-sm transition-all ${
                          selectedRelationship === ''
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-gray-200 hover:border-gray-300'
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
                            selectedRelationship === relationship.id
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded-full mr-2"
                              style={{ backgroundColor: relationship.color }}
                            />
                            {relationship.partner_name}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Privacy Settings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Privacy level
                  </label>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setPrivacyLevel('public')}
                      className={`w-full p-4 rounded-lg border text-left transition-all ${
                        privacyLevel === 'public'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center mb-1">
                        <Globe className="w-4 h-4 mr-2" />
                        <span className="font-medium">Public</span>
                      </div>
                      <p className="text-sm text-gray-600">All your partners can see this event</p>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setPrivacyLevel('private')}
                      className={`w-full p-4 rounded-lg border text-left transition-all ${
                        privacyLevel === 'private'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center mb-1">
                        <Lock className="w-4 h-4 mr-2" />
                        <span className="font-medium">Private</span>
                      </div>
                      <p className="text-sm text-gray-600">Only you can see this event</p>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setPrivacyLevel('custom')}
                      className={`w-full p-4 rounded-lg border text-left transition-all ${
                        privacyLevel === 'custom'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center mb-1">
                        <Settings className="w-4 h-4 mr-2" />
                        <span className="font-medium">Custom</span>
                      </div>
                      <p className="text-sm text-gray-600">Choose specific partners who can see this</p>
                    </button>
                  </div>

                  {/* Custom Privacy Selection */}
                  {privacyLevel === 'custom' && relationships.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        Who can see this event?
                      </p>
                      <div className="space-y-2">
                        {relationships.map((relationship) => (
                          <label
                            key={relationship.id}
                            className="flex items-center cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={visibleToRelationships.includes(relationship.id)}
                              onChange={() => handleRelationshipToggle(relationship.id)}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <div className="flex items-center ml-3">
                              <div
                                className="w-3 h-3 rounded-full mr-2"
                                style={{ backgroundColor: relationship.color }}
                              />
                              <span className="text-sm text-gray-900">
                                {relationship.partner_name}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Creating Event...' : 'Create Event'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
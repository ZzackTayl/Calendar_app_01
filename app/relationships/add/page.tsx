'use client';

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Users, Mail, User, Calendar, ChevronDown, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { CreateInvitationRequest, InvitationResponse } from '@/lib/supabase/types'
import { ConnectionTier } from '@/lib/supabase/types'

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
    value: 'details', 
    label: 'Full Details', 
    description: 'Can see your entire calendar including event names and details (family privileges)' 
  },
  { 
    value: 'busy_only', 
    label: 'Busy Only', 
    description: 'Can see when you are busy but not event details. You control what they can view event by event or through groups.' 
  },
  { 
    value: 'private', 
    label: 'Private', 
    description: 'Cannot see your calendar or events' 
  }
]

export default function AddRelationshipPage() {
  const [partnerName, setPartnerName] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [relationshipType, setRelationshipType] = useState('custom')
  const [customType, setCustomType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [selectedColor, setSelectedColor] = useState(relationshipColors[0])
  const [privacyLevel, setPrivacyLevel] = useState('busy_only')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [invitationSent, setInvitationSent] = useState(false)
  const [invitationLoading, setInvitationLoading] = useState(false)
  const [sendInvitation, setSendInvitation] = useState(true)
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { toast } = useToast()

  const sendInvitationEmail = async (relationshipCreated: boolean = true) => {
    if (!partnerEmail.trim()) return { success: false, invitationId: null }

    setInvitationLoading(true)
    try {
      const relationshipLabel = relationshipType === 'custom' && customType 
        ? customType 
        : relationshipTypes.find(t => t.value === relationshipType)?.label || relationshipType

      const invitationData: CreateInvitationRequest = {
        recipient_email: partnerEmail.trim(),
        message: `${user?.email || 'Someone'} would like to connect with you as their ${relationshipLabel}. They've added you to their calendar network and would like to share events with you.`,
        invitation_type: 'relationship_invitation'
      }

      const response = await fetch('/api/invitations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invitationData),
      })

      const result: InvitationResponse = await response.json()
      
      if (result.success) {
        setInvitationSent(true)
        if (relationshipCreated) {
          toast({ 
            title: 'Connection added & invitation sent!', 
            description: `${partnerName} has been added to your network and an invitation email has been sent to ${partnerEmail}.`
          })
        } else {
          toast({ 
            title: 'Invitation sent!', 
            description: `An invitation email has been sent to ${partnerEmail}.`
          })
        }
        return { success: true, invitationId: result.invitation?.id || null }
      } else {
        console.error('Invitation failed:', result.error)
        if (relationshipCreated) {
          toast({ 
            title: 'Connection added', 
            description: `${partnerName} has been added, but we couldn't send the invitation email. You can resend it later.`,
            variant: 'default'
          })
        } else {
          toast({ 
            title: 'Invitation failed', 
            description: result.error || 'Failed to send invitation email',
            variant: 'destructive'
          })
        }
        return { success: false, invitationId: null }
      }
    } catch (err) {
      console.error('Error sending invitation:', err)
      if (relationshipCreated) {
        toast({ 
          title: 'Connection added', 
          description: `${partnerName} has been added, but we couldn't send the invitation email. You can resend it later.`,
          variant: 'default'
        })
      } else {
        toast({ 
          title: 'Invitation failed', 
          description: 'Failed to send invitation email',
          variant: 'destructive'
        })
      }
      return { success: false, invitationId: null }
    } finally {
      setInvitationLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!partnerName.trim()) {
      setError('Partner name is required')
      return
    }

    // Validate email format if provided
    if (partnerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(partnerEmail.trim())) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      const relationshipData = {
        user_id: user?.id,
        partner_name: partnerName.trim(),
        partner_email: partnerEmail.trim() || null,
        relationship_type: relationshipType === 'custom' && customType 
          ? customType 
          : relationshipTypes.find(t => t.value === relationshipType)?.label || relationshipType,
        start_date: startDate || null,
        color: selectedColor,
        connection_tier: privacyLevel as ConnectionTier,
        notes: notes.trim() || null,
        // Pre-set invitation status if email provided and user wants to send invitation
        invitation_status: (partnerEmail.trim() && sendInvitation) ? 'pending' : null,
        invitation_sent_at: null
      }

      const { data: createdRelationship, error } = await supabase
        .from('relationships')
        .insert(relationshipData)
        .select()
        .single()

      if (error) {
        setError(error.message)
      } else {
        // Relationship created successfully
        let relationshipCreated = true
        
        // Send invitation if email is provided and user wants to send it
        if (partnerEmail.trim() && sendInvitation) {
          const invitationResult = await sendInvitationEmail(relationshipCreated)
          
          // Update the relationship with invitation details
          if (invitationResult.success && createdRelationship) {
            await supabase
              .from('relationships')
              .update({
                invitation_id: invitationResult.invitationId,
                invitation_status: 'sent',
                invitation_sent_at: new Date().toISOString()
              })
              .eq('id', createdRelationship.id)
          } else if (createdRelationship) {
            // Mark invitation as failed
            await supabase
              .from('relationships')
              .update({
                invitation_status: 'pending'
              })
              .eq('id', createdRelationship.id)
          }
        } else {
          toast({ 
            title: 'Connection added', 
            description: partnerEmail.trim() 
              ? `${partnerName} has been added to your network. No invitation email will be sent.`
              : `${partnerName} has been added to your network.`
          })
        }
        
        router.push('/relationships')
      }
    } catch (err) {
      setError('An unexpected error occurred')
      toast({ title: 'Error', description: 'Failed to add connection' })
    } finally {
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-700 sticky top-0 z-40">
        <div className="mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center h-14 sm:h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/relationships')}
              className="mr-2 h-8 w-8 p-0 sm:h-10 sm:w-10"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary mr-2 sm:mr-3 flex-shrink-0" />
            <h1 className="text-lg sm:text-xl font-bold text-white truncate">Add New Connection</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <Card className="border-0 shadow-xl bg-slate-800/90 backdrop-blur border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Add a New Connection</CardTitle>
            <CardDescription className="text-slate-300">
              Add someone special to your relationship network and customize how you share your calendar with them.
              If you provide their email, we can send them an invitation to connect.
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
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Basic Information</h3>
                  
                  <div>
                    <label htmlFor="partnerName" className="block text-sm font-medium text-white mb-2">
                      Connection&apos;s name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <Input
                        id="partnerName"
                        value={partnerName}
                        onChange={(e) => setPartnerName(e.target.value)}
                        placeholder="Enter their name"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="partnerEmail" className="block text-sm font-medium text-white mb-2">
                      Email (optional)
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <Input
                        id="partnerEmail"
                        type="email"
                        value={partnerEmail}
                        onChange={(e) => {
                          setPartnerEmail(e.target.value)
                          setInvitationSent(false)
                        }}
                        placeholder="connection@example.com"
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {partnerEmail.trim() 
                        ? "We'll send them an invitation to connect and share calendars"
                        : "Optional - helps with future collaboration features"}
                    </p>
                    
                    {/* Invitation Options */}
                    {partnerEmail.trim() && (
                      <div className="mt-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                        <div className="flex items-start space-x-3">
                          <div className="flex items-center space-x-2 flex-1">
                            <input
                              type="checkbox"
                              id="sendInvitation"
                              checked={sendInvitation}
                              onChange={(e) => setSendInvitation(e.target.checked)}
                              className="rounded border-slate-400 text-primary focus:ring-primary focus:ring-offset-0"
                            />
                            <label htmlFor="sendInvitation" className="text-sm text-white font-medium">
                              Send invitation email
                            </label>
                          </div>
                          {invitationSent && (
                            <div className="flex items-center space-x-1 text-green-400">
                              <Send className="w-4 h-4" />
                              <span className="text-xs font-medium">Sent!</span>
                            </div>
                          )}
                        </div>
                        {sendInvitation && (
                          <p className="text-xs text-slate-300 mt-2 ml-5">
                            They&apos;ll receive an email with a link to connect with you and join your calendar network.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-white mb-2">
                      Relationship start date (optional)
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Relationship Type */}
                <div>
                  <label htmlFor="relationshipType" className="block text-sm font-medium text-white mb-3">
                    Relationship type
                  </label>
                  <Select value={relationshipType} onValueChange={setRelationshipType}>
                    <SelectTrigger id="relationshipType" className="w-full bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Choose or type your own relationship type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {relationshipTypes.map((type) => (
                        <SelectItem 
                          key={type.value} 
                          value={type.value}
                          className="text-white hover:bg-slate-700 focus:bg-slate-700"
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
                        className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                        required
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        Create a unique, personal identifier that feels right for your relationship
                      </p>
                    </div>
                  )}
                </div>

                {/* Calendar Color */}
                <div>
                  <label className="block text-sm font-medium text-white mb-3">
                    Calendar color for this connection
                  </label>
                  <p className="text-xs text-slate-400 mb-3">
                    This color will help you identify events with this connection in your calendar
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {relationshipColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        style={{ backgroundColor: color }}
                        className={`w-10 h-10 rounded-full border-2 transition-all ${
                          selectedColor === color
                            ? 'border-white scale-110 ring-2 ring-primary'
                            : 'border-slate-600 hover:border-slate-400'
                        }`}
                        aria-label={`Select color ${color}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Privacy Settings */}
                <div>
                  <label className="block text-sm font-medium text-white mb-3">
                    Privacy level
                  </label>
                  <div className="space-y-3">
                    {privacyLevels.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setPrivacyLevel(level.value)}
                        className={`w-full p-4 rounded-lg border text-left transition-all ${
                          privacyLevel === level.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-slate-600 hover:border-slate-600'
                        }`}
                      >
                        <div className="font-medium mb-1">{level.label}</div>
                        <p className="text-sm text-slate-300">{level.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-white mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes about this relationship..."
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-600 bg-slate-700 text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="flex space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/relationships')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || invitationLoading || (relationshipType === 'custom' && !customType.trim())}
                  className="flex-1"
                >
                  {loading || invitationLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>
                        {loading && invitationLoading 
                          ? 'Adding & Inviting...' 
                          : loading 
                          ? 'Adding Connection...' 
                          : 'Sending Invitation...'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <span>Add Connection</span>
                      {partnerEmail.trim() && sendInvitation && (
                        <Send className="w-4 h-4" />
                      )}
                    </div>
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
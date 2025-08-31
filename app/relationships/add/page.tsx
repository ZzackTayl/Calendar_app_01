'use client';

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Users, Mail, User, Calendar, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
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

export default function AddRelationshipPage() {
  const [partnerName, setPartnerName] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [relationshipType, setRelationshipType] = useState('custom')
  const [customType, setCustomType] = useState('')
  const [startDate, setStartDate] = useState('')
  const [selectedColor, setSelectedColor] = useState(relationshipColors[0])
  const [privacyLevel, setPrivacyLevel] = useState('limited_access')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user, demoMode } = useAuth()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!partnerName.trim()) {
      setError('Partner name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (demoMode) {
        const uid = user?.id || 'demo-user'
        DemoStore.addRelationship({
          user_id: uid,
          partner_name: partnerName.trim(),
          partner_email: partnerEmail.trim() || undefined,
          relationship_type: relationshipType === 'custom' && customType 
            ? customType 
            : relationshipTypes.find(t => t.value === relationshipType)?.label || relationshipType,
          start_date: startDate || undefined,
          color: selectedColor,
          privacy_level: privacyLevel as any,
          notes: notes.trim() || undefined,
          created_at: '' as any,
          updated_at: '' as any,
          is_active: true as any,
        } as any)
        toast({ title: 'Connection added', description: `${partnerName} has been added.` })
        router.push('/relationships')
        return
      }

      const relationshipData = {
        user_id: user?.id,
        partner_name: partnerName.trim(),
        partner_email: partnerEmail.trim() || null,
        relationship_type: relationshipType === 'custom' && customType 
          ? customType 
          : relationshipTypes.find(t => t.value === relationshipType)?.label || relationshipType,
        start_date: startDate || null,
        color: selectedColor,
        privacy_level: privacyLevel,
        notes: notes.trim() || null
      }

      const { error } = await supabase
        .from('relationships')
        .insert(relationshipData)

      if (error) {
        setError(error.message)
      } else {
        toast({ title: 'Connection added' })
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
                        onChange={(e) => setPartnerEmail(e.target.value)}
                        placeholder="connection@example.com"
                        className="pl-10"
                      />
                    </div>
                                      <p className="text-xs text-slate-400 mt-1">
                    Optional - helps with future collaboration features
                  </p>
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
                  disabled={loading || (relationshipType === 'custom' && !customType.trim())}
                  className="flex-1"
                >
                  {loading ? 'Adding Connection...' : 'Add Connection'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
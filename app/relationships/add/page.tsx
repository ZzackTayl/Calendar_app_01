'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Users, Mail, User, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'

const relationshipTypes = [
  { value: 'primary', label: 'Primary Partner', description: 'Your main romantic partner', color: 'bg-blue-500' },
  { value: 'secondary', label: 'Secondary Partner', description: 'Important ongoing relationship', color: 'bg-green-500' },
  { value: 'nesting', label: 'Nesting Partner', description: 'Partner you live with', color: 'bg-purple-500' },
  { value: 'long_distance', label: 'Long Distance', description: 'Partner in different location', color: 'bg-yellow-500' },
  { value: 'casual', label: 'Casual Partner', description: 'Less committed relationship', color: 'bg-pink-500' },
  { value: 'other', label: 'Other', description: 'Custom relationship type', color: 'bg-gray-500' }
]

const relationshipColors = [
  '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280', '#EC4899', '#14B8A6'
]

const privacyLevels = [
  { 
    value: 'full_access', 
    label: 'Full Access', 
    description: 'Can see all event details and participate in planning' 
  },
  { 
    value: 'limited_access', 
    label: 'Limited Access', 
    description: 'Can see some events but with restricted details' 
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
  const [relationshipType, setRelationshipType] = useState('primary')
  const [startDate, setStartDate] = useState('')
  const [selectedColor, setSelectedColor] = useState(relationshipColors[0])
  const [privacyLevel, setPrivacyLevel] = useState('limited_access')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createSupabaseClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!partnerName.trim()) {
      setError('Partner name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error } = await supabase
        .from('relationships')
        .insert({
          user_id: user?.id,
          partner_name: partnerName.trim(),
          partner_email: partnerEmail.trim() || null,
          relationship_type: relationshipType,
          start_date: startDate || null,
          color: selectedColor,
          privacy_level: privacyLevel,
          notes: notes.trim() || null
        })

      if (error) {
        setError(error.message)
      } else {
        router.push('/relationships')
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
              onClick={() => router.push('/relationships')}
              className="mr-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Users className="w-6 h-6 text-primary mr-3" />
            <h1 className="text-xl font-bold text-gray-900">Add New Partner</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Add a New Relationship</CardTitle>
            <CardDescription>
              Add someone special to your polyamorous network and customize how you share your calendar with them.
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
                  <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Partner's name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        value={partnerName}
                        onChange={(e) => setPartnerName(e.target.value)}
                        placeholder="Enter their name"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email (optional)
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        type="email"
                        value={partnerEmail}
                        onChange={(e) => setPartnerEmail(e.target.value)}
                        placeholder="partner@example.com"
                        className="pl-10"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      We'll send them an invite to join your shared calendar
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Relationship start date (optional)
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
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
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Relationship type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {relationshipTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setRelationshipType(type.value)}
                        className={`p-4 rounded-lg border text-left transition-all ${
                          relationshipType === type.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center mb-2">
                          <div className={`w-3 h-3 ${type.color} rounded-full mr-2`}></div>
                          <span className="font-medium">{type.label}</span>
                        </div>
                        <p className="text-sm text-gray-600">{type.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Calendar Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Calendar color
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {relationshipColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setSelectedColor(color)}
                        className={`w-10 h-10 rounded-full border-2 transition-all ${
                          selectedColor === color
                            ? 'border-gray-800 scale-110'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Privacy Settings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
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
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium mb-1">{level.label}</div>
                        <p className="text-sm text-gray-600">{level.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional notes about this relationship..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
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
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Adding Partner...' : 'Add Partner'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
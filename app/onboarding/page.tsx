'use client';

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Heart, Users, Calendar, ArrowRight, ArrowLeft, Check } from 'lucide-react'

interface OnboardingStep {
  title: string
  description: string
  icon: React.ElementType
}

const steps: OnboardingStep[] = [
  {
    title: "Welcome to PolyHarmony",
    description: "Let's set up your relationship calendar in just a few steps",
    icon: Heart
  },
  {
    title: "Add Your First Relationship",
    description: "Start by adding someone special to share your calendar with",
    icon: Users
  },
  {
    title: "You're All Set!",
    description: "Ready to start organizing your polyamorous life",
    icon: Calendar
  }
]

const relationshipTypes = [
  { value: 'primary', label: 'Primary Partner', color: 'bg-blue-500' },
  { value: 'secondary', label: 'Secondary Partner', color: 'bg-green-500' },
  { value: 'nesting', label: 'Nesting Partner', color: 'bg-purple-500' },
  { value: 'long_distance', label: 'Long Distance', color: 'bg-yellow-500' },
  { value: 'casual', label: 'Casual Partner', color: 'bg-pink-500' },
  { value: 'other', label: 'Other', color: 'bg-gray-500' }
]

// Tailwind arbitrary color classes must be explicitly listed (no runtime strings)
const relationshipColors = [
  'bg-[#3B82F6]',
  'bg-[#10B981]',
  'bg-[#8B5CF6]',
  'bg-[#F59E0B]',
  'bg-[#EF4444]',
  'bg-[#6B7280]',
  'bg-[#EC4899]',
  'bg-[#14B8A6]'
]

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0)
  const [partnerName, setPartnerName] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['primary'])
  const [customType, setCustomType] = useState('')
  const [selectedColor, setSelectedColor] = useState(relationshipColors[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
    }
  }, [user, router])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleAddRelationship = async () => {
    if (!partnerName.trim()) {
      setError('Partner name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create the relationship with proper field names
      const relationshipData = {
        user_id: user?.id,
        partner_name: partnerName,
        partner_email: partnerEmail || null,
        relationship_type: selectedTypes.includes('other') && customType 
          ? customType 
          : selectedTypes.join(', '),
        color: selectedColor,
        privacy_level: 'limited_access'
      }

      const { error } = await supabase
        .from('relationships')
        .insert(relationshipData)

      if (error) {
        setError(error.message)
      } else {
        handleNext()
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleTypeToggle = (typeValue: string) => {
    setSelectedTypes(prev => {
      if (prev.includes(typeValue)) {
        return prev.filter(t => t !== typeValue)
      } else {
        return [...prev, typeValue]
      }
    })
  }

  const handleFinish = () => {
    router.push('/dashboard')
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const StepIcon = steps[currentStep].icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-primary' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>

        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <StepIcon className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">{steps[currentStep].title}</CardTitle>
            <CardDescription className="text-base">
              {steps[currentStep].description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-gray-600 mb-6">
                    Welcome, {user.user_metadata?.full_name || 'there'}! PolyHarmony helps you coordinate 
                    schedules with multiple partners while keeping your privacy in control.
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mr-3" />
                      Private by design - you control who sees what
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mr-3" />
                      Relationship-aware scheduling
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mr-3" />
                      Smart conflict detection
                    </div>
                  </div>
                </div>
                <Button onClick={handleNext} className="w-full" size="lg">
                  Let&apos;s get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Partner&apos;s name *
                    </label>
                    <Input
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                      placeholder="Enter their name"
                      className="text-base"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email (optional)
                    </label>
                    <Input
                      type="email"
                      value={partnerEmail}
                      onChange={(e) => setPartnerEmail(e.target.value)}
                      placeholder="partner@example.com"
                      className="text-base"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      We&apos;ll send them an invite to join your shared calendar
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Relationship type(s) - select all that apply
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {relationshipTypes.map((type) => (
                        <label
                          key={type.value}
                          className="flex items-center p-3 rounded-lg border hover:border-gray-300 transition-all cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTypes.includes(type.value)}
                            onChange={() => handleTypeToggle(type.value)}
                            className="rounded border-gray-300 text-primary focus:ring-primary mr-3"
                          />
                          <span className="text-sm font-medium">{type.label}</span>
                        </label>
                      ))}
                    </div>
                    
                    {selectedTypes.includes('other') && (
                      <div className="mt-3">
                        <Input
                          value={customType}
                          onChange={(e) => setCustomType(e.target.value)}
                          placeholder="Describe your relationship type..."
                          className="text-sm"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Calendar color for this partner
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      This color will help you identify events with this partner in your calendar
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {relationshipColors.map((color, idx) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            selectedColor === color
                              ? 'border-gray-800 scale-110'
                              : 'border-gray-300 hover:border-gray-400'
                          } ${color}`}
                          aria-label={`Select color ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <Button variant="outline" onClick={handleBack} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleAddRelationship} 
                    disabled={loading || selectedTypes.length === 0 || (selectedTypes.includes('other') && !customType.trim())}
                    className="flex-1"
                  >
                    {loading ? 'Adding...' : 'Add Partner'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-gray-600 mb-6">
                    Perfect! You&apos;ve added your first relationship. You can always add more partners 
                    and customize privacy settings from your dashboard.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">Quick Tips:</h4>
                    <ul className="text-sm text-gray-600 space-y-1 text-left">
                      <li>• Tap the + button to create events quickly</li>
                      <li>• Use privacy controls to customize what each partner sees</li>
                      <li>• Try natural language: &quot;Dinner with Alex tomorrow 7pm&quot;</li>
                    </ul>
                  </div>
                </div>
                <Button onClick={handleFinish} className="w-full" size="lg">
                  Go to Dashboard
                  <Calendar className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
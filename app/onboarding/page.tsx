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
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Heart, Users, Calendar, ArrowRight, ArrowLeft, Check, User, Mail, CalendarDays, FileText, Smartphone, Monitor } from 'lucide-react'
import Image from 'next/image'

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
    title: "Create Your Username",
    description: "Choose a unique username for your profile",
    icon: User
  },
  {
    title: "Calendar Integration",
    description: "Connect your existing calendars for seamless scheduling",
    icon: CalendarDays
  },
  {
    title: "Email Preferences",
    description: "Stay informed with updates and notifications",
    icon: Mail
  },
  {
    title: "Beta Testing Agreement",
    description: "Help us improve PolyHarmony by participating in beta testing",
    icon: FileText
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
  
  // Username step
  const [username, setUsername] = useState('')
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)
  
  // Calendar integration step
  const [selectedCalendars, setSelectedCalendars] = useState<string[]>([])
  
  // Email preferences step
  const [emailConsent, setEmailConsent] = useState(false)
  const [emailPreferences, setEmailPreferences] = useState({
    updates: false,
    notifications: false,
    tips: false
  })
  
  // Beta testing step
  const [betaConsent, setBetaConsent] = useState(false)
  const [dataCollectionConsent, setDataCollectionConsent] = useState(false)
  
  // Relationship step (existing)
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

  const handleNext = async () => {
    // Validation for each step before proceeding
    if (currentStep === 1 && (!username || usernameAvailable !== true)) {
      setError('Please choose an available username')
      return
    }
    if (currentStep === 3 && !emailConsent) {
      setError('Please accept email communication to continue')
      return
    }
    if (currentStep === 4 && (!betaConsent || !dataCollectionConsent)) {
      setError('Please accept the beta testing agreement to continue')
      return
    }
    
    setError('')
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    setError('')
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const checkUsernameAvailability = async (usernameToCheck: string) => {
    if (!usernameToCheck || usernameToCheck.length < 3) {
      setUsernameAvailable(null)
      return
    }
    
    setCheckingUsername(true)
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('username')
        .eq('username', usernameToCheck.toLowerCase())
        .single()
      
      setUsernameAvailable(!data && !error)
    } catch {
      setUsernameAvailable(true) // Assume available on error
    } finally {
      setCheckingUsername(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (username) {
        checkUsernameAvailability(username)
      }
    }, 500)
    
    return () => clearTimeout(timeoutId)
  }, [username])

  const handleCalendarToggle = (calendar: string) => {
    setSelectedCalendars(prev => 
      prev.includes(calendar) 
        ? prev.filter(c => c !== calendar)
        : [...prev, calendar]
    )
  }

  const saveUserProfile = async () => {
    if (!user) return
    
    try {
      const profileData = {
        id: user.id,
        username: username.toLowerCase(),
        email_consent: emailConsent,
        email_preferences: emailPreferences,
        beta_participant: betaConsent,
        data_collection_consent: dataCollectionConsent,
        selected_calendars: selectedCalendars,
        onboarding_completed: true
      }
      
      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData, { onConflict: 'id' })
      
      if (error) throw error
    } catch (error) {
      console.error('Error saving profile:', error)
      throw error
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
      // Save user profile first
      await saveUserProfile()
      
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
        await handleNext()
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

  const handleFinish = async () => {
    // Final save to ensure all data is persisted
    try {
      await saveUserProfile()
      router.push('/dashboard')
    } catch (err) {
      setError('Error completing setup. Please try again.')
    }
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
    <div className="min-h-screen bg-background text-foreground px-4 py-6 sm:py-8">
      <div className="max-w-md mx-auto">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-center mb-2">
            <div className="text-sm text-gray-600">
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>
          <Progress value={((currentStep + 1) / steps.length) * 100} className="mb-4" />
          <div className="flex justify-center">
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
        </div>

        <Card className="border-0 shadow-xl bg-card/80 backdrop-blur" role="main" aria-label="Onboarding form">
          <CardHeader className="text-center px-4 sm:px-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <StepIcon className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">{steps[currentStep].title}</CardTitle>
            <CardDescription className="text-base">
              {steps[currentStep].description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 px-4 sm:px-6 pb-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-gray-600 mb-6">
                    Welcome, {user?.user_metadata?.full_name || 'there'}! PolyHarmony helps you coordinate 
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
                    <div className="flex items-center text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-500 mr-3" />
                      Calendar integration with Google & Apple
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
                    <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="username-input">
                      Choose a username *
                    </label>
                    <Input
                      id="username-input"
                      aria-describedby="username-help username-validation"
                      value={username}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^a-zA-Z0-9_]/g, '')
                        setUsername(value)
                      }}
                      placeholder="yourname123"
                      className="text-base"
                      maxLength={20}
                    />
                    <div className="mt-2" id="username-validation" aria-live="polite">
                      {checkingUsername && (
                        <p className="text-xs text-gray-500">Checking availability...</p>
                      )}
                      {username.length > 0 && !checkingUsername && (
                        <p className={`text-xs ${
                          usernameAvailable === true ? 'text-green-600' : 
                          usernameAvailable === false ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {usernameAvailable === true && '✓ Username available'}
                          {usernameAvailable === false && '✗ Username taken'}
                          {usernameAvailable === null && username.length < 3 && 'Username must be at least 3 characters'}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1" id="username-help">
                      Your username will be visible to partners you invite. Use only letters, numbers, and underscores.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  <Button variant="outline" onClick={handleBack} className="flex-1 order-2 sm:order-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleNext}
                    disabled={!username || usernameAvailable !== true}
                    className="flex-1 order-1 sm:order-2"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Connect Your Calendars
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Sync your existing calendars to avoid double-booking and streamline scheduling.
                    </p>
                    
                    <div className="space-y-3">
                      <div 
                        className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedCalendars.includes('google') 
                            ? 'border-blue-300 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleCalendarToggle('google')}
                      >
                        <Checkbox 
                          checked={selectedCalendars.includes('google')}
                          onChange={() => handleCalendarToggle('google')}
                          className="mr-3"
                        />
                        <Image 
                          src="/google-logo.svg" 
                          alt="Google" 
                          width={24} 
                          height={24} 
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">Google Calendar</div>
                          <div className="text-sm text-gray-600">Sync with your Google account</div>
                        </div>
                      </div>
                      
                      <div 
                        className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedCalendars.includes('apple') 
                            ? 'border-blue-300 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleCalendarToggle('apple')}
                      >
                        <Checkbox 
                          checked={selectedCalendars.includes('apple')}
                          onChange={() => handleCalendarToggle('apple')}
                          className="mr-3"
                        />
                        <Image 
                          src="/apple-logo.svg" 
                          alt="Apple" 
                          width={24} 
                          height={24} 
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">Apple Calendar</div>
                          <div className="text-sm text-gray-600">Sync with iCloud calendar</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-600">
                        <strong>Privacy Note:</strong> Calendar integration is optional. You can set this up later in settings if you prefer.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={handleBack} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button onClick={handleNext} className="flex-1">
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Email Preferences
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Stay informed about important updates and features. You can change these preferences anytime in settings.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3 p-3 border rounded-lg">
                        <Checkbox 
                          checked={emailConsent}
                          onCheckedChange={(checked) => setEmailConsent(!!checked)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">Email Communication *</div>
                          <div className="text-sm text-gray-600">
                            Allow PolyHarmony to send you important account and security updates. This is required for account management.
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-6 space-y-3">
                        <div className="flex items-start space-x-3">
                          <Checkbox 
                            checked={emailPreferences.updates}
                            onCheckedChange={(checked) => 
                              setEmailPreferences(prev => ({ ...prev, updates: !!checked }))
                            }
                            disabled={!emailConsent}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">Product Updates</div>
                            <div className="text-xs text-gray-600">
                              New features, improvements, and major changes
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <Checkbox 
                            checked={emailPreferences.notifications}
                            onCheckedChange={(checked) => 
                              setEmailPreferences(prev => ({ ...prev, notifications: !!checked }))
                            }
                            disabled={!emailConsent}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">Smart Notifications</div>
                            <div className="text-xs text-gray-600">
                              Calendar conflicts, partner invitations, and scheduling reminders
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3">
                          <Checkbox 
                            checked={emailPreferences.tips}
                            onCheckedChange={(checked) => 
                              setEmailPreferences(prev => ({ ...prev, tips: !!checked }))
                            }
                            disabled={!emailConsent}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">Tips & Best Practices</div>
                            <div className="text-xs text-gray-600">
                              Helpful tips for managing polyamorous relationships and scheduling
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={handleBack} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleNext}
                    disabled={!emailConsent}
                    className="flex-1"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">
                      Beta Testing Agreement
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Help us improve PolyHarmony by participating in our beta testing program. Your feedback shapes the future of the app.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">What Beta Testing Includes:</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Early access to new features</li>
                          <li>• Opportunity to provide feedback</li>
                          <li>• Helping improve the user experience</li>
                          <li>• Optional participation in user research</li>
                        </ul>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-start space-x-3 p-3 border rounded-lg">
                            <Checkbox
    checked={betaConsent}
    onCheckedChange={(checked) => setBetaConsent(!!checked)}
    className="mt-0.5"
  />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">Beta Testing Participation *</div>
                            <div className="text-sm text-gray-600">
                              I agree to participate in beta testing and provide feedback to help improve PolyHarmony.
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-start space-x-3 p-3 border rounded-lg">
                            <Checkbox 
    checked={dataCollectionConsent}
    onCheckedChange={(checked) => setDataCollectionConsent(!!checked)}
    className="mt-0.5"
  />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">Anonymous Usage Data *</div>
                            <div className="text-sm text-gray-600">
                              Allow collection of anonymous usage data (app crashes, feature usage, performance metrics) to help identify bugs and improve the app.
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">
                          <strong>Privacy Commitment:</strong> We never share personal information or relationship data. 
                          All feedback and usage data is anonymized and used solely for product improvement.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={handleBack} className="flex-1">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleNext}
                    disabled={!betaConsent || !dataCollectionConsent}
                    className="flex-1"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 5 && (
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

            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-gray-600 mb-6">
                    Perfect! Your PolyHarmony account is now set up with your preferences and first relationship. 
                    You can always add more partners and customize settings from your dashboard.
                  </p>
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">Setup Complete:</h4>
                    <ul className="text-sm text-gray-600 space-y-1 text-left">
                      <li>✓ Username: @{username}</li>
                      <li>✓ Email preferences configured</li>
                      <li>✓ Beta testing participation enabled</li>
                      {selectedCalendars.length > 0 && (
                        <li>✓ Calendar integration: {selectedCalendars.join(', ')}</li>
                      )}
                      <li>✓ First relationship added</li>
                    </ul>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-blue-900 mb-2">Next Steps:</h4>
                    <ul className="text-sm text-blue-800 space-y-1 text-left">
                      <li>• Explore the dashboard to see all features</li>
                      <li>• Create your first event or date</li>
                      <li>• Invite your partner to join the app</li>
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
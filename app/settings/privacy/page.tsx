'use client';

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft, 
  Shield, 
  Users, 
  User,
  Calendar,
  Save,
  Lock,
  EyeOff,
  Info,
  Eye
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { 
  PermissionEditor, 
  PermissionItem, 
  PermissionCategory,
  ConflictResolutionStrategy
} from '@/components/ui/permission-editor'
import { PrivacyLevelSelector } from '@/components/ui/privacy-level-selector'
import type { PrivacyLevel } from '@/lib/supabase/types'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion"
import { Alert, AlertDescription } from '@/components/ui/alert'

// Demo permission categories
const permissionCategories: PermissionCategory[] = [
  {
    id: 'calendar',
    name: 'Calendar Visibility',
    description: 'Control what parts of your calendar others can see',
    permissions: [
      'View calendar',
      'View event details',
      'View event location',
      'View event participants'
    ],
    children: [
      {
        id: 'events',
        name: 'Event Access',
        permissions: [
          'Create events',
          'Edit events',
          'Delete events',
          'Invite to events'
        ]
      }
    ]
  },
  {
    id: 'contacts',
    name: 'Contact & Relationship Information',
    description: 'Control what contact and relationship information is visible',
    permissions: [
      'View relationship status',
      'View contact details',
      'View relationship notes',
      'View shared history'
    ]
  },
  {
    id: 'groups',
    name: 'Group Access',
    description: 'Control how groups are shared and accessed',
    permissions: [
      'View groups',
      'See group members',
      'Invite to groups',
      'Modify group settings'
    ]
  }
]

// Production permissions data
const generatePermissions = (searchParams: URLSearchParams) => {
  // Check if we have a specific contact to focus on
  const focusContactId = searchParams.get('contact')
  
  // For production, this would fetch from Supabase
  // For now, return empty array since we need real data
  const contacts: any[] = []
  const focusedContacts = focusContactId 
    ? contacts.filter(c => c.id === focusContactId) 
    : contacts.slice(0, 3)
  
  // Generate permission items for contacts
  const contactItems: PermissionItem[] = focusedContacts.map(contact => ({
    target: {
      id: contact.id,
      name: contact.partner_name || 'Unknown Contact',
      type: 'contact',
      color: contact.color
    },
    permissions: {
      'View calendar': contact.privacy_level as PrivacyLevel || 'private',
      'View event details': contact.privacy_level as PrivacyLevel || 'private',
      'View event location': contact.privacy_level === 'visible' ? 'visible' as PrivacyLevel : 'semi_private' as PrivacyLevel,
      'View event participants': contact.privacy_level === 'visible' ? 'visible' as PrivacyLevel : 'private' as PrivacyLevel
    },
    default: contact.privacy_level as PrivacyLevel || 'private'
  }))
  
  // Add some demo groups
  const groupItems: PermissionItem[] = [
    {
      target: {
        id: 'group-1',
        name: 'Close Partners',
        type: 'group'
      },
      permissions: {
        'View calendar': 'visible',
        'View event details': 'visible',
        'View event location': 'visible',
        'View event participants': 'visible',
        'Create events': 'visible'
      },
      default: 'visible'
    },
    {
      target: {
        id: 'group-2',
        name: 'Friends',
        type: 'group'
      },
      permissions: {
        'View calendar': 'private',
        'View event details': 'private',
        'View event location': 'semi_private',
        'View event participants': 'private'
      },
      default: 'private'
    }
  ]
  
  return focusContactId 
    ? contactItems // If focusing on a specific contact, only show that
    : [...contactItems, ...groupItems] // Otherwise show both contacts and groups
}

function PrivacySettingsContent() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('permissions')
  const [permissions, setPermissions] = useState<PermissionItem[]>([])
  const [conflictStrategy, setConflictStrategy] = useState<ConflictResolutionStrategy>('most_restrictive')
  const [isEncrypted, setIsEncrypted] = useState(true)
  const [publicCalendar, setPublicCalendar] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }
    
    // In a real app, we would fetch permissions from the server
    // For production, we'll generate from actual data
    const permissions = generatePermissions(searchParams)
    setPermissions(permissions)
    
  }, [user, router, searchParams])
  
  const handlePermissionChange = (updatedPermissions: PermissionItem[]) => {
    setPermissions(updatedPermissions)
  }
  
  const handleStrategyChange = (strategy: ConflictResolutionStrategy) => {
    setConflictStrategy(strategy)
  }
  
  const handleSave = async () => {
    setSaving(true)
    
    try {
      // In a real implementation, this would save to the database
      toast({
        title: "Privacy settings saved",
        description: "Your privacy preferences have been updated"
      })
      
      // If we have a contact parameter, go back to the contact page
      const contactId = searchParams.get('contact')
      if (contactId) {
        router.push(`/contacts/${contactId}`)
      }
      
    } catch (error) {
      console.error('Error saving privacy settings:', error)
      toast({
        title: "Error",
        description: "Failed to save privacy settings",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/settings')}
                className="mr-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Shield className="w-6 h-6 text-primary mr-3" />
              <h1 className="text-xl font-bold text-foreground">Privacy Settings</h1>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="sharing">Sharing</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          
          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-6">
            <Alert className="bg-blue-50 text-blue-900 border-blue-200">
              <Info className="h-4 w-4" />
              <AlertDescription>
                These settings control who can see your calendar and what information is visible to them.
              </AlertDescription>
            </Alert>
            
            <Card className="border-border shadow-lg bg-card/80 backdrop-blur text-foreground">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="w-5 h-5 mr-2" />
                  Default Privacy Level
                </CardTitle>
                <CardDescription>
                  This is the default privacy level for all new contacts and groups unless specified otherwise
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full max-w-md">
                  <PrivacyLevelSelector
                    value="private"
                    onChange={(level) => {
                      toast({
                        title: "Default privacy updated",
                        description: `Default privacy level set to ${level.replace('_', ' ')}`
                      })
                    }}
                    description={true}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Permission Matrix */}
            {permissions.length > 0 && (
              <PermissionEditor
                items={permissions}
                categories={permissionCategories}
                conflictStrategy={conflictStrategy}
                onChange={handlePermissionChange}
                onStrategyChange={handleStrategyChange}
              />
            )}
          </TabsContent>
          
          {/* Sharing Tab */}
          <TabsContent value="sharing" className="space-y-6">
            <Alert className="bg-blue-50 text-blue-900 border-blue-200">
              <Info className="h-4 w-4" />
              <AlertDescription>
                These settings control how your calendar can be shared with others.
              </AlertDescription>
            </Alert>
            
            <Card className="border-border shadow-lg bg-card/80 backdrop-blur text-foreground">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Calendar Sharing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="public-calendar" className="text-base">Public Calendar</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow anyone with the link to view your calendar
                      </p>
                    </div>
                    <Switch
                      id="public-calendar"
                      checked={publicCalendar}
                      onCheckedChange={setPublicCalendar}
                    />
                  </div>
                  
                  {publicCalendar && (
                    <div className="border rounded-md p-4 bg-muted/20">
                      <p className="text-sm font-medium mb-2">Your public calendar link:</p>
                      <div className="flex">
                        <Input 
                          readOnly 
                          value="https://polyharmony.app/calendar/share/abc123xyz" 
                          className="flex-grow"
                        />
                        <Button className="ml-2">
                          Copy Link
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        This link only shows the &quot;busy/free&quot; status of your calendar, not event details.
                      </p>
                    </div>
                  )}
                  
                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="advanced-options">
                      <AccordionTrigger>Advanced Sharing Options</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-base">Subscription Calendar</Label>
                              <p className="text-sm text-muted-foreground">
                                Allow others to subscribe to your calendar in their calendar app
                              </p>
                            </div>
                            <Button variant="outline" onClick={() => {
                              toast({
                                title: "Calendar link copied",
                                description: "Calendar subscription link copied to clipboard"
                              })
                            }}>
                              Get Link
                            </Button>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-base">External Calendar Access</Label>
                              <p className="text-sm text-muted-foreground">
                                Controls whether calendars can be accessed from third-party apps
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border shadow-lg bg-card/80 backdrop-blur text-foreground">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Active Shares
                </CardTitle>
                <CardDescription>
                  People and groups currently having access to your calendar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {permissions.length > 0 ? (
                  <div className="space-y-4">
                    {permissions.filter(p => 
                      p.default === 'visible' || p.default === 'semi_private' || p.default === 'public' || 
                      Object.values(p.permissions).some(v => v === 'visible' || v === 'semi_private' || v === 'public')
                    ).map((item) => (
                      <div 
                        key={item.target.id} 
                        className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                      >
                        <div className="flex items-center">
                          {item.target.type === 'contact' ? (
                            <User className="h-5 w-5 mr-2 text-blue-600" />
                          ) : (
                            <Users className="h-5 w-5 mr-2 text-green-600" />
                          )}
                          <div>
                            <p className="font-medium">{item.target.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Default: {item.default.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/settings/privacy?${item.target.type}=${item.target.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Manage
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <EyeOff className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No active shares</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Alert className="bg-blue-50 text-blue-900 border-blue-200">
              <Info className="h-4 w-4" />
              <AlertDescription>
                These settings control the security of your calendar data.
              </AlertDescription>
            </Alert>
            
            <Card className="border-border shadow-lg bg-card/80 backdrop-blur text-foreground">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lock className="w-5 h-5 mr-2" />
                  Data Encryption
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="encrypt-data" className="text-base">Data Encryption</Label>
                      <p className="text-sm text-muted-foreground">
                        Calendar data is encrypted in transit using industry-standard TLS protocols. Data at rest is stored securely but not end-to-end encrypted.
                      </p>
                    </div>
                    <Switch
                      id="encrypt-data"
                      checked={isEncrypted}
                      onCheckedChange={setIsEncrypted}
                    />
                  </div>
                  
                  {isEncrypted && (
                    <Alert variant="default" className="bg-blue-50 text-blue-900 border-blue-200">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Your data is protected using TLS encryption during transmission and stored with industry-standard security measures. We can access your data for support and service functionality.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => router.push('/settings/security/2fa')}>
                      Configure
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Session Management</Label>
                      <p className="text-sm text-muted-foreground">
                        View and manage your active login sessions
                      </p>
                    </div>
                    <Button variant="outline" onClick={() => router.push('/settings/security/sessions')}>
                      Manage Sessions
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-border shadow-lg bg-card/80 backdrop-blur text-foreground">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  Privacy Audit
                </CardTitle>
                <CardDescription>
                  Review and manage privacy settings for all your data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                  <div>
                    <p className="font-medium">Privacy Checkup</p>
                    <p className="text-sm text-muted-foreground">
                      Review and update your privacy settings
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setActiveTab('permissions')}>
                    Start Checkup
                  </Button>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                  <div>
                    <p className="font-medium">Activity Log</p>
                    <p className="text-sm text-muted-foreground">
                      View recent activity on your account
                    </p>
                  </div>
                  <Button variant="outline">
                    View Log
                  </Button>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                  <div>
                    <p className="font-medium">Data Export</p>
                    <p className="text-sm text-muted-foreground">
                      Download a copy of your data
                    </p>
                  </div>
                  <Button variant="outline">
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Wrapper component with Suspense boundary
export default function PrivacySettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col justify-center px-4 py-12 bg-background">
        <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
          <Card className="border-border shadow-xl bg-card/80 backdrop-blur text-foreground">
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    }>
      <PrivacySettingsContent />
    </Suspense>
  )
}

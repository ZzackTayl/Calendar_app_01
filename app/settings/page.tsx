'use client';

import { useState, useMemo, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Settings, User, Shield, Bell, Palette, Download, Trash2, LogOut, Users, Globe, Clock, Calendar as CalendarIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
} from '@/components/ui/alert-dialog'

export default function SettingsPage() {
  const { user, signOut, demoMode, demo } = useAuth()
  const supabase = useMemo(() => createSupabaseClient(), [])
  const router = useRouter()
  const [exporting, setExporting] = useState(false)
  const { toast } = useToast()

  // Simple persisted preferences
  const [prefEventReminders, setPrefEventReminders] = useState<boolean>(false)
  const [prefRelationshipUpdates, setPrefRelationshipUpdates] = useState<boolean>(false)
  const [prefDarkMode, setPrefDarkMode] = useState<boolean>(false)
  const [prefColorTheme, setPrefColorTheme] = useState<'default' | 'ocean' | 'sunset'>('default')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const data = JSON.parse(localStorage.getItem('ph_prefs') || '{}')
    if (typeof data.eventReminders === 'boolean') setPrefEventReminders(data.eventReminders)
    if (typeof data.relationshipUpdates === 'boolean') setPrefRelationshipUpdates(data.relationshipUpdates)
    if (typeof data.darkMode === 'boolean') setPrefDarkMode(data.darkMode)
    if (typeof data.colorTheme === 'string') setPrefColorTheme(data.colorTheme)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem('ph_prefs', JSON.stringify({
      eventReminders: prefEventReminders,
      relationshipUpdates: prefRelationshipUpdates,
      darkMode: prefDarkMode,
      colorTheme: prefColorTheme,
    }))
    const root = document.documentElement
    if (prefDarkMode) root.classList.add('dark')
    else root.classList.remove('dark')
  }, [prefEventReminders, prefRelationshipUpdates, prefDarkMode, prefColorTheme])

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const handleExportData = async () => {
    if (!user) return
    setExporting(true)
    try {
      const [relationshipsRes, eventsRes] = await Promise.all([
        supabase.from('relationships').select('*').eq('user_id', user.id),
        supabase.from('events').select('*').eq('owner_id', user.id),
      ])
      const payload = {
        exportedAt: new Date().toISOString(),
        userId: user.id,
        relationships: relationshipsRes.data || [],
        events: eventsRes.data || [],
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `polyharmony-export-${new Date().toISOString().slice(0,10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = () => {
    setShowDelete(true)
  }

  const [showDelete, setShowDelete] = useState(false)
  const [showAppleAuth, setShowAppleAuth] = useState(false)
  const [appleId, setAppleId] = useState('')
  const [appSpecificPassword, setAppSpecificPassword] = useState('')

  const handleAppleAuth = async () => {
    try {
      const res = await fetch('/api/auth/apple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ appleId, appSpecificPassword }),
      })
      if (!res.ok) throw new Error('Request failed')
      toast({ title: 'Successfully connected to Apple Calendar' })
      setShowAppleAuth(false)
    } catch (e) {
      toast({ title: 'Unable to connect to Apple Calendar', description: 'Please check your credentials and try again.', variant: 'destructive' })
    }
  }

  const confirmDelete = async () => {
    try {
      if (demoMode) {
        DemoStore.reset()
        toast({ title: 'Account deleted (demo)', description: 'Local demo data cleared.' })
        await signOut()
        router.push('/')
        return
      }
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) throw new Error('Request failed')
      toast({ title: 'Deletion requested', description: 'We will process your request shortly.' })
      await signOut()
      router.push('/')
    } catch (e) {
      toast({ title: 'Unable to delete', description: 'Please try again later or contact support.', variant: 'destructive' })
    } finally {
      setShowDelete(false)
    }
  }

  const handleCreateSampleGroup = () => {
    if (!demoMode || !user) return
    const uid = user.id
    // Create a sample group and add available relationships
    const group = DemoStore.createGroup({ user_id: uid, group_name: 'Sample Group', description: 'Demo-only sample group', created_at: '' as any, updated_at: '' as any } as any)
    const rels = DemoStore.listRelationships(uid)
    rels.slice(0, 2).forEach((r) => {
      DemoStore.addGroupMember(group.id, r.id, 'full_access')
    })
    toast({ title: 'Sample group created', description: 'Added first two relationships to the group.' })
    router.push(`/groups/${group.id}/members`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur border-b border-border sticky top-0 z-40">
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
            <Settings className="w-6 h-6 text-primary mr-3" />
            <h1 className="text-xl font-bold text-foreground">Settings</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Profile Settings */}
        <Card className="border-border shadow-lg bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Profile Settings
            </CardTitle>
            <CardDescription>
              Manage your personal information and account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Full Name
              </label>
              <Input
                value={user?.user_metadata?.full_name || ''}
                placeholder="Enter your full name"
                disabled
              />
              <p className="text-xs text-muted-foreground mt-1">
                Contact support to change your name
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email Address
              </label>
              <Input
                value={user?.email || ''}
                placeholder="Enter your email"
                disabled
              />
              <p className="text-xs text-muted-foreground mt-1">
                Contact support to change your email
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card className="border-border shadow-lg bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Privacy & Security
            </CardTitle>
            <CardDescription>
              Control your privacy settings and security preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your data is encrypted end-to-end. PolyHarmony cannot access your personal information or calendar events.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-border shadow-lg bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notifications
            </CardTitle>
            <CardDescription>
              Manage how you receive updates and alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Event Reminders</p>
                  <p className="text-sm text-muted-foreground">Get notified about upcoming events</p>
                </div>
                <Button variant={prefEventReminders ? 'secondary' : 'outline'} onClick={() => setPrefEventReminders(v => !v)}>
                  {prefEventReminders ? 'On' : 'Off'}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Relationship Updates</p>
                  <p className="text-sm text-muted-foreground">Notifications when partners update shared events</p>
                </div>
                <Button variant={prefRelationshipUpdates ? 'secondary' : 'outline'} onClick={() => setPrefRelationshipUpdates(v => !v)}>
                  {prefRelationshipUpdates ? 'On' : 'Off'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="border-border shadow-lg bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="w-5 h-5 mr-2" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize the look and feel of your app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">Switch between light and dark themes</p>
                </div>
                <Button variant={prefDarkMode ? 'secondary' : 'outline'} onClick={() => setPrefDarkMode(v => !v)}>
                  {prefDarkMode ? 'On' : 'Off'}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Color Themes</p>
                  <p className="text-sm text-muted-foreground">Choose your preferred color palette</p>
                </div>
                <div className="flex gap-2">
                  {(['default','ocean','sunset'] as const).map(opt => (
                    <Button key={opt} variant={prefColorTheme===opt?'secondary':'outline'} size="sm" onClick={() => setPrefColorTheme(opt)} className="capitalize">
                      {opt}
                    </Button>
                  ))}
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={() => router.push('/settings/time-zone')}
                className="w-full justify-start mt-2"
              >
                <Globe className="w-4 h-4 mr-2" />
                Time Zone Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card className="border-border shadow-lg bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Download className="w-5 h-5 mr-2" />
              Data & Privacy
            </CardTitle>
            <CardDescription>
              Export your data or manage your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              onClick={handleExportData}
              className="w-full justify-start"
              disabled={exporting}
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export My Data'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Download all your calendar events and relationships as JSON
            </p>

            {demoMode && (
              <div className="pt-2 space-y-2">
                <div className="text-xs text-muted-foreground">Demo data</div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" className="flex-1" onClick={() => demo.seed()}>Load Sample Data</Button>
                  <Button variant="outline" className="flex-1" onClick={() => demo.reset()}>Reset Demo Data</Button>
                  <Button variant="outline" className="flex-1" onClick={handleCreateSampleGroup}>
                    <Users className="w-4 h-4 mr-2" /> Create Sample Group
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">These actions only affect local demo storage.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar Integrations */}
        <Card className="border-border shadow-lg bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarIcon className="w-5 h-5 mr-2" />
              Calendar Integrations
            </CardTitle>
            <CardDescription>
              Connect your external calendars to PolyHarmony
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              onClick={() => router.push('/api/auth/google')}
              className="w-full justify-start"
            >
              <img src="/google-logo.svg" alt="Google Logo" className="w-4 h-4 mr-2" />
              Connect to Google Calendar
            </Button>
            <AlertDialog open={showAppleAuth} onOpenChange={setShowAppleAuth}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowAppleAuth(true)}
                >
                  <img src="/apple-logo.svg" alt="Apple Logo" className="w-4 h-4 mr-2" />
                  Connect to Apple Calendar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Connect to Apple Calendar</AlertDialogTitle>
                  <AlertDialogDescription>
                    Enter your Apple ID and an app-specific password to connect your Apple Calendar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Apple ID
                    </label>
                    <Input placeholder="example@icloud.com" value={appleId} onChange={(e) => setAppleId(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      App-Specific Password
                    </label>
                    <Input type="password" placeholder="xxxx-xxxx-xxxx-xxxx" value={appSpecificPassword} onChange={(e) => setAppSpecificPassword(e.target.value)} />
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleAppleAuth}>Connect</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-border shadow-lg bg-card/80 backdrop-blur border-red-500/20">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <Trash2 className="w-5 h-5 mr-2" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions for your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="w-full justify-start"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                className="w-full justify-start"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Account
              </Button>
              <p className="text-xs text-muted-foreground">
                This will permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
          </CardContent>
        </Card>
        <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your account and all associated data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
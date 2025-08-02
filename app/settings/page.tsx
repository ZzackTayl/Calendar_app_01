'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Settings, User, Shield, Bell, Palette, Download, Trash2, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const handleExportData = () => {
    // Placeholder for data export functionality
    alert('Data export functionality will be available soon')
  }

  const handleDeleteAccount = () => {
    // Placeholder for account deletion
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      alert('Account deletion functionality will be available soon')
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
            <Settings className="w-6 h-6 text-primary mr-3" />
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Profile Settings */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <Input
                value={user?.user_metadata?.full_name || ''}
                placeholder="Enter your full name"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">
                Contact support to change your name
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <Input
                value={user?.email || ''}
                placeholder="Enter your email"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">
                Contact support to change your email
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Privacy & Security */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
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
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-600">Add an extra layer of security</p>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Backup Codes</p>
                  <p className="text-sm text-gray-600">Generate recovery codes</p>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
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
                  <p className="text-sm text-gray-600">Get notified about upcoming events</p>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Relationship Updates</p>
                  <p className="text-sm text-gray-600">Notifications when partners update shared events</p>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
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
                  <p className="text-sm text-gray-600">Switch between light and dark themes</p>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Color Themes</p>
                  <p className="text-sm text-gray-600">Choose your preferred color palette</p>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
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
            >
              <Download className="w-4 h-4 mr-2" />
              Export My Data
            </Button>
            <p className="text-xs text-gray-500">
              Download all your calendar events, relationships, and profile data
            </p>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur border-red-200">
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
              <p className="text-xs text-gray-500">
                This will permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
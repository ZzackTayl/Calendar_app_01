'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from 'next-themes';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/alert-dialog';
import {
  User, 
  Shield, 
  Bell, 
  Palette, 
  Globe, 
  Smartphone, 
  LogOut, 
  Trash2,
  Settings as SettingsIcon,
  ArrowLeft,
  AlertTriangle,
  Calendar,
  Plus,
  Check,
  ExternalLink
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface CalendarIntegration {
  id: string;
  provider: 'google' | 'apple' | 'outlook';
  accountEmail: string;
  calendarName: string;
  isActive: boolean;
  lastSyncAt?: string;
  syncError?: string;
}

export default function Settings() {
  const { user, signOut, demoMode } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [calendarIntegrations, setCalendarIntegrations] = useState<CalendarIntegration[]>([]);
  const [integrationLoading, setIntegrationLoading] = useState<string | null>(null);

  // Fetch calendar integrations on component mount
  const fetchCalendarIntegrations = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/oauth/setup');
      if (response.ok) {
        const data = await response.json();
        // Transform the data to match our interface
        const integrations: CalendarIntegration[] = [];
        
        if (data.data?.setup_status?.google_calendar_setup_completed) {
          integrations.push({
            id: 'google-1',
            provider: 'google',
            accountEmail: user?.email || '',
            calendarName: 'Google Calendar',
            isActive: true,
            lastSyncAt: data.data.setup_status.google_calendar_setup_completed_at
          });
        }
        
        if (data.data?.setup_status?.apple_calendar_setup_completed) {
          integrations.push({
            id: 'apple-1',
            provider: 'apple',
            accountEmail: user?.email || '',
            calendarName: 'Apple Calendar',
            isActive: true,
            lastSyncAt: data.data.setup_status.apple_calendar_setup_completed_at
          });
        }
        
        setCalendarIntegrations(integrations);
      }
    } catch (error) {
      console.error('Error fetching calendar integrations:', error);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchCalendarIntegrations();
  }, [fetchCalendarIntegrations]);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE_MY_ACCOUNT') {
      setDeleteError('Please type "DELETE_MY_ACCOUNT" to confirm deletion');
      return;
    }

    if (!deletePassword.trim()) {
      setDeleteError('Please enter your password to confirm account deletion');
      return;
    }

    setLoading(true);
    setDeleteError('');

    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmation: deleteConfirmation,
          password: deletePassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Account deleted successfully
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      setDeleteError(error instanceof Error ? error.message : 'Failed to delete account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetDeleteForm = () => {
    setDeletePassword('');
    setDeleteConfirmation('');
    setDeleteError('');
    setShowDeleteDialog(false);
  };

  const handleAddCalendarIntegration = async (provider: 'google' | 'apple' | 'outlook') => {
    setIntegrationLoading(provider);
    try {
      const response = await fetch('/api/calendar/oauth/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider,
          action: 'initialize',
        }),
      });

      const data = await response.json();

      if (response.ok && data.oauth_url) {
        // Redirect to OAuth URL
        window.location.href = data.oauth_url;
      } else {
        throw new Error(data.error || 'Failed to initialize calendar integration');
      }
    } catch (error) {
      console.error(`Error adding ${provider} calendar:`, error);
    } finally {
      setIntegrationLoading(null);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return '/google-logo.svg';
      case 'apple':
        return '/apple-logo.svg';
      case 'outlook':
        return '/outlook-logo.svg';
      default:
        return '/calendar-icon.svg';
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'google':
        return 'Google Calendar';
      case 'apple':
        return 'Apple Calendar';
      case 'outlook':
        return 'Outlook Calendar';
      default:
        return 'Calendar';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="p-2"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-3">
                <SettingsIcon className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold">Settings</h1>
              </div>
            </div>
            {demoMode && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Demo Mode
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Profile Section */}
        <section className="mb-8" aria-labelledby="profile-heading">
          <h2 id="profile-heading" className="text-lg font-semibold mb-4">Profile</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Account Information
              </CardTitle>
              <CardDescription>
                Manage your account settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{user?.email || 'User'}</p>
                  <p className="text-sm text-muted-foreground">
                    {demoMode ? 'Demo Account' : 'Account'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Calendar Integrations Section */}
        <section className="mb-8" aria-labelledby="calendar-integrations-heading">
          <h2 id="calendar-integrations-heading" className="text-lg font-semibold mb-4">Calendar Integrations</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Connected Calendars
              </CardTitle>
              <CardDescription>
                Sync data from multiple calendars to avoid double-booking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {calendarIntegrations.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No calendars connected yet. Connect your calendars to sync events and avoid conflicts.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {calendarIntegrations.map((integration) => (
                    <div key={integration.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{integration.calendarName}</p>
                          <p className="text-sm text-muted-foreground">{integration.accountEmail}</p>
                          {integration.lastSyncAt && (
                            <p className="text-xs text-muted-foreground">
                              Last synced: {new Date(integration.lastSyncAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={integration.isActive ? "default" : "secondary"}>
                          {integration.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <Separator />
              
              <div className="space-y-3">
                <h4 className="font-medium">Add Calendar</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                    onClick={() => handleAddCalendarIntegration('google')}
                    disabled={integrationLoading === 'google'}
                  >
                    <Image 
                      src="/google-logo.svg" 
                      alt="Google" 
                      width={24} 
                      height={24} 
                    />
                    <span className="text-sm">Google Calendar</span>
                    {integrationLoading === 'google' && (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                    onClick={() => handleAddCalendarIntegration('apple')}
                    disabled={integrationLoading === 'apple'}
                  >
                    <Image 
                      src="/apple-logo.svg" 
                      alt="Apple" 
                      width={24} 
                      height={24} 
                    />
                    <span className="text-sm">Apple Calendar</span>
                    {integrationLoading === 'apple' && (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                    onClick={() => handleAddCalendarIntegration('outlook')}
                    disabled={integrationLoading === 'outlook'}
                  >
                    <Image 
                      src="/outlook-logo.svg" 
                      alt="Outlook" 
                      width={24} 
                      height={24} 
                    />
                    <span className="text-sm">Outlook Calendar</span>
                    {integrationLoading === 'outlook' && (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Connect multiple calendars to sync events and avoid scheduling conflicts. 
                  You can connect work and personal calendars from different providers.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Preferences Section */}
        <section className="mb-8" aria-labelledby="preferences-heading">
          <h2 id="preferences-heading" className="text-lg font-semibold mb-4">Preferences</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="h-5 w-5 mr-2" />
                App Preferences
              </CardTitle>
              <CardDescription>
                Customize your app experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications for events and updates
                  </p>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                  aria-label="Toggle notifications"
                />
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="space-y-0.5">
                  <Label className="text-base">Theme Preference</Label>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred app appearance
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('light')}
                    className="w-full"
                    aria-pressed={theme === 'light'}
                  >
                    Light
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('dark')}
                    className="w-full"
                    aria-pressed={theme === 'dark'}
                  >
                    Dark
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Current theme: <span className="font-medium capitalize">{theme || 'light'}</span>
                </p>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto Sync</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync calendar data
                  </p>
                </div>
                <Switch
                  checked={autoSync}
                  onCheckedChange={setAutoSync}
                  aria-label="Toggle auto sync"
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Account Actions Section - Moved Sign Out here */}
        <section className="mb-8" aria-labelledby="account-actions-heading">
          <h2 id="account-actions-heading" className="text-lg font-semibold mb-4">Account Actions</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Account Management
              </CardTitle>
              <CardDescription>
                Manage your account and session
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start" 
                onClick={handleSignOut}
                disabled={loading}
                aria-label="Sign out of account"
              >
                <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Danger Zone Section - Delete Account at bottom */}
        <section className="mb-8" aria-labelledby="danger-zone-heading">
          <h2 id="danger-zone-heading" className="text-lg font-semibold mb-4 text-destructive">Danger Zone</h2>
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Permanent Actions
              </CardTitle>
              <CardDescription className="text-destructive/80">
                These actions cannot be undone
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full justify-start" 
                    disabled={loading}
                    aria-label="Delete account permanently"
                  >
                    <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-[425px]">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center text-destructive">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Delete Account
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                      <p>
                        This action will permanently delete your account and all associated data including:
                      </p>
                      <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                        <li>All your calendar events</li>
                        <li>Contact information</li>
                        <li>Relationship data</li>
                        <li>Calendar integrations</li>
                        <li>Account settings and preferences</li>
                      </ul>
                      <p className="font-medium text-destructive">
                        This action cannot be undone.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="delete-confirmation">
                        Type &quot;DELETE_MY_ACCOUNT&quot; to confirm
                      </Label>
                      <Input
                        id="delete-confirmation"
                        type="text"
                        placeholder="DELETE_MY_ACCOUNT"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="delete-password">
                        Enter your password
                      </Label>
                      <Input
                        id="delete-password"
                        type="password"
                        placeholder="Your password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                      />
                    </div>
                    
                    {deleteError && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                        <p className="text-sm text-destructive">{deleteError}</p>
                      </div>
                    )}
                  </div>
                  
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={resetDeleteForm}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAccount}
                      disabled={loading || deleteConfirmation !== 'DELETE_MY_ACCOUNT' || !deletePassword.trim()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {loading ? 'Deleting...' : 'Delete Account'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="text-center py-6 text-sm text-muted-foreground">
          <p>PolyHarmony v1.0.0</p>
          <p className="mt-1">Privacy-first calendar for polyamorous relationships</p>
        </footer>
      </div>
    </div>
  );
}
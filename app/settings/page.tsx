'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
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
  ArrowLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Settings() {
  const { user, signOut, demoMode } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [autoSync, setAutoSync] = useState(true);

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
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase.auth.admin.deleteUser(user?.id || '');
      
      if (error) {
        throw error;
      }
      
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mobile-container mobile-padding">
      {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="p-2"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="mobile-heading font-bold">Settings</h1>
              <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
            </div>
          </div>
          <SettingsIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        </div>

        {/* Account Section */}
        <section className="mb-8" aria-labelledby="account-heading">
          <h2 id="account-heading" className="text-lg font-semibold mb-4">Account</h2>
          <Card className="mobile-card">
          <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" aria-hidden="true" />
                <span>Profile Information</span>
            </CardTitle>
            <CardDescription>
                Your account details and authentication methods
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{user?.email || 'Demo User'}</p>
                  <p className="text-sm text-muted-foreground">
                    {demoMode ? 'Demo Mode' : 'Active Account'}
              </p>
            </div>
                <Badge variant={demoMode ? 'secondary' : 'default'}>
                  {demoMode ? 'Demo' : 'Active'}
                </Badge>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <h3 className="font-medium">Connected Accounts</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <Image src="/google-logo.svg" alt="Google Logo" width={16} height={16} className="mr-2" />
                      <span className="text-sm">Google</span>
                    </div>
                    <Badge variant="outline">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <Image src="/apple-logo.svg" alt="Apple Logo" width={16} height={16} className="mr-2" />
                      <span className="text-sm">Apple</span>
                    </div>
                    <Badge variant="outline">Connected</Badge>
                  </div>
                </div>
            </div>
          </CardContent>
        </Card>
        </section>

        {/* Privacy & Security Section */}
        <section className="mb-8" aria-labelledby="privacy-heading">
          <h2 id="privacy-heading" className="text-lg font-semibold mb-4">Privacy & Security</h2>
          <Card className="mobile-card">
          <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" aria-hidden="true" />
                <span>Privacy Settings</span>
            </CardTitle>
            <CardDescription>
                Control your data privacy and security preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Data Encryption</p>
                  <p className="text-sm text-muted-foreground">End-to-end encryption enabled</p>
                </div>
                <Badge variant="default">Active</Badge>
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                </div>
                <Switch />
              </div>
              
              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Activity Log</p>
                  <p className="text-sm text-muted-foreground">Track account activity</p>
                </div>
                <Button variant="outline" size="sm">
                  View Log
                </Button>
            </div>
          </CardContent>
        </Card>
        </section>

        {/* Notifications Section */}
        <section className="mb-8" aria-labelledby="notifications-heading">
          <h2 id="notifications-heading" className="text-lg font-semibold mb-4">Notifications</h2>
          <Card className="mobile-card">
          <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" aria-hidden="true" />
                <span>Notification Preferences</span>
            </CardTitle>
            <CardDescription>
                Choose how and when you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive notifications on your device</p>
                </div>
                <Switch 
                  checked={notifications} 
                  onCheckedChange={setNotifications}
                  aria-label="Toggle push notifications"
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Event Reminders</p>
                  <p className="text-sm text-muted-foreground">Get reminded before events</p>
                </div>
                <Switch defaultChecked />
              </div>
          </CardContent>
        </Card>
        </section>

        {/* Appearance Section */}
        <section className="mb-8" aria-labelledby="appearance-heading">
          <h2 id="appearance-heading" className="text-lg font-semibold mb-4">Appearance</h2>
          <Card className="mobile-card">
          <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="h-5 w-5" aria-hidden="true" />
                <span>Display Settings</span>
            </CardTitle>
            <CardDescription>
                Customize the app&apos;s appearance and theme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                  <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">Use dark theme</p>
                </div>
                <Switch 
                  checked={darkMode} 
                  onCheckedChange={setDarkMode}
                  aria-label="Toggle dark mode"
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
              <div>
                  <p className="font-medium">Auto-Sync</p>
                  <p className="text-sm text-muted-foreground">Automatically sync calendar data</p>
              </div>
                <Switch 
                  checked={autoSync} 
                  onCheckedChange={setAutoSync}
                  aria-label="Toggle auto-sync"
                />
            </div>
          </CardContent>
        </Card>
        </section>

        {/* Actions Section */}
        <section className="mb-8" aria-labelledby="actions-heading">
          <h2 id="actions-heading" className="text-lg font-semibold mb-4">Actions</h2>
            <div className="space-y-3">
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
            
              <Button
                variant="destructive"
              className="w-full justify-start" 
                onClick={handleDeleteAccount}
              disabled={loading}
              aria-label="Delete account permanently"
              >
              <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                Delete Account
              </Button>
            </div>
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
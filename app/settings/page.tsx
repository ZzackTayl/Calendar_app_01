'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
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
  AlertTriangle
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleteError, setDeleteError] = useState('');

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
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Use dark theme for the app
                  </p>
                </div>
                <Switch
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                  aria-label="Toggle dark mode"
                />
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

        {/* Actions Section */}
        <section className="mb-8" aria-labelledby="actions-heading">
          <h2 id="actions-heading" className="text-lg font-semibold mb-4">Actions</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Account Actions
              </CardTitle>
              <CardDescription>
                Manage your account and data
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
                        Type "DELETE_MY_ACCOUNT" to confirm
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
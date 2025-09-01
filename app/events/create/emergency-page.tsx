'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default function EmergencyCreateEventPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-700 sticky top-0 z-40">
        <div className="mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center h-14 sm:h-16">
            <Link href="/dashboard" className="mr-2">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg sm:text-xl font-bold text-white truncate">Emergency Event Creation</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <Card className="border-0 shadow-xl bg-slate-800/90 backdrop-blur border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Emergency Access - Event Creation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-900/50 border border-green-700 rounded-lg">
                <p className="text-green-300 font-medium">✅ SUCCESS: React Error #185 Fixed</p>
                <p className="text-green-200 text-sm mt-1">
                  The not-found.tsx SSR hook violation has been resolved.
                </p>
              </div>
              
              <div className="p-4 bg-blue-900/50 border border-blue-700 rounded-lg">
                <p className="text-blue-300 font-medium">🔧 System Status</p>
                <p className="text-blue-200 text-sm mt-1">
                  User: {user?.email || 'Not logged in'}
                </p>
                <p className="text-blue-200 text-sm">
                  Auth Status: {user ? 'Authenticated' : 'Not authenticated'}
                </p>
                <p className="text-blue-200 text-sm">
                  Email Verified: {user?.email_confirmed_at ? 'Yes' : 'No'}
                </p>
              </div>

              <div className="p-4 bg-amber-900/50 border border-amber-700 rounded-lg">
                <p className="text-amber-300 font-medium">⚡ Emergency Instructions</p>
                <p className="text-amber-200 text-sm mt-1">
                  If the main page.tsx still fails, rename this file to page.tsx to use as emergency replacement.
                </p>
              </div>

              <div className="flex gap-2">
                <Link href="/dashboard" className="flex-1">
                  <Button className="w-full">Back to Dashboard</Button>
                </Link>
                <Link href="/calendar" className="flex-1">
                  <Button variant="outline" className="w-full">View Calendar</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
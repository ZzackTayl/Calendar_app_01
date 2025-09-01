'use client';

import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function CreateEventPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="mr-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg sm:text-xl font-bold text-white truncate">Create Event</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <Card className="border-0 shadow-xl bg-slate-800/90 backdrop-blur border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Create New Event - SIMPLIFIED TEST</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-white">
                🎉 SUCCESS! The middleware bypass is working!
              </p>
              <p className="text-gray-300">
                User: {user?.email || 'Not logged in'}
              </p>
              <p className="text-gray-300">
                This simplified page loaded without React errors.
              </p>
              <p className="text-gray-300">
                The issue is likely with one of the complex lazy-loaded components in the full page.
              </p>
              <Button onClick={() => router.push('/dashboard')}>
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
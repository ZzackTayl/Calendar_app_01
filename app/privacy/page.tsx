'use client';

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PrivacyPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card/80 backdrop-blur border-b border-border sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="mr-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Shield className="w-6 h-6 text-primary mr-3" />
            <h1 className="text-xl font-bold">Privacy Policy</h1>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Your privacy matters</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert">
            <p>PolyHarmony is designed with privacy at its core. We only process the minimum data required to run the app. Your event details are under your control.</p>
            <ul>
              <li>You decide what each partner or group can see.</li>
              <li>We do not sell your data.</li>
              <li>Export or delete your data any time from Settings.</li>
            </ul>
            <p>For any privacy questions, contact support.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

'use client';

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, FileText } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function TermsPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card/80 backdrop-blur border-b border-border sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="mr-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <FileText className="w-6 h-6 text-primary mr-3" />
            <h1 className="text-xl font-bold">Terms of Service</h1>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Simple terms</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert">
            <p>By using PolyHarmony, you agree to use the service responsibly and in compliance with applicable laws. We provide the app as-is without warranties.</p>
            <ul>
              <li>Do not abuse or attempt to disrupt the service.</li>
              <li>You are responsible for the data you enter.</li>
              <li>We may update features and terms over time.</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

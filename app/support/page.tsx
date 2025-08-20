'use client';

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, LifeBuoy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SupportPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card/80 backdrop-blur border-b border-border sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')} className="mr-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <LifeBuoy className="w-6 h-6 text-primary mr-3" />
            <h1 className="text-xl font-bold">Support</h1>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>How to get help</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert">
            <p>
              For help, please email <Link href="mailto:support@polyharmony.app">support@polyharmony.app</Link> or open an issue on our tracker. We usually respond within 2 business days.
            </p>
            <div className="mt-4">
              <Button onClick={() => (window.location.href = 'mailto:support@polyharmony.app')}>Email Support</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

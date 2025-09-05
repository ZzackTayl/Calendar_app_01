'use client'

import { useAuth } from '@/lib/auth-context'
import { ContactForm } from '@/components/ui/contact-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft, UserPlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function CreateContactPage() {
  const { user } = useAuth()
  const demoMode = false
  const router = useRouter()
  
  useEffect(() => {
    if (!user && !demoMode) {
      router.push('/auth/signin')
    }
  }, [user, router, demoMode])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur border-b border-border sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="mr-2 text-foreground hover:bg-accent"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <UserPlus className="w-5 h-5 text-primary mr-3" />
            <h1 className="text-xl font-bold text-foreground">Create New Contact</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card/80 backdrop-blur shadow-lg rounded-lg p-6 text-foreground">
          <ContactForm onSuccess={() => router.push('/contacts')} />
        </div>
      </div>
    </div>
  )
}

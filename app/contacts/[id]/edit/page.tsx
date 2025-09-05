'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { ContactForm } from '@/components/ui/contact-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ContactFormData {
  id: string;
  partner_name: string;
  partner_email?: string;
  phone?: string;
  address?: string;
  birthday?: Date;
  start_date?: Date;
  color?: string;
  notes?: string;
  tags?: string[];
  contact_frequency?: string;
  last_contact?: string;
}

export default function EditContactPage({ params }: { params: { id: string } }) {
  const [contact, setContact] = useState<ContactFormData | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const demoMode = false
  const router = useRouter()
  const supabase = createSupabaseClient()
  
  useEffect(() => {
    if (!user && !demoMode) {
      router.push('/auth/signin')
      return
    }
    
    fetchContact()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, demoMode, params.id])
  
  const fetchContact = async () => {
    try {
      if (demoMode) {
        // Fetch from demo store (disabled)
        // const relationship = DemoStore.getRelationship(params.id)
        // if (!relationship) {
        //   router.push('/contacts')
        //   return
        // }

        // // Add demo data
        // const enhancedContact: ContactFormData = {
        //   id: relationship.id,
        //   partner_name: relationship.partner_name || 'Unknown Contact',
        //   partner_email: relationship.partner_email,
        //   phone: '+1 555-123-4567',
        //   address: '123 Poly Lane, Relationship City, RC 12345',
        //   birthday: relationship.start_date ? new Date(relationship.start_date) : undefined,
        //   contact_frequency: 'frequent',
        //   last_contact: new Date(Date.now() - (Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString(),
        //   notes: 'This is a demo contact with sample information. In a real application, you would store detailed notes and preferences here.',
        //   start_date: relationship.start_date ? new Date(relationship.start_date) : undefined,
        //   color: relationship.color,
        //   tags: ['Primary', 'Close']
        // }

        // setContact(enhancedContact)
        // setLoading(false)
        // return
        return
      }
      
      // Real implementation would fetch from database
      const { data, error } = await supabase
        .from('relationships')
        .select('*')
        .eq('id', params.id)
        .eq('user_id', user?.id)
        .single()
      
      if (error || !data) {
        router.push('/contacts')
        return
      }
      
      // Convert dates to Date objects for the form
      if (data.start_date && typeof data.start_date === 'string') {
        data.start_date = new Date(data.start_date)
      }
      
      // In real implementation, fetch additional contact data
      // from a contacts table related to this relationship
      setContact(data)
      
    } catch (error) {
      console.error('Error fetching contact:', error)
      router.push('/contacts')
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-gray-500">Loading contact information...</p>
        </div>
      </div>
    )
  }
  
  if (!contact) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Contact not found</h3>
          <p className="text-gray-600 mb-6">This contact may have been deleted or doesn&apos;t exist</p>
          <Button onClick={() => router.push('/contacts')}>Go to Contacts</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="mr-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div
              className="w-5 h-5 rounded-full mr-3"
              style={{ backgroundColor: contact.color || '#6B7280' }}
            />
            <h1 className="text-xl font-bold text-gray-900">Edit {contact.partner_name}</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card/80 backdrop-blur shadow-lg rounded-lg p-6">
          <ContactForm 
            initialData={contact} 
            contactId={params.id}
            onSuccess={() => router.push(`/contacts/${params.id}`)}
          />
        </div>
      </div>
    </div>
  )
}

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Define schemas for validation
const contactImportSchema = z.object({
  contacts: z.array(z.object({
    name: z.string().min(1, { message: 'Name is required' }),
    email: z.string().email({ message: 'Invalid email' }).optional().nullable(),
    phone: z.string().optional().nullable(),
    tags: z.array(z.string()).optional(),
    address: z.string().optional().nullable(),
    birthday: z.string().optional().nullable(),
    notes: z.string().optional().nullable()
  }))
})

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get the user's session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Parse and validate the request body
    const body = await request.json()
    const validatedData = contactImportSchema.parse(body)
    
    // Process each contact
    const results = {
      success: 0,
      failed: 0,
      contacts: [] as any[]
    }
    
    for (const importContact of validatedData.contacts) {
      try {
        // Convert to database schema
        const contact = {
          user_id: session.user.id,
          partner_name: importContact.name,
          partner_email: importContact.email || null,
          phone: importContact.phone || null,
          relationship_type: 'other', // Default
          color: generateRandomColor(),
          privacy_level: 'limited_access', // Default
          notes: importContact.notes || null,
          address: importContact.address || null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        if (importContact.birthday) {
          try {
            // Attempt to parse and format the birthday
            const birthday = new Date(importContact.birthday)
            contact.birthday = birthday.toISOString().split('T')[0]
          } catch (e) {
            // If parsing fails, ignore the birthday
            console.warn('Failed to parse birthday:', importContact.birthday)
          }
        }
        
        // Store in database
        const { data, error } = await supabase
          .from('relationships')
          .insert(contact)
          .select()
        
        if (error) {
          console.error('Database error:', error)
          results.failed++
          continue
        }
        
        // Handle tags (in a real implementation)
        // This would store tags in a separate table with a relationship to the contact
        
        results.success++
        results.contacts.push(data[0])
      } catch (error) {
        console.error('Error importing contact:', importContact.name, error)
        results.failed++
      }
    }
    
    return NextResponse.json(results)
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    
    console.error('Error importing contacts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to generate a random color
function generateRandomColor() {
  const colors = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#10b981', // Green
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#6b7280'  // Gray
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}

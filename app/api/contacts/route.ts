import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Validation schemas
const contactSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  company: z.string().max(200).optional().or(z.literal('')),
  job_title: z.string().max(200).optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
  avatar_url: z.string().url().optional().or(z.literal('')),
  is_favorite: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  groups: z.array(z.string()).optional()
})

const contactUpdateSchema = contactSchema.partial()

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const tags = searchParams.get('tags')?.split(',')
    const groups = searchParams.get('groups')?.split(',')
    const favorites = searchParams.get('favorites') === 'true'
    const company = searchParams.get('company')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build the query
    let query = supabase
      .from('contacts')
      .select(`
        *,
        contact_tag_relationships!inner(
          contact_tags!inner(name)
        ),
        contact_group_relationships!inner(
          contact_groups!inner(name)
        )
      `)
      .eq('user_id', user.id)

    // Apply filters
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`)
    }

    if (favorites) {
      query = query.eq('is_favorite', true)
    }

    if (company) {
      query = query.eq('company', company)
    }

    if (tags && tags.length > 0) {
      query = query.in('contact_tag_relationships.contact_tags.name', tags)
    }

    if (groups && groups.length > 0) {
      query = query.in('contact_group_relationships.contact_groups.name', groups)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)
    query = query.order('created_at', { ascending: false })

    const { data: contacts, error } = await query

    if (error) {
      console.error('Error fetching contacts:', error)
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
    }

    // Transform the data to flatten the relationships
    const transformedContacts = contacts?.map(contact => ({
      id: contact.id,
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      job_title: contact.job_title,
      notes: contact.notes,
      avatar_url: contact.avatar_url,
      is_favorite: contact.is_favorite,
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      tags: contact.contact_tag_relationships?.map((r: any) => r.contact_tags.name) || [],
      groups: contact.contact_group_relationships?.map((r: any) => r.contact_groups.name) || []
    })) || []

    return NextResponse.json({ contacts: transformedContacts })
  } catch (error) {
    console.error('Error in contacts GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = contactSchema.parse(body)

    // Extract tags and groups for separate handling
    const { tags, groups, ...contactData } = validatedData

    // Insert the contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        ...contactData,
        user_id: user.id
      })
      .select()
      .single()

    if (contactError) {
      console.error('Error creating contact:', contactError)
      return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
    }

    // Handle tags if provided
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        // Get or create the tag
        let { data: tag } = await supabase
          .from('contact_tags')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', tagName)
          .single()

        if (!tag) {
          const { data: newTag } = await supabase
            .from('contact_tags')
            .insert({
              user_id: user.id,
              name: tagName
            })
            .select('id')
            .single()
          tag = newTag
        }

        if (tag) {
          // Create the relationship
          await supabase
            .from('contact_tag_relationships')
            .insert({
              contact_id: contact.id,
              tag_id: tag.id
            })
        }
      }
    }

    // Handle groups if provided
    if (groups && groups.length > 0) {
      for (const groupName of groups) {
        // Get or create the group
        let { data: group } = await supabase
          .from('contact_groups')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', groupName)
          .single()

        if (!group) {
          const { data: newGroup } = await supabase
            .from('contact_groups')
            .insert({
              user_id: user.id,
              name: groupName
            })
            .select('id')
            .single()
          group = newGroup
        }

        if (group) {
          // Create the relationship
          await supabase
            .from('contact_group_relationships')
            .insert({
              contact_id: contact.id,
              group_id: group.id
            })
        }
      }
    }

    // Log the activity
    await supabase
      .from('contact_activity_log')
      .insert({
        contact_id: contact.id,
        user_id: user.id,
        activity_type: 'created',
        description: `Created contact ${contact.first_name} ${contact.last_name}`
      })

    return NextResponse.json({ contact }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    
    console.error('Error in contacts POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 })
    }

    const validatedData = contactUpdateSchema.parse(updateData)

    // Extract tags and groups for separate handling
    const { tags, groups, ...contactData } = validatedData

    // Update the contact
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .update(contactData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (contactError) {
      console.error('Error updating contact:', contactError)
      return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 })
    }

    // Handle tags if provided
    if (tags !== undefined) {
      // Remove existing tag relationships
      await supabase
        .from('contact_tag_relationships')
        .delete()
        .eq('contact_id', id)

      // Add new tag relationships
      if (tags.length > 0) {
        for (const tagName of tags) {
          // Get or create the tag
          let { data: tag } = await supabase
            .from('contact_tags')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', tagName)
            .single()

          if (!tag) {
            const { data: newTag } = await supabase
              .from('contact_tags')
              .insert({
                user_id: user.id,
                name: tagName
              })
              .select('id')
              .single()
            tag = newTag
          }

          if (tag) {
            // Create the relationship
            await supabase
              .from('contact_tag_relationships')
              .insert({
                contact_id: id,
                tag_id: tag.id
              })
          }
        }
      }
    }

    // Handle groups if provided
    if (groups !== undefined) {
      // Remove existing group relationships
      await supabase
        .from('contact_group_relationships')
        .delete()
        .eq('contact_id', id)

      // Add new group relationships
      if (groups.length > 0) {
        for (const groupName of groups) {
          // Get or create the group
          let { data: group } = await supabase
            .from('contact_groups')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', groupName)
            .single()

          if (!group) {
            const { data: newGroup } = await supabase
              .from('contact_groups')
              .insert({
                user_id: user.id,
                name: groupName
              })
              .select('id')
              .single()
            group = newGroup
          }

          if (group) {
            // Create the relationship
            await supabase
              .from('contact_group_relationships')
              .insert({
                contact_id: id,
                group_id: group.id
              })
          }
        }
      }
    }

    // Log the activity
    await supabase
      .from('contact_activity_log')
      .insert({
        contact_id: id,
        user_id: user.id,
        activity_type: 'updated',
        description: `Updated contact ${contact.first_name} ${contact.last_name}`
      })

    return NextResponse.json({ contact })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    
    console.error('Error in contacts PUT:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 })
    }

    // Get contact info for logging
    const { data: contact } = await supabase
      .from('contacts')
      .select('first_name, last_name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    // Delete the contact (cascading will handle relationships)
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting contact:', error)
      return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 })
    }

    // Log the activity
    if (contact) {
      await supabase
        .from('contact_activity_log')
        .insert({
          contact_id: id,
          user_id: user.id,
          activity_type: 'deleted',
          description: `Deleted contact ${contact.first_name} ${contact.last_name}`
        })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in contacts DELETE:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

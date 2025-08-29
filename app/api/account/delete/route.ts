import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, createAdminClient } from '@/lib/supabase/server'
import { checkRateLimit, RATE_LIMITS, createRateLimitHeaders } from '@/lib/rate-limiting'
import { z } from 'zod'

// Schema for account deletion confirmation
const accountDeletionSchema = z.object({
  confirmation: z.literal('DELETE_MY_ACCOUNT'),
  password: z.string().min(1, 'Password is required for account deletion')
})

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Apply rate limiting for account deletion
    const rateLimitResult = checkRateLimit(user.id, RATE_LIMITS.ACCOUNT_DELETION)
    const rateLimitHeaders = createRateLimitHeaders(
      rateLimitResult.remaining,
      rateLimitResult.resetTime,
      RATE_LIMITS.ACCOUNT_DELETION.maxRequests,
      rateLimitResult.retryAfter
    )

    if (rateLimitResult.isLimited) {
      return NextResponse.json({ 
        error: 'Too many account deletion attempts. Please try again later.',
        retryAfter: rateLimitResult.retryAfter
      }, { 
        status: 429,
        headers: rateLimitHeaders
      })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = accountDeletionSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: validationResult.error.issues 
      }, { status: 400 })
    }

    const { password } = validationResult.data

    // Verify user password before deletion
    const { error: passwordError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: password
    })

    if (passwordError) {
      return NextResponse.json({ 
        error: 'Invalid password. Please verify your password to delete your account.' 
      }, { status: 401 })
    }

    // Use admin client for deletion operations to bypass RLS
    const adminSupabase = createAdminClient()

    // Start transaction-like deletion process
    // Note: Supabase doesn't support transactions directly, so we'll handle rollback manually if needed
    const deletionResults = {
      reminders: false,
      event_attachments: false,
      event_permissions: false,
      events: false,
      event_templates: false,
      custom_holidays: false,
      contact_tag_relationships: false,
      contact_group_relationships: false,
      contact_activity_log: false,
      contacts: false,
      contact_tags: false,
      contact_groups: false,
      group_members: false,
      relationship_groups: false,
      relationships: false,
      user_profile: false,
      auth_user: false
    }

    try {
      // Log the deletion attempt for audit purposes
      console.log(`Account deletion initiated for user: ${user.id} at ${new Date().toISOString()}`)

      // 1. Delete reminders
      const { error: remindersError } = await adminSupabase
        .from('reminders')
        .delete()
        .eq('user_id', user.id)

      if (remindersError && remindersError.code !== 'PGRST116') {
        throw new Error(`Failed to delete reminders: ${remindersError.message}`)
      }
      deletionResults.reminders = true

      // 2. Delete event attachments (and files from storage)
      const { data: attachments } = await adminSupabase
        .from('event_attachments')
        .select('file_url, event_id')
        .eq('uploaded_by', user.id)

      if (attachments && attachments.length > 0) {
        // Delete files from storage
        const filePaths = attachments.map((att: { file_url: string; event_id: string }) => {
          // Extract file path from URL
          const url = new URL(att.file_url)
          return url.pathname.substring(1) // Remove leading slash
        })

        await adminSupabase.storage
          .from('attachments')
          .remove(filePaths)

        // Delete attachment records
        const { error: attachmentsError } = await adminSupabase
          .from('event_attachments')
          .delete()
          .eq('uploaded_by', user.id)

        if (attachmentsError) {
          throw new Error(`Failed to delete attachments: ${attachmentsError.message}`)
        }
      }
      deletionResults.event_attachments = true

      // 3. Delete event permissions
      // First get all event IDs for this user
      const { data: eventIds } = await adminSupabase
        .from('events')
        .select('id')
        .eq('user_id', user.id)
      
      if (eventIds && eventIds.length > 0) {
        const { error: permissionsError } = await adminSupabase
          .from('event_permissions')
          .delete()
          .in('event_id', eventIds.map(e => e.id))
        
        if (permissionsError && permissionsError.code !== 'PGRST116') {
          throw new Error(`Failed to delete event permissions: ${permissionsError.message}`)
        }
      }
      deletionResults.event_permissions = true

      // 4. Delete events
      const { error: eventsError } = await adminSupabase
        .from('events')
        .delete()
        .eq('user_id', user.id)

      if (eventsError && eventsError.code !== 'PGRST116') {
        throw new Error(`Failed to delete events: ${eventsError.message}`)
      }
      deletionResults.events = true

      // 5. Delete event templates
      const { error: templatesError } = await adminSupabase
        .from('event_templates')
        .delete()
        .eq('user_id', user.id)

      if (templatesError && templatesError.code !== 'PGRST116') {
        throw new Error(`Failed to delete event templates: ${templatesError.message}`)
      }
      deletionResults.event_templates = true

      // 6. Delete custom holidays
      const { error: holidaysError } = await adminSupabase
        .from('custom_holidays')
        .delete()
        .eq('user_id', user.id)

      if (holidaysError && holidaysError.code !== 'PGRST116') {
        throw new Error(`Failed to delete custom holidays: ${holidaysError.message}`)
      }
      deletionResults.custom_holidays = true

      // 7. Delete contact relationships (tags and groups)
      // First get all contact IDs for this user
      const { data: contactIds } = await adminSupabase
        .from('contacts')
        .select('id')
        .eq('user_id', user.id)
      
      if (contactIds && contactIds.length > 0) {
        const { error: contactTagRelError } = await adminSupabase
          .from('contact_tag_relationships')
          .delete()
          .in('contact_id', contactIds.map(c => c.id))

        if (contactTagRelError && contactTagRelError.code !== 'PGRST116') {
          throw new Error(`Failed to delete contact tag relationships: ${contactTagRelError.message}`)
        }
        deletionResults.contact_tag_relationships = true

        const { error: contactGroupRelError } = await adminSupabase
          .from('contact_group_relationships')
          .delete()
          .in('contact_id', contactIds.map(c => c.id))

        if (contactGroupRelError && contactGroupRelError.code !== 'PGRST116') {
          throw new Error(`Failed to delete contact group relationships: ${contactGroupRelError.message}`)
        }
        deletionResults.contact_group_relationships = true
      }

      // 8. Delete contact activity log
      const { error: activityLogError } = await adminSupabase
        .from('contact_activity_log')
        .delete()
        .eq('user_id', user.id)

      if (activityLogError && activityLogError.code !== 'PGRST116') {
        throw new Error(`Failed to delete contact activity log: ${activityLogError.message}`)
      }
      deletionResults.contact_activity_log = true

      // 9. Delete contacts
      const { error: contactsError } = await adminSupabase
        .from('contacts')
        .delete()
        .eq('user_id', user.id)

      if (contactsError && contactsError.code !== 'PGRST116') {
        throw new Error(`Failed to delete contacts: ${contactsError.message}`)
      }
      deletionResults.contacts = true

      // 10. Delete contact tags and groups
      const { error: contactTagsError } = await adminSupabase
        .from('contact_tags')
        .delete()
        .eq('user_id', user.id)

      if (contactTagsError && contactTagsError.code !== 'PGRST116') {
        throw new Error(`Failed to delete contact tags: ${contactTagsError.message}`)
      }
      deletionResults.contact_tags = true

      const { error: contactGroupsError } = await adminSupabase
        .from('contact_groups')
        .delete()
        .eq('user_id', user.id)

      if (contactGroupsError && contactGroupsError.code !== 'PGRST116') {
        throw new Error(`Failed to delete contact groups: ${contactGroupsError.message}`)
      }
      deletionResults.contact_groups = true

      // 11. Delete relationship group members
      // First get all group IDs for this user
      const { data: groupIds } = await adminSupabase
        .from('relationship_groups')
        .select('id')
        .eq('user_id', user.id)
      
      if (groupIds && groupIds.length > 0) {
        const { error: groupMembersError } = await adminSupabase
          .from('group_members')
          .delete()
          .in('group_id', groupIds.map(g => g.id))
        
        if (groupMembersError && groupMembersError.code !== 'PGRST116') {
          throw new Error(`Failed to delete group members: ${groupMembersError.message}`)
        }
      }

      deletionResults.group_members = true

      // 12. Delete relationship groups
      const { error: relationshipGroupsError } = await adminSupabase
        .from('relationship_groups')
        .delete()
        .eq('user_id', user.id)

      if (relationshipGroupsError && relationshipGroupsError.code !== 'PGRST116') {
        throw new Error(`Failed to delete relationship groups: ${relationshipGroupsError.message}`)
      }
      deletionResults.relationship_groups = true

      // 13. Delete relationships
      const { error: relationshipsError } = await adminSupabase
        .from('relationships')
        .delete()
        .eq('user_id', user.id)

      if (relationshipsError && relationshipsError.code !== 'PGRST116') {
        throw new Error(`Failed to delete relationships: ${relationshipsError.message}`)
      }
      deletionResults.relationships = true

      // 14. Delete user profile (if exists in separate table)
      // Note: This might not exist based on the current schema, but included for completeness
      const { error: profileError } = await adminSupabase
        .from('profiles')
        .delete()
        .eq('id', user.id)

      // Don't throw error if profiles table doesn't exist
      deletionResults.user_profile = true

      // 15. Finally, delete the auth user
      const { error: authDeleteError } = await adminSupabase.auth.admin.deleteUser(user.id)
      
      if (authDeleteError) {
        throw new Error(`Failed to delete user account: ${authDeleteError.message}`)
      }
      deletionResults.auth_user = true

      // Log successful deletion for audit purposes
      console.log(`Account deletion completed successfully for user: ${user.id} at ${new Date().toISOString()}`)
      console.log('Deletion results:', deletionResults)

      return NextResponse.json({ 
        success: true, 
        message: 'Account and all associated data have been permanently deleted.',
        deletedAt: new Date().toISOString()
      }, {
        headers: rateLimitHeaders
      })

    } catch (deletionError) {
      // Log the error for debugging
      console.error('Account deletion failed:', deletionError)
      console.log('Partial deletion results:', deletionResults)

      // Return error without exposing internal details
      return NextResponse.json({ 
        error: 'Account deletion failed. Please contact support if this issue persists.',
        details: process.env.NODE_ENV === 'development' ? (deletionError instanceof Error ? deletionError.message : String(deletionError)) : undefined
      }, { 
        status: 500,
        headers: rateLimitHeaders
      })
    }

  } catch (error) {
    console.error('Unexpected error in account deletion:', error)
    return NextResponse.json({ 
      error: 'Internal server error during account deletion' 
    }, { status: 500 })
  }
}

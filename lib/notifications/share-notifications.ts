// This module handles notifications for share actions
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { PrivacyLevel } from '@/lib/supabase/types'

// Types for notifications
export interface Notification {
  id: string
  userId: string
  type: 'share_created' | 'share_updated' | 'share_revoked' | 'share_accessed'
  resourceId: string
  resourceType: 'calendar' | 'event' | 'contact' | 'group'
  message: string
  read: boolean
  data?: any
  createdAt: Date
}

export interface ShareNotificationData {
  shareId: string
  shareType: 'contact' | 'group' | 'email' | 'link'
  recipientId?: string
  recipientEmail?: string
  groupId?: string
  privacyLevel: PrivacyLevel
  expiresAt?: Date
  calendars?: string[]
}

// Function to send a notification when a calendar is shared
export async function sendShareCreatedNotification(data: ShareNotificationData): Promise<boolean> {
  try {
    const supabase = createClientComponentClient()
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('No active session')
      return false
    }
    
    // Generate a meaningful message based on the share type
    let message = 'Shared calendar with '
    let recipientType = data.shareType
    let recipientId = ''
    
    switch (data.shareType) {
      case 'contact':
        message += 'contact'
        recipientId = data.recipientId || ''
        break
      case 'group':
        message += 'group'
        recipientId = data.groupId || ''
        break
      case 'email':
        message += data.recipientEmail || 'an email address'
        recipientId = data.recipientEmail || ''
        break
      case 'link':
        message += 'shareable link'
        recipientId = 'link'
        break
      default:
        message += 'someone'
    }
    
    // Insert the notification record
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: session.user.id,
        type: 'share_created',
        resource_id: data.shareId,
        resource_type: 'calendar',
        message,
        read: false,
        data: {
          shareType: data.shareType,
          recipientType,
          recipientId,
          privacyLevel: data.privacyLevel,
          expiresAt: data.expiresAt,
          calendars: data.calendars
        },
        created_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('Error creating notification:', error)
      return false
    }
    
    return true
    
  } catch (error) {
    console.error('Error sending notification:', error)
    return false
  }
}

// Function to send a notification when a share is revoked
export async function sendShareRevokedNotification(shareId: string, recipientName: string): Promise<boolean> {
  try {
    const supabase = createClientComponentClient()
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('No active session')
      return false
    }
    
    // Insert the notification record
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: session.user.id,
        type: 'share_revoked',
        resource_id: shareId,
        resource_type: 'calendar',
        message: `Revoked calendar access for ${recipientName}`,
        read: false,
        created_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('Error creating notification:', error)
      return false
    }
    
    return true
    
  } catch (error) {
    console.error('Error sending notification:', error)
    return false
  }
}

// Function to send a notification when a share is updated
export async function sendShareUpdatedNotification(
  shareId: string, 
  recipientName: string,
  changes: { 
    privacyLevel?: PrivacyLevel,
    expiresAt?: Date | null,
    calendars?: string[]
  }
): Promise<boolean> {
  try {
    const supabase = createClientComponentClient()
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('No active session')
      return false
    }
    
    // Generate a message based on what changed
    let message = `Updated share settings for ${recipientName}`
    
    // Insert the notification record
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: session.user.id,
        type: 'share_updated',
        resource_id: shareId,
        resource_type: 'calendar',
        message,
        read: false,
        data: changes,
        created_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('Error creating notification:', error)
      return false
    }
    
    return true
    
  } catch (error) {
    console.error('Error sending notification:', error)
    return false
  }
}

// Function to send a notification when a shared calendar is accessed
export async function sendShareAccessedNotification(
  shareId: string, 
  accessorName: string
): Promise<boolean> {
  try {
    const supabase = createClientComponentClient()
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('No active session')
      return false
    }
    
    // Insert the notification record
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: session.user.id,
        type: 'share_accessed',
        resource_id: shareId,
        resource_type: 'calendar',
        message: `${accessorName} viewed your shared calendar`,
        read: false,
        created_at: new Date().toISOString()
      })
    
    if (error) {
      console.error('Error creating notification:', error)
      return false
    }
    
    return true
    
  } catch (error) {
    console.error('Error sending notification:', error)
    return false
  }
}

// Function to fetch user's notifications
export async function fetchNotifications(limit: number = 10): Promise<Notification[]> {
  try {
    const supabase = createClientComponentClient()
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('No active session')
      return []
    }
    
    // Fetch notifications
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      console.error('Error fetching notifications:', error)
      return []
    }
    
    // Convert to our notification type
    return (data || []).map(item => ({
      id: item.id,
      userId: item.user_id,
      type: item.type,
      resourceId: item.resource_id,
      resourceType: item.resource_type,
      message: item.message,
      read: item.read,
      data: item.data,
      createdAt: new Date(item.created_at)
    }))
    
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
}

// Function to mark a notification as read
export async function markNotificationRead(notificationId: string): Promise<boolean> {
  try {
    const supabase = createClientComponentClient()
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('No active session')
      return false
    }
    
    // Update the notification
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', session.user.id)
    
    if (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
    
    return true
    
  } catch (error) {
    console.error('Error marking notification as read:', error)
    return false
  }
}

// Function to mark all notifications as read
export async function markAllNotificationsRead(): Promise<boolean> {
  try {
    const supabase = createClientComponentClient()
    
    // Get user session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      console.error('No active session')
      return false
    }
    
    // Update all notifications
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', session.user.id)
      .eq('read', false)
    
    if (error) {
      console.error('Error marking all notifications as read:', error)
      return false
    }
    
    return true
    
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    return false
  }
}

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { 
  Notification, 
  NotificationPreferences, 
  NotificationType,
  NotificationPriority 
} from './types'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  preferences: NotificationPreferences
  loading: boolean
  addNotification: (notification: Omit<Notification, 'id' | 'user_id' | 'created_at'>) => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>
  fetchNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

const defaultPreferences: NotificationPreferences = {
  event_reminders: true,
  relationship_anniversaries: true,
  birthday_reminders: true,
  group_invitations: true,
  system_updates: true,
  sound_enabled: true,
  email_notifications: false,
  push_notifications: true,
  reminder_intervals: {
    events: [15, 60, 1440], // 15 min, 1 hour, 1 day
    birthdays: [1, 7], // 1 day, 1 week
    anniversaries: [1, 7] // 1 day, 1 week
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = createSupabaseClient()

  const unreadCount = notifications.filter(n => !n.read).length

  const fetchNotifications = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('scheduled_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error && error.code !== 'PGRST116') { // Table doesn't exist yet
        console.error('Error fetching notifications:', error)
        setNotifications([])
      } else {
        setNotifications(data || [])
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [user, supabase])

  const addNotification = useCallback(async (notification: Omit<Notification, 'id' | 'user_id' | 'created_at'>) => {
    if (!user) return

    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: user.id,
      created_at: new Date().toISOString()
    }

    try {
      const { data, error } = await supabase
        .from('scheduled_notifications')
        .insert([newNotification])
        .select()
        .single()

      if (error) throw error

      setNotifications(prev => [data, ...prev])

      // Play notification sound
      if (preferences.sound_enabled) {
        try {
          const audio = new Audio('/notification-sound.mp3')
          audio.volume = 0.3
          audio.play().catch(() => {
            console.log('Notification sound failed to play')
          })
        } catch (error) {
          console.log('Notification sound not available')
        }
      }
    } catch (error) {
      console.error('Error adding notification:', error)
      // Still add to local state as fallback
      setNotifications(prev => [newNotification, ...prev])
    }
  }, [user, supabase, preferences.sound_enabled])

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return

    // Update local state immediately
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )

    try {
      const { error } = await supabase
        .from('scheduled_notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [user, supabase])

  const markAllAsRead = useCallback(async () => {
    if (!user) return

    // Update local state immediately
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))

    try {
      const { error } = await supabase
        .from('scheduled_notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)

      if (error) throw error
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }, [user, supabase])

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user) return

    // Update local state immediately
    setNotifications(prev => prev.filter(n => n.id !== notificationId))

    try {
      const { error } = await supabase
        .from('scheduled_notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }, [user, supabase])

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    const updatedPreferences = { ...preferences, ...newPreferences }
    setPreferences(updatedPreferences)

    if (!user) return

    try {
      // Store preferences in user_preferences table or user metadata
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          notification_preferences: updatedPreferences,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
    } catch (error) {
      console.error('Error updating notification preferences:', error)
    }
  }, [user, supabase, preferences])

  useEffect(() => {
    if (user) {
      fetchNotifications()
    }
  }, [user, fetchNotifications])

  // Auto-refresh notifications every 5 minutes
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      fetchNotifications()
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [user, fetchNotifications])

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    preferences,
    loading,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
    fetchNotifications
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

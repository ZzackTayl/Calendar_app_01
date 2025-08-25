export type NotificationType = 
  | 'event_reminder'
  | 'relationship_anniversary'
  | 'missed_event'
  | 'upcoming_birthday'
  | 'group_invitation'
  | 'system_update'
  | 'relationship_milestone'
  | 'event_conflict'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  read: boolean
  created_at: string
  scheduled_for?: string
  related_id?: string // ID of related event, relationship, etc.
  action_url?: string
  metadata?: Record<string, any>
}

export interface NotificationPreferences {
  event_reminders: boolean
  relationship_anniversaries: boolean
  birthday_reminders: boolean
  group_invitations: boolean
  system_updates: boolean
  sound_enabled: boolean
  email_notifications: boolean
  push_notifications: boolean
  reminder_intervals: {
    events: number[] // minutes before event [15, 60, 1440]
    birthdays: number[] // days before [1, 7]
    anniversaries: number[] // days before [1, 7]
  }
}

export interface NotificationAction {
  id: string
  label: string
  action: () => void | Promise<void>
  type?: 'primary' | 'secondary' | 'destructive'
}

export interface NotificationTemplate {
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  actions?: NotificationAction[]
}

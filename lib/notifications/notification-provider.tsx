'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Notification, fetchNotifications } from './share-notifications'
import { NotificationCenter } from '@/components/ui/notifications'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  refreshNotifications: async () => {}
})

export const useNotifications = () => useContext(NotificationContext)

interface NotificationProviderProps {
  children: React.ReactNode
  enablePolling?: boolean
  pollingInterval?: number
}

export function NotificationProvider({
  children,
  enablePolling = true,
  pollingInterval = 30000 // 30 seconds
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  
  const refreshNotifications = async () => {
    setLoading(true)
    try {
      const data = await fetchNotifications(50)
      setNotifications(data)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Initial fetch and polling setup
  useEffect(() => {
    refreshNotifications()
    
    // Set up polling if enabled
    let intervalId: NodeJS.Timeout
    if (enablePolling) {
      intervalId = setInterval(refreshNotifications, pollingInterval)
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [enablePolling, pollingInterval])
  
  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length
  
  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        refreshNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

// Helper component to render the notification center in dashboard layouts
export function NotificationCenterWrapper({ className }: { className?: string }) {
  return <NotificationCenter className={className} />
}

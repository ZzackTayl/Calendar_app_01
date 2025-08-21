'use client'

import * as React from 'react'
import { Bell, BellOff, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  fetchNotifications, 
  markNotificationRead, 
  markAllNotificationsRead,
  Notification
} from '@/lib/notifications/share-notifications'
import { format } from 'date-fns'

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [loading, setLoading] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  
  // Fetch notifications when opened
  React.useEffect(() => {
    if (open) {
      loadNotifications()
    }
  }, [open])
  
  // Load notifications from the API
  const loadNotifications = async () => {
    setLoading(true)
    try {
      const data = await fetchNotifications(20)
      setNotifications(data)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Mark a notification as read
  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id)
      // Update the local state
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === id ? { ...notif, read: true } : notif
        )
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }
  
  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      // Update the local state
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      )
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }
  
  // Count unread notifications
  const unreadCount = notifications.filter(n => !n.read).length
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("relative", className)}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-full" 
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs"
              onClick={handleMarkAllRead}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="py-4 text-center">
              <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center">
              <BellOff className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={() => handleMarkRead(notification.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

interface NotificationItemProps {
  notification: Notification
  onMarkRead: () => void
}

function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  // Function to get the notification variant
  const getVariant = (type: string) => {
    switch (type) {
      case 'share_created':
        return 'default'
      case 'share_revoked':
        return 'destructive'
      case 'share_updated':
        return 'secondary'
      case 'share_accessed':
        return 'outline'
      default:
        return 'default'
    }
  }
  
  // Get the notification icon
  const getIcon = (type: string) => {
    switch (type) {
      case 'share_created':
        return '🔗'
      case 'share_revoked':
        return '🚫'
      case 'share_updated':
        return '✏️'
      case 'share_accessed':
        return '👁️'
      default:
        return '📢'
    }
  }
  
  // Format the date
  const formattedDate = format(
    notification.createdAt, 
    'MMM d' + (notification.createdAt.getFullYear() !== new Date().getFullYear() ? ', yyyy' : '') + 
    ' · ' + format(notification.createdAt, 'p')
  )
  
  return (
    <div 
      className={cn(
        "flex items-start p-3 rounded-md transition-colors",
        notification.read ? "bg-background" : "bg-accent/30",
        !notification.read && "cursor-pointer hover:bg-accent/50"
      )}
      onClick={() => !notification.read && onMarkRead()}
    >
      <div className="mr-3 mt-0.5">{getIcon(notification.type)}</div>
      <div className="flex-grow">
        <div className="flex justify-between items-start gap-2">
          <p className="text-sm font-medium">{notification.message}</p>
          {!notification.read && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation()
                onMarkRead()
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{formattedDate}</p>
      </div>
    </div>
  )
}

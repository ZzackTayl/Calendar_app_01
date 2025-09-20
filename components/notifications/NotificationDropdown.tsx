'use client';

import React, { useState } from 'react'
import { useNotifications } from '@/lib/notifications/context'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  BellRing, 
  Calendar, 
  Heart, 
  Users, 
  Gift, 
  AlertTriangle,
  Settings,
  CheckCheck,
  Trash2,
  X
} from 'lucide-react'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Notification, NotificationType } from '@/lib/notifications/types'

interface NotificationDropdownProps {
  className?: string
}

const NotificationIcon = ({ type, className = "h-4 w-4" }: { type: NotificationType, className?: string }) => {
  switch (type) {
    case 'event_reminder':
    case 'event_conflict':
    case 'missed_event':
      return <Calendar className={className} />
    case 'relationship_anniversary':
    case 'relationship_milestone':
      return <Heart className={className} />
    case 'upcoming_birthday':
      return <Gift className={className} />
    case 'group_invitation':
      return <Users className={className} />
    case 'system_update':
      return <Settings className={className} />
    default:
      return <Bell className={className} />
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500 text-white'
    case 'high':
      return 'bg-orange-500 text-white'
    case 'medium':
      return 'bg-blue-500 text-white'
    case 'low':
      return 'bg-gray-500 text-white'
    default:
      return 'bg-gray-500 text-white'
  }
}

const NotificationItem = ({ 
  notification, 
  onDelete, 
  onNavigate 
}: { 
  notification: Notification
  onDelete: (id: string) => void
  onNavigate: (url: string) => void
}) => {
  return (
    <div 
      className={`p-3 border-b border-border last:border-b-0 transition-all duration-200 hover:bg-accent/50 ${
        !notification.read ? 'bg-primary/5 border-l-4 border-l-primary' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <div className={`p-2 rounded-full ${notification.read ? 'bg-muted' : 'bg-primary/10'}`}>
            <NotificationIcon 
              type={notification.type} 
              className={`h-4 w-4 ${notification.read ? 'text-muted-foreground' : 'text-primary'}`}
            />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-medium ${notification.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                {notification.title}
              </h4>
              <p className={`text-sm mt-1 ${notification.read ? 'text-muted-foreground' : 'text-foreground/80'}`}>
                {notification.message}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className={`text-xs ${getPriorityColor(notification.priority)}`}>
                  {notification.priority}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(notification.id)
                }}
                aria-label="Delete notification"
                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {notification.action_url && (
            <Button
              variant="link"
              size="sm"
              onClick={() => onNavigate(notification.action_url!)}
              className="mt-2 p-0 h-auto text-primary hover:text-primary/80"
            >
              View details →
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function NotificationDropdown({ className }: NotificationDropdownProps) {
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleNavigate = (url: string) => {
    router.push(url)
    setIsOpen(false)
  }

  const handleMarkAsRead = (id: string) => {
    markAsRead(id)
  }

  const handleDelete = (id: string) => {
    deleteNotification(id)
  }

  const handleMarkAllAsRead = () => {
    markAllAsRead()
  }

  const hasUnread = unreadCount > 0

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative ${className}`}
          aria-label={`Notifications ${hasUnread ? `(${unreadCount} unread)` : ''}`}
        >
          {hasUnread ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {hasUnread && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold min-w-[20px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        className="w-80 max-w-[90vw] p-0 max-h-[70vh] sm:max-h-[80vh]"
        sideOffset={5}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <DropdownMenuLabel className="text-base font-semibold">
            Notifications
          </DropdownMenuLabel>
          <div className="flex items-center gap-2">
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="h-96 max-h-[60vh] sm:max-h-[70vh]">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading notifications...</p>
            </div>
          ) : notifications.length > 0 ? (
            <div>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onDelete={handleDelete}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium text-foreground mb-1">No notifications</h3>
              <p className="text-sm text-muted-foreground">
                You&apos;re all caught up! Check back later for updates.
              </p>
            </div>
          )}
        </ScrollArea>

        {notifications.length > 5 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full justify-center text-sm"
                onClick={() => {
                  handleNavigate('/notifications')
                }}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

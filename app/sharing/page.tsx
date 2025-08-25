'use client';

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft, 
  Share,
  Search, 
  Link, 
  Copy, 
  Trash2, 
  Calendar, 
  CalendarClock, 
  MoreHorizontal, 
  User,
  Users,
  AlertCircle,
  ClipboardCopy,
  RefreshCcw,
  Settings,
  Eye,
  EyeOff,
  Clock,
  Mail
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useHierarchicalNavigation } from '@/lib/navigation-utils'
import { DemoStore } from '@/lib/demo-store'
import { useToast } from '@/hooks/use-toast'
import { format, isAfter, parseISO, addDays } from 'date-fns'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ShareDialog } from '@/components/ui/share-dialog'

// Define interfaces for sharing
interface CalendarShare {
  id: string
  shareType: 'contact' | 'group' | 'email' | 'link'
  recipient: {
    id: string
    name: string
    email?: string
    type: 'contact' | 'group' | 'email'
  }
  created: Date
  expires?: Date
  lastAccessed?: Date
  privacyLevel: 'full_access' | 'limited_access' | 'busy_only' | 'hidden'
  allowResharing: boolean
  token?: string
  calendars: string[]
}

interface Calendar {
  id: string
  name: string
  color: string
}

export default function SharingPage() {
  const [shares, setShares] = useState<CalendarShare[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null)
  const [tokenCopied, setTokenCopied] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('outgoing')
  
  const { user, demoMode } = useAuth()
  const router = useRouter()
  const { goBack } = useHierarchicalNavigation()
  const supabase = createSupabaseClient()
  const { toast } = useToast()

  // Demo calendars
  const demoCalendars: Calendar[] = [
    { id: 'cal-1', name: 'Personal', color: '#3b82f6' },
    { id: 'cal-2', name: 'Work', color: '#10b981' },
    { id: 'cal-3', name: 'Relationships', color: '#ec4899' },
    { id: 'cal-4', name: 'Family', color: '#f97316' }
  ]
  
  // Demo contacts and groups for sharing
  const demoContacts = [
    { id: 'contact-1', label: 'Alex Smith', value: 'contact-1', type: 'contact' as const },
    { id: 'contact-2', label: 'Jordan Lee', value: 'contact-2', type: 'contact' as const },
    { id: 'contact-3', label: 'Taylor Johnson', value: 'contact-3', type: 'contact' as const }
  ]
  
  const demoGroups = [
    { id: 'group-1', label: 'Close Partners', value: 'group-1', type: 'group' as const },
    { id: 'group-2', label: 'Friends', value: 'group-2', type: 'group' as const },
    { id: 'group-3', label: 'Family', value: 'group-3', type: 'group' as const }
  ]

  useEffect(() => {
    if (!user && !demoMode) {
      router.push('/auth/signin')
      return
    }

    fetchShares()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, demoMode])

  const fetchShares = async () => {
    setLoading(true)
    
    try {
      if (demoMode) {
        // Generate demo shares
        const demoShares: CalendarShare[] = [
          {
            id: 'share-1',
            shareType: 'contact',
            recipient: {
              id: 'contact-1',
              name: 'Alex Smith',
              email: 'alex@example.com',
              type: 'contact'
            },
            created: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
            privacyLevel: 'full_access',
            allowResharing: false,
            calendars: ['cal-1', 'cal-3']
          },
          {
            id: 'share-2',
            shareType: 'group',
            recipient: {
              id: 'group-1',
              name: 'Close Partners',
              type: 'group'
            },
            created: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
            privacyLevel: 'limited_access',
            allowResharing: true,
            calendars: ['cal-3']
          },
          {
            id: 'share-3',
            shareType: 'email',
            recipient: {
              id: 'email-1',
              name: 'Robin Davis',
              email: 'robin@example.com',
              type: 'email'
            },
            created: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
            expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            privacyLevel: 'busy_only',
            allowResharing: false,
            calendars: ['cal-1', 'cal-2', 'cal-3', 'cal-4']
          },
          {
            id: 'share-4',
            shareType: 'link',
            recipient: {
              id: 'link-1',
              name: 'Shareable Link',
              type: 'email'
            },
            created: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
            privacyLevel: 'busy_only',
            allowResharing: false,
            token: 'abc123xyz',
            calendars: ['cal-3']
          }
        ]
        
        setShares(demoShares)
        setLoading(false)
        return
      }
      
      // In a real implementation, fetch shares from the database
      // For now, we'll just show demo data
      
      setShares([])
      
    } catch (error) {
      console.error('Error fetching shares:', error)
      toast({ title: 'Error', description: 'Failed to load shares', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }
  
  const handleCreateShare = async (values: any) => {
    try {
      if (demoMode) {
        // Create a new demo share
        const newShare: CalendarShare = {
          id: `share-${Date.now()}`,
          shareType: values.shareType,
          recipient: {
            id: values.recipient || `${values.shareType}-${Date.now()}`,
            name: values.shareType === 'link' 
              ? 'Shareable Link' 
              : values.shareType === 'email'
                ? values.recipientEmail
                : values.shareType === 'contact'
                  ? demoContacts.find(c => c.id === values.recipient)?.label || 'Unknown'
                  : demoGroups.find(g => g.id === values.recipient)?.label || 'Unknown Group',
            email: values.recipientEmail,
            type: values.shareType === 'link' ? 'email' : values.shareType
          },
          created: new Date(),
          expires: values.expirationEnabled ? values.expirationDate : undefined,
          privacyLevel: values.privacyLevel,
          allowResharing: values.allowResharing,
          token: values.shareType === 'link' ? Math.random().toString(36).substring(2, 10) : undefined,
          calendars: values.calendarType === 'all' 
            ? demoCalendars.map(cal => cal.id)
            : values.selectedCalendars || []
        }
        
        setShares(prev => [newShare, ...prev])
        
        if (values.shareType !== 'link') {
          toast({ 
            title: 'Calendar shared', 
            description: `Calendar shared with ${newShare.recipient.name}` 
          })
        }
        
        return
      }
      
      // In a real implementation, save the share to the database
      toast({ 
        title: 'Calendar shared', 
        description: 'Calendar shared successfully' 
      })
      
    } catch (error) {
      console.error('Error creating share:', error)
      toast({ title: 'Error', description: 'Failed to share calendar', variant: 'destructive' })
    }
  }
  
  const handleDeleteShare = async () => {
    try {
      if (!selectedShareId) return
      
      if (demoMode) {
        // Remove the share from the list
        setShares(prev => prev.filter(share => share.id !== selectedShareId))
        toast({ title: 'Share deleted', description: 'Share has been deleted' })
        setSelectedShareId(null)
        setShowDeleteDialog(false)
        return
      }
      
      // In a real implementation, delete the share from the database
      toast({ title: 'Share deleted', description: 'Share has been deleted' })
      setSelectedShareId(null)
      setShowDeleteDialog(false)
      
    } catch (error) {
      console.error('Error deleting share:', error)
      toast({ title: 'Error', description: 'Failed to delete share', variant: 'destructive' })
    }
  }
  
  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(`https://polyharmony.app/share/${token}`)
    setTokenCopied(token)
    setTimeout(() => setTokenCopied(null), 3000)
    toast({ title: 'Link copied', description: 'Share link copied to clipboard' })
  }
  
  const handleRegenerateToken = (shareId: string) => {
    // In a real implementation, this would regenerate the token in the database
    const newToken = Math.random().toString(36).substring(2, 10)
    
    setShares(prev => prev.map(share => {
      if (share.id === shareId) {
        return { ...share, token: newToken }
      }
      return share
    }))
    
    toast({ title: 'Link regenerated', description: 'A new share link has been generated' })
  }
  
  // Get style and icon based on privacy level
  const getPrivacyDetails = (level: string) => {
    switch (level) {
      case 'full_access':
        return { class: 'bg-green-100 text-green-800', icon: <Eye className="h-4 w-4" /> }
      case 'limited_access':
        return { class: 'bg-blue-100 text-blue-800', icon: <Eye className="h-4 w-4" /> }
      case 'busy_only':
        return { class: 'bg-amber-100 text-amber-800', icon: <EyeOff className="h-4 w-4" /> }
      case 'hidden':
        return { class: 'bg-gray-100 text-gray-800', icon: <EyeOff className="h-4 w-4" /> }
      default:
        return { class: 'bg-gray-100 text-gray-800', icon: <EyeOff className="h-4 w-4" /> }
    }
  }

  // Filter shares based on search and active tab
  const filteredShares = shares.filter(share => {
    const matchesSearch = 
      share.recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (share.recipient.email && share.recipient.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      share.shareType.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })
  
  // Check if a share is expired
  const isExpired = (share: CalendarShare) => {
    return share.expires && isAfter(new Date(), new Date(share.expires))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => goBack('/sharing')}
                className="mr-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Share className="w-6 h-6 text-primary mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Calendar Sharing</h1>
            </div>
            <Button onClick={() => setShareDialogOpen(true)}>
              <Share className="w-4 h-4 mr-2" />
              Share Calendar
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and tabs */}
        <div className="mb-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search shares..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="outgoing">Outgoing Shares</TabsTrigger>
              <TabsTrigger value="incoming">Incoming Shares</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Shares List */}
        <div className="space-y-4">
          {activeTab === 'outgoing' ? (
            filteredShares.length > 0 ? (
              filteredShares.map((share) => (
                <Card 
                  key={share.id} 
                  className={cn(
                    "border-0 shadow-md",
                    isExpired(share) && "opacity-70"
                  )}
                >
                  <CardHeader className="pb-2 flex flex-row items-start justify-between">
                    <div>
                      <div className="flex items-center">
                        <CardTitle className="text-base flex items-center">
                          {share.shareType === 'contact' && <User className="h-5 w-5 mr-2" />}
                          {share.shareType === 'group' && <Users className="h-5 w-5 mr-2" />}
                          {share.shareType === 'email' && <Mail className="h-5 w-5 mr-2" />}
                          {share.shareType === 'link' && <Link className="h-5 w-5 mr-2" />}
                          {share.recipient.name}
                        </CardTitle>
                        {isExpired(share) && (
                          <Badge variant="outline" className="ml-2 text-red-500 border-red-200">
                            Expired
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        Shared {format(new Date(share.created), 'MMM d, yyyy')}
                        {share.expires && (
                          <span className="ml-2">
                            • Expires {format(new Date(share.expires), 'MMM d, yyyy')}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        className={cn(
                          "capitalize flex items-center gap-1",
                          getPrivacyDetails(share.privacyLevel).class
                        )}
                      >
                        {getPrivacyDetails(share.privacyLevel).icon}
                        {share.privacyLevel.replace('_', ' ')}
                      </Badge>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => router.push(`/sharing/${share.id}/edit`)}>
                            <Settings className="h-4 w-4 mr-2" />
                            Edit Settings
                          </DropdownMenuItem>
                          {share.shareType === 'link' && share.token && (
                            <DropdownMenuItem onClick={() => handleCopyToken(share.token!)}>
                              <ClipboardCopy className="h-4 w-4 mr-2" />
                              Copy Link
                            </DropdownMenuItem>
                          )}
                          {share.shareType === 'link' && (
                            <DropdownMenuItem onClick={() => handleRegenerateToken(share.id)}>
                              <RefreshCcw className="h-4 w-4 mr-2" />
                              Regenerate Link
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              setSelectedShareId(share.id)
                              setShowDeleteDialog(true)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Share
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    {/* Recipient info */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                      <div className="text-sm flex items-center">
                        <span className="text-gray-500 mr-2">Shared with:</span>
                        <Badge variant="outline" className="capitalize">
                          {share.shareType}
                        </Badge>
                        {share.recipient.email && (
                          <span className="ml-2 text-gray-700">{share.recipient.email}</span>
                        )}
                      </div>
                      <div className="text-sm flex items-center mt-2 sm:mt-0">
                        <span className="text-gray-500 mr-2">Allow resharing:</span>
                        <span className="text-gray-700">
                          {share.allowResharing ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Shared calendars */}
                    <div className="mb-2">
                      <span className="text-sm text-gray-500">Shared calendars:</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {share.calendars.map(calId => {
                        const calendar = demoCalendars.find(c => c.id === calId)
                        return calendar ? (
                          <div key={calId} className="flex items-center">
                            <div 
                              className="w-3 h-3 rounded-full mr-1"
                              style={{ backgroundColor: calendar.color }}
                            />
                            <span className="text-sm">{calendar.name}</span>
                          </div>
                        ) : null
                      })}
                      {share.calendars.length === 0 && (
                        <span className="text-sm text-gray-500">No calendars shared</span>
                      )}
                    </div>
                    
                    {/* Share link for link shares */}
                    {share.shareType === 'link' && share.token && (
                      <div className="mt-2 flex items-center">
                        <div className="relative flex-grow">
                          <Input
                            value={`https://polyharmony.app/share/${share.token}`}
                            readOnly
                            className="pr-24"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7"
                            onClick={() => handleCopyToken(share.token!)}
                          >
                            {tokenCopied === share.token ? 'Copied!' : 'Copy'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-0 shadow-md">
                <CardContent className="text-center py-12">
                  <Share className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No outgoing shares yet
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Share your calendar with contacts, groups, or create a shareable link
                  </p>
                  <Button onClick={() => setShareDialogOpen(true)}>
                    <Share className="w-4 h-4 mr-2" />
                    Share Calendar
                  </Button>
                </CardContent>
              </Card>
            )
          ) : (
            // Incoming shares (demo has none)
            <Card className="border-0 shadow-md">
              <CardContent className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No incoming shares
                </h3>
                <p className="text-gray-600">
                  No one has shared their calendar with you yet
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        contacts={demoContacts}
        groups={demoGroups}
        calendars={demoCalendars}
        onShare={handleCreateShare}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Share?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this share and revoke access. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteShare} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Utility function for conditional classnames
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

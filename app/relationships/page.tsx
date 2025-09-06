'use client';

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type Relationship } from '@/lib/supabase/types'
import { useRealtimeRelationships } from '@/hooks/use-realtime-relationships'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { RealtimeDebugPanel } from '@/components/debug/RealtimeDebugPanel'
import { ArrowLeft, Plus, Users, Search, Edit, Trash2, Mail, Calendar, Send, Clock, CheckCircle, XCircle, Activity, AlertTriangle, Wifi, WifiOff } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { getPrivacyLevelBadge } from '@/lib/privacy-utils';

export default function RelationshipsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [resendingInvitations, setResendingInvitations] = useState<Set<string>>(new Set())
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { toast } = useToast()

  // Use enhanced real-time relationships hook with all bulletproof features
  const { 
    relationships: realtimeRelationships, 
    loading: realtimeLoading, 
    error: realtimeError,
    connectionStatus,
    isOnline,
    authState,
    optimisticUpdate,
    optimisticDelete,
    forceReconnect,
    getConnectionStats
  } = useRealtimeRelationships({ 
    enableOptimisticUpdates: true,
    enableOfflineSupport: true,
    maxReconnectAttempts: 5
  })

  // Use real-time data
  const relationships = realtimeRelationships
  const loading = realtimeLoading
  
  // Enhanced error handling with connection status
  const hasConnectionIssues = connectionStatus === 'error' || connectionStatus === 'disconnected'
  const isReconnecting = connectionStatus === 'reconnecting'
  const hasAuthIssues = !authState.isAuthenticated || authState.error

  useEffect(() => {
    if (!user) {
      router.push('/auth/signin')
      return
    }
    
  }, [user, router])

  const handleDelete = async (relationshipId: string) => {
    if (!confirm('Delete this connection? This will not remove events, only unlink the connection.')) return
    try {
      // Optimistic delete
      optimisticDelete(relationshipId)
      
      const { error } = await supabase
        .from('relationships')
        .delete()
        .eq('id', relationshipId)
        .eq('user_id', user?.id)
      
      if (error) {
        // Rollback optimistic update on error by refetching
        console.error('Delete failed, real-time will restore the relationship')
        throw error
      }
      
      toast({ title: 'Connection deleted' })
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: 'Failed to delete connection' })
    }
  }

  const handleResendInvitation = async (relationship: Relationship) => {
    if (!relationship.partner_email) return
    setResendingInvitations(prev => new Set(prev).add(relationship.id))
    try {
      const response = await fetch('/api/invitations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: relationship.partner_email,
          message: `${user?.email || 'Someone'} would like to connect with you as their ${relationship.relationship_type}. They've added you to their calendar network and would like to share events with you.`,
          invitation_type: 'relationship_invitation'
        }),
      })
      const result = await response.json()
      if (result.success) {
        const updatedRelationship = {
          ...relationship,
          invitation_id: result.invitation?.id,
          invitation_status: 'sent' as const,
          invitation_sent_at: new Date().toISOString()
        }
        
        // Optimistic update
        optimisticUpdate(updatedRelationship)
        
        // Save to database
        await supabase
          .from('relationships')
          .update({
            invitation_id: result.invitation?.id,
            invitation_status: 'sent',
            invitation_sent_at: new Date().toISOString()
          })
          .eq('id', relationship.id)
        toast({
          title: 'Invitation sent!',
          description: `A new invitation has been sent to ${relationship.partner_email}`
        })
      } else {
        toast({
          title: 'Failed to send invitation',
          description: result.error || 'Please try again later',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error resending invitation:', error)
      toast({
        title: 'Failed to send invitation',
        description: 'Please try again later',
        variant: 'destructive'
      })
    } finally {
      setResendingInvitations(prev => {
        const newSet = new Set(prev)
        newSet.delete(relationship.id)
        return newSet
      })
    }
  }

  const filteredRelationships = relationships.filter(relationship =>
    relationship.partner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    relationship.relationship_type?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRelationshipTypeLabel = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getInvitationStatusBadge = (status?: string | null) => {
    if (!status) return null
    const badges = {
      pending: { icon: Clock, label: 'Invitation Pending', variant: 'outline' as const, color: 'text-yellow-600' },
      sent: { icon: Send, label: 'Invitation Sent', variant: 'secondary' as const, color: 'text-blue-600' },
      accepted: { icon: CheckCircle, label: 'Invitation Accepted', variant: 'default' as const, color: 'text-green-600' },
      declined: { icon: XCircle, label: 'Invitation Declined', variant: 'destructive' as const, color: 'text-red-600' }
    }
    return badges[status as keyof typeof badges] || null
  }

  const getCardStyling = (hexColor: string) => {
    if (!hexColor || hexColor === '#6B7280') {
      return {
        style: {},
        className: "border-border shadow-lg bg-card hover:shadow-xl transition-all duration-300"
      }
    }
    const hex = hexColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    return {
      style: {
        backgroundColor: `rgba(${r}, ${g}, ${b}, 0.15)`,
        borderColor: `rgba(${r}, ${g}, ${b}, 0.4)`,
        borderWidth: '2px',
        borderStyle: 'solid'
      },
      className: "shadow-lg hover:shadow-xl transition-all duration-300"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="mr-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Users className="w-6 h-6 text-primary mr-3" />
              <h1 className="text-xl font-bold text-foreground">Connections</h1>
              
              {/* Real-time status indicators */}
              <div className="flex items-center space-x-2 ml-4">
                {/* Network Status */}
                {isOnline ? (
                  <div title="Online">
                    <Wifi className="w-4 h-4 text-green-500" />
                  </div>
                ) : (
                  <div title="Offline">
                    <WifiOff className="w-4 h-4 text-red-500" />
                  </div>
                )}
                
                {/* Connection Status */}
                <div 
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' :
                    connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? 'bg-yellow-500 animate-pulse' :
                    'bg-red-500'
                  }`}
                  title={`Connection: ${connectionStatus}`}
                />
                
                {/* Debug Panel Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDebugPanel(true)}
                  className="text-xs"
                  title="Open Real-time Debug Panel"
                >
                  <Activity className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Connection Issues Alert */}
            {(hasConnectionIssues || hasAuthIssues || isReconnecting) && (
              <div className="flex items-center space-x-2">
                {hasAuthIssues && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Auth Issue
                  </Badge>
                )}
                {hasConnectionIssues && (
                  <Badge variant="destructive" className="text-xs">
                    <WifiOff className="w-3 h-3 mr-1" />
                    Disconnected
                  </Badge>
                )}
                {isReconnecting && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1 animate-pulse" />
                    Reconnecting
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={forceReconnect}
                  disabled={isReconnecting}
                  className="text-xs"
                >
                  Reconnect
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Connection Status Banner */}
        {realtimeError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <div className="font-medium text-red-800">Connection Issue</div>
                  <div className="text-sm text-red-700">{realtimeError}</div>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={forceReconnect}
                  disabled={isReconnecting}
                >
                  Retry Connection
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDebugPanel(true)}
                >
                  Debug Info
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search connections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
        </div>
        {/* Connections Grid */}
        {filteredRelationships.length === 0 ? (
          <Card className="border-border shadow-lg bg-card">
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchTerm ? 'No connections found' : 'No connections yet'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm
                  ? 'Try adjusting your search terms'
                  : 'Add your first connection to start organizing your relationship network'}
              </p>
              {!searchTerm && (
                <Button onClick={() => router.push('/relationships/add')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Connection
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRelationships.map((relationship) => {
              const cardStyling = getCardStyling(relationship.color || '#6b7280')
              return (
                <Card
                  key={relationship.id}
                  className={cardStyling.className}
                  style={cardStyling.style}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg" style={{ color: relationship.color || 'inherit' }}>
                          {relationship.partner_name || 'Unknown Connection'}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {getRelationshipTypeLabel(relationship.relationship_type)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Badge {...getPrivacyLevelBadge(relationship.privacy_level || 'limited_access')} />
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 touch-target"
                            onClick={() => router.push(`/relationships/${relationship.id}/edit`)}
                          >
                            <Edit className="w-5 h-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-red-600 hover:text-red-700 touch-target"
                            onClick={() => handleDelete(relationship.id)}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {relationship.partner_email && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Mail className="w-4 h-4 mr-2" />
                          {relationship.partner_email}
                        </div>
                      </div>
                    )}
                    {/* Invitation Status */}
                    {relationship.partner_email && (
                      <div className="space-y-2">
                        {(() => {
                          const statusBadge = getInvitationStatusBadge(relationship.invitation_status)
                          if (statusBadge) {
                            const Icon = statusBadge.icon
                            return (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center text-xs">
                                  <Icon className={`w-3 h-3 mr-1 ${statusBadge.color}`} />
                                  <span className={statusBadge.color}>{statusBadge.label}</span>
                                  {relationship.invitation_sent_at && (
                                    <span className="text-muted-foreground ml-2">
                                      {format(new Date(relationship.invitation_sent_at), 'MMM d')}
                                    </span>
                                  )}
                                </div>
                                {/* Resend Invitation Button */}
                                {(relationship.invitation_status === 'pending' || relationship.invitation_status === 'sent') && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => handleResendInvitation(relationship)}
                                    disabled={resendingInvitations.has(relationship.id)}
                                  >
                                    {resendingInvitations.has(relationship.id) ? (
                                      <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1" />
                                    ) : (
                                      <Send className="w-3 h-3 mr-1" />
                                    )}
                                    {resendingInvitations.has(relationship.id) ? 'Sending...' : 'Resend'}
                                  </Button>
                                )}
                              </div>
                            )
                          } else if (!relationship.invitation_status) {
                            return (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">No invitation sent</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs"
                                  onClick={() => handleResendInvitation(relationship)}
                                  disabled={resendingInvitations.has(relationship.id)}
                                >
                                  {resendingInvitations.has(relationship.id) ? (
                                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1" />
                                  ) : (
                                    <Send className="w-3 h-3 mr-1" />
                                  )}
                                  {resendingInvitations.has(relationship.id) ? 'Sending...' : 'Send Invitation'}
                                </Button>
                              </div>
                            )
                          }
                          return null
                        })()}
                      </div>
                    )}
                    {/* Additional relationship details */}
                    {relationship.start_date && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-2" />
                        Started {format(new Date(relationship.start_date), 'MMM d, yyyy')}
                      </div>
                    )}
                    {relationship.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {relationship.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
        
        {/* Debug Panel */}
        <RealtimeDebugPanel 
          isVisible={showDebugPanel}
          onClose={() => setShowDebugPanel(false)}
        />
      </div>
    </div>
  )
}

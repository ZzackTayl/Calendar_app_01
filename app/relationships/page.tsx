'use client';

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type Relationship } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Plus, Users, Search, Edit, Trash2, Mail, Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { DemoStore } from '@/lib/demo-store'
import { useToast } from '@/hooks/use-toast'

export default function RelationshipsPage() {
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const { user, demoMode } = useAuth()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { toast } = useToast()

  useEffect(() => {
    if (!user && !demoMode) {
      router.push('/auth/signin')
      return
    }

    fetchRelationships()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, demoMode])

  const fetchRelationships = async () => {
    try {
      if (demoMode) {
        const uid = user?.id || 'demo-user'
        const data = DemoStore.listRelationships(uid)
        setRelationships(data as any)
        return
      }
      const { data, error } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setRelationships(data || [])
    } catch (error) {
      console.error('Error fetching relationships:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (relationshipId: string) => {
    if (!confirm('Delete this connection? This will not remove events, only unlink the connection.')) return
    try {
      if (demoMode) {
        DemoStore.deleteRelationship(relationshipId)
        setRelationships((prev) => prev.filter((r) => r.id !== relationshipId))
        toast({ title: 'Connection deleted' })
        return
      }
      const { error } = await supabase
        .from('relationships')
        .delete()
        .eq('id', relationshipId)
        .eq('user_id', user?.id)
      if (error) throw error
      setRelationships((prev) => prev.filter((r) => r.id !== relationshipId))
      toast({ title: 'Connection deleted' })
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: 'Failed to delete connection' })
    }
  }

  const filteredRelationships = relationships.filter(relationship =>
    relationship.partner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    relationship.relationship_type?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRelationshipTypeLabel = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getPrivacyLevelBadge = (level: string) => {
    const badges = {
      full_access: { label: 'Full Access', variant: 'default' as const },
      limited_access: { label: 'Limited', variant: 'secondary' as const },
      no_access: { label: 'Private', variant: 'outline' as const }
    }
    return badges[level as keyof typeof badges] || badges.limited_access
  }

  // Helper function to convert hex color to visible background with border
  const getCardStyling = (hexColor: string) => {
    if (!hexColor || hexColor === '#6B7280') {
      return {
        style: {},
        className: "border-border shadow-lg bg-card hover:shadow-xl transition-all duration-300"
      }
    }
    
    // Convert hex to RGB
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
            </div>
            <Button onClick={() => router.push('/relationships/add')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Connection
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  : 'Add your first connection to start organizing your relationship network'
                }
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
              const cardStyling = getCardStyling(relationship.color)
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
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="w-4 h-4 mr-2" />
                      {relationship.partner_email}
                    </div>
                  )}

                </CardContent>
              </Card>
            )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
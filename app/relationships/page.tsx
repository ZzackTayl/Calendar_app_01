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
    if (!confirm('Delete this relationship? This will not remove events, only unlink the partner.')) return
    try {
      if (demoMode) {
        DemoStore.deleteRelationship(relationshipId)
        setRelationships((prev) => prev.filter((r) => r.id !== relationshipId))
        toast({ title: 'Relationship deleted' })
        return
      }
      const { error } = await supabase
        .from('relationships')
        .delete()
        .eq('id', relationshipId)
        .eq('user_id', user?.id)
      if (error) throw error
      setRelationships((prev) => prev.filter((r) => r.id !== relationshipId))
      toast({ title: 'Relationship deleted' })
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: 'Failed to delete relationship' })
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/dashboard')}
                className="mr-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Users className="w-6 h-6 text-primary mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Relationships</h1>
            </div>
            <Button onClick={() => router.push('/relationships/add')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Partner
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search relationships..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Relationships Grid */}
        {filteredRelationships.length === 0 ? (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm ? 'No relationships found' : 'No relationships yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : 'Add your first partner to start organizing your polyamorous life'
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => router.push('/relationships/add')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Partner
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRelationships.map((relationship) => (
              <Card 
                key={relationship.id}
                className="border-0 shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all duration-300 cursor-pointer group"
                onClick={() => router.push(`/relationships/${relationship.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 relationship-color-dot"
                        data-color={relationship.color || '#6B7280'}
                      />
                      <div>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {relationship.partner_name || 'Unknown Partner'}
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          {getRelationshipTypeLabel(relationship.relationship_type)}
                        </p>
                      </div>
                    </div>
                    <Badge {...getPrivacyLevelBadge(relationship.privacy_level || 'limited_access')} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {relationship.partner_email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-2" />
                      {relationship.partner_email}
                    </div>
                  )}
                  {relationship.start_date && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      Since {format(new Date(relationship.start_date), 'MMM d, yyyy')}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-500">
                      Added {format(new Date(relationship.created_at), 'MMM d, yyyy')}
                    </span>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/relationships/${relationship.id}/edit`)
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(relationship.id)
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats */}
        {relationships.length > 0 && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur mt-8">
            <CardContent className="py-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{relationships.length}</p>
                  <p className="text-sm text-gray-600">Total Partners</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-secondary">
                    {relationships.filter(r => r.relationship_type === 'primary').length}
                  </p>
                  <p className="text-sm text-gray-600">Primary</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-accent">
                    {relationships.filter(r => r.relationship_type === 'secondary').length}
                  </p>
                  <p className="text-sm text-gray-600">Secondary</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {relationships.filter(r => r.privacy_level === 'full_access').length}
                  </p>
                  <p className="text-sm text-gray-600">Full Access</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
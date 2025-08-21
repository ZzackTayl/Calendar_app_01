'use client';

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { type Relationship } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  ArrowLeft, 
  Plus, 
  Users, 
  Search, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  Tag,
  Filter,
  Download,
  Upload,
  Check,
  X
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { DemoStore } from '@/lib/demo-store'
import { useToast } from '@/hooks/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from '@/components/ui/checkbox'

// Extended Relationship type with additional contact fields
interface Contact extends Relationship {
  tags?: string[]
  phone?: string
  address?: string
  birthday?: string
  contact_frequency?: 'frequent' | 'regular' | 'occasional' | 'rare'
  last_contact?: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const { user, demoMode } = useAuth()
  const router = useRouter()
  const supabase = createSupabaseClient()
  const { toast } = useToast()

  // For demo purposes - populate with some tags
  const availableTags = ['Family', 'Friend', 'Work', 'Close', 'Primary', 'Secondary', 'Metamour']

  useEffect(() => {
    if (!user && !demoMode) {
      router.push('/auth/signin')
      return
    }

    fetchContacts()
  }, [user, router, demoMode])

  const fetchContacts = async () => {
    try {
      if (demoMode) {
        const uid = user?.id || 'demo-user'
        const data = DemoStore.listRelationships(uid) as Contact[]
        
        // Add some demo tags and contact info
        const enhancedData = data.map((contact, index) => ({
          ...contact,
          tags: [
            availableTags[index % availableTags.length],
            availableTags[(index + 2) % availableTags.length]
          ],
          phone: index % 3 === 0 ? `+1 555-${100 + index}-${1000 + index}` : undefined,
          contact_frequency: (['frequent', 'regular', 'occasional', 'rare'] as const)[index % 4],
          last_contact: new Date(Date.now() - (Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString()
        }))
        
        setContacts(enhancedData)
        return
      }
      
      const { data, error } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      // In real implementation, we'd fetch additional contact data from a contacts table
      // For now, we'll just use the relationship data
      setContacts(data || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (contactId: string) => {
    if (!confirm('Delete this contact? This will remove all associated data for this contact.')) return
    try {
      if (demoMode) {
        DemoStore.deleteRelationship(contactId)
        setContacts((prev) => prev.filter((r) => r.id !== contactId))
        toast({ title: 'Contact deleted' })
        return
      }
      
      const { error } = await supabase
        .from('relationships')
        .delete()
        .eq('id', contactId)
        .eq('user_id', user?.id)
        
      if (error) throw error
      
      setContacts((prev) => prev.filter((r) => r.id !== contactId))
      toast({ title: 'Contact deleted' })
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: 'Failed to delete contact' })
    }
  }

  const handleBulkDelete = async () => {
    if (!selectedContacts.length) return
    
    if (!confirm(`Delete ${selectedContacts.length} selected contacts? This cannot be undone.`)) return
    
    try {
      if (demoMode) {
        selectedContacts.forEach(id => DemoStore.deleteRelationship(id))
        setContacts(prev => prev.filter(c => !selectedContacts.includes(c.id)))
        toast({ title: `${selectedContacts.length} contacts deleted` })
        setSelectedContacts([])
        return
      }
      
      // In real implementation, we'd use a transaction to delete all contacts at once
      for (const id of selectedContacts) {
        await supabase
          .from('relationships')
          .delete()
          .eq('id', id)
          .eq('user_id', user?.id)
      }
      
      setContacts(prev => prev.filter(c => !selectedContacts.includes(c.id)))
      toast({ title: `${selectedContacts.length} contacts deleted` })
      setSelectedContacts([])
    } catch (e) {
      console.error(e)
      toast({ title: 'Error', description: 'Failed to delete contacts' })
    }
  }

  const handleImportContacts = () => {
    // This would open a file picker or a contact import interface
    // For now, we'll just simulate adding some new contacts
    if (demoMode) {
      const newContacts = [
        {
          partner_name: 'Imported Contact 1',
          relationship_type: 'other' as const,
          partner_email: 'imported1@example.com',
          tags: ['Imported', 'Friend'],
          color: '#6366F1'
        },
        {
          partner_name: 'Imported Contact 2',
          relationship_type: 'other' as const,
          partner_email: 'imported2@example.com',
          tags: ['Imported', 'Work'],
          color: '#10B981'
        }
      ]
      
      const savedContacts = newContacts.map(contact => {
        return DemoStore.createRelationship({
          user_id: user?.id || 'demo-user',
          ...contact,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as any)
      })
      
      setContacts(prev => [...savedContacts as Contact[], ...prev])
      toast({ title: `${newContacts.length} contacts imported` })
    } else {
      // In real implementation, this would handle actual file upload and processing
      toast({ title: 'Import feature', description: 'This feature is not yet implemented in non-demo mode' })
    }
  }

  const toggleSelectContact = (contactId: string) => {
    setSelectedContacts(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId)
      } else {
        return [...prev, contactId]
      }
    })
  }

  const toggleSelectAll = () => {
    if (selectedContacts.length === filteredContacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(filteredContacts.map(c => c.id))
    }
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag)
      } else {
        return [...prev, tag]
      }
    })
  }

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

  const getFrequencyColor = (frequency?: string) => {
    switch (frequency) {
      case 'frequent': return 'text-green-600'
      case 'regular': return 'text-blue-600'
      case 'occasional': return 'text-amber-600'
      case 'rare': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getLastContactText = (lastContact?: string) => {
    if (!lastContact) return 'Never'
    
    try {
      const date = new Date(lastContact)
      const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
      
      if (days === 0) return 'Today'
      if (days === 1) return 'Yesterday'
      if (days < 7) return `${days} days ago`
      if (days < 30) return `${Math.floor(days / 7)} weeks ago`
      return format(date, 'MMM d, yyyy')
    } catch (e) {
      return 'Unknown'
    }
  }

  // Filter contacts by search and tags
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      contact.partner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.relationship_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.partner_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
      false

    const matchesTags = selectedTags.length === 0 || 
      (contact.tags && selectedTags.every(tag => contact.tags?.includes(tag)))
    
    return matchesSearch && matchesTags
  })

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
              <h1 className="text-xl font-bold text-gray-900">Contacts</h1>
            </div>
            <div className="flex space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleImportContacts}>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Contacts
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="w-4 h-4 mr-2" />
                    Export Contacts
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => router.push('/relationships/add')}>
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-[120px]">
                <Filter className="w-4 h-4 mr-2" />
                Tags
                {selectedTags.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter by Tags</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {availableTags.map(tag => (
                <DropdownMenuItem 
                  key={tag} 
                  onClick={() => toggleTag(tag)}
                  className="flex items-center justify-between"
                >
                  <span>{tag}</span>
                  {selectedTags.includes(tag) && <Check className="w-4 h-4" />}
                </DropdownMenuItem>
              ))}
              {selectedTags.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setSelectedTags([])}
                    className="text-red-500"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Bulk Actions Bar */}
        {selectedContacts.length > 0 && (
          <div className="bg-white/90 border border-gray-200 rounded-lg p-2 mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="select-all" 
                checked={selectedContacts.length === filteredContacts.length && filteredContacts.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <label htmlFor="select-all" className="text-sm font-medium">
                {selectedContacts.length} selected
              </label>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Tag className="w-4 h-4 mr-2" />
                Tag
              </Button>
              <Button variant="outline" size="sm">
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* Contacts Grid */}
        {filteredContacts.length === 0 ? (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur">
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchTerm || selectedTags.length > 0 ? 'No contacts found' : 'No contacts yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || selectedTags.length > 0
                  ? 'Try adjusting your search terms or filters'
                  : 'Add your first contact to start managing your relationships'
                }
              </p>
              {(!searchTerm && selectedTags.length === 0) && (
                <Button onClick={() => router.push('/relationships/add')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Contact
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContacts.map((contact) => (
              <Card 
                key={contact.id}
                className={`border-0 shadow-lg bg-white/80 backdrop-blur hover:shadow-xl transition-all duration-300 cursor-pointer group ${
                  selectedContacts.includes(contact.id) ? 'ring-2 ring-primary' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start">
                    <Checkbox 
                      className="mr-2 mt-1" 
                      checked={selectedContacts.includes(contact.id)}
                      onCheckedChange={() => toggleSelectContact(contact.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-grow" onClick={() => router.push(`/contacts/${contact.id}`)}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0 relationship-color-dot"
                            style={{ backgroundColor: contact.color || '#6B7280' }}
                          />
                          <div>
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {contact.partner_name || 'Unknown Contact'}
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                              {getRelationshipTypeLabel(contact.relationship_type)}
                            </p>
                          </div>
                        </div>
                        <Badge {...getPrivacyLevelBadge(contact.privacy_level || 'limited_access')} />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3" onClick={() => router.push(`/contacts/${contact.id}`)}>
                  {contact.partner_email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="w-4 h-4 mr-2" />
                      {contact.partner_email}
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      {contact.phone}
                    </div>
                  )}
                  
                  {/* Contact frequency and last contact */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className={`text-xs font-medium ${getFrequencyColor(contact.contact_frequency)}`}>
                        {contact.contact_frequency?.toUpperCase() || 'UNSET'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      Last contact: {getLastContactText(contact.last_contact)}
                    </span>
                  </div>
                  
                  {/* Tags */}
                  {contact.tags && contact.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {contact.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-500">
                      Added {format(new Date(contact.created_at), 'MMM d, yyyy')}
                    </span>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/contacts/${contact.id}/edit`)
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
                          handleDelete(contact.id)
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
        {contacts.length > 0 && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur mt-8">
            <CardContent className="py-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-primary">{contacts.length}</p>
                  <p className="text-sm text-gray-600">Total Contacts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-secondary">
                    {contacts.filter(r => r.relationship_type === 'primary').length}
                  </p>
                  <p className="text-sm text-gray-600">Primary</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-accent">
                    {contacts.filter(r => r.tags?.includes('Friend') || false).length}
                  </p>
                  <p className="text-sm text-gray-600">Friends</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {contacts.filter(r => r.privacy_level === 'full_access').length}
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

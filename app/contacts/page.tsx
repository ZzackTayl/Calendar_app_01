'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Filter, Download, Upload, MoreHorizontal, Star, StarOff, Edit, Trash2, Eye, Phone, Mail, Building, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { ContactForm } from '@/components/ui/contact-form'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface Contact {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  company?: string
  job_title?: string
  notes?: string
  avatar_url?: string
  is_favorite: boolean
  tags: string[]
  groups: string[]
  created_at: string
  updated_at: string
}

interface ContactTag {
  id: string
  name: string
  color: string
}

interface ContactGroup {
  id: string
  name: string
  description?: string
  color: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [showFavorites, setShowFavorites] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [tags, setTags] = useState<ContactTag[]>([])
  const [groups, setGroups] = useState<ContactGroup[]>([])
  const [companies, setCompanies] = useState<string[]>([])
  
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  // Fetch contacts from the real API
  const fetchContacts = async () => {
    try {
      setLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','))
      if (selectedGroups.length > 0) params.append('groups', selectedGroups.join(','))
      if (showFavorites) params.append('favorites', 'true')
      if (selectedCompany) params.append('company', selectedCompany)
      
      const response = await fetch(`/api/contacts?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch contacts')
      
      const data = await response.json()
      setContacts(data.contacts || [])
      setFilteredContacts(data.contacts || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
      toast({
        title: 'Error',
        description: 'Failed to load contacts',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch tags and groups for filtering
  const fetchTagsAndGroups = async () => {
    try {
      // Fetch tags
      const { data: tagsData } = await supabase
        .from('contact_tags')
        .select('*')
        .order('name')
      
      if (tagsData) setTags(tagsData)

      // Fetch groups
      const { data: groupsData } = await supabase
        .from('contact_groups')
        .select('*')
        .order('name')
      
      if (groupsData) setGroups(groupsData)

      // Extract unique companies
      const uniqueCompanies = Array.from(new Set(contacts.map(c => c.company).filter(Boolean) as string[]))
      setCompanies(uniqueCompanies)
    } catch (error) {
      console.error('Error fetching tags and groups:', error)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [searchTerm, selectedTags, selectedGroups, showFavorites, selectedCompany])

  useEffect(() => {
    fetchTagsAndGroups()
  }, [contacts])

  // Create new contact
  const createContact = async (contactData: any) => {
    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
      })

      if (!response.ok) throw new Error('Failed to create contact')

      const { contact } = await response.json()
      
      setContacts(prev => [contact, ...prev])
      setFilteredContacts(prev => [contact, ...prev])
      
      toast({
        title: 'Success',
        description: 'Contact created successfully'
      })
      
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error('Error creating contact:', error)
      toast({
        title: 'Error',
        description: 'Failed to create contact',
        variant: 'destructive'
      })
    }
  }

  // Update contact
  const updateContact = async (contactData: any) => {
    try {
      const response = await fetch('/api/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactData)
      })

      if (!response.ok) throw new Error('Failed to update contact')

      const { contact } = await response.json()
      
      setContacts(prev => prev.map(c => c.id === contact.id ? contact : c))
      setFilteredContacts(prev => prev.map(c => c.id === contact.id ? contact : c))
      
      toast({
        title: 'Success',
        description: 'Contact updated successfully'
      })
      
      setEditingContact(null)
    } catch (error) {
      console.error('Error updating contact:', error)
      toast({
        title: 'Error',
        description: 'Failed to update contact',
        variant: 'destructive'
      })
    }
  }

  // Delete contact
  const deleteContact = async (contactId: string) => {
    try {
      const response = await fetch(`/api/contacts?id=${contactId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete contact')

      setContacts(prev => prev.filter(c => c.id !== contactId))
      setFilteredContacts(prev => prev.filter(c => c.id !== contactId))
      
      toast({
        title: 'Success',
        description: 'Contact deleted successfully'
      })
    } catch (error) {
      console.error('Error deleting contact:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete contact',
        variant: 'destructive'
      })
    }
  }

  // Toggle favorite status
  const toggleFavorite = async (contact: Contact) => {
    try {
      const response = await fetch('/api/contacts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: contact.id,
          is_favorite: !contact.is_favorite
        })
      })

      if (!response.ok) throw new Error('Failed to update contact')

      const { contact: updatedContact } = await response.json()
      
      setContacts(prev => prev.map(c => c.id === contact.id ? updatedContact : c))
      setFilteredContacts(prev => prev.map(c => c.id === contact.id ? updatedContact : c))
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast({
        title: 'Error',
        description: 'Failed to update contact',
        variant: 'destructive'
      })
    }
  }

  // Handle import (real implementation)
  const handleImport = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) throw new Error('Failed to import contacts')

      const result = await response.json()
      
      toast({
        title: 'Import Complete',
        description: `Successfully imported ${result.successful_imports} contacts`
      })
      
      // Refresh contacts
      fetchContacts()
    } catch (error) {
      console.error('Error importing contacts:', error)
      toast({
        title: 'Error',
        description: 'Failed to import contacts',
        variant: 'destructive'
      })
    }
  }

  // Handle export
  const handleExport = async () => {
    try {
      const response = await fetch('/api/contacts/export')
      if (!response.ok) throw new Error('Failed to export contacts')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'contacts.csv'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Export Complete',
        description: 'Contacts exported successfully'
      })
    } catch (error) {
      console.error('Error exporting contacts:', error)
      toast({
        title: 'Error',
        description: 'Failed to export contacts',
        variant: 'destructive'
      })
    }
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const getContactStats = () => {
    const total = contacts.length
    const favorites = contacts.filter(c => c.is_favorite).length
    const withEmail = contacts.filter(c => c.email).length
    const withPhone = contacts.filter(c => c.phone).length
    
    return { total, favorites, withEmail, withPhone }
  }

  const stats = getContactStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">Manage your contacts and relationships</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
                <DialogDescription>
                  Create a new contact with all their details
                </DialogDescription>
              </DialogHeader>
              <ContactForm 
                onSubmit={createContact}
                tags={tags}
                groups={groups}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Favorites</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.favorites}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Email</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withEmail}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Phone</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withPhone}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <Select value={selectedTags[0] || ''} onValueChange={(value) => setSelectedTags(value ? [value] : [])}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All tags</SelectItem>
                  {tags.map(tag => (
                    <SelectItem key={tag.id} value={tag.name}>{tag.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Groups</label>
              <Select value={selectedGroups[0] || ''} onValueChange={(value) => setSelectedGroups(value ? [value] : [])}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All groups</SelectItem>
                  {groups.map(group => (
                    <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Company</label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All companies</SelectItem>
                  {companies.map(company => (
                    <SelectItem key={company} value={company}>{company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center gap-4 mt-4">
            <Button
              variant={showFavorites ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFavorites(!showFavorites)}
            >
              <Star className="h-4 w-4 mr-2" />
              Favorites Only
            </Button>
            
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                Grid
              </Button>
              <Button
                variant={viewMode === 'list' ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredContacts.map((contact) => (
            <Card key={contact.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={contact.avatar_url} />
                    <AvatarFallback>{getInitials(contact.first_name, contact.last_name)}</AvatarFallback>
                  </Avatar>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setEditingContact(contact)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleFavorite(contact)}>
                        {contact.is_favorite ? (
                          <>
                            <StarOff className="h-4 w-4 mr-2" />
                            Remove from Favorites
                          </>
                        ) : (
                          <>
                            <Star className="h-4 w-4 mr-2" />
                            Add to Favorites
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => deleteContact(contact.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {contact.first_name} {contact.last_name}
                    {contact.is_favorite && <Star className="h-4 w-4 ml-2 text-yellow-500 inline" />}
                  </CardTitle>
                  {contact.job_title && contact.company && (
                    <CardDescription>
                      {contact.job_title} at {contact.company}
                    </CardDescription>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {contact.email && (
                  <div className="flex items-center text-sm">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <a href={`mailto:${contact.email}`} className="hover:underline">
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <a href={`tel:${contact.phone}`} className="hover:underline">
                      {contact.phone}
                    </a>
                  </div>
                )}
                {contact.company && (
                  <div className="flex items-center text-sm">
                    <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                    {contact.company}
                  </div>
                )}
                
                {(contact.tags.length > 0 || contact.groups.length > 0) && (
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {contact.groups.map(group => (
                      <Badge key={group} variant="outline" className="text-xs">
                        {group}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4">Contact</th>
                    <th className="text-left p-4">Email</th>
                    <th className="text-left p-4">Phone</th>
                    <th className="text-left p-4">Company</th>
                    <th className="text-left p-4">Tags</th>
                    <th className="text-left p-4">Groups</th>
                    <th className="text-right p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact) => (
                    <tr key={contact.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarImage src={contact.avatar_url} />
                            <AvatarFallback>{getInitials(contact.first_name, contact.last_name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">
                              {contact.first_name} {contact.last_name}
                              {contact.is_favorite && <Star className="h-4 w-4 ml-2 text-yellow-500 inline" />}
                            </div>
                            {contact.job_title && (
                              <div className="text-sm text-muted-foreground">{contact.job_title}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        {contact.email ? (
                          <a href={`mailto:${contact.email}`} className="hover:underline">
                            {contact.email}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {contact.phone ? (
                          <a href={`tel:${contact.phone}`} className="hover:underline">
                            {contact.phone}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        {contact.company || <span className="text-muted-foreground">-</span>}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {contact.tags.map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {contact.groups.map(group => (
                            <Badge key={group} variant="outline" className="text-xs">
                              {group}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setEditingContact(contact)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleFavorite(contact)}>
                              {contact.is_favorite ? (
                                <>
                                  <StarOff className="h-4 w-4 mr-2" />
                                  Remove from Favorites
                                </>
                              ) : (
                                <>
                                  <Star className="h-4 w-4 mr-2" />
                                  Add to Favorites
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => deleteContact(contact.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Contact Dialog */}
      {editingContact && (
        <Dialog open={!!editingContact} onOpenChange={() => setEditingContact(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Contact</DialogTitle>
              <DialogDescription>
                Update contact information
              </DialogDescription>
            </DialogHeader>
            <ContactForm 
              contact={editingContact}
              onSubmit={updateContact}
              tags={tags}
              groups={groups}
              onCancel={() => setEditingContact(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {filteredContacts.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No contacts found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedTags.length > 0 || selectedGroups.length > 0 || showFavorites || selectedCompany
                ? 'Try adjusting your filters'
                : 'Get started by adding your first contact'
              }
            </p>
            {!searchTerm && selectedTags.length === 0 && selectedGroups.length === 0 && !showFavorites && !selectedCompany && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Missing icon component
const Users = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
)

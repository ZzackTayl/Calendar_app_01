'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

// Define the form schema with Zod
const contactFormSchema = z.object({
  first_name: z.string().min(1, { message: 'First name is required' }),
  last_name: z.string().min(1, { message: 'Last name is required' }),
  email: z.string().email({ message: 'Invalid email' }).optional().or(z.literal('')).default(''),
  phone: z.string().optional().or(z.literal('')).default(''),
  company: z.string().optional().or(z.literal('')).default(''),
  job_title: z.string().optional().or(z.literal('')).default(''),
  notes: z.string().optional().or(z.literal('')).default(''),
  avatar_url: z.string().url().optional().or(z.literal('')).default(''),
  is_favorite: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  groups: z.array(z.string()).default([])
})

type ContactFormData = z.infer<typeof contactFormSchema>
type ContactFormValues = ContactFormData

interface ContactFormProps {
  contact?: ContactFormData
  onSubmit: (data: ContactFormData) => Promise<void>
  onCancel: () => void
  tags?: Array<{ id: string; name: string; color: string }>
  groups?: Array<{ id: string; name: string; color: string }>
}

export function ContactForm({ contact, onSubmit, onCancel, tags = [], groups = [] }: ContactFormProps) {
  const [newTag, setNewTag] = useState('')
  const [newGroup, setNewGroup] = useState('')
  const { toast } = useToast()

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: contact || {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company: '',
      job_title: '',
      notes: '',
      avatar_url: '',
      is_favorite: false,
      tags: [],
      groups: []
    }
  } as any)

  const watchedTags = form.watch('tags')
  const watchedGroups = form.watch('groups')

  const addTag = () => {
    if (newTag.trim() && !watchedTags.includes(newTag.trim())) {
      form.setValue('tags', [...watchedTags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    form.setValue('tags', watchedTags.filter(tag => tag !== tagToRemove))
  }

  const addGroup = () => {
    if (newGroup.trim() && !watchedGroups.includes(newGroup.trim())) {
      form.setValue('groups', [...watchedGroups, newGroup.trim()])
      setNewGroup('')
    }
  }

  const removeGroup = (groupToRemove: string) => {
    form.setValue('groups', watchedGroups.filter(group => group !== groupToRemove))
  }

  const handleSubmit = async (data: ContactFormData) => {
    try {
      await onSubmit(data)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save contact',
        variant: 'destructive'
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter first name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Enter email address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="Enter phone number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <Input placeholder="Enter company name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="job_title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job Title</FormLabel>
                <FormControl>
                  <Input placeholder="Enter job title" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="avatar_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Avatar URL</FormLabel>
              <FormControl>
                <Input placeholder="Enter avatar image URL" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Enter any additional notes about this contact"
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tags Section */}
        <div className="space-y-4">
          <div>
            <FormLabel>Tags</FormLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {watchedTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-destructive"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Add new tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Groups Section */}
        <div className="space-y-4">
          <div>
            <FormLabel>Groups</FormLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {watchedGroups.map((group) => (
                <Badge key={group} variant="outline" className="flex items-center gap-1">
                  {group}
                  <button
                    type="button"
                    onClick={() => removeGroup(group)}
                    className="ml-1 hover:text-destructive"
                    aria-label={`Remove group ${group}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                placeholder="Add new group"
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addGroup())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addGroup}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {contact ? 'Update Contact' : 'Create Contact'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

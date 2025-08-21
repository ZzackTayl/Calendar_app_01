'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { format } from 'date-fns'
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
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Calendar as CalendarIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { createSupabaseClient } from '@/lib/supabase/client'
import { DemoStore } from '@/lib/demo-store'
import { useToast } from '@/hooks/use-toast'

// Define all relationship types available
const relationshipTypes = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'nesting', label: 'Nesting' },
  { value: 'long_distance', label: 'Long Distance' },
  { value: 'casual', label: 'Casual' },
  { value: 'other', label: 'Other' }
]

// Privacy levels
const privacyLevels = [
  { value: 'full_access', label: 'Full Access' },
  { value: 'limited_access', label: 'Limited Access' },
  { value: 'no_access', label: 'No Access' }
]

// Contact frequencies
const contactFrequencies = [
  { value: 'frequent', label: 'Frequent (Daily/Weekly)' },
  { value: 'regular', label: 'Regular (Weekly/Biweekly)' },
  { value: 'occasional', label: 'Occasional (Monthly)' },
  { value: 'rare', label: 'Rare (Quarterly or less)' }
]

// Predefined colors
const colorOptions = [
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#10b981', label: 'Green' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#3b82f6', label: 'Blue' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#6b7280', label: 'Gray' }
]

// Available tags for contacts
const availableTags = [
  'Family', 'Friend', 'Work', 
  'Close', 'Primary', 'Secondary', 
  'Metamour', 'Local', 'Long Distance',
  'Partner', 'Romantic', 'Platonic', 
  'Important', 'Occasional'
]

// Define the form schema with Zod
const contactFormSchema = z.object({
  partner_name: z.string().min(1, { message: 'Name is required' }),
  partner_email: z.string().email({ message: 'Invalid email' }).optional().or(z.literal('')),
  phone: z.string().optional(),
  relationship_type: z.enum(['primary', 'secondary', 'nesting', 'long_distance', 'casual', 'other']),
  start_date: z.date().optional(),
  color: z.string().min(1, { message: 'Color is required' }),
  privacy_level: z.enum(['full_access', 'limited_access', 'no_access']).default('limited_access'),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
  address: z.string().optional(),
  birthday: z.date().optional(),
  contact_frequency: z.enum(['frequent', 'regular', 'occasional', 'rare']).optional(),
  tags: z.array(z.string()).default([])
})

type ContactFormValues = z.infer<typeof contactFormSchema>

// Default values for the form
const defaultValues: Partial<ContactFormValues> = {
  relationship_type: 'other',
  color: '#3b82f6',
  privacy_level: 'limited_access',
  is_active: true,
  tags: []
}

interface ContactFormProps {
  initialData?: any // Contact data for editing
  contactId?: string // Contact ID for editing, empty for creation
  onSuccess?: () => void // Callback after successful submit
}

export function ContactForm({ initialData, contactId, onSuccess }: ContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showColorPopover, setShowColorPopover] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const router = useRouter()
  const { user, demoMode } = useAuth()
  const supabase = createSupabaseClient()
  const { toast } = useToast()

  // Initialize form with react-hook-form
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: initialData || defaultValues
  })

  // Set initial tags
  useEffect(() => {
    if (initialData?.tags) {
      setSelectedTags(initialData.tags)
    }
  }, [initialData])

  const onSubmit = async (data: ContactFormValues) => {
    if (!user && !demoMode) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to perform this action",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Add tags to the data
      const finalData = {
        ...data,
        user_id: user?.id || 'demo-user',
        tags: selectedTags
      }

      if (demoMode) {
        if (contactId) {
          // Update existing contact
          DemoStore.updateRelationship(contactId, finalData)
          toast({ title: "Contact updated" })
        } else {
          // Create new contact
          DemoStore.createRelationship({
            ...finalData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          toast({ title: "Contact created" })
        }
        
        if (onSuccess) {
          onSuccess()
        } else {
          router.push('/contacts')
        }
        return
      }

      // Format dates for DB
      if (data.start_date) {
        finalData.start_date = data.start_date.toISOString().split('T')[0]
      }
      if (data.birthday) {
        finalData.birthday = data.birthday.toISOString().split('T')[0]
      }

      if (contactId) {
        // Update existing relationship
        const { error } = await supabase
          .from('relationships')
          .update({
            partner_name: data.partner_name,
            partner_email: data.partner_email || null,
            relationship_type: data.relationship_type,
            start_date: finalData.start_date,
            color: data.color,
            privacy_level: data.privacy_level,
            is_active: data.is_active,
            notes: data.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', contactId)
          .eq('user_id', user?.id)
        
        if (error) throw error
        
        toast({ title: "Contact updated" })
      } else {
        // Create new relationship
        const { error } = await supabase
          .from('relationships')
          .insert({
            user_id: user?.id,
            partner_name: data.partner_name,
            partner_email: data.partner_email || null,
            relationship_type: data.relationship_type,
            start_date: finalData.start_date,
            color: data.color,
            privacy_level: data.privacy_level,
            is_active: data.is_active,
            notes: data.notes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (error) throw error
        
        toast({ title: "Contact created" })
      }

      // Handle success
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/contacts')
      }
    } catch (error) {
      console.error('Error saving contact:', error)
      toast({
        title: "Error",
        description: "Failed to save contact. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          {/* Basic Information */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {/* Name */}
            <FormField
              control={form.control}
              name="partner_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="partner_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone */}
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

            {/* Relationship Type */}
            <FormField
              control={form.control}
              name="relationship_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Relationship Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {relationshipTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color Selection */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <Popover open={showColorPopover} onOpenChange={setShowColorPopover}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          type="button"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <div
                            className="w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: field.value }}
                          />
                          {colorOptions.find(color => color.value === field.value)?.label || "Select color"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64">
                        <div className="grid grid-cols-3 gap-2">
                          {colorOptions.map((color) => (
                            <Button
                              key={color.value}
                              type="button"
                              variant="outline"
                              className="p-2 h-auto"
                              onClick={() => {
                                field.onChange(color.value)
                                setShowColorPopover(false)
                              }}
                            >
                              <div
                                className="w-full h-6 rounded"
                                style={{ backgroundColor: color.value }}
                              />
                            </Button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start Date */}
            <FormField
              control={form.control}
              name="start_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Relationship Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Birthday */}
            <FormField
              control={form.control}
              name="birthday"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Birthday</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Contact Frequency */}
            <FormField
              control={form.control}
              name="contact_frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Frequency</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="How often you contact" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contactFrequencies.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Privacy Level */}
            <FormField
              control={form.control}
              name="privacy_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Privacy Level</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select privacy level" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {privacyLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Controls what information this contact can see
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Address */}
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input placeholder="Enter address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Tags */}
          <div>
            <FormLabel>Tags</FormLabel>
            <div className="border border-input rounded-md p-4 mt-1">
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedTags.map(tag => (
                  <Badge key={tag} className="flex items-center gap-1 px-3 py-1">
                    {tag}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => toggleTag(tag)}
                    />
                  </Badge>
                ))}
                {selectedTags.length === 0 && (
                  <div className="text-sm text-muted-foreground">No tags selected</div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {availableTags
                  .filter(tag => !selectedTags.includes(tag))
                  .map(tag => (
                    <Badge 
                      key={tag} 
                      variant="outline"
                      className="cursor-pointer hover:bg-primary-foreground"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Add any additional information about this contact"
                    className="min-h-[120px]" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : contactId ? 'Update Contact' : 'Create Contact'}
          </Button>
        </div>
      </form>
    </Form>
  )
}

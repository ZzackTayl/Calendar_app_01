'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { 
  Calendar as CalendarIcon,
  Check,
  Copy,
  Link,
  Mail, 
  Share,
  User,
  Users,
  Clock,
  CalendarDays
} from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { PrivacyLevelSelector, PrivacyLevel } from '@/components/ui/privacy-level-selector'

// Recipient type options
type RecipientType = 'contact' | 'group' | 'email' | 'link'

// Define share type
export interface ShareOption {
  id: string
  label: string
  value: string
  type: 'contact' | 'group' | 'other'
  icon?: React.ReactNode
  description?: string
}

// Define the form schema
const shareFormSchema = z.object({
  shareType: z.enum(['contact', 'group', 'email', 'link']),
  recipient: z.string().optional(),
  recipientEmail: z.string().email('Please enter a valid email').optional(),
  privacyLevel: z.enum(['full_access', 'limited_access', 'busy_only', 'hidden']),
  expirationEnabled: z.boolean().default(false),
  expirationDate: z.date().optional(),
  notifyRecipient: z.boolean().default(true),
  message: z.string().optional(),
  allowResharing: z.boolean().default(false),
  calendarType: z.enum(['all', 'selected']),
  selectedCalendars: z.array(z.string()).optional(),
})

export type ShareFormValues = z.infer<typeof shareFormSchema>

export interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contacts: ShareOption[]
  groups: ShareOption[]
  calendars: Array<{ id: string, name: string, color: string }>
  onShare: (values: ShareFormValues) => Promise<void>
  defaultValues?: Partial<ShareFormValues>
  children?: React.ReactNode
}

export function ShareDialog({
  open,
  onOpenChange,
  contacts,
  groups,
  calendars,
  onShare,
  defaultValues,
  children
}: ShareDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  
  // Initialize form with default values
  const form = useForm<ShareFormValues>({
    resolver: zodResolver(shareFormSchema) as any,
    defaultValues: {
      shareType: 'contact',
      privacyLevel: 'limited_access',
      expirationEnabled: false,
      notifyRecipient: true,
      allowResharing: false,
      calendarType: 'all',
      ...defaultValues
    }
  })
  
  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      form.reset({
        shareType: 'contact',
        privacyLevel: 'limited_access',
        expirationEnabled: false,
        notifyRecipient: true,
        allowResharing: false,
        calendarType: 'all',
        ...defaultValues
      })
      setShareUrl(null)
    }
  }, [open, form, defaultValues])
  
  // Watch for form value changes
  const shareType = form.watch('shareType')
  const expirationEnabled = form.watch('expirationEnabled')
  const calendarType = form.watch('calendarType')
  
  // Handle form submission
  const onSubmit = async (data: ShareFormValues) => {
    setIsSubmitting(true)
    
    try {
      await onShare(data)
      
      // If link sharing, generate a demo URL
      if (data.shareType === 'link') {
        const hash = Math.random().toString(36).substring(2, 10)
        setShareUrl(`https://polyharmony.app/share/${hash}`)
      } else {
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Error sharing calendar:', error)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Generate the Icon for the recipient type
  const getRecipientTypeIcon = (type: RecipientType) => {
    switch (type) {
      case 'contact':
        return <User className="h-4 w-4" />
      case 'group':
        return <Users className="h-4 w-4" />
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'link':
        return <Link className="h-4 w-4" />
      default:
        return <Share className="h-4 w-4" />
    }
  }
  
  // Copy share URL to clipboard
  const copyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
    }
  }
  
  // Render the appropriate form fields based on share type
  const renderRecipientField = () => {
    switch (shareType) {
      case 'contact':
        return (
          <FormField
            control={form.control}
            name="recipient"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Contact</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a contact" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {contacts.map(contact => (
                      <SelectItem key={contact.id} value={contact.id}>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          {contact.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )
      
      case 'group':
        return (
          <FormField
            control={form.control}
            name="recipient"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Group</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a group" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                          {group.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )
      
      case 'email':
        return (
          <FormField
            control={form.control}
            name="recipientEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input placeholder="Enter email address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )
      
      case 'link':
        return (
          <FormItem>
            <FormLabel>Share Link</FormLabel>
            <FormDescription>
              Create a shareable link that anyone with the link can access
            </FormDescription>
          </FormItem>
        )
      
      default:
        return null
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[525px]">
        {shareUrl ? (
          // Link generated view
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Link className="h-5 w-5 mr-2" />
                Share Link Created
              </DialogTitle>
              <DialogDescription>
                Copy this link to share your calendar
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6">
              <div className="flex items-center space-x-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="flex-1"
                />
                <Button size="sm" onClick={copyShareUrl}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              
              <div className="mt-4 p-3 bg-muted/30 rounded-md text-sm">
                <p className="font-medium">This link:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Grants <span className="font-medium">{form.getValues('privacyLevel').replace('_', ' ')}</span> access</li>
                  {expirationEnabled && (
                    <li>Expires on {format(form.getValues('expirationDate') as Date, 'PPP')}</li>
                  )}
                  <li>Can{form.getValues('allowResharing') ? '' : 'not'} be reshared by recipients</li>
                  <li>Shows {form.getValues('calendarType') === 'all' ? 'all calendars' : 'selected calendars'}</li>
                </ul>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setShareUrl(null)
                  form.reset({
                    shareType: 'contact',
                    privacyLevel: 'limited_access',
                    expirationEnabled: false,
                    notifyRecipient: true,
                    allowResharing: false,
                    calendarType: 'all',
                  })
                }}
              >
                Share with Someone Else
              </Button>
            </DialogFooter>
          </>
        ) : (
          // Share form view
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Share className="h-5 w-5 mr-2" />
                Share Calendar
              </DialogTitle>
              <DialogDescription>
                Share your calendar with contacts, groups, or via link
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Share Type Selection */}
                <FormField
                  control={form.control}
                  name="shareType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Share Type</FormLabel>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-2 gap-4"
                      >
                        <div>
                          <RadioGroupItem
                            value="contact"
                            id="contact"
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor="contact"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                          >
                            <User className="mb-2 h-6 w-6" />
                            Contact
                          </Label>
                        </div>
                        
                        <div>
                          <RadioGroupItem
                            value="group"
                            id="group"
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor="group"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                          >
                            <Users className="mb-2 h-6 w-6" />
                            Group
                          </Label>
                        </div>
                        
                        <div>
                          <RadioGroupItem
                            value="email"
                            id="email"
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor="email"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                          >
                            <Mail className="mb-2 h-6 w-6" />
                            Email
                          </Label>
                        </div>
                        
                        <div>
                          <RadioGroupItem
                            value="link"
                            id="link"
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor="link"
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                          >
                            <Link className="mb-2 h-6 w-6" />
                            Link
                          </Label>
                        </div>
                      </RadioGroup>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Recipient Field (changes based on share type) */}
                {renderRecipientField()}
                
                {/* Privacy Level Selection */}
                <FormField
                  control={form.control}
                  name="privacyLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Privacy Level</FormLabel>
                      <FormControl>
                        <PrivacyLevelSelector 
                          value={field.value}
                          onChange={field.onChange}
                          description
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Calendar Selection */}
                <FormField
                  control={form.control}
                  name="calendarType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Calendar Selection</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select calendar scope" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">
                            <div className="flex items-center">
                              <CalendarDays className="h-4 w-4 mr-2" />
                              All Calendars
                            </div>
                          </SelectItem>
                          <SelectItem value="selected">
                            <div className="flex items-center">
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              Selected Calendars
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Selected Calendars */}
                {calendarType === 'selected' && (
                  <FormField
                    control={form.control}
                    name="selectedCalendars"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel>Select Calendars to Share</FormLabel>
                          <FormDescription>
                            Choose which calendars to include in this share
                          </FormDescription>
                        </div>
                        <div className="space-y-2">
                          {calendars.map((calendar) => (
                            <FormField
                              key={calendar.id}
                              control={form.control}
                              name="selectedCalendars"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={calendar.id}
                                    className="flex items-center space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(calendar.id)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || []
                                          return checked
                                            ? field.onChange([...current, calendar.id])
                                            : field.onChange(
                                                current.filter((value) => value !== calendar.id)
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <div className="flex items-center">
                                      <div 
                                        className="w-3 h-3 rounded-full mr-2"
                                        style={{backgroundColor: calendar.color}}
                                      />
                                      <Label className="text-sm font-normal">
                                        {calendar.name}
                                      </Label>
                                    </div>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                {/* Advanced Options */}
                <div className="space-y-4 border-t pt-4">
                  {/* Expiration Date */}
                  <FormField
                    control={form.control}
                    name="expirationEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Expiration Date</FormLabel>
                          <FormDescription>
                            Set a date when this share will expire
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {expirationEnabled && (
                    <FormField
                      control={form.control}
                      name="expirationDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Expires On</FormLabel>
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
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {/* Notify Recipient */}
                  {(shareType === 'contact' || shareType === 'email') && (
                    <FormField
                      control={form.control}
                      name="notifyRecipient"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Notify Recipient</FormLabel>
                            <FormDescription>
                              Send an email notification to the recipient
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {/* Allow Resharing */}
                  <FormField
                    control={form.control}
                    name="allowResharing"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Allow Resharing</FormLabel>
                          <FormDescription>
                            Recipients can share this calendar with others
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {/* Optional Message */}
                  {(shareType === 'contact' || shareType === 'email') && form.watch('notifyRecipient') && (
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message (Optional)</FormLabel>
                          <FormControl>
                            <textarea 
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              placeholder="Add a personal message..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Sharing...' : 'Share Calendar'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// Add React imports to make TypeScript happy
import { useState } from 'react'

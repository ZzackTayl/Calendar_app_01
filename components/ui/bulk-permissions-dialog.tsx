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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from '@/components/ui/badge'
import { PrivacyLevelSelector, PrivacyLevel } from '@/components/ui/privacy-level-selector'
import { Shield, Info, ArrowRight, Check, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConflictResolutionStrategy } from '@/lib/permissions/permission-utils'

// Define permissions schema
const permissionsFormSchema = z.object({
  defaultPrivacy: z.enum(['visible', 'semi_private', 'private']),
  calendarVisibility: z.enum(['visible', 'semi_private', 'private']).optional(),
  eventDetails: z.enum(['visible', 'semi_private', 'private']).optional(),
  contactInformation: z.enum(['visible', 'semi_private', 'private']).optional(),
  conflictStrategy: z.enum(['most_restrictive', 'most_permissive', 'explicit_wins'])
})

type PermissionsFormValues = z.infer<typeof permissionsFormSchema>

export interface PermissionField {
  id: string
  label: string
  description?: string
  defaultValue?: PrivacyLevel
}

export interface BulkPermissionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  selectedCount: number
  selectedItems?: Array<{
    id: string
    name: string
    type: 'contact' | 'group' | 'event' | 'category'
    currentLevel?: PrivacyLevel
  }>
  permissionFields?: PermissionField[]
  onUpdatePermissions: (values: PermissionsFormValues, itemIds: string[]) => Promise<void>
  isSubmitting?: boolean
  children?: React.ReactNode
}

const defaultPermissionFields: PermissionField[] = [
  {
    id: 'defaultPrivacy',
    label: 'Default Privacy',
    description: 'The base permission level for all items',
    defaultValue: 'semi_private'
  },
  {
    id: 'calendarVisibility',
    label: 'Calendar Visibility',
    description: 'Controls visibility of calendar events'
  },
  {
    id: 'eventDetails',
    label: 'Event Details',
    description: 'Controls access to event details and information'
  },
  {
    id: 'contactInformation',
    label: 'Contact Information',
    description: 'Controls visibility of contact and personal information'
  }
]

export function BulkPermissionsDialog({
  open,
  onOpenChange,
  title = 'Update Permissions',
  description = 'Change privacy settings for multiple items at once',
  selectedCount,
  selectedItems = [],
  permissionFields = defaultPermissionFields,
  onUpdatePermissions,
  isSubmitting = false,
  children
}: BulkPermissionsDialogProps) {
  const [activeTab, setActiveTab] = React.useState('basic')
  
  // Get default values for the form
  const defaultValues: Partial<PermissionsFormValues> = React.useMemo(() => {
    const values: Partial<PermissionsFormValues> = {
      conflictStrategy: 'most_restrictive'
    }
    
    permissionFields.forEach(field => {
      if (field.defaultValue) {
        values[field.id as keyof PermissionsFormValues] = field.defaultValue as any
      }
    })
    
    return values
  }, [permissionFields])
  
  // Initialize form
  const form = useForm<PermissionsFormValues>({
    resolver: zodResolver(permissionsFormSchema),
    defaultValues
  })
  
  // Reset form when dialog opens
  React.useEffect(() => {
    if (open) {
      form.reset(defaultValues)
    }
  }, [open, form, defaultValues])
  
  // Handle form submission
  const onSubmit = async (data: PermissionsFormValues) => {
    try {
      await onUpdatePermissions(data, selectedItems.map(item => item.id))
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating permissions:', error)
    }
  }
  
  // Get items grouped by their current permission level
  const itemsByPermissionLevel = React.useMemo(() => {
    const result: Record<PrivacyLevel, typeof selectedItems> = {
      visible: [],
      semi_private: [],
      private: [],
      no_access: []
    }
    
    selectedItems.forEach(item => {
      if (item.currentLevel) {
        result[item.currentLevel].push(item)
      } else {
        // Default to semi_private if no current level
        result.semi_private.push(item)
      }
    })
    
    return result
  }, [selectedItems])
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
            <Badge variant="outline" className="ml-1">
              {selectedCount} selected
            </Badge>
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Settings</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Settings</TabsTrigger>
          </TabsList>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
              <TabsContent value="basic" className="space-y-4">
                {/* Info alert */}
                <div className="bg-blue-50 text-blue-800 p-3 rounded-md flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p>Permission levels apply to all selected items. Specific overrides can be set in advanced settings.</p>
                  </div>
                </div>
                
                {/* Default Privacy */}
                <FormField
                  control={form.control}
                  name="defaultPrivacy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{permissionFields[0].label}</FormLabel>
                      <FormControl>
                        <PrivacyLevelSelector
                          value={field.value}
                          onChange={field.onChange}
                          description={true}
                        />
                      </FormControl>
                      <FormDescription>
                        {permissionFields[0].description}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Current permissions summary */}
                <div className="border rounded-md p-3">
                  <p className="text-sm font-medium mb-2">Current permissions:</p>
                  <div className="space-y-2">
                    {Object.entries(itemsByPermissionLevel).map(([level, items]) => {
                      if (items.length === 0) return null
                      return (
                        <div key={level} className="flex items-center justify-between text-sm">
                          <span>{items.length} {items.length === 1 ? 'item' : 'items'} with</span>
                          <PrivacyLevelSelector
                            value={level as PrivacyLevel}
                            onChange={() => {}}
                            showBadge={true}
                            disabled={true}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                {/* Preview changes */}
                <div className="flex items-center justify-center gap-3 my-2">
                  <div className="text-center p-2 bg-muted/30 rounded-md flex-1">
                    <div className="text-sm font-medium">Before</div>
                    <div className="flex flex-wrap justify-center gap-1 mt-1">
                      {(Object.keys(itemsByPermissionLevel) as PrivacyLevel[]).map(level => {
                        const count = itemsByPermissionLevel[level].length
                        if (count === 0) return null
                        return (
                          <Badge key={level} variant="outline" className="flex gap-1">
                            <span>{count}</span>
                            <PrivacyLevelSelector
                              value={level}
                              onChange={() => {}}
                              showBadge={true}
                              disabled={true}
                            />
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <div className="text-center p-2 bg-primary/10 rounded-md flex-1">
                    <div className="text-sm font-medium">After</div>
                    <div className="flex justify-center mt-1">
                      <Badge variant="outline" className="flex gap-1">
                        <span>{selectedCount}</span>
                        <PrivacyLevelSelector
                          value={form.watch('defaultPrivacy')}
                          onChange={() => {}}
                          showBadge={true}
                          disabled={true}
                        />
                      </Badge>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="advanced" className="space-y-6">
                {/* Permissions for specific categories */}
                <div className="space-y-4">
                  {permissionFields.slice(1).map((field) => (
                    <FormField
                      key={field.id}
                      control={form.control}
                      name={field.id as any}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>{field.label}</FormLabel>
                          <FormControl>
                            <PrivacyLevelSelector
                              value={formField.value as PrivacyLevel || 'semi_private'}
                              onChange={formField.onChange}
                              description={true}
                            />
                          </FormControl>
                          <FormDescription>
                            {field.description}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                
                {/* Conflict Resolution Strategy */}
                <FormField
                  control={form.control}
                  name="conflictStrategy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conflict Resolution</FormLabel>
                      <div className="space-y-2">
                        <div className="flex flex-col space-y-1.5">
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <input
                                type="radio"
                                id="most_restrictive"
                                value="most_restrictive"
                                checked={field.value === 'most_restrictive'}
                                onChange={() => field.onChange('most_restrictive')}
                                className="rounded-full h-4 w-4 text-primary"
                              />
                            </FormControl>
                            <label 
                              htmlFor="most_restrictive" 
                              className={cn(
                                "flex items-center cursor-pointer",
                                field.value === 'most_restrictive' && "font-medium"
                              )}
                            >
                              Most Restrictive
                              {field.value === 'most_restrictive' && <Check className="h-3 w-3 ml-1" />}
                            </label>
                          </div>
                          <FormDescription className="pl-6">
                            When conflicts arise, use the most restrictive permission
                          </FormDescription>
                        </div>
                        
                        <div className="flex flex-col space-y-1.5">
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <input
                                type="radio"
                                id="most_permissive"
                                value="most_permissive"
                                checked={field.value === 'most_permissive'}
                                onChange={() => field.onChange('most_permissive')}
                                className="rounded-full h-4 w-4 text-primary"
                              />
                            </FormControl>
                            <label 
                              htmlFor="most_permissive" 
                              className={cn(
                                "flex items-center cursor-pointer",
                                field.value === 'most_permissive' && "font-medium"
                              )}
                            >
                              Most Permissive
                              {field.value === 'most_permissive' && <Check className="h-3 w-3 ml-1" />}
                            </label>
                          </div>
                          <FormDescription className="pl-6">
                            When conflicts arise, use the most permissive permission
                          </FormDescription>
                        </div>
                        
                        <div className="flex flex-col space-y-1.5">
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <input
                                type="radio"
                                id="explicit_wins"
                                value="explicit_wins"
                                checked={field.value === 'explicit_wins'}
                                onChange={() => field.onChange('explicit_wins')}
                                className="rounded-full h-4 w-4 text-primary"
                              />
                            </FormControl>
                            <label 
                              htmlFor="explicit_wins" 
                              className={cn(
                                "flex items-center cursor-pointer",
                                field.value === 'explicit_wins' && "font-medium"
                              )}
                            >
                              Explicit Wins
                              {field.value === 'explicit_wins' && <Check className="h-3 w-3 ml-1" />}
                            </label>
                          </div>
                          <FormDescription className="pl-6">
                            Explicitly set permissions always override inherited ones
                          </FormDescription>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Selected items */}
                {selectedItems.length > 0 && (
                  <div className="border rounded-md p-3 max-h-[150px] overflow-y-auto">
                    <p className="text-sm font-medium mb-2">Selected items:</p>
                    <div className="space-y-1">
                      {selectedItems.slice(0, 5).map(item => (
                        <div key={item.id} className="text-sm flex justify-between">
                          <span>{item.name}</span>
                          {item.currentLevel && (
                            <PrivacyLevelSelector
                              value={item.currentLevel}
                              onChange={() => {}}
                              showBadge={true}
                              disabled={true}
                            />
                          )}
                        </div>
                      ))}
                      {selectedItems.length > 5 && (
                        <div className="text-xs text-center text-muted-foreground">
                          + {selectedItems.length - 5} more items
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Warning */}
                <div className="flex items-center space-x-2 text-amber-600 text-sm p-3 bg-amber-50 rounded-md">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>
                    Changes to permissions will apply immediately and may affect what others can see in your calendar.
                  </span>
                </div>
              </TabsContent>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4" />
                      <span>Update Permissions</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

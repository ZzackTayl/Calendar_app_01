'use client'

import * as React from 'react'
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
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { cn } from '@/lib/utils'
import { 
  Check,
  Info, 
  AlertTriangle,
  Edit,
  Save,
  X
} from 'lucide-react'
import { PrivacyLevelSelector, PrivacyLevel } from './privacy-level-selector'

export interface EditableField<T> {
  id: string
  label: string
  type: 'text' | 'select' | 'multiselect' | 'checkbox' | 'switch' | 'privacy' | 'custom'
  options?: Array<{ value: string, label: string }>
  component?: React.ReactNode
  description?: string
  defaultValue?: T
}

export type BulkEditSchema = Record<string, z.ZodType<any>>

export type BulkEditMode = 'all' | 'selected' | 'append' | 'remove'

export interface BulkEditProps<T extends Record<string, any>> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  selectedCount: number
  fields: EditableField<any>[]
  schema: BulkEditSchema
  onSubmit: (values: Partial<T>, mode: BulkEditMode) => Promise<void>
  isSubmitting?: boolean
  children?: React.ReactNode
  fieldModes?: Partial<Record<keyof T, BulkEditMode>>
  defaultMode?: BulkEditMode
  showPreview?: boolean
  previewData?: T[]
  renderPreviewItem?: (item: T) => React.ReactNode
}

export function BulkEditDialog<T extends Record<string, any>>({
  open,
  onOpenChange,
  title,
  description,
  selectedCount,
  fields,
  schema,
  onSubmit,
  isSubmitting = false,
  children,
  fieldModes,
  defaultMode = 'all',
  showPreview = false,
  previewData = [],
  renderPreviewItem
}: BulkEditProps<T>) {
  const [fieldSelections, setFieldSelections] = React.useState<Record<string, boolean>>({})
  const [currentMode, setCurrentMode] = React.useState<BulkEditMode>(defaultMode)
  
  // Define the form schema using the provided schema
  const formSchema = z.object(schema)
  
  type FormValues = z.infer<typeof formSchema>
  
  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {} as FormValues
  })
  
  // Reset the form when the dialog opens
  React.useEffect(() => {
    if (open) {
      form.reset()
      
      // Initialize field selections
      const initialSelections: Record<string, boolean> = {}
      fields.forEach(field => {
        initialSelections[field.id] = false
      })
      setFieldSelections(initialSelections)
    }
  }, [open, form, fields])
  
  const handleSubmit = async (values: FormValues) => {
    try {
      // Filter values to only include selected fields
      const selectedValues = Object.keys(values).reduce<Partial<T>>((acc, key) => {
        if (fieldSelections[key]) {
          acc[key as keyof T] = values[key]
        }
        return acc
      }, {})
      
      // Submit the form
      await onSubmit(selectedValues, currentMode)
      onOpenChange(false)
    } catch (error) {
      console.error('Error submitting bulk edit:', error)
    }
  }
  
  const toggleField = (fieldId: string) => {
    setFieldSelections(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }))
  }
  
  const anyFieldSelected = React.useMemo(() => {
    return Object.values(fieldSelections).some(Boolean)
  }, [fieldSelections])
  
  const renderField = (field: EditableField<any>) => {
    const isSelected = fieldSelections[field.id]
    const specificMode = fieldModes?.[field.id as keyof T] || currentMode
    
    switch (field.type) {
      case 'text':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className={!isSelected ? "text-muted-foreground" : ""}>
                    {field.label}
                  </FormLabel>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleField(field.id)}
                  />
                </div>
                <FormControl>
                  <Input
                    {...formField}
                    disabled={!isSelected}
                    placeholder={isSelected ? `Enter ${field.label.toLowerCase()}` : "Field not selected"}
                  />
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )
      
      case 'select':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className={!isSelected ? "text-muted-foreground" : ""}>
                    {field.label}
                  </FormLabel>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleField(field.id)}
                  />
                </div>
                <Select
                  disabled={!isSelected}
                  onValueChange={formField.onChange}
                  value={formField.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue 
                        placeholder={isSelected ? `Select ${field.label.toLowerCase()}` : "Field not selected"} 
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {field.options?.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )
      
      case 'privacy':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className={!isSelected ? "text-muted-foreground" : ""}>
                    {field.label}
                  </FormLabel>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleField(field.id)}
                  />
                </div>
                <FormControl>
                  <PrivacyLevelSelector
                    value={formField.value}
                    onChange={formField.onChange}
                    disabled={!isSelected}
                    description={isSelected}
                  />
                </FormControl>
                {field.description && (
                  <FormDescription>{field.description}</FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        )
      
      case 'switch':
        return (
          <FormField
            key={field.id}
            control={form.control}
            name={field.id}
            render={({ field: formField }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className={!isSelected ? "text-muted-foreground" : ""}>
                    {field.label}
                  </FormLabel>
                  {field.description && (
                    <FormDescription>{field.description}</FormDescription>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Switch
                      checked={formField.value}
                      onCheckedChange={formField.onChange}
                      disabled={!isSelected}
                    />
                  </FormControl>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleField(field.id)}
                  />
                </div>
              </FormItem>
            )}
          />
        )
      
      case 'custom':
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className={!isSelected ? "text-muted-foreground" : ""}>
                {field.label}
              </Label>
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleField(field.id)}
              />
            </div>
            <div className={cn(!isSelected && "opacity-50 pointer-events-none")}>
              {field.component}
            </div>
            {field.description && (
              <p className="text-sm text-muted-foreground">{field.description}</p>
            )}
          </div>
        )
      
      default:
        return null
    }
  }
  
  const getModeIcon = (mode: BulkEditMode) => {
    switch (mode) {
      case 'all':
        return <Check className="h-4 w-4" />
      case 'selected':
        return <Edit className="h-4 w-4" />
      case 'append':
        return <Save className="h-4 w-4" />
      case 'remove':
        return <X className="h-4 w-4" />
      default:
        return null
    }
  }
  
  const getModeLabel = (mode: BulkEditMode) => {
    switch (mode) {
      case 'all':
        return 'Replace All'
      case 'selected':
        return 'Edit Selected'
      case 'append':
        return 'Append'
      case 'remove':
        return 'Remove'
      default:
        return 'Unknown'
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit className="h-5 w-5 mr-2" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
            <Badge variant="outline" className="ml-1">
              {selectedCount} selected
            </Badge>
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Mode selector for non-specific fields */}
            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-sm font-medium mb-2">Edit mode:</p>
              <div className="flex gap-2">
                {(['all', 'selected', 'append', 'remove'] as BulkEditMode[]).map(mode => (
                  <Button
                    key={mode}
                    type="button"
                    size="sm"
                    variant={mode === currentMode ? 'default' : 'outline'}
                    onClick={() => setCurrentMode(mode)}
                  >
                    <span className="mr-1">{getModeIcon(mode)}</span>
                    {getModeLabel(mode)}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <Info className="h-3 w-3 inline mr-1" />
                Select fields to modify by checking the boxes.
              </p>
            </div>
            
            <div className="space-y-4">
              {fields.map(field => renderField(field))}
            </div>
            
            {/* Preview section if enabled */}
            {showPreview && previewData.length > 0 && renderPreviewItem && (
              <div className="border rounded-md p-3">
                <p className="text-sm font-medium mb-2">Preview changes:</p>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {previewData.slice(0, 3).map((item, index) => (
                    <div key={index} className="p-2 bg-muted/30 rounded-md">
                      {renderPreviewItem(item)}
                    </div>
                  ))}
                  {previewData.length > 3 && (
                    <p className="text-xs text-center text-muted-foreground">
                      + {previewData.length - 3} more items
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {/* Warning if nothing selected */}
            {!anyFieldSelected && (
              <div className="flex items-center text-amber-600 text-sm">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <span>No fields selected for editing</span>
              </div>
            )}
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !anyFieldSelected}>
                {isSubmitting ? 'Saving...' : `Apply to ${selectedCount} items`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

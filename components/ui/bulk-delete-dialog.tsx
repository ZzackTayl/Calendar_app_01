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
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BulkDeleteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  selectedCount: number
  itemName?: string
  itemNamePlural?: string
  onDelete: () => Promise<void>
  isDeleting?: boolean
  children?: React.ReactNode
  dangerMessage?: string
  renderSelectedItems?: () => React.ReactNode
  showSelectedItems?: boolean
  className?: string
}

export function BulkDeleteDialog({
  open,
  onOpenChange,
  title = 'Confirm Deletion',
  description = 'Are you sure you want to delete the selected items? This action cannot be undone.',
  selectedCount,
  itemName = 'item',
  itemNamePlural = 'items',
  onDelete,
  isDeleting = false,
  children,
  dangerMessage,
  renderSelectedItems,
  showSelectedItems = false,
  className
}: BulkDeleteProps) {
  const formattedItemText = selectedCount === 1 ? itemName : itemNamePlural
  
  const handleDelete = async () => {
    try {
      await onDelete()
      onOpenChange(false)
    } catch (error) {
      console.error('Error deleting items:', error)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className={cn("sm:max-w-[425px]", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center text-destructive">
            <Trash2 className="h-5 w-5 mr-2" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="flex items-center justify-center p-4 bg-destructive/10 rounded-md">
            <div className="text-center">
              <p className="text-lg font-medium text-destructive">
                {selectedCount} {formattedItemText}
              </p>
              <p className="text-sm text-muted-foreground">
                will be permanently deleted
              </p>
            </div>
          </div>
          
          {showSelectedItems && renderSelectedItems && (
            <div className="border rounded-md p-3 max-h-[150px] overflow-y-auto">
              <p className="text-sm font-medium mb-2">Selected {formattedItemText}:</p>
              {renderSelectedItems()}
            </div>
          )}
          
          {dangerMessage && (
            <div className="flex items-center space-x-2 text-amber-600 text-sm p-3 bg-amber-50 rounded-md">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <p>{dangerMessage}</p>
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Delete {selectedCount} {formattedItemText}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

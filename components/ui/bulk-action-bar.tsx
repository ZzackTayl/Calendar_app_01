'use client'

import * as React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { 
  Check, 
  ChevronsUpDown, 
  Trash2, 
  Tag, 
  Mail, 
  Share2, 
  Calendar, 
  Shield, 
  X,
  Filter
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export interface BulkAction {
  id: string
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  tooltip?: string
  disabled?: boolean
}

export type SelectAllState = 'none' | 'some' | 'all'

export interface BulkActionBarProps {
  selectedCount: number
  totalCount: number
  selectAllState: SelectAllState
  onSelectAllChange: (state: SelectAllState) => void
  primaryActions: BulkAction[]
  secondaryActions?: BulkAction[]
  showDivider?: boolean
  className?: string
  hideOnEmpty?: boolean
  actionAlignment?: 'start' | 'center' | 'end' | 'space-between'
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  selectAllState,
  onSelectAllChange,
  primaryActions,
  secondaryActions = [],
  showDivider = true,
  className,
  hideOnEmpty = true,
  actionAlignment = 'end'
}: BulkActionBarProps) {
  if (hideOnEmpty && selectedCount === 0) {
    return null
  }
  
  const handleSelectAllClick = () => {
    // Toggle between none and all
    onSelectAllChange(selectAllState === 'all' ? 'none' : 'all')
  }
  
  const alignmentClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    'space-between': 'justify-between'
  }
  
  return (
    <div
      className={cn(
        "sticky top-16 z-30 w-full px-4 py-2 bg-white/90 border border-gray-200 rounded-lg shadow-sm backdrop-blur transition-all duration-200",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="select-all"
            checked={selectAllState === 'all'}
            onCheckedChange={handleSelectAllClick}
            ref={(checkbox: HTMLButtonElement | null) => {
              if (checkbox) {
                // Custom styling for indeterminate state using data attribute
                checkbox.setAttribute('data-state', 
                  selectAllState === 'some' ? 'indeterminate' : 
                  selectAllState === 'all' ? 'checked' : 'unchecked'
                )
              }
            }}
            aria-label={
              selectAllState === 'all'
                ? 'Deselect all'
                : selectAllState === 'some'
                ? 'Select all'
                : 'Select all'
            }
          />
          <label htmlFor="select-all" className="text-sm font-medium">
            {selectedCount} of {totalCount} selected
          </label>
        </div>
        
        <div className={cn("flex items-center gap-2", alignmentClasses[actionAlignment])}>
          {/* Primary actions */}
          {primaryActions.map((action) => (
            <Button
              key={action.id}
              variant={action.variant || 'secondary'}
              size="sm"
              onClick={action.onClick}
              disabled={action.disabled}
              title={action.tooltip} // Use native HTML title for now
            >
              {action.icon && <span className="mr-1">{action.icon}</span>}
              {action.label}
            </Button>
          ))}
          
          {/* Secondary actions in dropdown if they exist */}
          {secondaryActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <span className="sr-only">More actions</span>
                  <ChevronsUpDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>More Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {secondaryActions.map((action) => (
                    <DropdownMenuItem
                      key={action.id}
                      onClick={action.onClick}
                      disabled={action.disabled}
                    >
                      {action.icon && <span className="mr-2">{action.icon}</span>}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            className="ml-1"
            onClick={() => onSelectAllChange('none')}
            aria-label="Clear selection"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {showDivider && (
        <div className="absolute bottom-0 left-0 w-full h-px bg-gray-200" />
      )}
    </div>
  )
}

// Common actions presets for convenience
export const commonBulkActions = {
  delete: (onDelete: () => void): BulkAction => ({
    id: 'delete',
    label: 'Delete',
    icon: <Trash2 className="h-4 w-4" />,
    onClick: onDelete,
    variant: 'destructive',
    tooltip: 'Delete selected items'
  }),
  
  tag: (onTag: () => void): BulkAction => ({
    id: 'tag',
    label: 'Tag',
    icon: <Tag className="h-4 w-4" />,
    onClick: onTag,
    tooltip: 'Add tags to selected items'
  }),
  
  email: (onEmail: () => void): BulkAction => ({
    id: 'email',
    label: 'Email',
    icon: <Mail className="h-4 w-4" />,
    onClick: onEmail,
    tooltip: 'Send email to selected contacts'
  }),
  
  share: (onShare: () => void): BulkAction => ({
    id: 'share',
    label: 'Share',
    icon: <Share2 className="h-4 w-4" />,
    onClick: onShare,
    tooltip: 'Share selected items'
  }),
  
  schedule: (onSchedule: () => void): BulkAction => ({
    id: 'schedule',
    label: 'Schedule',
    icon: <Calendar className="h-4 w-4" />,
    onClick: onSchedule,
    tooltip: 'Schedule event with selected contacts'
  }),
  
  permissions: (onPermissions: () => void): BulkAction => ({
    id: 'permissions',
    label: 'Permissions',
    icon: <Shield className="h-4 w-4" />,
    onClick: onPermissions,
    tooltip: 'Modify permissions for selected items'
  }),
  
  filter: (onFilter: () => void): BulkAction => ({
    id: 'filter',
    label: 'Filter',
    icon: <Filter className="h-4 w-4" />,
    onClick: onFilter,
    tooltip: 'Filter selected items'
  })
}

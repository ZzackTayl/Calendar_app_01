'use client'

import * as React from 'react'
import { Check, Eye, EyeOff, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export type PrivacyLevel = 'private' | 'visible' | 'semi_private' | 'public'

export interface PrivacyOption {
  value: PrivacyLevel
  label: string
  description: string
  icon: React.ReactNode
  color: string
}

const privacyOptions: PrivacyOption[] = [
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can see event details',
    icon: <Lock className="h-4 w-4" />,
    color: 'bg-red-100 text-red-800 hover:bg-red-200'
  },
  {
    value: 'visible',
    label: 'Visible',
    description: 'Can see all details of events and calendar',
    icon: <Eye className="h-4 w-4" />,
    color: 'bg-green-100 text-green-800 hover:bg-green-200'
  },
  {
    value: 'semi_private',
    label: 'Semi-private',
    description: "Sees full details for events they're invited to, and 'busy' for other events",
    icon: <EyeOff className="h-4 w-4" />,
    color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
  },
  {
    value: 'public',
    label: 'Public',
    description: 'Visible to everyone with calendar access',
    icon: <Eye className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
  }
]

export interface PrivacyLevelSelectorProps {
  value: PrivacyLevel
  onChange: (value: PrivacyLevel) => void
  description?: boolean
  disabled?: boolean
  showBadge?: boolean
}

export function PrivacyLevelSelector({
  value,
  onChange,
  description = false,
  disabled = false,
  showBadge = false
}: PrivacyLevelSelectorProps) {
  const [open, setOpen] = React.useState(false)
  
  const selectedOption = privacyOptions.find((option) => option.value === value) || privacyOptions[0]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {showBadge ? (
          <Badge
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "flex items-center justify-between cursor-pointer",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => !disabled && setOpen(!open)}
          >
            <div className="flex items-center">
              <span className="mr-1">{selectedOption.icon}</span>
              {selectedOption.label}
            </div>
          </Badge>
        ) : (
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
          >
            <div className="flex items-center">
              <span className="mr-2">{selectedOption.icon}</span>
              {selectedOption.label}
            </div>
            <span className="ml-2 opacity-50">▼</span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="p-0 w-full min-w-[200px]">
        <Command>
          <CommandInput placeholder="Search privacy levels..." />
          <CommandEmpty>No privacy level found.</CommandEmpty>
          <CommandGroup>
            {privacyOptions.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={() => {
                  onChange(option.value as PrivacyLevel)
                  setOpen(false)
                }}
                className={cn(
                  "flex items-center gap-2 py-3",
                  option.value === value && "font-medium"
                )}
                title={option.description}
              >
                <div
                  className={cn(
                    "mr-2 flex h-7 w-7 items-center justify-center rounded-full",
                    option.color
                  )}
                >
                  {option.icon}
                </div>
                <div>
                  {option.label}
                  {description && (
                    <p className="text-xs text-muted-foreground">
                      {option.description}
                    </p>
                  )}
                </div>
                <Check
                  className={cn(
                    "ml-auto h-4 w-4",
                    option.value === value ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

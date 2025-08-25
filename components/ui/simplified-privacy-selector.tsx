'use client';

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Eye, Lock, Shield } from 'lucide-react'

export type SimplifiedPrivacyLevel = 'visible' | 'private' | 'semi_private'

interface SimplifiedPrivacySelectorProps {
  value: SimplifiedPrivacyLevel
  onChange: (level: SimplifiedPrivacyLevel) => void
  disabled?: boolean
}

const privacyOptions = [
  {
    value: 'visible' as const,
    label: 'Visible',
    description: 'All events, including those outside this group, can see my calendar',
    icon: Eye,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    value: 'private' as const,
    label: 'Private',
    description: 'Group only sees full details of events they are invited to',
    icon: Lock,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  {
    value: 'semi_private' as const,
    label: 'Semi-Private',
    description: 'People in this group only see full details for events they are invited to, and see "busy" for other events',
    icon: Shield,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  }
]

export function SimplifiedPrivacySelector({ 
  value, 
  onChange, 
  disabled = false 
}: SimplifiedPrivacySelectorProps) {
  return (
    <div className="space-y-3">
      {privacyOptions.map((option) => {
        const IconComponent = option.icon
        const isSelected = value === option.value
        
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`w-full p-4 rounded-lg border text-left transition-all ${
              isSelected
                ? `${option.bgColor} ${option.borderColor} border-2 ${option.color}`
                : 'border-gray-200 hover:border-gray-300 bg-white'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-start space-x-3">
              <IconComponent className={`w-5 h-5 mt-0.5 ${isSelected ? option.color : 'text-gray-400'}`} />
              <div className="flex-1">
                <div className={`font-medium ${isSelected ? option.color : 'text-gray-900'}`}>
                  {option.label}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {option.description}
                </p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

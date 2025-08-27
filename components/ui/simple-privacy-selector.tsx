'use client';

import React from 'react';
import { Eye, Settings, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export type SimplePrivacyLevel = 'everything' | 'custom' | 'visible_private';

export interface SimplePrivacyOption {
  value: SimplePrivacyLevel;
  title: string;
  description: string;
  icon: React.ReactNode;
  examples: string[];
  technicalMapping: 'visible' | 'private' | 'semi_private';
}

const privacyOptions: SimplePrivacyOption[] = [
  {
    value: 'everything',
    title: 'Everything',
    description: 'Your events are always visible to this group',
    icon: <Eye className="h-5 w-5" />,
    examples: [
      'They can see event titles, times, and details',
      'Perfect for close family or partners',
      'Full calendar transparency'
    ],
    technicalMapping: 'visible'
  },
  {
    value: 'custom',
    title: 'Custom',
    description: 'You decide per event, anything else is hidden',
    icon: <Settings className="h-5 w-5" />,
    examples: [
      'Choose what to share for each event',
      'Unshared events stay completely private',
      'Great for friends and social connections'
    ],
    technicalMapping: 'private'
  },
  {
    value: 'visible_private',
    title: 'Visible but Private',
    description: 'Group can see you have events but only shows "busy" for privacy',
    icon: <EyeOff className="h-5 w-5" />,
    examples: [
      'Shows you\'re busy without details',
      'Helps with scheduling around your time',
      'Ideal for work colleagues or acquaintances'
    ],
    technicalMapping: 'semi_private'
  }
];

interface SimplePrivacySelectorProps {
  value: SimplePrivacyLevel;
  onChange: (value: SimplePrivacyLevel) => void;
  disabled?: boolean;
  className?: string;
}

export function SimplePrivacySelector({ 
  value, 
  onChange, 
  disabled = false, 
  className 
}: SimplePrivacySelectorProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <Label className="text-base font-semibold text-foreground">
          Privacy Level
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          How much of your calendar should this group be able to see?
        </p>
      </div>
      
      <RadioGroup
        value={value}
        onValueChange={(newValue) => onChange(newValue as SimplePrivacyLevel)}
        disabled={disabled}
        className="space-y-3"
      >
        {privacyOptions.map((option) => (
          <Label
            key={option.value}
            htmlFor={option.value}
            className={cn(
              "cursor-pointer",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <Card 
              className={cn(
                "transition-all duration-200 hover:border-primary/50",
                value === option.value 
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                  : "hover:shadow-sm",
                disabled && "hover:border-border hover:shadow-none"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <RadioGroupItem
                    id={option.value}
                    value={option.value}
                    className="mt-1 flex-shrink-0"
                    disabled={disabled}
                  />
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "p-1.5 rounded-lg",
                        value === option.value 
                          ? "bg-primary/10 text-primary" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        {option.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {option.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {option.description}
                        </p>
                      </div>
                    </div>
                    
                    {/* Examples */}
                    <div className="ml-11 space-y-1">
                      {option.examples.map((example, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-2 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground">
                            {example}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Label>
        ))}
      </RadioGroup>
      
      {/* Helpful note */}
      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Remember:</strong> You can always change these settings later for individual group members 
          or adjust the overall group privacy level.
        </p>
      </div>
    </div>
  );
}

// Helper function to convert simple privacy level to technical privacy level
export function mapToTechnicalPrivacy(simpleLevel: SimplePrivacyLevel): 'visible' | 'private' | 'semi_private' {
  const option = privacyOptions.find(opt => opt.value === simpleLevel);
  return option?.technicalMapping || 'private';
}

// Helper function to convert technical privacy level to simple privacy level
export function mapFromTechnicalPrivacy(technicalLevel: 'visible' | 'private' | 'semi_private'): SimplePrivacyLevel {
  switch (technicalLevel) {
    case 'visible':
      return 'everything';
    case 'private':
      return 'custom';
    case 'semi_private':
      return 'visible_private';
    default:
      return 'custom';
  }
}
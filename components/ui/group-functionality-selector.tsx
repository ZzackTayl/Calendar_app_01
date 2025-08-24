'use client';

import React from 'react';
import { Users, Eye, Calendar, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export type GroupFunctionality = 'intimate' | 'social' | 'coordination' | 'professional';

export interface GroupFunctionalityOption {
  value: GroupFunctionality;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  defaultPrivacy: 'everything' | 'custom' | 'visible_private';
  colorSuggestion: string;
}

const functionalityOptions: GroupFunctionalityOption[] = [
  {
    value: 'intimate',
    title: 'Close & Personal',
    description: 'For your closest relationships with full transparency',
    icon: <Users className="h-5 w-5" />,
    features: [
      'Full calendar sharing by default',
      'Rich event details and locations',
      'Automatic notifications for changes',
      'Deep integration with relationship tracking'
    ],
    defaultPrivacy: 'everything',
    colorSuggestion: '#e11d48' // Rose
  },
  {
    value: 'social',
    title: 'Social & Flexible',
    description: 'For friends and social connections with selective sharing',
    icon: <Eye className="h-5 w-5" />,
    features: [
      'Choose what to share per event',
      'Good for varying comfort levels',
      'Balance between privacy and connection',
      'Perfect for diverse friend groups'
    ],
    defaultPrivacy: 'custom',
    colorSuggestion: '#0ea5e9' // Sky Blue
  },
  {
    value: 'coordination',
    title: 'Scheduling & Coordination',
    description: 'For coordinating schedules while maintaining privacy',
    icon: <Calendar className="h-5 w-5" />,
    features: [
      'Shows availability without details',
      'Helps with group scheduling',
      'Maintains event privacy',
      'Great for project teams or activity groups'
    ],
    defaultPrivacy: 'visible_private',
    colorSuggestion: '#059669' // Forest Green
  },
  {
    value: 'professional',
    title: 'Boundaries & Structure',
    description: 'For relationships with clear professional or personal boundaries',
    icon: <Shield className="h-5 w-5" />,
    features: [
      'Minimal calendar exposure',
      'Structured interaction patterns',
      'Clear privacy boundaries',
      'Suitable for work relationships or acquaintances'
    ],
    defaultPrivacy: 'visible_private',
    colorSuggestion: '#475569' // Slate
  }
];

interface GroupFunctionalitySelectorProps {
  value: GroupFunctionality;
  onChange: (value: GroupFunctionality) => void;
  disabled?: boolean;
  className?: string;
}

export function GroupFunctionalitySelector({ 
  value, 
  onChange, 
  disabled = false, 
  className 
}: GroupFunctionalitySelectorProps) {
  const selectedOption = functionalityOptions.find(opt => opt.value === value) || functionalityOptions[0];

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <Label className="text-base font-semibold text-foreground">
          Group Purpose
        </Label>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the approach that best fits how you want to interact with this group
        </p>
      </div>
      
      <RadioGroup
        value={value}
        onValueChange={(newValue) => onChange(newValue as GroupFunctionality)}
        disabled={disabled}
        className="space-y-3"
      >
        {functionalityOptions.map((option) => (
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
                    
                    {/* Features */}
                    <div className="ml-11 space-y-1">
                      {option.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-2 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground">
                            {feature}
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
          <strong>Note:</strong> This sets the default approach for your group. You can always customize 
          individual settings and privacy levels later.
        </p>
      </div>
    </div>
  );
}

// Helper function to get the selected option
export function getGroupFunctionalityOption(value: GroupFunctionality): GroupFunctionalityOption {
  return functionalityOptions.find(opt => opt.value === value) || functionalityOptions[0];
}
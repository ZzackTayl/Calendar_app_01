'use client';

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

// Predefined color palette optimized for accessibility and visual distinctiveness
const colorPalette = [
  // Primary colors - vibrant but accessible
  { name: 'Ocean Blue', value: '#2563eb', contrast: 'white' },
  { name: 'Forest Green', value: '#059669', contrast: 'white' },
  { name: 'Sunset Orange', value: '#ea580c', contrast: 'white' },
  { name: 'Royal Purple', value: '#7c3aed', contrast: 'white' },
  { name: 'Cherry Red', value: '#dc2626', contrast: 'white' },
  { name: 'Golden Yellow', value: '#d97706', contrast: 'white' },
  
  // Secondary colors - softer tones
  { name: 'Sky Blue', value: '#0ea5e9', contrast: 'white' },
  { name: 'Emerald', value: '#10b981', contrast: 'white' },
  { name: 'Coral', value: '#f97316', contrast: 'white' },
  { name: 'Lavender', value: '#8b5cf6', contrast: 'white' },
  { name: 'Rose', value: '#e11d48', contrast: 'white' },
  { name: 'Amber', value: '#f59e0b', contrast: 'white' },
  
  // Neutral colors - professional tones
  { name: 'Slate', value: '#475569', contrast: 'white' },
  { name: 'Stone', value: '#78716c', contrast: 'white' },
  { name: 'Zinc', value: '#71717a', contrast: 'white' },
  { name: 'Neutral', value: '#737373', contrast: 'white' },
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ColorPicker({ value, onChange, disabled = false, className }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedColor = colorPalette.find(color => color.value === value) || colorPalette[0];

  const handleColorSelect = (color: string) => {
    onChange(color);
    setIsOpen(false);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="group-color">Group Color (auto-selected)</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="group-color"
            variant="outline"
            disabled={disabled}
            className="w-full justify-start h-12 px-3"
            role="combobox"
            aria-expanded={isOpen}
            aria-label="Select group color"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: value }}
                aria-hidden="true"
              />
              <span className="flex-1 text-left">
                {selectedColor.name}
              </span>
            </div>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-foreground">
                Choose a Color
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Select a color to help identify your group
              </p>
            </div>
            
            {/* Predefined Colors Grid */}
            <div className="grid grid-cols-4 gap-3">
              {colorPalette.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className={cn(
                    "relative w-12 h-12 rounded-full border-2 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 flex flex-col items-center justify-center",
                    value === color.value 
                      ? "border-foreground shadow-lg scale-105" 
                      : "border-border hover:border-foreground/50"
                  )}
                  style={{ backgroundColor: color.value }}
                  onClick={() => handleColorSelect(color.value)}
                  title={color.name}
                  aria-label={`Select ${color.name} color`}
                >
                  {value === color.value && (
                    <Check 
                      className={cn(
                        "w-6 h-6",
                        color.contrast === 'white' ? 'text-white' : 'text-black'
                      )} 
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
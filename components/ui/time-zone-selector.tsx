'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useTimeZone } from '@/lib/time-zones/time-zone-context';
import { 
  getAllTimeZones,
  getTimeZoneDisplayName,
  getTimeZoneOffset
} from '@/lib/time-zones/time-zone-utils';
import { Input } from './input';
import { Button } from './button';
import { Clock, Search, Check, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeZoneSelectorProps {
  /**
   * Initial time zone value
   */
  value?: string;
  
  /**
   * Handler for time zone selection
   */
  onChange?: (timeZone: string) => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Whether to show the currently selected time zone
   */
  showSelected?: boolean;
  
  /**
   * Label for the selector
   */
  label?: string;
  
  /**
   * Variant for display style
   */
  variant?: 'default' | 'compact' | 'dropdown';
  
  /**
   * Custom placeholder for search input
   */
  placeholder?: string;
}

/**
 * Time Zone Selector Component
 * 
 * A component for selecting time zones with search capabilities.
 */
export function TimeZoneSelector({
  value,
  onChange,
  className,
  showSelected = true,
  label = 'Time Zone',
  variant = 'default',
  placeholder = 'Search time zones...'
}: TimeZoneSelectorProps) {
  // Get global time zone context
  const { displayTimeZone, updateUserPreferences } = useTimeZone();
  
  // State for search query and dropdown visibility
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Current selected time zone
  const selectedTimeZone = value || displayTimeZone;
  
  // Get all available time zones
  const allTimeZones = useMemo(getAllTimeZones, []);
  
  // Filter time zones based on search query
  const filteredTimeZones = useMemo(() => {
    if (!searchQuery.trim()) return allTimeZones;
    
    const query = searchQuery.toLowerCase();
    return allTimeZones.filter(tz => 
      tz.label.toLowerCase().includes(query) || 
      tz.value.toLowerCase().includes(query)
    );
  }, [allTimeZones, searchQuery]);
  
  // Handle time zone selection
  const handleTimeZoneSelect = useCallback((timeZone: string) => {
    if (onChange) {
      onChange(timeZone);
    } else {
      // If no onChange is provided, update the global context
      updateUserPreferences({ defaultTimeZone: timeZone });
    }
    
    setIsOpen(false);
    setSearchQuery('');
  }, [onChange, updateUserPreferences]);
  
  // Toggle dropdown visibility
  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);
  
  // Get display name and offset for the selected time zone
  const selectedDisplayName = useMemo(() => 
    getTimeZoneDisplayName(selectedTimeZone),
    [selectedTimeZone]
  );
  
  const selectedOffset = useMemo(() => 
    getTimeZoneOffset(selectedTimeZone),
    [selectedTimeZone]
  );
  
  // Compact variant with just a button that opens the dropdown
  if (variant === 'compact') {
    return (
      <div className={cn("relative", className)}>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={toggleDropdown}
        >
          <Clock className="h-4 w-4" />
          <span>{selectedTimeZone}</span>
          {selectedOffset && <span className="text-xs opacity-70">({selectedOffset})</span>}
        </Button>
        
        {isOpen && (
          <div className="absolute z-50 mt-1 bg-card border border-border rounded-md shadow-lg p-2 w-72 right-0">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={placeholder}
              className="mb-2"
              autoFocus
            />
            
            <div className="max-h-64 overflow-y-auto">
              {filteredTimeZones.map(tz => (
                <button
                  key={tz.value}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-left rounded-md hover:bg-accent/30",
                    selectedTimeZone === tz.value && "bg-accent text-accent-foreground font-medium"
                  )}
                  onClick={() => handleTimeZoneSelect(tz.value)}
                >
                  <div className="flex flex-col">
                    <span className="text-sm">{tz.label}</span>
                    <span className="text-xs opacity-70">{tz.value}</span>
                  </div>
                  {selectedTimeZone === tz.value && <Check className="h-4 w-4 ml-2" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Dropdown variant (button that shows time zone on click)
  if (variant === 'dropdown') {
    return (
      <div className={cn("relative", className)}>
        <button
          className={cn(
            "flex items-center gap-2 px-3 py-2 border border-input rounded-md",
            "hover:bg-accent/30 focus:outline-none focus:ring-2 focus:ring-primary",
            "text-left w-full"
          )}
          onClick={toggleDropdown}
        >
          <Globe className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1 overflow-hidden">
            <div className="text-sm truncate">{selectedDisplayName}</div>
            <div className="text-xs text-muted-foreground truncate">{selectedTimeZone}</div>
          </div>
        </button>
        
        {isOpen && (
          <div className="absolute z-50 mt-1 bg-card border border-border rounded-md shadow-lg p-2 w-72 left-0">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={placeholder}
                className="pl-8 mb-2"
                autoFocus
              />
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              {filteredTimeZones.map(tz => (
                <button
                  key={tz.value}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-left rounded-md hover:bg-accent/30",
                    selectedTimeZone === tz.value && "bg-accent text-accent-foreground font-medium"
                  )}
                  onClick={() => handleTimeZoneSelect(tz.value)}
                >
                  <div className="flex flex-col">
                    <span className="text-sm">{tz.label}</span>
                    <span className="text-xs opacity-70">{tz.value}</span>
                  </div>
                  {selectedTimeZone === tz.value && <Check className="h-4 w-4 ml-2" />}
                </button>
              ))}
              
              {filteredTimeZones.length === 0 && (
                <p className="text-sm text-muted-foreground py-2 px-3 text-center">
                  No time zones found matching &quot;{searchQuery}&quot;
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Default variant with full selector and search
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      {showSelected && (
        <div className="flex items-center gap-2 px-3 py-2 border border-input bg-background rounded-md mb-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <div className="text-sm">{selectedDisplayName}</div>
            <div className="text-xs text-muted-foreground">{selectedTimeZone} {selectedOffset}</div>
          </div>
        </div>
      )}
      
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-8"
        />
      </div>
      
      <div className="max-h-64 overflow-y-auto border border-input rounded-md">
        {filteredTimeZones.map(tz => (
          <button
            key={tz.value}
            className={cn(
              "flex items-center justify-between w-full px-3 py-2 text-left border-b border-input last:border-b-0",
              "hover:bg-accent/30",
              selectedTimeZone === tz.value && "bg-accent/20"
            )}
            onClick={() => handleTimeZoneSelect(tz.value)}
          >
            <div className="flex flex-col">
              <span className="text-sm">{tz.label}</span>
              <span className="text-xs opacity-70">{tz.value}</span>
            </div>
            {selectedTimeZone === tz.value && <Check className="h-4 w-4 text-primary ml-2" />}
          </button>
        ))}
        
        {filteredTimeZones.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No time zones found matching &quot;{searchQuery}&quot;
          </p>
        )}
      </div>
    </div>
  );
}

export default TimeZoneSelector;

'use client';

import React, { useState, useEffect } from 'react';
import { RRule, Frequency } from 'rrule';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './select';
import { Switch } from './switch';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { RadioGroup, RadioGroupItem } from './radio-group';
import { Checkbox } from './checkbox';
import { cn } from '@/lib/utils';
import { format, parseISO, addDays, addMonths, addYears, isValid } from 'date-fns';
import { Calendar } from './calendar';
import { CalendarIcon, Repeat, X, Check, ChevronDown } from 'lucide-react';
import {
  RECURRENCE_FREQUENCIES,
  DAYS_OF_WEEK,
  POSITIONS,
  INTERVAL_PRESETS,
  createRRule,
  createRRuleString,
  getRecurrenceDescription,
  RecurrencePattern,
  rruleToPattern
} from '@/lib/recurrence/recurrence-utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

interface RecurrenceEditorProps {
  /**
   * Initial recurrence rule as string
   */
  value?: string;
  
  /**
   * Start date of the event
   */
  startDate: Date;
  
  /**
   * Handler for recurrence rule changes
   */
  onChange: (rrule: string | null) => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * UI variant
   */
  variant?: 'default' | 'compact' | 'inline';
  
  /**
   * Show "No Repeat" option
   */
  showNoRepeat?: boolean;
  
  /**
   * Whether the popover is initially open
   */
  defaultOpen?: boolean;
}

/**
 * Recurrence Editor Component
 * 
 * A component for editing iCalendar recurrence rules
 */
export function RecurrenceEditor({
  value,
  startDate,
  onChange,
  className,
  variant = 'default',
  showNoRepeat = true,
  defaultOpen = false
}: RecurrenceEditorProps) {
  // State for controlling the popover
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  // State for the current recurrence pattern
  const [pattern, setPattern] = useState<RecurrencePattern>(() => {
    if (!value) {
      // Default to no recurrence
      return {
        frequency: RRule.WEEKLY,
        interval: 1
      };
    }
    
    try {
      // Parse existing recurrence rule
      return rruleToPattern(value);
    } catch (error) {
      console.error('Error parsing recurrence rule:', error);
      return {
        frequency: RRule.WEEKLY,
        interval: 1
      };
    }
  });
  
  // State for whether this is a recurring event
  const [isRecurring, setIsRecurring] = useState(!!value);
  
  // State for end type (never, after, on date)
  const [endType, setEndType] = useState<'never' | 'count' | 'until'>(
    pattern.count ? 'count' : pattern.until ? 'until' : 'never'
  );
  
  // State for end date
  const [endDate, setEndDate] = useState<Date | undefined>(pattern.until);
  
  // State for occurrence count
  const [occurrenceCount, setOccurrenceCount] = useState<number>(pattern.count || 10);
  
  // Generate human-readable description when pattern changes
  const recurrenceDescription = React.useMemo(() => {
    if (!isRecurring) {
      return 'Does not repeat';
    }
    
    try {
      // Create temporary RRule with current pattern
      const tempRRule = createRRule(pattern, startDate);
      return getRecurrenceDescription(tempRRule);
    } catch (error) {
      console.error('Error generating recurrence description:', error);
      return 'Custom recurrence';
    }
  }, [isRecurring, pattern, startDate]);
  
  // Update the pattern when end type/date/count changes
  useEffect(() => {
    const updatedPattern = { ...pattern };
    
    // Update based on end type
    if (endType === 'count') {
      updatedPattern.count = occurrenceCount;
      delete updatedPattern.until;
    } else if (endType === 'until') {
      updatedPattern.until = endDate;
      delete updatedPattern.count;
    } else {
      // 'never'
      delete updatedPattern.count;
      delete updatedPattern.until;
    }
    
    setPattern(updatedPattern);
  }, [endType, endDate, occurrenceCount]);
  
  // Update parent component when recurrence pattern changes
  useEffect(() => {
    if (!isRecurring) {
      onChange(null);
      return;
    }
    
    try {
      const rruleString = createRRuleString(pattern, startDate);
      onChange(rruleString);
    } catch (error) {
      console.error('Error creating recurrence rule:', error);
    }
  }, [isRecurring, pattern, startDate, onChange]);
  
  // Handle frequency change
  const handleFrequencyChange = (frequency: Frequency) => {
    // Reset byDay, byMonthDay, etc. when changing frequency
    const newPattern: RecurrencePattern = {
      ...pattern,
      frequency,
    };
    
    // Clear irrelevant properties based on frequency
    if (frequency !== RRule.WEEKLY) delete newPattern.byDay;
    if (frequency !== RRule.MONTHLY) {
      delete newPattern.byMonthDay;
      delete newPattern.bySetPos;
    }
    if (frequency !== RRule.YEARLY) delete newPattern.byMonth;
    
    setPattern(newPattern);
  };
  
  // Handle interval change
  const handleIntervalChange = (interval: number) => {
    setPattern({ ...pattern, interval });
  };
  
  // Handle day of week selection (for weekly)
  const handleDayOfWeekToggle = (dayIndex: number) => {
    const currentByDay = pattern.byDay || [];
    const newByDay = currentByDay.includes(dayIndex)
      ? currentByDay.filter(d => d !== dayIndex)
      : [...currentByDay, dayIndex];
    
    setPattern({ ...pattern, byDay: newByDay });
  };
  
  // Handle monthly recurrence type change
  const handleMonthlyTypeChange = (type: 'dayOfMonth' | 'dayOfWeek') => {
    if (type === 'dayOfMonth') {
      // Use day of month (e.g., 15th of each month)
      const dayOfMonth = startDate.getDate();
      setPattern({
        ...pattern,
        byMonthDay: [dayOfMonth],
        byDay: undefined,
        bySetPos: undefined
      });
    } else {
      // Use day of week (e.g., first Monday)
      const dayOfWeek = startDate.getDay();
      const weekNum = Math.ceil(startDate.getDate() / 7);
      const position = weekNum > 4 ? -1 : weekNum; // -1 for last occurrence
      
      setPattern({
        ...pattern,
        byMonthDay: undefined,
        byDay: [dayOfWeek],
        bySetPos: [position]
      });
    }
  };
  
  // Handle day of month change
  const handleDayOfMonthChange = (dayOfMonth: number) => {
    setPattern({ ...pattern, byMonthDay: [dayOfMonth] });
  };
  
  // Handle day of week position change (for monthly "first Monday" style)
  const handlePositionChange = (position: number) => {
    setPattern({ ...pattern, bySetPos: [position] });
  };
  
  // Handle day of week change for monthly position
  const handlePositionDayChange = (dayOfWeek: number) => {
    setPattern({ ...pattern, byDay: [dayOfWeek] });
  };
  
  // Simple recurring options for compact variant
  const simpleOptions = [
    { label: 'Does not repeat', value: 'none' },
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' }
  ];
  
  // Handle simple option change
  const handleSimpleOptionChange = (option: string) => {
    if (option === 'none') {
      setIsRecurring(false);
      onChange(null);
      return;
    }
    
    setIsRecurring(true);
    
    switch (option) {
      case 'daily':
        setPattern({ frequency: RRule.DAILY, interval: 1 });
        break;
      case 'weekly':
        setPattern({ 
          frequency: RRule.WEEKLY, 
          interval: 1,
          byDay: [startDate.getDay()]
        });
        break;
      case 'monthly':
        setPattern({ 
          frequency: RRule.MONTHLY, 
          interval: 1,
          byMonthDay: [startDate.getDate()]
        });
        break;
      case 'yearly':
        setPattern({ 
          frequency: RRule.YEARLY, 
          interval: 1,
          byMonth: [startDate.getMonth() + 1], // RRule months are 1-indexed
          byMonthDay: [startDate.getDate()]
        });
        break;
    }
    
    setIsOpen(false);
  };
  
  // Get the selected simple option
  const getSelectedSimpleOption = () => {
    if (!isRecurring) return 'none';
    
    switch (pattern.frequency) {
      case RRule.DAILY:
        return 'daily';
      case RRule.WEEKLY:
        return 'weekly';
      case RRule.MONTHLY:
        return 'monthly';
      case RRule.YEARLY:
        return 'yearly';
      default:
        return 'none';
    }
  };
  
  // For compact variant
  if (variant === 'compact') {
    return (
      <div className={cn("relative", className)}>
        <Select 
          value={getSelectedSimpleOption()}
          onValueChange={handleSimpleOptionChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Does not repeat" />
          </SelectTrigger>
          <SelectContent>
            {simpleOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
            <SelectItem value="custom">
              <div className="flex items-center">
                <span className="mr-2">Custom</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsOpen(true);
                  }}
                >
                  Edit
                </Button>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        
        {/* Custom recurrence popover */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <span className="hidden">Open</span>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium">Custom Recurrence</h3>
              <p className="text-sm text-muted-foreground">
                {recurrenceDescription}
              </p>
            </div>
            <div className="p-4 space-y-4">
              <RecurrenceOptions
                pattern={pattern}
                startDate={startDate}
                onFrequencyChange={handleFrequencyChange}
                onIntervalChange={handleIntervalChange}
                onDayOfWeekToggle={handleDayOfWeekToggle}
                onMonthlyTypeChange={handleMonthlyTypeChange}
                onDayOfMonthChange={handleDayOfMonthChange}
                onPositionChange={handlePositionChange}
                onPositionDayChange={handlePositionDayChange}
              />
              
              <RecurrenceEnding
                endType={endType}
                occurrenceCount={occurrenceCount}
                endDate={endDate}
                onEndTypeChange={setEndType}
                onOccurrenceCountChange={setOccurrenceCount}
                onEndDateChange={setEndDate}
              />
              
              <div className="flex justify-end gap-2 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => setIsOpen(false)}
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }
  
  // For inline variant - simplified display directly in the form
  if (variant === 'inline') {
    return (
      <div className={cn("space-y-4", className)}>
        {showNoRepeat && (
          <div className="flex items-center space-x-2">
            <Switch
              id="recurring"
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
            <Label htmlFor="recurring">Recurring event</Label>
          </div>
        )}
        
        {isRecurring && (
          <>
            <div className="text-sm text-muted-foreground mb-2">
              {recurrenceDescription}
            </div>
            
            <Select 
              value={pattern.frequency.toString()} 
              onValueChange={val => handleFrequencyChange(parseInt(val) as Frequency)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECURRENCE_FREQUENCIES.map(freq => (
                  <SelectItem key={freq.value} value={freq.value.toString()}>
                    {freq.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center space-x-2">
              <Label htmlFor="interval">Every</Label>
              <Input
                id="interval"
                type="number"
                min={1}
                max={99}
                value={pattern.interval || 1}
                onChange={e => handleIntervalChange(parseInt(e.target.value) || 1)}
                className="w-20"
              />
              <span className="text-sm">
                {pattern.frequency === RRule.DAILY && (pattern.interval === 1 ? 'day' : 'days')}
                {pattern.frequency === RRule.WEEKLY && (pattern.interval === 1 ? 'week' : 'weeks')}
                {pattern.frequency === RRule.MONTHLY && (pattern.interval === 1 ? 'month' : 'months')}
                {pattern.frequency === RRule.YEARLY && (pattern.interval === 1 ? 'year' : 'years')}
              </span>
            </div>
            
            <RecurrenceEnding
              endType={endType}
              occurrenceCount={occurrenceCount}
              endDate={endDate}
              onEndTypeChange={setEndType}
              onOccurrenceCountChange={setOccurrenceCount}
              onEndDateChange={setEndDate}
            />
          </>
        )}
      </div>
    );
  }
  
  // Default variant - full-featured editor with tabs
  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="font-medium flex items-center">
        <Repeat className="mr-2 h-4 w-4" />
        Recurrence
      </h3>
      
      {showNoRepeat && (
        <div className="flex items-center space-x-2">
          <Switch
            id="recurring"
            checked={isRecurring}
            onCheckedChange={setIsRecurring}
          />
          <Label htmlFor="recurring">Repeat this event</Label>
        </div>
      )}
      
      {isRecurring && (
        <div className="border rounded-md">
          <Tabs defaultValue="simple" className="w-full">
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="simple">Simple</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>
            <TabsContent value="simple" className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                {recurrenceDescription}
              </p>
              
              <div className="space-y-3">
                <Label>Repeat frequency</Label>
                <div className="grid grid-cols-2 gap-2">
                  {INTERVAL_PRESETS.map((preset) => (
                    <Button
                      key={`${preset.frequency}-${preset.interval}`}
                      variant={
                        pattern.frequency === preset.frequency && 
                        pattern.interval === preset.interval
                          ? "secondary"
                          : "outline"
                      }
                      onClick={() => {
                        setPattern({
                          frequency: preset.frequency,
                          interval: preset.interval
                        });
                      }}
                      className="justify-start"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              <RecurrenceEnding
                endType={endType}
                occurrenceCount={occurrenceCount}
                endDate={endDate}
                onEndTypeChange={setEndType}
                onOccurrenceCountChange={setOccurrenceCount}
                onEndDateChange={setEndDate}
              />
            </TabsContent>
            
            <TabsContent value="advanced" className="border-t p-4 space-y-4">
              <RecurrenceOptions
                pattern={pattern}
                startDate={startDate}
                onFrequencyChange={handleFrequencyChange}
                onIntervalChange={handleIntervalChange}
                onDayOfWeekToggle={handleDayOfWeekToggle}
                onMonthlyTypeChange={handleMonthlyTypeChange}
                onDayOfMonthChange={handleDayOfMonthChange}
                onPositionChange={handlePositionChange}
                onPositionDayChange={handlePositionDayChange}
              />
              
              <RecurrenceEnding
                endType={endType}
                occurrenceCount={occurrenceCount}
                endDate={endDate}
                onEndTypeChange={setEndType}
                onOccurrenceCountChange={setOccurrenceCount}
                onEndDateChange={setEndDate}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

/**
 * Recurrence Options Component
 * Contains all options for configuring recurrence pattern
 */
function RecurrenceOptions({
  pattern,
  startDate,
  onFrequencyChange,
  onIntervalChange,
  onDayOfWeekToggle,
  onMonthlyTypeChange,
  onDayOfMonthChange,
  onPositionChange,
  onPositionDayChange
}: {
  pattern: RecurrencePattern;
  startDate: Date;
  onFrequencyChange: (frequency: Frequency) => void;
  onIntervalChange: (interval: number) => void;
  onDayOfWeekToggle: (dayIndex: number) => void;
  onMonthlyTypeChange: (type: 'dayOfMonth' | 'dayOfWeek') => void;
  onDayOfMonthChange: (dayOfMonth: number) => void;
  onPositionChange: (position: number) => void;
  onPositionDayChange: (dayOfWeek: number) => void;
}) {
  // Determine if we're using "day of month" or "day of week" for monthly
  const isUsingDayOfMonth = !!pattern.byMonthDay && pattern.byMonthDay.length > 0;
  const isUsingDayOfWeek = !!pattern.byDay && pattern.byDay.length > 0 && 
                           !!pattern.bySetPos && pattern.bySetPos.length > 0;
  
  const monthlyType = isUsingDayOfMonth ? 'dayOfMonth' : 'dayOfWeek';
  
  return (
    <div className="space-y-4">
      {/* Frequency selection */}
      <div>
        <Label htmlFor="frequency">Repeats</Label>
        <Select
          value={pattern.frequency.toString()}
          onValueChange={(val) => onFrequencyChange(parseInt(val) as Frequency)}
        >
          <SelectTrigger id="frequency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECURRENCE_FREQUENCIES.map((freq) => (
              <SelectItem key={freq.value} value={freq.value.toString()}>
                {freq.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Interval */}
      <div>
        <Label htmlFor="interval">Repeat every</Label>
        <div className="flex items-center gap-2">
          <Input
            id="interval"
            type="number"
            min={1}
            max={99}
            value={pattern.interval || 1}
            onChange={(e) => onIntervalChange(parseInt(e.target.value) || 1)}
            className="w-20"
          />
          <span>
            {pattern.frequency === RRule.DAILY && (pattern.interval === 1 ? 'day' : 'days')}
            {pattern.frequency === RRule.WEEKLY && (pattern.interval === 1 ? 'week' : 'weeks')}
            {pattern.frequency === RRule.MONTHLY && (pattern.interval === 1 ? 'month' : 'months')}
            {pattern.frequency === RRule.YEARLY && (pattern.interval === 1 ? 'year' : 'years')}
          </span>
        </div>
      </div>
      
      {/* Weekly options */}
      {pattern.frequency === RRule.WEEKLY && (
        <div>
          <Label className="mb-2 block">Repeat on</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day, index) => (
              <Button
                key={day.value.toString()}
                variant={pattern.byDay?.includes(index) ? "default" : "outline"}
                className="h-9 w-9 p-0"
                onClick={() => onDayOfWeekToggle(index)}
              >
                {day.shortLabel.charAt(0)}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {/* Monthly options */}
      {pattern.frequency === RRule.MONTHLY && (
        <div>
          <Label className="mb-2 block">Repeat by</Label>
          <RadioGroup 
            value={monthlyType}
            onValueChange={(val) => onMonthlyTypeChange(val as 'dayOfMonth' | 'dayOfWeek')}
            className="space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dayOfMonth" id="dayOfMonth" />
              <Label htmlFor="dayOfMonth" className="cursor-pointer">
                Day of month (e.g., 15th day of each month)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dayOfWeek" id="dayOfWeek" />
              <Label htmlFor="dayOfWeek" className="cursor-pointer">
                Day of week (e.g., first Monday of each month)
              </Label>
            </div>
          </RadioGroup>
          
          {/* Day of month selection */}
          {monthlyType === 'dayOfMonth' && (
            <div className="mt-2">
              <Label htmlFor="dayOfMonth">Day of month</Label>
              <Input
                id="dayOfMonth"
                type="number"
                min={1}
                max={31}
                value={pattern.byMonthDay?.[0] || startDate.getDate()}
                onChange={(e) => onDayOfMonthChange(parseInt(e.target.value) || startDate.getDate())}
                className="w-20 mt-1"
              />
            </div>
          )}
          
          {/* Day of week selection */}
          {monthlyType === 'dayOfWeek' && (
            <div className="mt-2 space-y-2">
              <div>
                <Label htmlFor="position">Position</Label>
                <Select
                  value={(pattern.bySetPos?.[0] || 1).toString()}
                  onValueChange={(val) => onPositionChange(parseInt(val))}
                >
                  <SelectTrigger id="position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITIONS.map((pos) => (
                      <SelectItem key={pos.value} value={pos.value.toString()}>
                        {pos.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="dayOfWeek">Day of week</Label>
                <Select
                  value={(pattern.byDay?.[0] || startDate.getDay()).toString()}
                  onValueChange={(val) => onPositionDayChange(parseInt(val))}
                >
                  <SelectTrigger id="dayOfWeek">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day, index) => (
                      <SelectItem key={index} value={index.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Yearly options - simplified for now */}
      {pattern.frequency === RRule.YEARLY && (
        <div className="text-sm text-muted-foreground">
          Event will repeat yearly on {format(startDate, 'MMMM d')}
        </div>
      )}
    </div>
  );
}

/**
 * Recurrence Ending Component
 * Controls for setting when the recurrence ends
 */
function RecurrenceEnding({
  endType,
  occurrenceCount,
  endDate,
  onEndTypeChange,
  onOccurrenceCountChange,
  onEndDateChange
}: {
  endType: 'never' | 'count' | 'until';
  occurrenceCount: number;
  endDate?: Date;
  onEndTypeChange: (type: 'never' | 'count' | 'until') => void;
  onOccurrenceCountChange: (count: number) => void;
  onEndDateChange: (date?: Date) => void;
}) {
  return (
    <div className="space-y-3">
      <Label>Ends</Label>
      <RadioGroup 
        value={endType} 
        onValueChange={(val) => onEndTypeChange(val as 'never' | 'count' | 'until')}
        className="space-y-2"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="never" id="never" />
          <Label htmlFor="never" className="cursor-pointer">Never</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="count" id="count" />
          <Label htmlFor="count" className="cursor-pointer">After</Label>
          <Input
            type="number"
            min={1}
            max={999}
            value={occurrenceCount}
            onChange={(e) => onOccurrenceCountChange(parseInt(e.target.value) || 1)}
            className={cn("w-20", endType !== 'count' && "opacity-50")}
            disabled={endType !== 'count'}
          />
          <span>occurrences</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="until" id="until" />
          <Label htmlFor="until" className="cursor-pointer">On date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[180px] pl-3 text-left font-normal",
                  !endDate && "text-muted-foreground",
                  endType !== 'until' && "opacity-50"
                )}
                disabled={endType !== 'until'}
              >
                {endDate ? format(endDate, 'PPP') : <span>Pick a date</span>}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={onEndDateChange}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </RadioGroup>
    </div>
  );
}

export default RecurrenceEditor;

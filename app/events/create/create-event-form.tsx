'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { CalendarIcon, Clock, Users, MapPin, FileText, AlertCircle, Check } from 'lucide-react';
import { format, addMinutes, set } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { createSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { NaturalLanguageInput } from '@/components/ui/natural-language-input-lazy';
import { ParsedEvent } from '@/lib/nlp/event-parser';
import { SchedulingConflict, ConflictCheckResponse } from '@/lib/supabase/types';
import { useCSRFToken } from '@/lib/csrf-client';

// Using types from @/lib/supabase/types
interface UIConflict {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
}

export function CreateEventForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { fetchWithCSRF } = useCSRFToken();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [conflicts, setConflicts] = useState<UIConflict[]>([]);
  const [error, setError] = useState<string>('');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [privacyLevel, setPrivacyLevel] = useState<'private' | 'visible' | 'semi_private' | 'public'>('private');
  const [category, setCategory] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [timeZone, setTimeZone] = useState('UTC');
  const [hasRelationships, setHasRelationships] = useState(false);
  const [timeValidationError, setTimeValidationError] = useState('');
  const [showNlInput, setShowNlInput] = useState(true);

  // Check if user has relationships for conflict detection
  useEffect(() => {
    const checkRelationships = async () => {
      if (!user) return;
      
      try {
        const supabase = createSupabaseClient();
        const { data: relationships, error } = await supabase
          .from('relationships')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1);
        
        if (!error && relationships && relationships.length > 0) {
          setHasRelationships(true);
        }
      } catch (error) {
        console.error('Error checking relationships:', error);
      }
    };
    
    checkRelationships();
  }, [user]);

  // Validate time selection
  const validateTimes = useCallback(() => {
    setTimeValidationError('');
    
    if (isAllDay) return true;
    
    if (!startTime || !endTime) return true;
    
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    
    if (end <= start) {
      setTimeValidationError('End time must be after start time');
      return false;
    }
    
    return true;
  }, [startTime, endTime, isAllDay]);

  // Run time validation when times change
  useEffect(() => {
    validateTimes();
  }, [validateTimes]);

  // Conflict checking
  const checkConflicts = useCallback(async () => {
    if (!date || !hasRelationships || !user || isAllDay) return;
    if (!startTime || !endTime) return;

    setCheckingConflicts(true);
    setConflicts([]);

    try {
      const startDateTime = set(date, {
        hours: parseInt(startTime.split(':')[0]),
        minutes: parseInt(startTime.split(':')[1]),
      });
      const endDateTime = set(date, {
        hours: parseInt(endTime.split(':')[0]),
        minutes: parseInt(endTime.split(':')[1]),
      });

      // Get partner IDs for conflict checking
      const supabase = createSupabaseClient();
      const { data: relationships } = await supabase
        .from('relationships')
        .select('partner_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .not('partner_id', 'is', null);

      const partnerIds = (relationships as { partner_id: string }[])?.map(r => r.partner_id).filter(Boolean) || [];

      if (partnerIds.length === 0) return; // No partners to check conflicts with

      const response = await fetch('/api/events/check-conflicts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_start: startDateTime.toISOString(),
          event_end: endDateTime.toISOString(),
          partner_ids: partnerIds,
        }),
      });

      if (response.ok) {
        const data: ConflictCheckResponse = await response.json();
        if (data.has_conflicts && data.conflicts) {
          // Transform the response structure to match the UI expectations
          const uiConflicts = data.conflicts.flatMap(conflict => 
            conflict.conflicting_events.map(event => ({
              id: event.id,
              title: `${event.title} (${conflict.partner_name})`,
              start_time: event.start_time,
              end_time: event.end_time,
              location: ''
            }))
          );
          setConflicts(uiConflicts);
        }
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setCheckingConflicts(false);
    }
  }, [date, startTime, endTime, user, hasRelationships, isAllDay]);

  // Auto-check conflicts when time changes
  useEffect(() => {
    const timeoutId = setTimeout(checkConflicts, 500);
    return () => clearTimeout(timeoutId);
  }, [checkConflicts]);

  // Handle natural language parsing
  const handleEventParsed = useCallback((events: ParsedEvent[]) => {
    if (events.length === 0) return;
    
    const parsedEvent = events[0]; // Use the first/best result
    
    // Fill form fields from parsed event
    setTitle(parsedEvent.title || '');
    setDescription(parsedEvent.description || '');
    setLocation(parsedEvent.location || '');
    
    if (parsedEvent.startDate) {
      setDate(parsedEvent.startDate);
      
      if (!parsedEvent.isAllDay) {
        const startHours = parsedEvent.startDate.getHours().toString().padStart(2, '0');
        const startMinutes = parsedEvent.startDate.getMinutes().toString().padStart(2, '0');
        setStartTime(`${startHours}:${startMinutes}`);
        
        if (parsedEvent.endDate) {
          const endHours = parsedEvent.endDate.getHours().toString().padStart(2, '0');
          const endMinutes = parsedEvent.endDate.getMinutes().toString().padStart(2, '0');
          setEndTime(`${endHours}:${endMinutes}`);
        }
      }
      
      setIsAllDay(parsedEvent.isAllDay || false);
    }
    
    if (parsedEvent.category) {
      setCategory(parsedEvent.category);
    }
    
    // Hide the NL input after successful parsing
    setShowNlInput(false);
    
    toast.success('Event details filled from your description!');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !date) return;

    // Validate times before submitting
    if (!validateTimes()) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const startDateTime = set(date, {
        hours: parseInt(startTime.split(':')[0]),
        minutes: parseInt(startTime.split(':')[1]),
      });
      const endDateTime = set(date, {
        hours: parseInt(endTime.split(':')[0]),
        minutes: parseInt(endTime.split(':')[1]),
      });

      const eventData = {
        title: title.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        privacy_level: privacyLevel,
        is_all_day: isAllDay,
        time_zone: timeZone,
        category: (category.trim() === 'none' || !category.trim()) ? undefined : category.trim(),
        status: 'confirmed' as const,
      };

      const response = await fetchWithCSRF('/api/events', {
        method: 'POST',
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create event');
      }

      const result = await response.json();
      
      toast.success('Event created successfully!');
      router.push(`/calendar?event=${result.event.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create event';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Natural Language Quick Entry */}
      {showNlInput && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Quick Event Creation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NaturalLanguageInput
              onEventParsed={handleEventParsed}
              placeholder="Try: 'Meeting with John tomorrow at 2pm' or 'Lunch Friday noon'"
              className="w-full"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-sm text-muted-foreground">
                Describe your event in natural language and we&apos;ll fill the form for you
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowNlInput(false)}
                className="text-xs"
              >
                Use Manual Form
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Form Toggle */}
      {!showNlInput && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowNlInput(true)}
            className="text-sm"
          >
            <Check className="mr-2 h-4 w-4" />
            Try Quick Entry Instead
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Event Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Event Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter event title"
              required
              className="mobile-input"
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal mobile-touch-target",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="all-day"
              checked={isAllDay}
              onCheckedChange={setIsAllDay}
            />
            <Label htmlFor="all-day">All day event</Label>
          </div>

          {/* Time */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="pl-10 mobile-input"
                    required={!isAllDay}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="pl-10 mobile-input"
                    required={!isAllDay}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Time Zone */}
          {!isAllDay && (
            <div className="space-y-2">
              <Label>Time Zone</Label>
              <Select value={timeZone} onValueChange={setTimeZone}>
                <SelectTrigger className="mobile-touch-target">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                  <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                  <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                  <SelectItem value="America/Phoenix">Arizona Time</SelectItem>
                  <SelectItem value="America/Anchorage">Alaska Time</SelectItem>
                  <SelectItem value="Pacific/Honolulu">Hawaii Time</SelectItem>
                  <SelectItem value="Europe/London">GMT (London)</SelectItem>
                  <SelectItem value="Europe/Paris">CET (Paris, Berlin)</SelectItem>
                  <SelectItem value="Asia/Tokyo">JST (Tokyo)</SelectItem>
                  <SelectItem value="Asia/Shanghai">CST (Shanghai)</SelectItem>
                  <SelectItem value="Australia/Sydney">AEDT (Sydney)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Time Validation Error */}
          {timeValidationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{timeValidationError}</AlertDescription>
            </Alert>
          )}

          {/* Conflict Detection */}
          {conflicts.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium">Scheduling Conflicts Detected:</div>
                <ul className="mt-2 space-y-1">
                  {conflicts.map((conflict) => (
                    <li key={conflict.id} className="text-sm">
                      <strong>{conflict.title}</strong> - {format(new Date(conflict.start_time), 'h:mm a')} to {format(new Date(conflict.end_time), 'h:mm a')}
                      {conflict.location && <span className="text-muted-foreground"> at {conflict.location}</span>}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {checkingConflicts && (
            <Alert>
              <Clock className="h-4 w-4 animate-spin" />
              <AlertDescription>Checking for scheduling conflicts...</AlertDescription>
            </Alert>
          )}

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Enter location (optional)"
                className="pl-10 mobile-input"
              />
            </div>
          </div>

          {/* Privacy Level */}
          <div className="space-y-2">
            <Label>Privacy Level</Label>
            <Select value={privacyLevel} onValueChange={(value: 'private' | 'visible' | 'semi_private' | 'public') => setPrivacyLevel(value)}>
              <SelectTrigger className="mobile-touch-target">
                <SelectValue placeholder="Select privacy level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private - Only visible to you</SelectItem>
                <SelectItem value="visible">Visible - Can see all event details</SelectItem>
                <SelectItem value="semi_private">Semi-private - Limited visibility</SelectItem>
                <SelectItem value="public">Public - Visible to everyone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="mobile-touch-target">
                <SelectValue placeholder="Select category (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No category</SelectItem>
                <SelectItem value="work">Work</SelectItem>
                <SelectItem value="personal">Personal</SelectItem>
                <SelectItem value="health">Health</SelectItem>
                <SelectItem value="social">Social</SelectItem>
                <SelectItem value="family">Family</SelectItem>
                <SelectItem value="travel">Travel</SelectItem>
                <SelectItem value="education">Education</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter event description (optional)"
              rows={4}
              className="mobile-textarea"
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={
            isSubmitting || 
            !title || 
            !date || 
            (!isAllDay && (!startTime || !endTime)) ||
            timeValidationError !== ''
          }
          className="mobile-touch-target"
        >
          {isSubmitting ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Creating Event...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Create Event
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

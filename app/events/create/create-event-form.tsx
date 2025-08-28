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
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';

interface Conflict {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
}

interface ConflictResponse {
  success: boolean;
  has_conflicts: boolean;
  conflicts: Conflict[];
  error?: string;
}

export function CreateEventForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingConflicts, setCheckingConflicts] = useState(false);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [error, setError] = useState<string>('');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [privacyLevel, setPrivacyLevel] = useState<'private' | 'visible' | 'semi_private'>('private');
  const [category, setCategory] = useState('');

  // Conflict checking
  const checkConflicts = useCallback(async () => {
    if (!date || !startTime || !endTime || !user) return;

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

      const response = await fetch('/api/events/check-conflicts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_start: startDateTime.toISOString(),
          event_end: endDateTime.toISOString(),
          partner_ids: [], // Add relationship filtering if needed
        }),
      });

      if (response.ok) {
        const data: ConflictResponse = await response.json();
        if (data.has_conflicts && data.conflicts) {
          setConflicts(data.conflicts);
        }
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
    } finally {
      setCheckingConflicts(false);
    }
  }, [date, startTime, endTime, user]);

  // Auto-check conflicts when time changes
  useEffect(() => {
    const timeoutId = setTimeout(checkConflicts, 500);
    return () => clearTimeout(timeoutId);
  }, [checkConflicts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !date) return;

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
        category: category.trim() || undefined,
        status: 'confirmed' as const,
      };

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create event');
      }

      const result = await response.json();
      
      toast.success('Event created successfully!');
      router.push(`/calendar?event=${result.data.id}`);
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

          {/* Time */}
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
                  required
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
                  required
                />
              </div>
            </div>
          </div>

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
            <Select value={privacyLevel} onValueChange={(value: 'private' | 'visible' | 'semi_private') => setPrivacyLevel(value)}>
              <SelectTrigger className="mobile-touch-target">
                <SelectValue placeholder="Select privacy level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private - Only visible to you</SelectItem>
                <SelectItem value="visible">Visible - Full details shared with connections</SelectItem>
                <SelectItem value="semi_private">Semi-private - Only shows as busy</SelectItem>
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
                <SelectItem value="">No category</SelectItem>
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
          disabled={isSubmitting || !title || !date || !startTime || !endTime}
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

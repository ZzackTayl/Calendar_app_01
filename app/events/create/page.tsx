'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTimeZone } from '@/lib/time-zones/time-zone-context';
import { createSupabaseClient } from '@/lib/supabase/client';
import { type Relationship } from '@/lib/supabase/types';
import { cn, createCssVars } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RelationshipIndicator } from '@/components/ui/relationship-indicator';
import { RelationshipItem } from '@/components/ui/relationship-item';
import { TimeZoneDisplay } from '@/components/ui/time-zone-display';
import { TimeZoneSelector } from '@/components/ui/time-zone-selector';
import { RecurrenceEditor } from '@/components/ui/recurrence-editor';
import { RecurrencePreview } from '@/components/ui/recurrence-preview';
import { ArrowLeft, Calendar, Clock, MapPin, Users, Lock, Globe, Settings, PlusCircle, Repeat, FileText, Paperclip } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format, addHours, startOfHour, parseISO } from 'date-fns';
import { DemoStore } from '@/lib/demo-store';
import { useSearchParams } from 'next/navigation';
import { useZodForm } from '@/hooks/use-zod-form';
import { EnhancedEventSchema } from '@/lib/validation/enhanced-schemas';
import { 
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage
} from '@/components/ui/form';
import { ErrorAlert } from '@/components/ui/form/error-alert';
import { FormSubmitButton } from '@/components/ui/form/form-submit-button';
import { ValidationError } from '@/lib/validation/errors';

import { FileUploader, UploadedFile } from '@/components/ui/file-uploader';
import { AttachmentList } from '@/components/ui/attachment-list';
import { ConflictWarning } from '@/components/ui/conflict-warning';
import { ConflictResolver, ConflictResolution } from '@/components/ui/conflict-resolver';
import { ConflictDetectionService, Conflict } from '@/lib/conflicts/conflict-detection';

import { ContactPicker } from '@/components/ui/contact-picker';
import { ProcessedContact } from '@/lib/contacts/device-contacts';
import { NaturalLanguageInput } from '@/components/ui/natural-language-input';
import { ParsedEvent } from '@/lib/nlp/event-parser';

function CreateEventContent() {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [resolvingConflict, setResolvingConflict] = useState<Conflict | null>(null);
  const [existingEvents, setExistingEvents] = useState<any[]>([]);
  const [conflictDetectionService] = useState(() => new ConflictDetectionService());
  const [selectedAttendees, setSelectedAttendees] = useState<ProcessedContact[]>([]);
  const [existingContacts, setExistingContacts] = useState<ProcessedContact[]>([]);
  const { user, demoMode } = useAuth();
  const router = useRouter();
  const supabase = createSupabaseClient();
  const searchParams = useSearchParams();
  
  // Default date from URL query param or current date
  const getDefaultDates = () => {
    const now = startOfHour(new Date());
    const paramDate = searchParams?.get('date');
    
    if (paramDate) {
      const parsed = new Date(paramDate + 'T00:00:00');
      if (!isNaN(parsed.getTime())) {
        // align to nearest hour on that day
        now.setFullYear(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
      }
    }
    
    const oneHourLater = addHours(now, 1);
    
    return {
      start_time: now.toISOString(),
      end_time: oneHourLater.toISOString()
    };
  };
  
  // Get time zone context
  const { displayTimeZone } = useTimeZone();
  
  // Initialize the form with Zod validation
  const { 
    handleSubmit, 
    formState: { errors, isSubmitting }, 
    setValue, 
    watch,
    reset,
    control,
  } = useZodForm({
    schema: EnhancedEventSchema,
    defaultValues: {
      title: '',
      description: '',
      start_time: getDefaultDates().start_time,
      end_time: getDefaultDates().end_time,
      location: '',
    },
  });
  
  // Watch form values for conditional rendering
  const privacyLevel = watch('privacy_level');
  const selectedRelationshipId = watch('relationship_id');
  const visibleToRelationships = watch('visible_to_relationships');
  const isAllDay = watch('is_all_day');
  const timeZone = watch('time_zone');
  const recurrenceRule = watch('recurrence_rule');
  const recurrenceExceptionDates = watch('recurrence_exception_dates') || [];
  const startTime = watch('start_time');
  const endTime = watch('end_time');
  
  useEffect(() => {
    // Redirect if not logged in
    if (!user && !demoMode) {
      router.push('/auth/signin');
      return;
    }

    if(user || demoMode) {
      fetchRelationships();
      fetchExistingEvents();
      fetchExistingContacts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router, demoMode, searchParams]);



  const fetchRelationships = async () => {
    try {
      if (demoMode) {
        const uid = user?.id || 'demo-user';
        const rels = DemoStore.listRelationships(uid);
        setRelationships(rels as any);
        return;
      }
      
      const { data, error } = await supabase
        .from('relationships')
        .select('*')
        .eq('user_id', user?.id)
        .order('partner_name', { ascending: true });
      
      if (error) throw error;
      setRelationships(data || []);
    } catch (error) {
      console.error('Error fetching relationships:', error);
      setGeneralError('Failed to load relationships');
    }
  };

  const fetchExistingEvents = async () => {
    try {
      if (demoMode) {
        const uid = user?.id || 'demo-user';
        const events = DemoStore.listEvents(uid);
        setExistingEvents(events as any);
        return;
      }
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user?.id)
        .gte('start_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .lte('start_time', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()); // Next 30 days
      
      if (error) throw error;
      setExistingEvents(data || []);
    } catch (error) {
      console.error('Error fetching existing events:', error);
    }
  };

  const fetchExistingContacts = async () => {
    try {
      if (demoMode) {
        const uid = user?.id || 'demo-user';
        const rels = DemoStore.listRelationships(uid);
        const contacts: ProcessedContact[] = rels.map((rel: any) => ({
          id: rel.id,
          name: rel.partner_name,
          email: rel.partner_email,
          phone: rel.phone,
          source: 'existing' as const
        }));
        setExistingContacts(contacts);
        return;
      }
      
      const { data, error } = await supabase
        .from('relationships')
        .select('id, partner_name, partner_email, phone')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('partner_name', { ascending: true });
      
      if (error) throw error;
      
      const contacts: ProcessedContact[] = (data || []).map((rel: {id: string, partner_name: string, partner_email: string | null, phone: string | null}) => ({
        id: rel.id,
        name: rel.partner_name,
        email: rel.partner_email,
        phone: rel.phone,
        source: 'existing' as const
      }));
      
      setExistingContacts(contacts);
    } catch (error) {
      console.error('Error fetching existing contacts:', error);
    }
  };





  const handleFileUpload = (files: File[]) => {
    // Files are handled by the FileUploader component
  };

  const handleUploadComplete = (uploadedFiles: UploadedFile[]) => {
    setAttachments(prev => [...prev, ...uploadedFiles]);
  };

  const handleAttachmentDelete = (attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  const handleAttendeesChange = (contacts: ProcessedContact[]) => {
    setSelectedAttendees(contacts);
  };

  const detectConflicts = async () => {
    const formData = watch();
    if (!formData.title || !formData.start_time || !formData.end_time) {
      return;
    }

    const eventData = {
      id: 'temp-id',
      title: formData.title,
      start_time: formData.start_time,
      end_time: formData.end_time,
      location: formData.location,
      recurrence_rule: formData.recurrence_rule,
      user_id: user?.id,
      owner_id: user?.id,
      privacy_level: formData.privacy_level,
      relationship_id: formData.relationship_id,
      visible_to_relationships: formData.visible_to_relationships,
      visible_to_groups: formData.visible_to_groups,
      time_zone: formData.time_zone,
      is_all_day: formData.is_all_day,
      color: formData.color,
      status: formData.status,
      recurrence_exception_dates: formData.recurrence_exception_dates,
      description: formData.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const detectedConflicts = await conflictDetectionService.detectConflicts(
      eventData as any,
      existingEvents
    );
    setConflicts(detectedConflicts);
  };

  const handleConflictResolve = (resolution: ConflictResolution) => {
    // Handle conflict resolution
    setResolvingConflict(null);
    // In a real implementation, you would apply the resolution to the form
  };

  const handleConflictIgnore = (conflict: Conflict) => {
    setConflicts(prev => prev.filter(c => c !== conflict));
  };

  // Detect conflicts when form values change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      detectConflicts();
    }, 1000); // Debounce conflict detection

    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTime, endTime, watch('title'), watch('location')]);

  const handleRelationshipToggle = (relationshipId: string) => {
    const currentRelationships = Array.isArray(visibleToRelationships) ? visibleToRelationships : [];
    
    if (currentRelationships.includes(relationshipId)) {
      setValue(
        'visible_to_relationships', 
        currentRelationships.filter(id => id !== relationshipId)
      );
    } else {
      setValue(
        'visible_to_relationships', 
        [...currentRelationships, relationshipId]
      );
    }
  };

  const handleNaturalLanguageParsed = (events: ParsedEvent[]) => {
    if (events.length === 0) return;
    
    const event = events[0]; // Use the first parsed event
    
    // Update form fields with parsed data
    setValue('title', event.title);
    if (event.description) setValue('description', event.description);
    if (event.location) setValue('location', event.location);
    if (event.timezone) setValue('time_zone', event.timezone);
    if (event.category && event.category !== 'general') {
      // Map category to a color
      const categoryColors = {
        work: '#3B82F6',
        social: '#10B981',
        health: '#EF4444',
        personal: '#8B5CF6',
        education: '#F59E0B'
      };
      const color = categoryColors[event.category as keyof typeof categoryColors];
      if (color) setValue('color', color);
    }
    
    setValue('start_time', event.startDate.toISOString());
    if (event.endDate) {
      setValue('end_time', event.endDate.toISOString());
    }
    
    if (event.isAllDay) {
      setValue('is_all_day', true);
    }
    
    // Handle priority mapping to status
    if (event.priority === 'high') {
      setValue('status', 'confirmed');
    } else if (event.priority === 'low') {
      setValue('status', 'tentative');
    }
    
    // Auto-detect conflicts after parsing
    setTimeout(() => {
      detectConflicts();
    }, 500);
  };

  const onSubmit = async (data: any) => {
    try {
      setGeneralError(null);
      
      // Check if user is authenticated
      if (!user && !demoMode) {
        setGeneralError('You must be logged in to create events');
        return;
      }
      
      // Ensure dates are in ISO format
      const startDateTime = typeof data.start_time === 'string' 
        ? new Date(data.start_time)
        : data.start_time;
        
      const endDateTime = typeof data.end_time === 'string'
        ? new Date(data.end_time)
        : data.end_time;
      
      // Final validation check for dates
      if (endDateTime <= startDateTime) {
        setGeneralError('End time must be after start time');
        return;
      }
      
      if (demoMode) {
        const uid = user?.id || 'demo-user';
        DemoStore.addEvent({
          owner_id: uid,
          title: data.title.trim(),
          description: data.description?.trim() || undefined,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          location: data.location?.trim() || undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);
        
        router.push('/calendar');
        return;
      }

      // Save to database with only the fields that exist in the base schema
      const { error } = await supabase
        .from('events')
        .insert({
          owner_id: user?.id,
          title: data.title.trim(),
          description: data.description?.trim() || null,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          location: data.location?.trim() || null,
        });

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      router.push('/calendar');
    } catch (error) {
      console.error('Error creating event:', error);
      if (error instanceof ValidationError) {
        // Validation errors are already handled by the form
        return;
      }
      setGeneralError('Failed to create event. Please try again.');
    }
  };
  
  // Format date for display in inputs
  const formatDateForInput = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'yyyy-MM-dd');
    } catch (e) {
      return '';
    }
  };
  
  // Format time for display in inputs
  const formatTimeForInput = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'HH:mm');
    } catch (e) {
      return '';
    }
  };
  
  // Handle date/time input changes
  const handleDateTimeChange = (type: 'start' | 'end', field: 'date' | 'time', value: string) => {
    try {
      const currentDateTimeField = type === 'start' ? 'start_time' : 'end_time';
      const currentDateTime = parseISO(watch(currentDateTimeField));
      
      let newDateTime: Date;
      
      if (field === 'date') {
        // Update date while keeping time
        const [year, month, day] = value.split('-').map(Number);
        newDateTime = new Date(currentDateTime);
        newDateTime.setFullYear(year, month - 1, day);
      } else {
        // Update time while keeping date
        const [hours, minutes] = value.split(':').map(Number);
        newDateTime = new Date(currentDateTime);
        newDateTime.setHours(hours, minutes);
      }
      
      setValue(currentDateTimeField, newDateTime.toISOString());
    } catch (error) {
      console.error(`Error updating ${type} ${field}:`, error);
    }
  };
  
  // Toggle all-day event
  const handleAllDayToggle = (checked: boolean) => {
    setValue('is_all_day', checked);
    
    if (checked) {
      // Set times to start and end of day
      const startDate = parseISO(watch('start_time'));
      const endDate = parseISO(watch('end_time'));
      
      // Set start to beginning of day
      startDate.setHours(0, 0, 0, 0);
      setValue('start_time', startDate.toISOString());
      
      // Set end to end of day
      endDate.setHours(23, 59, 59, 999);
      setValue('end_time', endDate.toISOString());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-700 sticky top-0 z-40">
        <div className="mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex items-center h-14 sm:h-16">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="mr-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary mr-2 sm:mr-3 flex-shrink-0" />
            <h1 className="text-lg sm:text-xl font-bold text-white truncate">Create Event</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <Card className="border-0 shadow-xl bg-slate-800/90 backdrop-blur border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Create New Event</CardTitle>
            <CardDescription>
              Add a new event to your calendar with privacy controls for your relationships.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Display general form errors */}
              {generalError && (
                <ErrorAlert message={generalError} severity="error" />
              )}



              {/* Conflict Detection */}
              <ConflictWarning
                conflicts={conflicts}
                onResolve={(conflict) => setResolvingConflict(conflict)}
                onIgnore={handleConflictIgnore}
              />

              <div className="space-y-6">
                {/* AI-Powered Natural Language Input */}
                <div>
                  <h3 className="text-lg font-medium text-white flex items-center mb-4">
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Smart Event Creation
                  </h3>
                  <NaturalLanguageInput 
                    onEventParsed={handleNaturalLanguageParsed}
                    placeholder="Describe your event naturally (e.g., 'Meeting with Sarah tomorrow at 2pm in Conference Room A')"
                    className="mb-4"
                  />
                </div>

                {/* Basic Event Details */}
                <div className="space-y-4">
                  <FormField
                    control={control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event title</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="What's happening?"
                          />
                        </FormControl>
                        {errors.title?.message && (
                          <FormMessage>{errors.title.message}</FormMessage>
                        )}
                      </FormItem>
                    )}
                  />

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Description (optional)
                    </label>
                    <textarea
                      placeholder="Add more details..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                      value={watch('description') || ''}
                      onChange={(e) => setValue('description', e.target.value)}
                    />
                    {errors.description?.message && (
                      <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
                    )}
                  </div>
                </div>

                {/* Date and Time */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white flex items-center">
                    <Clock className="w-5 h-5 mr-2" />
                    When
                  </h3>
                  
                  <div className="flex items-center mb-3">
                    <input
                      id="is_all_day"
                      type="checkbox"
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                      checked={isAllDay}
                      onChange={(e) => handleAllDayToggle(e.target.checked)}
                    />
                    <label htmlFor="is_all_day" className="ml-2 block text-sm text-white">
                      All-day event
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Start date *
                      </label>
                      <Input
                        type="date"
                        value={formatDateForInput(watch('start_time'))}
                        onChange={(e) => handleDateTimeChange('start', 'date', e.target.value)}
                      />
                      {errors.start_time?.message && (
                        <p className="text-sm text-red-600 mt-1">{errors.start_time.message}</p>
                      )}
                    </div>
                    
                    {!isAllDay && (
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          Start time *
                        </label>
                        <Input
                          type="time"
                          value={formatTimeForInput(watch('start_time'))}
                          onChange={(e) => handleDateTimeChange('start', 'time', e.target.value)}
                        />
                        {errors.start_time?.message && (
                          <p className="text-sm text-red-600 mt-1">{errors.start_time.message}</p>
                        )}
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        End date *
                      </label>
                      <Input
                        type="date"
                        value={formatDateForInput(watch('end_time'))}
                        onChange={(e) => handleDateTimeChange('end', 'date', e.target.value)}
                      />
                      {errors.end_time?.message && (
                        <p className="text-sm text-red-600 mt-1">{errors.end_time.message}</p>
                      )}
                    </div>
                    
                    {!isAllDay && (
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          End time *
                        </label>
                        <Input
                          type="time"
                          value={formatTimeForInput(watch('end_time'))}
                          onChange={(e) => handleDateTimeChange('end', 'time', e.target.value)}
                        />
                        {errors.end_time?.message && (
                          <p className="text-sm text-red-600 mt-1">{errors.end_time.message}</p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Time Zone Selection */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Time zone
                    </label>
                    <select
                      value={watch('time_zone') || 'UTC'}
                      onChange={(e) => setValue('time_zone', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                      aria-label="Select time zone"
                    >
                      <option value="UTC">UTC (Coordinated Universal Time)</option>
                      <option value="America/New_York">Eastern Time (US & Canada)</option>
                      <option value="America/Chicago">Central Time (US & Canada)</option>
                      <option value="America/Denver">Mountain Time (US & Canada)</option>
                      <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                      <option value="Europe/London">London (GMT/BST)</option>
                      <option value="Europe/Paris">Paris (CET/CEST)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                      <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
                    </select>
                    {errors.time_zone?.message && (
                      <p className="text-sm text-red-600 mt-1">{errors.time_zone.message}</p>
                    )}
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Location (optional)
                  </label>
                  <Input
                    value={watch('location') || ''}
                    onChange={(e) => setValue('location', e.target.value)}
                    placeholder="Where is this happening?"
                  />
                  {errors.location?.message && (
                    <p className="text-sm text-red-600 mt-1">{errors.location.message}</p>
                  )}
                </div>

                {/* Color Selection */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Event color
                  </label>
                  <Input
                    value={watch('color') || '#3B82F6'}
                    onChange={(e) => setValue('color', e.target.value)}
                    type="color"
                    className="h-10 cursor-pointer"
                  />
                  {errors.color?.message && (
                    <p className="text-sm text-red-600 mt-1">{errors.color.message}</p>
                  )}
                </div>

                {/* Status Selection */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Event status
                  </label>
                  <select
                    value={watch('status') || 'confirmed'}
                    onChange={(e) => setValue('status', e.target.value as 'confirmed' | 'tentative' | 'cancelled')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    aria-label="Select event status"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="tentative">Tentative</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  {errors.status?.message && (
                    <p className="text-sm text-red-600 mt-1">{errors.status.message}</p>
                  )}
                </div>

                {/* Relationship Association */}
                {relationships.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      <Users className="w-4 h-4 inline mr-1" />
                      Associated relationship (optional)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setValue('relationship_id', undefined)}
                        className={`p-3 rounded-lg border text-sm transition-all ${
                          !selectedRelationshipId
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        No specific relationship
                      </button>
                      
                      {relationships.map((relationship) => (
                        <RelationshipItem
                          key={relationship.id}
                          id={relationship.id}
                          name={relationship.partner_name || ''}
                          color={relationship.color}
                          type={relationship.relationship_type}
                          isSelected={selectedRelationshipId === relationship.id}
                          onClick={() => setValue('relationship_id', relationship.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Privacy Settings */}
                <div>
                  <label className="block text-sm font-medium text-white mb-3">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Privacy level
                  </label>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setValue('privacy_level', 'public')}
                      className={`w-full p-4 rounded-lg border text-left transition-all ${
                        privacyLevel === 'public'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center mb-1">
                        <Globe className="w-4 h-4 mr-2" />
                        <span className="font-medium">Public</span>
                      </div>
                      <p className="text-sm text-slate-300">All your partners can see this event</p>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setValue('privacy_level', 'private')}
                      className={`w-full p-4 rounded-lg border text-left transition-all ${
                        privacyLevel === 'private'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center mb-1">
                        <Lock className="w-4 h-4 mr-2" />
                        <span className="font-medium">Private</span>
                      </div>
                      <p className="text-sm text-slate-300">Only you can see this event</p>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setValue('privacy_level', 'custom')}
                      className={`w-full p-4 rounded-lg border text-left transition-all ${
                        privacyLevel === 'custom'
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center mb-1">
                        <Settings className="w-4 h-4 mr-2" />
                        <span className="font-medium">Custom</span>
                      </div>
                      <p className="text-sm text-slate-300">Choose specific partners who can see this</p>
                    </button>
                  </div>

                  {/* Custom Privacy Selection */}
                  {privacyLevel === 'custom' && relationships.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-white mb-3">
                        Who can see this event?
                      </p>
                      <div className="space-y-2">
                        {relationships.map((relationship) => (
                          <label
                            key={relationship.id}
                            className="flex items-center cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={visibleToRelationships?.includes(relationship.id)}
                              onChange={() => handleRelationshipToggle(relationship.id)}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <div className="flex items-center ml-3">
                              <RelationshipIndicator color={relationship.color} />
                              <span className="text-sm text-white">
                                {relationship.partner_name}
                              </span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Recurrence */}
              <div>
                <div className="mb-4">
                  <h3 className="flex items-center text-sm font-medium text-white mb-2">
                    <Repeat className="w-4 h-4 mr-2" />
                    Recurrence
                  </h3>
                </div>
                <RecurrenceEditor 
                  value={recurrenceRule}
                  startDate={new Date(startTime)}
                  onChange={(value) => setValue('recurrence_rule', value || '')}
                  variant="inline"
                />
                
                {recurrenceRule && (
                  <div className="mt-4">
                    <RecurrencePreview
                      rrule={recurrenceRule}
                      startDate={new Date(startTime)}
                      endDate={new Date(endTime)}
                      timeZone={timeZone}
                      exceptionDates={recurrenceExceptionDates}
                      maxOccurrences={5}
                    />
                  </div>
                )}
              </div>
              
              {/* Time Zone */}
              <div>
                <div className="mb-2">
                  <h3 className="flex items-center text-sm font-medium text-white mb-2">
                    <Globe className="w-4 h-4 mr-2" />
                    Time Zone
                  </h3>
                </div>
                <TimeZoneSelector
                  value={timeZone}
                  onChange={(zone) => setValue('time_zone', zone)}
                  variant="dropdown"
                  showSelected={false}
                />
              </div>
              
              {/* Attendees Selection */}
              <div>
                <div className="mb-4">
                  <h3 className="flex items-center text-sm font-medium text-white mb-2">
                    <Users className="w-4 h-4 mr-2" />
                    Event Attendees
                  </h3>
                  <p className="text-xs text-gray-500">
                    Add attendees from your device contacts or manually
                  </p>
                </div>
                
                <ContactPicker
                  selectedContacts={selectedAttendees}
                  onContactsChange={handleAttendeesChange}
                  maxContacts={20}
                  showExistingContacts={true}
                  existingContacts={existingContacts}
                  placeholder="Add attendees to your event..."
                  variant="dialog"
                  className="w-full"
                />
                
                {selectedAttendees.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700 font-medium mb-2">
                      {selectedAttendees.length} attendee{selectedAttendees.length === 1 ? '' : 's'} selected
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedAttendees.map((attendee) => (
                        <Badge key={attendee.id} variant="secondary" className="text-xs">
                          {attendee.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* File Attachments */}
              <div>
                <div className="mb-4">
                  <h3 className="flex items-center text-sm font-medium text-white mb-2">
                    <Paperclip className="w-4 h-4 mr-2" />
                    Attachments
                  </h3>
                  <p className="text-xs text-gray-500">
                    Add files, images, or documents to your event
                  </p>
                </div>
                
                <FileUploader
                  onFileSelect={handleFileUpload}
                  onUploadComplete={handleUploadComplete}
                  maxFiles={5}
                  maxFileSize={10 * 1024 * 1024} // 10MB
                  className="mb-4"
                />
                
                <AttachmentList
                  attachments={attachments}
                  onDelete={handleAttachmentDelete}
                  className="mt-4"
                />
              </div>

              <div className="flex space-x-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <FormSubmitButton 
                  isSubmitting={isSubmitting}
                  loadingText="Creating Event..."
                  className="flex-1"
                >
                  Create Event
                </FormSubmitButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Conflict Resolution Dialog */}
      <ConflictResolver
        conflict={resolvingConflict}
        onResolve={handleConflictResolve}
        onCancel={() => setResolvingConflict(null)}
        open={!!resolvingConflict}
      />
    </div>
  );
}

export default function CreateEventPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CreateEventContent />
    </Suspense>
  );
}
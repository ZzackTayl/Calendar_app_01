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
  FormControl, 
  ErrorAlert, 
  FormSubmitButton 
} from '@/components/ui/form';
import { ValidationError } from '@/lib/validation/errors';
import { TemplateSelector } from '@/components/ui/template-selector';
import { FileUploader, UploadedFile } from '@/components/ui/file-uploader';
import { AttachmentList } from '@/components/ui/attachment-list';
import { ConflictWarning } from '@/components/ui/conflict-warning';
import { ConflictResolver, ConflictResolution } from '@/components/ui/conflict-resolver';
import { ConflictDetectionService, Conflict } from '@/lib/conflicts/conflict-detection';
import { EventTemplateFormValues } from '@/lib/validation/enhanced-schemas';

function CreateEventContent() {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [resolvingConflict, setResolvingConflict] = useState<Conflict | null>(null);
  const [existingEvents, setExistingEvents] = useState<any[]>([]);
  const [conflictDetectionService] = useState(() => new ConflictDetectionService());
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
    register, 
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
      time_zone: displayTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      privacy_level: 'public' as const,
      relationship_id: undefined,
      visible_to_relationships: [],
      visible_to_groups: [],
      is_all_day: false,
      color: '#3B82F6',
      status: 'confirmed' as const,
      recurrence_rule: '',
      recurrence_exception_dates: [],
    },
    mode: 'onBlur', // Validate fields when they lose focus
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

    fetchRelationships();
    fetchExistingEvents();
  }, [user, router, demoMode, searchParams]);

  // Check for template data in URL
  useEffect(() => {
    const templateParam = searchParams?.get('template');
    if (templateParam) {
      try {
        const templateData: EventTemplateFormValues = JSON.parse(decodeURIComponent(templateParam));
        applyTemplate(templateData);
      } catch (error) {
        console.error('Error parsing template data:', error);
      }
    }
  }, [searchParams]);

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

  const applyTemplate = (template: EventTemplateFormValues) => {
    setValue('title', template.title);
    setValue('description', template.description || '');
    setValue('location', template.location || '');
    setValue('color', template.color || '#3B82F6');
    setValue('privacy_level', template.privacy_level);
    setValue('relationship_id', template.relationship_id);
    setValue('visible_to_relationships', template.visible_to_relationships || []);
    setValue('visible_to_groups', template.visible_to_groups || []);
    
    // Calculate duration and update end time
    const startTime = new Date(watch('start_time'));
    const endTime = new Date(startTime.getTime() + template.duration * 60 * 1000);
    setValue('end_time', endTime.toISOString());
  };

  const handleTemplateSelect = (template: EventTemplateFormValues) => {
    applyTemplate(template);
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

  const parseNaturalLanguage = async (input: string) => {
    if (!input || input.length < 10) return;
    
    try {
      // Simple natural language parsing - in production, this would use AI
      const lowerInput = input.toLowerCase();
      
      // Extract time patterns
      const timePattern = /(\d{1,2}):?(\d{2})?\s*(am|pm)/i;
      const timeMatch = lowerInput.match(timePattern);
      
      // Extract date patterns
      const datePatterns = [
        /tomorrow/i,
        /today/i,
        /next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
        /(\d{1,2})\/(\d{1,2})/
      ];
      
      let suggestedTitle = input;
      let suggestedDate = format(new Date(), 'yyyy-MM-dd');
      let suggestedTime = format(new Date(), 'HH:mm');
      
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] || '00';
        const ampm = timeMatch[3]?.toLowerCase();
        
        if (ampm === 'pm' && hour !== 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
        
        suggestedTime = `${hour.toString().padStart(2, '0')}:${minutes}`;
        
        // Remove time from title
        suggestedTitle = input.replace(timeMatch[0], '').trim();
      }
      
      if (lowerInput.includes('tomorrow')) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        suggestedDate = format(tomorrow, 'yyyy-MM-dd');
        suggestedTitle = suggestedTitle.replace(/tomorrow/i, '').trim();
      }
      
      // Update form with extracted data
      setValue('title', suggestedTitle);
      
      // Create ISO date strings
      const startDateTime = new Date(`${suggestedDate}T${suggestedTime}`);
      const endDateTime = addHours(startDateTime, 1);
      
      setValue('start_time', startDateTime.toISOString());
      setValue('end_time', endDateTime.toISOString());
      
    } catch (error) {
      console.error('Error parsing natural language input:', error);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      setGeneralError(null);
      
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
          privacy_level: data.privacy_level,
          relationship_id: data.relationship_id || undefined,
          visible_to_relationships: data.privacy_level === 'custom' ? data.visible_to_relationships : [],
          visible_to_groups: data.privacy_level === 'custom' ? data.visible_to_groups : [],
          time_zone: data.time_zone,
          is_all_day: data.is_all_day,
          color: data.color,
          status: data.status,
          recurrence_rule: data.recurrence_rule || undefined,
          recurrence_exception_dates: data.recurrence_exception_dates || undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);
        
        // Handle attachments in demo mode
        if (attachments.length > 0) {
          console.log('Demo attachments:', attachments);
        }
        
        router.push('/calendar');
        return;
      }

      // Save to database with enhanced fields
      const { error } = await supabase
        .from('events')
        .insert({
          owner_id: user?.id,
          title: data.title.trim(),
          description: data.description?.trim() || null,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          location: data.location?.trim() || null,
          privacy_level: data.privacy_level,
          relationship_id: data.relationship_id || null,
          visible_to_relationships: data.privacy_level === 'custom' ? data.visible_to_relationships : null,
          visible_to_groups: data.privacy_level === 'custom' ? data.visible_to_groups : null,
          time_zone: data.time_zone || 'UTC',
          is_all_day: data.is_all_day || false,
          color: data.color || null,
          status: data.status || 'confirmed',
          recurrence_rule: data.recurrence_rule || null,
          recurrence_exception_dates: data.recurrence_exception_dates?.length 
            ? data.recurrence_exception_dates 
            : null,
        });

      if (error) {
        throw error;
      }

      // Handle file attachments if any
      if (attachments.length > 0) {
        // In a real implementation, you would save the attachments to the database
        // and link them to the created event
        console.log('Attachments to save:', attachments);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard')}
              className="mr-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Calendar className="w-6 h-6 text-primary mr-3" />
            <h1 className="text-xl font-bold text-gray-900">Create Event</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Create New Event</CardTitle>
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

              {/* Template Selection */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Quick Start
                  </h3>
                  <p className="text-sm text-gray-500">Use a template to speed up event creation</p>
                </div>
                <TemplateSelector onTemplateSelect={handleTemplateSelect} />
              </div>

              {/* Conflict Detection */}
              <ConflictWarning
                conflicts={conflicts}
                onResolve={(conflict) => setResolvingConflict(conflict)}
                onIgnore={handleConflictIgnore}
              />

              <div className="space-y-6">
                {/* Natural Language Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick create (try: "Dinner with Alex tomorrow 7pm")
                  </label>
                  <Input
                    placeholder="Describe your event naturally..."
                    onBlur={(e) => parseNaturalLanguage(e.target.value)}
                    className="mb-2"
                  />
                  <p className="text-xs text-gray-500">
                    Type naturally and we'll help fill in the details
                  </p>
                </div>

                {/* Basic Event Details */}
                <div className="space-y-4">
                  <FormControl
                    name="title"
                    label="Event title"
                    error={errors.title?.message}
                    required
                  >
                    <Input
                      {...register('title')}
                      placeholder="What's happening?"
                    />
                  </FormControl>

                  <FormControl
                    name="description"
                    label="Description (optional)"
                    error={errors.description?.message}
                  >
                    <textarea
                      {...register('description')}
                      placeholder="Add more details..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                    />
                  </FormControl>
                </div>

                {/* Date and Time */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
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
                    <label htmlFor="is_all_day" className="ml-2 block text-sm text-gray-700">
                      All-day event
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormControl
                      name="start_date"
                      label="Start date"
                      error={errors.start_time?.message}
                      required
                    >
                      <Input
                        type="date"
                        value={formatDateForInput(watch('start_time'))}
                        onChange={(e) => handleDateTimeChange('start', 'date', e.target.value)}
                      />
                    </FormControl>
                    
                    {!isAllDay && (
                      <FormControl
                        name="start_time"
                        label="Start time"
                        error={errors.start_time?.message}
                        required
                      >
                        <Input
                          type="time"
                          value={formatTimeForInput(watch('start_time'))}
                          onChange={(e) => handleDateTimeChange('start', 'time', e.target.value)}
                        />
                      </FormControl>
                    )}
                    
                    <FormControl
                      name="end_date"
                      label="End date"
                      error={errors.end_time?.message}
                      required
                    >
                      <Input
                        type="date"
                        value={formatDateForInput(watch('end_time'))}
                        onChange={(e) => handleDateTimeChange('end', 'date', e.target.value)}
                      />
                    </FormControl>
                    
                    {!isAllDay && (
                      <FormControl
                        name="end_time"
                        label="End time"
                        error={errors.end_time?.message}
                        required
                      >
                        <Input
                          type="time"
                          value={formatTimeForInput(watch('end_time'))}
                          onChange={(e) => handleDateTimeChange('end', 'time', e.target.value)}
                        />
                      </FormControl>
                    )}
                  </div>
                  
                  {/* Time Zone Selection */}
                  <FormControl
                    name="time_zone"
                    label="Time zone"
                    error={errors.time_zone?.message}
                  >
                    <select
                      {...register('time_zone')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
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
                  </FormControl>
                </div>

                {/* Location */}
                <FormControl
                  name="location"
                  label="Location (optional)"
                  error={errors.location?.message}
                >
                  <Input
                    {...register('location')}
                    placeholder="Where is this happening?"
                  />
                </FormControl>

                {/* Color Selection */}
                <FormControl
                  name="color"
                  label="Event color"
                  error={errors.color?.message}
                >
                  <Input
                    {...register('color')}
                    type="color"
                    className="h-10 cursor-pointer"
                  />
                </FormControl>

                {/* Status Selection */}
                <FormControl
                  name="status"
                  label="Event status"
                  error={errors.status?.message}
                >
                  <select
                    {...register('status')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="confirmed">Confirmed</option>
                    <option value="tentative">Tentative</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </FormControl>

                {/* Relationship Association */}
                {relationships.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
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
                  <label className="block text-sm font-medium text-gray-700 mb-3">
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
                      <p className="text-sm text-gray-600">All your partners can see this event</p>
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
                      <p className="text-sm text-gray-600">Only you can see this event</p>
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
                      <p className="text-sm text-gray-600">Choose specific partners who can see this</p>
                    </button>
                  </div>

                  {/* Custom Privacy Selection */}
                  {privacyLevel === 'custom' && relationships.length > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-3">
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
                              <span className="text-sm text-gray-900">
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
                  <h3 className="flex items-center text-sm font-medium text-gray-700 mb-2">
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
                  <h3 className="flex items-center text-sm font-medium text-gray-700 mb-2">
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
              
              {/* File Attachments */}
              <div>
                <div className="mb-4">
                  <h3 className="flex items-center text-sm font-medium text-gray-700 mb-2">
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
                  onClick={() => router.push('/dashboard')}
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
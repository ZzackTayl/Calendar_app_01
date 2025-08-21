'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, MapPin, Palette, Eye, EyeOff, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { EventTemplateSchema, EventTemplateFormValues } from '@/lib/validation/enhanced-schemas';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

interface TemplateFormProps {
  template?: EventTemplateFormValues;
  onSubmit: (data: EventTemplateFormValues) => void;
  onCancel: () => void;
}

const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
  { value: 480, label: '8 hours' },
];

const COLOR_OPTIONS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

export function TemplateForm({ template, onSubmit, onCancel }: TemplateFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [customDuration, setCustomDuration] = useState(false);

  const form = useForm<EventTemplateFormValues>({
    resolver: zodResolver(EventTemplateSchema),
    defaultValues: {
      user_id: user?.id || '',
      name: template?.name || '',
      title: template?.title || '',
      description: template?.description || '',
      duration: template?.duration || 60,
      location: template?.location || '',
      color: template?.color || '#3b82f6',
      privacy_level: template?.privacy_level || 'private',
      relationship_id: template?.relationship_id || undefined,
      visible_to_relationships: template?.visible_to_relationships || [],
      visible_to_contacts: template?.visible_to_contacts || [],
      visible_to_groups: template?.visible_to_groups || [],
      ...(template?.id && { id: template.id }),
    },
  });

  const watchedValues = form.watch();
  const { errors } = form.formState;

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  const handleSubmit = (data: EventTemplateFormValues) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be signed in to create templates.',
        variant: 'destructive',
      });
      return;
    }

    // Ensure user_id is set
    data.user_id = user.id;
    onSubmit(data);
  };

  const handleDurationChange = (value: string) => {
    const duration = parseInt(value);
    if (duration === -1) {
      setCustomDuration(true);
      form.setValue('duration', 60);
    } else {
      setCustomDuration(false);
      form.setValue('duration', duration);
    }
  };

  return (
    <div className="space-y-6">
      {/* Preview Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            checked={isPreviewMode}
            onCheckedChange={setIsPreviewMode}
          />
          <Label>Preview Mode</Label>
        </div>
        <div className="flex items-center space-x-2">
          {isPreviewMode ? (
            <Eye className="w-4 h-4 text-muted-foreground" />
          ) : (
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {isPreviewMode ? (
        /* Preview Card */
        <Card className="border-2 border-dashed">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{watchedValues.name || 'Template Name'}</CardTitle>
              <Badge variant={
                watchedValues.privacy_level === 'public' ? 'default' : 
                watchedValues.privacy_level === 'private' ? 'secondary' : 'outline'
              }>
                {watchedValues.privacy_level === 'public' ? 'Public' : 
                 watchedValues.privacy_level === 'private' ? 'Private' : 'Custom'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground mb-3">
              {watchedValues.description || watchedValues.title || 'Template description will appear here'}
            </p>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{formatDuration(watchedValues.duration || 60)}</span>
              </div>
              {watchedValues.location && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{watchedValues.location}</span>
                </div>
              )}
            </div>

            <div 
              className="w-full h-2 rounded-full"
              style={{ backgroundColor: watchedValues.color || '#3b82f6' }}
            />
          </CardContent>
        </Card>
      ) : (
        /* Form Fields */
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Team Meeting, Client Call, Lunch Break"
                {...form.register('name')}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="title">Event Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Weekly Team Sync"
                {...form.register('title')}
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description for the event"
                {...form.register('description')}
                rows={3}
                className={errors.description ? 'border-destructive' : ''}
              />
              {errors.description && (
                <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Duration and Location */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration *</Label>
              <Select
                value={customDuration ? '-1' : watchedValues.duration?.toString() || '60'}
                onValueChange={handleDurationChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="-1">Custom</SelectItem>
                </SelectContent>
              </Select>
              {customDuration && (
                <div className="mt-2">
                  <Input
                    type="number"
                    placeholder="Enter duration in minutes"
                    min="1"
                    max="1440"
                    {...form.register('duration', { valueAsNumber: true })}
                    className={errors.duration ? 'border-destructive' : ''}
                  />
                  {errors.duration && (
                    <p className="text-sm text-destructive mt-1">{errors.duration.message}</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Conference Room A, Zoom Meeting"
                {...form.register('location')}
                className={errors.location ? 'border-destructive' : ''}
              />
              {errors.location && (
                <p className="text-sm text-destructive mt-1">{errors.location.message}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Color and Privacy */}
          <div className="space-y-4">
            <div>
              <Label>Color</Label>
              <div className="flex items-center space-x-2 mt-2">
                <div className="flex space-x-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        watchedValues.color === color ? 'border-foreground scale-110' : 'border-muted hover:border-foreground/50'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => form.setValue('color', color)}
                      title={`Select color ${color}`}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
                <Input
                  type="color"
                  value={watchedValues.color || '#3b82f6'}
                  onChange={(e) => form.setValue('color', e.target.value)}
                  className="w-12 h-8 p-1 border rounded"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="privacy">Privacy Level *</Label>
              <Select
                value={watchedValues.privacy_level}
                onValueChange={(value) => form.setValue('privacy_level', value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select privacy level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">
                    <div className="flex items-center space-x-2">
                      <EyeOff className="w-4 h-4" />
                      <span>Private - Only you can see</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="public">
                    <div className="flex items-center space-x-2">
                      <Eye className="w-4 h-4" />
                      <span>Public - Everyone can see</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="custom">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span>Custom - Select specific people</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.privacy_level && (
                <p className="text-sm text-destructive mt-1">{errors.privacy_level.message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={form.handleSubmit(handleSubmit)}>
          {template ? 'Update Template' : 'Create Template'}
        </Button>
      </div>
    </div>
  );
}

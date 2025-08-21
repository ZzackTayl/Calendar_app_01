'use client';

import { useState } from 'react';
import { Clock, MapPin, Calendar, ArrowRight, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Conflict } from '@/lib/conflicts/conflict-detection';
import React from 'react';
import { format, addMinutes, subMinutes } from 'date-fns';

interface ConflictResolverProps {
  conflict: Conflict | null;
  onResolve: (resolution: ConflictResolution) => void;
  onCancel: () => void;
  open: boolean;
}

export interface ConflictResolution {
  type: 'reschedule' | 'adjust_duration' | 'ignore' | 'modify_conflicting';
  action: 'move_start' | 'move_end' | 'shorten' | 'extend' | 'ignore' | 'delete_conflicting';
  value?: number; // minutes to adjust
  newStartTime?: Date;
  newEndTime?: Date;
}

export function ConflictResolver({ conflict, onResolve, onCancel, open }: ConflictResolverProps) {
  const [resolutionType, setResolutionType] = useState<'reschedule' | 'adjust_duration' | 'ignore'>('reschedule');
  const [adjustmentValue, setAdjustmentValue] = useState<number>(15);
  const [adjustmentType, setAdjustmentType] = useState<'move_start' | 'move_end'>('move_start');

  if (!conflict) {
    return null;
  }

  const getConflictIcon = (type: string) => {
    switch (type) {
      case 'overlap':
        return Clock;
      case 'travel_time':
        return MapPin;
      case 'recurring':
        return Calendar;
      default:
        return AlertTriangle;
    }
  };

  const getConflictTypeLabel = (type: string): string => {
    switch (type) {
      case 'overlap':
        return 'Time Overlap';
      case 'travel_time':
        return 'Travel Time';
      case 'recurring':
        return 'Recurring Event';
      default:
        return 'Conflict';
    }
  };

  const formatEventTime = (event: any) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    return `${format(start, 'MMM d, h:mm a')} - ${format(end, 'h:mm a')}`;
  };

  const handleResolve = () => {
    let resolution: ConflictResolution;

    switch (resolutionType) {
      case 'reschedule':
        const eventStart = new Date(conflict.conflictingEvent.start_time);
        const eventEnd = new Date(conflict.conflictingEvent.end_time);
        
        if (adjustmentType === 'move_start') {
          resolution = {
            type: 'reschedule',
            action: 'move_start',
            value: adjustmentValue,
            newStartTime: addMinutes(eventStart, adjustmentValue),
            newEndTime: addMinutes(eventEnd, adjustmentValue),
          };
        } else {
          resolution = {
            type: 'reschedule',
            action: 'move_end',
            value: adjustmentValue,
            newStartTime: subMinutes(eventStart, adjustmentValue),
            newEndTime: subMinutes(eventEnd, adjustmentValue),
          };
        }
        break;

      case 'adjust_duration':
        resolution = {
          type: 'adjust_duration',
          action: 'shorten',
          value: adjustmentValue,
        };
        break;

      case 'ignore':
        resolution = {
          type: 'ignore',
          action: 'ignore',
        };
        break;

      default:
        return;
    }

    onResolve(resolution);
  };

  const getResolutionDescription = () => {
    switch (resolutionType) {
      case 'reschedule':
        return `Move the conflicting event ${adjustmentType === 'move_start' ? 'later' : 'earlier'} by ${adjustmentValue} minutes`;
      case 'adjust_duration':
        return `Shorten the event duration by ${adjustmentValue} minutes`;
      case 'ignore':
        return 'Keep both events as scheduled (may cause conflicts)';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span>Resolve Scheduling Conflict</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Conflict Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                {React.createElement(getConflictIcon(conflict.type), { className: "h-4 w-4 text-orange-600" })}
                <CardTitle className="text-lg">{getConflictTypeLabel(conflict.type)}</CardTitle>
                <Badge variant={conflict.severity === 'error' ? 'destructive' : 'default'}>
                  {conflict.severity}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{conflict.message}</p>
              
              {/* Conflicting Event */}
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{conflict.conflictingEvent.title}</span>
                  <Badge variant="secondary">{conflict.conflictingEvent.privacy_level}</Badge>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatEventTime(conflict.conflictingEvent)}</span>
                  </div>
                  {conflict.conflictingEvent.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-3 w-3" />
                      <span>{conflict.conflictingEvent.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resolution Options */}
          <Card>
            <CardHeader>
              <CardTitle>Resolution Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={resolutionType} onValueChange={(value: any) => setResolutionType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="reschedule" id="reschedule" />
                  <Label htmlFor="reschedule" className="flex-1">
                    <div>
                      <div className="font-medium">Reschedule Event</div>
                      <div className="text-sm text-muted-foreground">
                        Move the conflicting event to avoid overlap
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="adjust_duration" id="adjust_duration" />
                  <Label htmlFor="adjust_duration" className="flex-1">
                    <div>
                      <div className="font-medium">Adjust Duration</div>
                      <div className="text-sm text-muted-foreground">
                        Shorten the event to fit in available time
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ignore" id="ignore" />
                  <Label htmlFor="ignore" className="flex-1">
                    <div>
                      <div className="font-medium">Ignore Conflict</div>
                      <div className="text-sm text-muted-foreground">
                        Keep both events as scheduled
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {/* Adjustment Controls */}
              {resolutionType === 'reschedule' && (
                <div className="space-y-3 pl-6">
                  <div>
                    <Label>Adjustment Type</Label>
                    <Select value={adjustmentType} onValueChange={(value: any) => setAdjustmentType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="move_start">Move Later</SelectItem>
                        <SelectItem value="move_end">Move Earlier</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Minutes to Adjust</Label>
                    <Input
                      type="number"
                      min="5"
                      max="120"
                      step="5"
                      value={adjustmentValue}
                      onChange={(e) => setAdjustmentValue(parseInt(e.target.value) || 15)}
                    />
                  </div>
                </div>
              )}

              {resolutionType === 'adjust_duration' && (
                <div className="space-y-3 pl-6">
                  <div>
                    <Label>Minutes to Shorten</Label>
                    <Input
                      type="number"
                      min="5"
                      max="60"
                      step="5"
                      value={adjustmentValue}
                      onChange={(e) => setAdjustmentValue(parseInt(e.target.value) || 15)}
                    />
                  </div>
                </div>
              )}

              {/* Resolution Preview */}
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="text-sm font-medium mb-1">Resolution Preview:</div>
                <div className="text-sm text-muted-foreground">
                  {getResolutionDescription()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleResolve}>
              Apply Resolution
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

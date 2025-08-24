'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Clock, User, CheckCircle } from 'lucide-react';
import { ConflictCheckRequest, ConflictCheckResponse, SchedulingConflict } from '@/lib/supabase/types';
import { format, parseISO } from 'date-fns';

interface ConflictDetectorProps {
  eventStart: string;
  eventEnd: string;
  partnerIds: string[];
  excludeEventId?: string;
  onConflictsFound?: (conflicts: SchedulingConflict[]) => void;
  onNoConflicts?: () => void;
  className?: string;
}

export function ConflictDetector({ 
  eventStart, 
  eventEnd, 
  partnerIds, 
  excludeEventId,
  onConflictsFound,
  onNoConflicts,
  className 
}: ConflictDetectorProps) {
  const [conflicts, setConflicts] = useState<SchedulingConflict[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (eventStart && eventEnd && partnerIds.length > 0) {
      checkConflicts();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventStart, eventEnd, partnerIds, excludeEventId]);

  const checkConflicts = async () => {
    if (!eventStart || !eventEnd || partnerIds.length === 0) return;

    setIsChecking(true);
    setError('');

    try {
      const requestData: ConflictCheckRequest = {
        event_start: eventStart,
        event_end: eventEnd,
        partner_ids: partnerIds,
        exclude_event_id: excludeEventId
      };

      const response = await fetch('/api/events/check-conflicts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result: ConflictCheckResponse = await response.json();

      if (result.success) {
        setConflicts(result.conflicts);
        setHasChecked(true);
        
        if (result.has_conflicts) {
          onConflictsFound?.(result.conflicts);
        } else {
          onNoConflicts?.();
        }
      } else {
        setError(result.error || 'Failed to check conflicts');
      }
    } catch (error) {
      console.error('Error checking conflicts:', error);
      setError('Failed to check for scheduling conflicts');
    } finally {
      setIsChecking(false);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'h:mm a');
    } catch {
      return dateString;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const getOverlapText = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  if (!hasChecked && !isChecking) {
    return null;
  }

  return (
    <div className={className}>
      {isChecking && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-yellow-600 mr-2" />
            <span className="text-yellow-800">Checking for scheduling conflicts...</span>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {!isChecking && !error && conflicts.length === 0 && hasChecked && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center py-4">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="text-green-800">No scheduling conflicts found!</span>
          </CardContent>
        </Card>
      )}

      {!isChecking && !error && conflicts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="w-5 h-5" />
              Scheduling Conflicts Detected
            </CardTitle>
            <CardDescription className="text-orange-700">
              The following partners have existing events during this time:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {conflicts.map((conflict) => (
              <div key={conflict.partner_id} className="border border-orange-200 rounded-lg p-3 bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-orange-600" />
                  <span className="font-medium text-gray-900">{conflict.partner_name}</span>
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    {conflict.conflicting_events.length} conflict{conflict.conflicting_events.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  {conflict.conflicting_events.map((event) => (
                    <div key={event.id} className="flex items-start gap-3 p-2 bg-gray-50 rounded">
                      <Clock className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{event.title}</p>
                        <p className="text-sm text-gray-600">
                          {formatDate(event.start_time)} • {formatTime(event.start_time)} - {formatTime(event.end_time)}
                        </p>
                        <p className="text-xs text-orange-600 font-medium">
                          Overlaps by {getOverlapText(event.overlap_minutes)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="bg-orange-100 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-800">
                <strong>Note:</strong> You can still create this event, but be aware of the scheduling conflicts. 
                Consider discussing with your partners to avoid double-booking.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

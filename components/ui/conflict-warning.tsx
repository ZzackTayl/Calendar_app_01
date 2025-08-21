'use client';

import { useState } from 'react';
import { AlertTriangle, Clock, MapPin, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Conflict } from '@/lib/conflicts/conflict-detection';
import { format, formatDistanceToNow } from 'date-fns';

interface ConflictWarningProps {
  conflicts: Conflict[];
  onResolve?: (conflict: Conflict) => void;
  onIgnore?: (conflict: Conflict) => void;
  className?: string;
}

export function ConflictWarning({ conflicts, onResolve, onIgnore, className }: ConflictWarningProps) {
  const [expanded, setExpanded] = useState(false);

  if (conflicts.length === 0) {
    return null;
  }

  const errors = conflicts.filter(c => c.severity === 'error');
  const warnings = conflicts.filter(c => c.severity === 'warning');
  const hasErrors = errors.length > 0;

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

  const getSeverityColor = (severity: string) => {
    return severity === 'error' ? 'destructive' : 'default';
  };

  const formatEventTime = (event: any) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    return `${format(start, 'MMM d, h:mm a')} - ${format(end, 'h:mm a')}`;
  };

  return (
    <div className={className}>
      <Alert variant={hasErrors ? 'destructive' : 'default'} className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-medium">
              {hasErrors ? 'Scheduling Conflicts Detected' : 'Potential Conflicts'}
            </span>
            <Badge variant={getSeverityColor(hasErrors ? 'error' : 'warning')}>
              {conflicts.length} {conflicts.length === 1 ? 'conflict' : 'conflicts'}
            </Badge>
          </div>
          <Collapsible open={expanded} onOpenChange={setExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm">
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-3">
              {conflicts.map((conflict, index) => {
                const Icon = getConflictIcon(conflict.type);
                const typeLabel = getConflictTypeLabel(conflict.type);

                return (
                  <Card key={index} className="border-l-4 border-l-orange-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-4 w-4 text-orange-600" />
                          <CardTitle className="text-sm font-medium">
                            {typeLabel}
                          </CardTitle>
                          <Badge variant={getSeverityColor(conflict.severity)} className="text-xs">
                            {conflict.severity}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          {onResolve && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onResolve(conflict)}
                            >
                              Resolve
                            </Button>
                          )}
                          {onIgnore && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onIgnore(conflict)}
                            >
                              Ignore
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground mb-3">
                        {conflict.message}
                      </p>
                      
                      {/* Conflicting Event Details */}
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">
                            {conflict.conflictingEvent.title}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {conflict.conflictingEvent.privacy_level}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1 text-xs text-muted-foreground">
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
                          
                          {conflict.conflictingEvent.recurrence_rule && (
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>Recurring event</span>
                            </div>
                          )}
                        </div>

                        {/* Additional Details */}
                        {conflict.details && (
                          <div className="mt-2 pt-2 border-t border-muted/30">
                            {conflict.details.overlapMinutes && (
                              <div className="text-xs text-muted-foreground">
                                Overlap: {conflict.details.overlapMinutes} minutes
                              </div>
                            )}
                            {conflict.details.travelTimeMinutes && (
                              <div className="text-xs text-muted-foreground">
                                Travel time: {conflict.details.travelTimeMinutes} minutes
                              </div>
                            )}
                            {conflict.details.conflictingInstances && (
                              <div className="text-xs text-muted-foreground">
                                {conflict.details.conflictingInstances.length} conflicting instances
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </AlertDescription>
      </Alert>
    </div>
  );
}

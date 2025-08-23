/**
 * AI-Powered Natural Language Event Input Component
 * Provides intelligent parsing and suggestions for event creation
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Clock, MapPin, Users, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';
import { ParsedEvent } from '@/lib/nlp/event-parser';

interface NaturalLanguageInputProps {
  onEventParsed: (events: ParsedEvent[]) => void;
  onSuggestionSelect?: (suggestion: string) => void;
  placeholder?: string;
  className?: string;
}

interface ParseResponse {
  events: ParsedEvent[];
  suggestions: string[];
  alternatives?: ParsedEvent[][];
  confidenceAnalysis?: {
    overall: number;
    breakdown: Array<{
      title: string;
      confidence: number;
      factors: Record<string, any>;
    }>;
    recommendations: string[];
  };
}

const EXAMPLE_INPUTS = [
  "Meeting with Sarah tomorrow at 2pm in Conference Room A",
  "Lunch with the team next Friday at noon at Mario's",
  "Weekly standup every Monday at 9am",
  "Doctor appointment next Tuesday morning",
  "Birthday party for Mom this Saturday at 6pm",
  "Conference call with clients at 3pm today"
];

export function NaturalLanguageInput({
  onEventParsed,
  onSuggestionSelect,
  placeholder = "Describe your event naturally (e.g., \"Meeting with John tomorrow at 2pm\")",
  className
}: NaturalLanguageInputProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [parsedEvents, setParsedEvents] = useState<ParsedEvent[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [confidence, setConfidence] = useState<number>(0);
  const [alternatives, setAlternatives] = useState<ParsedEvent[][]>([]);
  const [activeExample, setActiveExample] = useState<number>(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedInput = useDebounce(input, 500);

  // Auto-suggestions based on input
  useEffect(() => {
    if (debouncedInput && debouncedInput.length > 3) {
      fetchSuggestions(debouncedInput);
    } else {
      setSuggestions([]);
      setParsedEvents([]);
      setAlternatives([]);
    }
  }, [debouncedInput]);

  const fetchSuggestions = useCallback(async (text: string) => {
    try {
      const response = await fetch(`/api/events/parse-natural?input=${encodeURIComponent(text)}`);
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    }
  }, []);

  const parseInput = useCallback(async (text: string, includeAlternatives = false) => {
    if (!text.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/events/parse-natural', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: text,
          options: {
            parseMultiple: true,
            includeConfidenceDetails: true,
            generateAlternatives: includeAlternatives
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to parse event');
      }

      const data: ParseResponse = await response.json();
      
      setParsedEvents(data.events);
      setConfidence(data.confidenceAnalysis?.overall || 0);
      setAlternatives(data.alternatives || []);
      
      // Notify parent component
      onEventParsed(data.events);
      
    } catch (error) {
      console.error('Parsing error:', error);
      setSuggestions(['Please try rephrasing your event description']);
    } finally {
      setIsLoading(false);
    }
  }, [onEventParsed]);

  const handleInputChange = (value: string) => {
    setInput(value);
    setShowSuggestions(true);
    setActiveExample(-1);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setShowSuggestions(false);
    onSuggestionSelect?.(suggestion);
    parseInput(suggestion);
  };

  const handleExampleClick = (example: string, index: number) => {
    setInput(example);
    setActiveExample(index);
    setShowSuggestions(false);
    parseInput(example);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      parseInput(input, true);
      setShowSuggestions(false);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-600';
    if (conf >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadge = (conf: number) => {
    if (conf >= 0.8) return { label: 'High', color: 'bg-green-100 text-green-800' };
    if (conf >= 0.6) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Low', color: 'bg-red-100 text-red-800' };
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main Input */}
      <div className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            className="pr-12 text-lg py-3"
            disabled={isLoading}
          />
          {isLoading ? (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Sparkles className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* Live Suggestions */}
        {showSuggestions && (suggestions.length > 0 || input.length === 0) && (
          <Card className="absolute top-full left-0 right-0 z-10 mt-1 shadow-lg">
            <CardContent className="p-2">
              {input.length === 0 ? (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Try these examples:</div>
                  <div className="space-y-1">
                    {EXAMPLE_INPUTS.map((example, index) => (
                      <button
                        key={index}
                        onClick={() => handleExampleClick(example, index)}
                        className={cn(
                          "w-full text-left px-2 py-1 rounded text-sm hover:bg-accent transition-colors",
                          activeExample === index && "bg-accent"
                        )}
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Suggestions:</div>
                  <div className="space-y-1">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-2 py-1 rounded text-sm hover:bg-accent transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Parse Button */}
      <Button
        onClick={() => parseInput(input, true)}
        disabled={!input.trim() || isLoading}
        className="w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Parsing with AI...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Parse Event
          </>
        )}
      </Button>

      {/* Parsed Events Preview */}
      {parsedEvents.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Parsed Events</h3>
            {confidence > 0 && (
              <Badge className={getConfidenceBadge(confidence).color}>
                {getConfidenceBadge(confidence).label} Confidence
              </Badge>
            )}
          </div>
          
          {parsedEvents.map((event, index) => (
            <Card key={index} className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-medium text-lg">{event.title}</h4>
                    <Badge 
                      variant="outline"
                      className={getConfidenceColor(event.confidence)}
                    >
                      {Math.round(event.confidence * 100)}%
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {event.startDate.toLocaleDateString()} at {event.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {event.endDate && ` - ${event.endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {event.location}
                      </div>
                    )}
                    
                    {event.attendees && event.attendees.length > 0 && (
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {event.attendees.join(', ')}
                      </div>
                    )}
                    
                    {event.category && (
                      <div className="flex items-center">
                        <Badge variant="secondary" className="text-xs">
                          {event.category}
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  {event.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {event.description}
                    </p>
                  )}
                  
                  {event.suggestions && event.suggestions.length > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center text-xs text-amber-600 mb-1">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Suggestions
                      </div>
                      <div className="space-y-1">
                        {event.suggestions.map((suggestion, i) => (
                          <div key={i} className="text-xs text-muted-foreground">
                            • {suggestion}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Alternative Interpretations */}
      {alternatives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Alternative Interpretations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alternatives.map((altEvents, index) => (
              <div key={index} className="p-2 border rounded">
                {altEvents.map((event, eventIndex) => (
                  <div key={eventIndex} className="text-sm">
                    <span className="font-medium">{event.title}</span>
                    <span className="text-muted-foreground ml-2">
                      {event.startDate.toLocaleDateString()} at {event.startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {event.location && (
                      <span className="text-muted-foreground ml-2">@ {event.location}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import { NextResponse } from 'next/server';
/**
 * Natural Language Event Parsing API
 * Handles AI-powered event creation from natural language input
 */

import { NextRequest } from 'next/server'
import { createApiResponse, ErrorCode } from '@/lib/api/response-handler';
import { requireAuthentication } from '@/lib/auth/session-manager'
import { validateCSRFProtection } from '@/lib/security/csrf'
import { createRouteHandlerClient } from '@/lib/supabase/server';
import { eventParser, ParsedEvent } from '@/lib/nlp/event-parser';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { z } from 'zod';

// Validation schema
const parseEventSchema = z.object({
  input: z.string().min(1, 'Input text is required'),
  context: z.object({
    timezone: z.string().optional(),
    defaultDuration: z.number().optional(),
    contactContext: z.array(z.string()).optional(),
    userPreferences: z.object({
      defaultReminders: z.array(z.object({
        type: z.enum(['email', 'popup']),
        minutesBefore: z.number()
      })).optional(),
      workingHours: z.object({
        start: z.string(),
        end: z.string()
      }).optional()
    }).optional()
  }).optional(),
  options: z.object({
    parseMultiple: z.boolean().default(false),
    includeConfidenceDetails: z.boolean().default(false),
    generateAlternatives: z.boolean().default(false)
  }).optional()
});

export async function POST(request: NextRequest) {
  const api = createApiResponse();

  try {
    const supabase = await createRouteHandlerClient();
    
    // Verify authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return api.error(ErrorCode.UNAUTHORIZED);
    }

    // Parse and validate request
    const body = await request.json();
    const validatedData = parseEventSchema.parse(body);
    const { input, context, options } = validatedData;

    // Get user profile for additional context
    const { data: profile } = await supabase
      .from('users')
      .select('timezone, notification_preferences')
      .eq('id', session.user.id)
      .single();

    // Enhance context with user data
    const enhancedContext = {
      ...context,
      timezone: context?.timezone || profile?.timezone || 'UTC',
      userPreferences: {
        ...context?.userPreferences,
        ...profile?.notification_preferences
      }
    };

    let parsedEvents: ParsedEvent[];

    // Parse events
    if (options?.parseMultiple) {
      parsedEvents = await eventParser.parseMultipleEvents(input, enhancedContext);
    } else {
      const singleEvent = await eventParser.parseEvent(input, enhancedContext);
      parsedEvents = [singleEvent];
    }

    // Enhance with database context
    parsedEvents = await Promise.all(
      parsedEvents.map(event => enhanceEventWithContext(event, supabase, session.user.id))
    );

    // Generate alternatives if requested
    let alternatives: ParsedEvent[][] = [];
    if (options?.generateAlternatives && parsedEvents.length > 0) {
      alternatives = await generateAlternativeInterpretations(input, enhancedContext);
    }

    // Prepare response
    const response: any = {
      events: parsedEvents,
      suggestions: eventParser.getSuggestions(input),
      context: {
        timezone: enhancedContext.timezone,
        parseMetadata: {
          inputLength: input.length,
          eventsFound: parsedEvents.length,
          averageConfidence: parsedEvents.reduce((sum, e) => sum + e.confidence, 0) / parsedEvents.length
        }
      }
    };

    if (options?.includeConfidenceDetails) {
      response.confidenceAnalysis = analyzeParsedConfidence(parsedEvents);
    }

    if (alternatives.length > 0) {
      response.alternatives = alternatives;
    }

    return api.success(response);

  } catch (error) {
    console.error('Event parsing API error:', error);
    
    if (error instanceof z.ZodError) {
      return api.error(ErrorCode.VALIDATION_ERROR);
    }

    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}

/**
 * Enhance parsed event with database context
 */
async function enhanceEventWithContext(
  event: ParsedEvent,
  supabase: any,
  userId: string
): Promise<ParsedEvent> {
  try {
    // Match attendees with existing contacts
    if (event.attendees?.length) {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name, email')
        .eq('user_id', userId)
        .ilike('name', `%${event.attendees.join('%')}%`);

      if (contacts?.length) {
        event.attendees = contacts.map((c: any) => c.name);
      }
    }

    // Match location with previous events
    if (event.location) {
      const { data: similarEvents } = await supabase
        .from('events')
        .select('location')
        .eq('user_id', userId)
        .ilike('location', `%${event.location}%`)
        .limit(5);

      if (similarEvents?.length) {
        const exactMatch = similarEvents.find(
          (e: any) => e.location?.toLowerCase() === event.location?.toLowerCase()
        );
        if (exactMatch) {
          event.location = exactMatch.location; // Use exact casing from database
        }
      }
    }

    // Check for potential conflicts
    const conflictWindow = 30 * 60 * 1000; // 30 minutes
    const startTime = event.startDate.getTime();
    const endTime = (event.endDate || event.startDate).getTime();

    const { data: conflictingEvents } = await supabase
      .from('events')
      .select('id, title, start_time, end_time')
      .eq('user_id', userId)
      .gte('start_time', new Date(startTime - conflictWindow).toISOString())
      .lte('end_time', new Date(endTime + conflictWindow).toISOString());

    if (conflictingEvents?.length) {
      event.suggestions = [
        ...(event.suggestions || []),
        `Potential conflict with "${conflictingEvents[0].title}"`
      ];
    }

    return event;
  } catch (error) {
    console.error('Error enhancing event context:', error);
    return event;
  }
}

/**
 * Generate alternative interpretations of the input
 */
async function generateAlternativeInterpretations(
  input: string,
  context: any
): Promise<ParsedEvent[][]> {
  const alternatives: ParsedEvent[][] = [];

  try {
    // Alternative 1: Different time interpretation
    const timeVariations = [
      input.replace(/morning/gi, '9:00 AM'),
      input.replace(/afternoon/gi, '2:00 PM'),
      input.replace(/evening/gi, '6:00 PM')
    ];

    for (const variation of timeVariations) {
      if (variation !== input) {
        const altEvent = await eventParser.parseEvent(variation, context);
        if (altEvent.confidence > 0.4) {
          alternatives.push([altEvent]);
        }
      }
    }

    // Alternative 2: Different duration assumptions
    const durationVariations = [
      { ...context, defaultDuration: 30 },
      { ...context, defaultDuration: 120 },
      { ...context, defaultDuration: 240 }
    ];

    for (const durContext of durationVariations) {
      const altEvent = await eventParser.parseEvent(input, durContext);
      if (altEvent.confidence > 0.4) {
        alternatives.push([altEvent]);
      }
    }
  } catch (error) {
    console.error('Error generating alternatives:', error);
  }

  return alternatives.slice(0, 3); // Limit to 3 alternatives
}

/**
 * Analyze confidence details
 */
function analyzeParsedConfidence(events: ParsedEvent[]) {
  return {
    overall: events.reduce((sum, e) => sum + e.confidence, 0) / events.length,
    breakdown: events.map(event => ({
      title: event.title,
      confidence: event.confidence,
      factors: {
        hasValidDate: !!event.startDate && !isNaN(event.startDate.getTime()),
        hasLocation: !!event.location,
        hasAttendees: !!event.attendees?.length,
        titleQuality: event.title.length > 5 ? 'good' : 'poor',
        categoryDetected: event.category !== 'general'
      }
    })),
    recommendations: generateConfidenceRecommendations(events)
  };
}

/**
 * Generate recommendations based on confidence analysis
 */
function generateConfidenceRecommendations(events: ParsedEvent[]): string[] {
  const recommendations: string[] = [];
  const lowConfidenceEvents = events.filter(e => e.confidence < 0.6);

  if (lowConfidenceEvents.length > 0) {
    recommendations.push('Some events have low confidence - please review details');
  }

  const eventsWithoutTime = events.filter(e => 
    e.startDate.getHours() === 0 && e.startDate.getMinutes() === 0
  );
  
  if (eventsWithoutTime.length > 0) {
    recommendations.push('Consider specifying exact times for better accuracy');
  }

  const eventsWithoutLocation = events.filter(e => !e.location);
  if (eventsWithoutLocation.length > 0) {
    recommendations.push('Adding locations can improve event organization');
  }

  return recommendations;
}

// GET endpoint for parsing suggestions
export async function GET(request: NextRequest) {
  const api = createApiResponse();

  try {
    const { searchParams } = new URL(request.url);
    const input = searchParams.get('input') || '';

    if (!input) {
      return api.success({
        suggestions: [
          'Try: "Meeting with John tomorrow at 2pm"',
          'Try: "Lunch at Mario\'s next Friday"',
          'Try: "Weekly team standup every Monday 9am"',
          'Try: "Doctor appointment next week"'
        ]
      });
    }

    const suggestions = eventParser.getSuggestions(input);
    
    return api.success({ suggestions });
  } catch (error) {
    console.error('Suggestions API error:', error);
    return api.error(ErrorCode.INTERNAL_ERROR);
  }
}
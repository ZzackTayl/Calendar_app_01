/**
 * AI-Powered Event Parser for Natural Language Processing
 * Implements sophisticated event extraction using OpenAI and advanced date parsing
 */

import OpenAI from 'openai';
import * as chrono from 'chrono-node';
import { parseISO, format, isValid } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

export interface ParsedEvent {
  title: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  location?: string;
  timezone?: string;
  attendees?: string[];
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  isAllDay?: boolean;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    endDate?: Date;
    daysOfWeek?: number[];
  };
  reminders?: {
    type: 'email' | 'popup';
    minutesBefore: number;
  }[];
  confidence: number;
  suggestions?: string[];
}

export interface ParsedEntity {
  type: 'person' | 'location' | 'time' | 'duration' | 'activity' | 'priority';
  value: string;
  confidence: number;
  originalText: string;
}

export class EventParser {
  private openai: OpenAI | null;
  private customChrono: any;

  constructor(apiKey?: string) {
    this.openai = apiKey ? new OpenAI({ apiKey }) : null;
    
    // Configure chrono for better date parsing
    this.customChrono = chrono.casual.clone();
    this.setupCustomDateParsing();
  }

  private setupCustomDateParsing() {
    // Add custom patterns for better date recognition
    const customPatterns = [
      // Tomorrow at 3pm
      /tomorrow\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i,
      // Next Monday morning
      /(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(morning|afternoon|evening)/i,
      // In 2 hours
      /in\s+(\d+)\s+(hours?|minutes?|days?)/i,
      // End of the week
      /(end|beginning)\s+of\s+(the\s+)?(week|month)/i,
    ];

    // Custom refiners for context-aware parsing
    this.customChrono.refiners.push({
      refine: (context: any, results: any[]) => {
        return results.map(result => {
          // Enhance with timezone information if available
          if (result.start && !result.start.get('timezoneOffset')) {
            // Default to user's timezone or UTC
            result.start.assign('timezoneOffset', new Date().getTimezoneOffset());
          }
          return result;
        });
      }
    });
  }

  /**
   * Parse natural language input into structured event data
   */
  async parseEvent(input: string, context?: {
    timezone?: string;
    defaultDuration?: number;
    contactContext?: string[];
  }): Promise<ParsedEvent> {
    try {
      // Step 1: Use AI to extract structured information
      const aiParsed = await this.parseWithAI(input, context);
      
      // Step 2: Parse dates with chrono
      const chronoParsed = this.parseWithChrono(input, context?.timezone);
      
      // Step 3: Extract entities
      const entities = this.extractEntities(input);
      
      // Step 4: Merge and validate results
      const merged = this.mergeParsingResults(aiParsed, chronoParsed, entities, input);
      
      // Step 5: Apply intelligent defaults and suggestions
      return this.applyIntelligentDefaults(merged, context);
      
    } catch (error) {
      console.error('Event parsing failed:', error);
      return this.createFallbackEvent(input);
    }
  }

  /**
   * Use OpenAI to parse complex natural language
   */
  private async parseWithAI(input: string, context?: any): Promise<Partial<ParsedEvent>> {
    if (!this.openai) {
      return {}; // Graceful degradation when no API key
    }

    try {
      const systemPrompt = `You are an expert event parser. Extract structured event information from natural language.

Context: ${JSON.stringify(context || {})}

Parse the following text and return JSON with these fields:
- title: Event title (required)
- description: Detailed description (optional)
- startDate: ISO date string (required)
- endDate: ISO date string (optional)
- location: Location string (optional)
- attendees: Array of people mentioned (optional)
- category: Event category (meeting, social, work, personal, etc.)
- priority: low/medium/high based on language
- isAllDay: boolean for all-day events
- recurrence: Object with frequency, interval, etc. if recurring
- reminders: Array with type and minutesBefore
- confidence: 0-1 confidence score

Return valid JSON only. If dates are relative (like "tomorrow"), convert to absolute ISO strings.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return {};

      return JSON.parse(content);
    } catch (error) {
      console.error('AI parsing failed:', error);
      return {};
    }
  }

  /**
   * Parse dates using chrono-node
   */
  private parseWithChrono(input: string, timezone?: string): Partial<ParsedEvent> {
    const results = this.customChrono.parse(input, new Date(), {
      forwardDate: true,
      timezone: timezone
    });

    if (!results.length) return {};

    const firstResult = results[0];
    const startDate = firstResult.start?.date();
    const endDate = firstResult.end?.date();

    return {
      startDate,
      endDate,
      timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  /**
   * Extract entities using rule-based patterns
   */
  private extractEntities(input: string): ParsedEntity[] {
    const entities: ParsedEntity[] = [];

    // Person extraction patterns
    const personPatterns = [
      /with\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /meet\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
      /see\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
    ];

    // Location patterns
    const locationPatterns = [
      /at\s+([A-Z][^,\n]*(?:Room|Office|Building|Street|Avenue|Drive)[^,\n]*)/gi,
      /in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+Room|\s+Office)?)/g,
      /@\s*([^,\n]+)/g,
    ];

    // Priority patterns
    const priorityPatterns = [
      { pattern: /(urgent|critical|asap|immediately)/i, priority: 'high' as const },
      { pattern: /(important|priority|must)/i, priority: 'medium' as const },
      { pattern: /(when\s+possible|if\s+time|maybe)/i, priority: 'low' as const },
    ];

    // Extract persons
    personPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(input)) !== null) {
        entities.push({
          type: 'person',
          value: match[1],
          confidence: 0.8,
          originalText: match[0]
        });
      }
    });

    // Extract locations
    locationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(input)) !== null) {
        entities.push({
          type: 'location',
          value: match[1],
          confidence: 0.7,
          originalText: match[0]
        });
      }
    });

    // Extract priority
    priorityPatterns.forEach(({ pattern, priority }) => {
      if (pattern.test(input)) {
        entities.push({
          type: 'priority',
          value: priority,
          confidence: 0.9,
          originalText: input.match(pattern)?.[0] || ''
        });
      }
    });

    return entities;
  }

  /**
   * Merge results from different parsing methods
   */
  private mergeParsingResults(
    aiParsed: Partial<ParsedEvent>,
    chronoParsed: Partial<ParsedEvent>,
    entities: ParsedEntity[],
    originalInput: string
  ): ParsedEvent {
    // Prioritize AI parsing for structured data, chrono for dates
    const startDate = chronoParsed.startDate || aiParsed.startDate || new Date();
    const endDate = chronoParsed.endDate || aiParsed.endDate;

    // Extract entity values
    const attendees = entities
      .filter(e => e.type === 'person')
      .map(e => e.value);

    const location = entities
      .find(e => e.type === 'location')?.value || aiParsed.location;

    const priority = entities
      .find(e => e.type === 'priority')?.value as 'low' | 'medium' | 'high' || aiParsed.priority || 'medium';

    return {
      title: aiParsed.title || this.extractTitle(originalInput),
      description: aiParsed.description,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      location,
      timezone: chronoParsed.timezone || aiParsed.timezone,
      attendees: attendees.length > 0 ? attendees : aiParsed.attendees,
      category: aiParsed.category || this.inferCategory(originalInput),
      priority,
      isAllDay: aiParsed.isAllDay || this.isAllDayEvent(originalInput),
      recurrence: aiParsed.recurrence,
      reminders: aiParsed.reminders,
      confidence: this.calculateConfidence(aiParsed, chronoParsed, entities),
      suggestions: this.generateSuggestions(originalInput, entities)
    };
  }

  /**
   * Apply intelligent defaults and enhancements
   */
  private applyIntelligentDefaults(event: ParsedEvent, context?: any): ParsedEvent {
    // Add default end date if missing
    if (!event.endDate && !event.isAllDay) {
      const defaultDuration = context?.defaultDuration || 60; // 1 hour default
      event.endDate = new Date(event.startDate.getTime() + defaultDuration * 60 * 1000);
    }

    // Add default reminder for important events
    if (!event.reminders && event.priority === 'high') {
      event.reminders = [
        { type: 'popup', minutesBefore: 15 },
        { type: 'email', minutesBefore: 60 }
      ];
    } else if (!event.reminders) {
      event.reminders = [{ type: 'popup', minutesBefore: 15 }];
    }

    // Enhance title if too generic
    if (event.title.length < 3) {
      event.title = this.enhanceTitle(event.title, event);
    }

    return event;
  }

  /**
   * Extract title from input
   */
  private extractTitle(input: string): string {
    // Remove common prefixes
    let title = input
      .replace(/^(schedule|plan|book|create|add|set up)\s+/i, '')
      .replace(/^(a|an|the)\s+/i, '')
      .trim();

    // Take first sentence or clause
    title = title.split(/[.!?;]/)[0];
    
    // Capitalize first letter
    return title.charAt(0).toUpperCase() + title.slice(1);
  }

  /**
   * Infer event category from content
   */
  private inferCategory(input: string): string {
    const categories = {
      work: /meeting|standup|review|presentation|call|interview|project/i,
      social: /party|dinner|lunch|drinks|coffee|hangout|social/i,
      health: /doctor|dentist|appointment|checkup|therapy|gym|workout/i,
      personal: /birthday|anniversary|family|personal|vacation|holiday/i,
      education: /class|lecture|seminar|workshop|training|course/i
    };

    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(input)) {
        return category;
      }
    }

    return 'general';
  }

  /**
   * Detect all-day events
   */
  private isAllDayEvent(input: string): boolean {
    return /all.day|entire.day|full.day|whole.day/i.test(input);
  }

  /**
   * Calculate parsing confidence
   */
  private calculateConfidence(
    aiParsed: Partial<ParsedEvent>,
    chronoParsed: Partial<ParsedEvent>,
    entities: ParsedEntity[]
  ): number {
    let confidence = 0.5; // Base confidence

    // Boost for successful AI parsing
    if (aiParsed.title) confidence += 0.2;
    if (aiParsed.startDate) confidence += 0.2;

    // Boost for successful date parsing
    if (chronoParsed.startDate) confidence += 0.2;

    // Boost for entity extraction
    confidence += Math.min(0.2, entities.length * 0.05);

    return Math.min(1, confidence);
  }

  /**
   * Generate intelligent suggestions
   */
  private generateSuggestions(input: string, entities: ParsedEntity[]): string[] {
    const suggestions: string[] = [];

    // Suggest missing location if person mentioned but no location
    const hasPerson = entities.some(e => e.type === 'person');
    const hasLocation = entities.some(e => e.type === 'location');
    if (hasPerson && !hasLocation) {
      suggestions.push('Consider adding a meeting location');
    }

    // Suggest recurring if pattern detected
    if (/weekly|daily|monthly|every/i.test(input)) {
      suggestions.push('This might be a recurring event');
    }

    // Suggest preparation time for important meetings
    if (/meeting|presentation|interview/i.test(input)) {
      suggestions.push('Consider adding preparation time before the event');
    }

    return suggestions;
  }

  /**
   * Create fallback event when parsing fails
   */
  private createFallbackEvent(input: string): ParsedEvent {
    return {
      title: this.extractTitle(input),
      startDate: new Date(),
      confidence: 0.3,
      category: 'general',
      priority: 'medium',
      reminders: [{ type: 'popup', minutesBefore: 15 }],
      suggestions: ['Please review and update event details']
    };
  }

  /**
   * Enhance generic titles
   */
  private enhanceTitle(title: string, event: ParsedEvent): string {
    if (event.attendees?.length) {
      return `Meeting with ${event.attendees.join(', ')}`;
    }
    if (event.location) {
      return `Event at ${event.location}`;
    }
    return title || 'New Event';
  }

  /**
   * Parse multiple events from complex input
   */
  async parseMultipleEvents(input: string, context?: any): Promise<ParsedEvent[]> {
    // Split input by sentence boundaries and parse each potential event
    const sentences = input.split(/[.!?]\s+/);
    const events: ParsedEvent[] = [];

    for (const sentence of sentences) {
      if (sentence.trim().length > 10) { // Minimum viable event description
        const event = await this.parseEvent(sentence, context);
        if (event.confidence > 0.5) {
          events.push(event);
        }
      }
    }

    return events;
  }

  /**
   * Get parsing suggestions for improving input
   */
  getSuggestions(input: string): string[] {
    const suggestions: string[] = [];
    
    if (input.length < 10) {
      suggestions.push('Try providing more details about your event');
    }
    
    if (!/\d+:\d+|\d+\s*(am|pm)|morning|afternoon|evening/i.test(input)) {
      suggestions.push('Include a specific time (e.g., "at 2pm" or "in the morning")');
    }
    
    if (!/today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d+\/\d+/i.test(input)) {
      suggestions.push('Specify a date (e.g., "tomorrow", "next Monday", or "March 15")');
    }
    
    return suggestions;
  }
}

// Export singleton instance
export const eventParser = new EventParser(process.env.OPENAI_API_KEY);
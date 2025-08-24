/**
 * Enhanced Validation Schemas using Zod
 * 
 * This file extends the base schemas with additional validation rules
 * for the enhanced database entities.
 */
import { z } from 'zod';
import { 
  EventSchema, 
  RelationshipSchema, 
  GroupSchema, 
  ContactSchema, 
  ErrorMessages 
} from './schemas';

/**
 * Enhanced User Profile Schema
 */
export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string().max(100, ErrorMessages.MAX_LENGTH('Name', 100)).optional(),
  avatar_url: z.string().url('Please enter a valid URL').optional().nullable(),
  time_zone: z.string().default('UTC'),
  default_calendar_view: z.enum(['month', 'week', 'day', 'agenda']).default('month'),
  email_notifications: z.boolean().default(true),
  push_notifications: z.boolean().default(true),
});

/**
 * Enhanced Event Schema with additional fields
 */
export const EnhancedEventSchema = z.object({
  // Base EventSchema fields
  user_id: z.string().uuid(),
  title: z.string()
    .min(1, ErrorMessages.REQUIRED)
    .max(100, ErrorMessages.MAX_LENGTH('Title', 100))
    .trim(),
  description: z.string()
    .max(1000, ErrorMessages.MAX_LENGTH('Description', 1000))
    .optional(),
  start_time: z.string()
    .refine(dateStr => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    }, "Invalid start date/time format"),
  end_time: z.string()
    .refine(dateStr => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    }, "Invalid end date/time format"),
  location: z.string()
    .max(200, ErrorMessages.MAX_LENGTH('Location', 200))
    .optional(),
  time_zone: z.string()
    .default('UTC')
    .optional(),
  privacy_level: z.enum(['public', 'private', 'custom']),
  relationship_id: z.string().uuid().optional().nullable(),
  visible_to_relationships: z.array(z.string().uuid()).optional(),
  is_all_day: z.boolean().optional().default(false),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, ErrorMessages.VALID_COLOR)
    .optional(),
  // Enhanced fields
  recurrence_rule: z.string().optional(),
  recurrence_exception_dates: z.array(z.string()).optional(),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).default('confirmed'),
  external_calendar_id: z.string().optional(),
  external_calendar_source: z.string().optional(),
  visible_to_contacts: z.array(z.string().uuid()).optional(),
  visible_to_groups: z.array(z.string().uuid()).optional(),
}).refine(data => {
  // Check if end_time is after start_time
  const startDate = new Date(data.start_time);
  const endDate = new Date(data.end_time);
  return endDate > startDate;
}, {
  message: ErrorMessages.END_AFTER_START,
  path: ['end_time'] // Highlights the end_time field for the error
});

/**
 * Event Attachment Schema
 */
export const EventAttachmentSchema = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid(),
  file_name: z.string().min(1, ErrorMessages.REQUIRED).max(255, ErrorMessages.MAX_LENGTH('File name', 255)),
  file_type: z.string().min(1, ErrorMessages.REQUIRED),
  file_url: z.string().min(1, ErrorMessages.REQUIRED),
  file_size: z.number().int().positive().optional(),
  uploaded_by: z.string().uuid(),
});

/**
 * Event Permission Schema
 */
export const EventPermissionSchema = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid(),
  relationship_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  group_id: z.string().uuid().optional(),
  permission_level: z.enum(['full_access', 'limited_access', 'busy_only', 'hidden']),
  custom_title: z.string().max(100, ErrorMessages.MAX_LENGTH('Title', 100)).optional(),
  custom_description: z.string().max(500, ErrorMessages.MAX_LENGTH('Description', 500)).optional(),
}).refine(
  data => {
    // Ensure at least one of relationship_id, contact_id, or group_id is present
    return [data.relationship_id, data.contact_id, data.group_id].filter(Boolean).length === 1;
  },
  {
    message: 'Exactly one of relationship_id, contact_id, or group_id must be provided',
    path: ['relationship_id'],
  }
);



/**
 * Reminder Schema
 */
export const ReminderSchema = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid(),
  user_id: z.string().uuid(),
  reminder_time: z.string().or(z.date()),
  type: z.enum(['notification', 'email', 'sms']).default('notification'),
  sent: z.boolean().default(false),
  sent_at: z.string().datetime().optional().nullable(),
});

/**
 * Custom Holiday Schema
 */
export const CustomHolidaySchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string().uuid(),
  name: z.string()
    .min(1, ErrorMessages.REQUIRED)
    .max(100, ErrorMessages.MAX_LENGTH('Holiday name', 100)),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  recurring: z.boolean().default(true),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, ErrorMessages.VALID_COLOR)
    .optional(),
});

/**
 * Type inference helpers
 */
export type UserProfileFormValues = z.infer<typeof UserProfileSchema>;
export type EnhancedEventFormValues = z.infer<typeof EnhancedEventSchema>;
export type EventAttachmentFormValues = z.infer<typeof EventAttachmentSchema>;
export type EventPermissionFormValues = z.infer<typeof EventPermissionSchema>;

export type ReminderFormValues = z.infer<typeof ReminderSchema>;
export type CustomHolidayFormValues = z.infer<typeof CustomHolidaySchema>;

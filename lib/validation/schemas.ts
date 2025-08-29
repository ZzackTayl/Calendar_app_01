/**
 * Validation Schemas using Zod
 * 
 * This module provides strict validation schemas for all core entities in the application.
 * Each schema implements fail-fast validation with descriptive error messages.
 */
import { z } from 'zod';
import { type Event, type Relationship } from '../supabase/types';

/**
 * Error messages for reuse across schemas
 */
export const ErrorMessages = {
  REQUIRED: 'This field is required',
  FUTURE_DATE: 'Date must be in the future',
  END_AFTER_START: 'End time must be after start time',
  VALID_EMAIL: 'Please enter a valid email address',
  VALID_COLOR: 'Color must be a valid hex code (e.g., #FF5500)',
  VALID_PHONE: 'Please enter a valid phone number',
  MIN_LENGTH: (field: string, min: number) => `${field} must be at least ${min} characters`,
  MAX_LENGTH: (field: string, max: number) => `${field} cannot exceed ${max} characters`,
};

/**
 * Event Schema - Validates event data with strict rules
 */
export const EventSchema = z.object({
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
  privacy_level: z.enum(['private', 'visible', 'semi_private', 'public']),
  relationship_id: z.string().uuid().optional().nullable(),
  visible_to_relationships: z.array(z.string().uuid()).optional(),
  is_all_day: z.boolean().optional().default(false),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, ErrorMessages.VALID_COLOR)
    .optional(),
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
 * Relationship Schema - Validates relationship data
 */
export const RelationshipSchema = z.object({
  user_id: z.string().uuid(),
  partner_name: z.string()
    .min(1, ErrorMessages.REQUIRED)
    .max(50, ErrorMessages.MAX_LENGTH('Name', 50))
    .trim(),
  partner_email: z.string()
    .email(ErrorMessages.VALID_EMAIL)
    .optional()
    .nullable(),
    relationship_type: z.enum(
    ['primary', 'secondary', 'nesting', 'long_distance', 'casual', 'friendship', 'other']
  ),
  start_date: z.string().optional(),
  color: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, ErrorMessages.VALID_COLOR)
    .optional(),
  notes: z.string()
    .max(500, ErrorMessages.MAX_LENGTH('Notes', 500))
    .optional(),
  default_privacy_level: z.enum(
    ['private', 'visible', 'semi_private', 'public']
  ).optional(),
});

/**
 * Group Schema - Validates group data
 */
export const GroupSchema = z.object({
  user_id: z.string().uuid(),
  group_name: z.string()
    .min(1, ErrorMessages.REQUIRED)
    .max(100, ErrorMessages.MAX_LENGTH('Group name', 100))
    .trim(),
  description: z.string()
    .max(500, ErrorMessages.MAX_LENGTH('Description', 500))
    .optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

/**
 * GroupMember Schema - Validates group membership
 */
export const GroupMemberSchema = z.object({
  group_id: z.string().uuid(),
  relationship_id: z.string().uuid(),
  privacy_level: z.enum(
    ['private', 'visible', 'semi_private', 'public']
  ),
});

/**
 * Contact Schema - For external contacts
 */
export const ContactSchema = z.object({
  name: z.string()
    .min(1, ErrorMessages.REQUIRED)
    .max(100, ErrorMessages.MAX_LENGTH('Name', 100))
    .trim(),
  email: z.string()
    .email(ErrorMessages.VALID_EMAIL)
    .optional()
    .nullable(),
  phone: z.string()
    .regex(/^(\+\d{1,3})?\s?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/, ErrorMessages.VALID_PHONE)
    .optional()
    .nullable(),
  notes: z.string()
    .max(500, ErrorMessages.MAX_LENGTH('Notes', 500))
    .optional(),
});

/**
 * User Schema - For user data validation
 */
export const UserSchema = z.object({
  id: z.string().uuid().optional(), // Optional for new user creation
  email: z.string().email(ErrorMessages.VALID_EMAIL),
  phone: z.string()
    .regex(/^(\+\d{1,3})?\s?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/, ErrorMessages.VALID_PHONE)
    .optional(),
  full_name: z.string()
    .min(1, ErrorMessages.REQUIRED)
    .max(100, ErrorMessages.MAX_LENGTH('Name', 100))
    .optional(),
});

/**
 * Auth Schemas - For authentication flows
 */
export const SignInSchema = z.object({
  email: z.string().email(ErrorMessages.VALID_EMAIL),
  password: z.string()
    .min(8, ErrorMessages.MIN_LENGTH('Password', 8)),
});

export const SignUpSchema = z.object({
  email: z.string().email(ErrorMessages.VALID_EMAIL),
  password: z.string()
    .min(8, ErrorMessages.MIN_LENGTH('Password', 8))
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must include uppercase, lowercase and numbers'),
  confirmPassword: z.string(),
  full_name: z.string()
    .min(1, ErrorMessages.REQUIRED)
    .optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'], 
});

export const PasswordResetSchema = z.object({
  password: z.string()
    .min(8, ErrorMessages.MIN_LENGTH('Password', 8))
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must include uppercase, lowercase and numbers'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/**
 * Type inference helpers
 */
export type EventFormValues = z.infer<typeof EventSchema>;
export type RelationshipFormValues = z.infer<typeof RelationshipSchema>;
export type GroupFormValues = z.infer<typeof GroupSchema>;
export type ContactFormValues = z.infer<typeof ContactSchema>;
export type SignInFormValues = z.infer<typeof SignInSchema>;
export type SignUpFormValues = z.infer<typeof SignUpSchema>;

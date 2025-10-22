# MyOrbit Calendar - Features and Components Guide

## Overview

This document provides a comprehensive overview of all features, components, and user flows in the MyOrbit Calendar application. It serves as a reference for understanding the purpose and functionality of each part of the system.

> **Status disclaimer (November 2025):** The sections below describe the intended design. Many flows are implemented in the UI but still rely on mock data or unvalidated Supabase integrations. Refer to [`docs/status/PROJECT_STATUS.md`](../status/PROJECT_STATUS.md) for real-time completion tracking before treating any feature as production-ready.

## Core Features

### 1. Calendar Events Management
- **Purpose**: Allow users to create, edit, delete, and manage their calendar events
- **Components**: 
  - Create Event Screen
  - Calendar Screen
  - Event List Screen
  - Edit Event Screen
- **User Flow**: User navigates to create event → fills in details → saves event → views event on calendar

### 2. Floating vs Fixed Events
- **Purpose**: Distinguish between events that occur at absolute times (fixed) vs local times (floating) to properly handle timezone changes for traveling users
- **Components**: 
  - Create Event Screen (with floating event toggle)
  - Event Display Logic
  - Timezone Conversion Service
- **User Flow**: User creates event → selects "fixed" for absolute time (e.g., webinar) or "floating" for local time (e.g., daily routine) → event adjusts according to user's current timezone when traveling

### 3. Recurring Events
- **Purpose**: Allow users to set up events that repeat on various schedules
- **Components**: 
  - Recurrence Pattern Selection
  - Recurrence Rule Domain Model
  - Instance Generation Logic
- **User Flow**: User creates event → selects recurrence pattern → system generates event instances according to pattern

### 4. Timezone Management
- **Purpose**: Ensure events display correctly regardless of the user's current timezone
- **Components**: 
  - Timezone Service
  - Timezone Detection Service
  - Automatic Timezone Updates
- **User Flow**: User travels to new timezone → system automatically detects and updates their displayed times to match local timezone

### 5. Travel-Aware Time Display
- **Purpose**: Maintain consistent local time for floating events when users travel
- **Components**: 
  - Event Timezone Converter
  - Floating Event Logic
  - Recurrence with Floating Events
- **User Flow**: User creates floating event (e.g., "Daily Routine at 7 AM") → travels to different timezone → event still appears at 7 AM local time in new location

### 6. Contact Management and Invitations
- **Purpose**: Allow users to connect with others and invite them to events
- **Components**: 
  - Contact List Screen
  - Contact Creation
  - Event Invitations
  - Contact Permissions Management
- **User Flow**: User adds contact → assigns permission level → invites to events → can send/receive availability signals

### 7. Availability Signals
- **Purpose**: Allow users to share their availability status with contacts without committing to specific times
- **Components**: 
  - Signal Creation Screen
  - Signal Sharing System
  - Signal Display
- **User Flow**: User creates availability signal → shares with specific contacts → contacts can see availability and suggest meeting times

### 8. Calendar Sharing
- **Purpose**: Enable users to selectively share their calendars with contacts at different permission levels
- **Components**: 
  - Calendar Sharing Screen
  - Permission Management
  - Visibility Controls
- **User Flow**: User selects contacts → sets permission levels → contacts gain appropriate access to calendar data

### 9. Event Reminders and Notifications
- **Purpose**: Alert users about upcoming events and important changes
- **Components**: 
  - Reminder Scheduling Service
  - Notification Center
  - In-App Notification Banner
- **User Flow**: User sets up event → system schedules appropriate reminders → sends notifications at predetermined intervals

### 10. Real-time Sync
- **Purpose**: Keep user data consistent across all their devices in real-time
- **Components**: 
  - Realtime Sync Service
  - Conflict Resolution System
  - Offline Queue Management
- **User Flow**: User makes changes → changes are synced to backend → changes propagate to other devices in real-time

### 11. Supabase Integration
- **Purpose**: Provide robust backend services including authentication, database, and real-time functionality
- **Components**: 
  - Supabase Client
  - Authentication Flow
  - Database API Services
- **User Flow**: User signs in → system connects to Supabase backend → all data operations are handled securely with RLS policies

### 12. Apple and Google Calendar Integration
- **Purpose**: Allow users to import and manage existing calendar events from external providers
- **Components**: 
  - Import Services
  - Calendar Sync Management
  - Provider Authentication
- **User Flow**: User connects calendar provider → system imports events → events are mirrored in MyOrbit with appropriate synchronization

## UI Components

### 1. App Shell
- **Purpose**: Provides consistent navigation and layout across the application
- **Features**: Bottom navigation, app bars, status indicators

### 2. Theme System
- **Purpose**: Provides consistent look and feel across the application with light/dark mode support
- **Features**: Theme constants, color palettes, typography

### 3. Event Display Components
- **Purpose**: Show events in various calendar views (day, week, month)
- **Features**: Table Calendar integration, custom event cards, time slot display

### 4. Contact Components
- **Purpose**: Display and manage contact information consistently
- **Features**: Contact avatars, permission indicators, contact cards

### 5. Form Components
- **Purpose**: Provide consistent user input across the application
- **Features**: Form validation, input fields, selection widgets

## Business Logic Components

### 1. State Management (Riverpod)
- **Purpose**: Manage application state consistently using Riverpod patterns
- **Features**: Providers for events, contacts, settings, user profile

### 2. Service Layer
- **Purpose**: Encapsulate business logic separate from UI concerns
- **Features**: API services, sync services, conversion services

### 3. Domain Models
- **Purpose**: Represent business entities with proper validation and behavior
- **Features**: Event, Contact, AvailabilitySignal, Calendar models

## User Experience Flows

### 1. Onboarding Flow
- **Purpose**: Guide new users through setting up their account and initial preferences
- **Steps**: Account creation → Profile setup → Calendar configuration → Contact invitation

### 2. Daily Use Flow
- **Purpose**: Enable efficient daily calendar management
- **Steps**: View today's events → Add/edit events → Check notifications → Update availability signals

### 3. Travel Flow
- **Purpose**: Ensure calendar continues to work correctly when users change locations
- **Steps**: User travels → Timezone detection → Event times adjust → Floating events maintain local time

### 4. Collaboration Flow
- **Purpose**: Enable effective scheduling with contacts
- **Steps**: Select contact → Check availability → Propose event → Send invitation → Confirm scheduling

## Technical Architecture

### 1. Frontend (Flutter)
- **Framework**: Flutter with Riverpod for state management
- **UI Pattern**: Modern, responsive design with Material Design principles

### 2. Backend (Supabase)
- **Authentication**: Supabase Auth with OAuth providers
- **Database**: Postgres with Row Level Security
- **Real-time**: Supabase Realtime for instant updates

### 3. Data Flow
- **Local**: Shared Preferences for settings, Riverpod for in-memory state
- **Remote**: Supabase Database with conflict resolution
- **Sync**: Queue-based offline-first synchronization

## Privacy and Security Features

### 1. Granular Permissions
- **Purpose**: Allow fine-grained control over what information is shared with different contacts
- **Features**: Permission levels, visibility controls, privacy settings

### 2. Data Encryption
- **Purpose**: Protect sensitive user data both in transit and at rest
- **Features**: Secure data transmission, encrypted local storage

### 3. RLS Implementation
- **Purpose**: Ensure users can only access their own data and shared data appropriately
- **Features**: Database-level security policies, access control

This guide provides an overview of all major features and components in MyOrbit Calendar. For detailed implementation notes, see the inline documentation in the code and the developer guide files.

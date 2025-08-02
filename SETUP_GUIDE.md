# PolyHarmony Development Environment Setup Guide

This guide will help you complete the setup of your comprehensive development environment for the PolyHarmony polyamory calendar app with both Next.js web and React Native mobile platforms.

## ✅ Completed Setup

The following has been configured for you:

### 1. Environment Variables
- **Next.js Web App**: `/Calendar_app_01/.env.local`
- **React Native App**: `/Calendar_app_01/PolyHarmony/.env`

Both configured with your Supabase project credentials:
- URL: `https://mqmtsiqalclkfeursrsa.supabase.co`
- Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 2. Dependencies Installed
- **Next.js**: Supabase client libraries already present
- **React Native**: Added `@supabase/supabase-js` and `expo-secure-store`

### 3. Shared TypeScript Types
- **Web App**: `/Calendar_app_01/lib/supabase/types.ts`
- **Mobile App**: `/Calendar_app_01/PolyHarmony/lib/types.ts`

Both contain identical type definitions matching the MVP schema.

### 4. Supabase Client Configuration
- **Web App**: `/Calendar_app_01/lib/supabase/client.ts`
- **Mobile App**: `/Calendar_app_01/PolyHarmony/lib/supabase.ts`

Configured with proper authentication and secure storage.

### 5. Authentication Setup
- **Web App**: Enhanced existing auth context in `/Calendar_app_01/lib/auth-context.tsx`
- **Mobile App**: New auth context in `/Calendar_app_01/PolyHarmony/lib/AuthContext.tsx`

### 6. Test Components
- **Mobile App**: Updated `/Calendar_app_01/PolyHarmony/App.tsx` with database test functionality

## 🚨 Required Manual Step: Deploy Database Schema

**CRITICAL**: You must deploy the MVP schema to your Supabase database:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open your project: `mqmtsiqalclkfeursrsa`
3. Navigate to **SQL Editor**
4. Copy the contents of `/Calendar_app_01/mvp_schema.sql`
5. Paste and run the SQL script
6. Verify tables are created: `users`, `relationships`, `relationship_groups`, `events`, `event_privacy`

## 🧪 Testing Your Setup

Run the verification script:
```bash
cd /Users/zackstewart/Calendar_app_01
node test-setup.js
```

This will check:
- Environment variables
- Supabase connection
- Database schema deployment
- Dependencies installation

## 🚀 Starting Development

### Next.js Web App
```bash
cd /Users/zackstewart/Calendar_app_01
npm run dev
```
Open http://localhost:3000

### React Native Mobile App
```bash
cd /Users/zackstewart/Calendar_app_01/PolyHarmony
npm start
```
Follow Expo CLI instructions to run on simulator/device.

## 📱 Data Flow Architecture

### Shared Backend (Supabase)
- **Database**: PostgreSQL with UUID primary keys
- **Authentication**: Phone-based auth with session management
- **Storage**: Secure session storage (web: localStorage, mobile: SecureStore)

### API Integration Pattern
Both platforms use the same data flow:
1. **Authentication**: Phone + password → Supabase Auth
2. **User Data**: Auth user ID → Custom users table
3. **Relationships**: User-to-user connections with privacy levels
4. **Events**: Calendar events with granular privacy controls

### Shared Types
Both platforms import identical TypeScript interfaces ensuring data consistency:
- `User`, `Relationship`, `Event`, `EventPrivacy`
- `Database` type for Supabase queries
- Utility types for parsed JSON fields

## 🔧 Development Workflow

### Adding New Features
1. Update schema in `/mvp_schema.sql`
2. Deploy schema changes in Supabase dashboard
3. Update types in both `/lib/supabase/types.ts` and `/PolyHarmony/lib/types.ts`
4. Add database helpers in client files
5. Implement UI in both platforms

### Authentication Flow
1. User enters phone + password
2. Supabase Auth validates credentials
3. Auth success → Query custom users table
4. Store user data in context
5. All subsequent API calls use authenticated client

### Privacy Architecture
Events have granular privacy controls:
- **Owner**: Full control over event
- **Relationship-based**: Privacy per individual relationship
- **Group-based**: Privacy per relationship group
- **Levels**: `full_access`, `limited_access`, `busy_only`, `hidden`

## 📋 Next Development Steps

1. **Deploy Schema**: Complete the manual database setup
2. **Test Authentication**: Verify signup/signin works on both platforms
3. **Implement Core Features**:
   - User profile management
   - Relationship management
   - Calendar event CRUD
   - Privacy settings
4. **Add Real-time Features**: Supabase subscriptions for live updates
5. **Enhanced UI**: Replace test components with full app UI

## 🔍 Troubleshooting

### Environment Issues
- Check `.env.local` and `PolyHarmony/.env` exist and have correct values
- Restart development servers after env changes

### Database Connection
- Verify schema is deployed in Supabase dashboard
- Check Supabase project is active and not paused
- Confirm RLS policies if using Row Level Security

### Authentication Problems
- Ensure phone number format matches Supabase requirements
- Check Supabase Auth settings allow phone authentication
- Verify user creation in custom users table

## 📄 Key Files Reference

### Configuration
- `/Calendar_app_01/.env.local` - Next.js environment
- `/Calendar_app_01/PolyHarmony/.env` - React Native environment
- `/Calendar_app_01/mvp_schema.sql` - Database schema

### Shared Logic
- `/Calendar_app_01/lib/supabase/types.ts` - TypeScript types (web)
- `/Calendar_app_01/PolyHarmony/lib/types.ts` - TypeScript types (mobile)
- `/Calendar_app_01/lib/supabase/client.ts` - Supabase client (web)
- `/Calendar_app_01/PolyHarmony/lib/supabase.ts` - Supabase client (mobile)

### Authentication
- `/Calendar_app_01/lib/auth-context.tsx` - Web auth context
- `/Calendar_app_01/PolyHarmony/lib/AuthContext.tsx` - Mobile auth context

### Testing
- `/Calendar_app_01/test-setup.js` - Environment verification
- `/Calendar_app_01/PolyHarmony/App.tsx` - Mobile test interface

Your comprehensive development environment is now ready! Deploy the schema and start building your polyamory calendar app. 🎉
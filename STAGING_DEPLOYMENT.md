# Staging Environment Setup for Remote Developers

## Quick Start for Remote Developers

### 1. Staging Environment Access
Your staging environment is already configured and deployed at:
**URL**: https://calendar-app-01-zacks-projects-49e2c5.vercel.app

### 2. Database Access
All developers will use the **shared Supabase database**:
- **Project**: `mqmtsiqalclkfeursrsa`
- **Region**: US East (N. Virginia)
- **URL**: https://mqmtsiqalclkfeursrsa.supabase.co

### 3. Environment Variables for Local Development
Create `.env.local` in your project root with these values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://mqmtsiqalclkfeursrsa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xbXRzaXFhbGNsa2ZldXJzcnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMDczMDYsImV4cCI6MjA2OTY4MzMwNn0.x4dDfut5BGlMXlhwtJM0-T_zDftHYK80mcEnG62TFfA
```

### 4. Development Workflow

#### Option A: Local Development (Recommended)
```bash
# Clone the repository
git clone [your-repo-url]
cd calendar-app-01

# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Edit .env.local with the staging values above

# Start development server
npm run dev
```

#### Option B: Docker Development
```bash
# Using Docker Compose for development
docker-compose -f docker-compose.dev.yml up

# Or build and run production container locally
docker-compose up
```

### 5. Database Schema Verification
All developers can verify the database is working by:
1. Creating a test account at the staging URL
2. Adding a test event/contact
3. Checking that data persists across sessions

### 6. Team Collaboration Features
- **Shared Database**: All changes are immediately visible to all developers
- **Real-time Sync**: Supabase realtime subscriptions work across all instances
- **Conflict Resolution**: Built-in conflict handling in the app

## Security Notes
- The staging environment uses the same database as production
- All developers have read/write access to the shared database
- Consider creating separate Supabase projects per developer for isolation if needed

## Troubleshooting

### Database Connection Issues
1. Check `.env.local` values match exactly
2. Verify network connectivity to Supabase
3. Check Supabase project status at: https://app.supabase.com

### Local Development Issues
1. Clear browser cache and localStorage
2. Restart the development server
3. Check for port conflicts (default: 3000)

## Next Steps
1. Share this document with your remote developers
2. Have them test the staging URL first
3. Then have them set up local development
4. Verify they can see each other's data changes
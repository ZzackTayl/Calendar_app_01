# Developer Onboarding Guide - Calendar App

## 🚀 Quick Start (5 minutes)

### Step 1: Access the Staging Environment
1. **Live Demo**: Run `./deploy-staging.sh` to deploy the latest version
2. **Test URL**: The script will output your staging URL (e.g., `https://your-app.vercel.app`)
3. **Verify**: Open the URL and create a test account to confirm everything works

### Step 2: Local Development Setup

#### Prerequisites
- Node.js 18+ installed
- Git configured
- Code editor (VS Code recommended)

#### Option A: Standard Setup (Recommended)
```bash
# 1. Clone the repository
git clone [your-repo-url]
cd calendar-app-01

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.local.example .env.local

# 4. Start development
npm run dev
```

#### Option B: Docker Setup
```bash
# Using Docker for development
docker-compose -f docker-compose.dev.yml up
```

### Step 3: Verify Database Connection
1. Open `http://localhost:3000`
2. Create a test account
3. Add a test event or contact
4. **Important**: Check that data persists after page refresh

## 🔧 Development Workflow

### Daily Workflow
1. **Pull latest changes**: `git pull origin main`
2. **Start development**: `npm run dev`
3. **Test with real data**: All changes sync to shared database
4. **See others' work**: Refresh to see teammates' changes

### Database Access
- **Shared Database**: All developers use the same Supabase instance
- **Real-time Updates**: Changes appear instantly across all sessions
- **Test Data**: Feel free to create test data - it's shared across the team

### Environment Variables
Your `.env.local` should contain:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://mqmtsiqalclkfeursrsa.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 🧪 Testing Checklist

Before sharing with your team, verify:

- [ ] Staging URL is accessible
- [ ] Can create account
- [ ] Can add events/contacts
- [ ] Data persists after refresh
- [ ] Multiple developers can see each other's changes

## 📋 Team Setup Instructions

### For Team Lead (You)
1. Run `./deploy-staging.sh` to deploy staging
2. Share the staging URL with team
3. Share this onboarding guide
4. Add team members to GitHub repository

### For Each Developer
1. Clone repository
2. Follow "Quick Start" steps above
3. Create test account and verify data persistence
4. Start developing!

## 🔍 Troubleshooting

### Common Issues

**"Database connection failed"**
- Check `.env.local` values match exactly
- Verify internet connection
- Check if Supabase project is active

**"Port 3000 already in use"**
- Kill existing process: `lsof -ti:3000 | xargs kill -9`
- Or use different port: `npm run dev -- -p 3001`

**"Can't see other developers' changes"**
- Ensure everyone uses the same Supabase credentials
- Check browser console for errors
- Verify network connectivity

### Getting Help
- Check browser console for errors
- Review `STAGING_DEPLOYMENT.md` for detailed setup
- Test database connection with staging URL first

## 🎯 Next Steps After Setup

1. **Create your first event** to test functionality
2. **Add a contact** to verify relationships work
3. **Check real-time updates** by having another developer make changes
4. **Review the codebase** structure in `/app` and `/components`
5. **Read the docs** in `/docs` for deeper understanding

## 📞 Support

If issues persist:
1. Check browser console for specific error messages
2. Verify all environment variables are set correctly
3. Test the staging URL works in browser
4. Ensure Supabase project is active and accessible
# 🐳 Docker Getting Started Guide - PolyHarmony Calendar

## For Complete Beginners (3-Minute Setup)

This guide will get your PolyHarmony Calendar running in Docker with **complete testing capabilities** - no Docker expertise required!

## Step 1: Install Docker (2 minutes)

### Windows/Mac:
1. Go to [docker.com](https://docker.com) and download Docker Desktop
2. Install it (just click through the installer)
3. Start Docker Desktop (it should open automatically)

### Linux:
```bash
sudo apt update && sudo apt install docker.io docker-compose
```

## Step 2: One-Command Setup (1 minute)

```bash
# Clone your repository (if not already done)
git clone [your-repo-url]
cd Calendar_app_01

# Copy environment template
cp env.docker.example .env.local

# Start everything with one command
docker-compose -f docker-compose.simple.yml up
```

## Step 3: Verify It's Working (30 seconds)

1. **Check the terminal** - You should see logs showing all services starting
2. **Open your browser** - Go to http://localhost:3000
3. **See your app** - The PolyHarmony Calendar should load!

## What You Get - Complete Testing Environment

### 🌐 **Main Application**
- **URL**: http://localhost:3000
- **Features**: Full calendar functionality with local database

### 🗄️ **PostgreSQL Database**
- **Port**: 5432
- **Database**: polyharmony_dev
- **User**: postgres / password: password
- **Features**: Complete schema with sample data

### 📧 **Email Testing (MailHog)**
- **Web UI**: http://localhost:8025
- **SMTP**: localhost:1025
- **Features**: See all emails sent by your app

### 🚀 **Redis Cache**
- **Port**: 6379
- **Features**: Session storage and caching

## Useful Commands

### Start Development
```bash
docker-compose -f docker-compose.simple.yml up
```

### Stop Development
```bash
docker-compose -f docker-compose.simple.yml down
```

### Rebuild After Changes
```bash
docker-compose -f docker-compose.simple.yml up --build
```

### View Logs
```bash
docker-compose -f docker-compose.simple.yml logs -f
```

### Clean Everything
```bash
docker-compose -f docker-compose.simple.yml down -v
docker system prune -f
```

## Common Issues & Quick Fixes

### Port 3000 is already in use
```bash
docker-compose -f docker-compose.simple.yml down
# Then try again
```

### Docker daemon not running
- **Windows/Mac**: Open Docker Desktop and wait for it to fully start
- **Linux**: Run `sudo systemctl start docker`

### Database connection issues
```bash
# Check if database is healthy
docker-compose -f docker-compose.simple.yml ps
# Should show "healthy" for db service
```

### Permission issues (Linux)
```bash
sudo chown -R $USER:$USER .
```

## What's Different from Production?

This simple setup gives you:
- ✅ **Local PostgreSQL** instead of Supabase
- ✅ **MailHog** for email testing
- ✅ **Redis** for caching
- ✅ **Hot reload** for development
- ✅ **Sample data** for testing

But keeps all the **security features** and **app functionality** intact!

## Next Steps

Once you're comfortable with this setup:
1. **Explore the staging environment**: `docker-compose -f docker-compose.staging.yml up`
2. **Run tests**: `docker-compose -f docker-compose.test.yml up`
3. **Deploy to production**: Use the production Dockerfiles

## Need Help?

- **Check logs**: `docker-compose -f docker-compose.simple.yml logs -f`
- **Restart services**: `docker-compose -f docker-compose.simple.yml restart`
- **Clean start**: `docker-compose -f docker-compose.simple.yml down -v && docker-compose -f docker-compose.simple.yml up`
# PolyHarmony Calendar 📅✨

A **neurodiversity-affirming**, **privacy-first** calendar application designed specifically for polyamorous relationships. Coordinate schedules with multiple partners while maintaining complete control over privacy settings and conflict detection.

> **🎯 Alpha Status**: Feature-complete and production-ready with comprehensive testing suite and enhanced conflict detection.

## CI Status

[![CI](https://github.com/ZzackTayl/Calendar_app_01/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/ZzackTayl/Calendar_app_01/actions/workflows/ci.yml)

- Lint + Type Check (required)
- Unit Tests (required)
- Integration Tests (non-blocking while we stabilize)
- Production Readiness Suites (non-blocking while we stabilize)
- E2E User Journey (non-blocking while we stabilize)

Quick Links:
- Production (Vercel): https://calendar-app-01-anthropologica.vercel.app
- CI Dashboard: https://github.com/ZzackTayl/Calendar_app_01/actions/workflows/ci.yml

## 🚀 Quick Start

### 🎮 Demo Mode (Recommended)
Experience PolyHarmony without creating an account:
1. Visit the app
2. Click **"Try Demo (No Account Required)"**
3. Explore all features with realistic sample data
4. Test multi-partner scheduling and privacy controls

### 🛠️ Local Development

#### Option 1: Docker (Recommended for Beginners)
```bash
# Clone and setup
git clone <your-repo>
cd Calendar_app_01

# Copy environment template
cp env.docker.example .env.local

# Start complete development environment
make dev
# → App: http://localhost:3000
# → Email testing: http://localhost:8025
# → Database: localhost:5432
```

#### Option 2: Traditional Setup
```bash
# Clone and setup
git clone <your-repo>
cd Calendar_app_01
npm install

# Start development server
npm run dev
# → Opens at http://localhost:3000
```

> **🐳 Docker Benefits**: Complete testing environment with PostgreSQL, Redis, and email testing. No external dependencies required!

## ✨ Key Features

### 🔐 **Privacy-First Design**
- **4-Level Privacy System**: Private → Semi-Private → Visible → Public
- **Relationship-Aware Permissions**: Share events selectively with specific partners
- **Smart Privacy Inheritance**: Group and relationship-based privacy defaults

### ⚡ **Enhanced Conflict Detection** 
- **Sub-2 Second Response Times**: Enterprise-grade performance optimization
- **Multi-Partner Batch Processing**: Check availability across all relationships simultaneously
- **Smart Scheduling Suggestions**: AI-powered alternative time slot recommendations
- **Privacy-Aware Conflicts**: Respects privacy levels while detecting scheduling conflicts

### 🎨 **Neurodiversity-Affirming UX**
- **Complete Dark/Light Mode**: System preference detection with manual override
- **Mobile-Optimized Interface**: Touch-friendly with 44px minimum targets
- **Accessible Components**: WCAG 2.1 compliant with comprehensive ARIA support
- **Predictable Navigation**: Clear visual hierarchies and consistent interaction patterns

### 🔗 **Calendar Integrations**
- **Google Calendar Sync**: Bidirectional sync with privacy controls
- **Apple Calendar Support**: iCal import/export functionality
- **Multi-Calendar Management**: Separate calendars per relationship/privacy level

### 👥 **Relationship Management**
- **7 Relationship Types**: Primary, Secondary, Nesting, Long-Distance, Casual, Friendship, Other
- **Color-Coded Organization**: Visual distinction across calendar views
- **Group Functionality**: Create and manage polyamorous family units
- **Invitation System**: Secure partner onboarding with email verification

## 🏗️ Technical Architecture

### **Core Stack**
- **Frontend**: Next.js 14 (App Router) + TypeScript 5.9
- **UI Framework**: shadcn/ui + Tailwind CSS + Radix UI primitives
- **Database**: PostgreSQL via Supabase with Row Level Security (RLS)
- **Authentication**: Supabase Auth with enhanced password security
- **State Management**: React Context + Demo Store (localStorage fallback)

### **Advanced Features**
- **Rate Limiting**: Multi-tier protection (Auth: 5/15min, API: 100/min, Events: 30/min)
- **Enhanced Validation**: Zod schemas with fail-fast validation and descriptive errors
- **Performance Monitoring**: Built-in health checks and response time tracking
- **Mobile Optimization**: PWA-ready with service worker and offline capabilities

### **Security & Privacy**
- **End-to-End Encryption**: AES-256 encryption for sensitive data
- **CSRF Protection**: Token-based request validation
- **OAuth Security**: State validation for Google Calendar integration
- **Audit Logging**: Comprehensive conflict detection and permission change tracking

## 📱 Mobile & Deployment

### **Mobile Support**
- **React Native/Expo App**: Available in `mobile/PolyHarmony/`
- **PWA Capabilities**: Installable web app with offline functionality
- **Touch Optimizations**: Gesture support and mobile-specific UI components

### **Production Deployment**
- **Vercel Integration**: Optimized for serverless deployment
- **Docker Support**: Multi-stage builds with dev/test/prod configurations
- **Database Migrations**: Automated schema updates via Supabase
- **Performance Optimization**: Bundle analysis and code splitting

## 🔧 Environment Setup

### **Required Configuration**
Copy `.env.local.example` to `.env.local` and configure:

```bash
# Supabase (Required for production)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Security (Critical for production)
ENCRYPTION_KEY=your-32-character-key
NEXTAUTH_SECRET=your-nextauth-secret-minimum-32-chars
NEXTAUTH_URL=http://localhost:3000

# Optional: Google Calendar Integration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### **Database Schema**
Use the unified schema for production deployment:
```bash
# Apply schema to Supabase
npm run db:push

# Or manually apply PHASE1A_REQUIRED_SCHEMA.sql
```

## 🧪 Development & Testing

### **Core Scripts**
```bash
npm run dev          # Development server
npm run build        # Production build  
npm run start        # Production server
npm run lint         # ESLint validation
npm run type-check   # TypeScript checking
npm run test         # Run test suite
npm run validate     # Full validation pipeline
```

### **Alpha Testing Scripts**
```bash
npm run alpha:test:prepare     # Prepare alpha testing environment
npm run alpha:test:verify      # Verify alpha setup
npm run alpha:test:invitation  # Test invitation system
npm run alpha:test:email       # Test email notifications
```

### **Database Management**
```bash
npm run db:push            # Deploy schema changes
npm run db:reset           # Reset database
npm run db:verify-schema   # Validate schema integrity
npm run test:db:setup      # Start test database (Docker)
npm run test:integration   # Run integration tests
```

### **Performance & Monitoring**
```bash
npm run analyze            # Bundle size analysis
npm run performance       # Performance testing
npm run monitoring:check   # Health monitoring
npm run backup:create      # Create application backup
```

## 📚 Documentation

### **Essential Documentation**
- **[Setup Guide](./docs/SETUP_GUIDE.md)** - Complete setup instructions
- **[Database Schema Reference](./docs/DATABASE_SCHEMA_REFERENCE.md)** - **CRITICAL**: Complete schema documentation
- **[Security Consolidated](./docs/SECURITY_CONSOLIDATED.md)** - **CRITICAL**: Unified security reference (auth, CSRF, RLS, encryption, monitoring)
- **[Storage Setup & Attachments](./docs/STORAGE.md)** - Supabase Storage bucket setup and attachment testing
- **[Enhanced Conflict Detection](./ENHANCED_MULTI_PARTNER_AVAILABILITY_ALGORITHM.md)** - Advanced scheduling algorithm
- **[Production Standards](./docs/PRODUCTION_STANDARDS.md)** - Production deployment guidelines

### **Development & Integration**
- **[Architecture Snapshot (2025-09-17)](./PROJECT_ARCHITECTURE_2025-09-17.md)** - System architecture as of Sep 17, 2025.
- **[Implementation Guide](./docs/POLYHARMONY_IMPLEMENTATION_GUIDE.md)** - Core implementation details
- **[Realtime Implementation](./docs/REALTIME_IMPLEMENTATION.md)** - Real-time features guide
- **[Security Implementation](./docs/SECURITY_IMPLEMENTATION_CHECKLIST.md)** - Security best practices
- **[Mobile Guide](./mobile/README.md)** - React Native/Expo app setup
- **[API Reference](./References/api-endpoints.md)** - Complete API documentation

### **Setup & Configuration**
- **[Google Calendar Setup](./docs/GOOGLE_CALENDAR_SETUP.md)** - OAuth integration
- **[Supabase Dashboard Setup](./docs/SUPABASE_DASHBOARD_SETUP_GUIDE.md)** - Database configuration
- **[Developer Account Setup](./docs/DEVELOPER_ACCOUNT_SETUP.md)** - Account configuration
- **[Deployment Checklist](./docs/DEPLOYMENT_CHECKLIST.md)** - Production deployment steps

### **Additional Documentation**
- **[SMS Implementation](./docs/SMS_QUICK_START_GUIDE.md)** - SMS integration guide
- **[UX Design](./docs/ONBOARDING_UX_DESIGN.md)** - User experience guidelines
- **[All Documentation](./docs/)** - Complete documentation directory

## 🎯 Project Status

### **✅ Completed Features**
- ✅ **Core Calendar Functionality**: Events, relationships, groups
- ✅ **Enhanced Conflict Detection**: Sub-2 second multi-partner checking
- ✅ **Complete Privacy System**: 4-level privacy with relationship awareness
- ✅ **Dark/Light Theme Support**: Full theming with system detection
- ✅ **Mobile Optimization**: PWA-ready with touch interfaces
- ✅ **Security Implementation**: Rate limiting, CSRF protection, encryption
- ✅ **Testing Infrastructure**: Unit, integration, and alpha testing suites
- ✅ **Production Deployment**: Vercel-ready with Docker support

### **🔄 Current Phase: Alpha Testing**
Ready for real-world testing with comprehensive monitoring and feedback systems.

### **🚀 Roadmap** 
- **Phase 2**: Advanced calendar integrations (Outlook, iCloud)
- **Phase 3**: Mobile app store deployment
- **Phase 4**: AI-powered scheduling optimization

## 📄 Recent Updates
- **Enhanced Multi-Partner Availability**: Sub-2 second conflict detection with batch processing
- **Complete Theme System**: Dark/light mode with neurodiversity-affirming design
- **Security Hardening**: Comprehensive rate limiting and CSRF protection
- **Production Readiness**: Full testing suite with Docker integration
- **Mobile Enhancements**: PWA capabilities and touch optimizations

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.

## 🆘 Support & Contributing

### **Getting Help**
1. Check the [documentation](./docs/) first
2. Review [Alpha Testing Guide](./ALPHA_TESTING_GUIDE.md) for common issues
3. Open an issue for bugs or feature requests

### **Contributing**
1. Read [Developer Onboarding](./DEVELOPER_ONBOARDING.md)
2. Follow the setup instructions in [SETUP_GUIDE.md](./SETUP_GUIDE.md)
3. Use the provided testing scripts to validate changes

---

**Built with ❤️ for the polyamorous community** • **Privacy-First** • **Neurodiversity-Affirming** • **Open Source**
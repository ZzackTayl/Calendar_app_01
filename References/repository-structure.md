# PolyHarmony Calendar App - Repository Structure Reference

## Overview
This document serves as a reference for the PolyHarmony Calendar App repository structure, documenting the organization of files and directories to facilitate easy navigation and understanding of the codebase.

## Repository Structure

### Root Directory Files
- `README.md` - Main project overview and quick start guide
- `AI_README.md` - AI guidance for repository navigation
- `package.json` - Project dependencies and scripts
- `CHANGELOG.md` - Project version history
- `.gitignore` - Git ignore patterns
- `.env.example` - Environment variable examples
- `.eslintrc.json` - ESLint configuration
- `.eslintignore` - ESLint ignore patterns
- `.vercelignore` - Vercel ignore patterns
- `.sqlfluff` - SQL formatting configuration
- `components.json` - Component library configuration
- `Dockerfile` - Production Docker configuration
- `Dockerfile.dev` - Development Docker configuration
- `docker-compose.yml` - Production Docker Compose configuration
- `docker-compose.dev.yml` - Development Docker Compose configuration
- `.dockerignore` - Docker ignore patterns

### Documentation Directory (`docs/`)
Contains comprehensive documentation for developers, contributors, and users.

Key documentation files:
- `README.md` - Documentation hub index
- `PRD.md` - Product Requirements Document
- `SETUP_GUIDE.md` - Complete setup instructions
- `TECH_STACK.md` - Technology decisions and architecture overview
- `PERFORMANCE_OPTIMIZATIONS.md` - Performance tuning strategies
- `MOBILE_MIGRATION_GUIDE.md` - Mobile app development guide
- `Handover.md` - Project handover information
- `Larger_vision.md` - Long-term project goals
- `Prioritized_features.md` - Feature prioritization
- `Proposed_Stack.md` - Technology stack recommendations

### Application Source Code (`app/`)
Next.js application structure with pages and API routes.

#### Pages Structure
- `app/page.tsx` - Main landing page
- `app/calendar/page.tsx` - Calendar view
- `app/dashboard/page.tsx` - User dashboard
- `app/relationships/` - Relationship management pages
- `app/events/` - Event management pages
- `app/groups/` - Group management pages
- `app/invitations/` - Invitation system pages
- `app/contacts/` - Contact management pages
- `app/auth/` - Authentication pages
- `app/settings/` - User settings pages
- `app/onboarding/` - User onboarding pages

#### API Routes (`app/api/`)
RESTful API endpoints organized by feature:

- `app/api/account/` - Account management endpoints
- `app/api/auth/` - Authentication endpoints
- `app/api/calendar/` - Calendar integration endpoints
- `app/api/contacts/` - Contact management endpoints
- `app/api/events/` - Event management endpoints
- `app/api/groups/` - Group management endpoints
- `app/api/invitations/` - Invitation system endpoints
- `app/api/health/` - Health check endpoints
- `app/api/monitoring/` - Monitoring endpoints
- `app/api/onboarding/` - Onboarding endpoints
- `app/api/sharing/` - Calendar sharing endpoints
- `app/api/templates/` - Event template endpoints

### Components Library (`components/`)
Reusable UI components organized by category.

#### UI Components (`components/ui/`)
- Form components (`components/ui/form/`)
- Calendar components (`components/ui/calendar.tsx`)
- Privacy components (`components/ui/privacy-level-selector.tsx`, etc.)
- Conflict detection (`components/ui/conflict-detector.tsx`)
- Invitation system components
- Group management components
- Relationship management components

#### Development Components (`components/dev/`)
- `account-switcher.tsx` - Account switching component
- `persistence-dashboard.tsx` - Data persistence dashboard

#### Notifications (`components/notifications/`)
- `NotificationDropdown.tsx` - Notification dropdown component

### Configuration (`config/`)
Neural model configuration system with specialized agent archetypes.

- `neural-models.js` - 27+ neural models for different tasks
- `agent-archetypes.js` - 6 specialized agent archetypes
- `neural-initialization.js` - System bootstrap and performance monitoring
- `index.js` - Main API for neural system functionality

### Library (`lib/`)
Core business logic and utility functions.

#### Core Libraries
- `auth/` - Authentication utilities
- `conflicts/` - Conflict detection and resolution
- `contacts/` - Contact management
- `email/` - Email services and providers
- `invitations/` - Invitation system utilities
- `nlp/` - Natural language processing for event parsing
- `notifications/` - Notification system
- `permissions/` - Permission management
- `recurrence/` - Recurrence pattern handling
- `supabase/` - Supabase integration
- `test-accounts/` - Test account utilities
- `time-zones/` - Time zone utilities
- `validation/` - Data validation schemas and utilities

### Database Schema (`schemas/`)
Database schema definitions.

- `mvp_schema.sql` - Canonical schema file matching current web app code

### Supabase Integration (`supabase/`)
Supabase project configuration and migrations.

#### Migrations (`supabase/migrations/`)
Database schema migrations organized by date and feature:

- `20250828130000_fix_schema_inconsistencies.sql` - Latest schema fixes
- `30000000000000_phase3_enhancements/` - Phase 3 feature enhancements

### Testing (`__tests__/`, `tests/`)
Test suites for different aspects of the application.

- `__tests__/` - Unit tests
- `tests/integration/` - Integration tests
- `tests/performance/` - Performance tests
- `tests/permissions/` - Permission system tests
- `tests/security/` - Security tests

### Scripts (`scripts/`)
Utility scripts for various operations.

### Contracts (`contracts/`)
API contracts and specifications.

### Backups (`backups/`)
Backup files and procedures.

### Alpha Testing (`ALPHA_*`)
Alpha testing documentation and templates.

## Key Technologies

### Frontend
- Next.js 14 with TypeScript
- React for UI components
- shadcn/ui component library
- Tailwind CSS for styling

### Backend
- Supabase (PostgreSQL database)
- Supabase Auth for authentication
- Node.js for server-side functions

### Database
- PostgreSQL with custom schema
- Row Level Security (RLS) for data protection
- Custom enum types for privacy levels and relationship types

### AI/ML
- 27+ neural models for different tasks
- 6 specialized agent archetypes
- Natural language processing for event creation

### Mobile
- React Native for mobile applications
- Progressive Web App (PWA) support

## Development Workflow

### Environment Setup
1. Clone repository
2. Install dependencies with `npm install`
3. Configure environment variables
4. Start development server with `npm run dev`

### Database Management
1. Use Supabase CLI for local development
2. Apply migrations with `supabase db push`
3. Reset database with `supabase db reset`

### Testing
1. Run unit tests with `npm test`
2. Run integration tests with `npm run test:integration`
3. Run performance tests with `npm run test:performance`

### Deployment
1. Build with `npm run build`
2. Deploy to Vercel or similar platform
3. Apply database migrations to production

## Security Considerations

### Data Privacy
- Zero-knowledge architecture
- End-to-end encryption
- User-controlled encryption keys
- GDPR and CCPA compliance

### Authentication
- Supabase Auth with multiple providers
- Phone number verification
- Secure password handling

### Authorization
- Row Level Security (RLS) policies
- Granular permission controls
- Audit logging for permission changes

## Performance Optimization

### Frontend
- Code splitting and lazy loading
- Bundle analysis with `npm run analyze`
- Caching strategies
- Progressive loading

### Backend
- Database indexing
- Query optimization
- Connection pooling
- Caching layers

### Database
- Proper indexing strategies
- Query performance monitoring
- Connection optimization
- Storage optimization

## Monitoring and Maintenance

### Health Checks
- API health endpoints
- Database connectivity checks
- Service availability monitoring

### Performance Monitoring
- Response time tracking
- Error rate monitoring
- Resource utilization tracking
- User experience metrics

### Security Monitoring
- Authentication attempts
- Authorization violations
- Data access patterns
- Security incident tracking

## Future Roadmap

### Near-term (3-6 months)
- Advanced AI features
- Desktop applications
- Calendar templates
- Integration with relationship counseling apps

### Medium-term (6-12 months)
- Advanced analytics dashboard
- Voice assistant integration
- Wearable app support
- International expansion

### Long-term (12+ months)
- Decentralized architecture option
- AI relationship coaching
- Professional version for therapists
- API for third-party integrations

---

*Last Updated: August 29, 2025*
*Repository Inspector: Repository Structure Reference v1.0*
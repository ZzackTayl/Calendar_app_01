# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## USER PROFILE & REQUIREMENTS (CRITICAL)

### Non-Developer User Profile
The user is NOT a developer and requires comprehensive guidance and validation:

#### Extra Guidance Requirements
- **Assume incomplete setup**: Always verify that prerequisites and dependencies are properly installed and configured
- **Check completion status**: Explicitly verify that each step was completed successfully before proceeding to the next
- **Provide detailed explanations**: Explain what each command does and why it's necessary
- **Validate environment**: Check that the development environment is properly configured (Node.js, Docker, CLIs, etc.)
- **Confirm understanding**: Ask for confirmation when complex concepts or multi-step processes are involved

#### Code Implementation Standards
- **NO MOCKS OR PLACEHOLDERS**: Always provide fully implemented, production-ready code
- **Complete implementations**: Never use comments like "// TODO:" or "// Implementation goes here"
- **Real functionality**: All code must be functional and ready for rigorous testing
- **Security-first**: Implement proper input validation, error handling, and security measures from the start
- **Test-ready**: All code must be accompanied by comprehensive tests and validation
- **Production standards**: Code must meet the same quality standards as production systems

#### Validation & Testing Requirements
- **Rigorous testing**: Always run the complete test suite after implementations
- **Security validation**: Run security tests and validate all input handling
- **Performance verification**: Ensure all implementations meet performance requirements (sub-2 second responses)
- **Cross-platform compatibility**: Verify functionality across different environments
- **Error scenario testing**: Test failure modes and edge cases thoroughly

#### Communication Style
- **Step-by-step guidance**: Break down complex tasks into clear, sequential steps
- **Verification checkpoints**: Include validation steps between major operations
- **Clear success criteria**: Define what "successful completion" looks like for each task
- **Troubleshooting preparation**: Anticipate common issues and provide solutions proactively

## Common Development Commands

### Core Development
```bash
# Start development server
npm run dev

# Production build and analysis
npm run build
npm run analyze          # Bundle size analysis
npm run start           # Start production server

# Code quality and validation
npm run lint            # ESLint validation
npm run type-check      # TypeScript checking
npm run validate        # Complete validation pipeline (lint + type-check + test)
npm test               # Run test suite
npm run test:watch      # Watch mode testing
npm run test:coverage   # Test coverage analysis
```

### Testing Infrastructure
```bash
# Alpha testing workflows
npm run alpha:test:prepare     # Prepare alpha testing environment
npm run alpha:test:verify      # Verify alpha setup
npm run alpha:test:invitation  # Test invitation system
npm run alpha:test:email       # Test email notifications

# Database testing
npm run test:db:setup          # Start test database (Docker)
npm run test:db:teardown       # Stop test database
npm run test:db:reset          # Reset test database
npm run test:integration       # Run integration tests
npm run test:supabase          # Run Supabase-specific tests

# Email system testing
npm run test:email:all         # Complete email test suite
npm run test:email:e2e         # End-to-end email tests
npm run test:email:security    # Email security tests

# Production readiness testing (CRITICAL for alpha/beta)
npm run test:privacy:all       # Complete privacy boundary tests
npm run test:relationships     # Multi-relationship scenario tests
npm run test:performance       # Performance & reliability tests
npm run test:scale:email       # Email/invitation system load tests
npm run test:integrity         # Data consistency & recovery tests
npm run test:monitoring        # Production monitoring tests
npm run test:user-journey      # End-to-end user journey tests
```

### Database Management
```bash
# Schema and migrations
npm run db:push               # Deploy schema changes to Supabase
npm run db:reset              # Reset database completely
npm run db:verify-schema      # Validate schema integrity

# Database validation scripts
npm run test:db:schema        # Schema validation
npm run test:db:types         # Type checking
npm run test:db:health        # Health checks
```

### Security and Monitoring
```bash
# Security validation
npm run security:init          # Initialize production security
npm run security:validate      # Validate security configuration
npm run security:test          # Run security test suite
npm run security:monitor       # Start security monitoring

# Application monitoring
npm run monitoring:check       # One-time health check
npm run monitoring:start       # Continuous monitoring
npm run backup:create          # Create application backup
```

### Deployment and Infrastructure
```bash
# Docker-based testing (REQUIRED for testing workflow)
docker --version              # Verify Docker installation
docker compose up -d          # Start test environment services
docker compose down           # Stop test environment services
npm run test:db:setup         # Start test database via Docker

# Vercel deployment (PREFERRED deployment target)
vercel --version              # Verify Vercel CLI
vercel build                  # Build for Vercel deployment
vercel deploy                 # Deploy to Vercel preview
vercel deploy --prod          # Deploy to production
vercel logs                   # View deployment logs

# Supabase database management (REQUIRED for database operations)
supabase --version            # Verify Supabase CLI
supabase status               # Check local Supabase status
supabase start                # Start local Supabase instance
supabase stop                 # Stop local Supabase instance
supabase db push              # Push schema changes to remote
supabase db pull              # Pull schema changes from remote
supabase db reset             # Reset local database
```

## Architecture Overview

### Project Structure
- **`app/`** - Next.js 14 App Router pages and layouts
- **`lib/`** - Core utilities and business logic
- **`components/`** - Reusable UI components using shadcn/ui
- **`hooks/`** - Custom React hooks
- **`middleware.ts`** - Request/response middleware with authentication and security
- **`mobile/PolyHarmony/`** - React Native/Expo mobile application

### Core Technical Stack
- **Framework**: Next.js 14 with App Router, TypeScript 5.9
- **UI**: shadcn/ui + Tailwind CSS + Radix UI primitives
- **Database**: PostgreSQL via Supabase with Row Level Security (RLS)
- **Authentication**: Supabase Auth with enhanced password security
- **State**: React Context + Demo Store (localStorage fallback for offline mode)

### Key Architecture Patterns

#### Dual-Mode Architecture
The application supports both authenticated (Supabase) and demo modes:
- **Demo Store** (`lib/demo-store.ts`): Complete localStorage-based implementation for offline/demo usage
- **Supabase Integration**: Full production implementation with real-time features
- **Unified API Layer**: Components work seamlessly with either mode

#### Privacy-First Design
4-level privacy system implemented throughout:
- **Private**: Only visible to event creator
- **Semi-Private**: Limited visibility based on relationship settings
- **Visible**: Visible to specific relationships
- **Public**: Visible to all connected relationships

#### Security Architecture
Multi-layered security implementation:
- **Middleware Security** (`middleware.ts`): Route protection, session validation, CSRF protection
- **Rate Limiting** (`lib/rate-limiting.ts`): Multi-tier protection (Auth: 5/15min, API: 100/min, Events: 30/min)
- **Input Validation**: Zod schemas with comprehensive validation
- **Encryption**: AES-256 encryption for sensitive data

#### Conflict Detection System
Enhanced multi-partner availability checking:
- **Sub-2 Second Response**: Enterprise-grade performance optimization
- **Batch Processing**: Check availability across all relationships simultaneously
- **Privacy-Aware**: Respects privacy levels while detecting conflicts
- **Smart Suggestions**: AI-powered alternative time slot recommendations

### Important Implementation Details

#### Authentication Flow
- **Session Management**: Comprehensive session validation with security alerts
- **Email Verification**: Required for production, bypassed in demo mode
- **Route Protection**: Middleware-based protection with detailed logging

#### Database Schema
- **Row Level Security**: All tables protected with RLS policies
- **Relationship-Aware Permissions**: Privacy controls based on relationship connections
- **Audit Logging**: Comprehensive tracking of permission changes and conflicts

#### Real-time Features
- **Supabase Realtime**: Live updates for calendar events and relationship changes
- **Fallback Handling**: Graceful degradation when real-time is unavailable
- **Performance Optimization**: Selective subscriptions to minimize overhead

## Development Guidelines

### Code Quality Standards
Follow the established patterns from `.gemini/GEMINI.md`:
- Use PACT methodology: Plan, Act, Check, Tell
- Maintain focused diffs without unrelated reformatting
- Run `npm run validate` before committing changes
- Prefer Tailwind utilities over inline styles

### Testing Approach
- **Test-Driven Development**: Write tests first, implement to pass
- **Test Pyramid**: Many unit tests, some integration tests, few E2E tests
- **FAST Principles**: Fast, Independent, Repeatable, Self-Validating, Timely
- **Given-When-Then**: Structure tests with clear setup, action, verification phases

### Security Considerations
- Always implement comprehensive input validation for any user-facing functions
- Use Zod schemas for all API endpoints and form validation
- Follow security best practices for authentication and authorization
- Regular security testing with provided security test suites

### Privacy Implementation
When working with user data or relationships:
- Always respect the 4-level privacy system
- Use privacy-aware helper functions in `lib/privacy-utils.ts`
- Test privacy boundaries with different relationship configurations
- Consider demo mode vs. production mode privacy differences

### Performance Guidelines
- Calendar conflict detection must maintain sub-2 second response times
- Use batch processing for multi-partner operations
- Implement proper loading states and error boundaries
- Monitor bundle size with `npm run analyze`

## Key Configuration Files
- **`package.json`**: All available scripts and dependencies
- **`.env.local.example`**: Required environment variables template
- **`middleware.ts`**: Route protection and security configuration
- **`tailwind.config.ts`**: Tailwind CSS configuration with theme support
- **`next.config.js`**: Next.js configuration with performance optimizations

## Production-Ready Testing Strategy

### Comprehensive Testing Framework
The project includes a multi-layered testing strategy designed to prevent catastrophic failures:

#### Core Testing Layers
- **Unit Tests**: Core business logic and utilities using Vitest
- **Integration Tests**: Database operations and API endpoints with Supabase
- **E2E Tests**: Critical user flows using Playwright
- **Security Tests**: Authentication, authorization, and input validation
- **Performance Tests**: Sub-2 second conflict detection and load testing

#### Production Readiness Testing (CRITICAL)
These test suites MUST pass before any production deployment:

1. **Privacy Boundary Testing** (`tests/privacy/privacy-boundary.test.ts`)
   - Validates 4-level privacy system enforcement
   - Prevents private data leakage across relationships
   - Tests audit logging and disaster recovery scenarios
   - Covers metamour privacy filtering and edge cases

2. **Multi-Relationship Scenario Testing** (`tests/relationships/multi-relationship-scenarios.test.ts`)
   - Tests complex polycule dynamics and permissions
   - Validates multi-partner event creation and visibility
   - Covers calendar sync scenarios (Google Calendar, Apple Calendar)
   - Tests real-time permission changes and enforcement

3. **Performance & Reliability Testing** (`tests/performance/performance-reliability.test.ts`)
   - Ensures sub-2 second conflict detection at scale
   - Tests API rate limiting under realistic load
   - Validates offline/poor connectivity handling
   - Simulates up to 10,000 concurrent users

4. **Email/Invitation System Load Testing** (`tests/scale/email-invitation-system.test.ts`)
   - Tests email verification under load (1000+ simultaneous)
   - Validates invitation workflow scalability
   - Tests notification deliverability and rate limiting
   - Covers abuse prevention and security measures

5. **Data Integrity & Recovery Testing** (`tests/integrity/data-consistency-recovery.test.ts`)
   - Prevents lost or duplicated events
   - Tests cross-device synchronization integrity
   - Validates backup/recovery procedures
   - Covers recurring event exception handling

6. **Production Monitoring Testing** (`tests/monitoring/production-monitoring.test.ts`)
   - Tests alerting for critical failure modes
   - Validates health check endpoints
   - Tests automated recovery procedures
   - Covers performance degradation detection

7. **User Journey Testing** (`tests/e2e/user-journey.test.ts`)
   - End-to-end alpha/beta user experience flows
   - Tests onboarding and invitation acceptance
   - Validates calendar integration workflows
   - Covers multi-device usage patterns

### Testing Best Practices & Rules

#### When to Run Production Tests
- **ALWAYS before any production deployment** - Run `npm run test:production:all`
- **Before alpha/beta releases** - Full test suite including load testing
- **After major feature changes** - Focus on affected test categories
- **Weekly automated runs** - Continuous production readiness validation

#### Test Development Guidelines
- **Privacy-First Testing**: Every test involving user data must validate privacy boundaries
- **Real-World Scenarios**: Use realistic data volumes and usage patterns in tests
- **Failure Mode Focus**: Design tests around "what would make users abandon the app?"
- **Performance Requirements**: Calendar operations must stay under 2-second response times
- **Data Integrity**: No test should ever leave corrupted or inconsistent data

#### Mobile Testing Integration
Since event creation UI with privacy controls and calendar sync are now implemented:
- **Mobile-Web Sync Testing**: Validate data consistency between mobile app and web
- **Privacy Control Testing**: Test privacy level selection and enforcement in mobile UI
- **Calendar Sync Testing**: Test Google/Apple calendar integration from mobile
- **Offline Testing**: Validate mobile app behavior during network issues

#### Test Data Management
- Use `testHelpers.createTestUser()` for consistent test user creation
- Always run `testHelpers.cleanupTestData()` in test teardown
- Use Docker for isolated test database environments
- Never use production data in tests - always generate synthetic test data

#### Test Failure Protocols
- **Privacy test failures**: Immediate development stop - potential data breach risk
- **Performance test failures**: Investigate before proceeding - user experience impact
- **Data integrity failures**: Full review required - potential data loss risk
- **Email system failures**: Check for service limits or authentication issues

Use the provided testing scripts to validate changes across all layers of the application. The production readiness tests are specifically designed to catch the failure modes that would cause immediate user abandonment.

## Preferred Development Workflow

### Testing Workflow (Docker-First)
When implementing or testing features:
1. **Use Docker for all testing**: Start test environment with `docker compose up -d` or `npm run test:db:setup`
2. **Run comprehensive tests**: Use `npm run validate` to ensure code quality
3. **Test database operations**: Use `npm run test:integration` and `npm run test:supabase`
4. **Clean up**: Use `docker compose down` to stop test services

### Deployment Workflow (Vercel-Preferred)
For deployment and verification:
1. **Build and validate locally**: Run `npm run build` and `npm run validate`
2. **Deploy to Vercel preview**: Use `vercel deploy` for staging verification
3. **Test deployed application**: Verify functionality on Vercel preview URL
4. **Deploy to production**: Use `vercel deploy --prod` when ready
5. **Monitor deployment**: Use `vercel logs` to check for issues

### Database Management (Supabase Integration)
For database schema and data management:
1. **Local development**: Use `supabase start` for local Supabase instance
2. **Schema changes**: Test locally, then use `supabase db push` to deploy
3. **Sync with remote**: Use `supabase db pull` to sync schema from production
4. **Reset when needed**: Use `supabase db reset` for clean state

### Required CLI Tools
Ensure the following CLIs are installed and available:
- **Docker**: For containerized testing environment
- **Vercel CLI**: For deployment and hosting management
- **Supabase CLI**: For database operations and local development

### Workflow Integration Notes
- Always use Docker for testing to ensure consistent environment
- Deploy to Vercel for all staging and production deployments
- Use Supabase CLI for database management and schema migrations
- Follow the test → deploy → verify → push pattern for all changes

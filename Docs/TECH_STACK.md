# PolyHarmony Tech Stack

## Overview

This document defines the complete technology stack for PolyHarmony, a privacy-first calendar app for polyamorous relationships. The stack is optimized for rapid MVP development, zero-knowledge architecture, and cross-platform deployment.

---

## Frontend Architecture

### Mobile Applications

- **React Native** (v0.72+)
  - **Purpose**: Cross-platform iOS/Android development
  - **Rationale**: Single codebase, native performance, large ecosystem
  - **Key Libraries**:
    - `@react-navigation/native` - Navigation
    - `@react-native-async-storage/async-storage` - Encrypted local storage
    - `@react-native-community/netinfo` - Offline detection
    - `react-native-vector-icons` - Icons
    - `react-native-calendars` - Calendar components

### Web Application

- **Next.js** (v14+)
  - **Purpose**: Server-side rendering, SEO optimization, PWA capabilities
  - **Rationale**: React ecosystem, excellent performance, Vercel deployment
  - **Key Features**:
    - App Router (v14+)
    - Server Components for performance
    - Static Site Generation (SSG) for marketing pages
    - API Routes for webhooks

### UI Framework

- **Shadcn/ui** + **Tailwind CSS**
  - **Purpose**: Consistent, accessible UI components
  - **Rationale**: Customizable, TypeScript-first, excellent DX
  - **Key Components**:
    - Calendar components
    - Form components with validation
    - Dialog/modal system
    - Toast notifications

---

## Backend Architecture

### API Framework

- **Node.js** (v18+) + **Express.js** (v4+)
  - **Purpose**: RESTful API with real-time capabilities
  - **Rationale**: JavaScript ecosystem, excellent performance, proven scalability
  - **Key Middleware**:
    - `helmet` - Security headers
    - `cors` - Cross-origin resource sharing
    - `compression` - Response compression
    - `rate-limiter-flexible` - Rate limiting

### Database

- **PostgreSQL** (v14+) via **Supabase**
  - **Purpose**: Primary data store with real-time subscriptions
  - **Rationale**: Zero-config setup, real-time features, PostgreSQL reliability
  - **Extensions**:
    - `pgcrypto` - Cryptographic functions
    - `uuid-ossp` - UUID generation
    - `pg_trgm` - Full-text search optimization

### Authentication

- **Supabase Auth**
  - **Purpose**: Phone-based authentication, session management
  - **Rationale**: Built-in security, social login support, JWT tokens
  - **Features**:
    - Phone number verification
    - Magic link authentication
    - Session refresh tokens
    - Row Level Security (RLS)

---

## AI & Machine Learning

### Natural Language Processing

- **OpenAI GPT-4 API**
  - **Purpose**: Natural language event creation, conflict detection
  - **Rationale**: State-of-the-art language understanding, reliable API
  - **Use Cases**:
    - "Dinner with Alex tomorrow 7pm" → structured event
    - Conflict detection and resolution suggestions
    - Relationship insights and recommendations

### AI Processing Queue

- **Bull Queue** + **Redis**
  - **Purpose**: Background AI processing, rate limiting
  - **Rationale**: Reliable job processing, horizontal scaling
  - **Features**:
    - Priority queues
    - Retry mechanisms
    - Rate limiting per user

---

## Security & Encryption

### End-to-End Encryption

- **Libsodium** (via `libsodium-wrappers`)
  - **Purpose**: Client-side encryption/decryption
  - **Rationale**: Battle-tested cryptography, constant-time operations
  - **Implementation**:
    - XChaCha20-Poly1305 for symmetric encryption
    - Ed25519 for digital signatures
    - X25519 for key exchange

### Key Management

- **User-controlled keys** stored in:
  - **iOS**: Keychain
  - **Android**: Keystore
  - **Web**: Web Crypto API + IndexedDB

---

## Infrastructure & DevOps

### Cloud Platform

- **Supabase** (Primary)
  - **Purpose**: Database, authentication, real-time subscriptions
  - **Features**:
    - Automatic backups
    - Point-in-time recovery
    - Connection pooling
    - Edge functions

- **Vercel** (Web deployment)
  - **Purpose**: Next.js hosting, CDN, edge functions
  - **Features**:
    - Automatic deployments
    - Preview deployments
    - Edge caching
    - Analytics

### Containerization

- **Docker** + **Docker Compose**
  - **Purpose**: Local development, consistent environments
  - **Services**:
    - PostgreSQL database
    - Redis cache
    - Node.js API server

### CI/CD

- **GitHub Actions**
  - **Purpose**: Automated testing, deployment
  - **Workflows**:
    - Lint and test on PR
    - Deploy to staging on merge
    - Deploy to production on release

---

## Monitoring & Analytics

### Application Monitoring

- **Sentry**
  - **Purpose**: Error tracking, performance monitoring
  - **Features**:
    - Real-time error alerts
    - Performance metrics
    - User session replay
    - Release tracking

### Analytics

- **PostHog** (Privacy-focused)
  - **Purpose**: Product analytics without compromising privacy
  - **Features**:
    - Event tracking
    - User funnels
    - A/B testing
    - Feature flags

---

## Development Tools

### Code Quality

- **TypeScript** (v5+)
  - **Purpose**: Type safety, better DX
  - **Configuration**: Strict mode, path mapping

- **ESLint** + **Prettier**
  - **Purpose**: Code formatting, linting
  - **Configuration**: Airbnb config + custom rules

### Testing

- **Frontend**: Jest + React Testing Library
- **Backend**: Jest + Supertest
- **E2E**: Playwright
- **Coverage**: 80% minimum requirement

---

## Environment Variables

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...

# AI Services
OPENAI_API_KEY=sk-...

# Authentication
JWT_SECRET=...
ENCRYPTION_KEY=...

# Monitoring
SENTRY_DSN=...
POSTHOG_API_KEY=...

# External APIs
GOOGLE_CALENDAR_CLIENT_ID=...
APPLE_TEAM_ID=...
```

---

## Development Setup

### Prerequisites

- Node.js v18+
- PostgreSQL v14+
- Redis v6+
- Docker (optional, for containerized development)

### Quick Start

```bash
# Clone repository
git clone [repository-url]
cd polyharmony

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start development servers
npm run dev:web    # Next.js web app
npm run dev:mobile # React Native (Metro)
npm run dev:api    # Express API server
```

---

## Deployment Strategy

### Environments

1. **Development**: Local development with Docker
2. **Staging**: Supabase staging project
3. **Production**: Supabase production project

### Deployment Commands

```bash
# Web deployment
npm run deploy:web    # Deploys to Vercel

# Mobile deployment
npm run deploy:ios    # Deploys to App Store
npm run deploy:android # Deploys to Play Store

# API deployment
npm run deploy:api    # Deploys to Supabase Edge Functions
```

---

## Security Checklist

- [ ] All API endpoints require authentication
- [ ] Rate limiting implemented on all endpoints
- [ ] Input validation on all user inputs
- [ ] SQL injection prevention via parameterized queries
- [ ] XSS prevention via React's built-in protections
- [ ] CSRF tokens for state-changing operations
- [ ] HTTPS enforcement in production
- [ ] Security headers via Helmet.js
- [ ] Regular dependency updates via Dependabot

---

## Performance Targets

| Metric | Target |
|--------|--------|
| App Launch Time | < 2 seconds |
| API Response Time | < 200ms |
| Database Query Time | < 50ms |
| Real-time Sync Latency | < 500ms |
| Bundle Size (Web) | < 200KB |
| Bundle Size (Mobile) | < 5MB |

---

## Migration Path

### Phase 1: MVP (Weeks 1-8)

- Supabase + Next.js + React Native
- Basic encryption, manual key management
- Core features only

### Phase 2: Scale (Months 3-6)

- Advanced encryption with hardware security modules
- CDN integration for global performance
- Advanced AI features

### Phase 3: Enterprise (Months 6-12)

- Self-hosted options
- Advanced compliance features
- White-label capabilities

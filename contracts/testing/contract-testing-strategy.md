# Contract Testing Strategy for PolyHarmony Calendar

## Overview

This document outlines the comprehensive contract testing strategy for the PolyHarmony Calendar application, addressing the critical gap in formal API contract validation and consumer-driven contract testing.

## Current State Analysis

### ✅ Strengths
- **Sophisticated Test Architecture**: Unit tests with comprehensive mocking, integration tests with real database
- **Advanced Privacy Testing**: 4-level privacy system with polycule network scenarios
- **Comprehensive API Coverage**: 66 endpoints with 97% authentication coverage
- **Performance-Oriented Testing**: Sub-100ms privacy processing requirements enforced

### ❌ Critical Gaps
- **No PACT Contracts**: Zero consumer-driven contract testing
- **Missing API Schema Validation**: Runtime contract enforcement absent
- **No Service Boundary Contracts**: Services communicate without formal interfaces
- **Weak Frontend-Backend Contracts**: Components assume API response formats without validation

## Contract Testing Implementation Plan

### Phase 1: Critical API Contracts (Immediate - 2 weeks)

#### 1.1 Events API Contracts
- **Provider**: Events API (`/api/events/*`)
- **Consumers**: Calendar Frontend, Mobile App
- **Priority**: Critical (core functionality)
- **Contract File**: `/contracts/pact/events-api.pact.json`

**Key Contract Scenarios**:
```javascript
// GET /api/events - Privacy-filtered event retrieval
// POST /api/events - Event creation with encryption
// Rate limiting behavior (429 responses)
// Authentication failures (401 responses)
```

#### 1.2 Conflict Detection API Contracts
- **Provider**: Conflict Detection API (`/api/events/check-conflicts/*`)
- **Consumers**: Calendar Frontend, Scheduling Components
- **Priority**: Critical (polycule scheduling core feature)
- **Contract File**: `/contracts/pact/conflict-detection-api.pact.json`

**Key Contract Scenarios**:
```javascript
// Multi-partner conflict detection with privacy boundaries
// Enhanced batch processing with alternatives
// Group availability checking
// Performance metrics validation (< 2000ms requirement)
```

#### 1.3 Authentication API Contracts
- **Provider**: Auth API (`/api/auth/*`)
- **Consumers**: All Frontend Components
- **Priority**: Critical (security foundation)
- **Contract File**: `/contracts/pact/auth-api.pact.json`

**Key Contract Scenarios**:
```javascript
// Sign in/out flows with session management
// CSRF token generation and validation
// Rate limiting on authentication attempts
// Password management workflows
```

### Phase 2: Database Contracts (2-3 weeks)

#### 2.1 Schema Evolution Contracts
- **Contract File**: `/contracts/schemas/database-contracts.json`
- **Validation**: Pre-migration contract compliance checks
- **Coverage**: All tables with encryption and privacy requirements

**Critical Database Contracts**:
- **Field Encryption Requirements**: Which fields must be encrypted
- **Privacy Level Enforcement**: RLS policy contracts
- **Migration Compatibility**: Backward compatibility rules
- **Performance Requirements**: Query performance contracts

#### 2.2 Encryption Field Contracts
```json
{
  "encryption_contracts": {
    "events.description": "conditional_based_on_privacy",
    "events.location": "smart_encryption_based_on_content",
    "events.notes": "always_encrypted",
    "relationships.partner_name": "conditional",
    "relationships.relationship_type": "conditional"
  }
}
```

### Phase 3: Integration Contracts (3-4 weeks)

#### 3.1 External Calendar Integration Contracts
- **Google Calendar API**: OAuth flows, event sync contracts
- **Apple Calendar API**: CalDAV protocol contracts
- **Error Handling**: Network failure scenarios

#### 3.2 Real-time Event Contracts
- **Supabase Realtime**: WebSocket event schemas
- **Privacy Filtering**: Real-time privacy boundary enforcement
- **Connection Management**: Reconnection and error recovery

## Implementation Architecture

### Consumer-Driven Contract Testing Flow

```mermatch
graph TD
    A[Frontend Development] --> B[Write Consumer Tests]
    B --> C[Generate PACT Files]
    C --> D[Version Control PACT Files]
    D --> E[Provider Verification]
    E --> F{Contracts Valid?}
    F -->|Yes| G[Deploy to Staging]
    F -->|No| H[Fix Provider Implementation]
    H --> E
    G --> I[Production Deployment]
```

### Contract Validation Pipeline

1. **Pre-commit Hooks**: Validate contract syntax and completeness
2. **Consumer Build**: Generate PACT files from consumer tests
3. **Provider Build**: Verify provider compliance with contracts
4. **Integration Testing**: Full contract validation in staging environment
5. **Production Monitoring**: Runtime contract compliance monitoring

## Testing Tools and Framework

### Recommended Stack
- **PACT JS**: Consumer-driven contract testing
- **JSON Schema**: API response validation
- **Supertest**: API endpoint testing
- **Vitest**: Test runner integration
- **Custom Middleware**: Runtime contract enforcement

### Contract Testing Utilities

#### Contract Validation Middleware
```typescript
// /lib/middleware/contract-validator.ts
import { validateApiContract } from '@/contracts/validators';

export function contractValidationMiddleware(
  contractPath: string,
  options: ContractValidationOptions
) {
  return async (req: NextRequest, res: NextResponse) => {
    // Validate request against contract
    const requestValidation = await validateApiContract(
      req,
      contractPath,
      'request'
    );

    if (!requestValidation.valid) {
      return NextResponse.json(
        { error: 'Contract violation', details: requestValidation.errors },
        { status: 400 }
      );
    }

    // Continue to actual handler...
    const response = await handler(req);

    // Validate response against contract
    const responseValidation = await validateApiContract(
      response,
      contractPath,
      'response'
    );

    if (!responseValidation.valid) {
      console.error('Response contract violation:', responseValidation.errors);
      // Log but don't fail in production
    }

    return response;
  };
}
```

#### Consumer Test Pattern
```typescript
// /tests/contracts/events-api.consumer.test.ts
import { Pact } from '@pact-foundation/pact';

describe('Events API Contract', () => {
  const provider = new Pact({
    consumer: 'CalendarFrontend',
    provider: 'EventsAPI',
    port: 1234,
    dir: path.resolve(process.cwd(), 'contracts/pact')
  });

  beforeAll(() => provider.setup());
  afterAll(() => provider.finalize());

  it('should return paginated events with privacy filtering', async () => {
    await provider
      .given('User has events with different privacy levels')
      .uponReceiving('a request for user events')
      .withRequest({
        method: 'GET',
        path: '/api/events',
        headers: { 'Authorization': 'Bearer valid-token' },
        query: { start_date: '2024-01-01T00:00:00Z' }
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          events: Matchers.eachLike({
            id: Matchers.uuid(),
            title: Matchers.string(),
            privacy_level: Matchers.term({
              generate: 'details',
              matcher: /^(private|busy_only|details|public)$/
            })
          }),
          pagination: {
            page: Matchers.integer(),
            totalCount: Matchers.integer()
          }
        }
      });

    const api = new EventsAPI('http://localhost:1234');
    const events = await api.getEvents({ start_date: '2024-01-01T00:00:00Z' });

    expect(events.events).toBeDefined();
    expect(events.pagination).toBeDefined();
  });
});
```

## Privacy and Security Contract Requirements

### Privacy Boundary Contracts
- **Private Events**: Only owner can access any details
- **Busy-Only Events**: Connected relationships see time blocks only
- **Details Events**: Connected relationships see full details based on connection tier
- **Public Events**: Everyone can see all details

### Encryption Contracts
- **Field-Level Encryption**: Contracts specify which fields require encryption
- **Key Management**: Contracts for encryption key access and rotation
- **Decryption Boundaries**: Who can decrypt what under which circumstances

### Connection Tier Contracts
```json
{
  "connection_tiers": {
    "details": {
      "calendar_access": "full_details",
      "event_creation": "visible_by_default",
      "conflict_detection": "full_visibility"
    },
    "busy_only": {
      "calendar_access": "time_blocks_only",
      "event_creation": "busy_only_visibility",
      "conflict_detection": "conflict_detection_only"
    },
    "none": {
      "calendar_access": "public_events_only",
      "event_creation": "no_visibility",
      "conflict_detection": "no_access"
    }
  }
}
```

## Performance Contracts

### API Response Time Requirements
- **Event Retrieval**: < 100ms for 1000 events
- **Conflict Detection**: < 2000ms for 10 partners
- **Privacy Filtering**: < 50ms for 100 events
- **Authentication**: < 200ms for sign-in flow

### Database Query Contracts
- **Indexed Queries**: All performance-critical queries must use indexes
- **Privacy Filtering**: RLS policies must not degrade performance beyond thresholds
- **Encryption Overhead**: Field decryption must not exceed 10ms per field

## Monitoring and Alerting

### Contract Compliance Monitoring
- **Real-time Validation**: Monitor API responses against contracts in production
- **Performance Monitoring**: Alert when response times exceed contract thresholds
- **Privacy Violation Detection**: Alert on potential privacy boundary violations
- **Schema Drift Detection**: Monitor for unauthorized database schema changes

### Alerting Strategy
- **Critical Violations**: Immediate alerts for privacy or security contract breaches
- **Performance Degradation**: Alerts when response times exceed contract thresholds
- **Schema Changes**: Notifications for database schema modifications
- **Contract Updates**: Team notifications when contracts are modified

## Rollout Plan

### Week 1-2: Foundation
- [ ] Set up PACT testing framework
- [ ] Create Events API contracts
- [ ] Implement basic contract validation middleware
- [ ] Set up contract violation monitoring

### Week 3-4: Core APIs
- [ ] Conflict Detection API contracts
- [ ] Authentication API contracts
- [ ] Database schema contracts
- [ ] Integration test updates

### Week 5-6: Advanced Features
- [ ] Privacy boundary contract validation
- [ ] Encryption field contracts
- [ ] Performance contract monitoring
- [ ] External integration contracts

### Week 7-8: Production Hardening
- [ ] Full contract coverage testing
- [ ] Production monitoring implementation
- [ ] Team training and documentation
- [ ] Contract evolution procedures

## Success Metrics

### Contract Coverage
- **API Endpoint Coverage**: 100% of critical endpoints under contract
- **Privacy Scenario Coverage**: All 4 privacy levels contracted
- **Error Scenario Coverage**: All error conditions contracted

### Quality Metrics
- **Contract Violation Rate**: < 0.1% in production
- **Privacy Boundary Violations**: Zero tolerance
- **Performance Contract Compliance**: 99.9% within thresholds

### Development Velocity
- **Integration Bug Reduction**: 80% reduction in frontend-backend integration bugs
- **Deployment Confidence**: Zero contract-related production rollbacks
- **API Evolution Safety**: Safe API changes with contract-driven development

## Conclusion

This contract testing strategy addresses the critical gaps in the current testing architecture while building on the strong foundation of privacy boundary testing and comprehensive mocking. The implementation will significantly improve API reliability, prevent integration failures, and provide confidence in the complex polycule privacy system.

The strategy prioritizes the most critical API boundaries first (Events, Conflict Detection, Authentication) and establishes a foundation for comprehensive contract-driven development across the entire application.
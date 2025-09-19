# Contract Testing Implementation Guide

This guide documents the comprehensive contract testing infrastructure for the PolyHarmony Calendar application, including consumer contracts, provider verification, and state management.

## Overview

The contract testing system uses PACT to ensure API compatibility between the frontend (CalendarWebApp) and backend services (AuthAPI, EventsAPI, CalendarAPI). This implementation includes:

- ✅ **Consumer Contracts**: Define expected API behaviors from the frontend perspective
- ✅ **Provider Verification**: Verify backend implementations satisfy consumer contracts
- ✅ **State Management**: Concrete Supabase seeding for reproducible test scenarios
- ✅ **Test Harness**: Comprehensive testing infrastructure with environment isolation

## Directory Structure

```
tests/contracts/
├── auth/                           # Authentication contracts
│   ├── signin.consumer.test.ts     # Login flow contracts
│   ├── signup.consumer.test.ts     # Registration contracts
│   └── signout.consumer.test.ts    # Logout contracts
├── events/                         # Events API contracts
│   └── events.consumer.test.ts     # Event CRUD and conflict detection
├── calendar/                       # Calendar API contracts
│   └── calendar.consumer.test.ts   # Export/import and integrations
├── providers/                      # Provider verification tests
│   ├── auth/                       # Auth provider verification
│   ├── events/                     # Events provider verification
│   ├── calendar/                   # Calendar provider verification
│   ├── setup/                      # Provider test configuration
│   └── utils/                      # Provider test utilities
├── states/                         # State management system
│   ├── supabase.ts                 # Supabase seeding coordinator
│   ├── database-seeder.ts          # Database seeding utilities
│   └── index.ts                    # State exports
├── fixtures/                       # Test data fixtures
├── matchers/                       # Custom PACT matchers
└── setup/                          # Test environment setup
```

## Contract Testing Commands

### Consumer Tests
```bash
# Run all consumer contracts
npm run test:contracts:consumers

# Run specific service contracts
npm run test:contracts:auth
npm run test:contracts:events
npm run test:contracts:calendar

# Run individual contract test
npx vitest run tests/contracts/events/events.consumer.test.ts
```

### Provider Verification
```bash
# Run all provider verifications
npm run test:contracts:providers

# Run specific provider verification
npx vitest run tests/contracts/providers/events/events.provider.test.ts
```

### Combined Testing
```bash
# Run all contract tests (consumers + providers)
npm run test:contracts

# Include in full test suite
npm run test:all
```

## State Management System

### Supabase Seeding Infrastructure

The state management system provides concrete database seeding for reproducible contract testing:

#### Available Provider States

1. **User Authentication States**:
   - `User does not exist` - Clean state for registration testing
   - `User exists and is confirmed` - Authenticated user state
   - `Unconfirmed user exists` - Email confirmation testing
   - `Rate limiting is active` - Rate limiting scenarios

2. **User Data States**:
   - `User with relationships and events exists` - Full user scenario
   - `User with events and contacts exists` - Event management testing
   - `Multiple users with shared events exist` - Multi-user scenarios
   - `User with calendar integrations configured` - External calendar testing

3. **Database States**:
   - `Empty database` - Clean slate testing
   - `Database with privacy boundaries` - Privacy testing scenarios

#### State Replay for Provider Verification

The state system includes provider verification replay capabilities:

- **Deterministic Seeding**: Consistent test data across consumer/provider tests
- **State Snapshots**: Capture database state for provider replay
- **Automatic Cleanup**: Teardown between test runs
- **Isolation**: Test-specific database transactions

### Example State Usage

```typescript
// In consumer tests
pact
  .given('User with relationships and events exists')
  .uponReceiving('a request to create a new event')
  // ... test definition

// In provider tests
stateHandlers: {
  'User with relationships and events exists': () => {
    return getStateHandler('User with relationships and events exists')?.setup();
  }
}
```

## API Contract Coverage

### Authentication API (AuthAPI)
- ✅ User registration (signup)
- ✅ User authentication (signin)
- ✅ Session management (signout)
- ✅ Password validation
- ✅ Rate limiting
- ✅ Email confirmation flows

### Events API (EventsAPI)
- ✅ Event creation with privacy levels
- ✅ Event retrieval and filtering
- ✅ Event modification and deletion
- ✅ Conflict detection (single and batch)
- ✅ Group availability checking
- ✅ Privacy-aware event sharing
- ✅ Partner invitation management

### Calendar API (CalendarAPI)
- ✅ Calendar export (iCal, CSV, JSON)
- ✅ Calendar import with merge strategies
- ✅ External calendar integrations (Google, Apple)
- ✅ Calendar synchronization
- ✅ Privacy-filtered calendar views
- ✅ Multi-tenant calendar management

## Implementation Guide

### For Auth Team

The provider scaffolding is ready for immediate use:

1. **Review Provider Templates**: Check `tests/contracts/providers/auth/` for implementation examples
2. **Implement Supabase Handlers**: Wire up actual Supabase calls in provider tests
3. **Configure Authentication**: Set up JWT validation in provider verification
4. **Run Verification**: Execute provider tests against running API

### For Events/Calendar Teams

Contract specifications are complete and ready for implementation:

1. **Consumer Contracts**: All Events/Calendar contracts defined with comprehensive scenarios
2. **Provider Templates**: Implementation guides available in provider directories
3. **State Integration**: Database seeding pre-configured for all test scenarios
4. **Error Handling**: Both success and error paths covered in contracts

### Development Workflow

1. **Write Consumer Contract**: Define expected API behavior from frontend perspective
2. **Implement API Endpoint**: Build backend implementation to satisfy contract
3. **Add Provider Verification**: Verify implementation meets contract requirements
4. **Integrate State Management**: Use existing seeding system for test data
5. **CI Integration**: Add to continuous integration pipeline

## Key Features

### Privacy-Aware Testing
- Multi-level privacy testing (private, visible, semi_private, public)
- Partner-specific visibility validation
- Relationship-based access control testing

### Polyamorous Relationship Support
- Multi-partner event scenarios
- Complex relationship hierarchy testing
- Group availability and scheduling

### Performance Contract Testing
- Sub-2 second response time validation
- Batch operation performance testing
- Conflict detection algorithm verification

### Integration Testing
- External calendar service contracts
- OAuth flow validation
- File import/export format testing

## Best Practices

### Contract Design
- **Specific but Flexible**: Use matchers for dynamic data while maintaining type safety
- **Error Scenarios**: Include both success and failure paths in contracts
- **Privacy Compliance**: Ensure all privacy levels are tested appropriately

### State Management
- **Isolated Tests**: Each test gets clean database state
- **Realistic Data**: Use representative data that matches production scenarios
- **Performance**: Keep state setup fast for quick test execution

### Provider Verification
- **Authentication**: Properly validate JWT tokens in provider tests
- **Error Handling**: Test both expected and edge case scenarios
- **Cleanup**: Always clean up test data between verifications

## Troubleshooting

### Common Issues

1. **State Setup Failures**: Verify Supabase connection and credentials
2. **Contract Mismatches**: Check response format and field names
3. **Authentication Errors**: Validate JWT token format and signing
4. **Timeout Issues**: Increase timeout for complex state setup

### Debug Mode

```bash
# Enable verbose PACT logging
PACT_LOG_LEVEL=debug npm run test:contracts

# Run individual test with debugging
DEBUG=pact* npx vitest run tests/contracts/events/events.consumer.test.ts
```

## Next Steps

1. **CI Integration**: Add contract testing to GitHub Actions workflow
2. **Contract Publishing**: Set up PACT Broker for contract sharing
3. **Monitoring**: Add contract compliance monitoring to production
4. **Documentation**: Maintain contract documentation as APIs evolve

## Support

For contract testing support:
- **State Management**: Check `tests/contracts/states/` for seeding utilities
- **Provider Setup**: Review `tests/contracts/providers/README.md`
- **Examples**: All contract tests include comprehensive implementation examples
- **Debugging**: Use PACT debugging tools and verbose logging

The contract testing infrastructure is production-ready and provides comprehensive coverage for all API interactions in the PolyHarmony Calendar application.
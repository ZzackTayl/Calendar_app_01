# Provider Contract Test Scaffolding

This directory contains provider verification test templates and utilities for the Auth team to wire up Supabase handlers.

## Quick Start for Auth Team

1. **Environment Setup**: Configure your test environment variables in `.env.test`
2. **Handler Integration**: Implement the Supabase handlers in the provided templates
3. **State Seeding**: The state management is already integrated with the existing system
4. **Run Tests**: Execute `npm run test:contracts:providers` to verify contracts

## Directory Structure

```
providers/
├── auth/                    # Auth provider verification tests
│   ├── signin.provider.test.ts
│   ├── signup.provider.test.ts
│   ├── signout.provider.test.ts
│   └── password-validation.provider.test.ts
├── setup/                   # Provider test configuration
│   ├── provider-server.ts   # Test server setup
│   └── auth-handlers.ts     # Supabase handler templates
├── utils/                   # Shared utilities
│   ├── provider-config.ts   # Configuration management
│   └── test-helpers.ts      # Test helper functions
└── README.md               # This file
```

## Integration Points

### State Management Integration
The provider tests are pre-configured to work with the existing `contractStateCoordinator` from `tests/contracts/states/supabase.ts`. This means:

- User seeding is handled automatically
- Test data cleanup is managed
- Rate limiting simulation is built-in
- Authentication state management is coordinated

### Handler Implementation
Each provider test template includes:

- **TODO comments** marking where Supabase handlers need to be implemented
- **Type definitions** for expected handler signatures
- **Error handling patterns** following the existing codebase conventions
- **Integration examples** showing how to wire up real Supabase calls

### Test Execution
Provider tests can be run:

- **Individual tests**: `npx vitest run tests/contracts/providers/auth/signin.provider.test.ts`
- **Auth suite**: `npm run test:contracts:providers:auth` (to be added to package.json)
- **All providers**: `npm run test:contracts:providers` (to be added to package.json)

## Next Steps for Auth Team

1. **Review the templates** in `auth/` directory
2. **Implement Supabase handlers** in `setup/auth-handlers.ts`
3. **Configure environment** using `utils/provider-config.ts`
4. **Test integration** by running individual provider tests
5. **Add to CI pipeline** once handlers are implemented

## Support

This scaffolding integrates with:
- Existing contract state management system
- PACT verification framework
- Current testing infrastructure
- Supabase client configuration patterns

All templates follow the established patterns in the codebase and are ready for immediate use.
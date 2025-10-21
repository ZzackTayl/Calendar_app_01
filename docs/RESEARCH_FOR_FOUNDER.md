# Google Sign-In v7 Migration Research & Planning

**Status**: Research Phase  
**Priority**: Medium (Schedule for future sprint)  
**Effort Estimate**: 16-20 hours  
**Owner**: [Assign to developer]

---

## Executive Summary

The app attempted to upgrade `google_sign_in` from v6.2.1 to v7.2.0 but the migration was incomplete, leaving the code in a broken state that blocked tests. We reverted to v6.2.1 to maintain stability. This document tracks the research needed to complete the migration properly.

---

## The Problem

### What Happened
The developer upgraded the package versions in `pubspec.yaml` but only partially refactored the code to work with the new API. This created an inconsistent state:

- **Packages**: v7.2.0 (new)
- **Code**: v6.2.1 style (old)
- **Result**: Compilation errors blocking 20+ tests

### Why It Matters
1. **Technical Debt**: v6.2.1 is older and less maintained
2. **Security**: Newer versions have bug fixes and security patches
3. **Future Updates**: Each delayed upgrade makes future upgrades harder
4. **Team Velocity**: This issue consumed significant debugging time

### Impact on the App
- ❌ 20 test files couldn't compile
- ❌ Tests blocked for CI/CD
- ❌ Google Calendar imports broken at compile time
- ❌ All pull requests with this code couldn't merge
- ✅ (Now fixed by reverting to v6.2.1)

---

## Key API Differences: v6 vs v7

### Authentication Flow

**v6.2.1:**
```dart
// Simple, callback-based approach
final googleSignIn = GoogleSignIn(scopes: _scopes);
GoogleSignInAccount? account = googleSignIn.currentUser;
account ??= await googleSignIn.signInSilently();
account ??= await googleSignIn.signIn();
final httpClient = await googleSignIn.authenticatedClient();
```

**v7.2.0:**
```dart
// Singleton pattern, stream-based approach
final googleSignIn = GoogleSignIn.instance;
await googleSignIn.initialize();  // Required once

// Subscribe to auth events
googleSignIn.authenticationEvents.listen((event) {
  // Handle auth changes
});

// Authenticate when needed
await googleSignIn.authenticate(scopes: _scopes);

// Get account from stream
final account = googleSignIn.currentUser;  // Different implementation
```

### Major Breaking Changes
| Aspect | v6.2.1 | v7.2.0 | Migration Effort |
|--------|--------|--------|------------------|
| Constructor | `GoogleSignIn(scopes:)` | `GoogleSignIn.instance` | High |
| Initialization | Implicit | `initialize()` required | Medium |
| Auth Pattern | Callback-based | Stream-based | High |
| SignInSilently | ✅ Available | ❌ Removed | High |
| CurrentUser | Direct property | Different access | Medium |
| HTTP Client | Via extension | Via extension (v3.0.0) | Low |

---

## What Needs to be Researched

### 1. Complete API Surface Documentation
**Current State**: Partial understanding  
**Needed**: Full API documentation review

**Research Tasks:**
- [ ] Read official google_sign_in v7.2.0 README (in pub.dev)
- [ ] Study the example app in the repository
- [ ] Document all public methods and properties
- [ ] Map v6 → v7 migration path for each method
- [ ] Identify best practices for v7

**Resources:**
- Official docs: https://pub.dev/packages/google_sign_in
- GitHub repo: https://github.com/google/google-sign-in-app-dart
- API docs: https://pub.dev/documentation/google_sign_in/latest/

---

### 2. Stream-Based Architecture
**Current State**: Unknown  
**Needed**: Understanding of stream-based auth

**Research Tasks:**
- [ ] Learn Dart streams (if not already familiar)
- [ ] Understand `authenticationEvents` stream
- [ ] Research best practices for stream subscriptions
- [ ] Study lifecycle management for streams
- [ ] Learn error handling in streams

**Topics to Research:**
- Dart `Stream` and `StreamController`
- Reactive programming patterns
- Memory leak prevention with streams
- Testing stream-based code

**Resources:**
- Dart docs: https://dart.dev/tutorials/language/streams
- Flutter patterns: https://flutter.dev/docs/development/data-and-backend/state-mgmt
- Stream testing: https://pub.dev/documentation/test/latest/

---

### 3. Extension Package Compatibility
**Current State**: v3.0.0 compatible (needs verification)  
**Needed**: Verification of extension package support

**Research Tasks:**
- [ ] Verify `extension_google_sign_in_as_googleapis_auth` v3.0.0 works with v7.2.0
- [ ] Check if new extension versions are needed
- [ ] Understand what the extension provides
- [ ] Research alternative ways to get HTTP client in v7

**Resources:**
- Extension package: https://pub.dev/packages/extension_google_sign_in_as_googleapis_auth
- Release notes: Check changelog for compatibility info

---

### 4. Platform-Specific Changes
**Current State**: Unknown  
**Needed**: Platform implementation details

**Research Tasks:**
- [ ] iOS changes between v6 and v7 (firebase, configuration)
- [ ] Android changes (gradle, manifest, permissions)
- [ ] Web platform differences
- [ ] macOS/Linux support status

**Platforms to Test:**
- [ ] iOS (primary)
- [ ] Android (primary)
- [ ] Web (if applicable)
- [ ] macOS (if applicable)

**Resources:**
- iOS setup: https://pub.dev/packages/google_sign_in_ios
- Android setup: https://pub.dev/packages/google_sign_in_android
- Web setup: https://pub.dev/packages/google_sign_in_web

---

### 5. Testing Strategy for v7
**Current State**: Existing v6 tests  
**Needed**: Updated testing approach

**Research Tasks:**
- [ ] How to mock `GoogleSignIn.instance` in tests
- [ ] Testing stream-based authentication
- [ ] Handling async/await in tests with streams
- [ ] Integration testing Google auth flow

**Testing Concerns:**
- Unit tests (mocking the singleton)
- Integration tests (real auth flow)
- Widget tests (UI + auth)
- End-to-end tests

**Resources:**
- Flutter testing: https://flutter.dev/docs/testing
- Mockito docs: https://pub.dev/packages/mockito

---

## Findings Section

### Official Documentation
- **google_sign_in v7.2.0 Changelog**: Review what changed from v6
- **Breaking Changes**: Listed in pub.dev release notes
- **Migration Guide**: Check if Google provides one (likely buried in README)

### Key Insights
*(Add findings as research progresses)*

- [ ] Stream-based auth requires lifecycle management
- [ ] Singleton pattern means single instance across app
- [ ] Extension package is still needed for HTTP client
- [ ] Platform-specific implementations are separate packages
- *(Add more as discovered)*

### Common Issues
*(Document issues encountered)*

- [ ] Issue: currentUser behavior different in v7
  - Solution: Research exact API changes
- [ ] Issue: SignInSilently removed
  - Solution: Use attemptLightweightAuthentication() instead
- *(Add more as researched)*

### Code Patterns to Study
- [ ] Example of v7 integration in real apps
- [ ] Error handling patterns for v7
- [ ] Lifecycle management patterns
- [ ] Testing patterns for stream-based auth

### Recommended Reading Order
1. Start: https://pub.dev/packages/google_sign_in (README)
2. Then: API documentation on same page
3. Next: Example app in GitHub repository
4. Deep dive: Source code for specific functionality
5. Verify: Test suite in the repository

---

## Implementation Approach (When Ready)

### Phase 1: Preparation
- [ ] Complete all research tasks
- [ ] Create detailed implementation plan
- [ ] Design new code structure
- [ ] Plan test strategy

### Phase 2: Implementation
- [ ] Create feature branch
- [ ] Refactor GoogleCalendarSyncService
- [ ] Update main.dart initialization
- [ ] Update all test mocks

### Phase 3: Testing
- [ ] Unit tests for all auth flows
- [ ] Integration tests with real Google auth
- [ ] Platform-specific testing (iOS, Android)
- [ ] Manual smoke testing

### Phase 4: Validation
- [ ] Code review with team
- [ ] QA testing
- [ ] Staged rollout plan
- [ ] Performance testing

---

## Success Criteria

When migration is complete, verify:
- [ ] All 450+ tests pass
- [ ] No compilation warnings
- [ ] Google Calendar import works
- [ ] All platforms (iOS, Android, Web) work
- [ ] No increase in build time
- [ ] No regressions in functionality
- [ ] Performance is unchanged or improved

---

## Timeline Estimate

| Phase | Duration | Notes |
|-------|----------|-------|
| Research | 4-6 hours | Deep dive into API and examples |
| Implementation | 8-10 hours | Refactoring code for v7 |
| Testing | 4-6 hours | Unit + integration + manual |
| Documentation | 2-3 hours | Update guides and examples |
| **Total** | **18-25 hours** | 2-3 days of focused work |

---

## Recommended Developer Skills

The developer assigned should be familiar with:
- ✅ Dart/Flutter
- ✅ Async/await patterns
- ✅ Stream processing (or willing to learn)
- ✅ Testing in Flutter
- ✅ Google APIs
- ✓ OAuth 2.0 basics helpful

---

## Files to Research

### Current Implementation
- `lib/logic/services/google_calendar_sync_service.dart` - Main integration
- `lib/main.dart` - App initialization
- `pubspec.yaml` - Package versions
- `test/services/` - Test examples

### Documentation
- `docs/GOOGLE_SIGNIN_MIGRATION_DECISION.md` - Migration decision
- `docs/COMPREHENSIVE_TEST_FAILURE_GUIDE.md` - What went wrong

---

## Related Issues & Tickets

**Current**: Google Sign-In v6.2.1 (stable, functional)  
**Target**: Google Sign-In v7.2.0 (pending migration)  
**Blocker**: None (migration scheduled for future)  
**Dependencies**: 
- `extension_google_sign_in_as_googleapis_auth: ^2.0.12`
- `googleapis: ^13.2.0`
- `googleapis_auth: ^1.6.0`

---

## Notes for Future Developer

1. **Start with the README** - Most important information is in the package README
2. **Study the example app** - Real working code is invaluable
3. **Test early and often** - Stream-based code is harder to debug
4. **Reach out to community** - Google Flutter community is helpful
5. **Plan for platform-specific issues** - iOS/Android may have specific quirks

---

## Decision Log

**2025-10**: Initial migration attempt (incomplete)  
**2025-10**: Reverted to v6.2.1 for stability  
**2025-10**: Created this research document for future migration  

*(Add updates as research progresses)*

---

## Questions for Discussion

- [ ] Is v7 migration a priority for next quarter?
- [ ] Should we hire external expertise for this?
- [ ] Are there alternative auth solutions to consider?
- [ ] What's our timeline for being on latest versions?
- [ ] How critical is this vs other work?

---

## Additional Resources

### Documentation
- [google_sign_in pub.dev](https://pub.dev/packages/google_sign_in)
- [Dart Streams Tutorial](https://dart.dev/tutorials/language/streams)
- [Flutter Authentication Guide](https://flutter.dev/docs/development/data-and-backend/firebase)

### Examples
- [google_sign_in example app](https://github.com/google/google-sign-in-app-dart/tree/main/example)
- [Firebase Auth example](https://github.com/firebase/flutterfire/tree/master/packages/firebase_auth/firebase_auth/example)

### Community
- [Flutter Discord](https://discord.gg/flutter)
- [Stack Overflow - google-sign-in tag](https://stackoverflow.com/questions/tagged/google-sign-in)
- [Google Flutter GitHub Discussions](https://github.com/flutter/flutter/discussions)

---

**Last Updated**: October 2025  
**Next Review**: [Schedule for next sprint planning]  
**Assigned To**: [TBD]  
**Priority**: Medium

---

*This document should be updated as research progresses. Add findings, links, and insights as they're discovered.*

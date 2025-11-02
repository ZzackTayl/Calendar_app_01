# Phase 3 Issues - Calendar Sharing Postponed

**Date:** October 31, 2025  
**Status:** Contacts feature complete, Calendar Sharing postponed

---

## Issue Summary

While migrating Phase 3, we discovered that the `SharedCalendarEvent` domain model doesn't have the necessary serialization methods (`fromJson`, `toJson`) that our Firestore data sources need.

### The Problem

1. `SharedCalendarEvent` is a wrapper class around `CalendarEvent`
2. It doesn't have `fromJson`/`toJson` methods
3. It's designed for in-memory use, not Firestore persistence
4. Adding serialization would require significant domain model changes

### Decision

**Postpone Calendar Sharing to a later phase** and complete Contacts feature only for Phase 3.

**Rationale:**
- Contacts feature is independent and complete
- Calendar Sharing needs domain model refactoring first
- Don't want to modify core domain models without full understanding
- Better to deliver working Contacts than broken Sharing

---

## What's Complete in Phase 3

✅ **Contact Management:**
- Contact CRUD operations
- Contact search
- Contact invitations
- Firestore data source
- Repository implementation
- ContactCubit
- Zero errors

---

## What's Postponed

⏸️ **Calendar Sharing:**
- Share events with contacts
- Visibility management
- Accept/decline shared events

**Will be addressed in:**
- Phase 4b (after Notifications & Signals)
- Or as part of domain model refactoring

---

## Files to Remove/Comment Out

```
lib/features/contacts/data/datasources/calendar_share_remote_data_source.dart
lib/features/contacts/data/repositories/calendar_share_repository_impl.dart
lib/features/contacts/domain/repositories/calendar_share_repository.dart
lib/features/contacts/presentation/cubit/calendar_share_cubit.dart
```

---

## Recommendation

1. Remove calendar sharing files from Phase 3
2. Update GetIt to not register calendar sharing
3. Complete Phase 3 with Contacts only
4. Move to Phase 4 (Notifications & Signals)
5. Revisit calendar sharing after domain model review

---

**Phase 3 is 50% complete (Contacts done, Sharing postponed)**

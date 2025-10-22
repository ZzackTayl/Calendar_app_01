# Critical Fixes Priority Plan
**Created:** October 21, 2025  
**Status:** IN PROGRESS

## Priority Order (By Impact & Complexity)

### 🔴 PRIORITY 1: Rate Limiting (6-8 hours)
**Impact:** CRITICAL - Unlimited cost exposure  
**Complexity:** Medium  
**Affects:** All 4 edge functions

**Why First:** Prevents financial disaster from abuse. Single implementation can protect all endpoints.

**Files to Fix:**
- `supabase/functions/send-contact-invitation-email/index.ts`
- `supabase/functions/send-contact-invitation-sms/index.ts`
- `supabase/functions/send-ai-agent-sms/index.ts`
- `supabase/functions/handle-inbound-sms/index.ts`

**Implementation:** Supabase-based rate limiting using database queries (no external dependencies)

---

### 🔴 PRIORITY 2: XSS Sanitization (1 hour)
**Impact:** CRITICAL - Security vulnerability  
**Complexity:** Low  
**Affects:** Email invitation function

**Why Second:** Easy quick win, closes security hole.

**Files to Fix:**
- `supabase/functions/send-contact-invitation-email/index.ts`

**Implementation:** HTML escape function for user input

---

### 🔴 PRIORITY 3: Phone Number Validation (30 min)
**Impact:** HIGH - Cost waste & user experience  
**Complexity:** Low  
**Affects:** SMS contact invitation

**Why Third:** Another quick win, prevents wasted Twilio costs.

**Files to Fix:**
- `supabase/functions/send-contact-invitation-sms/index.ts`

**Implementation:** Add E.164 regex validation (already exists in send-ai-agent-sms)

---

### 🔴 PRIORITY 4: Webhook Signature Verification (4-6 hours)
**Impact:** CRITICAL - Security hole  
**Complexity:** Medium-High  
**Affects:** Inbound SMS webhook

**Why Fourth:** More complex, requires Twilio signature verification logic.

**Files to Fix:**
- `supabase/functions/handle-inbound-sms/index.ts`

**Implementation:** Twilio signature validation using HMAC-SHA1

---

### 🔴 PRIORITY 5: Type Cast Safety (2 hours)
**Impact:** HIGH - App crashes  
**Complexity:** Low  
**Affects:** Dart API layer

**Why Fifth:** Prevents production crashes, easy to fix.

**Files to Fix:**
- `lib/logic/services/api_service.dart` (AiAgentSmsApi class)

**Implementation:** Safe type checking before casts

---

### 🟡 PRIORITY 6: Duplicate Message Detection (2-3 hours)
**Impact:** MEDIUM - Data integrity  
**Complexity:** Medium  
**Affects:** Inbound SMS webhook

**Why Sixth:** Prevents double-processing but less urgent.

**Files to Fix:**
- `supabase/functions/handle-inbound-sms/index.ts`

**Implementation:** Check `twilio_sid` before inserting

---

### 🟡 PRIORITY 7: Error Message Sanitization (3-4 hours)
**Impact:** MEDIUM - Info disclosure  
**Complexity:** Medium  
**Affects:** Multiple files

**Why Seventh:** Less urgent security issue.

**Files to Fix:**
- `lib/logic/services/api_service.dart`
- All edge functions

**Implementation:** Sanitize errors, log internally only

---

### 🟢 PRIORITY 8: Testing (20-30 hours)
**Impact:** HIGH - Quality assurance  
**Complexity:** High  
**Affects:** All new code

**Why Last:** Time-intensive, can be done incrementally as we fix other issues.

**Implementation:** Unit, integration, and E2E tests

---

## Execution Strategy

1. **Fix Priority 1-3 Today** (7-9 hours)
   - Quick wins
   - Closes most critical holes
   - Prevents financial disaster

2. **Fix Priority 4-5 Tomorrow** (6-8 hours)
   - More complex security fixes
   - Improves reliability

3. **Fix Priority 6-7 Day 3** (5-7 hours)
   - Polish and robustness
   - Reduced risk

4. **Testing Day 4-7** (20-30 hours)
   - Write comprehensive tests
   - Verify all fixes work
   - Document edge cases

---

## Success Criteria

After all fixes:
- ✅ No unlimited cost exposure
- ✅ No security vulnerabilities
- ✅ No app crashes from edge function errors
- ✅ Webhook validated and secure
- ✅ 40+ tests passing
- ✅ Ready for production deployment

---

## Current Status

- [x] Priority 1: Rate Limiting - **COMPLETE**
- [x] Priority 2: XSS Sanitization - **COMPLETE**
- [x] Priority 3: Phone Validation - **COMPLETE**
- [x] Priority 4: Webhook Verification - **COMPLETE**
- [x] Priority 5: Type Cast Safety - **COMPLETE**
- [x] Priority 6: Duplicate Detection - **COMPLETE**
- [ ] Priority 7: Error Sanitization - **SKIPPED** (low priority)
- [ ] Priority 8: Testing - **PENDING**

**Last Updated:** October 21, 2025 - Critical fixes complete!

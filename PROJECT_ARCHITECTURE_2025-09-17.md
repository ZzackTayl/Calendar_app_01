# Project Architecture (As of 2025-09-17)

## Architecture Overview

Next.js App Router in app/ wraps all pages with app/layout.tsx providing ThemeProvider, AuthProvider, TimeZoneProvider, NotificationProvider, ClientErrorBoundaryWrapper, and lazy PerformanceMonitor; global styles live in app/globals.css.
Supabase is the single backend: browser/client helpers in lib/supabase, server helpers in lib/auth/middleware-helpers.ts, middleware enforcement in middleware.ts, and API routes under app/api/* share lib/api/response-handler.ts, lib/security/csrf.ts, lib/rate-limiting.ts, lib/encryption/field-encryption.ts.
State/context flows: lib/auth-context.tsx (core auth), lib/time-zones/time-zone-context.tsx, lib/notifications/context.tsx, lib/notifications/notification-provider.tsx, plus hooks in hooks/ (use-auth-guard.tsx, use-realtime-events.ts, etc.) powering page-level components.
Domain utilities live in lib/* directories: authentication (lib/auth/*), permissions (lib/permissions/*), privacy (lib/privacy/*), encryption (lib/encryption/field-encryption.ts), rate limiting (lib/rate-limiting.ts + lib/middleware/*), monitoring/security (lib/monitoring/*, lib/security/*), recurrence/time-zone support (lib/recurrence/recurrence-utils.ts, lib/time-zones/*).

## Route Components (app/)

app/page.tsx landing page uses useAuth, ModeToggle, and navigates to auth/dashboard based on session.
Auth flows: auth/signin/page.tsx, auth/signup/page.tsx, auth/forgot-password/page.tsx, auth/update-password/page.tsx, auth/confirm-email/page.tsx, auth/callback/route.ts integrate with useAuth, useZodForm, lib/auth/session-manager.ts.
Dashboard & analytics: dashboard/page.tsx pulls Supabase relationships/events, renders NotificationDropdown, uses getPrivacyLevelBadge and useMemo caching.
Calendar experience: calendar/page.tsx uses useRealtimeEvents, useRealtimeRelationships, ensureRelationshipColor, getPrivacyLevelBadge, date-fns utilities.
Event management: events/page.tsx, events/create/*, events/[id]/* rely on components/ui/event-card.tsx, recurrence editors, file uploader, Supabase CRUD via API.
Contacts CRM: contacts/page.tsx, contacts/create/page.tsx, contacts/[id]/page.tsx leverage components/ui/contact-form.tsx, contact-picker.tsx, and /api/contacts.
Groups: groups/page.tsx, groups/create/page.tsx, groups/[id]/* use group invitation components, group forms, Supabase relationship groups.
Relationships: relationships/page.tsx, relationships/add/page.tsx, relationships/[id]/edit/page.tsx employ privacy selectors, relationship indicators, contact pickers.
Sharing hub: sharing/page.tsx uses share dialog, notifications integration, and Supabase sharing tables.
Onboarding: onboarding/page.tsx multi-step wizard with large set of inline placeholders, Zod schemas from lib/validation/onboarding-schemas.ts.
Settings: settings/page.tsx, settings/time-zone/page.tsx, settings/privacy/page.tsx, settings/calendar-integrations/page.tsx use TimeZoneProvider, Google integration component, deletion confirmations.
Invitations: invitations/page.tsx, invitations/accept/page.tsx read invitation tables, use invitation components.
Support/static: support/page.tsx, privacy/page.tsx, terms/page.tsx, clear-demo-mode/page.tsx, not-found.tsx, error.tsx.
Debug/test: debug/auth/page.tsx renders components/debug/AuthStatus, test-realtime/page.tsx exercises realtime hooks, clear-demo-mode/page.tsx resets local demo state.

## API Routes (app/api)

/api/contacts (route.ts) performs CRUD with validation, uses createApiResponse, CSRF, rate limiting, permission service.
/api/events handles event CRUD, encryption (encryptSensitiveFields), permission checks, pagination.
/api/sharing, /api/notifications, /api/onboarding, /api/attachments, /api/calendar, /api/groups, /api/security, /api/monitoring, /api/templates, /api/user, /api/webhooks, /api/account, /api/debug, /api/test, /api/error-reporting, /api/health each follow same pattern: requireAuthentication, validateCSRFProtection, checkRateLimit, logging, domain-specific lib modules.

## Reusable Component Inventory

Debug/dev/security: components/debug/RealtimeDebugPanel.tsx, SecurityMonitoringPanel.tsx, auth-debug-panel.tsx, auth-status.tsx; components/dev/account-switcher.tsx, persistence-dashboard.tsx; components/security/AuditDashboard.tsx, SecurityDashboard.tsx; components/error-boundary/* (AuthErrorBoundary, ClientErrorBoundaryWrapper, ErrorBoundary, NetworkErrorBoundary, RealtimeErrorBoundary, withErrorBoundary, index.ts); components/notifications/NotificationDropdown.tsx; components/test/MobilePaginationTestPanel.tsx.
UI primitives & layout (components/ui/): accessible-form.tsx, form.tsx and form/form-control.tsx, form-error.tsx, error-alert.tsx, form-submit-button.tsx, index.ts (form context helpers); button.tsx, badge.tsx, card.tsx, tabs.tsx, accordion.tsx, collapsible.tsx, dropdown-menu.tsx, context-menu.tsx, navigation-menu.tsx, menubar.tsx, breadcrumb.tsx, sheet.tsx, hover-card.tsx, popover.tsx, tooltip.tsx, alert.tsx, alert-dialog.tsx, dialog.tsx, toast.tsx, toaster.tsx, sonner.tsx manage layout/feedback using Radix/shadcn.
Inputs & pickers: input.tsx, textarea.tsx, checkbox.tsx, radio-group.tsx, toggle.tsx, toggle-group.tsx, switch.tsx, slider.tsx, select.tsx, input-otp.tsx, color-picker.tsx, calendar.tsx, time-zone-selector.tsx, time-zone-display.tsx, pagination.tsx, command.tsx (search), natural-language-input.tsx and natural-language-input-lazy.tsx, password-strength-indicator.tsx, recurrence-editor.tsx/recurrence-editor-lazy.tsx, recurrence-preview.tsx, resizable.tsx, scroll-area.tsx.
Media/visual: avatar.tsx, aspect-ratio.tsx, carousel.tsx, chart.tsx, skeleton.tsx, progress.tsx, table.tsx, separator.tsx.
Domain-specific scheduling/privacy: conflict-detector.tsx, conflict-resolver.tsx, conflict-resolver-lazy.tsx, conflict-warning.tsx, connection-setup.tsx, google-calendar-integration.tsx, file-uploader.tsx, file-uploader-lazy.tsx, attachment-list.tsx, event-card.tsx, shared-view.tsx, share-dialog.tsx, simple-privacy-selector.tsx, simplified-privacy-selector.tsx, privacy-level-selector.tsx, permission-editor.tsx, notifications.tsx, geography/time components.
Relationship & contact components: contact-form.tsx, contact-picker.tsx/contact-picker-lazy.tsx, group-form.tsx, group-functionality-selector.tsx, group-invitation-list.tsx, group-invitation-sender.tsx, group-invitation-setup.tsx, group-organization-tool.tsx, invitation-list.tsx, invitation-sender.tsx, relationship-indicator.tsx, relationship-item.tsx.
Monitoring & theming: performance-monitor.tsx, theme-provider.tsx, theme-toggle.tsx, sonner.tsx (toast bridge).
Remaining atoms: badge.tsx, progress.tsx, button.tsx, etc. (all names above appear once; all are shadcn-wrapped components reused across pages).

## Hooks (hooks/)

use-auth-guard.tsx protects client routes using useAuth.
use-realtime-events.ts, use-realtime-relationships.ts, use-realtime-invitations.ts, use-realtime-status.ts subscribe via lib/realtime-manager.ts.
use-email-verification.ts polls verification state.
use-debounce.ts, use-selection.ts utility hooks.
use-security-monitoring.ts ties into security monitors.
use-privacy-settings.ts surfaces privacy preferences.
use-toast.ts wraps Sonner.
use-zod-form.ts integrates React Hook Form with Zod.
use-connection.ts, use-sync-status.ts, use-validation.ts manage network, sync, validation flows.

## Library Modules

Root files: lib/auth-context.tsx, demo-store.ts, database-utils.ts, browser-encryption.ts, encryption.ts, privacy-utils.ts, relationship-colors.ts, navigation-utils.ts, csrf-client.ts, key-rotation.ts, rate-limiting.ts, realtime-manager.ts, caldav-client.ts, utils.ts.
lib/auth/*: api-wrapper.ts, auth-state-consistency.ts, email-verification.ts, enhanced-token-validation.ts, middleware-helpers.ts, password-utils.ts, realtime-auth-manager.ts, route-protection.ts, security-integration-test.ts, server-session-validation.ts, session-manager.ts, session-monitor.ts, session-persistence.ts, session-security.ts, session-validation.ts, unified-auth-context.tsx, use-auth-recovery.ts.
lib/supabase/*: client.ts, server.ts, enhanced-client.ts, enhanced-types.ts, types.ts, token-refresh.ts, realtime.ts, realtime-auth.ts, session-aware-realtime.ts.disabled (placeholder), enhanced-realtime-manager.ts, realtime-debug.ts, data-sync-validator.ts.
Other domains: lib/conflict-detection/enhanced-multi-partner-checker.ts, lib/conflicts/conflict-detection.ts; lib/permissions/permission-service.ts, permission-utils.ts; lib/privacy/boundary-engine.ts, privacy-enforcement.ts; lib/encryption/field-encryption.ts; lib/keys/* (demo-key-management.ts, key-derivation.ts, key-management-service.ts, enhanced-encryption-service.ts, permission-resolution-service.ts, key-error-handler.ts, key-escrow.ts, auth-integration.ts, privacy-key-sharing.ts); lib/notifications/* (context.tsx, notification-provider.tsx, types.ts, generators.ts, share-notifications.ts); lib/monitoring/* (production-monitoring.ts, rate-limit-monitor.ts, security-monitor.ts, email-monitoring.ts); lib/security/* (event-logger.ts, audit-logger.ts, incident-response.ts, alerting-service.ts, oauth-state.ts, monitoring-service.ts, password-breach-check.ts, continuous-validation.ts, env-validator.ts, key-derivation-service.ts, production-config.ts, user-isolation.ts, rls-policies.sql, csrf.ts); lib/resilience/circuit-breaker.ts; lib/rate-limiting/rate-limiter.ts; lib/middleware/api-rate-limiter.ts, rate-limit-middleware.ts; lib/nlp/event-parser.ts; lib/recurrence/recurrence-utils.ts; lib/time-zones/time-zone-context.tsx, time-zone-utils.ts; lib/validation/* (schemas.ts, enhanced-schemas.ts, onboarding-schemas.ts, utils.ts, errors.ts, index.ts); lib/contacts/device-contacts.ts; lib/invitations/invitation-service (within notifications) etc.

## Database Tables & Relationships

Core identity: users, user_profiles, user_preferences, security_audit_log, security_events, key_audit_log, csrf_tokens, oauth_states, backup_metadata; users referenced by almost every table (events, relationships, notifications).
Relationships & groups: relationships (FK to users twice, unique pairs, invitation fields), relationship_groups, relationship_group_members, group_member_permissions, group_invitations, group_invitation_tokens, connection_setups.
Contacts & CRM: contacts, contact_tags, contact_tag_relationships, contact_groups, contact_group_members, contact_activity_log, contact_group_relationships, contact_imports.
Events & privacy: events, event_permissions, event_visibility, event_privacy, event_attendees, calendar_categories, reminders, custom_holidays, availability_cache, availability_windows, conflict_audit_log, conflict_check_metrics.
Sharing & notifications: calendar_shares, share_permissions, share_filters, share_access_logs, share_subscriptions, share_analytics, notification_preferences, scheduled_notifications, (expected) notifications table missing from schema though required by lib/notifications/context.tsx.
Invitations: invitations, invitation_tokens, invitation_notification_preferences.
AI/automation: ai_processing_queue, ai_suggestions.
Integrations: calendar_integrations, calendar_shares (alternate schema), event_attachments.
Error logging: error_logs, system_errors.
Subscription tiers: user_profiles.subscription_tier, limits columns added in 20250907000000_add_subscription_tiers.sql.

## Naming Patterns

Pages live in app/<feature>/page.tsx; dynamic routes follow [id] convention; API endpoints always route.ts.
React components use PascalCase exports even when filenames are lowercase; lazy wrappers suffixed -lazy.tsx.
Hooks start with use-, stored in hooks/.
Library files use kebab-case; TypeScript types live alongside modules (*.ts).
Database schema uses snake_case table/column names; enums suffixed _enum in newer migrations.
Path alias @/* (see tsconfig.json) consolidates imports.

## Dependencies & Connections

Layout providers feed every page; useAuth from lib/auth-context.tsx underpins auth gating, AuthProvider relies on lib/auth/session-manager.ts, lib/security/event-logger.ts, lib/auth/session-security.ts.
Real-time hooks delegate to lib/realtime-manager.ts and Supabase channels; debug panels display metrics from same manager.
API routes depend on domain libs (encryption, permissions, privacy) ensuring privacy-level enforcement matches UI selectors.
Pages like contacts/page.tsx call REST endpoints and Supabase directly (tags/groups) showing mix of API and client usage.
Monitoring/security modules feed components/security/* dashboards and lib/monitoring cron scripts.

## Placeholder / Implementation Gaps

Viewer-specific key derivation in lib/encryption/field-encryption.ts:434-446 remains TODO.
Alert delivery in scripts/monitoring-alerts.js:427-511 is placeholder for email/Slack/Discord/SMS.
Realtime session manager disabled (lib/supabase/session-aware-realtime.ts.disabled) awaiting implementation.
Notifications context expects notifications table (lib/notifications/context.tsx:61-140, lib/notifications/share-notifications.ts:33-109), but schema only defines scheduled_notifications; table must be created or code adjusted.
Extensive Vitest placeholders (e.g. tests/relationships/multi-relationship-scenarios.test.ts:16-146, tests/performance/performance-reliability.test.ts:51-109, tests/scale/email-invitation-system.test.ts:30-128, tests/monitoring/production-monitoring.test.ts:39-188, tests/integrity/data-consistency-recovery.test.ts:26-146, tests/privacy/basic-privacy-boundary.test.ts:100, __tests__/auth/email-verification-flow.test.tsx:289, 367) need real assertions and fixtures.
Realtime auth manager/unit tests flagged in lib/auth/security-integration-test.ts (empty harness) and hooks/use-realtime-* rely on manual setups.
Demo-mode cleanups hard-coded (components/debug/auth-status.tsx, app/clear-demo-mode/page.tsx) but backend toggles absent.

## PolyHarmony Handover

Last updated: 2025-08-07

This document captures the current application state, key architectural choices, recent changes, and guardrails to prevent regressions.

### Overview
- App: Next.js 14 (App Router) + TypeScript + shadcn/ui + Tailwind
- Backend: Optional Supabase. App gracefully falls back to a local demo/offline mode when env vars are missing.
- Data model: Users, Relationships, Relationship Groups, Events, Group Members, aligned with `lib/supabase/types.ts` and `mvp_schema.sql`.

### Recent Key Changes
- Performance
  - Enabled image optimization, compression, SWC minify, and CSS/package optimizations in `next.config.js`.
  - Added development-only `PerformanceMonitor` overlay (toggle: Ctrl+Shift+P).
  - Memoization across critical components and context (`useMemo`, `useCallback`, `React.memo`).
- Auth & Client
  - `lib/auth-context.tsx`: memoized client and handlers, robust demo mode, persisted demo flag.
  - `lib/supabase/client.ts`: single cached client instance + mock client when env vars are missing.
- Demo/Offline Mode
  - `lib/demo-store.ts`: localStorage-backed store with CRUD for relationships, events, groups, and group members.
  - Settings: demo-only quick actions (load/reset data, create sample group with members) and JSON export.
- Features & Pages
  - Dashboard (`app/dashboard/page.tsx`): parallel data fetching + memoization.
  - Relationships: add (`/relationships/add`), edit (`/relationships/[id]/edit`), list (`/relationships` with delete), and detail (`/relationships/[id]`).
  - Events: edit (`/events/[id]/edit`) with full form, validation, and toasts.
  - Static pages: `/privacy`, `/terms`, `/support`, custom `app/not-found.tsx`.
  - Updated landing page footer links.
- Feedback
  - Standardized toasts via `hooks/use-toast.ts` across create/update/delete flows.

### Data Model (web types)
See `lib/supabase/types.ts` for authoritative shapes.
- Relationship: `id, user_id, partner_name, partner_email?, relationship_type, start_date?, color, notes?, privacy_level, created_at, updated_at`
- Event: `id, owner_id, title, description?, start_time, end_time, location?, privacy_level, relationship_id?, visible_to_relationships?, visible_to_groups?, created_at, updated_at`
- RelationshipGroup: `id, user_id, group_name, description?, created_at, updated_at`
- GroupMember: `id, group_id, relationship_id, privacy_level, created_at, updated_at`

### DemoStore API (subset)
`lib/demo-store.ts` provides local CRUD methods used throughout the UI.
- Relationships: `listRelationships(userId)`, `addRelationship(data)`, `updateRelationship(id, changes)`, `getRelationship(id)`, `deleteRelationship(id)`
- Events: `listEvents(userId, {from,to}?)`, `getEvent(id)`, `addEvent(data)`, `updateEvent(id, changes)`, `deleteEvent(id)`
- Groups: `listGroups(userId)`, `getGroup(id)`, `createGroup(data)`, `updateGroup(id, changes)`, `deleteGroup(id)`
- Group Members: `listGroupMembers(groupId)`, `addGroupMember(groupId, relationshipId, privacy)`, `removeGroupMember(memberId)`, `updateGroupMemberPrivacy(memberId, privacy)`

### Demo vs Supabase Behavior
- When `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` is missing/placeholder:
  - A mock client is provided; `auth-context` switches to demo mode and seeds example data on first use.
  - All CRUD operations route to `DemoStore`.
- With valid env vars:
  - Supabase is used. Ensure your database schema matches `mvp_schema.sql`.

### Important Conventions & Guardrails
- Events queried by `owner_id` (not `user_id`). Ensure DB indexes accordingly.
- Relationship badges and labels use `relationship.relationship_type` and `relationship.privacy_level`.
- Do not recreate Supabase client per render; use `createSupabaseClient()` which caches internally.
- Keep memoization on data fetchers and UI primitives to avoid re-render storms.
- Toasts: use `useToast()` or `toast()` from `hooks/use-toast.ts` for uniform UX.
- PerformanceMonitor is dev-only; do not render it conditionally in production.

### Routes Snapshot
- `/` Landing
- `/dashboard`
- `/calendar`
- `/relationships`
  - `/relationships/add`
  - `/relationships/[id]`
  - `/relationships/[id]/edit`
- `/events/[id]`
  - `/events/[id]/edit`
- `/groups`
  - `/groups/[id]`
  - `/groups/[id]/edit`
  - `/groups/[id]/members`
- `/settings`
- `/auth/signin`, `/auth/signup`
- `/privacy`, `/terms`, `/support`

### Build & Scripts
- `npm run dev` — local development
- `npm run build` — production build
- `npm run start` — start server
- `npm run type-check` — TypeScript
- `npm run analyze` — bundle analysis (`ANALYZE=true next build`)

### Schema Alignment
- Primary reference: `mvp_schema.sql` (events use `owner_id`; relationships include `relationship_type`, `color`, `privacy_level`).
- Ensure indexes on common filters: `relationships.user_id`, `events.owner_id`, `events.start_time`.

### Extending Safely
- When introducing new privacy levels or relationship types, update:
  - DB enum(s) + `mvp_schema.sql`
  - `lib/supabase/types.ts`
  - Any UI mappings (badges, labels)
- For new CRUD flows, implement demo-mode parity in `DemoStore` before wiring Supabase.
- Keep server/client boundaries: don’t access `window/localStorage` in Server Components.

### Known Gaps / Next Steps
- RLS policies and production-grade auth flows.
- Tests (unit/integration) and CI.
- Calendar page still uses baseline UI; consider virtualized lists for dense days.

### Troubleshooting
- App starts in demo mode unexpectedly: check `.env.local` values; placeholders trigger demo.
- Missing data after refresh in demo: ensure localStorage not blocked; use Settings → Load Sample Data.
- Bundle size regressions: run `npm run analyze` and check large deps or un-treeshaken imports.

— End of Handover

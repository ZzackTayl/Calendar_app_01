# PolyHarmony Setup Guide (Web + Demo Mode)

This guide reflects the current project state with a robust demo/offline mode and optional Supabase backend.

## Quick Start (Web)

```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

If `.env.local` is missing or contains placeholder values, the app runs in demo mode automatically.

## Environment Variables (Optional for Supabase)

Create `.env.local` in project root to enable Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

If either value is absent/placeholder, a mock Supabase client is used and demo mode is enabled.

## Demo/Offline Mode
- Local persistence via `localStorage` managed by `lib/demo-store.ts`.
- Seed/reset from Settings → Data & Privacy.
- Demo quick action: Create Sample Group with first two relationships and navigate to members page.
- JSON data export available from Settings (demo and real backends use different code paths).

## Supabase Setup (Optional)
1. Create a Supabase project
2. Apply the schema from `mvp_schema.sql`
   - Ensure events use `owner_id` (not `user_id`)
   - Relationships include `relationship_type`, `color`, `privacy_level`
3. Set `.env.local` with your project URL and anon key

Recommended indexes:
- `relationships(user_id)`
- `events(owner_id, start_time)`

## Performance Configuration
- `next.config.js`: images optimization, compression, SWC minify, CSS/package optimizations; optional bundle analyzer (`npm run analyze`).
- Dev overlay: `components/ui/performance-monitor.tsx` (toggle with Ctrl+Shift+P).
- Component memoization and combined queries in critical paths (e.g., dashboard).

## Key Files
- `lib/auth-context.tsx`: memoized auth context, demo enable/restore, helpers under `demo`.
- `lib/supabase/client.ts`: cached client, mock fallback in demo.
- `lib/demo-store.ts`: relationships, events, groups, group members CRUD.
- `hooks/use-toast.ts`: shared toast utilities.

## Scripts
- `npm run dev`, `npm run build`, `npm run start`
- `npm run type-check`
- `npm run analyze` (set `ANALYZE=true`)

## Notes for Contributors
- Maintain demo-mode parity for new CRUD: add `DemoStore` methods and wire UI to both code paths.
- When changing schema, update both `mvp_schema.sql` and `lib/supabase/types.ts` and adjust affected queries.
- Preserve memoization and the single-instance Supabase client pattern.

## Mobile (PolyHarmony directory)
Mobile code exists but is not the current focus of this setup guide. See `PolyHarmony/` and prior docs for details.
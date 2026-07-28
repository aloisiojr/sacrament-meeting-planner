# Sacrament Meeting Planner — project guide for Claude

LDS ward sacrament-meeting planning app. Expo / React Native (iOS, Android, web via
react-native-web), expo-router, Supabase backend. Bundle id `com.sacramentmeetingmanager.app`.

## How we build changes (dev-flow)

Every change goes through the loop **spec-first → plan-change → build-change → verify-change**,
with human gates at spec, plan, and merge/deploy. Engine docs: `~/.claude/dev-flow/README.md`.
Per-change docs live in `specs/<slug>.md` (+ `.plan.md`); running state in `PROGRESS.md`.
For any change touching the DB schema, Supabase API, persisted local data, or app-version
compatibility, consult **mobile-release-advisor** before locking the spec.

## Commands

- Tests (one-shot): `npm run test:run` · watch: `npm test` · single file: `npx vitest run <path>`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Dev server: `npm start` (or `npm run ios` / `npm run android`)

Baseline (2026-07-27, main): 67 test files, 1832 tests green.

## Directory map & placement rules

Put new code in its canonical home — do not scatter:

- `src/app/` — screens/routes (expo-router). Groups: `(auth)/`, `(tabs)/`, `(tabs)/settings/`.
- `src/components/` — shared UI components. Icons in `src/components/icons/`.
- `src/hooks/` — data-fetching & stateful hooks (React Query). Name `useX.ts`.
- `src/lib/` — pure logic & utilities (theme, permissions, supabase client, date/csv/whatsapp…).
- `src/contexts/` — React contexts (Auth, OnlineStatus, Theme).
- `src/providers/` — cross-cutting providers (SyncProvider).
- `src/types/` — TypeScript types. `database.ts` is the single source of DB types (Role, Permission).
- `src/i18n/locales/` — translation strings (`pt-BR`, `en-US`, `es-LA`).
- `src/__tests__/` — tests (`*.test.ts[x]`); integration in `src/__tests__/integration/`.
- `supabase/migrations/` — SQL migrations (sequential `NNN_*`). `supabase/functions/` — edge functions.
- `docs/public/` — LIVE GitHub-Pages site (privacy/support/…). Do not break. `docs/SUPABASE_*.md` — reference.

Path alias: `@/*` → `src/*`.

## Check before you create

Before adding any component, hook, or util, SEARCH for an existing one and extend it. Prefer
existing primitives in `src/lib/` and `src/components/`. Don't duplicate logic — factor shared
logic into `src/lib/`.

## Conventions

- **i18n:** 3 locales only (pt-BR, en-US, es-LA). Every user-facing string goes through i18n; add
  the key to all three locale files. `SUPPORTED_LANGUAGES` in `src/i18n/index.ts`.
- **Permissions:** `src/lib/permissions.ts` — `PERMISSIONS_MAP: Record<Role, ReadonlySet<Permission>>`.
  Permission strings are `domain:action` (e.g. `speech:assign`). Gate actions by permission, not role.
- **Offline-first:** React Query + AsyncStorage persistence, `OnlineStatusContext`, offline queue
  (`src/lib/offlineQueue.ts`, `offlineGuard.ts`, `sync.ts`, `SyncProvider`), realtime via
  `useRealtimeSync`. Mutations must survive offline; a schema change must version the local cache
  (see mobile-release-advisor).
- **Types:** import DB types from `src/types/database.ts`; don't redeclare.
- **Tests:** behavioral only — test what code does, never read source with fs/string-matching.
  All React hooks must run before any early return (vitest won't catch this — watch for it).

## Domain glossary

- **Sunday / meeting** with a *sunday type* (regular, fast & testimony, …).
- **Speech / speaker** with topic and assignment status; **prayers** (opening/closing);
  **hymns** (incl. intermediate); **actors** (people in roles); **agenda**; **members** (importable);
  **invitations** / user management; **presentation mode**; activity log/history; WhatsApp
  messaging; push notifications.

## Deploy notes

- Supabase migrations in `supabase/migrations/` (35 on baseline). Edge functions in
  `supabase/functions/` deploy via Supabase CLI. Secrets live in `.claude/settings.local.json`
  (gitignored) — never commit them.
- EAS builds are controlled by the user externally — do not track or trigger them.

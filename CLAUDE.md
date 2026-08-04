# Sacrament Meeting Planner — project guide for Claude

LDS ward sacrament-meeting planning app. Expo / React Native (iOS, Android, web via
react-native-web), expo-router, Supabase backend. Bundle id `com.sacramentmeetingmanager.app`.

## How we build changes (dev-flow)

Every change goes through the loop **spec-first → plan-change → build-change → verify-change**,
with human gates at spec, plan, and merge/deploy. Engine docs: `~/.claude/dev-flow/README.md`.
Per-change docs live in `specs/<slug>.md` (+ `.plan.md`); running state in `PROGRESS.md`.
For any change touching the DB schema, Supabase API, persisted local data, or app-version
compatibility, consult **mobile-release-advisor** before locking the spec.

## Skills & code quality

Quality/review layer = built-in first-party skills: `/simplify` (reuse/quality), `review`
(code review), `security-review`. Do NOT install external skills without vetting the `SKILL.md`
first (security). Prefer built-ins or a reviewed project-local skill over anything copied.

## Commands

- Tests (one-shot): `npx jest --ci` · single project: `npx jest --selectProjects ios` · single file: `npx jest --testPathPattern <name>`
- Typecheck: `npx tsc --noEmit`
- Lint: `npm run lint`
- Dev server: `npm start` (or `npm run ios` / `npm run android`)

Baseline (2026-08-03, chore/test-strategy-jest-expo): 276 suites, 4940 tests green
(2470 per platform × 2 projects). Runner is jest-expo; vitest was removed.

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
  All React hooks must run before any early return (the test runner won't catch this — watch for it).
  Never assert on source text (`readFileSync` + `toContain`): it cannot tell a working screen from a
  broken one and breaks on renames. Where a rule is written in two places (client permission map vs
  server check, a duplicated helper), assert that the two AGREE — that is what finds real defects.

## Domain glossary

- **Sunday / meeting** with a *sunday type* (regular, fast & testimony, …).
- **Speech / speaker** with topic and assignment status; **prayers** (opening/closing);
  **hymns** (incl. intermediate); **actors** (people in roles); **agenda**; **members** (importable);
  **invitations** / user management; **presentation mode**; activity log/history; WhatsApp
  messaging; push notifications.

## Release & versioning — READ BEFORE TOUCHING MIGRATIONS

Shipped versions, as of 2026-08-03:

| Version | State | Why it matters |
|---------|-------|----------------|
| **1.0.0** | live in the stores | **has no version gate** |
| **1.1.0** | in store review | introduces the version gate (`useVersionGate`, `app-config` edge function, `app_config.min_supported_version`) |
| **2.0.0** | in development | needs migrations that **break 1.x.x clients** |

**The cutover order is not negotiable — the gate goes live BEFORE the breaking migrations:**

1. 1.1.0 reaches users, so clients have a gate at all.
2. 2.0.0 ships to the stores.
3. Raise `app_config.min_supported_version` to `2.0.0` → gated clients hard-block and force update.
4. **Only then** apply the 2.0-breaking migrations.

Applying a breaking migration before step 3 breaks every client in the field with no message.
Migrations carrying a "Apply at the v2 cutover" annotation (e.g. `043_drop_collection_config.sql`)
belong to step 4 and must not be applied early.

Known consequence: **users still on 1.0.0 have no gate and cannot be told to update** — at cutover
they simply break. The size of that tail is a release risk worth measuring before step 4.

**No further 1.x releases are planned**, so v2 code does not carry backward compatibility with
1.x clients. Two things that look similar are NOT the same and must be treated differently:

- **Client-version compatibility** (shims for older app builds) — remove it.
- **Data compatibility** (rows already in the database that survive the cutover) — KEEP it.
  Production data is not being wiped. `lib/activityLog`'s `can_preside`/`can_conduct` mapping and
  the legacy own-phone fallback in `InviteManagementSection` are data compat and must stay, or
  historical rows render wrong.

`SundayCard`'s "legacy behavior" around `managePrayers` is neither — it is live behaviour for wards
with that setting off.

**Development runs against STAGING** (`nfraidzguordqmbpqkcf`); production (`poizgglzdjqwrhsnhkke`)
is untouched until the cutover. Staging has all migrations applied, so it is the authoritative
answer to "does this table/policy exist" — check the database, not the migration files.

**UX-2.0 is discarded permanently and will never be merged into `main`.** The branch `UX-2.0` and
the tag `archive/UX-2.0-2026-06-07` are archive only.

## Deploy notes

- Supabase migrations in `supabase/migrations/` (46 in repo). **The applied set is not tracked
  here — verify against the database before assuming.** Edge functions in `supabase/functions/`
  deploy via Supabase CLI. Secrets live in `.claude/settings.local.json` (gitignored) — never
  commit them.
- EAS builds are controlled by the user externally — do not track or trigger them.

### Build profiles

| Profile | Identity | Database | Distribution |
|---------|----------|----------|--------------|
| `development` | staging | staging | dev client |
| `staging` | staging | staging | internal (ad-hoc) |
| `appetize` | staging | staging | simulator / apk |
| `testflight-staging` | staging | staging | store → TestFlight |
| `production` | **production** | **production** | store |

There is deliberately no `testflight-production`: every App Store release passes through TestFlight
first, so `production` already serves both roles. What turns a TestFlight build into a release is
attaching it to a version and submitting for review in App Store Connect — a separate action, not a
build profile. Two profiles emitting the same artefact would only raise "which one did I use?".

**Do not build `production` before the v2 cutover.** It would upload a 2.0.0 build that expects the
v2 migrations to an App Store Connect record whose internal testers receive every build
automatically — against a production database that does not have those migrations yet. Use
`testflight-staging` until step 3 of the cutover is done.

### Staging builds have their OWN bundle identifier

`app.config.js` turns `APP_VARIANT=staging` (set in the development/staging/testflight/appetize
profiles) into `com.sacramentmeetingmanager.app.staging`, the app name `SMP Staging` and a distinct URL
scheme. Production is untouched. Do not remove this: without it a staging build installs OVER the
real App Store app.

**Internal TestFlight groups receive EVERY build automatically.** There is no per-group gating —
`groups` in `eas.json` only fails (`Cannot add internal group to a build`), builds cannot be
removed from a group, and the only retraction is expiring the build. This is why the identity must
be separated at the bundle level rather than managed in App Store Connect. Learned the hard way on
2026-08-04, when a staging build reached every internal tester.

Android is deliberately NOT varied: `google-services.json` declares only the production package,
so changing it would fail the build. See the note in `app.config.js`.

# v1.x — Version gate, push app-version targeting, WhatsApp phone fix

## Problem / intent
Prerequisite release that must ship to production and be adopted **before** v2.0 (see
`docs/decisions/001-v2-release-cutover.md`). It gives the app the ability to (1) **force** clients
below a minimum version to update — so v2.0 can force everyone off v1 at cutover; (2) record the
app version on push tokens to send **targeted "please update" nudges**; (3) fix a latent WhatsApp
phone bug that affects current users. **Backward-compatible / additive only — no breaking change**,
safe to ship on top of live v1.0.

## In scope / Out of scope
- **In:** app-config **edge function** + version gate; `app_version`/`platform` on push tokens;
  scheduled "update" nudge; WhatsApp `country_code` phone fix.
- **Out:** the v2 member model; any destructive/breaking schema change; the actual EAS build & store
  submission (user-controlled — CLAUDE.md).

## Design
### Version gate (edge function)
- New edge function **`app-config`** returns `{ min_supported_version, latest_version, nudge_interval_days }`,
  reading them from a tiny **`app_config`** table (single row) so values change **without a redeploy**.
- On launch the app calls `app-config`; if `Constants.expoConfig.version` (semver) `< min_supported_version`
  → show a **blocking "please update"** screen (store links, localized). Otherwise proceed.
- **Fail-open:** if the call fails or the device is offline, DO NOT block (offline-first must keep
  working). A `src/lib/semver.ts` compare util handles the comparison.

### Push app-version targeting
- Add `app_version TEXT NULL` + `platform TEXT NULL` to `device_push_tokens`; populate on token
  upsert (`useNotifications.ts`) from `Constants.expoConfig?.version` and `Platform.OS`. Old clients
  leave them NULL (safe).

### Nudge cron (build now)
- A scheduled edge function (Supabase cron) selects users whose latest token `app_version <
  min_supported_version` (compare in the function via the semver util) and sends an Expo push
  "please update" (localized). Cadence = `nudge_interval_days` from `app_config`; dedupe via a
  `last_update_nudge_at` column on `device_push_tokens` (or a small table) so nobody is nudged more
  than once per interval. Tokens with NULL `app_version` (pre-gate v1.0) are treated as below-min
  and nudged too (broadcast-ish) — the only signal we have for them.

### WhatsApp phone fix (bug)
- Root cause: `speaker_phone` snapshots `member.phone` **without** `country_code`, while the send
  passes `countryCode=''` → malformed wa.me links. Fix by centralizing a `buildFullPhone(country_code, phone)`
  helper and snapshotting/sending the full international number; be tolerant of legacy snapshots that
  already include (or omit) a leading `+`. Fix at `speeches.tsx`, `NextAssignmentsSection.tsx`,
  `useSpeeches.ts`, and the send in `InviteManagementSection.tsx`.

## Data model (additive, safe for live v1.0)
- New `app_config` (single row): `min_supported_version TEXT, latest_version TEXT,
  nudge_interval_days INT`, ward-agnostic (global). RLS: readable by authenticated; writable by
  service role only.
- `device_push_tokens`: ADD `app_version TEXT`, `platform TEXT`, `last_update_nudge_at TIMESTAMPTZ`.
- Migration number: **036** (v1.x ships first; v2's member migration renumbers to **037**).

## Acceptance criteria (EARS)
- AC1: WHEN the app launches AND `version < min_supported_version`, it SHALL show a blocking update
  screen with store links; ELSE it proceeds. IF the config call fails/offline, it SHALL NOT block.
- AC2: `device_push_tokens` SHALL carry `app_version`+`platform`, populated on token upsert.
- AC3: The scheduled nudge SHALL push "please update" only to users below min version, at most once
  per `nudge_interval_days`.
- AC4: WhatsApp links/snapshots SHALL use the full international phone; a behavioral test SHALL cover
  the phone build for numbers with and without a leading `+`.
- AC5: All DB changes SHALL be additive (NULLable, no drop/rename) — safe for existing v1.0 clients.
- AC6: `min_supported_version`/`latest_version`/`nudge_interval_days` SHALL be editable in
  `app_config` without a redeploy; the edge function reads them.
- AC7: New user-facing strings SHALL exist in pt-BR/en-US/es-LA.

## Release / ops
- Branch: **`v1.x` off `main`** (ships to production before v2). Bump `app.json` version (e.g.
  `1.1.0`). EAS build + store submission are done by the user.
- Cutover role: once v1.x is adopted, raising `app_config.min_supported_version` to the v2 build
  activates the hard gate (per ADR 001).
- Deploy: `supabase functions deploy app-config` + the nudge function + migration 036 + set the
  Supabase cron schedule.

## Verification
- Vitest for `semver.ts` and the phone helper (behavioral). Edge functions verified by live
  invocation on staging (Deno, not vitest). Gate screen render-tested via the stub-alias infra.

## Open questions
- Store URLs (App Store + Play) for the update screen — provide the two links.
- Initial values: `min_supported_version` (start at `1.0.0` so nobody is blocked yet),
  `latest_version` (= v1.x, e.g. `1.1.0`), `nudge_interval_days` (default 7?). Confirm at gate.

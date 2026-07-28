# Plan: v1.x — version gate + push targeting + WhatsApp phone fix
(spec: specs/v1x-version-gate.md)

## Branch / setup (build step 0)
- Create **`v1.x` from `main`** (not from v2.0). Bring `specs/v1x-version-gate.md` (+ this plan) and
  the ADR into that branch. Bump `app.json` version → `1.1.0`.

## Reuse (extend, don't recreate)
- `Constants.expoConfig?.version` (already used as cache buster in `src/app/_layout.tsx:134`).
- `useNotifications.ts` token upsert (`:83-94`) — add app_version/platform there.
- `process-notifications` edge function patterns (Expo push send) for the nudge function.
- `whatsappUtils.buildWhatsAppUrl` + `countryCodes.splitPhoneNumber` for the phone helper.

## Steps (1 step = 1 commit)
1. **Migration 036 (additive):** create `app_config` (single seeded row: min_supported_version
   `1.0.0`, latest_version `1.1.0`, nudge_interval_days `7`) with RLS (auth read / service write);
   add `app_version TEXT`, `platform TEXT`, `last_update_nudge_at TIMESTAMPTZ` to
   `device_push_tokens`. — AC5, AC6.
2. **`src/lib/semver.ts`** compare util + vitest tests (`<`, `=`, `>`, malformed input). — supports AC1.
3. **Edge function `app-config`**: reads `app_config`, returns `{min_supported_version,
   latest_version, nudge_interval_days}`. — AC6. (verified live)
4. **Launch gate:** on startup (root layout/provider) call `app-config`; if
   `version < min_supported_version` render a blocking `UpdateRequiredScreen` (store links, i18n);
   fail-open on error/offline. — AC1. + render test via stub-alias infra.
5. **Push token version:** populate `app_version`/`platform` in the `useNotifications` upsert. — AC2.
6. **Nudge cron edge function:** scheduled; selects users whose latest token `app_version <
   min_supported_version` (NULL treated as below), sends localized "please update" push, dedupes by
   `last_update_nudge_at` ≥ `nudge_interval_days`. — AC3. (verified live)
7. **WhatsApp phone fix:** add `buildFullPhone(country_code, phone)` in `src/lib` (tolerant of
   legacy `+`/missing); fix snapshot/send at `speeches.tsx`, `NextAssignmentsSection.tsx`,
   `useSpeeches.ts`, `InviteManagementSection.tsx`; behavioral test (with/without `+`). — AC4.
8. **i18n:** update-screen + nudge strings in pt-BR/en-US/es-LA. — AC7. (may fold into steps 4/6)

## AC → coverage
| AC | Steps | Test |
|----|-------|------|
| AC1 | 3,4 | render test (gate shows/hides; fail-open) |
| AC2 | 1,5 | (manual/live; token upsert) |
| AC3 | 1,6 | live invoke on staging |
| AC4 | 7 | vitest (buildFullPhone) |
| AC5 | 1 | additive migration review |
| AC6 | 1,3 | live invoke returns seeded values |
| AC7 | 8 | i18n keys present in 3 locales |

## Risks / deploys
- Deploy: `supabase functions deploy app-config` + nudge function; migration 036; set Supabase cron
  for the nudge; set the two **store URLs** (needed for step 4 — user to provide).
- Edge functions are Deno (not vitest) → verified by live invocation on staging.
- **EAS build + store submission = user** (CLAUDE.md).
- Additive-only migration → safe for live v1.0 clients (AC5).

## Rollback
- `git revert` the client commits; edge functions redeploy previous; migration is additive
  (columns/table can be dropped if needed). No destructive change.

## Needed from user before build
- App Store + Play Store URLs for the update screen.

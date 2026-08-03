# Release-Readiness Audit — v2.0 (2026-07-30)

> ## Decisions & scope (locked 2026-07-30)
> - **P0-1 (authz):** ✅ code done — migration `044` (`0a908ec`; self-contained `public.can_write()` +
>   `public.current_ward_id()`, moved out of the `auth` schema) + **ADR-005**. **STAGING ONLY** (user
>   decision); user applies via `supabase db push` (sandbox guardrail blocks the Management-API path). Then
>   Phase-B verify (observer can't write). Possible follow-up: move SELECT policies off `auth.ward_id()` too.
> - **P0-2 (offline writes):** ✅ DONE via **option C** (`3933940`) — finished the gating; app is
>   online-writes / offline-reads. (Not the heavy React-Query-persistence route — over-engineered given the gating.)
> - **P0-3 (DebouncedTextInput):** ✅ DONE (`8d0fac9`).
> - **All P1 (#1–#7): ✅ DONE** (code-only, no backend) via the change→verify loop:
>   1. CSV header validation (`56f179c`); 2. invite error paths / `extractInviteError` (`cbbbb8d`);
>   3. Next-Assignments pos-2 skip (`be41fb0`); 4. observer Users-screen self-service fallback (committed);
>   5. offline-prefetch guard (`1bdb01f`); 6. gate-by-permission sweep (`6d2d504`);
>   7. save-failure feedback + WhatsApp-invite honesty + reset-password escape (committed).
>   NOTE on #7: the audit's "duplicate-phone UNIQUE" premise was stale — that constraint was dropped in
>   migration `012` and never re-added; implemented the broader defensive save-error feedback instead.
> - **Cheap P2s: ✅ DONE** (code-only, each committed with tests) — CSV formula-injection guard +
>   multi-line round-trip; distinct weekly_confirmation text; multi-line WhatsApp templates; realtime
>   TIMED_OUT fallback; push-token re-register on ward switch; queryClient.clear() on sign-out; null
>   list-users guard; last-bishopric error mapping; activity-log debounce cleanup; designation save
>   permission gate; StatusLED reduce-motion at mount; race-safe lazy-create (agenda/speeches) +
>   changeStatus concurrency guard.
>   - STALE (not bugs, noted): duplicate-phone import abort (phone UNIQUE dropped in migration 012);
>     timezone picker "not reset on close" (it's a route — state resets on unmount).
>   - **DEFERRED — needs its own spec:** locale timezone off-by-one. Making "today"/next-Sunday
>     timezone-aware means threading the ward tz through ~10 `new Date()` sites AND verifying Intl
>     timezone support under Hermes (unreliable without a polyfill). Too risky for a batch fix.
> - **P2 feature gaps: ✅ DONE (A–D)** — A: Sunday-type auto-assignment wired (useAutoAssignMissing
>   SundayTypes on the Meetings tab); B: edit ward+stake name (Settings → Ward & Stake, RLS already in
>   044); C: invite auto-revoke (lazy sweep in create-invitation + migration 045 pg_cron sweep; 30-day
>   timeout already worked); D: notification master opt-out (migration 046 + Settings → Notifications).
> - **PENDING DEPLOY (staging, user runs `supabase db push` + edge redeploys):** migration 044 (P0-1,
>   still), 045 (invite auto-revoke) + redeploy create-invitation, 046 (push opt-out) + redeploy
>   process-notifications.
>   ⚠️ **DEPLOY ORDER for D:** apply migration 046 BEFORE redeploying process-notifications — the new
>   function filters `.eq('notifications_enabled', true)`; deploying it against a missing column would
>   cause a total notification outage.
> - **Adversarial verify-change pass (6 blackbox verifiers, 2026-07-30): 5 APPROVED, 1 CHANGES REQUIRED.**
>   Fixed: CSV bare-CR regression (P1 — unquoted `\r` split a field into 2 rows on destructive import);
>   `revoke_expired_invitations()` REVOKE EXECUTE from public (P2 security — was an RPC-exposed cross-ward
>   delete); added the observer-denied designation-save negative test. Suite now **2019 green**.
>   Accepted-as-noted (not bugs): per-device opt-out resets on a NEW device (master opt-out MVP tradeoff);
>   `useChangeStatus` shows a "concurrent" message on an RLS-denied 0-row update (gated upstream);
>   last-bishopric copy reads as a warning; edge-function/migration logic is staging-only verifiable.
> - **P2 feature gaps — user decisions:**
>   1. **Sunday-type auto-assignment → MUST work.** Wire `getAutoAssignedType`/`useAutoAssignSundayTypes`
>      (1st-Sunday testimony + Apr/Oct general conference auto-detected). Not delete.
>   2. **Edit ward name → YES, and must also edit STAKE name** (both Ward + Stake editable post-registration).
>   3. **Invite management UI → NOT needed.** Instead: **30-day invitation timeout + automatic revoke** of
>      expired pending invites.
>   4. **Notification settings UI → YES (desirable).** At least a master opt-out.
> - **Audit report:** keep as a working doc; **do not commit** (per user).


Synthesis of 7 parallel read-only audits (dead code, bugs, code excellence, use-case/happy-path,
edge-cases, test coverage, UI consistency) + independent verification of the security findings
against the SQL. Branch `v2.0`.

## Build health (green)
- 101 source files (30 components, 17 hooks, 24 lib, 23 route screens); 102 test files / **1969 tests pass**.
- `tsc --noEmit`: **clean**. Repo-wide ESLint: **0 errors**, 2 cosmetic warnings (`import/first` in 2 test files).
- i18n: **perfect key parity** — 487 keys × pt-BR/en-US/es-LA, no drift, no referenced-but-missing keys.
- **Verified clean:** no React-hooks-after-early-return anywhere; PERMISSIONS_MAP correct; no schema drift
  in synced tables; gesture/Platform-web/date-DST math correct; transactional CSV import; version gate
  fail-open; presentation-mode null-safety; realtime lifecycle.

The code *quality* is good. The release risk is concentrated in **authorization** and **offline/destructive
data paths** — things tests don't exercise.

---

## P0 — release blockers

### P0-1. Server-side authorization is missing on writes (SECURITY) — VERIFIED against SQL
Two vectors, both confirmed by reading the migrations:
- **RLS write policies gate on ward only, not role** (`supabase/migrations/002_rls_policies.sql:41-205,227-277`).
  Every INSERT/UPDATE/DELETE policy checks only `ward_id = auth.ward_id()`. An authenticated **observer**
  (or any modified client) can create/edit/delete members, speeches, agendas, topics, actors,
  sunday_exceptions, invitations, activity_log directly. The app's role/permission gating is **client-side only**.
- **`import_members` cross-ward wipe** (`supabase/migrations/038_import_members_full.sql:15-32`). It is
  `SECURITY DEFINER`, takes a caller-supplied `target_ward_id`, and runs `DELETE FROM members WHERE
  ward_id = target_ward_id` with **no check that `target_ward_id = auth.ward_id()` and no role check**.
  Any authenticated user can wipe + replace **any** ward's member list.

**Impact:** privilege escalation within a ward + destructive cross-ward data loss.
**Fix:** add role/permission enforcement to RLS write policies (e.g. a `auth.has_write()` helper reading
`app_metadata.role`), and make `import_members` reject `target_ward_id <> auth.ward_id()` + require a
write role. **Requires a DB migration.**
**⚠️ Release-advisor gate:** the LIVE v1.x app shares this Supabase. Tightening write RLS can break v1
clients if they write under roles the new policy would reject. **Consult mobile-release-advisor before
implementing** (min-version, expand→contract, whether to harden prod now vs at cutover). Do NOT ship this
blind.

### P0-2. Offline writes are silently lost (contradicts offline-first) — VERIFIED (3 audits agree)
The custom offline queue/guard is **dead code** — `offlineQueue.enqueue()` has zero callers
(`src/lib/offlineQueue.ts:53`), `offlineGuard` unused. Real behavior = React Query pausing mutations
(default `networkMode:'online'`) and resuming **only within the same session**; `PersistQueryClientProvider`
does not persist paused mutations and has no `resumePausedMutations`/`setMutationDefaults`
(`src/app/_layout.tsx:143-150`). So an offline edit is **lost if the app is killed before reconnect**, and
the ~3s offline-debounce window (`src/hooks/useConnection.ts:58-68`) drops writes too — all with **no UI
feedback** (no optimistic update). Field app in chapels/poor signal.
**Fix (larger):** either wire the existing queue (enqueue on mutation + drain via `useOfflineQueueProcessor`)
or adopt RQ mutation persistence (`setMutationDefaults` + `persistQueryClient` mutation dehydrate +
`resumePausedMutations`) + optimistic UI. **Design decision needed** (scope/architecture).

### P0-3. `DebouncedTextInput` silently reverts newer values (concurrent/realtime data loss)
`src/components/DebouncedTextInput.tsx:39-43` — the external-value sync effect updates `localValue` and
`savedValueRef` but not `latestValueRef`. If a newer server/realtime value (B) arrives while the field is
shown-but-unfocused (was A), on blur/unmount `latestValueRef("A") !== value("B")` → `onSave("A")` fires and
reverts B. Powers every AgendaForm free-text field (announcements, baby-blessing names, musical number).
**Fix (small):** set `latestValueRef.current = value` inside the sync effect. *(Verify at fix time.)*

---

## P1 — fix before release

- **Destructive CSV import validated by column-count only** (`src/lib/csvUtils.ts:145-152`). Header is
  accepted if it has ≥10 columns; cells read positionally; import is DELETE-ALL+INSERT. Re-importing any
  unrelated ≥10-col spreadsheet silently replaces the roster with mismapped data. Fix: validate header
  names against `CSV_DEFAULT_HEADERS` (accept the app's own export header). Pairs with P0-1 import fix.
- **Invited-user onboarding — all error paths dead** (`src/app/(auth)/invite/[token].tsx:59,106`). Reads
  only `response.data`; supabase-js returns `{data:null,error}` on non-2xx, so expired/used/invalid-token
  messages are unreachable and a server error on "Create Account" does nothing (no session, no nav). Fix:
  parse `response.error.context.json()` like `register.tsx:103` already does.
- **"Next Assignments" home widget permanently hidden** when `has_second_speech=false`
  (`src/lib/speechUtils.ts:12` `areNext3FullyAssigned` hard-requires slot 2). A whole home feature
  disappears for those wards. Fix: honor `has_second_speech`.
- **Observer locked out of the Users screen** (`list-users` 403 for observers, but the screen renders
  observer self-service; entry gated by `isOnline` not `settings:users`). Fix: permission-gate the entry
  and/or return self.
- **Offline prefetch never runs on cold start** (`src/hooks/useOfflinePrefetch.ts:48-54` writes
  `prevOnlineRef` before the `!wardId` bail). Next-3-Sundays offline warmup only runs after a live
  offline→online flip → offline cache empty for unvisited screens.
- **Last-write-wins clobbers newer server data / silent lost UPDATE on deleted rows**
  (`src/hooks/useSpeeches.ts:339-344`) — no version guard; `.eq('id')` on a deleted row updates 0 rows, no error.
- **Transient Expo push failure marks entries `sent`** (`supabase/functions/process-notifications/index.ts:420-425`)
  → permanent silent non-delivery on an Expo outage.
- **Gate-by-permission sweep (client)** — role checks instead of `hasPermission`: `SpeechSlot.tsx:102-103,188`,
  `settings/index.tsx:60`, `settings/users.tsx:296`, `useNotifications.ts:42`. Defense-in-depth after P0-1,
  but a convention/correctness fix. (Counter-example done right: `AgendaForm.tsx:80`.)
- **Manual duplicate-phone add fails silently** (`useCreateMember` has no `onError`; `PersonEditor.tsx:261-265`)
  — spouses share a phone (UNIQUE), save no-ops, modal stays open, no feedback.
- **Deleting a "responsible" member silently breaks delegated contact** (no warning; FK SET NULL) —
  `contact.ts:35-45`. `checkFutureSpeeches` guard exists but is never called.
- **reset-password dead-end** (`src/app/(auth)/reset-password.tsx:114-126`) — no token & no recovery
  session → infinite spinner, no error, no escape.
- **WhatsApp marks speaker "invited" even when WhatsApp isn't installed / fails to open**
  (`InviteManagementSection.tsx:195-199`) — status flips with no message sent.

---

## P2 — should fix (grouped)

**Data/CSV:** CSV formula injection on export (leading `= + - @` not neutralized, `csvUtils.ts:361-366`);
CSV newline round-trip breaks re-import (`csvUtils.ts:143`); duplicate CSV phones abort with a generic error.
**Concurrency:** lazy-create agenda/speeches is check-then-insert not upsert → UNIQUE violation on two
devices (`useAgenda.ts:100-116`, `useSpeeches.ts:206-234`; docstring falsely says ON CONFLICT);
`useChangeStatus` reads-then-writes with no DB guard (`useSpeeches.ts:326-347`).
**Notifications/WhatsApp:** `weekly_confirmation` text is byte-identical to `weekly_assignment`
(`notificationUtils.ts:89-92…`); realtime `TIMED_OUT` status not handled → stale on flaky links
(`useRealtimeSync.ts:109-122`); push token not re-registered after in-session ward switch
(`useNotifications.ts:42,104`); template `\s{2,}→' '` flattens multi-line templates (`whatsappUtils.ts:171`).
**Auth/session:** self-delete & server-revoked sign-out don't `queryClient.clear()` → prior user's cached
data on same-ward re-login; `list-users` `result.users` on null body → TypeError instead of empty
(`users.tsx:96`); `update-user-role` reads a field the fn never returns + unmapped `cannot_demote_last_bishopric`.
**Leaks/robustness:** `useActivityLogSearch` debounce has no unmount cleanup (`useActivityLog.ts:89-105`);
member→speeches snapshot cascade swallows errors (`useMembers.ts:192-208`); StatusLED reduce-motion not
honored at mount; timezone picker search not reset on close.
**Permission (defense-in-depth):** `designations/[date].tsx:109-141` save has no permission gate
(observer deep-link can save; only RLS — which is the P0 — would stop it).
**Feature gaps to confirm intent:** Sunday-type auto-assignment is complete but **never called**
(`useSundayTypes.ts:56,115`); **edit-ward-name** unimplemented; **invite management** (list/resend/revoke)
absent; **notification settings UI** absent.
**Locale:** ward `timezone` stored but unused in date/"today"/Sunday computation → off-by-one near midnight
for travelers (`dateUtils.ts:45-48,215`).

---

## Nice-to-have (for your review — not blockers)

**Cleanup (low effort, high tidiness) — ~700 lines removable:**
- Delete dead files: `src/components/HymnSelector.tsx` (242), `src/components/SwipeableCard.tsx` (222) +
  now-dead `TrashIcon`/`MicIcon`. (Confirmed by ts-prune + knip + import-graph.)
- Remove ~20 unused exports (list in dead-code audit) and 76 unused i18n keys (×3 locales).
- Drop unused `expo-splash-screen`? (declarative in app.json — verify); add `expo-constants` to
  package.json (used but undeclared).

**Refactors (medium/large — value: maintainability):**
- Extract a shared `ModalSheet`/`BottomSheetDialog` primitive (≥7 hand-rolled modal backdrops, 3 different
  dim opacities) + a `ScreenHeader` (every screen rebuilds its own header → title-size drift).
- Add `useWardWhatsAppTemplates` to `useWard.ts` (dedupe the two inline ward-template fetches).
- Converge the two Sunday-card systems (`UnifiedSundayCard` vs legacy `SundayCard`) onto Unified; keep
  `SundayTypeDropdown`.
- Decompose `AgendaForm.tsx` (1107 lines) and `settings/users.tsx` (909).
- Unify status colors into one themed source (duplicated hex maps in StatusLED/StatusChangeModal/UnifiedSundayCard).

**Design-system polish (medium — value: consistency/dark-mode):**
- A typography + spacing scale (302 ad-hoc fontSize literals; `'bold'` vs `'700'` mixed; screen titles 17→28px).
- Theme the OfflineBanner + ErrorBoundary (currently hardcoded, light-mode only).
- Add missing UI states: Home and `designations/[date]` have no loading/error state; several settings
  sub-screens lack error states; `agenda.tsx` "load more" button mislabeled "Loading…".

**Accessibility (medium):** localize 5 hardcoded `accessibilityLabel`/`Hint` strings; add
`accessibilityRole/Label` to icon-only buttons in PersonEditor/AgendaForm/TopicSelectorModal/
InviteActionDropdown; audit small touch targets.

**Test coverage additions (value: release confidence):**
- Install `@vitest/coverage-v8` to get real line/branch %; currently only structural.
- Highest-value untested: **AuthContext** (sign-in/refresh/sign-out), **(auth) screens** (login/register/
  invite acceptance), **useOfflineQueueProcessor + SyncProvider** wiring, **settings/members + settings/users**
  screens, **useRealtimeSync**, **ErrorBoundary** fallback, **HymnSelectorModal** render.

---

## Recommended sequencing

1. **Safe code-only fixes first** (no backend, isolated, each via build→verify): P0-3 (DebouncedTextInput),
   P1 CSV header validation, invite error paths, Next-Assignments, observer lockout, offline prefetch,
   gate-by-permission sweep, duplicate-phone feedback, reset-password dead-end, WhatsApp-invite status,
   plus the cheap P2s. These carry no v1.x risk.
2. **Decisions needed before coding:**
   - **P0-1 (authz/RLS + import_members)** — security, but a DB change on the backend shared with the LIVE
     v1.x app → **mobile-release-advisor** first (breaking-change playbook, min-version, prod-now vs cutover).
   - **P0-2 (offline durability)** — pick the approach (wire existing queue vs RQ mutation persistence);
     it's an architecture change.
   - **P2 feature gaps** (auto-assign, edit-ward-name, invite management, notification settings) — confirm
     whether intended for this release or deferred.
3. Nice-to-haves last, per your picks.

Every fix will be routed through the change loop (test-first where feasible → adversarial verify) and each
P0/P1 re-verified before it's called done.

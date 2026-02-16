# Change Requests Batch 4 - Structured Requirements (SPEC_CR4)

Source: `docs/CHANGE_REQUESTS_4.txt`

---

## SPEC_SUMMARY

```yaml
type: spec_summary
goal: "Fix 32 issues (CR-44 to CR-75) covering outdated documentation, critical bugs, dead code, error handling, UI/UX improvements, auth fixes, and agenda/actor enhancements for the Sacrament Meeting Planner app"
in_scope:
  - "F001 (CR-44..50): ARCH & SPEC documentation corrections"
  - "F002 (CR-56, CR-68): Fix speeches persistence and sunday type revert - CRITICAL"
  - "F003 (CR-52, CR-53): Connect dead-code modules (SyncEngine, OfflineManager, Notifications)"
  - "F004 (CR-57..61): Error handling overhaul across all hooks, tabs, and boundaries"
  - "F005 (CR-54, CR-55, CR-66): CSV export/import and Members screen fixes"
  - "F006 (CR-62, CR-63, CR-65, CR-69, CR-70): UI/UX small fixes (About, template, theme, labels, icons)"
  - "F007 (CR-64, CR-67): Auth fixes (Users screen bug, forgot password)"
  - "F008 (CR-71..75): Agenda & Actors enhancements (auto-preside removal, bishopric auto-actors, custom prayer names, no-agenda sundays)"
  - "F009 (CR-51): Create pnpm import-hymns CLI script"
out_of_scope:
  - "New features not described in the 32 CRs"
  - "Changes to RLS policies beyond what CRs require"
  - "Changes to Edge Functions beyond CR-64 user listing fix"
  - "Performance optimization beyond theme toggle responsiveness"
main_risks:
  - "CR-56 (speeches persistence) is critical - CHECK constraint blocks 'speeches' type insertion, requires DB migration"
  - "CR-68 (sunday type revert) indicates server data overriding optimistic update, or query invalidation race"
  - "CR-52/CR-53 (dead code) require wiring useRealtimeSync, useConnection, useNotifications into _layout.tsx, which may affect app stability"
  - "CR-57 (17 mutations without onError) means ALL mutation failures are silent - high severity data loss risk"
  - "CR-64 (Users screen error) blocks user management entirely"
  - "CR-61 (QueryClient config) changes global retry/error behavior, needs careful testing"
ac_count: 133
edge_case_count: 52
has_open_questions: true
has_unconfirmed_assumptions: true
```

---

## SPEC (Complete)

```yaml
type: spec
version: 1
goal: "Fix 32 bugs, update documentation, connect dead-code modules, overhaul error handling, improve UI/UX, and enhance agenda/actor features (CR-44 to CR-75)"

scope:
  in:
    - "F001: Update ARCH and SPEC documentation to reflect current state (CR-44..50)"
    - "F002: Fix 'speeches' persistence in DB and sunday type revert bug (CR-56, CR-68)"
    - "F003: Connect useRealtimeSync, useConnection, OfflineBanner, useNotifications to app (CR-52, CR-53)"
    - "F004: Add onError to all 17 mutations, QueryErrorView, i18n ErrorBoundary, granular boundaries, QueryClient config (CR-57..61)"
    - "F005: Fix CSV export/import errors and Members screen header spacing (CR-54, CR-55, CR-66)"
    - "F006: About screen disclaimer, WhatsApp template default, instant theme toggle, agenda label renames, actor icon sizing (CR-62, CR-63, CR-65, CR-69, CR-70)"
    - "F007: Fix Users screen error and implement forgot password (CR-64, CR-67)"
    - "F008: Remove auto-preside rule, auto-add bishopric as actors, recognizing field actor list, custom prayer names, no-agenda sunday cards (CR-71..75)"
    - "F009: Create pnpm import-hymns CLI script (CR-51)"
  out:
    - "New features not described in the CRs"
    - "Changes to push notification Edge Functions"
    - "Changes to RLS policies"
    - "Rewrite of authentication flow beyond forgot password"
    - "Reports and analytics"
```

---

## F001: ARCH & SPEC Documentation Update (CR-44, CR-45, CR-46, CR-47, CR-48, CR-49, CR-50)

### Summary

Documentation-only changes to synchronize architecture and specification documents with the current state of the codebase after multiple CR batches.

### Acceptance Criteria

- **AC-44.1**: Given ARCH_M002, when reading the schema for `sunday_exceptions`, then the `custom_reason` column is documented, the CHECK constraint includes all 7 valid values (`speeches`, `testimony_meeting`, `general_conference`, `stake_conference`, `ward_conference`, `primary_presentation`, `other`), and the `SundayExceptionReason` type matches. Priority: must.
- **AC-44.2**: Given ARCH_M002, when reading the enum/type for sunday exception reason, then `speeches` is listed as a valid persisted value (not virtual). Priority: must.
- **AC-44.3**: Given ARCH contracts for MemberImportExport, when reading input/output types, then they use `expo-document-picker` and `expo-file-system` (not web File/Blob). Priority: must.
- **AC-44.4**: Given ARCH flow "Auto-assign Sunday Types", when reading the description, then it clarifies that `speeches` IS persisted in the `sunday_exceptions` table (not treated as absence of record). Priority: must.
- **AC-44.5**: Given ARCH contract for `useRealtimeSync`, when reading the parameters, then they match the actual hook signature: `{ isOnline: boolean, setWebSocketConnected: (connected: boolean) => void }`. Priority: must.
- **AC-44.6**: Given ARCH_CR003 and ARCH_CR3_F029, when reading date formatting functions, then the naming is consistent (single canonical name, e.g., `formatFullDate`). Priority: must.
- **AC-44.7**: Given ARCH_CR003 and ARCH_CR3_F027, when reading sign-out ordering, then the ordering is consistent across documents. Priority: must.
- **AC-45.1**: Given ARCH_M002, when reading the component list, then `ActorManagementScreen` is NOT listed (removed by CR-26). Priority: must.
- **AC-45.2**: Given ARCH_M002 diagram, when reading Settings tab structure, then it shows `ActorSelectorDialog` (inline in agenda cards) instead of standalone `Actors` screen. Priority: must.
- **AC-46.1**: Given ARCH_M006 (SyncEngine) and ARCH_M007 (OfflineManager), when reading integration docs, then there is a section explaining WHERE `useRealtimeSync()` is called (root layout), WHERE `useConnection()` is called (root layout), WHERE `OfflineBanner` is rendered, and HOW `offlineQueue` integrates with mutation hooks. Priority: must.
- **AC-46.2**: Given the integration section, when reading the flow diagram, then it shows the data flow: `useConnection` -> `{isOnline}` -> `useRealtimeSync` -> query invalidation, and `OfflineBanner` -> `{showOfflineBanner}` -> UI. Priority: should.
- **AC-47.1**: Given ARCH_M008 (UIShell), when reading the component list, then all settings sub-screens are listed: `theme.tsx`, `about.tsx`, `history.tsx`, `timezone.tsx`, `members.tsx`, `topics.tsx`, `whatsapp.tsx`, `users.tsx`. Priority: must.
- **AC-48.1**: Given ARCH_M004 (AgendaModule), when reading the PresentationMode contract, then it includes `formatFullDate(dateStr, language)` for the date header. Priority: must.
- **AC-49.1**: Given PRODUCT_SPECIFICATION.md, when reading RF-21 (sunday types), then the dropdown options match: Discursos, Reuniao de Testemunho, Conferencia Geral, Conferencia de Estaca, Conferencia da Ala, Apresentacao Especial da Primaria, Outro. Priority: must.
- **AC-49.2**: Given PRODUCT_SPECIFICATION.md, when reading RF-22 (actors), then the description mentions inline management via ActorSelectorDialog in agenda cards (no checkboxes, no standalone screen). Priority: must.
- **AC-49.3**: Given PRODUCT_SPECIFICATION.md, when reading RF-21.3 (section labels), then labels reflect CR-29/CR-30 renaming. Priority: must.
- **AC-50.1**: Given SPEC.final.md, when reading ASM-009, then it has the CR-31 correction (Secretary CAN designate via Agenda tab). Priority: must.
- **AC-50.2**: Given SPEC_F012, when reading debounce rules, then the CR-36 debounce specification is included. Priority: must.
- **AC-50.3**: Given sections 7.8 and 4.2 of relevant docs, when reading Secretary permissions, then they reflect CR-37 user management permission update. Priority: must.

### Edge Cases

- **EC-F001.1**: If a referenced ARCH document does not exist, the correction should note the missing file and skip (do not create new architecture documents in this CR).
- **EC-F001.2**: Conflicting information between ARCH_CR003 and ARCH base documents should be resolved in favor of the most recent CR.

### Files Likely Impacted

- `docs/arch/ARCH_M002.md`, `docs/arch/ARCH_M004.md`, `docs/arch/ARCH_M006.md`, `docs/arch/ARCH_M007.md`, `docs/arch/ARCH_M008.md`
- `docs/PRODUCT_SPECIFICATION.md`, `docs/SPEC.final.md`
- `docs/specs/SPEC_F012.md`, `docs/specs/SPEC_F023.md`

---

## F002: Fix Speeches Persistence & Sunday Type Revert (CR-56, CR-68) - CRITICAL

### CR-56: "speeches" Value Not Persisted in Database

- **Type:** BUG (CRITICAL)
- **Root Cause (observed in code):**
  1. Migration `008_fix_sunday_type_enum.sql` CHECK constraint does NOT include `'speeches'` as a valid value.
  2. `useSundayTypes.ts:185` filters out `SUNDAY_TYPE_SPEECHES` entries: `if (type === SUNDAY_TYPE_SPEECHES) return null;` - meaning auto-assign never inserts "speeches" records.

### CR-68: Sunday Type Reverts After Selection

- **Type:** BUG (CRITICAL)
- **Root Cause (suspected):** When user selects a new sunday type, `useSetSundayType` applies an optimistic update. However, the `onSuccess` callback calls `queryClient.invalidateQueries({ queryKey: sundayTypeKeys.all })`, which triggers a refetch. If the insert/update fails silently (e.g., CHECK constraint violation for "speeches"), or if there is a race between `onMutate` (optimistic) and `onError` (revert + refetch), the UI reverts to the old value. The `onError` handler also invalidates, causing a double-refetch that may overwrite the optimistic update.

### Acceptance Criteria

- **AC-56.1**: Given the database, when inserting a sunday_exception with reason='speeches', then the insert succeeds (no CHECK constraint violation). Priority: must.
- **AC-56.2**: Given a new migration (009), when applied, then the `sunday_exceptions_reason_check` constraint includes `'speeches'` alongside the existing 6 values. Priority: must.
- **AC-56.3**: Given the migration, when applied, then it retroactively inserts `reason='speeches'` records for all sundays in the existing date range that currently have no `sunday_exceptions` entry. Priority: should.
- **AC-56.4**: Given `useSundayTypes.ts` `useAutoAssignSundayTypes`, when the auto-assigned type is `'speeches'`, then an exception record IS created with `reason='speeches'` (remove the `if (type === SUNDAY_TYPE_SPEECHES) return null` filter). Priority: must.
- **AC-56.5**: Given the `SundayExceptionReason` TypeScript type, when checking its values, then `'speeches'` is included as a valid member. Priority: must.
- **AC-68.1**: Given a sunday with type "speeches" displayed in the UI, when the user selects a different type (e.g., "testimony_meeting"), then the dropdown immediately shows the new selection and does NOT revert within 5 seconds. Priority: must.
- **AC-68.2**: Given `useSetSundayType`, when the mutation succeeds, then the optimistic update is confirmed (no unnecessary refetch that could overwrite). Priority: must.
- **AC-68.3**: Given `useSetSundayType`, when the mutation fails, then the optimistic update IS reverted via `onError` and the user sees the original value. Priority: must.
- **AC-68.4**: Given the `useSetSundayType` hook, when `reason='speeches'` is selected, then the mutation correctly handles it: either upserts with `reason='speeches'` or removes the exception entry. Priority: must.

### Edge Cases

- **EC-56.1**: If `speeches` was never persisted, existing sundays without exceptions should be treated as "speeches" type until the retroactive migration runs.
- **EC-56.2**: Concurrent users setting the same sunday's type simultaneously - upsert (ON CONFLICT) should resolve without error.
- **EC-68.1**: If network is offline when user changes type, the optimistic update should persist locally and sync when reconnected.
- **EC-68.2**: Rapid successive type changes on the same sunday (user tapping multiple options quickly) should resolve to the last selection.

### Files Likely Impacted

- `supabase/migrations/009_add_speeches_to_check_constraint.sql` (new)
- `src/hooks/useSundayTypes.ts` (remove filter, handle `speeches` reason in `useSetSundayType`)
- `src/types/database.ts` (add `'speeches'` to `SundayExceptionReason` type)

---

## F003: Connect SyncEngine, OfflineManager & Notifications (CR-52, CR-53)

### CR-52: Dead Code - useRealtimeSync, useConnection, OfflineBanner

- **Type:** BUG (CRITICAL)
- **Description:** `useRealtimeSync`, `useConnection`, and `OfflineBanner` exist as fully implemented code but are NEVER imported or used. The app has NO real-time sync (RNF-04 violated) and NO offline detection (RNF-05 violated). The `offlineQueue` module also exists but no mutation hook uses it.

### CR-53: Dead Code - useNotifications

- **Type:** BUG (CRITICAL)
- **Description:** `useNotifications.ts` exports `useRegisterPushToken` and `useNotificationHandler` but neither is imported anywhere. Push tokens are never registered, notification taps have no handler. Server-side triggers and Edge Functions exist but client is disconnected.

### Acceptance Criteria

- **AC-52.1**: Given `_layout.tsx` `InnerLayout` or `NavigationGuard`, when the app loads with an authenticated user, then `useConnection()` is called and provides `isOnline`, `showOfflineBanner`, `isWebSocketConnected`, `setWebSocketConnected`. Priority: must.
- **AC-52.2**: Given `useConnection` is active, when the app loads with an authenticated user, then `useRealtimeSync({ isOnline, setWebSocketConnected })` is called and subscribes to Supabase Realtime channels. Priority: must.
- **AC-52.3**: Given `useConnection` provides `showOfflineBanner=true`, when the device loses network, then `OfflineBanner` is rendered above the main content. Priority: must.
- **AC-52.4**: Given the Realtime subscription is active, when a record is inserted/updated/deleted in any synced table (members, speeches, sunday_exceptions, meeting_actors, sunday_agendas, ward_topics), then the corresponding TanStack Query cache is invalidated within 5 seconds. Priority: must.
- **AC-52.5**: Given the Realtime WebSocket disconnects, when polling fallback activates, then queries are invalidated every 2.5 seconds until WebSocket reconnects. Priority: should.
- **AC-53.1**: Given `_layout.tsx`, when the app loads with an authenticated user (non-observer), then `useRegisterPushToken(isOnline)` is called. Priority: must.
- **AC-53.2**: Given `_layout.tsx`, when the app loads, then `useNotificationHandler()` is called to handle notification taps. Priority: must.
- **AC-53.3**: Given the user is an Observer, when the app loads, then push token registration is skipped (observers do not receive notifications). Priority: must.
- **AC-53.4**: Given the user taps a push notification, when the app opens, then the user is navigated to the Home tab. Priority: must.

### Edge Cases

- **EC-52.1**: If `useConnection` determines device is offline on first load, `useRealtimeSync` should not attempt WebSocket subscription (no crash).
- **EC-52.2**: If the user logs out, Realtime channels should be cleaned up (unsubscribe).
- **EC-52.3**: `OfflineBanner` should not interfere with SafeAreaView/StatusBar on notched devices.
- **EC-53.1**: If the user denies notification permissions, `useRegisterPushToken` should gracefully skip without error.
- **EC-53.2**: If the app is killed and relaunched from a notification, `getLastNotificationResponseAsync` should still navigate correctly.

### Files Likely Impacted

- `src/app/_layout.tsx` (import and wire useConnection, useRealtimeSync, OfflineBanner, useRegisterPushToken, useNotificationHandler)

---

## F004: Error Handling Overhaul (CR-57, CR-58, CR-59, CR-60, CR-61)

### CR-57: Missing onError in 17 Mutations

- **Type:** BUG (CRITICAL)
- **Description:** 17 mutations across 5 hooks (useMembers, useActors, useSpeeches, useTopics, useAgenda + useSundayTypes) have NO `onError` callback. Failures are completely silent.

### CR-58: Missing Query Error Handling in Tabs

- **Type:** BUG (CRITICAL)
- **Description:** Home, Speeches, and Agenda tabs use TanStack Query but never check `isError`/`error`. Failed queries show empty lists or crash.

### CR-59: Hardcoded English Error Strings

- **Type:** BUG
- **Description:** ErrorBoundary uses hardcoded strings: 'Something went wrong', 'An unexpected error occurred', 'Try Again'. WhatsApp utilities use hardcoded strings. Members import uses 'Failed to read file'. All must use i18n. ErrorBoundary uses hardcoded colors (`#333`, `#666`, `#007AFF`) instead of theme colors.

### CR-60: Single ErrorBoundary for Entire App

- **Type:** BUG
- **Description:** Only 1 ErrorBoundary at root layout. Any render error crashes the entire app. Need granular boundaries per tab and for critical components.

### CR-61: QueryClient Missing Global Error Handlers

- **Type:** BUG
- **Description:** QueryClient has no `queryCache.onError`, no `mutationCache.onError`, generic `retry:2` for everything, and no timeout.

### Acceptance Criteria

#### CR-57 - Mutation Error Feedback

- **AC-57.1**: Given ANY mutation in `useMembers` (create, update, delete), when the mutation fails, then `Alert.alert` is shown with a translated i18n error message. Priority: must.
- **AC-57.2**: Given ANY mutation in `useActors` (create, update, delete), when the mutation fails, then `Alert.alert` is shown with a translated i18n error message. Priority: must.
- **AC-57.3**: Given ANY mutation in `useSpeeches` (assignSpeaker, assignTopic, changeStatus, removeAssignment, lazyCreate), when the mutation fails, then `Alert.alert` is shown with a translated i18n error message. Priority: must.
- **AC-57.4**: Given ANY mutation in `useTopics` (createWardTopic, updateWardTopic, deleteWardTopic, toggleCollection), when the mutation fails, then `Alert.alert` is shown with a translated i18n error message. Priority: must.
- **AC-57.5**: Given ANY mutation in `useAgenda` (lazyCreate, updateAgenda), when the mutation fails, then `Alert.alert` is shown with a translated i18n error message. Priority: must.
- **AC-57.6**: Given ANY mutation in `useSundayTypes` (setType, removeException, autoAssign), when the mutation fails, then `Alert.alert` is shown with a translated i18n error message. Priority: must.
- **AC-57.7**: Given a mutation error, when the alert is shown, then the message is translated in all 3 languages (pt-BR, en, es) and NEVER shows stack traces, Supabase error codes, or technical messages. Priority: must.
- **AC-57.8**: Given the i18n system, when error messages are added, then keys exist for `errors.saveFailed`, `errors.deleteFailed`, `errors.loadFailed`, `errors.updateFailed`, `errors.generic` in all 3 locale files. Priority: must.

#### CR-58 - Query Error Views

- **AC-58.1**: Given a reusable `QueryErrorView` component, when rendered, then it shows: an i18n translated error message and a "Try Again" button that calls `refetch()`. Priority: must.
- **AC-58.2**: Given the Home tab, when any query fails (`isError=true`), then `QueryErrorView` is shown instead of empty content. Priority: must.
- **AC-58.3**: Given the Speeches tab, when any query fails, then `QueryErrorView` is shown. Priority: must.
- **AC-58.4**: Given the Agenda tab, when any query fails, then `QueryErrorView` is shown. Priority: must.
- **AC-58.5**: Given `QueryErrorView`, when rendered in dark mode, then it uses theme colors (not hardcoded). Priority: must.

#### CR-59 - i18n ErrorBoundary & Hardcoded Strings

- **AC-59.1**: Given `ErrorBoundary.tsx`, when it catches an error, then the fallback title uses `t('errors.somethingWentWrong')` instead of hardcoded 'Something went wrong'. Priority: must.
- **AC-59.2**: Given `ErrorBoundary.tsx`, when it catches an error, then the fallback message uses `t('errors.unexpectedError')` instead of hardcoded text. Priority: must.
- **AC-59.3**: Given `ErrorBoundary.tsx`, when the "Try Again" button is shown, then it uses `t('common.tryAgain')` instead of hardcoded 'Try Again'. Priority: must.
- **AC-59.4**: Given `ErrorBoundary.tsx`, when rendered in dark mode, then all colors come from the theme system (title color, message color, button color, background). Priority: must.
- **AC-59.5**: Given WhatsApp utility strings, when an error occurs, then 'WhatsApp is not installed' and 'Failed to open WhatsApp' use i18n keys. Priority: must.
- **AC-59.6**: Given Members screen CSV import, when a file read fails, then the error uses `t('members.importFailed')` instead of hardcoded 'Failed to read file'. Priority: must.

#### CR-60 - Granular Error Boundaries

- **AC-60.1**: Given each of the 3 main tabs (Home, Speeches, Agenda), when wrapped, then each has its own `ErrorBoundary` so a crash in one tab does not affect others. Priority: must.
- **AC-60.2**: Given critical components (`AgendaForm`, `SundayCard`, `PresentationMode`), when wrapped, then each has its own `ErrorBoundary`. Priority: should.
- **AC-60.3**: Given a crash in one `SundayCard`, when the error boundary catches it, then other `SundayCard` components in the list remain functional. Priority: should.
- **AC-60.4**: Given a granular ErrorBoundary, when it catches an error, then it uses the same i18n + themed fallback from CR-59. Priority: must.

#### CR-61 - QueryClient Configuration

- **AC-61.1**: Given the global `QueryClient`, when configured, then `queryCache` has an `onError` callback that logs errors (console.error in __DEV__, silent in production). Priority: must.
- **AC-61.2**: Given the global `QueryClient`, when configured, then `mutationCache` has an `onError` callback that logs errors. Priority: must.
- **AC-61.3**: Given query retry policy, when a query fails, then it retries 2 times with exponential backoff (1s, 2s). Priority: must.
- **AC-61.4**: Given mutation retry policy, when a mutation fails, then it does NOT retry (retry: 0) to avoid duplicate operations. Priority: must.
- **AC-61.5**: Given a 401 or 403 HTTP error, when received, then no retry is attempted (redirect to login instead). Priority: should.
- **AC-61.6**: Given a query, when configured, then it has a reasonable network timeout (30 seconds default). Priority: should.

### Edge Cases

- **EC-57.1**: If multiple mutations fail simultaneously (e.g., batch import), alerts should not stack excessively - show one alert at a time.
- **EC-58.1**: `QueryErrorView` should be dismissible or auto-hidden when the retry succeeds.
- **EC-59.1**: ErrorBoundary is a class component - it cannot use hooks directly. Theme colors should be passed via props, context consumer pattern, or a wrapper.
- **EC-60.1**: Nested ErrorBoundaries should not catch the same error twice.
- **EC-61.1**: Existing `retry: 2` in QueryClient should be preserved for queries but overridden for mutations.

### Files Likely Impacted

- `src/hooks/useMembers.ts`, `src/hooks/useActors.ts`, `src/hooks/useSpeeches.ts`, `src/hooks/useTopics.ts`, `src/hooks/useAgenda.ts`, `src/hooks/useSundayTypes.ts` (add onError)
- `src/components/QueryErrorView.tsx` (new)
- `src/components/ErrorBoundary.tsx` (i18n + theme)
- `src/app/(tabs)/index.tsx`, `src/app/(tabs)/speeches.tsx`, `src/app/(tabs)/agenda.tsx` (wrap with ErrorBoundary, add QueryErrorView)
- `src/app/_layout.tsx` (QueryClient config)
- `src/i18n/locales/pt-BR.json`, `src/i18n/locales/en.json`, `src/i18n/locales/es.json` (add error keys)
- `src/lib/whatsapp.ts` (i18n error strings)
- `src/app/(tabs)/settings/members.tsx` (i18n import error)

---

## F005: CSV & Members Screen Fixes (CR-54, CR-55, CR-66)

### CR-54: Export CSV Error on Cancel + Import Hardcoded English Error

- **Type:** BUG
- **Description:** Export CSV shows error alert when user cancels the share sheet. Import CSV has hardcoded English error 'Failed to read file' instead of using i18n.

### CR-55: Members Screen Header Misalignment

- **Type:** BUG (UI)
- **Description:** When `canWrite=false`, the "+" button is not rendered but no spacer replaces it, causing the title to shift to the right.

### CR-66: Export CSV Empty / Import CSV Random Error

- **Type:** BUG
- **Description:** Export CSV does nothing when no members exist (should download file with headers only). Import CSV shows a dialog with an unhelpful error message - user cannot understand what is wrong.

### Acceptance Criteria

- **AC-54.1**: Given the user exports CSV and then cancels the share sheet, when the share is dismissed, then NO error alert is shown (detect cancellation by checking `err?.message !== 'User did not share'` or equivalent). Priority: must.
- **AC-54.2**: Given the user imports a CSV and file reading fails, when the error is shown, then it uses `t('members.importFailed')` (not hardcoded English). Priority: must.
- **AC-55.1**: Given `canWrite=false` on the Members screen, when the "+" button is hidden, then a `View` spacer with `width: 36` is rendered in its place to keep the header title centered. Priority: must.
- **AC-66.1**: Given the user taps Export CSV when no members exist, when the export runs, then a CSV file is generated containing ONLY the header row (`Nome Completo,Codigo Pais,Telefone` or i18n equivalent) and the share sheet opens. Priority: must.
- **AC-66.2**: Given the user imports a CSV, when the file has format errors (wrong columns, encoding issues, missing headers), then the error dialog shows a SPECIFIC, translated error message explaining the problem (e.g., "Missing required column: Nome Completo"). Priority: must.
- **AC-66.3**: Given the user imports a CSV, when the file is valid but contains rows with validation errors (empty name, duplicate phone), then a summary is shown: "X of Y members imported. Z skipped due to errors." Priority: should.

### Edge Cases

- **EC-54.1**: On Android, the share sheet cancel detection may differ from iOS - test on both platforms.
- **EC-55.1**: If Observer role views the Members screen, the spacer should also be present since Observer has no "+" button.
- **EC-66.1**: CSV with BOM (Byte Order Mark) from Excel should still be parsed correctly.
- **EC-66.2**: CSV with semicolon separator (common in Brazilian locale Excel exports) should either be auto-detected or produce a clear error.

### Files Likely Impacted

- `src/app/(tabs)/settings/members.tsx` (export cancel handling, import error i18n, header spacer, empty export)
- `src/lib/csvUtils.ts` (better error messages, header-only export support)
- `src/i18n/locales/*.json` (add specific CSV error keys)

---

## F006: UI/UX Small Fixes (CR-62, CR-63, CR-65, CR-69, CR-70)

### CR-62: About Screen Disclaimer + Author Name

- **Type:** FEATURE / BUG
- **Description:** Add disclaimer: "Esse nao e um app oficial da Igreja de Jesus Cristo Dos Santos Dos Ultimos Dias" (translated in all 3 languages). Fix author name to "Aloisio Almeida Jr".

### CR-63: Default WhatsApp Template Text Not Respected

- **Type:** BUG
- **Description:** The WhatsApp template screen initializes empty when no template is saved in the database. It should show a sensible default template text when `ward.whatsapp_template` is null.

### CR-65: Theme Toggle Delay

- **Type:** BUG (UI)
- **Description:** When user taps to change theme, there's a visible delay (seconds) before the UI updates. The toggle should change the UI instantly and persist asynchronously.

### CR-69: Agenda Card Label Renames

- **Type:** FEATURE
- **Description:** Rename labels on the agenda card: "Conduzindo" -> "Dirigindo", "Assuntos da Ala" -> "Apoios e Agradecimentos", "Anuncios de Estaca" -> "Apoios e Agradecimentos da Estaca", "Reconhecendo" -> "Reconhecendo a Presenca".

### CR-70: Actor Edit/Delete Icon Size

- **Type:** FEATURE (UI)
- **Description:** Increase the size and touch area of the edit (pencil) and delete (X) icons in the ActorSelector dialog.

### Acceptance Criteria

#### CR-62

- **AC-62.1**: Given the About screen, when displayed, then a disclaimer text is shown: "Esse nao e um app oficial da Igreja de Jesus Cristo Dos Santos Dos Ultimos Dias" (or the translated equivalent in the current language). Priority: must.
- **AC-62.2**: Given the About screen, when displaying credits, then the author name shows "Aloisio Almeida Jr" (exact spelling). Priority: must.
- **AC-62.3**: Given all 3 supported languages, when viewing the About screen, then the disclaimer text is properly translated. Priority: must.

#### CR-63

- **AC-63.1**: Given a ward with `whatsapp_template = NULL` in the database, when the WhatsApp template screen loads, then a default template text is shown in the input field (not empty). Priority: must.
- **AC-63.2**: Given the default template, when displayed, then it contains at minimum the placeholders `{nome}`, `{data}`, and `{titulo}` in a sensible message. Priority: must.
- **AC-63.3**: Given the default template is shown, when the user edits it and triggers auto-save, then the edited text is persisted to the database. Priority: must.

#### CR-65

- **AC-65.1**: Given the Theme screen, when the user taps a theme option (Automatic/Light/Dark), then the UI changes IMMEDIATELY (within the same render frame). Priority: must.
- **AC-65.2**: Given the theme change, when the preference is persisted, then the `AsyncStorage.setItem` call runs asynchronously and does NOT block the state update. Priority: must.
- **AC-65.3**: Given the theme change, when `AsyncStorage.setItem` fails, then the UI still reflects the new theme (no revert). Priority: must.

#### CR-69

- **AC-69.1**: Given the agenda card labels in pt-BR, when displayed, then "Conduzindo" is replaced by "Dirigindo". Priority: must.
- **AC-69.2**: Given the agenda card labels in pt-BR, when displayed, then "Assuntos da Ala" is replaced by "Apoios e Agradecimentos". Priority: must.
- **AC-69.3**: Given the agenda card labels in pt-BR, when displayed, then "Anuncios de Estaca" is replaced by "Apoios e Agradecimentos da Estaca". Priority: must.
- **AC-69.4**: Given the agenda card labels in pt-BR, when displayed, then "Reconhecendo" is replaced by "Reconhecendo a Presenca". Priority: must.
- **AC-69.5**: Given the agenda card labels in en and es, when displayed, then equivalent translations are applied. Priority: must.

#### CR-70

- **AC-70.1**: Given the ActorSelector dialog, when viewing the actor list, then the edit (pencil) and delete (X) icons have `fontSize: 22` (up from 18). Priority: must.
- **AC-70.2**: Given the ActorSelector dialog, when viewing the actor list, then the `hitSlop` on edit and delete icons is at least 12 (up from 8). Priority: must.
- **AC-70.3**: Given the ActorSelector dialog, when viewing the actor list, then the `gap` between edit and delete icons is at least 20 (up from 16) to prevent accidental taps. Priority: should.

### Edge Cases

- **EC-62.1**: Disclaimer text must not overflow on small screens - use appropriate font size and multiline.
- **EC-63.1**: If the user clears the template completely and saves, the DB stores empty string. On next load, the default should NOT override the intentionally cleared template. Use `null` vs empty string distinction: `null` = show default, `''` = user intentionally cleared.
- **EC-65.1**: If the user rapidly toggles between themes, only the last selection should persist.
- **EC-69.1**: Existing translations for removed keys should be cleaned up to avoid dead i18n keys.

### Files Likely Impacted

- `src/app/(tabs)/settings/about.tsx` (disclaimer, author name)
- `src/i18n/locales/pt-BR.json`, `en.json`, `es.json` (disclaimer text, label renames)
- `src/app/(tabs)/settings/whatsapp.tsx` (default template)
- `src/contexts/ThemeContext.tsx` (verify async persistence - already correct, see code review)
- `src/app/(tabs)/settings/theme.tsx` (verify instant toggle)
- `src/components/AgendaForm.tsx` or i18n keys (label renames)
- `src/components/ActorSelector.tsx` (icon size and hit area)

---

## F007: Auth Fixes - Users Screen Bug + Forgot Password (CR-64, CR-67)

### CR-64: Users Screen Shows Red Error

- **Type:** BUG (CRITICAL)
- **Description:** When the Secretary clicks "Users" in Settings, a red error message appears. The current secretary's own user does not appear in the list. The ward has only the secretary as a user.

### CR-67: Forgot Password

- **Type:** FEATURE
- **Description:** Implement "Forgot password" functionality using standard Supabase `auth.resetPasswordForEmail()`.

### Acceptance Criteria

#### CR-64

- **AC-64.1**: Given a Secretary user, when navigating to Settings > Users, then the screen loads without error. Priority: must.
- **AC-64.2**: Given a ward with only one user (Secretary), when the Users screen loads, then the Secretary appears in the user list. Priority: must.
- **AC-64.3**: Given the `list-users` Edge Function, when called by a Secretary, then it returns all ward users including the calling user. Priority: must.
- **AC-64.4**: Given the Users screen, when `usersError` is truthy, then the error message is specific and translated (not just "Erro"). Priority: must.
- **AC-64.5**: Given a network error on the Users screen, when the query fails, then a retry button is shown. Priority: should.

#### CR-67

- **AC-67.1**: Given the Login screen, when displayed, then a "Forgot Password" link is visible below the login button. Priority: must.
- **AC-67.2**: Given the user taps "Forgot Password", when a modal/screen opens, then the user can enter their email address. Priority: must.
- **AC-67.3**: Given the user submits their email, when the email is valid, then `supabase.auth.resetPasswordForEmail(email)` is called and a success message is shown: "Password reset email sent". Priority: must.
- **AC-67.4**: Given the user submits their email, when the email is invalid or not found, then a user-friendly error message is shown (NOT a Supabase technical error). Priority: must.
- **AC-67.5**: Given the "Forgot Password" flow, when all labels are displayed, then they are translated in all 3 languages (pt-BR, en, es). Priority: must.
- **AC-67.6**: Given the password reset email is sent, when the user receives it, then they can set a new password via the link. Priority: must.

### Edge Cases

- **EC-64.1**: If the Edge Function `list-users` returns an error about authorization, the screen should show a permission-denied message (not generic "Error").
- **EC-64.2**: If the ward has 0 users (impossible in practice but defensive), the screen should show the "No users" empty state.
- **EC-67.1**: If the user submits the forgot password form multiple times, only one email should be sent (debounce or disable button after first submit).
- **EC-67.2**: Supabase may not distinguish between "email not found" and "email sent" (for security). The success message should be generic: "If this email is registered, you will receive a reset link."
- **EC-67.3**: The Forgot Password UI should respect the current theme (dark/light mode).

### Files Likely Impacted

- `src/app/(auth)/login.tsx` (add forgot password link)
- `src/app/(auth)/forgot-password.tsx` (new screen) OR modal in login.tsx
- `supabase/functions/list-users/index.ts` (investigate and fix the Secretary error)
- `src/app/(tabs)/settings/users.tsx` (improve error display)
- `src/i18n/locales/*.json` (add forgot password and improved error keys)

---

## F008: Agenda & Actors Enhancements (CR-71, CR-72, CR-73, CR-74, CR-75)

### CR-71: Remove Auto-Preside Rule

- **Type:** FEATURE
- **Description:** Remove the business rule "whoever conducts can also preside" (`enforceActorRules`). When adding someone to conduct, do NOT auto-select them for presiding.

### CR-72: Bishopric Auto-Added as Actors

- **Type:** FEATURE
- **Description:** When a user with role "bishopric" is registered (via invitation acceptance), their name should be automatically added to the `meeting_actors` table with `can_conduct=true` and `can_preside=true`.

### CR-73: "Recognizing Presence" Field Uses Actor List

- **Type:** BUG
- **Description:** The "Reconhecendo a Presenca" field in the agenda should show the ActorSelector dialog (filtered by `can_recognize`) when tapped, but currently it does not.

### CR-74: Prayer Fields Allow Custom Names

- **Type:** FEATURE
- **Description:** Opening and closing prayer fields should allow entering a name that is NOT a member of the ward. The custom name is persisted only in the agenda record (not added to the members table).

### CR-75: Sundays Without Agenda Show in Agenda Tab

- **Type:** FEATURE
- **Description:** In the Agenda tab, sundays that have no agenda record should still appear as non-expandable cards. Like testimony meeting cards, they should show the exception type in a yellow badge.

### Acceptance Criteria

#### CR-71

- **AC-71.1**: Given `useActors.ts` `enforceActorRules`, when `can_conduct=true` is set on an actor, then `can_preside` is NOT automatically set to `true`. Priority: must.
- **AC-71.2**: Given the `enforceActorRules` function, when called, then it returns the input UNMODIFIED (the function becomes a no-op or is removed). Priority: must.
- **AC-71.3**: Given the ActorSelector, when creating a new actor with roleFilter='can_conduct', then the created actor has `can_conduct=true` and `can_preside=false` (unless the user explicitly selected preside). Priority: must.

#### CR-72

- **AC-72.1**: Given a new user with role "bishopric" who accepts an invitation, when the invitation is processed, then a `meeting_actors` record is automatically created with the user's name, `can_preside=true`, `can_conduct=true`, `can_recognize=false`, `can_music=false`. Priority: must.
- **AC-72.2**: Given an existing user whose role is changed TO "bishopric", when the role update completes, then a `meeting_actors` record is created (if one with the same name does not already exist). Priority: should.
- **AC-72.3**: Given a bishopric user whose role is changed FROM "bishopric" to another role, when the role update completes, then the `meeting_actors` record is NOT automatically deleted (they remain as an actor). Priority: must.
- **AC-72.4**: Given a bishopric user, when their actor record already exists (same name), then no duplicate is created. Priority: must.

#### CR-73

- **AC-73.1**: Given the agenda form, when the user taps the "Reconhecendo a Presenca" field, then an `ActorSelector` dialog opens filtered by `can_recognize`. Priority: must.
- **AC-73.2**: Given the ActorSelector for "Reconhecendo a Presenca", when the user selects an actor, then the actor's name is added to the `recognized_names` array in the agenda. Priority: must.
- **AC-73.3**: Given the "Reconhecendo a Presenca" field, when actors are selected, then they appear as a comma-separated list or chips in the field. Priority: must.
- **AC-73.4**: Given the "Reconhecendo a Presenca" field, when a selected actor is removed, then the name is removed from `recognized_names`. Priority: must.

#### CR-74

- **AC-74.1**: Given the opening prayer or closing prayer field in the agenda, when the user taps it, then they can choose between selecting a ward member (MemberSelectorModal) OR typing a custom name. Priority: must.
- **AC-74.2**: Given a custom prayer name is entered, when saved, then the name is stored in `opening_prayer_name` or `closing_prayer_name` WITHOUT creating a member record and WITHOUT setting `opening_prayer_member_id` or `closing_prayer_member_id`. Priority: must.
- **AC-74.3**: Given a member is selected for prayer, when saved, then both `_member_id` and `_name` fields are set (existing behavior). Priority: must.
- **AC-74.4**: Given a custom prayer name, when displayed in Presentation Mode, then it shows the custom name exactly as entered. Priority: must.

#### CR-75

- **AC-75.1**: Given the Agenda tab, when sundays without an agenda record are in the visible date range, then they appear as cards in the list. Priority: must.
- **AC-75.2**: Given a sunday without an agenda, when displayed, then the card is NOT expandable (no accordion behavior). Priority: must.
- **AC-75.3**: Given a sunday without an agenda that has a sunday exception, when displayed, then the exception type is shown in a yellow/amber badge (matching the testimony meeting card styling). Priority: must.
- **AC-75.4**: Given a sunday with exception types `general_conference` or `stake_conference`, when displayed in the Agenda tab, then they appear as non-expandable cards with the exception badge (they were previously excluded entirely). Priority: must.
- **AC-75.5**: Given a sunday without an agenda and without any exception, when displayed, then it shows as a non-expandable card with the default type "Domingo com Discursos". Priority: should.

### Edge Cases

- **EC-71.1**: Existing actors with both `can_conduct=true` and `can_preside=true` should NOT be modified retroactively.
- **EC-72.1**: If the invitation acceptance flow does not have access to the user's display name (only email), the actor name should use the email prefix (part before @) as a fallback.
- **EC-72.2**: If two bishopric members have the same name, both actors should be created (they have different user IDs).
- **EC-73.1**: If no actors have `can_recognize=true`, the ActorSelector should show an empty list with the option to add new actors.
- **EC-74.1**: If a prayer field previously had a member selected, and the user switches to a custom name, the `_member_id` should be set to `null`.
- **EC-74.2**: Custom prayer names should support accented characters (UTF-8).
- **EC-75.1**: The non-expandable card should still show the date block (day of month, month name).
- **EC-75.2**: Sundays in the past and future should both be shown, following the existing scroll behavior.

### Files Likely Impacted

- `src/hooks/useActors.ts` (remove enforceActorRules logic)
- `supabase/functions/accept-invitation/index.ts` or equivalent (auto-create actor for bishopric)
- `src/components/AgendaForm.tsx` (recognizing field uses ActorSelector, prayer field allows custom name)
- `src/components/ActorSelector.tsx` (no changes needed, already supports roleFilter)
- `src/app/(tabs)/agenda.tsx` (show non-expandable cards for sundays without agenda)
- `src/components/SundayCard.tsx` or new `NoAgendaCard.tsx` (non-expandable card variant)
- `src/hooks/useAgenda.ts` (remove or adjust `EXCLUDED_EXCEPTION_TYPES` set for CR-75.4)

---

## F009: Create pnpm import-hymns CLI Script (CR-51)

### CR-51: Missing CLI Script for Hymn Import

- **Type:** FEATURE MISSING
- **Description:** PRODUCT_SPECIFICATION RF-23.1 specifies `pnpm import-hymns hinario.csv` to import the hymn catalog via CLI. The script does not exist. Hymns are currently imported via seed/migration only.

### Acceptance Criteria

- **AC-51.1**: Given the command `pnpm import-hymns hinario.csv`, when executed, then the script reads the CSV file and upserts hymns into the `hymns` table. Priority: must.
- **AC-51.2**: Given the CSV format, when the file contains columns `Lingua,Numero,Titulo,Sacramental(S/N)`, then each row is parsed correctly. Priority: must.
- **AC-51.3**: Given a hymn row with `Sacramental=S`, when inserted, then `is_sacramental=true`. Given `N`, then `is_sacramental=false`. Priority: must.
- **AC-51.4**: Given a hymn that already exists in the DB (same language + number), when the script runs, then the existing record is UPDATED (upsert by `language, number` unique constraint). Priority: must.
- **AC-51.5**: Given the script finishes, when completed, then it prints a summary: "Imported X hymns (Y inserted, Z updated)". Priority: must.
- **AC-51.6**: Given invalid CSV (missing columns, bad encoding), when the script runs, then it exits with a clear error message. Priority: must.
- **AC-51.7**: Given `package.json`, when the `import-hymns` script is defined, then it maps to the CLI entry point (e.g., `"import-hymns": "ts-node scripts/import-hymns.ts"`). Priority: must.

### Edge Cases

- **EC-51.1**: CSV with BOM should be handled.
- **EC-51.2**: Empty lines and trailing newlines should be skipped.
- **EC-51.3**: Hymn titles with commas should be handled (assume standard CSV quoting).
- **EC-51.4**: Large CSV files (1000+ hymns) should complete without timeout.
- **EC-51.5**: The script must authenticate with Supabase using a service role key (not a user token).

### Files Likely Impacted

- `scripts/import-hymns.ts` (new)
- `package.json` (add script entry)

---

## Cross-Cutting Concerns

### Assumptions

```yaml
assumptions:
  - id: A-1
    description: "The Theme toggle delay in CR-65 is caused by the synchronous await of AsyncStorage.setItem before updating React state."
    confirmed: false
    default_if_not_confirmed: "Review ThemeContext code - the current implementation already sets state before persisting, so the delay may be elsewhere (e.g., re-render of heavy component tree). Profile if needed."

  - id: A-2
    description: "CR-64 Users screen error is caused by the list-users Edge Function failing for Secretary role (authorization check may only allow Bishopric)."
    confirmed: false
    default_if_not_confirmed: "Check the Edge Function code. If it checks for bishopric-only, update it to also allow secretary role."

  - id: A-3
    description: "CR-63 default template should be the same as the SPEC-defined template text from F024/CR-14."
    confirmed: false
    default_if_not_confirmed: "Use a sensible default in pt-BR: 'Ola {nome}, voce foi designado(a) para proferir o {posicao}o discurso no dia {data}. O tema e: {titulo}. Deus te abencoe!'"

  - id: A-4
    description: "CR-72 auto-creation of bishopric actors requires the user's display name. The invitation acceptance flow has the user's email but may not have a display name."
    confirmed: false
    default_if_not_confirmed: "Use the part of the email before '@' as the actor name. If the invitation includes a name field, use that."

  - id: A-5
    description: "CR-68 sunday type revert is caused by a race condition between optimistic update and server-side query invalidation, not a separate bug from CR-56."
    confirmed: false
    default_if_not_confirmed: "Fix CR-56 first (CHECK constraint + remove filter), then retest CR-68. If still occurs, investigate the invalidation/refetch timing in useSetSundayType."

  - id: A-6
    description: "CR-75 requires the Agenda tab to show ALL sundays in the date range, including those currently excluded by EXCLUDED_EXCEPTION_TYPES (general_conference, stake_conference)."
    confirmed: false
    default_if_not_confirmed: "Show all sundays including general_conference and stake_conference as non-expandable cards with their exception badge."

  - id: A-7
    description: "CR-74 custom prayer names are persisted only in the agenda's _name fields (opening_prayer_name, closing_prayer_name) with _member_id set to NULL."
    confirmed: false
    default_if_not_confirmed: "This matches the existing DB schema where _name fields are independent TEXT columns."

  - id: A-8
    description: "The ErrorBoundary in CR-59 needs theme access but is a class component that cannot use hooks."
    confirmed: true
    default_if_not_confirmed: "Use a wrapper function component that reads theme via useTheme() and passes colors as props to ErrorBoundary."
```

### Open Questions

```yaml
open_questions:
  - id: Q-1
    question: "For CR-72, should the auto-created actor for bishopric also have can_recognize=true?"
    proposed_default: "No. Only can_preside=true and can_conduct=true. The user can edit the actor later to add other roles."

  - id: Q-2
    question: "For CR-75, when user taps a non-expandable card (sunday without agenda), should it create an agenda lazily and expand, or remain non-expandable?"
    proposed_default: "Remain non-expandable. The user must change the sunday type or explicitly open the agenda form through another action."

  - id: Q-3
    question: "For CR-67, should the forgot password be a separate screen or a modal within the login screen?"
    proposed_default: "A simple modal dialog within the login screen, consistent with the app's existing modal patterns."

  - id: Q-4
    question: "For CR-62, what should the About screen disclaimer position be - above or below the existing info rows?"
    proposed_default: "Below all info rows, in a separate styled section with a smaller font size and subdued text color."

  - id: Q-5
    question: "For CR-73, should the 'Reconhecendo a Presenca' field support multiple actor selections?"
    proposed_default: "Yes, since recognized_names is a TEXT[] array in the DB schema. Each tap on the field opens the ActorSelector and appends the selected name."

  - id: Q-6
    question: "For CR-69, the label changes are only specified in pt-BR. What should the en and es equivalents be?"
    proposed_default: "en: 'Conducting' -> 'Conducting', 'Ward Business' -> 'Sustainings and Acknowledgments', 'Stake Announcements' -> 'Stake Sustainings and Acknowledgments', 'Recognizing' -> 'Recognizing the Presence'. es: 'Conduciendo' -> 'Dirigiendo', 'Asuntos del Barrio' -> 'Apoyos y Agradecimientos', 'Anuncios de Estaca' -> 'Apoyos y Agradecimientos de Estaca', 'Reconociendo' -> 'Reconociendo la Presencia'."
```

### Definition of Done

```yaml
definition_of_done:
  - "All acceptance criteria with priority 'must' are implemented and pass manual testing"
  - "All new i18n keys are added in all 3 locale files (pt-BR, en, es)"
  - "All new/modified components respect the current theme (dark/light mode)"
  - "No hardcoded English strings in user-facing UI"
  - "DB migrations are idempotent (safe to run multiple times)"
  - "Existing QA tests (133) still pass"
  - "New tests are added for critical bug fixes (CR-56, CR-68, CR-64)"
  - "No TypeScript compilation errors"
  - "No regression in existing functionality"
```

---

## Execution Priority

| Priority | Feature | Reason |
|----------|---------|--------|
| 1 | F002 (CR-56, CR-68) | CRITICAL - Data not persisted, UI reverts. Blocks correct sunday type behavior. |
| 2 | F006 (CR-62, CR-63, CR-65, CR-69, CR-70) | UI/UX fixes with low risk. Quick wins. |
| 3 | F005 (CR-54, CR-55, CR-66) | CSV/Members bugs - visible to users. |
| 4 | F007 (CR-64, CR-67) | Auth bugs - blocks user management. |
| 5 | F008 (CR-71..75) | Agenda enhancements - new features, medium complexity. |
| 6 | F004 (CR-57..61) | Error handling - important but broad scope, requires careful rollout. |
| 7 | F003 (CR-52, CR-53) | Dead code wiring - critical for RNF compliance but requires stability testing. |
| 8 | F009 (CR-51) | CLI script - standalone, no risk to app. |
| 9 | F001 (CR-44..50) | Docs only - can run in parallel with any other feature. |

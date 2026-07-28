# Plan: v2.0 — unified people model & member management
(spec: specs/v2-member-management.md · release: docs/decisions/001-v2-release-cutover.md)

## Branch / constraints
- Building on `v2.0` (now includes the v1.x foundation via merge `4eee51e`). **Deploy/merge to main
  waits for v1.x adoption** (ADR 001). Migration 037 is destructive → build the file now, **apply
  only at cutover** (backup + short write-block window). App code is built + vitest-tested against
  the new types (mocked supabase / stub-render infra). Bump `app.json` → `2.0.0` at the end.

## Phase 1 — Data model & types (foundation)
1. **Migration 037 (destructive).** `members` +5 capability booleans + `contact_via_responsible` +
   `responsible_id` (FK→members SET NULL, CHECK <> id); `speeches` + `contact_phone`,`is_delegated`,
   `delegate_for_name`; `wards` + `whatsapp_template_delegation_wrapper`; migrate `meeting_actors`
   → member flags (normalized name match / create; union roles); drop agenda `*_actor_id` (keep
   `*_name`); drop `meeting_actors` + RLS. [1 commit — SQL review now; applied at cutover] (AC1-AC3)
2. **Types** `src/types/database.ts`: Member (+caps/delegation), Speech (+delegation snapshot),
   Ward (+wrapper); **remove** `MeetingActor`/`ActorRole`; SundayAgenda drop `*_actor_id`; fix the
   stale prayer fields. Fix resulting tsc breakages minimally. [1 commit]

## Phase 2 — Data layer & sync
3. **useMembers**: extend create/update with capabilities + delegation; add a "responsible-for"
   reverse-lookup helper; keep speech-count + name cascade. [commit + tests] (AC4/AC6/AC9)
4. **Retire actors**: delete `useActors`; update `src/lib/sync.ts` (`SYNCED_TABLES`,
   `TABLE_TO_QUERY_KEYS`, realtime) to drop `meeting_actors`; remove `ActorRole` usages. [commit + tests] (AC13)
5. **WhatsApp delegation**: at assignment snapshot the resolved contact (buildFullPhone of
   responsible or self) into the speech (`contact_phone`/`is_delegated`/`delegate_for_name`); add
   the ward delegation-wrapper resolution in `whatsappUtils`; send path uses `contact_phone` and
   wraps the message when delegated; orphan-responsible fallback + warning. [commit + tests] (AC8/AC9)

## Phase 3 — UI: unified People picker + editor
6. **PeoplePicker** (replaces MemberSelectorModal + ActorSelector + PrayerSelector): one picker for
   speakers/prayers/all roles; capability filter + "ver todos"; grant-on-select confirmation;
   per-row edit/remove; "Responsável por X"; speech-count badge; gated by member:write / agenda:write;
   observers view-only. [commit + tests] (AC4/AC5/AC6/AC10)
7. **PersonEditor**: identity + 5 capability toggles + delegation (responsible picker excludes self;
   require a responsible when `contact_via_responsible`). [commit + tests] (AC7)
8. **Wire consumers**: `speeches.tsx` (speaker/prayer), `AgendaForm.tsx` (roles by capability +
   recognition = multi members), `NextAssignmentsSection`/`index` (home). Remove the 3 old modals.
   [commit + tests] (AC4/AC10)

## Phase 4 — Settings & CSV
9. **settings/members.tsx → CSV-only**: remove inline CRUD; add explanatory text + the batch
   workflow (download → edit → upload) with a replace warning. [commit + tests] (AC12)
10. **CSV full dump**: export all fields (5 caps + `Responsável` by name); update `import_members`
    RPC (in migration 037) to insert + 2nd-pass resolve `Responsável` name→id, destructive; update
    `csvUtils` + `members.csvHeader*` i18n. [commit + tests] (AC11)

## Phase 5 — i18n, version, verify
11. **i18n**: all new strings (picker, editor, delegation wrapper, CSV headers, capability labels)
    in pt-BR/en-US/es-LA. [commit] (AC14)
12. **app.json → 2.0.0**; final `tsc`/`lint`/`test:run`; adversarial `verify-change`. [commit]

## Verification
- Migration 037 (Deno/SQL): reviewed now; applied at cutover on a backup + verified live (matching
  count of members carrying capabilities; agendas keep `*_name`). Not vitest-covered.
- App code: vitest (hooks/logic + render tests via the stub-alias infra). Full suite must stay green;
  tsc 0; lint 0.
- Human gates: this plan (GATE 2) → build → verify-change → GATE 3 (deploy, gated by v1.x adoption).

## Risks
- Large multi-screen refactor + destructive migration → sequence Phase 1-2 (model) before UI;
  keep each step green. Recognition becomes members-only (per spec). CSV import stays destructive
  (user-confirmed) — the screen must warn.

# v2.0 — Unified people model & member management

## Problem / intent
Make the app simpler/intuitive: unify "actors" and "speakers" into the **members** table with
capability flags + contact-delegation, and move people management (add/edit/remove) **into the
selection picker** (CSV import/export stays in Settings). First slice of the v2.0 redesign.
Breaking DB change → forced-update cutover (see `docs/decisions/001-v2-release-cutover.md`),
gated by a prerequisite **v1.x** release (`specs/v1x-version-gate.md`).

## In scope / Out of scope
- **In:** extend `members`; drop `meeting_actors` (migrate into member capabilities); agenda actor
  assignments become **snapshot-only** (drop `*_actor_id`, keep `*_name`); **keep `speeches.member_id`**
  (+ snapshots) for speech counts & name cascade. Unified People picker. Person editor. WhatsApp
  delegation wrapper. Full-dump CSV. Recognition = members-only. Sync-registry updates.
- **Out:** the v1.x version gate + app-version-in-push-token + the WhatsApp country_code phone fix
  (all moved to `specs/v1x-version-gate.md`, ship first). Other v2.0 UX slices (separate specs).

## Data model (v2)
`members` gains (defaults `false`/null; backfilled by migration):
- Capabilities: `can_preside`, `can_conduct` (dirigir a reunião), `can_lead_music` (reger),
  `can_play_piano`, `can_be_recognized`. **Speak/pray always available — no flag.** No `is_active`.
- Delegation: `contact_via_responsible` boolean; `responsible_id` uuid FK → `members(id)`
  **ON DELETE SET NULL**, plus `CHECK (responsible_id <> id)`.

`meeting_actors` → **dropped** after migration.
`sunday_agendas`: drop `presiding_actor_id`/`conducting_actor_id`/`pianist_actor_id`/`conductor_actor_id`;
keep the paired `*_name` snapshots. `recognized_names` stays TEXT (newline-joined snapshot of picked
**member** names).
`speeches`: keep `member_id` + existing snapshots; ADD delegation snapshot columns
`contact_phone TEXT`, `is_delegated BOOLEAN DEFAULT false`, `delegate_for_name TEXT` (filled at
assignment; see WhatsApp).
`wards`: ADD `whatsapp_template_delegation_wrapper TEXT` (NULL ⇒ locale default).

Note: this re-introduces multi-capability flags that migration 025 collapsed into a single `role`;
the migration maps `role` → the matching flag.

## Migration (037 — destructive; backup + short write-block window per ADR; v1.x uses 036)
1. Add the member columns; add speeches delegation columns; add ward wrapper column.
2. For each `meeting_actors` row: match by normalized `full_name` within `ward_id`; if a member
   matches, set the mapped flag `true`; else INSERT a member (`full_name`=actor.name, that flag
   `true`). Union flags for repeated names. Role→flag: preside→can_preside, conduct→can_conduct,
   conductor→can_lead_music, pianist→can_play_piano, recognize→can_be_recognized. Residual dups →
   user resolves later.
3. Ensure agenda `*_name` snapshots are populated; drop the `*_actor_id` columns.
4. Drop `meeting_actors` + its RLS.
5. Redesign `import_members` RPC for the full-dump CSV (see CSV section).
Transactional; not auto-reversible (DROP) → rollback = restore pre-migration backup.

## Unified People picker (replaces MemberSelectorModal + ActorSelector + PrayerSelector)
- One picker used for speakers, prayers, and every actor role. Each row: name, informal name,
  speech-count badge (speaker context), capability indicators, and — when the member is a
  `responsible_id` for others — "Responsável por <name(s)>". Per-row edit/remove.
- Opened with a capability context. Speaker/prayer → lists everyone. Specific role (e.g. pianist)
  → by default lists only members with that capability, with a **"ver todos"** toggle.
- **Grant-on-select:** if the user picks (via "ver todos") a member lacking the required
  capability, show a confirmation; on confirm, set that capability `true`, then select.
- Inline **add** person; **edit** opens the person editor. Add/edit/remove gated by `member:write`;
  selecting into an agenda/speech gated by `agenda:write`/`speech:assign`; observers view only.

## Person editor (new)
Edits: full_name, informal_name, country_code, phone, the 5 capability flags, and delegation
(`contact_via_responsible` + a `responsible_id` member picker that excludes self). If
`contact_via_responsible` is on, a responsible must be chosen (else warn).

## WhatsApp & delegation
- **Contact snapshot at assignment:** when assigning a speaker/prayer, snapshot the *resolved*
  contact into the speech: if the member has `contact_via_responsible` + a valid `responsible_id`,
  set `is_delegated=true`, `contact_phone = responsible.country_code+responsible.phone`,
  `delegate_for_name = member.informal_name||full_name`; else `is_delegated=false`,
  `contact_phone = member.country_code+member.phone`. (Fixes the country_code the v1.x bug fix
  addresses; v2 relies on the corrected concatenation.)
- **Send:** build the normal per-position message as today; if `is_delegated`, wrap it with the
  ward-level `whatsapp_template_delegation_wrapper`. Tokens: `{responsavel}` (responsible's name),
  `{nome}` (delegate_for_name), `{mensagem}` (the resolved base message).
  Locale defaults:
  - pt-BR: `Olá {responsavel}, tudo bom? Temos um convite para {nome}:\n\n{mensagem}`
  - en-US: `Hi {responsavel}, how are you? We have an invitation for {nome}:\n\n{mensagem}`
  - es-LA: `Hola {responsavel}, ¿qué tal? Tenemos una invitación para {nome}:\n\n{mensagem}`
- Recipient = `contact_phone`. If `is_delegated` but no `contact_phone` (orphaned responsible),
  fall back to the member's own phone + show the existing no-phone-style warning.
- Editable in `settings/whatsapp.tsx` as a new tab (gated `settings:whatsapp`); all new
  tokens/labels added to 3 locales.

## Recognition (members-only — P3)
Recognition picks from members with `can_be_recognized` (+ "ver todos"/grant-on-select), storing
their names into `recognized_names` (snapshot). No free-text non-members — a visitor must be added
as a member first (fast in the picker). `can_be_recognized` is a real flag used as the picker filter.

## CSV (full dump; import stays destructive — user-confirmed)
- **Export = full dump:** all member fields incl. the 5 capability flags and a `Responsável` column
  holding the responsible member's `full_name` (not the UUID).
- **Import = destructive** (DELETE-ALL + INSERT, as today) via an updated `import_members` RPC that
  (a) inserts all rows with capabilities, then (b) **second pass** resolves `Responsável` name →
  `responsible_id` within the ward; ambiguous/unresolved names left NULL and reported.
- The Settings CSV screen (now CSV-only) gets **more explanatory text**: the intended batch-edit
  workflow is *download current → edit the sheet (by hand or with AI) → upload*, with a clear
  warning that upload replaces everything.

## Permissions
People management (add/edit/remove, capabilities, delegation) → `member:write` (`member:read` to
view, `member:import` for CSV). Agenda assignment/recognition → `agenda:write`. No `actor:*`
introduced. (RLS stays ward-scoped; role gating remains app-side — tightening RLS is out of scope.)

## Other surfaces (confirmed safe / to update)
- Presentation mode, push-notification content, activity log, speaker-override fields: read
  name snapshots, **not** actor/member FKs → safe as long as `*_name`/`speaker_*` snapshots remain.
  Activity log keeps `actor:*` history keys.
- **Update sync/offline registry** (`src/lib/sync.ts` `SYNCED_TABLES`/`TABLE_TO_QUERY_KEYS`,
  realtime) to drop `meeting_actors`; retire `useActors`/`actorKeys`.
- Home tab (`NextAssignmentsSection`, `index.tsx`) uses the unified picker + the shared contact
  snapshot helper.

## Acceptance criteria (EARS)
- AC1: `members` has the 5 capability booleans + `contact_via_responsible` + `responsible_id`
  (FK SET NULL, CHECK <> id).
- AC2: Migration turns every `meeting_actors` row into a member carrying the mapped capability
  (matched or created); `meeting_actors` is removed; agenda `*_name` snapshots preserved.
- AC3: `speeches.member_id` remains; per-member speech counts + name cascade keep working.
- AC4: ONE people picker serves speakers, prayers, and all roles; capability filter + "ver todos".
- AC5: IF a member lacking the required capability is selected via "ver todos", THEN a confirmation
  grants that capability before selecting.
- AC6: Picker allows add/edit/remove (member:write) and shows "Responsável por <name>" for
  responsibles; observers cannot mutate.
- AC7: Person editor edits identity + 5 flags + delegation; responsible picker excludes self;
  contact_via_responsible requires a responsible.
- AC8: WHEN assigning, the resolved contact (own or responsible, with country_code) is snapshotted
  onto the speech (contact_phone/is_delegated/delegate_for_name).
- AC9: WHEN sending WhatsApp for a delegated assignee, the message is wrapped by the ward wrapper
  template ({responsavel}/{nome}/{mensagem}) and sent to the responsible's phone; orphaned
  delegation falls back to the assignee's phone + warning.
- AC10: Recognition selects only members (can_be_recognized filter + grant-on-select), stored as
  snapshot names.
- AC11: CSV export is a full dump (incl. capabilities + Responsável-by-name); import is destructive
  and resolves Responsável name→id in a second pass; Settings CSV screen shows the batch workflow +
  replace warning.
- AC12: Settings retains ONLY CSV import/export for people.
- AC13: Sync registry no longer references `meeting_actors`; presentation/log/push unaffected.
- AC14: All new user-facing strings exist in pt-BR/en-US/es-LA.

## Open questions
(none — resolved via interview P1–P18 + loose-ends review)

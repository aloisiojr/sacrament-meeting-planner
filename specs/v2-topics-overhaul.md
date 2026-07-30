# Topics/themes overhaul — picker-based CRUD, all libraries available (Spec 2 of 2)

## Problem / intent
Improve the speech-topic experience: retire the Settings "Temas" screen and the collection-hiding
feature (everything is always available), and move custom-topic create/edit/delete into the topic
picker itself. Rebuild the picker on the PeoplePicker pattern: search (topic + library name), an add
button, custom topics first (editable), then built-in libraries newest-first.

## In scope / Out of scope
- **In:**
  - Delete `src/app/(tabs)/settings/topics.tsx` and its Settings-index entry.
  - Remove the collection-visibility feature: drop `ward_collection_config` (ADR 004), remove the
    `collection:toggle` permission + `useToggleCollection`; `useActiveTopics` returns ALL general
    collections/topics.
  - Chronological library order by parsing the collection name (no schema column).
  - Rebuild `TopicSelectorModal` (PeoplePicker-style): search, add button, no "show all" toggle;
    custom topics first (pencil → inline edit title + optional link; clear title + confirm → delete
    dialog), then built-in libraries.
  - All ward topics editable/deletable (drop the `is_default` restriction; keep seeding starter
    defaults from migration 034).
- **Out:**
  - Any change to how a chosen topic is snapshotted onto a speech (`topic_title/link/collection`
    stays denormalized; deleting a topic never touches past speeches).
  - Adding a date column to `general_collections` (ordering is parsed from the name).
  - The speeches editor / NextAssignmentsSection call sites keep the same `TopicSelectorModal` props
    (`visible`, `onSelect(topic)`, `onClose`).

## Baseline (evidence)
- `src/components/TopicSelectorModal.tsx` — read-only picker (props `visible/onSelect/onClose`);
  `useActiveTopics()`; local accent-insensitive search over `"collection : title"`. Used by
  `src/app/speeches/[date].tsx` and `src/components/NextAssignmentsSection.tsx`.
- `src/hooks/useTopics.ts` — ward-topic CRUD (`useWardTopics`, `useCreateWardTopic`,
  `useUpdateWardTopic`, `useDeleteWardTopic`, `checkTopicFutureSpeeches`); collections
  (`useCollections`, `useToggleCollection`, `useActiveTopics` filters by `active`);
  `FIXED_COLLECTION_ORDER`.
- Collection names (staging): fixed evergreen — "For the Strength of Youth"/"Gospel Principles"
  (en), "Força dos Jovens"/"Princípios do Evangelho" (pt), "Para la Fortaleza de la
  Juventud"/"Principios del Evangelio" (es); conferences — "General Conference April 2020" /
  "Conferencia General Abril 2020" / "Conferência Geral Abril 2020" (April/Abril,
  October/Octubre/Outubro + year).
- `WardCollectionConfig` type (`src/types/database.ts`); `collection:toggle` in `permissions.ts`
  (bishopric+secretary) + `Permission` union + `ALL_PERMISSIONS`; permission-count tests
  (`permissions.test.ts`, `database-types.test.ts`, `f041-f042-phase3.test.ts`, `f065-f066-tester.test.ts`)
  currently expect **27**.
- Settings-index topics entry gated by `topic:write` (`src/app/(tabs)/settings/index.tsx`).
- `PeoplePicker.tsx` — the pattern to mirror (search + "+" add opening an editor, per-row pencil,
  permission gating). `SwipeableCard`/inline-edit primitives exist in the old settings/topics.

## Acceptance criteria (EARS)
- **AC1:** The system SHALL remove the Settings "Temas" screen and its Settings-index entry.
- **AC2:** The system SHALL remove the collection-visibility feature: no `active`/hidden filtering —
  `useActiveTopics` SHALL return ALL general collections/topics for the ward language; `ward_collection_config`
  is dropped (ADR 004) and `useToggleCollection` removed.
- **AC3:** The system SHALL remove the `collection:toggle` permission from the `Permission` union,
  PERMISSIONS_MAP, and ALL_PERMISSIONS; the permission-count tests SHALL be updated (27 → 26).
- **AC4:** The topic picker SHALL provide a search field that matches on BOTH the topic title and the
  library (collection) name (accent-insensitive), and SHALL NOT show a "show all" toggle.
- **AC5:** The topic picker SHALL list custom (ward) topics FIRST, then built-in libraries; within
  built-in, the two non-dated evergreen libraries FIRST, then conference libraries by parsed
  month/year DESCENDING (most recent first).
- **AC6:** Only custom (ward) topics SHALL show a pencil (edit) affordance; built-in topics SHALL be
  selectable but not editable.
- **AC7:** WHERE the user has `topic:write`, the picker SHALL show an add button that creates a new
  custom topic (inline edit, prefilled from the search text) with title + optional link.
- **AC8:** WHEN the user taps a custom topic's pencil, its title (and optional link) SHALL become
  editable with the keyboard shown; confirming SHALL save the edit (`useUpdateWardTopic`).
- **AC9:** IF the user clears the title and confirms an edit, THEN the system SHALL show a
  confirmation dialog ("apagar o tema compartilhado?"); on confirm it SHALL delete the topic
  (`useDeleteWardTopic`), and past speeches' snapshots SHALL be preserved.
- **AC10:** WHEN the user selects any topic, the system SHALL return it via `onSelect` as today
  (`TopicWithCollection`), unchanged for the speeches editor + NextAssignmentsSection call sites.
- **AC11:** All ward topics (including seeded `is_default` ones) SHALL be editable/deletable — the
  `is_default` editing restriction is removed; starter defaults keep being seeded.
- **AC12:** Create/edit/delete SHALL be gated by `topic:write`; selecting SHALL follow the existing
  assignment gating (mirroring PeoplePicker).

## Open questions
- None. (Resolved at gate: parse name for order; drop table + permission; all editable, keep seed;
  delete preserves snapshots; keep title + link editing; evergreen libraries pinned at top.)

## Notes
- **Permissions:** removing `collection:toggle` moves counts 27 → 26 across the four count tests +
  EXPECTED_MATRIX; observer unchanged (never had it).
- **i18n:** new picker strings (search placeholder, add, edit, delete-confirm title/message, custom
  section label) in pt-BR/en-US/es-LA. `topics.customTopics` already exists.
- **Offline:** ward-topic create/edit/delete run through the existing React Query + offline queue.
- **Release:** migration 043 DROPs `ward_collection_config` (breaking, ADR 004 / ADR 001 cutover);
  apply to staging; prod at cutover. `general_topics`/`general_collections`/`ward_topics` unchanged.

# Plan: Topics/themes overhaul (spec: specs/v2-topics-overhaul.md)

## Reuse (extend these, don't recreate)
- `src/hooks/useTopics.ts` — keep ward CRUD (`useWardTopics`, `useCreateWardTopic`,
  `useUpdateWardTopic`, `useDeleteWardTopic`); change `useActiveTopics`; remove the collection-config
  hooks.
- `src/components/PeoplePicker.tsx` — pattern for the rebuilt picker (search + "+" add + per-row
  pencil inline edit + permission gate). `src/components/SearchInput.tsx`.
- `src/app/(tabs)/settings/topics.tsx` — its inline `TopicEditor` (title+link) + delete-confirm logic
  are the reference for the picker's inline edit; the file itself is deleted.
- `Alert` (react-native) for the "apagar tema compartilhado?" dialog.

## Steps (1 step = 1 commit)
1. **Ordering lib + `useActiveTopics` shows everything, chronologically.** New `src/lib/topics.ts`:
   `parseCollectionPeriod(name)` (April/Abril, October/Octubre/Outubro + year → sortable number|null)
   and `compareActiveTopics(a, b)` — order: ward topics first, then general with NO period (evergreen
   libraries) , then period libraries by date DESC; within a library, title ASC. Rewrite
   `useActiveTopics` to fetch ALL `general_collections`+`general_topics` for the ward language (no
   `ward_collection_config` round, no `active` filter) and sort with `compareActiveTopics`.
   — covers: AC2, AC5; tests: `src/__tests__/topics-order.test.ts` (parse + comparator); update
   `f064-supabase-resource-optimization.test.ts` if it asserts the old query rounds.
2. **Rebuild `TopicSelectorModal`** (same props). Search matches title + collection; a "+" add button
   (`topic:write`) creates a custom topic inline (prefilled from search). Rows: custom (type 'ward')
   first with a pencil → inline edit (title TextInput + optional link TextInput, keyboard shown);
   confirm → `useUpdateWardTopic`; IF title cleared → `Alert` "apagar tema compartilhado?" →
   `useDeleteWardTopic`. New row → `useCreateWardTopic`. Built-in rows: selectable only. Selecting →
   `onSelect(topic)` unchanged.
   — covers: AC4, AC6, AC7, AC8, AC9, AC10, AC11, AC12; tests:
   `src/__tests__/topic-selector-modal.test.tsx` (search title+collection; custom-first + pencil;
   add creates; edit updates; clear+confirm deletes; select returns topic; built-in has no pencil).
3. **Delete Settings "Temas" + unused collection hooks.** Remove `src/app/(tabs)/settings/topics.tsx`
   and its index entry (`src/app/(tabs)/settings/index.tsx`). From `useTopics.ts` remove
   `useCollections`, `useToggleCollection`, `useCollectionTopics`, `checkCollectionFutureSpeeches`,
   `CollectionWithConfig`, `FIXED_COLLECTION_ORDER` (now unused). Update/remove obsolete tests:
   `f056-collection-sort.test.ts`, `f057-topic-visibility.test.ts`, and the collection bits of
   `useTopics-utils.test.ts` (replace FIXED_COLLECTION_ORDER coverage with the new `topics-order` lib).
   — covers: AC1; tests: settings index no longer shows the topics entry (extend a settings test or
   add a focused assertion); obsolete collection tests removed/rewritten.
4. **Remove `collection:toggle` + drop the table.** Remove `collection:toggle` from the `Permission`
   union (`database.ts`), PERMISSIONS_MAP (bishopric+secretary), and `ALL_PERMISSIONS`; remove the
   `WardCollectionConfig` type. Migration `supabase/migrations/043_drop_collection_config.sql`
   (`DROP TABLE IF EXISTS ward_collection_config;`). Update permission-count tests (27 → 26) +
   EXPECTED_MATRIX + `database-types.test.ts` (drop the WardCollectionConfig construction + the
   permission from its list).
   — covers: AC3, deploy; tests: `permissions.test.ts`, `f041-f042-phase3.test.ts`,
   `f065-f066-tester.test.ts`, `database-types.test.ts`.

## AC → coverage matrix
| AC   | Step | Test |
|------|------|------|
| AC1  | 3 | settings index has no topics entry |
| AC2  | 1 | useActiveTopics shows all (topics-order / hook behavior) |
| AC3  | 4 | permissions.test / database-types (collection:toggle gone; 26) |
| AC4  | 2 | topic-selector-modal (search title + collection) |
| AC5  | 1 | topics-order (ward→evergreen→conferences desc) |
| AC6  | 2 | topic-selector-modal (pencil on custom only) |
| AC7  | 2 | topic-selector-modal (add creates custom) |
| AC8  | 2 | topic-selector-modal (edit updates title+link) |
| AC9  | 2 | topic-selector-modal (clear+confirm deletes) |
| AC10 | 2 | topic-selector-modal (select returns TopicWithCollection) |
| AC11 | 2 | topic-selector-modal (is_default topic still editable) |
| AC12 | 2 | topic-selector-modal (add/pencil gated by topic:write) |

## Risks / deploys
- **DEPLOY — migration 043** DROPs `ward_collection_config` (breaking, ADR 004 / ADR 001 cutover).
  Apply to staging; prod at cutover.
- **Shared modal:** `TopicSelectorModal` is used by the speeches editor + NextAssignmentsSection; props
  unchanged so call sites are safe. The 3 tests that stub it to `() => null` stay valid.
- **Permission churn:** 27 → 26 across 4 count tests + EXPECTED_MATRIX; observer unchanged.
- **Obsolete tests:** f056 (fixed-order sort) + f057 (visibility) test removed behavior — rewrite/remove
  and call out. New ordering covered by `topics-order.test.ts`.
- **Offline:** ward-topic CRUD already offline-queued; the picker's inline create/edit/delete inherit it.

## Rollback
- `git revert` steps 1-4. DB (staging pre-cutover): down migration recreates `ward_collection_config`
  (id, ward_id, collection_id, active, UNIQUE(ward_id, collection_id)).

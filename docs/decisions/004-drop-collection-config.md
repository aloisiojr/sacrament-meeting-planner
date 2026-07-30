# ADR 004 — Remove collection-visibility (drop ward_collection_config)

Status: proposed · Date: 2026-07-30 · Advisor: mobile-release-advisor · Related: [ADR 001](001-v2-release-cutover.md)

## Context
The topics overhaul (Spec 2) removes the "hide/show collections" feature: every collection and topic
is always available. Visibility was the boolean `active` flag on `ward_collection_config`
(`collection:toggle` permission). With the feature gone, the table + permission are dead.

The shipped v1 client filters topics by `ward_collection_config.active` (`useActiveTopics`), so
dropping the table makes v1's topic picker error. This is a **breaking** change.

## Decision
- **Drop the `ward_collection_config` table** in the v2 migration set.
- **Remove the `collection:toggle` permission** from the `Permission` union + PERMISSIONS_MAP +
  ALL_PERMISSIONS (client-only; bishopric/secretary lose it; observer never had it).
- v2's `useActiveTopics` shows ALL general collections/topics (no `active` filter).
- **Chronological ordering by parsing the collection name** (April/Abril, October/Octubre/Outubro +
  year) — NO schema column added (product decision).
- Keep `ward_topics.is_default` physically (migration 034) but drop its editing restriction — all
  ward topics become editable/deletable in the new picker.

## Consequences
- Breaking for live v1 (topic picker) — governed by the ADR 001 forced-update cutover; the drop runs
  post-cutover with the other v2 migrations. Acceptable per the owner's clean-cutover choice.
- No offline-cache concern beyond the v2 cache-version bump already in place (ADR 001).
- Deleting a ward topic preserves past speeches' denormalized `topic_title/link/collection`
  snapshots (unchanged behavior).

## Constraint fed back to the spec
- Migration DROPs `ward_collection_config`; nothing else in that migration.
- No new column for ordering — parse the collection name.

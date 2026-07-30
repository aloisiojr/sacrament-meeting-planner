# ADR 002 — Supports & releases: structured `designations` (v2 schema)

Status: proposed · Date: 2026-07-29 · Advisor: mobile-release-advisor · Extends: [ADR 001](001-v2-release-cutover.md)

## Context
Today the agenda stores supports/releases ("apoios e desobrigações") as a single free-text
column `sundays_agenda.sustaining_releasing` (`string | null`, newline-joined list). v2.0 needs
**structured** items (type, person, calling/office snapshots) to (a) drive a richer card display
and (b) generate the verbatim "text to read" in Play (spec 2) from templates (spec 3).

The shipped **v1 client reads `sustaining_releasing` as plain text** off the same Supabase. Per
ADR 001 the product owner chose a **clean cutover** (no dual-write, no expand/contract dual
support); v2 migrations run only **after** the forced-update gate is in effect. The owner
confirms **no backward compatibility is required**: v1.1 exists specifically to force everyone to
update, and there is no intent to keep any v1.0 client alive. So this change may replace the old
field outright.

## Decision
1. **Add** `sundays_agenda.designations jsonb NOT NULL DEFAULT '[]'` — an ordered array of items:
   ```
   { type: 'sustain' | 'release' | 'priesthood' | 'new_member',
     person_name: string,            // snapshot
     member_id: string | null,       // link (nullable) — enables the optional calling update
     calling:   string | null,       // snapshot, for sustain/release
     office:    'deacon' | 'teacher' | 'priest' | null }  // for priesthood
   ```
   All human-readable values are **plain-text snapshots**, never FKs (a later calling rename must
   not rewrite past agendas).
2. **Drop** `sustaining_releasing` in the same v2 migration (clean replace). Safe because the
   ADR 001 forced-update gate guarantees no live v1 client reads the column after cutover; the
   owner accepts no v1 coexistence.
3. **No back-migration** of existing free-text into `designations` (clean cutover; consistent
   with ADR 001). Existing v1 text is discarded.
4. **Member calling side-effect:** confirming a sustain/release item MAY update `members.calling`
   (sustain → new value; release → NULL) only with the user's explicit per-item consent.

## Consequences
- Breaking column replacement, governed by the ADR 001 forced-update cutover (already accepted).
- Offline cache: v2 already bumps the react-query persist cache-version key (ADR 001) → no extra
  work here.
- Existing free-text supports/releases are lost at cutover; accepted by the owner.

## Constraint fed back to the spec
- Snapshots only — the spec MUST forbid storing calling/office as references.

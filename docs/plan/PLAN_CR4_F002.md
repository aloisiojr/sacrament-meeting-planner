# PLAN_CR4_F002 - Speeches Persistence & Sunday Type Revert Fix

## PLAN_SUMMARY

```yaml
type: plan_summary
total_steps: 3
parallel_tracks: 1
estimated_commits: 3
coverage:
  acceptance_criteria: 0/0
  edge_cases: 0/0
critical_path:
  - "STEP-01: DB migration 009 - add 'speeches' to CHECK constraint (CR-56 foundation)"
  - "STEP-02: Fix speeches persistence in useSundayTypes.ts (CR-56 code fix)"
  - "STEP-03: Fix sunday type revert bug (CR-68 optimistic update fix)"
main_risks:
  - "CR-56 migration must backfill 'speeches' records for sundays without entries"
  - "Root cause of CR-68 revert may be in auto-assign re-running and reinserting 'speeches'"
```

## PLAN

```yaml
type: plan
version: 1
status: draft
features: ["F002"]
spec: "SPEC_CR4_F002"

goal: "Fix speeches persistence bug (CR-56) and sunday type revert race condition (CR-68)"

strategy:
  order: "DB migration -> Code fix -> Race condition fix"
  commit_strategy: "1 commit per step, conventional commit messages"
  test_strategy: "Tests alongside code; Vitest for unit + integration"

steps:
  - id: STEP-01
    description: "Create migration 009_add_speeches_to_reason_enum.sql. Drop old CHECK constraint, add new one including 'speeches'. Backfill: INSERT speeches records for all sundays in the active range (e.g., sundays from 6 months ago to 12 months ahead) that have no entry in sunday_exceptions."
    files:
      - "supabase/migrations/009_add_speeches_to_reason_enum.sql"
    dependencies: []
    parallelizable_with: []
    done_when:
      - "Migration drops old sunday_exceptions_reason_check constraint"
      - "New constraint allows: speeches, testimony_meeting, general_conference, stake_conference, ward_conference, primary_presentation, other"
      - "Retroactive INSERT of 'speeches' records for sundays without entries is included"
      - "Migration applies cleanly on fresh and existing databases"
    tests:
      - type: integration
        description: "Verify constraint accepts 'speeches'. Verify old values still pass. Verify invalid values are rejected."
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks:
      - risk: "Backfill query may create many rows if date range is large"
        mitigation: "Scope backfill to wards that exist in the system using a JOIN or subquery"

  - id: STEP-02
    description: "Remove the filter at useSundayTypes.ts:185 that blocks 'speeches' from being inserted. Remove 'if (type === SUNDAY_TYPE_SPEECHES) return null;'. Change the type cast to include SUNDAY_TYPE_SPEECHES as valid for DB insertion. Update SundayExceptionReason in database.ts if needed to include 'speeches'. Update useRemoveSundayException to INSERT a 'speeches' record instead of DELETE (revert = set to speeches, not remove entry)."
    files:
      - "src/hooks/useSundayTypes.ts"
      - "src/types/database.ts"
    dependencies: ["STEP-01"]
    parallelizable_with: []
    done_when:
      - "Line 185 filter removed: speeches entries are inserted into DB"
      - "SundayExceptionReason type includes 'speeches'"
      - "useRemoveSundayException now upserts 'speeches' instead of deleting the row"
      - "Auto-assign creates entries for ALL sundays including speeches type"
    tests:
      - type: unit
        description: "Verify useAutoAssignSundayTypes inserts 'speeches' entries. Verify useRemoveSundayException upserts to 'speeches'."
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks:
      - risk: "useRemoveSundayException behavior change: from DELETE to UPSERT"
        mitigation: "Update optimistic update logic to set reason='speeches' instead of removing from array"

  - id: STEP-03
    description: "Fix the bug where selecting a different sunday type on a 'speeches' sunday reverts after 2 seconds. The issue is likely a race between optimistic update and auto-assign or stale query refetch. Ensure useSetSundayType's optimistic update does not get overwritten by a concurrent invalidation. Add proper cancelQueries before optimistic update. Verify the mutation's onSuccess doesn't trigger a refetch that overwrites the new value."
    files:
      - "src/hooks/useSundayTypes.ts"
    dependencies: ["STEP-02"]
    parallelizable_with: []
    done_when:
      - "Selecting a new sunday type on a 'speeches' sunday persists the change immediately"
      - "No revert happens after selection"
      - "Optimistic update is not overwritten by background refetch"
    tests:
      - type: unit
        description: "Verify useSetSundayType on a 'speeches' entry correctly updates to new type without revert"
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks:
      - risk: "Root cause may be in auto-assign re-running and reinserting 'speeches'"
        mitigation: "Verify auto-assign only runs on sundays WITHOUT entries, not on sundays with entries"

validation:
  - cr_id: CR-56
    how_to_verify: "Speeches entries are persisted in DB. Auto-assign creates 'speeches' records. Revert to speeches upserts instead of deleting."
    covered_by_steps: ["STEP-01", "STEP-02"]
  - cr_id: CR-68
    how_to_verify: "Selecting a new sunday type on a 'speeches' sunday persists immediately without reverting after 2 seconds."
    covered_by_steps: ["STEP-03"]
```

## Dependency Graph

```
STEP-01 (DB migration 009)
  └── STEP-02 (Fix speeches code)
       └── STEP-03 (Fix revert bug)
```

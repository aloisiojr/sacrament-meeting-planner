# PLAN_CR4_F001 - Documentation Updates

## PLAN_SUMMARY

```yaml
type: plan_summary
total_steps: 7
parallel_tracks: 2
estimated_commits: 7
coverage:
  acceptance_criteria: 0/0
  edge_cases: 0/0
critical_path:
  - "STEP-01..06: Documentation fixes (all parallelizable)"
  - "STEP-07: Update ARCH_INDEX and PLAN_INDEX (depends on all prior steps)"
main_risks:
  - "Documentation references may be stale if code changed since ARCH docs were written"
```

## PLAN

```yaml
type: plan
version: 1
status: draft
features: ["F001"]
spec: "SPEC_CR4_F001"

goal: "Update architecture docs, product specification, and index files to reflect CR-44 through CR-50 documentation fixes"

strategy:
  order: "All doc fixes in parallel -> Then update indexes"
  commit_strategy: "1 commit per step, conventional commit messages (docs:)"
  test_strategy: "No automated tests; manual review of documentation accuracy"

steps:
  - id: STEP-01
    description: "Update ARCH_M002.md: (a) Add custom_reason to sunday_exceptions table definition. (b) Update reason enum to include 'speeches'. (c) Confirm 'speeches' is persistido. (d) Update MemberImportExport contracts for mobile (expo modules). (e) Remove ActorManagementScreen (CR-45). (f) Update diagram to remove Actors from Settings."
    files:
      - "docs/arch/ARCH_M002.md"
    dependencies: []
    parallelizable_with: ["STEP-02", "STEP-03", "STEP-04", "STEP-05", "STEP-06"]
    done_when:
      - "sunday_exceptions table includes custom_reason column"
      - "reason enum includes 'speeches'"
      - "MemberImportExport contracts use mobile types"
      - "ActorManagementScreen removed from component list"
      - "Diagram updated"
    tests: []
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks: []

  - id: STEP-02
    description: "Update ARCH_M006.md and ARCH_M007.md: Add 'Integration Point' section defining where useRealtimeSync and useConnection are called (tabs layout), where OfflineBanner is rendered, how offlineQueue integrates with mutations. Add flow diagram."
    files:
      - "docs/arch/ARCH_M006.md"
      - "docs/arch/ARCH_M007.md"
    dependencies: []
    parallelizable_with: ["STEP-01", "STEP-03", "STEP-04", "STEP-05", "STEP-06"]
    done_when:
      - "ARCH_M006 has Integration Point section"
      - "ARCH_M007 has Integration Point section"
      - "Flow diagram shows M006 <-> M007 <-> layout relationship"
    tests: []
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks: []

  - id: STEP-03
    description: "Update ARCH_M008.md to list all Settings sub-screens: theme.tsx, about.tsx, history.tsx, timezone.tsx, members.tsx, topics.tsx, whatsapp.tsx, users.tsx. Update diagram."
    files:
      - "docs/arch/ARCH_M008.md"
    dependencies: []
    parallelizable_with: ["STEP-01", "STEP-02", "STEP-04", "STEP-05", "STEP-06"]
    done_when:
      - "All Settings sub-screens listed as components"
      - "Diagram updated with all sub-telas"
    tests: []
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks: []

  - id: STEP-04
    description: "Update ARCH_M004.md PresentationMode contract to include formatFullDate(dateStr, language) for date display in header."
    files:
      - "docs/arch/ARCH_M004.md"
    dependencies: []
    parallelizable_with: ["STEP-01", "STEP-02", "STEP-03", "STEP-05", "STEP-06"]
    done_when:
      - "PresentationMode section documents formatFullDate"
      - "dateUtils.ts dependency documented"
    tests: []
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks: []

  - id: STEP-05
    description: "Fix inconsistencies across ARCH docs: (a) ARCH_CR3_F029: change formatDateFull to formatFullDate. (b) ARCH_CR3_F027: fix sign-out ordering to queryClient.clear() before signOut(). (c) ARCH_M006: update useRealtimeSync contract to include parameters."
    files:
      - "docs/arch/ARCH_CR3_F029.md"
      - "docs/arch/ARCH_CR3_F027.md"
      - "docs/arch/ARCH_M006.md"
    dependencies: []
    parallelizable_with: ["STEP-01", "STEP-02", "STEP-03", "STEP-04", "STEP-06"]
    done_when:
      - "formatDateFull -> formatFullDate in ARCH_CR3_F029"
      - "Sign-out ordering consistent in ARCH_CR3_F027"
      - "useRealtimeSync contract shows parameters"
    tests: []
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks: []

  - id: STEP-06
    description: "Update PRODUCT_SPECIFICATION.md: (a) RF-21 labels to reflect CR-29/CR-30. (b) RF-22 actor flow to reflect CR-26. (c) RN-01 sunday types to current enum. Update SPEC.final.md: (a) CR-31: fix ASM-009. (b) CR-34: update RF-22/7.13.4 for CR-26. (c) CR-36: add debounce rule to SPEC_F012. (d) CR-37: update 7.8 and 4.2 for secretary permissions."
    files:
      - "docs/PRODUCT_SPECIFICATION.md"
      - "docs/SPEC.final.md"
      - "docs/specs/SPEC_F012.md"
    dependencies: []
    parallelizable_with: ["STEP-01", "STEP-02", "STEP-03", "STEP-04", "STEP-05"]
    done_when:
      - "RF-21 labels updated"
      - "RF-22 actor flow updated"
      - "RN-01 sunday types corrected"
      - "ASM-009 corrected"
      - "Secretary permissions documented"
      - "Debounce rule in SPEC_F012"
    tests: []
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks: []

  - id: STEP-07
    description: "Update ARCH_INDEX.md to add CR004 entry. Update PLAN_INDEX.md to add PLAN_CR004 entry with step count and CRs covered."
    files:
      - "docs/arch/ARCH_INDEX.md"
      - "docs/plan/PLAN_INDEX.md"
    dependencies: ["STEP-01", "STEP-02", "STEP-03", "STEP-04", "STEP-05", "STEP-06"]
    parallelizable_with: []
    done_when:
      - "ARCH_INDEX lists CR004"
      - "PLAN_INDEX lists PLAN_CR004 with correct step count"
    tests: []
    covers:
      acceptance_criteria: []
      edge_cases: []
    risks: []

validation:
  - cr_id: CR-44
    how_to_verify: "ARCH_M002 updated with custom_reason, speeches enum, mobile contracts, no ActorManagementScreen"
    covered_by_steps: ["STEP-01"]
  - cr_id: CR-45
    how_to_verify: "ActorManagementScreen removed from ARCH_M002 component list and diagram"
    covered_by_steps: ["STEP-01"]
  - cr_id: CR-46
    how_to_verify: "ARCH_M006 and ARCH_M007 have Integration Point sections with flow diagram"
    covered_by_steps: ["STEP-02"]
  - cr_id: CR-47
    how_to_verify: "ARCH_M008 lists all Settings sub-screens with updated diagram"
    covered_by_steps: ["STEP-03"]
  - cr_id: CR-48
    how_to_verify: "ARCH_M004 PresentationMode contract includes formatFullDate"
    covered_by_steps: ["STEP-04"]
  - cr_id: CR-44
    how_to_verify: "ARCH naming/ordering inconsistencies fixed across CR3 docs and M006"
    covered_by_steps: ["STEP-05"]
  - cr_id: CR-49
    how_to_verify: "PRODUCT_SPECIFICATION updated with RF-21, RF-22, RN-01 corrections"
    covered_by_steps: ["STEP-06"]
  - cr_id: CR-50
    how_to_verify: "SPEC.final.md updated with CR-31, CR-34, CR-36, CR-37 fixes"
    covered_by_steps: ["STEP-06"]
```

## Dependency Graph

```
STEP-01 (ARCH_M002)           ─┐
STEP-02 (ARCH_M006/M007)       │
STEP-03 (ARCH_M008)            ├── All parallelizable (doc fixes)
STEP-04 (ARCH_M004)            │
STEP-05 (ARCH naming fixes)    │
STEP-06 (PRODUCT_SPEC/SPEC)   ─┘
                                │
                                └── STEP-07 (Update indexes)
```

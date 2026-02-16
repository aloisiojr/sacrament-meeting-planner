# PLAN_INDEX - Gerenciador da Reuniao Sacramental

## PLAN_SUMMARY

```yaml
type: plan_summary
total_phases: 6
total_steps: 62
parallel_tracks: 3
estimated_commits: 62
coverage:
  acceptance_criteria: 82/82
  edge_cases: 45/45
critical_path:
  - "PHASE-01: Foundation (DB + Auth + Permissions + i18n + Theme)"
  - "PHASE-02: Core Data (Ward, Members, Topics, Sunday Types, Actors, Hymns)"
  - "PHASE-03: Speech Lifecycle (Speech CRUD, Home tab, WhatsApp)"
  - "PHASE-04: Agenda & Presentation Mode"
  - "PHASE-05: Infrastructure (Sync, Offline, Notifications)"
  - "PHASE-06: Admin & Polish (Users, Activity Log, CSV, Template, Hardening)"
main_risks:
  - "Supabase Realtime channel limits may require connection pooling"
  - "Deep link handling varies significantly between iOS and Android"
  - "Offline queue replay may hit RLS conflicts if user role changed while offline"
  - "Expo Push token lifecycle requires careful handling across app states"
  - "Infinite scroll performance with 24+ months of sundays"
```

## Phase Breakdown

| Phase | Title | Steps | Dependencies | Features Covered |
|-------|-------|-------|--------------|-----------------|
| [PHASE-01](PLAN_PHASE_01.md) | Foundation | 12 | None | F001, F002, F020, F021, F023 |
| [PHASE-02](PLAN_PHASE_02.md) | Core Data | 12 | PHASE-01 | F003, F005, F006, F007, F013, F014, F015 |
| [PHASE-03](PLAN_PHASE_03.md) | Speech Lifecycle | 11 | PHASE-02 | F008, F009, F010 |
| [PHASE-04](PLAN_PHASE_04.md) | Agenda & Presentation | 10 | PHASE-03 | F012, F016 |
| [PHASE-05](PLAN_PHASE_05.md) | Infrastructure | 8 | PHASE-03 | F011, F017, F022 |
| [PHASE-06](PLAN_PHASE_06.md) | Admin & Polish | 9 | PHASE-01, PHASE-02 | F004, F018, F019, F024 |

## Change Request Plans

| Plan | Title | Steps | Dependencies | CRs Covered |
|------|-------|-------|--------------|-------------|
| [PLAN_CR001](PLAN_CR001.md) | Change Requests Batch 1 | 14 | PHASE-01 through PHASE-06 (existing codebase) | CR-01 to CR-10 |
| [PLAN_CR002](PLAN_CR002.md) | Change Requests Batch 2 | 18 | PLAN_CR001 (existing codebase) | CR-11 to CR-30 |
| [PLAN_CR003](PLAN_CR003.md) | Spec Corrections Batch 3 | 5 | PLAN_CR002 (documentation-only) | CR-31, CR-34, CR-36, CR-37 |

## Module-to-Phase Mapping

| Module | Phase(s) |
|--------|----------|
| M001 (AuthModule) | PHASE-01, PHASE-06 |
| M002 (WardDataModule) | PHASE-01, PHASE-02 |
| M003 (SpeechModule) | PHASE-03 |
| M004 (AgendaModule) | PHASE-04 |
| M005 (NotificationModule) | PHASE-05 |
| M006 (SyncEngine) | PHASE-05 |
| M007 (OfflineManager) | PHASE-05 |
| M008 (UIShell) | PHASE-01, PHASE-03 |

## Parallel Execution Strategy

```
PHASE-01 (Foundation)
  |
  ├── PHASE-02 (Core Data)
  |     |
  |     ├── PHASE-03 (Speech Lifecycle) ──> PHASE-04 (Agenda)
  |     |                                          |
  |     |                                  PHASE-05 (Infrastructure)
  |     |
  |     └── PHASE-06 (Admin & Polish)  [can run parallel with PHASE-03]
  |
```

- PHASE-06 can start after PHASE-02, running parallel with PHASE-03/04/05
- Within each phase, parallelizable steps are marked

## Implementation Order Strategy

```yaml
order: "Foundation -> Core Data -> Happy path (Speech) -> Agenda -> Infrastructure -> Admin/Polish"
commit_strategy: "1 commit per step, conventional commit messages (feat:, fix:, chore:, test:)"
test_strategy: "Test created alongside or before code (TDD when practical); Vitest for unit + integration"
```

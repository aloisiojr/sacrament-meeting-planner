# ARCH_M004 - AgendaModule

```yaml
type: arch
version: 1
status: complete
module: AgendaModule
features: [F012, F016]
```

## Overview

```yaml
goal: "Manage the full sacrament meeting agenda per sunday and provide a read-only Presentation Mode"
principles:
  - "Lazy creation: agenda record created when sunday is opened in Agenda tab"
  - "Auto-save on every field change (no explicit Save)"
  - "Two layouts: normal meeting (4 sections) and special meeting (3 sections)"
  - "Presentation Mode is purely read-only; data comes from configured agenda"
```

## Diagram

```
┌───────────────────────────────────────────┐
│             Agenda Tab                     │
│  ┌──────────────────────────────────┐     │
│  │ SundayAgendaCard (expandable)    │     │
│  │  ├─ Welcome & Announcements      │     │
│  │  ├─ Designations & Sacrament     │     │
│  │  ├─ Speeches 1+2 (or Special)    │     │
│  │  └─ Last Speech (normal only)    │     │
│  └──────────────────────────────────┘     │
└─────────────────┬─────────────────────────┘
                  │
                  ▼
┌───────────────────────────────────────────┐
│  TanStack Query                           │
│  sunday_agendas + speeches (JOIN by date) │
└─────────────────┬─────────────────────────┘
                  │
                  ▼
┌───────────────────────────────────────────┐
│  Presentation Mode (read-only)            │
│  Accordion cards: 1 expanded at a time    │
│  All collapsed cards always visible       │
└───────────────────────────────────────────┘
```

## Components

| # | Component | Responsibility | Dependencies |
|---|-----------|----------------|--------------|
| 1 | AgendaTab | Infinite scroll list of all sundays; excluded sundays (Gen Conf/Stake Conf/Other) show as non-expandable cards with yellow exception label | TanStack Query |
| 2 | AgendaForm | Full agenda form with 4 sections (normal) or 3 sections (special) | Field selectors, SpeechModule |
| 3 | ActorSelectorField | Inline selector for meeting actors filtered by role | useActors hook |
| 4 | HymnSelectorField | Search by number or title; sacramental filter for sacrament hymn | HymnsCatalog |
| 5 | PrayerSelectorField | Select member from list OR type custom name | useMembers hook |
| 6 | PresentationMode | Full-screen read-only accordion with smooth animations | AgendaData, react-native-reanimated |
| 7 | AccordionCard | Expandable card: 1 open at a time, collapsed cards pinned top/bottom | react-native-reanimated |

## Contracts

### AgendaService

```typescript
// hooks/useAgenda.ts
function useAgenda(sundayDate: Date): UseQueryResult<SundayAgenda>;
function useLazyCreateAgenda(): UseMutationResult<SundayAgenda, Error, Date>;
function useUpdateAgenda(): UseMutationResult<SundayAgenda, Error, Partial<SundayAgenda>>;
```

### PresentationModeService

```typescript
// hooks/usePresentationMode.ts
function usePresentationData(sundayDate: string): UseQueryResult<PresentationData>;
function isTodaySunday(): boolean;
function getTodaySundayDate(): string;  // Returns YYYY-MM-DD for today if Sunday
function buildPresentationCards(agenda, speeches, language): PresentationCard[];

// lib/dateUtils.ts (used by PresentationMode for date header)
function formatFullDate(dateStr: string, language: string): string;
// Returns localized full date, e.g.:
//   pt-BR: "Domingo, 15 de Fevereiro de 2026"
//   en:    "Sunday, February 15, 2026"
//   es:    "Domingo, 15 de Febrero de 2026"
```

### AgendaForm Types

```typescript
interface SundayAgenda {
  id: string;
  wardId: string;
  sundayDate: Date;
  // Welcome
  presidingName: string | null;
  presidingActorId: string | null;
  conductingName: string | null;
  conductingActorId: string | null;
  recognizedNames: string[] | null;
  announcements: string | null;
  pianistName: string | null;
  conductorName: string | null;
  openingHymnId: string | null;
  openingPrayerMemberId: string | null;
  openingPrayerName: string | null;
  // Designations & Sacrament
  sustainingReleasing: string | null;
  hasBabyBlessing: boolean;
  babyBlessingNames: string | null;
  hasBaptismConfirmation: boolean;
  baptismConfirmationNames: string | null;
  hasStakeAnnouncements: boolean;
  sacramentHymnId: string | null;
  // Speeches
  hasSpecialPresentation: boolean;
  specialPresentationDescription: string | null;
  intermediateHymnId: string | null;
  // Closing
  closingHymnId: string | null;
  closingPrayerMemberId: string | null;
  closingPrayerName: string | null;
}
```

## Data Model

```yaml
tables:
  sunday_agendas:
    columns: [id, ward_id, sunday_date, presiding_name, presiding_actor_id,
              conducting_name, conducting_actor_id, recognized_names,
              announcements, pianist_name, pianist_actor_id,
              conductor_name, conductor_actor_id,
              opening_hymn_id, opening_prayer_member_id, opening_prayer_name,
              sustaining_releasing, has_baby_blessing, baby_blessing_names,
              has_baptism_confirmation, baptism_confirmation_names,
              has_stake_announcements, sacrament_hymn_id,
              has_special_presentation, special_presentation_description,
              intermediate_hymn_id,
              closing_hymn_id, closing_prayer_member_id, closing_prayer_name,
              created_at, updated_at]
    unique: [(ward_id, sunday_date)]
    rls: "ward_id = auth.jwt().app_metadata.ward_id"
    notes:
      - "Speeches come from speeches table via JOIN on (ward_id, sunday_date)"
      - "Actor snapshots (name) stored alongside FK"
      - "Meeting type determined by sunday_exceptions table"
```

## Flows

### Agenda Configuration Flow

```
1. User opens Agenda tab -> infinite scroll of sundays
2. Sundays with Gen Conf / Stake Conf / Other are excluded
3. User clicks sunday -> lazy creation of sunday_agendas record (all null)
4. Form renders based on meeting type:
   a. Normal (Discursos): 4 sections
   b. Special (Testimony/Ward Conf/Primary): 3 sections
5. Each field change auto-saves via mutation
6. Actor selections store snapshot name + FK
7. Hymn selections store FK reference
8. Prayer selections: member -> snapshot name + member FK; custom -> name only
```

### Presentation Mode Flow

```
1. On Sunday, Home tab shows "Start Sacrament Meeting" button
2. User taps -> full-screen PresentationMode opens
3. Date header shows formatFullDate(sundayDate, wardLanguage)
4. Data loaded from sunday_agendas + speeches for today
5. Accordion cards rendered (4 or 3 depending on meeting type)
6. Welcome section expanded by default
7. Tap collapsed card -> previous collapses, tapped expands
8. All fields read-only; close button in header
```

## Permission Exception

```yaml
rule: "In the Agenda tab, BOTH Bishopric AND Secretary can assign speakers"
context: "Unlike the Speeches tab (where only Bishopric can assign), the Agenda tab allows Secretary to assign speakers directly"
status_on_assign: "assigned_confirmed (automatic, since invitation flow is bypassed)"
topic_visibility: "Topic is NOT visible or editable in the Agenda tab"
```

## ADRs

```yaml
adrs:
  - id: ADR-006
    title: "Speeches referenced by date JOIN instead of FK in agenda"
    context: "Speeches can be assigned from both Speeches tab and Agenda tab; agenda needs speeches data"
    decision: "JOIN speeches via (ward_id, sunday_date) instead of storing speech FKs in agenda"
    consequences:
      - "Single source of truth for speeches"
      - "Changes in either tab automatically reflected"
```

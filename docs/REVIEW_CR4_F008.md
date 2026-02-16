# REVIEW_CR4_F008 - Agenda & Actors Enhancements

```yaml
type: review
version: 1
verdict: APPROVED
features: [CR-71, CR-72, CR-73, CR-74, CR-75]
files_reviewed:
  - src/hooks/useActors.ts (MODIFIED)
  - src/components/ActorSelector.tsx (MODIFIED)
  - src/components/AgendaForm.tsx (MODIFIED)
  - src/components/PrayerSelector.tsx (MODIFIED)
  - src/app/(tabs)/agenda.tsx (MODIFIED)
  - supabase/functions/create-invitation/index.ts (MODIFIED)
  - supabase/functions/update-user-role/index.ts (MODIFIED)
  - src/i18n/locales/pt-BR.json (MODIFIED)
  - src/i18n/locales/en.json (MODIFIED)
  - src/i18n/locales/es.json (MODIFIED)
  - docs/specs/SPEC_CR4_F008.md
  - docs/arch/ARCH_CR4_F008.md
  - docs/plan/PLAN_CR4_F008.md
  - src/__tests__/cr004-f008-agenda-actors.test.ts
```

## Verdict: APPROVED

All 5 CRs (71-75) correctly implemented.

## Checklist Results

### 1. CR-71: Remove Auto-Preside Rule -- Correct

- `enforceActorRules` in useActors.ts returns input unchanged (identity function)
- JSDoc updated: no mention of auto-enforce
- `handleAdd` in ActorSelector.tsx: `can_preside: roleFilter === 'can_preside'` -- no longer auto-set when roleFilter is 'can_conduct'
- Creating/updating actors with independent can_preside and can_conduct flags works correctly

### 2. CR-72: Auto-Add Bishopric Actors -- Correct

- create-invitation Edge Function: after successful invitation insert, if `input.role === 'bishopric'`, inserts into `meeting_actors`
- Actor name derived from email local part with capitalization
- Uses ON CONFLICT handling to avoid duplicates
- Non-bishopric invitations do NOT trigger actor creation
- Actor creation is best-effort (does not block invitation)
- update-user-role Edge Function: auto-creates actor when changing role TO bishopric

### 3. CR-73: Recognizing Uses ActorSelector -- Correct

- AgendaForm.tsx: Recognizing field uses ActorSelector with `roleFilter='can_recognize'`
- `setSelectorModal({ type: 'actor', field: 'recognizing', roleFilter: 'can_recognize' })` on tap
- DebouncedTextInput replaced with SelectorField that opens ActorSelector
- Actor selection updates recognized_names array

### 4. CR-74: Custom Prayer Names -- Correct

- AgendaForm.tsx: Prayer fields use PrayerSelector component
- PrayerSelector supports custom name entry
- When custom name: prayer_name set, member_id = null
- When member selected: both prayer_name and member_id set correctly
- Custom prayer names NOT persisted as new members
- PrayerSelector custom name hint uses i18n

### 5. CR-75: Non-Expandable Conference Cards -- Correct

- agenda.tsx: Filter for excluded sundays REMOVED -- all sundays appear
- `expandable` prop: `!exception || !isExcludedFromAgenda(exception.reason)`
- Non-expandable cards: no chevron, onPress does not trigger expansion, no AgendaForm rendered
- Conference cards (gen_conf, stake_conf) shown as non-expandable
- Testimony meeting and normal sundays remain expandable
- scrollToIndex updated to account for new list items

### 6. Tests -- Correct

- Tests verify enforceActorRules pass-through
- Tests verify ActorSelector handleAdd independence
- Tests verify auto-actor creation on bishopric invite
- Tests verify recognizing field uses ActorSelector
- Tests verify PrayerSelector custom name handling
- Tests verify non-expandable conference cards

## Summary

| Area | Status |
|------|--------|
| Auto-preside removal (CR-71) | PASS |
| Auto-add bishopric actors (CR-72) | PASS |
| Recognizing ActorSelector (CR-73) | PASS |
| Custom prayer names (CR-74) | PASS |
| Non-expandable conference cards (CR-75) | PASS |
| Security | PASS |
| Tests | PASS |

**APPROVED** -- all agenda and actor enhancements correct.

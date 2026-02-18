# F002 - Multi-tenancy & Ward Management

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-021 | Any user | complete data isolation between Wards | privacy is guaranteed |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-040 | authenticated user | request to backend | filtered by ward_id; cross-ward -> 403 + log |
| AC-008 | cross-ward access attempt | API request | 403 Forbidden + security log |

## Edge Cases

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC-008 | User tries to access another Ward's data | 403 Forbidden + security log |

## Data Model

### wards
| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | Ward identifier |
| name | text NOT NULL | Ward name |
| stake_name | text NOT NULL | Stake name |
| language | text NOT NULL DEFAULT 'pt-BR' | Language (pt-BR, en, es) |
| timezone | text NOT NULL DEFAULT 'America/Sao_Paulo' | IANA timezone |
| whatsapp_template | text NOT NULL | Editable message template |
| created_at / updated_at | timestamptz | Timestamps |

**Unique:** `(stake_name, name)`

## Technical Notes
- Row-Level Security (RLS) on all tables with ward_id
- Users have ward_id in auth.users.app_metadata
- All queries filtered by ward_id from authenticated user
- Backend validates ward_id match on every request
- TLS in transit; encrypted at rest

## Timezone Selector UI

The timezone selector screen (`settings/timezone.tsx`) allows the ward to configure its IANA timezone:

- **Header:** Back button (top-left, `common.back`), screen title (`timezoneSelector.title`)
- **Current timezone:** Highlighted section showing the ward's current timezone
- **Search field:** Text input for filtering the timezone list (case-insensitive substring match)
- **Timezone list:** Scrollable FlatList of IANA timezone strings covering major regions:
  - Americas: Sao_Paulo, New_York, Chicago, Los_Angeles, Mexico_City, Buenos_Aires, etc.
  - Europe: London, Paris, Berlin, Madrid, Lisbon, Moscow, etc.
  - Asia: Tokyo, Shanghai, Singapore, Dubai, Kolkata, etc.
  - Africa: Cairo, Johannesburg, Lagos, Nairobi
  - Oceania: Sydney, Auckland, Perth, etc.
- **Selection behavior:**
  - Tapping a timezone different from current: saves to ward record, navigates back
  - Tapping the currently selected timezone: navigates back without saving (no-op)
  - Save failure: error alert, user stays on screen
- **Default timezone by language:** pt-BR -> America/Sao_Paulo, en -> America/New_York, es -> America/Mexico_City

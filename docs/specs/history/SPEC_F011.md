# F011 - Real-time Sync

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-017 | Any user | sync between tabs in < 5s | up-to-date information |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-030 | change in any tab | navigates to another | change reflected in < 5 seconds |

## Synced Data
- Create/edit/delete members
- Create/edit/delete topics
- Mark/remove sunday exceptions
- Assign/remove speakers
- Change speech status
- Agenda changes

## Technical Notes
- Supabase Realtime (WebSocket) as primary mechanism
- Polling fallback (2-3 second interval)
- TanStack Query for server state management
- Granularity: only changed data should be updated (not full reload)
- No manual reload needed by user

# F019 - Activity Log (History)

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-HIST-001 | Bishopric/Secretary | view history of all ward actions with search | track who did what and when |
| US-HIST-002 | Bishopric/Secretary | search history by date, email, or description | find specific action quickly |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-HIST-001 | Bishopric/Secretary in Settings | sees cards | "History" card visible |
| AC-HIST-002 | Observer in Settings | sees cards | "History" card NOT visible |
| AC-HIST-003 | clicks History card | screen opens | list of entries sorted by datetime descending (most recent first) |
| AC-HIST-004 | in history screen | types in search field | filters real-time on 3 fields (datetime, email, description); case-insensitive, accent-insensitive |
| AC-HIST-005 | any action that persists to DB | action executed | entry created in activity_log with datetime, user email, readable description |
| AC-HIST-006 | automatic system action (auto-assignment, lazy creation) | action executed | NO entry created in activity_log |
| AC-HIST-007 | history entry with long description | rendered | description displayed in multiple lines (no truncation) |
| AC-HIST-008 | history entry | tries to edit or delete | no edit/delete controls (read-only) |
| AC-HIST-009 | entry older than 2 years | retention job executes | entry automatically removed |

## Logged Actions

### Members
- member:create, member:update, member:delete, member:import

### Topics
- topic:create, topic:update, topic:delete

### Collections
- collection:activate, collection:deactivate

### Sunday Type
- sunday_type:change

### Speeches
- speech:assign, speech:unassign, speech:status_change

### Users
- user:self_register, user:invite, user:register_via_invite, user:role_change, user:delete

### Settings
- settings:language, settings:timezone, settings:whatsapp_template

### Agenda
- agenda:edit, actor:create, actor:update, actor:delete

### NOT Logged (automatic)
- Auto-assignment of sunday type
- Lazy creation of speeches/agendas
- Push notification processing (cron)
- Push token registration
- Invalid token cleanup

## Edge Cases

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC-HIST-001 | History with many entries (thousands) | Pagination/infinite scroll; acceptable performance via index (ward_id, created_at DESC) |
| EC-HIST-002 | Search with no results | Message "No results found" |
| EC-HIST-003 | Action executed offline | Log created when mutation syncs with server (not at offline moment) |
| EC-HIST-004 | Ward language changes after logged actions | Old descriptions remain in original language (snapshot); new actions use new language |
| EC-HIST-005 | Retention job executed | Entries with created_at < now() - 2 years removed; newer entries intact |

## Technical Notes
- Table: activity_log with index (ward_id, created_at DESC)
- Retention: 2 years, automatic removal via cron or database job
- Read-only: entries never edited or manually deleted
- Description: readable text in ward language at time of action (snapshot)
- Log generated at application level (frontend or Edge Function), not via DB triggers
- Search field: filters datetime, email, description; debounce 200-300ms; case-insensitive, accent-insensitive
- Entry display: datetime (YYYY-MM-DD HH:MM in ward timezone), email, description (multiline)
- Visible to: Bishopric and Secretary (permission history:read); Observer does NOT see

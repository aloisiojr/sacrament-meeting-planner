# F023 - Permissions & Role-based Access

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-022 | Any user | authentication with roles and password manager support | access is controlled |

## Roles

| Role | Description |
|------|-------------|
| Bishopric | Bishop + 2 Counselors (3 per ward). Strategic decisions - assign speakers/topics, change status, manage users, invite by link |
| Secretary | 1 per ward. Executes bishopric decisions - manage members, topics, exceptions, change status, WhatsApp invites, invite by link |
| Observer | Read-only members. View speeches and assignments without editing. No Settings tab access |

## Permission Matrix

| Permission | Bishopric | Secretary | Observer |
|------------|-----------|-----------|----------|
| Assign speakers/topics | Yes | No | No |
| Change speech status | Yes | Yes | No |
| Remove assignment | Yes | No | No |
| Member CRUD | Yes | Yes | No |
| Ward topic management | Yes | Yes | No |
| Toggle collections | Yes | Yes | No |
| Sunday type dropdown | Yes | Yes | No (visible, disabled) |
| WhatsApp invite management | No | Yes | No |
| Ward language config | Yes | Yes | No |
| User CRUD | Yes | No | No |
| Invite users (link) | Yes | Yes | No |
| View History | Yes | Yes | No |
| View Home (3 sundays) | Yes | Yes | Yes (read-only) |
| View Speeches tab | Yes | Yes | Yes (read-only) |
| Access Settings tab | Yes | Yes | No |
| See "Next assignments" | Yes | No | No |
| See "Invitation management" | No | Yes | No |
| Visual theme toggle | Yes | Yes | System only |
| Edit meeting agenda | Yes | Yes | No (read-only) |
| Assign speaker via Agenda | Yes | Yes | No |
| View Agenda tab | Yes | Yes | Yes (read-only) |
| Start Presentation Mode | Yes | Yes | Yes (read-only) |
| Receive push notifications | Yes | Yes | No |

## Permission Exception
- In Agenda tab, BOTH Bishopric AND Secretary can assign speakers (unlike Speeches tab where only Bishopric can)

## Technical Notes
- Permission model defined in `lib/permissions.ts`
- Roles stored in auth.users.app_metadata.role
- Frontend: conditional UI based on role
- Backend: RLS policies enforce permissions
- Edge Functions validate role and ward_id of caller

```typescript
type Role = 'bishopric' | 'secretary' | 'observer';

type Permission =
  | 'speech:assign' | 'speech:unassign' | 'speech:change_status'
  | 'member:read' | 'member:write' | 'member:import'
  | 'topic:write' | 'collection:toggle' | 'sunday_type:write'
  | 'settings:access' | 'settings:language' | 'settings:whatsapp' | 'settings:users'
  | 'invite:manage' | 'home:next_assignments' | 'home:invite_mgmt'
  | 'agenda:read' | 'agenda:write' | 'agenda:assign_speaker'
  | 'presentation:start'
  | 'push:receive'
  | 'invitation:create'
  | 'history:read';
```

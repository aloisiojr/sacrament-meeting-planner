# F018 - User Management (CRUD)

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-023 | Bishopric | list, edit role, and remove users; invite users by link | manage access |
| US-REG-002 | Bishopric/Secretary | generate invitation link for new users | new users can register securely |
| US-REG-004 | Bishopric/Secretary | resend invitation to same email | user receives new link if previous expired |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-042 | Bishopric/Secretary in Settings > Users | fills email and role, clicks Invite | invitation generated with deep link; link copied/shared |
| AC-REG-007 | Bishopric/Secretary in Users | clicks Invite, fills email and role | invitation created; deep link generated and copied/shared |
| AC-REG-012 | Bishopric/Secretary | resends invitation for existing email | new invitation created with new token; previous remains (if unused) |

## User List
- Card "Users" visible only for Bishopric (permission `settings:users`)
- Secretary and Observer do NOT see the card
- Note: Secretary can invite users via "Invite" button visible elsewhere (permission `invitation:create`)
- Lists all ward users with email and role, sorted by creation date
- Expandable card showing: email (read-only), role selector, "Remove" button
- Own user: role selector disabled, remove button hidden

## Invite User
- Button "Invite" replaces direct create-user form
- On click: form with Email (required) and Role (dropdown: Bishopric, Secretary, Observer)
- On confirm: Edge Function `create-invitation` generates token + deep link
- Deep link copied to clipboard AND/OR opens OS sharing sheet
- Deep link format: `wardmanager://invite/{token}`
- Expiration: 30 days
- Resend allowed: new invitation for same email generates new token
- Who can invite: Bishopric AND Secretary (permission `invitation:create`)

## Edit Role
- Role selector: changes via Edge Function `update-user-role`
- Cannot change own role
- Changing last Bishopric: special warning

## Remove User
- Confirmation dialog: "Remove [email]?"
- Cannot remove self
- Removal via Edge Function `delete-user` (hard delete)
- Removed user logged in on another device: 401 on next request

## Edge Cases

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC-CR003-1 | Bishopric tries to remove self | Action blocked (button hidden) |
| EC-CR003-2 | Last Bishopric changed | Special warning before confirming |
| EC-CR003-3 | Bishopric tries to change own role | Selector disabled |
| EC-CR003-4 | User removed while logged in | Next action fails; redirected to login |
| EC-CR003-5 | Email already exists | Error "This email is already in use" |
| EC-CR003-6 | Remove/edit user offline | Error "Requires connection"; action NOT queued |
| EC-REG-005 | Resend invitation for same email | New invitation with new token; previous remains |

## Technical Notes
- 6 Edge Functions: register-first-user, create-invitation, register-invited-user, list-users, update-user-role, delete-user
- User info stored in auth.users.app_metadata: { ward_id, role }
- Role editing: only role field. Email/password NOT editable
- User removal: hard delete from Supabase Auth

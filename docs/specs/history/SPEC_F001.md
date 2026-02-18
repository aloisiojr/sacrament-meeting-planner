# F001 - Authentication & Session Management

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-022 | Any user | authenticate with email/password with password manager support | access is controlled |
| US-REG-001 | New user | create account as first user of a ward (self-registration) | I can start using the app without CLI |
| US-REG-003 | Invited user | register using an invitation link | I access the ward with the correct role |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-041 | unauthenticated user | accesses any screen | redirected to login |
| AC-CR024-1 | login screen in pt-BR | rendered | title: "Gerenciador da Reuniao Sacramental", subtitle: "discursos e agenda" |
| AC-CR025-1 | password manager active (iOS) | opens login | keyboard shows autofill suggestion |
| AC-CR025-2 | password manager active (Android) | opens login | system offers autofill |
| AC-REG-001 | login screen | clicks "Create account for first user of a Ward" | navigates to self-registration screen |
| AC-REG-002 | self-registration screen | fills all valid fields and clicks Create | ward created + user created + auto-login + redirects to Home |
| AC-REG-003 | self-registration | stake+ward combination already exists | error "This Stake and Ward combination already exists" |
| AC-REG-004 | self-registration | email already exists | error "This email is already in use" |
| AC-REG-005 | self-registration | password < 6 chars | validation prevents submission |
| AC-REG-006 | self-registration | passwords don't match | validation prevents submission |
| AC-REG-008 | deep link wardmanager://invite/{token} | user opens | invite registration screen with read-only data (stake, ward, role, email) |
| AC-REG-009 | invite registration screen | fills valid password and clicks Create Account | user created + used_at filled + auto-login + redirects to Home |
| AC-REG-010 | invite registration | token expired (> 30 days) | error "Invitation expired. Request a new invitation." |
| AC-REG-011 | invite registration | token already used (used_at != null) | error "This invitation has already been used." |

## Edge Cases

| ID | Case | Expected Behavior |
|----|------|-------------------|
| EC-REG-001 | Self-registration with existing email | Error "This email is already in use" |
| EC-REG-002 | Self-registration with existing stake+ward combo | Error "This Stake and Ward combination already exists" |
| EC-REG-003 | Expired invitation (> 30 days) | Error "Invitation expired. Request a new invitation." |
| EC-REG-004 | Already used invitation | Error "This invitation has already been used." |
| EC-REG-006 | Deep link with invalid/nonexistent token | Generic error "Invalid invitation." |
| EC-REG-007 | Self-registration offline | Error "Requires connection"; action NOT queued |
| EC-REG-008 | Invite registration offline | Error "Requires connection"; action NOT queued |

## Technical Notes
- Login screen fields: `textContentType="emailAddress"`, `autoComplete="email"` for email; `textContentType="password"`, `autoComplete="password"`, `secureTextEntry` for password
- Self-registration fields: Email, Password (min 6), Confirm Password, Stake (free text), Ward (free text), Role (dropdown: Bishopric/Secretary, no Observer), Language (pt-BR/en/es), Timezone (auto-detect, editable, IANA format)
- Edge Functions: `register-first-user`, `register-invited-user`
- Deep link scheme: `wardmanager://invite/{token}` via expo-linking
- i18n: login title/subtitle and self-registration messages in pt, en, es

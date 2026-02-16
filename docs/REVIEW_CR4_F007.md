# REVIEW_CR4_F007 - Auth Fixes: Users Screen + Forgot Password

```yaml
type: review
version: 1
verdict: APPROVED
features: [CR-64, CR-67]
files_reviewed:
  - supabase/functions/list-users/index.ts (MODIFIED)
  - src/app/(tabs)/settings/users.tsx (MODIFIED)
  - src/app/(auth)/forgot-password.tsx (NEW)
  - src/app/(auth)/login.tsx (MODIFIED)
  - src/i18n/locales/pt-BR.json (MODIFIED)
  - src/i18n/locales/en.json (MODIFIED)
  - src/i18n/locales/es.json (MODIFIED)
  - docs/specs/SPEC_CR4_F007.md
  - docs/arch/ARCH_CR4_F007.md
  - docs/plan/PLAN_CR4_F007.md
  - src/__tests__/cr004-f007-auth-fixes.test.ts
```

## Verdict: APPROVED

Both auth fixes correctly implemented.

## Checklist Results

### 1. CR-64: Users Screen Fix -- Correct

- list-users Edge Function permission check: `!['bishopric', 'secretary'].includes(userRole)` -- secretary now allowed
- Users screen error handling improved with i18n messages
- Error view includes retry button
- Empty users list shows noUsers message

### 2. CR-67: Forgot Password -- Correct

- New file `src/app/(auth)/forgot-password.tsx` created
- Screen renders: title, description, email input, send button
- Email input trims whitespace before submission
- Empty email shows validation error without calling API
- Button calls `supabase.auth.resetPasswordForEmail(email.trim())`
- During request: button shows ActivityIndicator, is disabled
- On success: shows success message with back to login link
- On error: shows error message
- Screen respects current theme via ThemeContext

### 3. Login Screen Integration -- Correct

- "Forgot password?" link added between Login button and Create Account
- Tapping navigates to `/(auth)/forgot-password` via `router.push`
- Style follows existing createAccountLink pattern

### 4. i18n Keys -- Correct

- Keys added: `auth.forgotPassword`, `auth.forgotPasswordTitle`, `auth.forgotPasswordDescription`, `auth.sendResetEmail`, `auth.resetEmailSent`, `auth.resetFailed`, `auth.backToLogin`
- All translated in pt-BR, en, es

### 5. Security -- Correct

- `resetPasswordForEmail` is a standard Supabase Auth method
- No user data exposed in error messages
- Rate limiting handled server-side by Supabase

### 6. Tests -- Correct

- Tests verify list-users allows secretary
- Tests verify forgot password screen functionality
- Tests verify login screen integration

## Summary

| Area | Status |
|------|--------|
| list-users secretary fix (CR-64) | PASS |
| Users screen error handling (CR-64) | PASS |
| Forgot password screen (CR-67) | PASS |
| Login screen integration (CR-67) | PASS |
| i18n keys (3 languages) | PASS |
| Security | PASS |
| Tests | PASS |

**APPROVED** -- both auth fixes correct.

# Reset-password: surface real send errors (error visibility)

## Problem / intent
The "Reset Password" screen shows a generic "Failed to send reset email" for every failure
because `handleSendReset`'s `catch` discards the underlying error. When the `send-reset-email`
edge function fails (e.g. Resend rejects the send), there is no signal for diagnosis and the user
gets no actionable guidance. This masked a production outage (Resend had no verified domain) until
a user complained. This change improves error visibility WITHOUT weakening anti-enumeration.
(The Resend domain configuration is fixed separately as an ops task.)

## In scope / Out of scope
- **In:** the client handler in `src/app/(auth)/forgot-password.tsx` — capture & log the real
  error; show an actionable, enumeration-safe failure message distinct from success.
- **In:** new behavioral tests for the failure and success paths (supabase client mocked).
- **Out:** Resend domain verification / secret change (ops). Anti-enumeration behavior stays
  (user-not-found still returns success). No redesign of the flow or the email template. No change
  to the edge function's response contract (unless trivially needed for a safe error code).

## Baseline (evidence)
- `src/app/(auth)/forgot-password.tsx` `handleSendReset` (~L38-49): `} catch { setError(t('auth.resetFailed')); }`
  — bare catch, the real error is discarded.
- Reproduced: invoking `send-reset-email` for an external user returns `HTTP 500
  {"error":"Failed to send email"}` (Resend rejected the send). Root cause: Resend has **no
  verified domain** (test mode), so it only delivers to the Resend account owner's address.

## Acceptance criteria (EARS)
- **AC1:** WHEN `supabase.functions.invoke('send-reset-email')` returns an error (FunctionsHttpError
  or network error), the handler SHALL log the underlying error detail (status and/or message) via
  `console.error` for diagnosis.
- **AC2:** WHEN the invoke fails, the screen SHALL display an actionable, enumeration-safe message
  and SHALL NOT show the success state.
- **AC3:** WHEN the invoke succeeds, the screen SHALL show the existing success state unchanged.
- **AC4:** The user-facing text SHALL NOT reveal whether the email is registered (no message that
  differs by account existence).
- **AC5:** Behavioral tests SHALL cover the failure path (error logged + error state set) and the
  success path, with the supabase client mocked.

## Open questions
- ~~OQ1~~ RESOLVED (2026-07-27): use the actionable, enumeration-safe wording — "We couldn't send
  the email right now. Please try again in a few minutes." (new i18n key in all 3 locales).

## Notes
- i18n: any new/changed string must be added to pt-BR, en-US, es-LA.
- No DB/API/schema change → mobile-release-advisor not required.
- Tests: behavioral, mock the supabase client; run with vitest.

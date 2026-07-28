# Plan: Reset-password error visibility   (spec: specs/reset-email-error-visibility.md)

## Reuse (extend, don't recreate)
- `src/app/(auth)/forgot-password.tsx` — `handleSendReset` (~L28-50), the existing error/success
  state and UI. Only the `catch` and the failure message change.
- `src/i18n/locales/{en-US,pt-BR,es-LA}.json` — existing `auth.resetFailed` key (~L62 en-US).
- Existing test conventions that mock `../../lib/supabase` and render with
  `@testing-library/react-native` (mirror the closest existing screen/component test).

## Steps (1 step = 1 commit)
1. **Actionable wording (AC2):** update the `auth.resetFailed` value in all 3 locales to the
   agreed enumeration-safe message ("We couldn't send the email right now. Please try again in a
   few minutes." + pt-BR/es-LA). — covers AC2, AC4.
2. **Log the real error (AC1):** change `} catch {` → `} catch (err) { console.error('Password
   reset request failed:', err); ...}` in `handleSendReset`; keep `setError(t('auth.resetFailed'))`
   and the untouched success path. — covers AC1, AC3, AC4.
3. **Behavioral test (AC5):** new test (e.g. `src/__tests__/forgot-password-error-visibility.test.tsx`)
   — render `ForgotPasswordScreen` with `supabase.functions.invoke` mocked; (a) invoke returns an
   error → asserts `console.error` called AND the error message is shown AND success is NOT shown;
   (b) invoke succeeds → asserts the success state. — covers AC5.

## AC → coverage matrix
| AC  | Step(s) | Test |
|-----|---------|------|
| AC1 | 2       | step-3 failure test asserts console.error |
| AC2 | 1,2     | step-3 failure test asserts message shown |
| AC3 | 2       | step-3 success test |
| AC4 | 1,2     | same message regardless of account existence (review) |
| AC5 | 3       | new behavioral test |

## Risks / deploys
- None. Client-only, no DB/API/deploy. If the project has no existing screen-render test to mirror,
  step 3 sets up the minimal ThemeProvider/i18n/router mocks — verify it runs under vitest.

## Rollback
- `git revert` the commits; purely client-side, nothing deployed.

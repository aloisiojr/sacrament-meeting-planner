# ARCH_CR4_F007 - Auth Fixes: Users Screen Bug + Forgot Password

```yaml
type: arch
version: 1
status: complete
module: AuthModule_Patch
features: [CR-64, CR-67]
spec: SPEC_CR4_F007
```

## Overview

```yaml
goal: "Fix Users screen error for secretary role and implement forgot password flow"
principles:
  - "Edge Function list-users must allow secretary role (matching client-side permission)"
  - "Forgot password uses Supabase's built-in resetPasswordForEmail flow"
  - "New screen follows existing auth screen patterns"
  - "All strings use i18n (no hardcoded English)"
```

## Diagram

```
  CR-64: Users Screen Bug
  ========================

  ┌────────────────┐     ┌──────────────────────┐
  │  users.tsx      │────>│  list-users (EF)      │
  │  (client)       │     │  Permission check:    │
  │  hasPermission  │     │  BEFORE: bishopric    │
  │  already OK     │     │  AFTER:  bishopric    │
  └────────────────┘     │         OR secretary   │
                          └──────────────────────┘

  Root cause: list-users Edge Function checks `userRole !== 'bishopric'`
  but CR-23 already added settings:users to secretary client-side.
  Server rejects secretary calls with 403 -> red "Erro" message.

  Fix: Update permission check in list-users EF + add error handling in client.


  CR-67: Forgot Password
  ========================

  ┌─────────────┐     ┌──────────────────────┐
  │  login.tsx   │────>│  forgot-password.tsx  │
  │  "Forgot?"   │     │  (NEW screen)         │
  │  link        │     │  email input           │
  └─────────────┘     │  resetPasswordForEmail │
                       └───────────┬────────────┘
                                   │
                                   ▼
                       ┌──────────────────────┐
                       │  Supabase Auth        │
                       │  sends reset email    │
                       │  (built-in flow)      │
                       └──────────────────────┘
```

## Components

| # | Component | Responsibility | Changes |
|---|-----------|----------------|---------|
| 1 | list-users Edge Function | List ward users | Fix: allow secretary role |
| 2 | UserManagementScreen | Display ward users | Fix: better error handling, show i18n error |
| 3 | ForgotPasswordScreen (NEW) | Email input + resetPasswordForEmail | New screen at (auth)/forgot-password.tsx |
| 4 | LoginScreen | Login form | Add "Forgot password?" link |

## Contracts

### CR-64: list-users Edge Function Fix

```yaml
problem: |
  Line 63: `if (userRole !== 'bishopric')` rejects secretary.
  Client-side CR-23 already added settings:users to secretary permissions.
  The EF and client are out of sync.

fix:
  file: supabase/functions/list-users/index.ts
  change: |
    // BEFORE (line 62-68):
    if (userRole !== 'bishopric') {
      return new Response(...403...);
    }

    // AFTER:
    const ALLOWED_ROLES = ['bishopric', 'secretary'];
    if (!ALLOWED_ROLES.includes(userRole)) {
      return new Response(...403...);
    }

client_error_handling:
  file: src/app/(tabs)/settings/users.tsx
  change: |
    // The current code shows raw "Erro" text when the query fails.
    // Replace with proper i18n error message and retry button.
    // When usersError is truthy, render:
    <View style={styles.errorContainer}>
      <Text style={[styles.errorText, { color: colors.error }]}>
        {t('users.loadError')}
      </Text>
      <Pressable onPress={() => queryClient.invalidateQueries({ queryKey: userManagementKeys.users })}>
        <Text style={[styles.retryText, { color: colors.primary }]}>
          {t('common.retry')}
        </Text>
      </Pressable>
    </View>
```

### CR-67: Forgot Password Screen

```typescript
// NEW FILE: src/app/(auth)/forgot-password.tsx

interface ForgotPasswordScreenState {
  email: string;
  loading: boolean;
  sent: boolean;
  error: string | null;
}

// Flow:
// 1. User enters email
// 2. Validation: email must not be empty (trimmed)
// 3. Call supabase.auth.resetPasswordForEmail(email.trim())
// 4. On success: show success message, offer "Back to Login" link
// 5. On error: show i18n error message
// 6. Loading state disables button and shows spinner
```

```yaml
screen_layout: |
  ┌────────────────────────────────────┐
  │  ← Back                            │
  │                                    │
  │  t('auth.forgotPasswordTitle')     │
  │                                    │
  │  t('auth.forgotPasswordSubtitle')  │
  │  (explanatory text)                │
  │                                    │
  │  [Email input]                     │
  │                                    │
  │  [Send Reset Email] (button)       │
  │                                    │
  │  // After success:                 │
  │  t('auth.resetEmailSent')          │
  │  [Back to Login] (link)            │
  └────────────────────────────────────┘

navigation:
  from_login: |
    // In login.tsx, add link between Login button and Create Account:
    <Pressable onPress={() => router.push('/forgot-password')}>
      <Text style={[styles.forgotLink, { color: colors.primary }]}>
        {t('auth.forgotPassword')}
      </Text>
    </Pressable>

  back_to_login: |
    // Back button: router.back() or router.replace('/login')
    // After success: offer explicit "Back to Login" link

supabase_integration: |
  const handleReset = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError(t('auth.emailRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      setError(t('auth.resetFailed'));
    } finally {
      setLoading(false);
    }
  };

theme_support: |
  Uses colors from ThemeContext (same as login.tsx).
  Dark/light mode fully supported via existing pattern.

security_note: |
  Supabase returns success even if the email doesn't exist
  (prevents email enumeration). This is correct behavior.
```

## Data Model Changes

```yaml
migrations: none
edge_functions:
  list-users:
    change: "Allow secretary role (add to ALLOWED_ROLES array)"
    impact: "Low -- single permission check change"
  update-user-role:
    change: "Allow secretary role for invoking"
    impact: "Low -- matches CR-23 client permissions"
    note: "Secretary already has settings:users permission client-side (CR-23)"
```

## i18n Keys (new)

```yaml
pt-BR:
  auth.forgotPassword: "Esqueceu a senha?"
  auth.forgotPasswordTitle: "Recuperar Senha"
  auth.forgotPasswordSubtitle: "Digite seu email e enviaremos um link para redefinir sua senha."
  auth.sendResetEmail: "Enviar Email de Recuperacao"
  auth.resetEmailSent: "Email enviado! Verifique sua caixa de entrada para o link de recuperacao."
  auth.resetFailed: "Falha ao enviar email de recuperacao. Tente novamente."
  auth.emailRequired: "Email e obrigatorio."
  auth.backToLogin: "Voltar ao Login"
  users.loadError: "Erro ao carregar usuarios."
  common.retry: "Tentar Novamente"

en:
  auth.forgotPassword: "Forgot password?"
  auth.forgotPasswordTitle: "Reset Password"
  auth.forgotPasswordSubtitle: "Enter your email and we'll send you a link to reset your password."
  auth.sendResetEmail: "Send Reset Email"
  auth.resetEmailSent: "Email sent! Check your inbox for the reset link."
  auth.resetFailed: "Failed to send reset email. Please try again."
  auth.emailRequired: "Email is required."
  auth.backToLogin: "Back to Login"
  users.loadError: "Failed to load users."
  common.retry: "Try Again"

es:
  auth.forgotPassword: "Olvido su contrasena?"
  auth.forgotPasswordTitle: "Recuperar Contrasena"
  auth.forgotPasswordSubtitle: "Ingrese su email y le enviaremos un enlace para restablecer su contrasena."
  auth.sendResetEmail: "Enviar Email de Recuperacion"
  auth.resetEmailSent: "Email enviado! Revise su bandeja de entrada para el enlace de recuperacion."
  auth.resetFailed: "Error al enviar el email de recuperacion. Intente nuevamente."
  auth.emailRequired: "El email es obligatorio."
  auth.backToLogin: "Volver al Login"
  users.loadError: "Error al cargar usuarios."
  common.retry: "Intentar de Nuevo"
```

## Navigation Structure (updated)

```
app/
  (auth)/
    _layout.tsx
    login.tsx             # Add "Forgot password?" link
    register.tsx
    forgot-password.tsx   # NEW
    invite/[token].tsx
```

## File Impact Summary

| File | CRs | Change Type |
|------|-----|-------------|
| `supabase/functions/list-users/index.ts` | CR-64 | Fix: allow secretary role in permission check |
| `supabase/functions/update-user-role/index.ts` | CR-64 | Fix: allow secretary role in permission check |
| `src/app/(tabs)/settings/users.tsx` | CR-64 | Fix: i18n error message + retry button |
| `src/app/(auth)/forgot-password.tsx` | CR-67 | **NEW**: Forgot password screen |
| `src/app/(auth)/login.tsx` | CR-67 | Add "Forgot password?" link |
| `src/i18n/locales/pt-BR.json` | CR-64, CR-67 | Add auth.forgot*, users.loadError, common.retry keys |
| `src/i18n/locales/en.json` | CR-64, CR-67 | Mirror pt-BR |
| `src/i18n/locales/es.json` | CR-64, CR-67 | Mirror pt-BR |

## Risk Assessment

```yaml
risks:
  - id: R-1
    severity: HIGH
    cr: CR-64
    description: "Edge Function list-users rejects secretary role with 403.
      This is a server-side bug that matches the client-side CR-23 fix."
    mitigation: "Simple permission check update. Same pattern as create-invitation
      which already uses ALLOWED_ROLES array."

  - id: R-2
    severity: MEDIUM
    cr: CR-64
    description: "update-user-role Edge Function also restricts to bishopric only.
      Secretary with settings:users permission should also be able to change roles."
    mitigation: "Add secretary to ALLOWED_ROLES in update-user-role EF.
      Keep cannot_change_own_role and cannot_demote_last_bishopric guards."

  - id: R-3
    severity: LOW
    cr: CR-67
    description: "Supabase password reset email depends on email provider configuration"
    mitigation: "Use Supabase's built-in flow. Default email templates work out of the box."

  - id: R-4
    severity: LOW
    cr: CR-67
    description: "Password reset lands on Supabase's web page, not in the app"
    mitigation: "Acceptable for V1. User resets password in browser, returns to app to login."
```

## ADRs

```yaml
adrs:
  - id: ADR-019
    title: "Use Supabase built-in password reset flow"
    context: "Need forgot password feature. Options: (a) Supabase built-in resetPasswordForEmail,
      (b) custom Edge Function + email service, (c) deep link back to app for password change."
    decision: "Use Supabase built-in resetPasswordForEmail. User resets password via web browser."
    consequences:
      - "Simple implementation -- one API call from client"
      - "No custom email templates or Edge Functions needed"
      - "User briefly leaves app to reset password in browser (acceptable)"
```

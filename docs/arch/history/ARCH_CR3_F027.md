# ARCH_CR3_F027 - About Screen + Logout Button

Feature: F027 (CR-32, CR-43)
Modules Affected: M008 (UIShell), M001 (AuthModule)

---

## Overview

Two independent changes to the Settings area:
1. **CR-32:** Add credits and optional support link to the existing About screen.
2. **CR-43:** Add a Sign Out button to the Settings index screen with confirmation dialog.

Both are UI-only changes that leverage existing infrastructure (AuthContext, i18n, expo-constants, Linking).

---

## CR-32: About Screen Enhancement

### Architecture Decision

**Extend existing component** (`about.tsx`). No new files, hooks, or contexts needed.

### Change Plan

**File: `src/app/(tabs)/settings/about.tsx`**

Add two new `infoRow` elements inside the existing `section` View:

1. **Credits row** (always visible):
   - Label: `t('about.credits')` -- "Desenvolvido por" / "Developed by" / "Desarrollado por"
   - Value: `t('about.creditsValue')` -- configurable author name string

2. **Support row** (conditionally rendered):
   - Label: `t('about.support')` -- "Suporte e Feedback" / "Support & Feedback" / "Soporte y Comentarios"
   - Value: `t('about.supportUrl')` -- URL or email string
   - On tap: `Linking.openURL(supportUrl)`
   - Hidden when `supportUrl` is empty string

```typescript
// New import
import { Linking } from 'react-native';

// Inside component, after version row:
const supportUrl = t('about.supportUrl');

// Credits row (always rendered)
<View style={[styles.infoRow, { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}>
  <Text style={[styles.label, { color: colors.textSecondary }]}>
    {t('about.credits')}
  </Text>
  <Text style={[styles.value, { color: colors.text }]}>
    {t('about.creditsValue')}
  </Text>
</View>

// Support row (conditional)
{supportUrl ? (
  <Pressable
    style={[styles.infoRow, { borderTopColor: colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}
    onPress={() => Linking.openURL(supportUrl)}
  >
    <Text style={[styles.label, { color: colors.textSecondary }]}>
      {t('about.support')}
    </Text>
    <Text style={[styles.value, { color: colors.primary }]}>
      {supportUrl}
    </Text>
  </Pressable>
) : null}
```

**Files: `src/i18n/locales/{pt-BR,en,es}.json`**

Add to `about` section:

| Key | pt-BR | en | es |
|-----|-------|----|----|
| `about.credits` | `Desenvolvido por` | `Developed by` | `Desarrollado por` |
| `about.creditsValue` | `Aloísio Jr` | `Aloísio Jr` | `Aloísio Jr` |
| `about.support` | `Suporte e Feedback` | `Support & Feedback` | `Soporte y Comentarios` |
| `about.supportUrl` | `` (empty) | `` (empty) | `` (empty) |

### Component Diagram (after change)

```
AboutScreen
├── Header (back button + title)
└── Section card
    ├── App Name row (existing)
    ├── Version row (existing)
    ├── Credits row (NEW)
    └── Support row (NEW, conditional on non-empty URL)
```

---

## CR-43: Sign Out Button

### Architecture Decision

**Add button to existing Settings index**. No new screen or component needed. Uses existing `AuthContext.signOut()` and `useQueryClient().clear()`.

### Flow

```
User taps "Sair" button
  └─> Alert.alert (confirmation dialog)
      ├─ Cancel → dismiss (no action)
      └─ Confirm → try {
           queryClient.clear()      // Clear TanStack Query cache first
           await signOut()          // AuthContext → supabase.auth.signOut()
         } catch {
           Alert.alert(error)       // Error → stay on Settings
         }
         // signOut clears session → onAuthStateChange fires
         // → NavigationGuard detects session=null → redirects to /(auth)/login
```

### Change Plan

**File: `src/app/(tabs)/settings/index.tsx`**

1. Import `Alert` (already imported).
2. Destructure `signOut` from `useAuth()`: `const { hasPermission, wardId, signOut } = useAuth();`
3. Add sign-out handler:

```typescript
const handleSignOut = useCallback(() => {
  Alert.alert(
    t('settings.signOutTitle'),
    t('settings.signOutMessage'),
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            queryClient.clear();
          } catch {
            Alert.alert(t('common.error'), t('common.error'));
          }
        },
      },
    ]
  );
}, [t, signOut, queryClient]);
```

4. Add button after the last `<View style={styles.section}>` block, inside the `ScrollView`:

```tsx
<Pressable
  style={styles.signOutButton}
  onPress={handleSignOut}
  accessibilityRole="button"
>
  <Text style={[styles.signOutText, { color: colors.error }]}>
    {t('settings.signOut')}
  </Text>
</Pressable>
```

5. Add styles:

```typescript
signOutButton: {
  paddingVertical: 16,
  alignItems: 'center',
  marginHorizontal: 16,
  marginBottom: 32,
},
signOutText: {
  fontSize: 16,
  fontWeight: '600',
},
```

**Files: `src/i18n/locales/{pt-BR,en,es}.json`**

Add to `settings` section:

| Key | pt-BR | en | es |
|-----|-------|----|----|
| `settings.signOut` | `Sair` | `Sign Out` | `Cerrar Sesion` |
| `settings.signOutTitle` | `Sair` | `Sign Out` | `Cerrar Sesion` |
| `settings.signOutMessage` | `Deseja realmente sair?` | `Are you sure you want to sign out?` | `Esta seguro de que desea cerrar sesion?` |

### Auth Flow After Sign Out

```
signOut() → supabase.auth.signOut() → clears local session
  ↓
onAuthStateChange listener (AuthContext.tsx:79) fires with session=null
  ↓
setSession(null) → user=null, role='observer', wardId=''
  ↓
NavigationGuard (_layout.tsx:38) detects !isAuthenticated && !inAuthGroup
  ↓
router.replace('/(auth)/login') → login screen renders
```

No explicit navigation needed after signOut -- the NavigationGuard handles it automatically.

### Edge Cases

- **Network error on signOut:** `supabase.auth.signOut()` clears local session even if server request fails. The catch block shows an error alert but the session is likely already cleared locally. The NavigationGuard will redirect.
- **Back navigation after signOut:** Not possible. The `router.replace()` in NavigationGuard replaces the navigation stack.
- **queryClient.clear():** Must be called after signOut to prevent stale data if a different user logs in on the same device.

---

## File Change Summary

| File | CR | Change Type |
|------|----|-------------|
| `src/app/(tabs)/settings/about.tsx` | CR-32 | Add credits row + conditional support row |
| `src/app/(tabs)/settings/index.tsx` | CR-43 | Add sign-out button + handler |
| `src/i18n/locales/pt-BR.json` | CR-32, CR-43 | Add 4 about keys + 3 settings keys |
| `src/i18n/locales/en.json` | CR-32, CR-43 | Add 4 about keys + 3 settings keys |
| `src/i18n/locales/es.json` | CR-32, CR-43 | Add 4 about keys + 3 settings keys |

**New files:** None
**Deleted files:** None
**New dependencies:** None (`Linking` is from react-native core)

---

## Testing Strategy

- **CR-32:** Verify About screen renders credits row. Verify support row hidden when URL is empty. Verify Linking.openURL called when support row tapped.
- **CR-43:** Verify sign-out button renders for all roles. Verify confirmation dialog appears on tap. Verify signOut called on confirm. Verify queryClient.clear called after signOut. Verify error alert on signOut failure.

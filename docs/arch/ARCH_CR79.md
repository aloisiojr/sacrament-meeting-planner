# ARCH_CR79 - Users Screen Back Button Fix

```yaml
type: arch
version: 1
status: complete
module: UIShell_Patch (M008)
features: [CR-79]
spec: SPEC_CR79
```

## ARCH_SUMMARY

```yaml
type: arch_summary
status: complete
components_count: 1
main_components:
  - "UsersScreen header (back button)"
tech_stack:
  - "React Native (TypeScript)"
  - "Expo Router (useRouter)"
  - "react-i18next"
estimated_iterations: 1
```

## Overview

```yaml
goal: "Add a back button to the Users screen header following the established pattern used by all other settings sub-screens"
principles:
  - "Follow ADR-018 pattern: per-screen back buttons instead of global headerLeft"
  - "Match the 3-element header layout: [Back | Title | Action]"
  - "Style consistency with members.tsx, topics.tsx, etc."
  - "No logic changes, only header restructuring"
```

## Diagram

```
  BEFORE (current):
  ┌──────────────────────────────────────────┐
  │  [Title "Users"]        [Invite button]  │
  └──────────────────────────────────────────┘

  AFTER (fixed):
  ┌──────────────────────────────────────────┐
  │  [Back]    [Title "Users"]    [Invite]   │
  └──────────────────────────────────────────┘

  Pattern source: members.tsx
  ┌──────────────────────────────────────────┐
  │  [Back]    [Title "Members"]    [+ Add]  │
  └──────────────────────────────────────────┘
```

## Components

| # | Component | Responsibility | Change Type |
|---|-----------|----------------|-------------|
| 1 | users.tsx (header) | Users screen header with navigation | MODIFY |

## Contracts

### C1: Users Screen Header Restructure

```yaml
file: src/app/(tabs)/settings/users.tsx

imports_to_add:
  - "import { useRouter } from 'expo-router';"

hook_to_add: |
  const router = useRouter();

header_before: |
  <View style={styles.header}>
    <Text style={[styles.title, { color: colors.text }]}>
      {t('users.title')}
    </Text>
    <Pressable ... onPress={openInviteModal}>
      <Text>{t('users.inviteUser')}</Text>
    </Pressable>
  </View>

header_after: |
  <View style={styles.header}>
    <Pressable onPress={() => router.back()} accessibilityRole="button">
      <Text style={[styles.backButton, { color: colors.primary }]}>
        {t('common.back')}
      </Text>
    </Pressable>
    <Text style={[styles.title, { color: colors.text }]}>
      {t('users.title')}
    </Text>
    <Pressable
      style={[styles.inviteButton, { backgroundColor: colors.primary }]}
      onPress={openInviteModal}
      accessibilityRole="button"
      accessibilityLabel={t('users.inviteUser')}
    >
      <Text style={styles.inviteButtonText}>{t('users.inviteUser')}</Text>
    </Pressable>
  </View>

style_changes:
  title:
    fontSize: "28 -> 22 (match members.tsx)"
  new_style_backButton:
    fontSize: 16
    fontWeight: "'600'"

no_new_i18n_keys: true  # common.back already exists in all 3 languages
no_new_dependencies: true
no_backend_changes: true
```

## Flows

### F1: Back Navigation from Users Screen

```
1. User navigates to Settings > Users
2. Header renders with [Back | Users | Invite] layout
3. User taps "Back" text button
4. router.back() is called
5. User returns to Settings index screen
```

## Security

```yaml
no_security_impact: true
notes:
  - "UI-only change: adds a back button to the header"
  - "No new data access, no backend changes"
  - "Uses the same router.back() pattern as all other settings sub-screens"
```

## File Impact Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/app/(tabs)/settings/users.tsx` | MODIFY | Add useRouter import, add back button Pressable, update title fontSize to 22, add backButton style |

## Risk Assessment

```yaml
risks:
  - id: R-1
    severity: VERY_LOW
    description: "Minimal change: add a Pressable and adjust a style value"
    mitigation: "Same pattern used by 7 other settings sub-screens successfully"
```

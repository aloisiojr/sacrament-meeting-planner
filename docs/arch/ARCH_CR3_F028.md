# ARCH_CR3_F028 - Navigation & UI Conventions

Feature: F028 (CR-33, CR-40)
Modules Affected: M008 (UIShell)

---

## Overview

Two changes to establish navigation and UI consistency:
1. **CR-33:** Define a global back-button convention for all Stack-navigated screens and add the missing back button to the Members screen.
2. **CR-40:** Resolve the add-member "+" button position inconsistency between PRODUCT_SPECIFICATION (says "right of search") and SPEC.final.md (says "FAB at bottom-right"). Align both specs with the actual implementation (header row, right of title).

CR-33 requires one code change (members.tsx) plus a spec rule. CR-40 is spec-only (no code changes).

---

## CR-33: Global Back Button Convention

### Architecture Decision (ADR-018)

**Per-screen back buttons** instead of global `headerLeft`. The Settings Stack layout (`settings/_layout.tsx`) uses `headerShown: false`, so React Navigation's native header is disabled. Each screen implements its own back button inside its custom header. This pattern is already established in 6 screens: about.tsx, whatsapp.tsx, history.tsx, topics.tsx, users.tsx, theme.tsx. The only screen missing a back button is `members.tsx`.

The convention is documented as a spec rule in SPEC.final.md to prevent regressions.

### Existing Back Button Pattern (canonical reference: `about.tsx`)

```tsx
// Header structure (3-element row: back | title | spacer/action)
<View style={styles.header}>
  <Pressable onPress={() => router.back()} accessibilityRole="button">
    <Text style={[styles.backButton, { color: colors.primary }]}>
      {t('common.back')}
    </Text>
  </Pressable>
  <Text style={[styles.title, { color: colors.text }]}>
    {t('screen.title')}
  </Text>
  <View style={styles.headerSpacer} />
</View>

// Styles
backButton: { fontSize: 16, fontWeight: '600' }
header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }
```

All existing screens use the same pattern: `useRouter` + `router.back()` + `t('common.back')` + `styles.backButton` with `{ color: colors.primary }`.

### Change Plan

**File: `src/app/(tabs)/settings/members.tsx`**

1. Add import:
```typescript
import { useRouter } from 'expo-router';
```

2. Add router in component body:
```typescript
const router = useRouter();
```

3. Restructure header from 2-element (title + add button) to 3-element (back + title + add button/spacer):

Current header:
```tsx
<View style={styles.header}>
  <Text style={[styles.title, { color: colors.text }]}>{t('members.title')}</Text>
  {canWrite && (
    <Pressable style={[styles.addButton, ...]} onPress={handleAdd} ...>
      <Text ...>+</Text>
    </Pressable>
  )}
</View>
```

New header:
```tsx
<View style={styles.header}>
  <Pressable onPress={() => router.back()} accessibilityRole="button">
    <Text style={[styles.backButton, { color: colors.primary }]}>
      {t('common.back')}
    </Text>
  </Pressable>
  <Text style={[styles.title, { color: colors.text }]}>{t('members.title')}</Text>
  {canWrite ? (
    <Pressable
      style={[styles.addButton, { backgroundColor: colors.primary }]}
      onPress={handleAdd}
      accessibilityRole="button"
      accessibilityLabel={t('members.addMember')}
    >
      <Text style={[styles.addButtonText, { color: colors.onPrimary }]}>+</Text>
    </Pressable>
  ) : (
    <View style={styles.headerSpacer} />
  )}
</View>
```

4. Add styles:
```typescript
backButton: {
  fontSize: 16,
  fontWeight: '600',
},
headerSpacer: {
  width: 36,  // matches addButton width for visual alignment
},
```

5. Update existing `header` style to add `justifyContent: 'space-between'` (already present) -- no change needed.

### Layout After Change

```
Members screen header:
┌──────────────────────────────────────────┐
│  [Voltar]    Membros            [+]      │
│  (back)      (title)       (add button)  │
└──────────────────────────────────────────┘

When canWrite=false (observer role):
┌──────────────────────────────────────────┐
│  [Voltar]    Membros       [spacer 36px] │
└──────────────────────────────────────────┘
```

**File: `docs/SPEC.final.md`**

Add global rule in section 13 (Requisitos Nao-Funcionais):

```markdown
### Regra de Navegacao: Botao Voltar em Telas Stack

Toda tela acessada via navegacao Stack (sub-telas de Configuracoes e outras telas empilhadas) DEVE ter um botao de voltar no header, seguindo o padrao:
- Posicao: topo-esquerdo do header
- Componente: Pressable com texto usando a chave i18n `common.back`
- Acao: `router.back()` (expo-router)
- Estilo: fontSize 16, fontWeight '600', cor `colors.primary`
- Excecao: telas de tab principal (Home, Agenda, Discursos, Configuracoes) NAO tem botao voltar
- Excecao: Presentation Mode tem seu proprio botao de fechar (SPEC 7.14.5)
```

### Edge Cases

- **Settings index screen:** Tab root, no back button (correct -- EC-33.1).
- **Presentation Mode:** Has its own close button pattern (SPEC 7.14.5), exempt from this convention (EC-33.2).
- **Observer role (canWrite=false):** Back button shows, "+" button hidden. A `headerSpacer` of width 36 maintains visual balance.

---

## CR-40: Add-Member Button Position Spec Alignment

### Architecture Decision

**No code change.** The code already implements the correct pattern: "+" button in header row, to the right of the title. Both spec documents must be updated to match.

### Change Plan

**File: `docs/SPEC.final.md`**

Section 7.4.1 (~line 623):
- From: `Botao FAB (+) no canto inferior direito para adicionar`
- To: `Botao "+" no header, a direita do titulo, para adicionar novo membro`

**File: `docs/PRODUCT_SPECIFICATION.md`**

RF-01 (~line 103):
- From: `E ve botao "+" (a direita do campo de search)`
- To: `E ve botao "+" no header (a direita do titulo da tela)`

Rationale: The "+" is next to the title, not next to search. Search is on a separate row below the header.

### Code Evidence (no changes needed)

Current implementation in `members.tsx` lines 466-477:
```tsx
<View style={styles.header}>
  <Text style={[styles.title, ...]}>{t('members.title')}</Text>
  {canWrite && (
    <Pressable style={[styles.addButton, { backgroundColor: colors.primary }]} ...>
      <Text ...>+</Text>
    </Pressable>
  )}
</View>
```

The button is 36x36px, borderRadius 18, positioned via `flexDirection: 'row'` and `justifyContent: 'space-between'`. Not a FAB.

---

## File Change Summary

| File | CR | Change Type |
|------|----|-------------|
| `src/app/(tabs)/settings/members.tsx` | CR-33 | Add back button + headerSpacer to header |
| `docs/SPEC.final.md` | CR-33 | Add global back-button rule in section 13 |
| `docs/SPEC.final.md` | CR-40 | Fix section 7.4.1: FAB -> header button |
| `docs/PRODUCT_SPECIFICATION.md` | CR-40 | Fix RF-01: "right of search" -> "right of title" |

**New files:** None
**Deleted files:** None
**New dependencies:** None (`useRouter` already available from expo-router)

---

## Testing Strategy

- **CR-33:** Verify Members screen renders a back button in the header. Verify tapping the back button calls `router.back()` and navigates to Settings index. Verify back button uses `t('common.back')` text and `colors.primary` color. Verify "+" add button remains accessible for users with `member:write` permission. Verify `headerSpacer` renders when `canWrite=false`.
- **CR-40:** Verify SPEC.final.md section 7.4.1 no longer references FAB. Verify PRODUCT_SPECIFICATION.md RF-01 says "right of title" not "right of search". Verify both documents are consistent with the implemented code.

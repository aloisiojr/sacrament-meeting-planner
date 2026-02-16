# ARCH_CR3_F029 - Template & Display Fixes

Feature: F029 (CR-35, CR-38)
Modules Affected: M003 (SpeechModule - WhatsApp template), M004 (AgendaModule - Presentation Mode)

---

## Overview

Two independent fixes:
1. **CR-35:** Remove invalid `{duracao}` placeholder from WhatsApp template screen and spec docs.
2. **CR-38:** Replace generic title in Presentation Mode header with localized full date.

---

## CR-35: Remove {duracao} Placeholder

### Architecture Decision

**Simple removal** -- delete `{duracao}` from two constants in `whatsapp.tsx`. No structural changes needed.

### Analysis

The `resolveTemplate()` function in `whatsapp.tsx` (line 40-46) iterates over `SAMPLE_DATA` entries and replaces each key in the template string. When `{duracao}` is removed from `SAMPLE_DATA`, any existing template containing `{duracao}` will simply keep the literal text `{duracao}` in the output -- the `replaceAll` loop will skip it because it is no longer a key in `SAMPLE_DATA`. This is the correct and safe behavior.

### Change Plan

**File: `src/app/(tabs)/settings/whatsapp.tsx`**

1. Remove `'{duracao}'` from `PLACEHOLDERS` array (line 23):

```typescript
// Before:
const PLACEHOLDERS = [
  '{nome}', '{data}', '{posicao}', '{duracao}', '{colecao}', '{titulo}', '{link}',
] as const;

// After:
const PLACEHOLDERS = [
  '{nome}', '{data}', '{posicao}', '{colecao}', '{titulo}', '{link}',
] as const;
```

2. Remove `'{duracao}': '10 min'` from `SAMPLE_DATA` object (line 34):

```typescript
// Before:
const SAMPLE_DATA: Record<string, string> = {
  '{nome}': 'Maria Silva',
  '{data}': '2026-03-01',
  '{posicao}': '1',
  '{duracao}': '10 min',
  '{colecao}': 'Temas da Ala',
  '{titulo}': 'Fe em Jesus Cristo',
  '{link}': 'https://example.com/topic',
};

// After:
const SAMPLE_DATA: Record<string, string> = {
  '{nome}': 'Maria Silva',
  '{data}': '2026-03-01',
  '{posicao}': '1',
  '{colecao}': 'Temas da Ala',
  '{titulo}': 'Fe em Jesus Cristo',
  '{link}': 'https://example.com/topic',
};
```

No changes to `resolveTemplate()` function -- it remains generic and works with whatever keys are in `SAMPLE_DATA`.

**Spec docs** (documentation-only edits):

| File | Change |
|------|--------|
| `docs/SPEC.final.md` (section 7.9, line ~745) | Remove `{duracao}` from placeholder list |
| `docs/specs/SPEC_F024.md` (line ~17) | Remove `{duracao}` from placeholder list |

---

## CR-38: Presentation Mode Header Date

### Architecture Decision

**Replace title text with formatted date using `Intl.DateTimeFormat`**. No new utility functions or i18n keys needed -- `Intl.DateTimeFormat` handles localization natively using the locale string already available via `i18n.language`.

### Change Plan

**File: `src/app/presentation.tsx`**

1. Destructure `i18n` from `useTranslation()`:

```typescript
// Before:
const { t } = useTranslation();

// After:
const { t, i18n } = useTranslation();
```

2. Add formatted date memo after `sundayDate` declaration:

```typescript
const formattedDate = useMemo(() => {
  const date = new Date(sundayDate + 'T12:00:00');
  return date.toLocaleDateString(i18n.language, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}, [sundayDate, i18n.language]);
```

Note: `T12:00:00` is appended to avoid timezone-shift issues when parsing date-only strings. Without it, `new Date('2026-02-15')` is interpreted as midnight UTC, which in negative UTC offsets (e.g., Brazil, UTC-3) would show February 14.

3. Replace header title text:

```tsx
// Before:
<Text style={[styles.headerTitle, { color: colors.text }]}>
  {t('home.startMeeting')}
</Text>

// After:
<Text style={[styles.headerTitle, { color: colors.text }]}>
  {formattedDate}
</Text>
```

### Expected Output by Locale

| Locale | Input | Output |
|--------|-------|--------|
| `pt-BR` | `2026-02-15` | `domingo, 15 de fevereiro de 2026` |
| `en` | `2026-02-15` | `Sunday, February 15, 2026` |
| `es` | `2026-02-15` | `domingo, 15 de febrero de 2026` |

Note: `Intl.DateTimeFormat` on most platforms will lowercase the weekday for pt-BR and es. The existing `headerTitle` style does not apply `textTransform`, so the text will appear as returned by the API. This is acceptable and natural for each language.

### Intl.DateTimeFormat Compatibility

- **React Native (Hermes engine):** Hermes supports `Intl.DateTimeFormat` with full locale support since Hermes 0.12 / React Native 0.73+. Expo SDK 54 uses a compatible version.
- **Web:** All modern browsers support `Intl.DateTimeFormat`.
- **Fallback not needed** for the target platforms.

**Spec docs** (documentation-only edits):

| File | Change |
|------|--------|
| `docs/SPEC.final.md` (section 7.14) | Add header content spec with date format examples per locale |
| `docs/specs/SPEC_F016.md` | Add header date format to technical notes |

---

## File Change Summary

| File | CR | Change Type |
|------|----|-------------|
| `src/app/(tabs)/settings/whatsapp.tsx` | CR-35 | Remove `{duracao}` from PLACEHOLDERS and SAMPLE_DATA |
| `src/app/presentation.tsx` | CR-38 | Replace title with formatted date |
| `docs/SPEC.final.md` | CR-35, CR-38 | Update section 7.9 and 7.14 |
| `docs/specs/SPEC_F024.md` | CR-35 | Remove `{duracao}` from placeholder list |
| `docs/specs/SPEC_F016.md` | CR-38 | Add header date format to technical notes |

**New files:** None
**Deleted files:** None
**New dependencies:** None
**New i18n keys:** None (date formatting uses Intl.DateTimeFormat, not i18n keys)

---

## Testing Strategy

- **CR-35:** Verify PLACEHOLDERS array has exactly 6 items (no `{duracao}`). Verify SAMPLE_DATA has no `{duracao}` key. Verify placeholder chips on screen do not include `{duracao}`. Verify `resolveTemplate` does not crash if template contains `{duracao}` (leaves it as literal text).
- **CR-38:** Verify header displays formatted date instead of "Start Meeting" text. Verify correct format for each locale (pt-BR, en, es). Verify date is based on `sundayDate` from `getTodaySundayDate()`.

# Change Requests Batch 3 - Template & Display Fixes (SPEC_CR3_F029)

Feature: F029 - Template & Display Fixes
Type: BUG fix + SPEC MISSING (code + doc changes)

---

## SPEC_SUMMARY

```yaml
type: spec_summary
goal: "Remove invalid {duracao} placeholder from WhatsApp template system (CR-35) and define Presentation Mode date header format (CR-38)"
in_scope:
  - "CR-35: Remove {duracao} from PLACEHOLDERS constant, SAMPLE_DATA, resolveTemplate, WhatsAppVariables type, and spec docs"
  - "CR-38: Add locale-aware full date formatter (day-of-week + full date) for Presentation Mode header"
  - "CR-38: Define date format in spec for all 3 languages (pt-BR, en, es)"
out_of_scope:
  - "Changes to WhatsApp URL building logic"
  - "Changes to default template text"
  - "Changes to Presentation Mode layout or accordion behavior"
  - "Other placeholder additions or modifications"
  - "Adding a duration column to the speeches table"
main_risks:
  - "CR-35: Existing ward templates containing {duracao} will show the literal text after removal -- users must manually edit their templates"
  - "CR-38: Date formatting must use ward language, not device locale -- incorrect locale source could show wrong language"
ac_count: 14
edge_case_count: 5
has_open_questions: false
has_unconfirmed_assumptions: false
```

---

## CR-35: Remove Invalid {duracao} Placeholder from WhatsApp Template System

- **Type:** BUG
- **Description:** The placeholder `{duracao}` is listed in the WhatsApp template system in multiple locations:
  1. `src/app/(tabs)/settings/whatsapp.tsx` -- PLACEHOLDERS constant (line 23) and SAMPLE_DATA (line 34)
  2. `src/lib/whatsappUtils.ts` -- `resolveTemplate` function (line 33) and `WhatsAppVariables` type (line 20: `duration?: string`)
  3. `docs/SPEC.final.md` -- section 7.9 (line 745)
  4. `docs/specs/SPEC_F024.md` -- placeholder list (line 17)

  However, the `speeches` table does NOT have a `duration` column. Duration is theoretically derived from position (1=5min, 2=10min, 3=15min per PRODUCT_SPECIFICATION section 5.1), but this derivation is not implemented anywhere and is not useful in a WhatsApp invitation message. The correct fix is to remove `{duracao}` entirely.

### Current State (Code Investigation)

**`whatsapp.tsx` (lines 19-37):**
```typescript
const PLACEHOLDERS = [
  '{nome}', '{data}', '{posicao}', '{duracao}', '{colecao}', '{titulo}', '{link}',
] as const;

const SAMPLE_DATA: Record<string, string> = {
  '{nome}': 'Maria Silva',
  '{data}': '2026-03-01',
  '{posicao}': '1',
  '{duracao}': '10 min',   // <-- Invalid: no DB column, no derivation
  '{colecao}': 'Temas da Ala',
  '{titulo}': 'Fe em Jesus Cristo',
  '{link}': 'https://example.com/topic',
};
```

**`whatsappUtils.ts` (lines 13-21, 33):**
```typescript
export interface WhatsAppVariables {
  speakerName: string;
  date: string;
  topic: string;
  position: string;
  collection?: string;
  link?: string;
  duration?: string;   // <-- Invalid field
}
// ...
result = result.replace(/\{duracao\}/g, vars.duration ?? '');  // <-- Resolves to empty string
```

**`whatsappUtils.ts` JSDoc comment (line 2):**
```
 * Template placeholders: {nome}, {data}, {posicao}, {duracao}, {colecao}, {titulo}, {link}
```

### Acceptance Criteria

- AC-35.1: Given the PLACEHOLDERS constant in `whatsapp.tsx`, when listing placeholders, then `{duracao}` is NOT included. The array contains exactly 6 items: `{nome}`, `{data}`, `{posicao}`, `{colecao}`, `{titulo}`, `{link}`. Priority: must.
- AC-35.2: Given the SAMPLE_DATA object in `whatsapp.tsx`, when listing sample values, then `{duracao}` key is NOT present. Priority: must.
- AC-35.3: Given the `WhatsAppVariables` interface in `whatsappUtils.ts`, when reading the type definition, then the `duration` field does NOT exist. Priority: must.
- AC-35.4: Given the `resolveTemplate` function in `whatsappUtils.ts`, when processing a template, then it does NOT attempt to resolve `{duracao}`. The line `result = result.replace(/\{duracao\}/g, ...)` is removed. Priority: must.
- AC-35.5: Given the JSDoc comment at the top of `whatsappUtils.ts`, when reading the placeholder list, then `{duracao}` is NOT mentioned. Priority: must.
- AC-35.6: Given the SPEC.final.md section 7.9, when listing valid placeholders, then `{duracao}` is NOT included. Priority: must.
- AC-35.7: Given the SPEC_F024.md, when listing valid placeholders, then `{duracao}` is NOT included. Priority: must.

### Edge Cases

- EC-35.1: Existing wards that already have `{duracao}` in their custom template stored in the database will see the literal string `{duracao}` in sent WhatsApp messages (not resolved). This is acceptable -- users can manually remove it from their template via the WhatsApp Template settings screen.
- EC-35.2: The default template (`DEFAULT_TEMPLATE_PT_BR` in `whatsappUtils.ts`) does NOT contain `{duracao}`, so no change needed there.
- EC-35.3: The `resolveTemplate` in `whatsappUtils.ts` uses regex `.replace()` which leaves unrecognized placeholders as literal text -- no crash risk from templates containing `{duracao}` after removal.

### Files Impacted

| File | Change Type | Description |
|------|-------------|-------------|
| `src/app/(tabs)/settings/whatsapp.tsx` | Modify | Remove `{duracao}` from PLACEHOLDERS array (line 23) and SAMPLE_DATA object (line 34) |
| `src/lib/whatsappUtils.ts` | Modify | Remove `duration` from WhatsAppVariables interface (line 20); remove `{duracao}` replacement line from resolveTemplate (line 33); update JSDoc comment (line 2) |
| `docs/SPEC.final.md` | Modify | Remove `{duracao}` from section 7.9 placeholder list (line 745) |
| `docs/specs/SPEC_F024.md` | Modify | Remove `{duracao}` from placeholder list (line 17) |

---

## CR-38: Define Presentation Mode Date Header Format

- **Type:** SPEC MISSING
- **Description:** The Presentation Mode header (`src/app/presentation.tsx`) currently shows the translated text of `home.startMeeting` as the title. There is no date displayed in the header. The spec should define a date format and the implementation should show the full date with day-of-week in the header.

### Current State (Code Investigation)

**`presentation.tsx` (lines 70-84):**
```typescript
<View style={[styles.header, { borderBottomColor: colors.divider }]}>
  <Text style={[styles.headerTitle, { color: colors.text }]}>
    {t('home.startMeeting')}
  </Text>
  <Pressable ... onPress={() => router.back()}>
    <Text>{'\u2715'}</Text>
  </Pressable>
</View>
```

No date is displayed. The `sundayDate` variable (line 33) holds the ISO date string but is not shown in the UI.

**`dateUtils.ts`** already has:
- `MONTH_FULL` data (line 16) with full month names for all 3 languages
- `formatDateHumanReadable` function (line 182) that formats "15 de Fevereiro de 2026" / "February 15, 2026" -- but WITHOUT day-of-week name
- `parseLocalDate` function for safe date parsing

A new function extending this pattern with day-of-week names is the correct approach, consistent with the existing codebase style (manual formatting, no Intl dependency).

### Required Changes

#### Change 1: Add day-of-week names to `dateUtils.ts`

Add constant after existing `MONTH_FULL`:
```typescript
const DAY_NAMES: Record<SupportedLanguage, string[]> = {
  'pt-BR': ['Domingo', 'Segunda-feira', 'Terca-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sabado'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  es: ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'],
};
```

Add new exported function:
```typescript
export function formatDateFull(dateStr: string, language: SupportedLanguage = 'pt-BR'): string {
  const d = parseLocalDate(dateStr);
  const dayName = DAY_NAMES[language][d.getDay()];
  const dayNum = d.getDate();
  const month = MONTH_FULL[language][d.getMonth()];
  const year = d.getFullYear();

  switch (language) {
    case 'en':
      return `${dayName}, ${month} ${dayNum}, ${year}`;
    case 'pt-BR':
    case 'es':
    default:
      return `${dayName}, ${dayNum} de ${month} de ${year}`;
  }
}
```

#### Change 2: Display the date in Presentation Mode header

In `presentation.tsx`, replace the title with the formatted date:
```typescript
import { formatDateFull } from '../lib/dateUtils';
import { getCurrentLanguage } from '../i18n';

// Inside component:
const language = getCurrentLanguage();
const formattedDate = useMemo(() => formatDateFull(sundayDate, language), [sundayDate, language]);

// In header:
<Text style={[styles.headerTitle, { color: colors.text }]}>
  {formattedDate}
</Text>
```

### Acceptance Criteria

- AC-38.1: Given the Presentation Mode screen is open, when viewing the header, then the title shows the full formatted date in the ward's configured language (replacing `home.startMeeting` text). Priority: must.
- AC-38.2: Given the ward language is "pt-BR", when viewing the header, then it displays: "Domingo, DD de [Mes por extenso] de YYYY" (e.g., "Domingo, 16 de Fevereiro de 2026"). Priority: must.
- AC-38.3: Given the ward language is "en", when viewing the header, then it displays: "Sunday, [Month] DD, YYYY" (e.g., "Sunday, February 16, 2026"). Priority: must.
- AC-38.4: Given the ward language is "es", when viewing the header, then it displays: "Domingo, DD de [Mes] de YYYY" (e.g., "Domingo, 16 de Febrero de 2026"). Priority: must.
- AC-38.5: Given the date formatting, when generating the formatted date, then it uses a new `formatDateFull` function in `dateUtils.ts` that includes day-of-week name. Priority: must.
- AC-38.6: Given the Presentation Mode is opened on a non-Sunday (e.g., during testing), when viewing the header, then the day name reflects the actual day for the date returned by `getTodaySundayDate()` (which returns next Sunday's date, so will show "Domingo"/"Sunday"). Priority: must.
- AC-38.7: Given the date formatting, when determining the language, then the ward's configured language is used via `getCurrentLanguage()` (not the device locale). Priority: must.

### Edge Cases

- EC-38.1: `getTodaySundayDate()` returns the next Sunday when opened on a non-Sunday, so the day-of-week name will always be "Domingo"/"Sunday"/"Domingo" in normal usage. On an actual Sunday it shows today's date correctly.
- EC-38.2: The `MONTH_FULL` and new `DAY_NAMES` data in `dateUtils.ts` uses ASCII-only characters (e.g., "Marco" not "Marco" with cedilla, "Sabado" without accent). This matches the existing codebase convention.

### Files Impacted

| File | Change Type | Description |
|------|-------------|-------------|
| `src/lib/dateUtils.ts` | Modify | Add `DAY_NAMES` constant and `formatDateFull` function |
| `src/app/presentation.tsx` | Modify | Import `formatDateFull` and `getCurrentLanguage`; replace title with formatted date; add `headerDate` style if subtitle approach used |
| `docs/specs/SPEC_F016.md` | Modify | Add date format specification to Presentation Mode technical notes |
| `docs/SPEC.final.md` | Modify | Add header date format to section 7.14 |

---

## Assumptions

```yaml
assumptions:
  - id: A-CR35-1
    description: "The DEFAULT_TEMPLATE_PT_BR in whatsappUtils.ts does NOT contain {duracao}"
    confirmed: true
    default_if_not_confirmed: "Remove {duracao} from default template"

  - id: A-CR35-2
    description: "No callers of resolveTemplate() in whatsappUtils.ts pass a meaningful duration value -- it always resolves to empty string"
    confirmed: true
    default_if_not_confirmed: "Remove duration from call sites"

  - id: A-CR35-3
    description: "The resolveTemplate in whatsapp.tsx (lines 40-46, local function for preview) uses SAMPLE_DATA which will also lose {duracao} entry"
    confirmed: true
    default_if_not_confirmed: "N/A -- removing from SAMPLE_DATA automatically fixes the preview"

  - id: A-CR38-1
    description: "The ward language is accessible via getCurrentLanguage() from src/i18n in the Presentation Mode screen"
    confirmed: true
    default_if_not_confirmed: "Use getCurrentLanguage() which reads from i18n instance"

  - id: A-CR38-2
    description: "dateUtils.ts uses ASCII-only characters (no diacritics) for month and day names, matching the codebase convention"
    confirmed: true
    default_if_not_confirmed: "Use ASCII-only names consistently"

  - id: A-CR38-3
    description: "The header title should be replaced with the formatted date (not shown as an additional subtitle)"
    confirmed: false
    default_if_not_confirmed: "Replace the title. The meeting name is implicit from the context."
```

---

## Open Questions

```yaml
open_questions: []
```

No open questions. CR-35 has a clear removal scope across 4 files (2 code, 2 docs). CR-38 has a clear format definition aligned with the existing `formatDateHumanReadable` pattern in `dateUtils.ts`. Defaults from SPEC_CR3.md are accepted.

---

## Implementation Notes

| CR | Type | Files (docs) | Files (code) |
|----|------|-------------|--------------|
| CR-35 | Spec + Code | `docs/SPEC.final.md`, `docs/specs/SPEC_F024.md` | `src/app/(tabs)/settings/whatsapp.tsx`, `src/lib/whatsappUtils.ts` |
| CR-38 | Spec + Code | `docs/SPEC.final.md`, `docs/specs/SPEC_F016.md` | `src/lib/dateUtils.ts`, `src/app/presentation.tsx` |

### CR-35 Code Changes (4 locations)

1. `whatsapp.tsx` line 23: Remove `'{duracao}'` from PLACEHOLDERS array
2. `whatsapp.tsx` line 34: Remove `'{duracao}': '10 min'` from SAMPLE_DATA
3. `whatsappUtils.ts` line 2: Remove `{duracao}` from JSDoc comment
4. `whatsappUtils.ts` line 20: Remove `duration?: string` from WhatsAppVariables
5. `whatsappUtils.ts` line 33: Remove `result = result.replace(/\{duracao\}/g, vars.duration ?? '');`

### CR-38 Code Changes (2 files)

1. `dateUtils.ts`: Add `DAY_NAMES` constant + `formatDateFull` function
2. `presentation.tsx`: Import and use `formatDateFull` in header

---

## Definition of Done

- [ ] `{duracao}` removed from PLACEHOLDERS array in `whatsapp.tsx` (CR-35)
- [ ] `{duracao}` removed from SAMPLE_DATA in `whatsapp.tsx` (CR-35)
- [ ] `duration` field removed from `WhatsAppVariables` interface in `whatsappUtils.ts` (CR-35)
- [ ] `{duracao}` replacement line removed from `resolveTemplate` in `whatsappUtils.ts` (CR-35)
- [ ] JSDoc comment updated in `whatsappUtils.ts` (CR-35)
- [ ] `{duracao}` removed from SPEC.final.md section 7.9 (CR-35)
- [ ] `{duracao}` removed from SPEC_F024.md (CR-35)
- [ ] `DAY_NAMES` constant and `formatDateFull` function added to `dateUtils.ts` (CR-38)
- [ ] Presentation Mode header displays formatted date in ward's language (CR-38)
- [ ] Date format works correctly for pt-BR, en, and es (CR-38)
- [ ] SPEC_F016.md updated with date header format specification (CR-38)
- [ ] SPEC.final.md section 7.14 updated with header date format (CR-38)
- [ ] Existing tests pass after changes

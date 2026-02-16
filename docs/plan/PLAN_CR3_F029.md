# PLAN_CR3_F029 - Template & Display Fixes (CR-35, CR-38)

## PLAN_SUMMARY

```yaml
type: plan_summary
total_steps: 5
parallel_tracks: 2
estimated_commits: 5
coverage:
  acceptance_criteria: 14/14
  edge_cases: 5/5
critical_path:
  - "STEP-01: Remove {duracao} from code files (CR-35)"
  - "STEP-03: Add formatDateFull to dateUtils.ts (CR-38)"
  - "STEP-04: Display formatted date in Presentation Mode header (CR-38)"
main_risks:
  - "CR-35: Existing wards with {duracao} in templates will see literal text -- acceptable, user can remove"
  - "CR-38: Date formatting must use ward language (getCurrentLanguage), not device locale"
```

---

## PLAN

```yaml
type: plan
version: 1

goal: "Remove invalid {duracao} placeholder from WhatsApp template system (CR-35) and add locale-aware full date display to Presentation Mode header (CR-38)."

strategy:
  order: "CR-35 and CR-38 are independent. CR-35 steps (STEP-01, STEP-02) and CR-38 steps (STEP-03, STEP-04) can run in parallel tracks."
  commit_strategy: "1 commit per step: fix: for CR-35, feat: for CR-38, docs: for spec updates"
  test_strategy: "Existing whatsappUtils tests should still pass after {duracao} removal. Manual verification of date display in Presentation Mode."
```

---

## Steps

### STEP-01: CR-35 -- Remove {duracao} from Code Files

```yaml
- id: STEP-01
  description: |
    Remove all references to {duracao} from the WhatsApp template system code.

    File 1: src/app/(tabs)/settings/whatsapp.tsx
    1. Remove '{duracao}' from PLACEHOLDERS array (line ~23)
       After: ['{nome}', '{data}', '{posicao}', '{colecao}', '{titulo}', '{link}']
    2. Remove '{duracao}': '10 min' from SAMPLE_DATA object (line ~34)

    File 2: src/lib/whatsappUtils.ts
    1. Remove {duracao} from JSDoc comment at top (line ~2)
       After: "Template placeholders: {nome}, {data}, {posicao}, {colecao}, {titulo}, {link}"
    2. Remove duration?: string from WhatsAppVariables interface (line ~20)
    3. Remove the line: result = result.replace(/\{duracao\}/g, vars.duration ?? '');
       from resolveTemplate function (line ~33)
  files:
    - "src/app/(tabs)/settings/whatsapp.tsx"
    - "src/lib/whatsappUtils.ts"
  dependencies: []
  parallelizable_with: ["STEP-02", "STEP-03", "STEP-04"]
  done_when:
    - "PLACEHOLDERS array has exactly 6 items (no {duracao})"
    - "SAMPLE_DATA has no {duracao} key"
    - "WhatsAppVariables interface has no duration field"
    - "resolveTemplate does not replace {duracao}"
    - "JSDoc comment does not mention {duracao}"
    - "TypeScript compiles without errors"
  tests:
    - type: unit
      description: "npx jest whatsappUtils -- existing tests pass"
    - type: manual
      description: "WhatsApp template screen shows 6 placeholders (no {duracao})"
  covers:
    acceptance_criteria: ["AC-35.1", "AC-35.2", "AC-35.3", "AC-35.4", "AC-35.5"]
    edge_cases: ["EC-35.1", "EC-35.2", "EC-35.3"]
  risks:
    - risk: "Removing duration from WhatsAppVariables may break call sites"
      mitigation: "Field is optional (duration?: string) and no call site provides a value. Search for 'duration' in WhatsApp context to confirm."
```

### STEP-02: CR-35 -- Remove {duracao} from Spec Documents

```yaml
- id: STEP-02
  description: |
    Remove {duracao} from the placeholder lists in spec documents.

    File 1: docs/SPEC.final.md section 7.9 (~line 745)
    Remove {duracao} from the placeholder list. After removal, valid placeholders
    are: {nome}, {data}, {posicao}, {colecao}, {titulo}, {link}

    File 2: docs/specs/SPEC_F024.md (~line 17)
    Remove {duracao} from the placeholder list. Same 6 valid placeholders.
  files:
    - "docs/SPEC.final.md"
    - "docs/specs/SPEC_F024.md"
  dependencies: []
  parallelizable_with: ["STEP-01", "STEP-03", "STEP-04"]
  done_when:
    - "SPEC.final.md section 7.9 lists exactly 6 placeholders (no {duracao})"
    - "SPEC_F024.md lists exactly 6 placeholders (no {duracao})"
    - "No other mentions of {duracao} in either file"
  tests:
    - type: unit
      description: "Grep for 'duracao' in both files -- only EC references (if any) remain"
  covers:
    acceptance_criteria: ["AC-35.6", "AC-35.7"]
    edge_cases: []
  risks:
    - risk: "Line numbers may have shifted"
      mitigation: "Search for 'duracao' string rather than relying on line numbers"
```

### STEP-03: CR-38 -- Add DAY_NAMES and formatDateFull to dateUtils.ts

```yaml
- id: STEP-03
  description: |
    Add day-of-week names and a new date formatting function to dateUtils.ts.

    1. Add DAY_NAMES constant after existing MONTH_FULL:
       const DAY_NAMES: Record<SupportedLanguage, string[]> = {
         'pt-BR': ['Domingo', 'Segunda-feira', 'Terca-feira', 'Quarta-feira',
                   'Quinta-feira', 'Sexta-feira', 'Sabado'],
         en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday',
              'Thursday', 'Friday', 'Saturday'],
         es: ['Domingo', 'Lunes', 'Martes', 'Miercoles',
              'Jueves', 'Viernes', 'Sabado'],
       };

    2. Add exported function:
       export function formatDateFull(
         dateStr: string, language: SupportedLanguage = 'pt-BR'
       ): string {
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

    Note: Uses ASCII-only characters (no diacritics), matching existing codebase convention.
    Uses existing parseLocalDate for safe date parsing and MONTH_FULL for month names.
  files:
    - "src/lib/dateUtils.ts"
  dependencies: []
  parallelizable_with: ["STEP-01", "STEP-02"]
  done_when:
    - "DAY_NAMES constant exists with day names for all 3 languages"
    - "formatDateFull function is exported"
    - "Function handles en, pt-BR, and es formats correctly"
    - "Uses parseLocalDate for safe date parsing"
    - "Uses MONTH_FULL for month names (no duplication)"
    - "TypeScript compiles without errors"
  tests:
    - type: unit
      description: "Manual verification: formatDateFull('2026-02-16', 'pt-BR') returns 'Segunda-feira, 16 de Fevereiro de 2026'"
    - type: unit
      description: "Manual verification: formatDateFull('2026-02-16', 'en') returns 'Monday, February 16, 2026'"
  covers:
    acceptance_criteria: ["AC-38.5"]
    edge_cases: ["EC-38.2"]
  risks:
    - risk: "None -- pure function, easily testable"
      mitigation: "N/A"
```

### STEP-04: CR-38 -- Display Formatted Date in Presentation Mode Header

```yaml
- id: STEP-04
  description: |
    Update the Presentation Mode screen to display the formatted date in the header.

    Changes to src/app/presentation.tsx:
    1. Add imports:
       import { formatDateFull } from '../lib/dateUtils';
       import { getCurrentLanguage } from '../i18n';

    2. Inside component, compute formatted date:
       const language = getCurrentLanguage();
       const formattedDate = useMemo(
         () => formatDateFull(sundayDate, language),
         [sundayDate, language]
       );

    3. Replace the header title text:
       From: <Text style={[styles.headerTitle, ...]}>{t('home.startMeeting')}</Text>
       To:   <Text style={[styles.headerTitle, ...]}>{formattedDate}</Text>

    The close button (X) in the header remains unchanged.
    The sundayDate variable already exists in the component (from getTodaySundayDate()).
  files:
    - "src/app/presentation.tsx"
  dependencies: ["STEP-03"]
  parallelizable_with: []
  done_when:
    - "Presentation Mode header shows formatted date instead of 'home.startMeeting' text"
    - "Date is formatted using ward language (getCurrentLanguage), not device locale"
    - "Date includes day-of-week name (e.g., 'Domingo, 16 de Fevereiro de 2026')"
    - "Close button (X) remains functional and unchanged"
    - "Date is memoized to avoid unnecessary recalculations"
  tests:
    - type: manual
      description: "Open Presentation Mode -> header shows formatted date in ward language"
    - type: manual
      description: "Change ward language -> date format changes accordingly"
  covers:
    acceptance_criteria: ["AC-38.1", "AC-38.2", "AC-38.3", "AC-38.4", "AC-38.6", "AC-38.7"]
    edge_cases: ["EC-38.1"]
  risks:
    - risk: "getCurrentLanguage() must return the ward language, not device locale"
      mitigation: "getCurrentLanguage() reads from i18n instance which is set to ward language"
```

### STEP-05: Update Spec Documents for CR-38 + Final Verification

```yaml
- id: STEP-05
  description: |
    Update spec documents with the date format specification for Presentation Mode,
    and do final verification of all changes.

    Spec updates:
    1. docs/SPEC.final.md section 7.14 -- add header date format:
       "Header do Presentation Mode exibe a data completa no idioma da ala:
        pt-BR: 'Domingo, DD de [Mes] de YYYY'
        en: 'Sunday, [Month] DD, YYYY'
        es: 'Domingo, DD de [Mes] de YYYY'"

    2. docs/specs/SPEC_F016.md -- add date format to Presentation Mode spec

    Verification:
    1. TypeScript compiles: npx tsc --noEmit
    2. Existing tests pass: npx jest whatsappUtils dateUtils
    3. No {duracao} references in code or specs
    4. formatDateFull function exists and is used in presentation.tsx
    5. Date display uses ward language
  files:
    - "docs/SPEC.final.md"
    - "docs/specs/SPEC_F016.md"
  dependencies: ["STEP-01", "STEP-02", "STEP-03", "STEP-04"]
  parallelizable_with: []
  done_when:
    - "SPEC.final.md section 7.14 documents date header format"
    - "SPEC_F016.md documents date header format"
    - "TypeScript compiles without errors"
    - "All relevant tests pass"
    - "No stale {duracao} references remain"
  tests:
    - type: integration
      description: "Full build and test verification"
  covers:
    acceptance_criteria: []
    edge_cases: []
  risks:
    - risk: "None -- verification and doc updates"
      mitigation: "N/A"
```

---

## Validation

```yaml
validation:
  - ac_id: AC-35.1
    how_to_verify: "Open whatsapp.tsx. PLACEHOLDERS array has 6 items, no {duracao}."
    covered_by_steps: ["STEP-01"]

  - ac_id: AC-35.2
    how_to_verify: "Open whatsapp.tsx. SAMPLE_DATA has no {duracao} key."
    covered_by_steps: ["STEP-01"]

  - ac_id: AC-35.3
    how_to_verify: "Open whatsappUtils.ts. WhatsAppVariables has no duration field."
    covered_by_steps: ["STEP-01"]

  - ac_id: AC-35.4
    how_to_verify: "Open whatsappUtils.ts. resolveTemplate has no {duracao} replacement line."
    covered_by_steps: ["STEP-01"]

  - ac_id: AC-35.5
    how_to_verify: "Open whatsappUtils.ts. JSDoc comment lists 6 placeholders (no {duracao})."
    covered_by_steps: ["STEP-01"]

  - ac_id: AC-35.6
    how_to_verify: "Open SPEC.final.md section 7.9. Placeholder list has 6 items (no {duracao})."
    covered_by_steps: ["STEP-02"]

  - ac_id: AC-35.7
    how_to_verify: "Open SPEC_F024.md. Placeholder list has 6 items (no {duracao})."
    covered_by_steps: ["STEP-02"]

  - ac_id: AC-38.1
    how_to_verify: "Open Presentation Mode. Header shows formatted date."
    covered_by_steps: ["STEP-04"]

  - ac_id: AC-38.2
    how_to_verify: "Ward language pt-BR: 'Domingo, DD de Mes de YYYY'."
    covered_by_steps: ["STEP-03", "STEP-04"]

  - ac_id: AC-38.3
    how_to_verify: "Ward language en: 'Sunday, Month DD, YYYY'."
    covered_by_steps: ["STEP-03", "STEP-04"]

  - ac_id: AC-38.4
    how_to_verify: "Ward language es: 'Domingo, DD de Mes de YYYY'."
    covered_by_steps: ["STEP-03", "STEP-04"]

  - ac_id: AC-38.5
    how_to_verify: "formatDateFull exists in dateUtils.ts and is exported."
    covered_by_steps: ["STEP-03"]

  - ac_id: AC-38.6
    how_to_verify: "Open on non-Sunday: day name matches actual day for the displayed date."
    covered_by_steps: ["STEP-03", "STEP-04"]

  - ac_id: AC-38.7
    how_to_verify: "Code uses getCurrentLanguage(), not device locale."
    covered_by_steps: ["STEP-04"]
```

---

## Execution Order Diagram

```
Track A (CR-35 -- {duracao} removal):
  STEP-01 (remove from code) ────────────┐
  STEP-02 (remove from specs) ───────────┤
                                          │
Track B (CR-38 -- date format):           │
  STEP-03 (add formatDateFull) ──────────┤
  STEP-04 (use in presentation.tsx) ─────┤  (depends on STEP-03)
                                          │
Phase 3 (depends on all):                │
  STEP-05 (spec updates + verification) <┘
```

### File Conflict Map

| File | Steps | Sections Modified |
|------|-------|-------------------|
| `src/app/(tabs)/settings/whatsapp.tsx` | STEP-01 | PLACEHOLDERS (~line 23), SAMPLE_DATA (~line 34) |
| `src/lib/whatsappUtils.ts` | STEP-01 | JSDoc (~line 2), WhatsAppVariables (~line 20), resolveTemplate (~line 33) |
| `src/lib/dateUtils.ts` | STEP-03 | Add DAY_NAMES + formatDateFull after MONTH_FULL |
| `src/app/presentation.tsx` | STEP-04 | Add imports + replace header title with formatted date |
| `docs/SPEC.final.md` | STEP-02, STEP-05 | Section 7.9 (remove {duracao}), section 7.14 (add date format) |
| `docs/specs/SPEC_F024.md` | STEP-02 | Remove {duracao} from placeholder list |
| `docs/specs/SPEC_F016.md` | STEP-05 | Add date header format specification |

STEP-02 and STEP-05 touch SPEC.final.md in non-overlapping sections (7.9 vs 7.14).

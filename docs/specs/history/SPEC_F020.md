# F020 - Internationalization (i18n)

## User Stories

| ID | As a | I want to | So that |
|----|------|-----------|---------|
| US-010 | Secretary | configure ward language | interface and collections in correct language |

## Acceptance Criteria

| ID | Given | When | Then |
|----|-------|------|------|
| AC-019 | in Settings | sees language selector | 3 options: pt-BR, en, es |
| AC-019b | changes language | confirms warning dialog | language updated, previous language collections deactivated, interface changes, date formats adapt |

## Scope of Translation
- UI interface (buttons, labels, placeholders)
- Error and validation messages
- Status names (Not-assigned, Assigned/Not-Invited, Assigned/Invited, Assigned/Confirmed, Gave Up)
- Exception names (Testimony Meeting, General Conference, etc.)
- Date/time formats (e.g., "08 FEV" in PT, "FEB 08" in EN, "08 FEB" in ES)
- Push notification texts (all 5 cases)
- Login title/subtitle
- Self-registration and invitation texts
- Activity log descriptions (in ward language at time of action)

## NOT Translated
- User-entered data (member names, Ward Topic titles)
- General Collections are language-specific (not translated, each language has its own)

## Language Change Behavior
- Warning dialog before changing
- On confirm:
  - Ward language updated
  - All active General Collections of previous language deactivated
  - General Collections of new language become available (inactive by default)
  - App interface changes to new language
  - Date/time formats adapt
- Ward Topics unaffected by language change
- Future speeches with topics from deactivated collections preserve title and link (snapshot)

## Technical Notes
- react-i18next with locales: pt-BR, en, es
- Language stored in wards table (field language)
- Date abbreviations: month with 3 letters in ward language (fev/Feb/feb)
- Default country code by language: +55 (pt-BR), +1 (en), +52 (es)
- Default timezone by language: America/Sao_Paulo (pt-BR), America/New_York (en), America/Mexico_City (es)

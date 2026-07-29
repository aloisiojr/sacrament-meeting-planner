# Spec — "Atualizar lista de membros" screen + robust CSV import

Status: **draft (GATE 1 — awaiting approval)** · Branch: `v2.0` · Date: 2026-07-29

Redesign the CSV members settings screen into a guided 3-step flow and make CSV import strict and
highly informative — while guaranteeing an exported CSV always re-imports cleanly.

## Context & scope
Today `src/app/(tabs)/settings/members.tsx` shows a description + count + two buttons + a warning.
`parseCsv` (`src/lib/csvUtils.ts`) aborts on error but is lenient (silently blanks bad phones, treats
any non-truthy token as `false`, doesn't validate `Responsável`). This change: rename the menu/title,
turn the screen into a numbered step-by-step, and rewrite parse validation to be strict + informative
+ round-trip-safe. In scope: `members.tsx`, `csvUtils.ts`, i18n (3 locales), tests. NO DB change
(migration 039 already handles `calling` and resolves `Responsável` with `LIMIT 1`, atomically).

## Decisions (locked with user 2026-07-29)
- Only **Nome** is required; everything else optional with defaults.
- Errors: show the **first 5** (line + column + reason) + "… e mais N erro(s)" when more.
- **Round-trip guarantee is paramount:** an unedited exported CSV must NEVER error on re-import →
  duplicate names are allowed (not an error); `Responsável` ambiguity resolves to first match.
- **Empty list → export a CSV with clearly-marked example rows** (valid) so the user learns the format.

## Acceptance criteria (EARS)

### Menu & title
- **M1** The settings menu entry AND the screen title SHALL read "Atualizar lista de membros"
  (pt-BR) / "Update member list" (en-US) / "Actualizar lista de miembros" (es-LA).

### Step-by-step UI
- **U1** The screen SHALL present three numbered steps: (1) "Baixe a lista atual" with an **Exportar
  CSV** button; (2) "Edite a planilha" with a note listing the required field (Nome) and the accepted
  formats (booleans, telefone, Responsável = exact Nome, Chamado free text); (3) "Importe o arquivo"
  with a **red destructive warning box** ("substitui TODOS os membros") followed by an **Importar
  CSV** button.
- **U2** The read-only member count SHALL remain visible.

### Export
- **X1** Export SHALL produce the full-dump CSV (existing columns: Nome, Nome Informal, Telefone
  Completo, Preside, Conduz, Rege, Piano, Reconhecer, Responsável, Chamado).
- **X2** WHEN the ward has zero members, export SHALL instead produce a CSV with 1–2 **example rows**
  whose values clearly mark them as examples (e.g. "Maria Exemplo") and which are themselves valid
  (importing the example unedited SHALL succeed), including one delegated example referencing the
  other by name to illustrate `Responsável`.

### Import — strict, informative, round-trip-safe, atomic
- **I1** Parse SHALL validate every row BEFORE any write; on ANY error the import SHALL abort and
  NOTHING SHALL be substituted (the RPC is not called).
- **I2** Each error SHALL carry line number + column name + reason. The UI SHALL display the first 5
  errors and, when there are more, a "… e mais N erro(s)" line. (Errors shown in an in-screen red
  panel, not a truncating alert.)
- **I3** `Nome` SHALL be required (empty → error). Blank `Nome Informal` SHALL default to the first
  word of `Nome` (not an error).
- **I4** Boolean columns SHALL accept only recognized tokens (true/false/1/0/sim/não/yes/no/x/empty,
  case-insensitive); any other value → error naming that column.
- **I5** `Telefone Completo` SHALL be optional; if present it must be a valid phone (optional leading
  `+` then 8–15 digits), else error. (Empty is valid — delegated members.)
- **I6** `Responsável` SHALL be optional; if present it must match (case/accent-insensitive) at least
  one `Nome` in the file, else error. Multiple matches (duplicate names) resolve to the first — NOT
  an error.
- **I7** Duplicate `Nome`s SHALL be allowed (not an error) — required by the round-trip guarantee.
- **I8** A row with MORE columns than the header → error (misalignment); FEWER columns SHALL be
  padded with empty values (tolerant of spreadsheets that drop trailing empty cells).
- **I9 (round-trip guarantee)** For any valid set of members, `parseCsv(generateCsv(members))` SHALL
  succeed — covering delegated/no-phone members, callings, accents, and names containing commas/quotes.
- **I10** Import SHALL remain atomic via the `import_members` RPC (DELETE-all + INSERT in one
  transaction); an RPC/network failure SHALL roll back, leaving data unchanged, and show a clear error.

## Out of scope
DB/RPC changes; an in-app spreadsheet editor (editing stays external); changing the CSV column set.

## Open questions
None blocking.

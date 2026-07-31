# Spec — On-device PDF member import & merge (LGPD-safe)

Status: **APPROVED (Gate 1, 2026-07-31)** — O1=import minors (name-only, no phone). Next: plan-change. Branch: `feature/pdf-member-import`.
Replaces the removed third-party-AI guide (LGPD). Merge logic reference:
`specs/pdf-member-import.reference.md`. Real sample analyzed: `LCR-sample.pdf` (510 members).

## Goal
One button in the app: user picks the LCR member-list PDF → the app parses it **on-device**,
merges it with the ward's members **directly in the DB** (non-destructive), after a **review screen**.
No CSV, no third-party AI, no PII leaving the device except normal member writes to our own Supabase.

## Baseline
- Members model (`useCreateMember`/`useUpdateMember`): `full_name, informal_name, country_code,
  phone, can_preside, can_conduct, can_lead_music, can_play_piano, can_be_recognized,
  contact_via_responsible, responsible_id, calling`. **No sex / email / birthdate fields.**
- `csvUtils` already has phone split (`splitPhoneNumber`), name/phone helpers — reuse.
- No DB schema change. No breaking backend contract. RLS write path already gated (044).

## Locked decisions
1. **Extraction:** on-device via **WebView + pdf.js** (Expo Go compatible; the LCR PDF has a real
   text layer — confirmed — so no OCR).
2. **Merge is non-destructive:** insert new + update matched; never DELETE-ALL. Removals happen
   ONLY for members the user explicitly marks in review.
3. **Members in DB but absent from the PDF:** listed in review; user marks keep/remove per person.
4. **PDF fields used:** Nome → full_name; Telefone → country_code+phone (Rules 2–3); Idade → only
   to apply the under-12 rule. **Sexo / E-mail / Data de Nascimento are ignored** (not stored).
5. **Match key:** normalized full name (accent/case-insensitive), after "Last, First"→"First Last"
   normalization. No fuzzy/approximate matching (similar-but-different names = different people).
6. **Review-before-apply** screen is mandatory; nothing is written until the user confirms.
7. The 4 rules from the reference doc apply (name format, under-12 phone, phone repair, careful merge
   incl. phone-conflict resolution).
8. **Language-independent parsing (pt-BR / en / es).** The LCR PDF comes in the leader's language.
   The parser MUST NOT anchor on localized header labels, footer text, title, or the count word.
   Instead: detect rows structurally (Sex token + age + date) and read the date with a
   language-agnostic month detector validated against the UNION of pt/en/es 3–4-letter month
   abbreviations. Header/footer/title/count-line stripping uses multilingual token sets (or
   structural position), never a single language.

## PDF shape (from LCR-sample.pdf)
- Columns: Nome, Sexo, Idade, Data de Nascimento, Número de Telefone, E-mail.
- Row anchor for parsing: `M|F` + age(int) + date(`D mon YYYY`). Everything since the previous
  record up to the anchor = the name (names wrap across lines; records can split across pages).
- Strip page header (`Nome Sexo Idade ...`), footer (`… Somente para Uso da Igreja … <n>`), and the
  title (`Lista de Membros` / `Ala … (…)`). Final line `Contagem: N` = expected record count.

## Acceptance criteria (EARS)
- **AC1** WHEN the user taps "Import from PDF" and picks a PDF, the app SHALL extract its text
  on-device (WebView+pdf.js) without uploading the file anywhere.
- **AC2** The parser SHALL produce one record per member with {name, rawPhone, age}, correctly
  handling multi-line names and records split across page boundaries, and SHALL ignore
  headers/footers/title.
- **AC3** The parser SHALL validate its record count against `Contagem: N`; a mismatch SHALL be
  surfaced in the review (not silently accepted).
- **AC4 (Rule 1)** A name in "Last, First" form SHALL be converted to "First Last", preserving
  accents/capitalization and lowercase particles (e.g. "de Oliveira, Fernando" → "Fernando de Oliveira").
- **AC5 (Rule 2)** For a member under 12 (by Idade), the phone SHALL be left blank; the member is
  still included.
- **AC6 (Rule 3)** Phones SHALL be repaired using the ward's **country code + local area code as the
  authoritative "dominant" values**, taken from two inputs on the import screen (AC16). Numbers
  missing the country code get it; local numbers missing the area code get the ward area code; strip
  non-digits (result `+` + digits, 8–15). If a number still cannot be completed confidently (missing
  middle digits / ambiguous), leave it blank and add to an "unrepaired phones" list. Never invent
  digits. If a field is left empty, fall back to deducing that value from the PDF's well-formed numbers.
- **AC16 (ward phone codes)** The import screen SHALL show a **Country code** and **Local area code**
  input, PRE-FILLED (country from the ward timezone → calling-code map, or the most common
  country_code among existing members; area from the most common area code among existing members;
  blank when the ward has no members). The user can edit both before parsing; the confirmed values
  drive AC6.
- **AC7 (Rule 4 merge)** For each parsed member matched to an existing DB member by normalized name,
  the app SHALL preserve the DB-only columns (capabilities, responsible, calling) and only fill/
  update name + phone; a PHONE CONFLICT (different non-empty phone in DB vs PDF) SHALL be surfaced in
  the phone-conflict review, **defaulting to the app's current number**, with a per-conflict choice of
  app number vs PDF number. Never auto-overwritten silently.
- **AC8** New members (in PDF, not in DB) SHALL be inserted with capabilities/responsible/calling
  blank and informal_name blank.
- **AC9 (removal review)** Members in the DB but absent from the PDF SHALL be listed in a removal
  review; the **default is to remove NONE** — the user must actively mark specific members to remove;
  only marked members are deleted.
- **AC10 (review + confirm)** The flow SHALL present review step(s) — removal review (AC9) and
  phone-conflict review (AC7) — plus a summary (N new, N updated, unrepaired phones); NO DB write
  happens before the user confirms.
- **AC14 (Home onboarding)** WHEN the ward has no members yet, the Home screen SHALL show a
  dismissible dialog with a link to the member-import screen (Settings → Update member list). It
  SHALL NOT reappear once dismissed / once members exist. Gated to users who can manage members.
- **AC11** On confirm, the app SHALL apply inserts/updates/removals to the members table via the
  permission-gated (RLS) write path; requires online. Offline SHALL disable the action.
- **AC12** Behavioral tests SHALL cover: parser on the real sample (record count, multi-line names,
  page-split rows), Rule 1/2/3 transforms, and the merge/conflict/absent classification (pure logic,
  no network).
- **AC13 (i18n)** The parser SHALL correctly parse LCR PDFs exported in pt-BR, en, AND es, without
  depending on localized header/footer/title/count labels. Specifically:
  - The row-anchor gender token SHALL accept `V | M | F` (es uses `V`=male, `M`=female; pt/en use
    `M`/`F`) and SHALL NOT interpret its meaning (sex is not stored).
  - The date detector SHALL accept 3–4-letter month tokens from the pt/en/es union, incl. es `mayo`.
  - The count line SHALL be read from `Contagem|Count|Recuento` (or the trailing integer).
  - Tests SHALL run against the three REAL samples (LCR-sample.pdf / -en / -es), asserting the same
    structured output (≈510 records, same names/phones) across all three.
- **AC15 (privacy, ADR-006 C1/C3)** The raw PDF SHALL be parsed in memory and never persisted or
  uploaded anywhere; the feature is online-only (offline disables it, no local queue).

## Decisions (resolved 2026-07-31)
- **Phone conflict:** per-conflict picker (app number vs PDF number); **default = app's** (AC7).
- **Exact homonyms:** treat identical normalized name as the same person (merge); rare risk noted.
- **Placement:** PDF import button on the existing Members/CSV screen (CSV import/export stays);
  PLUS a first-run **Home dialog** when the ward has no members, linking to that screen (AC14).
- **Apply:** batched non-destructive bulk write (upsert existing by id + insert new; delete only the
  members explicitly marked in the removal review). Exact mechanism decided in plan-change (OQ4=yes).
- **Removal review default:** remove NONE; user opts specific members in (AC9).
- **PII (ADR-006):** on-device only, raw PDF never persisted/uploaded (AC15); under-12 phones blanked
  (AC5); no schema change; not a breaking change. See `docs/decisions/006-pdf-member-import.md`.

## Open item — product/legal (ADR-006 O1)
- **Import minors at all?** Proposed: yes, name-only, no phone (consistent with the current CSV
  import, which imports whatever's in the file). Alternative: skip under-12 (or under-18) entirely.
  Needs your call. Also confirm the privacy policy covers member-data import (O2).

## Out of scope
- OCR / scanned PDFs (LCR export has a text layer).
- Storing sex / email / birthdate.
- Changing the existing CSV import/export.

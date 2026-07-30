# Spec — GitHub Pages guide: populate the member list with AI

**Slug:** `members-import-guide-page` · **Type:** feature (static site) · **Branch:** UX-2.0
**Scope:** one new static HTML page under `docs/public/` (the live GitHub-Pages site). No app code,
no DB, no tests pipeline. Must not break existing pages.

## Goal
Teach users to populate the app's member list using three resources: (1) the ward member-list PDF
from LCR, (2) the CSV exported from the app, (3) a ready-made AI prompt that merges them into the
final import CSV. Trilingual (en/pt/es), matching the existing site (support.html) style + language
switcher + "not an official Church app" disclaimer + `sacr.meet.plan@gmail.com`.

## Acceptance criteria
- **AC1** — New file `docs/public/import-members.html`, same visual system as support.html (cards,
  #4F46E5 accent, 640px, system fonts), trilingual with the same `switchLang()` + browser auto-detect.
- **AC2** — Step "Get the PDF": go to https://lcr.churchofjesuschrist.org/mlt/records/member-list →
  Print → All members → Print → save the PDF. (Link opens in a new tab.)
- **AC3** — Step "Export the app CSV": Settings → Member List → Export CSV; if there are no members
  yet, delete the example rows; save the CSV.
- **AC4** — Step "Generate the final CSV with AI": shows the full prompt (in the selected language) in
  a copyable box, a "Copy prompt" button, and one button per AI service (ChatGPT, Claude, Gemini,
  Meta AI, Copilot, Perplexity). Each service button **copies the prompt to the clipboard AND opens
  that service in a new tab** (decision: copy+open — reliable across all services; no URL prefill).
  A toast/inline note confirms "prompt copied — paste, attach the 2 files, press Enter."
- **AC5** — Step "Import into the app": Settings → Member List → Import CSV; review then upload.
- **AC6 (the prompt)** — Provided in all three languages; instructs the AI to output the app's exact
  CSV (10 columns, in order: `Nome,Nome Informal,Telefone Completo,Preside,Conduz,Rege,Piano,
  Reconhecer,Responsável,Chamado`; header names may match the attached app CSV since import is
  positional; phone `+<cc><digits>` 8–15 digits; capability = `X`/blank) and to obey:
  - **Name**: detect "Last, First" → convert to "First Last"; keep accents.
  - **Under-12**: keep the person, leave the phone blank (privacy). Use age/birthdate from the PDF.
  - **Phone repair (heuristic, no guessing)**: infer the ward's dominant international + national
    area codes from well-formed numbers, then complete incomplete ones; if it can't be done with
    confidence, leave blank and list it — never invent digits; strip spaces/()/-.
  - **Careful merge**: similar-but-different names = different people; only merge on a confident name
    match; preserve app-only columns (capabilities/Responsável/Chamado) on merge; a same-person
    **phone conflict** (app vs PDF) is NEVER auto-resolved — list all conflicts and ask the user to
    choose before finalizing.
  - **Delivery**: first a short report (totals, phones repaired + how, phones left blank, phone
    conflicts to resolve), then — after the user resolves conflicts — the final CSV in a code block.
- **AC7** — Discoverability: add an FAQ entry + link to this page from `docs/public/support.html`
  (all three languages), without breaking it.
- **AC8** — Same disclaimer footer; page validates as standalone HTML (no external JS/CSS deps).

## Notes / decisions (locked)
- AI buttons = **copy + open** (no URL prefill: long prompt truncates, Gemini/Meta AI have no param,
  ChatGPT `?q=` can auto-send before files attach).
- Under-12 = **keep person, blank phone**.
- **Trilingual** page and prompt.
- Filename `import-members.html` (matches accept-invite.html / delete-account.html convention).
- The app import is positional and validates by column count, so header names are flexible; the
  prompt tells the AI to reuse the app CSV header if attached, else the pt-BR names, order fixed.

## Out of scope
- No change to the app's CSV import/export code. No new AI integration in the app.

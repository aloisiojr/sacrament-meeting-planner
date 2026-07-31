# PDF member import — recovered merge logic (reference)

Distilled from the (now-removed, LGPD) AI-guide page `docs/public/import-members.html`
(recovered from git `602478d:docs/public/import-members.html`). This is the LOGIC the AI prompt
encoded; the native feature must replicate the deterministic parts in code (on-device or on our own
backend — NOT a third-party AI). Kept out of `docs/public` on purpose.

## Inputs
1. LCR member-list PDF (exported from the Church leader site).
2. (Optional) app CSV export of members already registered.

## Output — exact 10 columns, positional (app imports by column position, not name)
`Nome,Nome Informal,Telefone Completo,Preside,Conduz,Rege,Piano,Reconhecer,Responsável,Chamado`
- **Nome:** full name "First Last" (see Rule 1).
- **Nome Informal:** blank (app derives first name) unless already set in the app CSV.
- **Telefone Completo:** `+` then 8–15 digits, digits only; blank if no valid phone (Rules 2 & 3).
- **Preside/Conduz/Rege/Piano/Reconhecer:** `X`=yes, blank=no. New (PDF-only) → blank; preserve app CSV values for existing.
- **Responsável / Chamado:** blank for new; preserve app CSV values (unless PDF provides the calling).
- CSV escaping: wrap in `"` and double internal `"` when a value has comma/quote/newline.

## Rule 1 — Name format
PDF may be "Last, First" (comma-separated) → convert to "First Last". If already "First Last", keep.
Preserve accents + proper capitalization.

## Rule 2 — Children's phones (privacy)
Under 12 → keep the person (name), but leave phone BLANK. Use age/birthdate from the PDF. 12+ → phone allowed.
(REQUIRES the PDF to expose age or birthdate — verify against real samples.)

## Rule 3 — Phone repair (heuristic, NO guessing)
a) Analyze the already-well-formed phones to deduce the ward's dominant patterns: international
   country code + most common national area code(s).
b) Complete incomplete numbers using those patterns (missing country code → dominant country;
   local number missing area code → dominant area code only if one is clearly dominant).
c) NEVER invent digits. If it can't be completed confidently (missing middle digits / ambiguous
   area code) → leave BLANK and add to an "unrepaired phones" report list.
d) Strip spaces/parens/dashes; final = only `+` and digits.

## Rule 4 — Careful merge (only if app CSV present)
- Similar-but-different names are DIFFERENT people → separate entries. No fuzzy/approximate merge.
- Same person only on confident name match (same full name; tolerate normalized "Last, First" +
  accent/case differences).
- On merge, PRESERVE app-CSV-only columns (capabilities, Responsável, Chamado) — the PDF lacks them.
- PHONE CONFLICT (same person, different phone in app vs PDF): do NOT auto-decide. Either number
  could be the newer one. Surface ALL conflicts for the user to resolve; never discard silently.

## Delivery (interactive)
1. Show a report first: total members; phones repaired (+ how, deduced codes); "unrepaired phones"
   list; PHONE CONFLICTS list.
2. After the user resolves conflicts (or none) → produce the final merged CSV / apply the import.

## Language tokens (confirmed vs real samples: pt [LCR-sample.pdf] + en [LCR-sample-en.pdf] + es [LCR-sample-es.pdf])
- **⚠️ Gender/Sex token is LANGUAGE-DEPENDENT — do NOT anchor on `M|F` alone:**
  - pt / en: `M` = male, `F` = female.
  - **es: `V` (Varón) = male, `M` (Mujer) = female** — i.e. in Spanish `M` means FEMALE.
  - The row anchor must accept `V | M | F` as the gender token, and MUST NOT interpret its meaning
    (the app doesn't store sex; the token is used only structurally to find where the name ends).
- **Stable across languages (safe anchors):** names are always "Last, First" (comma), with lowercase
  particles preserved ("de Oliveira, Fernando").
- **Varies (never anchor on these):** title (Lista de Membros / Member List / Lista de miembros),
  header labels (Sexo vs Gender vs Sexo; Idade vs Age; …), footer (Somente para Uso da Igreja /
  For Church Use Only / Solo para uso de la Iglesia).
- **Month abbreviations — UNION to accept** (case-insensitive, 3–4 letters, strip trailing `.`):
  - pt: jan fev mar abr mai jun jul ago set out nov dez
  - en: jan feb mar apr may jun jul aug sep oct nov dec
  - es (confirmed): ene feb mar abr **mayo** jun jul ago sep oct nov dic  ← note "mayo" is 4 letters
  - Union set (dedup): jan jun jul (shared) · fev feb · mar (shared) · abr apr · mai may mayo ·
    ago aug · set sep · out oct · nov (shared) · dez dec · ene · dic. Date pattern:
    `\d{1,2}\s+([A-Za-zç]{3,4})\s+\d{4}` (day, 3–4-letter month, year), validated against the union.
- **Count line label (all confirmed):** pt `Contagem:` · en `Count:` · es `Recuento:` — match
  `^(Contagem|Count|Recuento|Conteo)\s*:\s*(\d+)` OR just read the trailing integer on the last
  content line before the final footer.
- **Records split across page boundaries** (name at bottom of page N with data at top of N+1, or a
  data-row with no name because the name is on the previous page) — confirmed in BOTH samples;
  the parser must join across the page-header/footer noise.

## Native-feature implications
- Deterministic in code: Rules 1, 3(b–d), 4 (matching + preserve + conflict detection), CSV output.
  These map cleanly onto existing `csvUtils` (parse/generate) + member model.
- The HARD/fragile part is BEFORE these rules: **PDF text extraction + LCR layout parsing** into
  raw rows (name, phone, age/birthdate). That's the real risk and depends on the actual PDF layout.
- Rule 2 depends on the PDF exposing age/birthdate.
- The interactive report/conflict step ⇒ a review screen before the (destructive) import applies.

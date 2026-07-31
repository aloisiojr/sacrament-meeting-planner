# Plan — On-device PDF member import & merge

For `specs/pdf-member-import.md` (APPROVED Gate 1). Status: **awaiting Gate 2 (plan approval)**.
Branch `feature/pdf-member-import`. Principle: isolate the pure, testable core (parse/repair/merge)
from the untestable-in-vitest edges (WebView extraction, screens). Each step = 1 atomic commit.

## Reuse (search-before-create)
- `src/lib/csvUtils.ts`: `splitPhoneNumber`, `PHONE_REGEX`, `normalizeName` (accent/case) — reuse for
  phone split + name matching. Do NOT duplicate.
- `src/types/database.ts`: `Member` type.
- `expo-document-picker` (already used in members.tsx) + `expo-file-system` — file pick + base64 read.
- Existing dialog primitive (`BottomSheetDialog` if present) for the Home onboarding + review sheets.
- `useMembers` (list) for the current DB roster; `useAuth` (hasPermission/wardId), `useOnlineStatus`.

## Steps (each = 1 commit; AC mapping + tests)

**S0 — dependency.** `npx expo install react-native-webview`. (picker/file-system already present.)
No test; verify `tsc` + app boots. Note: native module — Expo Go has it; prod needs a rebuild.

**S1 — parser core (pure).** `src/lib/lcrPdfParser.ts` → `parseLcrText(text): { records:
{ name:string; rawPhone:string|null; age:number }[]; expectedCount:number|null }`.
Language-agnostic: row anchor = gender `V|M|F` + int age + date `\d{1,2} <mon3-4> \d{4}` (union
months incl. `mayo`); name = text since previous record; strip header/footer/title; read count from
`Contagem|Count|Recuento`. → **AC2, AC3, AC13(parse)**. Tests: anonymized text fixtures pt/en/es
(incl. `V` male / `M` female es), multi-line name, page-split row, missing phone/email, garbage phone,
count match + mismatch.

**S2 — name format (Rule 1).** `normalizeLcrName("Last, First") → "First Last"` (in lcrPdfParser or a
helper), preserving accents/case + lowercase particles ("de Oliveira, Fernando" → "Fernando de
Oliveira"). → **AC4**. Tests: comma-form, already-first-last, particles, accents.

**S3 — phone repair (Rules 2+3).** `src/lib/lcrPhoneRepair.ts` → `repairPhones(records, {
countryCode, areaCode }) → { resolved: {name, phone:string|null, age}[]; unrepaired: string[] }`.
Use the caller-provided `countryCode`/`areaCode` as authoritative (AC16); if a field is empty, fall
back to deducing it from the PDF's well-formed numbers. Complete incomplete numbers; strip to
`+`+digits (8–15); can't-complete → null + unrepaired; **under-12 → phone null** (Rule 2); never
invent digits. Reuse `splitPhoneNumber`. Also `src/lib/wardPhoneCodes.ts`: timezone→calling-code map
+ `guessWardCodes(members, timezone)` for the pre-fill. → **AC5, AC6, AC16(logic)**. Tests: provided
codes win; empty field → deduce; ambiguous → blank; garbage → blank; under-12 → blank; pre-fill guess.

**S4 — merge plan (pure).** `src/lib/memberMergePlan.ts` → `buildMergePlan(parsed, dbMembers) →
{ toInsert, toUpdate, phoneConflicts, absentInDb }`. Match by `normalizeName`; new → insert (caps/
responsible/calling blank, informal blank); matched → keep DB-only cols, update name/phone; phone
differs (both non-empty) → phoneConflict (default keep app's); in DB not in PDF → absentInDb.
→ **AC7, AC8, AC9(classify)**. Tests: new/matched/conflict/absent, exact-homonym = same person,
preserve capabilities.

**S5 — apply hook.** `src/hooks/useApplyMemberImport.ts` → batched, non-destructive: `.insert(newRows)`
(array), update changed (upsert by id or small loop), `.delete().in('id', markedIds)`. Online-gated.
→ **AC11**. Test: mock supabase, assert batched insert/update/delete with the resolved plan; no delete
unless marked.

**S6 — WebView pdf.js extractor.** `src/components/PdfTextExtractor` (hidden `react-native-webview`
loading a **bundled** pdf.js asset; receives PDF base64, runs getDocument→getTextContent per page,
postMessages joined text) + `extractPdfText(base64): Promise<string>` wrapper. In-memory only; never
upload/persist. → **AC1, AC15**. No vitest (WebView) — manual/integration; keep logic thin.

**S7 — import flow + review UI.** In members.tsx: add "Import from PDF" (gated `member:import`,
disabled offline). First show the **Country code + Local area code** inputs (AC16), pre-filled via
`guessWardCodes` (S3). Then pick (DocumentPicker) → base64 (FileSystem) → `extractPdfText` (S6) →
parse (S1) → `repairPhones(records, {countryCode, areaCode})` (S3) → `buildMergePlan` (S4) → **review**: (a) removal review (default none, AC9), (b)
phone-conflict picker (default app's, AC7), (c) summary (new/updated/unrepaired + count-mismatch
warning) → confirm → `useApplyMemberImport` (S5). New review components under `src/components/`.
→ **AC7/AC9(UI), AC10**. Test: review components with a mocked plan (renders counts; toggling a
removal/conflict updates the applied payload; confirm calls apply).

**S8 — Home onboarding dialog.** On Home, when ward has 0 members (`useMembers`) AND user can manage,
show a dismissible dialog linking to Settings→members; don't reappear once dismissed / members exist.
→ **AC14**. Test: shows at 0 members + permission; hidden otherwise; dismiss persists.

**S9 — i18n.** Keys for button, three review screens, summary/warnings, Home dialog — pt-BR/en-US/es-LA.
Threaded through S7/S8; this step reconciles parity. Test: existing i18n-parity test stays green.

**S10 — cleanup.** Delete the real `LCR-sample*.pdf` (root) + `/tmp/lcr-es-fresh.pdf`; confirm test
fixtures are anonymized (no real PII); `.gitignore` already blocks the samples.

## Ordering & gates
S0 → **S1–S5 (pure core + hook, fully unit-tested)** → S6 → S7 → S8 → S9 → S10. Each step: tsc + related
tests green (per-edit hook), atomic commit. After build → `verify-change` (adversarial) → Gate 3 (merge).

## Risks / notes
- Bulk apply of ~500 rows: prefer array `.insert`/`.delete().in`; if a single RPC is cleaner we add a
  migration in S5 (staging-only) — decide during S5, default to client-side batched (no migration).
- pdf.js in a WebView: bundle the lib as a local asset (no CDN, offline-capable, on-device). Validate
  extraction against the 3 real PDFs manually before S7 wiring.
- react-native-webview adds a native dep → prod needs an EAS rebuild before shipping (Expo Go already has it).

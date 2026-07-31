/**
 * LCR member-list PDF parser (S1). Turns the TEXT extracted on-device (pdf.js) from an LCR
 * "Member List" PDF into structured records — language-independent across pt-BR / en / es.
 *
 * The LCR PDF has no delimited columns; it's a text stream where each record is:
 *   <name tokens…> <GENDER> <age> <day> <month> <year> [phone tokens] [email]
 * Names wrap across lines and records split across page boundaries. We DON'T anchor on localized
 * labels (they vary: Nome/Name/Nombre, Sexo/Gender/Sexo…). Instead we anchor structurally on the
 * gender token + age + date, and strip header/title/footer/count structurally.
 *
 * ⚠️ Gender token is language-dependent: pt/en use M(male)/F(female); es uses V(varón=male)/
 * M(mujer=female). We accept V|M|F purely as a structural anchor and never interpret its meaning
 * (the app does not store sex). See specs/pdf-member-import.reference.md.
 */

export interface LcrRecord {
  /** Raw name as printed, typically "Last, First" (reorder happens in S2). */
  name: string;
  /** Phone digits as printed (may be malformed); null when absent. Repair happens in S3. */
  rawPhone: string | null;
  age: number;
}

export interface LcrParseResult {
  records: LcrRecord[];
  /** From the "Count/Contagem/Recuento: N" line, for validation; null if not found. */
  expectedCount: number | null;
}

/**
 * Rule 1 — convert an LCR name from "Last, First" to "First Last". Accents/case and lowercase
 * particles are preserved ("de Oliveira, Fernando" → "Fernando de Oliveira"). A name without a
 * comma is assumed already "First Last" and returned trimmed. Splits on the FIRST comma only.
 */
export function lcrNameToFirstLast(name: string): string {
  const trimmed = name.replace(/\s+/g, ' ').trim();
  const idx = trimmed.indexOf(',');
  if (idx === -1) return trimmed;
  const last = trimmed.slice(0, idx).trim();
  const first = trimmed.slice(idx + 1).trim();
  if (!first) return last;
  if (!last) return first;
  return `${first} ${last}`;
}

// Union of pt/en/es month abbreviations (lowercase, accent-stripped). es "mayo" is 4 letters.
const MONTH_TOKENS = new Set([
  'jan', 'feb', 'fev', 'mar', 'apr', 'abr', 'may', 'mai', 'mayo',
  'jun', 'jul', 'aug', 'ago', 'sep', 'set', 'oct', 'out',
  'nov', 'dec', 'dez', 'dic', 'ene',
]);

// Gender/anchor tokens across languages (V=male in es). Structural only.
const GENDER_TOKENS = new Set(['V', 'M', 'F']);

// Column-label words across pt/en/es (accent-stripped, lowercase) used to drop header lines.
const HEADER_LABEL_WORDS = new Set([
  'nome', 'name', 'nombre', 'sexo', 'gender', 'idade', 'age', 'edad',
  'data', 'fecha', 'nascimento', 'nacimiento', 'birth', 'date',
  'numero', 'number', 'telefone', 'telefono', 'phone',
  'email', 'e-mail', 'correo', 'electronico',
]);

// Count-line labels across pt/en/es.
const COUNT_LINE = /^(contagem|count|recuento|conteo)\s*:?\s*(\d+)\s*$/i;

function stripAccentsLower(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** A header/title line: the ward-id line "… (12345)", or a line built mostly of column labels. */
function isHeaderOrTitleLine(line: string): boolean {
  // Ward line, e.g. "Ala Panamby (539376)" / "Ward … (539376)".
  if (/\(\d{3,}\)\s*$/.test(line)) return true;
  const words = stripAccentsLower(line).split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;
  const labelHits = words.filter((w) => HEADER_LABEL_WORDS.has(w)).length;
  // A label line has no data (no anchor/age/date) and is ≥half column-label words, or a single
  // wrapped label token ("Nascimento", "Telefone", "Número").
  if (labelHits >= 2) return true;
  if (words.length <= 2 && labelHits >= 1) return true;
  return false;
}

/** True when a token is a phone fragment: starts with a digit / ( / + and holds only phone chars. */
function isPhoneToken(tok: string): boolean {
  return /^[+(]?\d[\d()+\-.]*$/.test(tok);
}

/** Join phone fragments preserving the printed form (e.g. "(11) 90000-0011"); S3 normalizes. */
function joinPhone(tokens: string[]): string {
  return tokens.join(' ');
}

/** Anchor at position i: GENDER token, then an integer age (0–120), then a date (day mon year). */
function isAnchorAt(tokens: string[], i: number): boolean {
  const g = tokens[i];
  if (!g || !GENDER_TOKENS.has(g)) return false;
  const age = tokens[i + 1];
  if (!age || !/^\d{1,3}$/.test(age) || Number(age) > 120) return false;
  const day = tokens[i + 2];
  if (!day || !/^\d{1,2}$/.test(day)) return false;
  const mon = tokens[i + 3];
  if (!mon || !MONTH_TOKENS.has(stripAccentsLower(mon).replace(/\.$/, ''))) return false;
  const year = tokens[i + 4];
  if (!year || !/^\d{4}$/.test(year)) return false;
  return true;
}

/** First index in `toks` where an anchor (gender+age+date) begins, or -1. */
function findAnchor(toks: string[]): number {
  for (let i = 0; i < toks.length; i++) if (isAnchorAt(toks, i)) return i;
  return -1;
}

/** A pure line that is leftover contact data (a split email tail or bare phone), not a name. */
function isContactFragment(toks: string[], line: string): boolean {
  return toks.some((t) => t.includes('@')) || toks.every(isPhoneToken) || line.startsWith('.');
}

/**
 * Strip contact residue from a name: emails always follow the name in reading order, so drop the
 * first '@'-bearing token and everything after it, plus any stray phone / ".com" fragments. Keeps
 * accented/particled names intact.
 */
function cleanName(name: string): string {
  const out: string[] = [];
  for (const t of name.split(/\s+/).filter(Boolean)) {
    if (t.includes('@')) break;
    if (isPhoneToken(t) || t.startsWith('.')) continue;
    out.push(t);
  }
  return out.join(' ').trim();
}

/**
 * Parse extracted LCR text into records. The extractor emits one text line per visual PDF line, so
 * a member's name can wrap across lines EITHER before its anchor row ("de Souza Oliveira," / "João
 * M 40 …") or after it ("Sobrenome Junior, Alfa M 43 …" / "José de"). Names are NOT always
 * "Last, First" with a comma (e.g. "Ciclana Beltrana Delta"), so we cannot key off the comma.
 * Instead we keep line structure and "hold" each pure (anchor-less) line until the next anchor
 * line resolves it: if that anchor line carries its OWN name, the held line was the PREVIOUS
 * record's wrapped tail (post-wrap); if the anchor line has no name of its own, the held line IS
 * this record's name (pre-wrap). Contact-only leftovers (a split email TLD, a bare phone) are
 * dropped. Robust to page-split rows, missing phone/email, and emails split across lines.
 */
export function parseLcrText(text: string): LcrParseResult {
  let expectedCount: number | null = null;
  const kept: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/intellectual reserve/i.test(line)) continue; // footer (language-stable brand)
    const cm = line.match(COUNT_LINE);
    if (cm) {
      expectedCount = parseInt(cm[2], 10);
      continue;
    }
    // Ward-id line ("… (539376)"): drop it AND the title line immediately above it (page-1 only).
    if (/\(\d{3,}\)\s*$/.test(line)) {
      if (kept.length) kept.pop();
      continue;
    }
    if (isHeaderOrTitleLine(line)) continue;
    kept.push(line);
  }

  const records: LcrRecord[] = [];
  let held: string[] = []; // pure anchor-less line(s) awaiting pre/post-wrap resolution
  let lastIdx = -1; // record eligible to receive a post-wrap tail
  let expectEmailTail = false; // an email ended with "." → its TLD wrapped to the next line

  const appendName = (idx: number, extra: string[]) => {
    if (idx < 0 || !extra.length) return;
    records[idx].name = `${records[idx].name} ${extra.join(' ')}`.replace(/\s+/g, ' ').trim();
  };

  for (const line of kept) {
    let toks = line.split(/\s+/).filter(Boolean);
    // A wrapped email TLD ("…@HOTMAIL." then "COM") occupies the next line's first token — drop it.
    if (expectEmailTail) {
      expectEmailTail = false;
      toks = toks.slice(1);
    }
    if (!toks.length) continue;

    const at = findAnchor(toks);
    if (at === -1) {
      // Pure line: ignore contact leftovers; otherwise hold it for the next anchor to resolve.
      if (!isContactFragment(toks, line)) held = held.concat(toks);
      continue;
    }

    const nameBefore = toks.slice(0, at);
    if (nameBefore.length > 0) {
      // This record names itself → any held line was the PREVIOUS record's wrapped tail.
      appendName(lastIdx, held);
    }
    // If the anchor line has no name of its own, the held line(s) ARE this record's name.
    const name = (nameBefore.length > 0 ? nameBefore : held).join(' ').replace(/\s+/g, ' ').trim();
    held = [];
    const age = Number(toks[at + 1]);

    // Skip gender + age + day + month + year, then take trailing phone + optional email.
    let j = at + 5;
    const phoneTokens: string[] = [];
    while (j < toks.length && !isAnchorAt(toks, j) && isPhoneToken(toks[j])) {
      phoneTokens.push(toks[j]);
      j += 1;
    }
    if (j < toks.length && toks[j].includes('@')) {
      const endedWithDot = toks[j].endsWith('.');
      j += 1;
      if (j < toks.length && (endedWithDot || toks[j].startsWith('.'))) j += 1;
      else if (endedWithDot) expectEmailTail = true; // TLD wrapped to the next line
    }

    records.push({ name, rawPhone: phoneTokens.length ? joinPhone(phoneTokens) : null, age });
    lastIdx = records.length - 1;

    // Any name tokens still trailing on THIS line (overflow that didn't wrap) belong to this record.
    appendName(lastIdx, toks.slice(j).filter((t) => !t.includes('@') && !isPhoneToken(t)));
  }

  // A wrapped tail on the very last record has no following anchor line to resolve it.
  appendName(lastIdx, held);

  for (const r of records) r.name = cleanName(r.name);
  return { records, expectedCount };
}

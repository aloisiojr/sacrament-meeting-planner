/**
 * Runs the real LCR import pipeline over every PDF in a folder and reports what changes.
 *
 *   node scripts/check-lcr-pdfs.mjs [pasta]      # default: repo root
 *
 * Why this exists: the row-grouping threshold is inferred from each PDF's own line spacing, so a
 * new ward's export can behave differently from every file seen before. The unit tests pin the gap
 * histograms of the files shared so far (src/__tests__/lcr-row-threshold.test.ts); this script is
 * how you check a NEW file, and how you refresh those histograms.
 *
 * The PDFs are never committed — they carry members' names, phones and e-mails. Keep them local.
 *
 * It prints, per file, the record count against the PDF's own "Count:" line, plus a diff of the
 * parsed records between the CURRENT threshold and the legacy one, so a regression is visible as a
 * name or phone moving between people.
 */
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const dir = process.argv[2] ?? '.';

/** The threshold this repo ships, kept in sync by importing the compiled source below. */
const out = join(tmpdir(), `lcr-check-${process.pid}`);
execSync(
  `npx tsc --ignoreConfig src/lib/lcrPdfLayout.ts src/lib/lcrPdfParser.ts --outDir ${out} --module esnext --target es2020`,
  { stdio: 'inherit' }
);
const { rowGapThreshold } = await import(join(out, 'lcrPdfLayout.js'));
const { parseLcrText } = await import(join(out, 'lcrPdfParser.js'));

/** The rule that shipped before the three-line-name fix, for comparison only. */
const legacyThreshold = (freq) => {
  const common = [...freq.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  if (common.length < 2) return Infinity;
  return (Math.min(common[0], common[1]) + Math.max(common[0], common[1])) / 2;
};

/** Mirrors PdfTextExtractor: lines by Y, name/data split by the gender column, rows by gap. */
async function extract(file, thresholdFn) {
  const doc = await getDocument({ data: new Uint8Array(readFileSync(file)) }).promise;
  const pages = [];
  const freq = new Map();
  const genderXs = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    const lines = new Map();
    for (const it of tc.items) {
      if (typeof it.str !== 'string' || !it.str.trim()) continue;
      const y = Math.round(it.transform[5]);
      const o = {
        x: it.transform[4],
        w: it.width || 0,
        size: Math.hypot(it.transform[2], it.transform[3]) || it.height || 8,
        s: it.str,
        y,
      };
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y).push(o);
      if (/^[VMF]$/.test(o.s.trim())) genderXs.push(o.x);
    }
    const ys = [...lines.keys()].sort((a, b) => b - a);
    pages.push({ ys, lines });
    for (let k = 1; k < ys.length; k++) {
      const g = Math.round(Math.abs(ys[k - 1] - ys[k]));
      if (g > 0) freq.set(g, (freq.get(g) || 0) + 1);
    }
  }
  let boundary = Infinity;
  if (genderXs.length) {
    genderXs.sort((a, b) => a - b);
    boundary = genderXs[Math.floor(genderXs.length / 2)] - 4;
  }
  const threshold = thresholdFn(freq);

  const joinCol = (items) => {
    const byY = new Map();
    for (const o of items) {
      if (!byY.has(o.y)) byY.set(o.y, []);
      byY.get(o.y).push(o);
    }
    const parts = [];
    for (const y of [...byY.keys()].sort((a, b) => b - a)) {
      const arr = byY.get(y).map((o, i) => ({ ...o, i })).sort((a, b) => a.x - b.x || a.i - b.i);
      let text = '';
      let prevEnd = null;
      for (const o of arr) {
        if (prevEnd !== null && o.x - prevEnd > o.size * 0.2 && !text.endsWith(' ') && !o.s.startsWith(' ')) text += ' ';
        text += o.s;
        prevEnd = o.x + o.w;
      }
      parts.push(text.trim());
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  };

  const rows = [];
  for (const pg of pages) {
    let cur = [];
    const flush = () => {
      if (!cur.length) return;
      const items = cur.flatMap((y) => pg.lines.get(y));
      const line = `${joinCol(items.filter((o) => o.x < boundary))} ${joinCol(items.filter((o) => o.x >= boundary))}`.trim();
      if (line) rows.push(line);
      cur = [];
    };
    for (let k = 0; k < pg.ys.length; k++) {
      // >= mirrors PdfTextExtractor; with > this script could clear a file the app would split.
      if (k && Math.abs(pg.ys[k - 1] - pg.ys[k]) >= threshold) flush();
      cur.push(pg.ys[k]);
    }
    flush();
  }
  return { text: rows.join('\n'), threshold, freq };
}

const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.pdf')).sort();
if (!files.length) {
  console.log(`nenhum PDF em ${dir}`);
  process.exit(0);
}

let problemas = 0;
for (const f of files) {
  const path = join(dir, f);
  const atual = await extract(path, rowGapThreshold);
  const antigo = await extract(path, legacyThreshold);
  const a = parseLcrText(atual.text);
  const b = parseLcrText(antigo.text);

  const bate = a.expectedCount == null || a.records.length === a.expectedCount;
  if (!bate) problemas++;
  console.log(
    `\n${f}\n  limiar ${antigo.threshold} → ${atual.threshold}` +
      `  |  registros ${a.records.length}` +
      (a.expectedCount == null ? ' (PDF não declara total)' : `/${a.expectedCount} ${bate ? 'OK' : '✗ NÃO BATE'}`) +
      `  |  sem telefone ${a.records.filter((r) => !r.rawPhone).length}`
  );

  const key = (r) => `${r.name} | ${r.rawPhone ?? 'sem telefone'} | ${r.age}`;
  const antes = new Set(b.records.map(key));
  const depois = new Set(a.records.map(key));
  const novos = [...depois].filter((k) => !antes.has(k));
  const sumiram = [...antes].filter((k) => !depois.has(k));
  if (novos.length) {
    console.log('  registros que MUDAM em relação ao limiar antigo (confira se melhoraram):');
    for (let i = 0; i < Math.max(novos.length, sumiram.length); i++) {
      if (sumiram[i]) console.log(`    - ${sumiram[i]}`);
      if (novos[i]) console.log(`    + ${novos[i]}`);
    }
  }
}
console.log(problemas ? `\n✗ ${problemas} arquivo(s) com contagem divergente` : '\nTodos os totais batem.');

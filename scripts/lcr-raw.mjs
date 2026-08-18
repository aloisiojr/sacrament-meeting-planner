/**
 * Réplica em Node do que a WebView faz: lê um PDF e devolve `LcrRawPage[]`.
 *
 * Existe porque nada em `src/components/PdfTextExtractor.tsx` roda no jest — ele só executa dentro
 * de uma WebView, num aparelho. Este módulo permite exercitar todo o resto do pipeline contra os
 * PDFs reais na máquina, que é onde AC15–AC17 são verificados. Se ele divergir do bootstrap, a
 * verificação mente; mantenha os dois em passo.
 *
 * Os PDFs nunca entram no repositório — carregam nome, telefone e e-mail de membros.
 */
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const round = (n) => Math.round(n * 100) / 100;

const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];

/** Lê um PDF e devolve as páginas cruas, no mesmo formato que a WebView posta. */
export async function rawPages(file) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(file)) }).promise;
  const OPS = pdfjs.OPS;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const items = [];
    for (const it of (await page.getTextContent()).items) {
      if (typeof it.str !== 'string' || !it.str.trim()) continue;
      items.push({
        x: round(it.transform[4]),
        y: round(it.transform[5]),
        w: round(it.width || 0),
        size: round(Math.hypot(it.transform[2], it.transform[3]) || it.height || 8),
        s: it.str,
      });
    }
    const segments = [];
    const rects = [];
    const ol = await page.getOperatorList();
    let fill = null;
    let ctm = [1, 0, 0, 1, 0, 0];
    const stack = [];
    for (let i = 0; i < ol.fnArray.length; i++) {
      const fn = ol.fnArray[i];
      if (fn === OPS.save) { stack.push(ctm.slice()); continue; }
      if (fn === OPS.restore) { ctm = stack.pop() || ctm; continue; }
      if (fn === OPS.transform) { ctm = mul(ctm, ol.argsArray[i]); continue; }
      if (fn === OPS.setFillRGBColor) { fill = ol.argsArray[i].join(','); continue; }
      if (fn !== OPS.constructPath) continue;
      const m = ctm.map(round);
      const pathOps = ol.argsArray[i][0];
      const args = ol.argsArray[i][1];
      let k = 0;
      let prev = null;
      for (const op of pathOps) {
        if (op === OPS.rectangle) {
          rects.push({
            x: round(args[k]), y: round(args[k + 1]),
            w: round(args[k + 2]), h: round(args[k + 3]), color: fill, m,
          });
          k += 4;
          prev = null;
        } else if (op === OPS.moveTo || op === OPS.lineTo) {
          const pt = [args[k], args[k + 1]];
          if (prev && op === OPS.lineTo) {
            segments.push({
              x1: round(prev[0]), y1: round(prev[1]),
              x2: round(pt[0]), y2: round(pt[1]), m,
            });
          }
          prev = pt;
          k += 2;
        } else if (op === OPS.curveTo) {
          k += 6;
          prev = null;
        }
      }
    }
    const view = page.getViewport({ scale: 1 });
    pages.push({ width: view.width, height: view.height, items, segments, rects });
  }
  return pages;
}

/**
 * Compila os módulos de `src/lib` e os importa. O `tsc` emite import sem extensão, que o ESM do
 * Node recusa — daí o ajuste.
 */
export async function loadLib(names) {
  const out = join(tmpdir(), `lcr-lib-${process.pid}`);
  const files = names.map((n) => `src/lib/${n}.ts`).join(' ');
  execSync(`npx tsc --ignoreConfig ${files} --outDir ${out} --module esnext --target es2020`, {
    stdio: 'inherit',
  });
  execSync(`sed -i '' "s|from '\\./\\([A-Za-z]*\\)'|from './\\1.js'|g" ${out}/*.js`);
  const mods = {};
  for (const n of names) Object.assign(mods, await import(join(out, `${n}.js`)));
  return mods;
}

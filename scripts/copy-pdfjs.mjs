/**
 * DEC-07/ARQ-11 — copia o pdf.js embarcado de `node_modules/pdfjs-dist` (versão do lock)
 * para `assets/pdfjs/*.txt` e escreve `assets/pdfjs/VERSION` com versão + sha256 de cada
 * arquivo gerado. Sem este script os `.txt` eram binário commitado sem proveniência,
 * executado numa WebView com PII de membros.
 *
 * Fonte é `legacy/build`, NÃO `build/`: os `.txt` históricos são byte-idênticos ao build
 * legacy (medido por sha256 contra o pacote 4.10.38) e é ele que WebViews antigas rodam.
 *
 * Uso: `node scripts/copy-pdfjs.mjs` (após instalar/atualizar pdfjs-dist).
 * O teste `src/__tests__/pdfjs-provenance.test.ts` confere VERSION × arquivos × pacote.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = path.join(root, 'node_modules', 'pdfjs-dist');
const outDir = path.join(root, 'assets', 'pdfjs');

const FILES = [
  { from: 'legacy/build/pdf.min.mjs', to: 'pdf.min.mjs.txt' },
  { from: 'legacy/build/pdf.worker.min.mjs', to: 'pdf.worker.min.mjs.txt' },
];

const pkgJsonPath = path.join(pkgDir, 'package.json');
if (!fs.existsSync(pkgJsonPath)) {
  console.error('node_modules/pdfjs-dist not found — run `npm ci` first.');
  process.exit(1);
}
const version = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')).version;

fs.mkdirSync(outDir, { recursive: true });
const lines = [`pdfjs-dist ${version}`, 'source: node_modules/pdfjs-dist/legacy/build'];
for (const { from, to } of FILES) {
  const src = path.join(pkgDir, from);
  if (!fs.existsSync(src)) {
    console.error(`Missing ${src} — did pdfjs-dist change its layout?`);
    process.exit(1);
  }
  const bytes = fs.readFileSync(src);
  fs.writeFileSync(path.join(outDir, to), bytes);
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  lines.push(`${to} sha256=${sha256} bytes=${bytes.length}`);
  console.log(`wrote assets/pdfjs/${to}  ${bytes.length} bytes  sha256=${sha256}`);
}
fs.writeFileSync(path.join(outDir, 'VERSION'), `${lines.join('\n')}\n`);
console.log(`wrote assets/pdfjs/VERSION (pdfjs-dist ${version})`);

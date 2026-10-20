/**
 * DEC-07/ARQ-11 — proveniência do pdf.js embarcado: os `assets/pdfjs/*.txt` executados na
 * WebView precisam bater com o sha256 registrado em `assets/pdfjs/VERSION` e, quando o
 * pacote está instalado, com o `pdfjs-dist` do lock. Binário divergente falha o CI.
 * (Ler estes artefatos gerados é a verificação — não é assert sobre código-fonte.)
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const assetsDir = path.join(root, 'assets', 'pdfjs');
const FILES = ['pdf.min.mjs.txt', 'pdf.worker.min.mjs.txt'] as const;

const sha256 = (buf: Buffer) => crypto.createHash('sha256').update(buf).digest('hex');

function parseVersionFile() {
  const text = fs.readFileSync(path.join(assetsDir, 'VERSION'), 'utf8');
  const version = /^pdfjs-dist (\S+)$/m.exec(text)?.[1];
  const entries = new Map<string, { sha256: string; bytes: number }>();
  for (const m of text.matchAll(/^(\S+\.txt) sha256=([0-9a-f]{64}) bytes=(\d+)$/gm)) {
    entries.set(m[1], { sha256: m[2], bytes: Number(m[3]) });
  }
  return { version, entries };
}

describe('pdfjs provenance (DEC-07/ARQ-11)', () => {
  it('committed .txt files match the sha256/bytes recorded in VERSION', () => {
    const { version, entries } = parseVersionFile();
    expect(version).toBeTruthy();
    for (const file of FILES) {
      const expected = entries.get(file);
      expect(expected).toBeDefined();
      const bytes = fs.readFileSync(path.join(assetsDir, file));
      expect(bytes.length).toBe(expected?.bytes);
      expect(sha256(bytes)).toBe(expected?.sha256);
    }
  });

  it('matches the installed pdfjs-dist package when node_modules is present', () => {
    const pkgDir = path.join(root, 'node_modules', 'pdfjs-dist');
    if (!fs.existsSync(path.join(pkgDir, 'package.json'))) {
      // Sem pacote instalado só o checksum interno (teste acima) pode conferir.
      return;
    }
    const { version, entries } = parseVersionFile();
    const installed = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8')) as {
      version: string;
    };
    expect(version).toBe(installed.version);
    const sources: Record<string, string> = {
      'pdf.min.mjs.txt': 'legacy/build/pdf.min.mjs',
      'pdf.worker.min.mjs.txt': 'legacy/build/pdf.worker.min.mjs',
    };
    for (const file of FILES) {
      const installedBytes = fs.readFileSync(path.join(pkgDir, sources[file]));
      expect(sha256(installedBytes)).toBe(entries.get(file)?.sha256);
      expect(fs.readFileSync(path.join(assetsDir, file)).equals(installedBytes)).toBe(true);
    }
  });
});

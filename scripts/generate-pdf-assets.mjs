/**
 * Pre-generate the PDF's image assets: the store QR codes and a print-sized app icon.
 *
 * Build time, not runtime: the URLs are fixed, so a committed asset is deterministic, adds no
 * runtime dependency, and cannot misbehave under Hermes. `qrcode` is a devDependency for exactly
 * this reason.
 *
 * Run after changing a URL in src/lib/storeLinks.ts or replacing assets/icon.png:
 *   node scripts/generate-pdf-assets.mjs
 *
 * A store whose url is null produces no asset — the PDF footer renders only what exists.
 */
import fs from 'node:fs';
import path from 'node:path';
import QRCode from 'qrcode';
import { PNG } from 'pngjs';

const OUT_DIR = path.resolve('assets');

// storeLinks.ts is TypeScript; read the URLs out of it rather than duplicating them here, so this
// script cannot disagree with the app.
const source = fs.readFileSync(path.resolve('src/lib/storeLinks.ts'), 'utf8');
const entries = [...source.matchAll(/id:\s*'(\w+)'[\s\S]*?url:\s*(?:'([^']*)'|null)/g)].map((m) => ({
  id: m[1],
  url: m[2] ?? null,
}));

if (entries.length === 0) {
  console.error('No store entries parsed from src/lib/storeLinks.ts — did its shape change?');
  process.exit(1);
}

let written = 0;
for (const { id, url } of entries) {
  const file = path.join(OUT_DIR, `store-qr-${id}.png`);
  if (!url) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`removed  ${file} (no url configured)`);
    } else {
      console.log(`skipped  ${id} (no url configured)`);
    }
    continue;
  }
  await QRCode.toFile(file, url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 480, // generous: the PDF renders it small, but print resolution is not screen resolution
    color: { dark: '#000000ff', light: '#ffffffff' },
  });
  console.log(`wrote    ${file}  ->  ${url}`);
  written += 1;
}

console.log(`\n${written} QR asset(s) generated.`);

// -----------------------------------------------------------------------------
// Print-sized app icon.
//
// assets/icon.png is 1024x1024 / 1.7 MB. The PDF header renders it at ~46pt and the image is
// base64-inlined into every generated document — at full size that is a 2.3 MB HTML string for the
// device's print engine to parse, on every export. Downscaled it is a few tens of KB.
//
// 192px stays sharp at 46pt on a 300dpi printer.
// -----------------------------------------------------------------------------
const ICON_SIZE = 192;

function downscale(src, size) {
  const out = new PNG({ width: size, height: size });
  const sx = src.width / size;
  const sy = src.height / size;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Box filter: average the source block this output pixel covers. Nearest-neighbour on a
      // 5x reduction would alias the icon's curves badly.
      const x0 = Math.floor(x * sx), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sx));
      const y0 = Math.floor(y * sy), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sy));
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let yy = y0; yy < y1 && yy < src.height; yy++) {
        for (let xx = x0; xx < x1 && xx < src.width; xx++) {
          const i = (src.width * yy + xx) << 2;
          r += src.data[i]; g += src.data[i + 1]; b += src.data[i + 2]; a += src.data[i + 3];
          n++;
        }
      }
      const o = (size * y + x) << 2;
      out.data[o] = Math.round(r / n);
      out.data[o + 1] = Math.round(g / n);
      out.data[o + 2] = Math.round(b / n);
      out.data[o + 3] = Math.round(a / n);
    }
  }
  return out;
}

const srcIcon = PNG.sync.read(fs.readFileSync(path.join(OUT_DIR, 'icon.png')));
const iconOut = path.join(OUT_DIR, 'pdf-icon.png');
fs.writeFileSync(iconOut, PNG.sync.write(downscale(srcIcon, ICON_SIZE)));
const before = fs.statSync(path.join(OUT_DIR, 'icon.png')).size;
const after = fs.statSync(iconOut).size;
console.log(
  `wrote    ${iconOut}  ${ICON_SIZE}x${ICON_SIZE}  ` +
  `${(after / 1024).toFixed(1)} KB (from ${(before / 1024).toFixed(1)} KB)`
);

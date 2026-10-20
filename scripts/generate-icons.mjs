#!/usr/bin/env node
/**
 * generate-icons — RAP-05: one icon source, everything else derived.
 *
 * Source of truth: `assets/icon.png` (1024×1024). From it this script derives:
 *   - assets/favicon.png     192×192 (web favicon; was the 1.7 MB 1024px source)
 *   - assets/favicon-48.png   48×48
 * and recompresses (same pixels, same dimensions, max deflate):
 *   - assets/adaptive-icon.png, assets/splash-icon.png
 *
 * Store art is NOT derived here and does not belong in `assets/`:
 * `assets/store/icon-512.png` and `assets/store/feature-graphic.png` are
 * Play Console uploads, referenced by no code path.
 *
 * Run: node scripts/generate-icons.mjs   (requires pngjs, a devDependency)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const SOURCE = 'assets/icon.png';

function resizeBilinear(src, dstW, dstH) {
  const dst = new PNG({ width: dstW, height: dstH });
  const scaleX = src.width / dstW;
  const scaleY = src.height / dstH;
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const gx = Math.min(src.width - 1.001, x * scaleX);
      const gy = Math.min(src.height - 1.001, y * scaleY);
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const fx = gx - x0;
      const fy = gy - y0;
      const di = (y * dstW + x) * 4;
      for (let c = 0; c < 4; c++) {
        const p00 = src.data[(y0 * src.width + x0) * 4 + c];
        const p10 = src.data[(y0 * src.width + x0 + 1) * 4 + c];
        const p01 = src.data[((y0 + 1) * src.width + x0) * 4 + c];
        const p11 = src.data[((y0 + 1) * src.width + x0 + 1) * 4 + c];
        dst.data[di + c] = Math.round(
          p00 * (1 - fx) * (1 - fy) + p10 * fx * (1 - fy) + p01 * (1 - fx) * fy + p11 * fx * fy
        );
      }
    }
  }
  return dst;
}

function writePng(path, png) {
  const buf = PNG.sync.write(png, { deflateLevel: 9, filterType: 4 });
  writeFileSync(path, buf);
  console.log(`${path}: ${png.width}x${png.height}, ${buf.length} B`);
}

const source = PNG.sync.read(readFileSync(SOURCE));
console.log(`${SOURCE} (fonte única): ${source.width}x${source.height}`);

writePng('assets/favicon.png', resizeBilinear(source, 192, 192));
writePng('assets/favicon-48.png', resizeBilinear(source, 48, 48));

for (const path of ['assets/adaptive-icon.png', 'assets/splash-icon.png']) {
  const png = PNG.sync.read(readFileSync(path));
  writePng(path, png); // mesmos pixels, compressão melhor
}

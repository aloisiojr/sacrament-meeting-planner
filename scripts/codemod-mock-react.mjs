/**
 * One-shot codemod for the vitest -> jest migration.
 *
 * `jest.mock()` factories are hoisted above imports, so the module-scope `React` binding is not
 * visible inside them. `require` IS on jest's allow-list, so `React.createElement(...)` becomes
 * `require('react').createElement(...)` — but only inside factory bodies; ordinary test code keeps
 * using the imported `React`.
 *
 * Delete this file once the migration has landed.
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const QUOTES = new Set(["'", '"', '`']);

/** Index of the `)` matching the `(` at `open`, or -1. */
function matchParen(src, open) {
  let depth = 0;
  let quote = null;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === quote && src[i - 1] !== '\\') quote = null;
      continue;
    }
    if (QUOTES.has(c)) {
      quote = c;
      continue;
    }
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const files = execSync('grep -rl "jest.mock(" src/__tests__', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

let totalSites = 0;
let totalFiles = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  let out = '';
  let i = 0;
  let hits = 0;

  for (;;) {
    const j = src.indexOf('jest.mock(', i);
    if (j < 0) {
      out += src.slice(i);
      break;
    }
    const open = j + 'jest.mock'.length;
    const end = matchParen(src, open);
    if (end < 0) {
      out += src.slice(i);
      break;
    }

    const block = src.slice(j, end + 1);
    const rewritten = block.replace(/\bReact\.createElement\b/g, () => {
      hits++;
      return "require('react').createElement";
    });

    out += src.slice(i, j) + rewritten;
    i = end + 1;
  }

  if (hits) {
    fs.writeFileSync(file, out);
    totalSites += hits;
    totalFiles++;
    console.log(`  ${file.replace('src/__tests__/', '')}: ${hits}`);
  }
}

console.log(`React.createElement sites rewritten inside factories: ${totalSites} in ${totalFiles} file(s)`);

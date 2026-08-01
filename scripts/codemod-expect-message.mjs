/**
 * One-shot codemod: vitest allows `expect(value, 'message')`; jest's `expect` takes a single
 * argument. Strips the second argument, leaving `expect(value)`. Jest's own diff output still
 * shows the offending value, so the diagnostic is preserved in practice.
 *
 * Delete this file once the vitest -> jest migration has landed.
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const QUOTES = new Set(["'", '"', '`']);

/** Split an argument list on top-level commas, respecting nesting and quotes. */
function splitTopLevel(src) {
  const out = [];
  let depth = 0;
  let cur = '';
  let quote = null;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      cur += c;
      if (c === quote && src[i - 1] !== '\\') quote = null;
      continue;
    }
    if (QUOTES.has(c)) {
      quote = c;
      cur += c;
      continue;
    }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    if (c === ',' && depth === 0) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

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

const files = execSync('grep -rl "expect(" src/__tests__', { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);

let total = 0;
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  let out = '';
  let i = 0;
  let hits = 0;

  for (;;) {
    const j = src.indexOf('expect(', i);
    if (j < 0) {
      out += src.slice(i);
      break;
    }
    const open = j + 'expect'.length;
    const end = matchParen(src, open);
    if (end < 0) {
      out += src.slice(i);
      break;
    }
    const args = splitTopLevel(src.slice(open + 1, end));
    if (args.length === 2) {
      out += src.slice(i, open + 1) + args[0].trim() + ')';
      hits++;
    } else {
      out += src.slice(i, end + 1);
    }
    i = end + 1;
  }

  if (hits) {
    fs.writeFileSync(file, out);
    total += hits;
    console.log(`  ${file.replace('src/__tests__/', '')}: ${hits}`);
  }
}
console.log(`expect() two-arg calls rewritten: ${total}`);

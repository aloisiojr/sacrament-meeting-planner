/**
 * One-shot codemod for the vitest -> jest migration.
 *
 * babel-plugin-jest-hoist lifts `jest.mock()` factories above the imports, so a factory may only
 * reference out-of-scope bindings whose name starts with `mock` (case-insensitive). vitest had no
 * such rule, so the ported files reference plain locals.
 *
 * Rather than guess which identifiers matter, this runs jest, reads the
 * "Invalid variable access: X" diagnostics, renames X -> mockX in the reporting file, and repeats
 * until jest stops reporting them. Jest surfaces only the first offender per file, hence the loop.
 *
 * `React` is deliberately skipped: the fix there is a `require('react')` inside the factory, not a
 * rename. Those are handled separately.
 *
 * Delete this file once the migration has landed.
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const SKIP = new Set(['React']);
const MAX_ROUNDS = 15;

function collectViolations() {
  let out = '';
  try {
    out = execSync('npx jest --selectProjects ios 2>&1', {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (e) {
    out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }

  const found = new Map(); // file -> Set(identifier)
  const re =
    /ReferenceError: (\/[^\s:]+\.tsx?): The module factory of `jest\.mock\(\)` is not allowed[\s\S]{0,200}?Invalid variable access: (\w+)/g;
  let m;
  while ((m = re.exec(out))) {
    const [, file, name] = m;
    if (SKIP.has(name)) continue;
    if (/^mock/i.test(name)) continue;
    if (!found.has(file)) found.set(file, new Set());
    found.get(file).add(name);
  }
  return found;
}

let round = 0;
let renamedTotal = 0;

for (;;) {
  round++;
  if (round > MAX_ROUNDS) {
    console.log(`stopped after ${MAX_ROUNDS} rounds — remaining violations need manual review`);
    break;
  }

  const violations = collectViolations();
  if (violations.size === 0) {
    console.log(`\nno more rename-able violations after ${round - 1} round(s)`);
    break;
  }

  console.log(`\n── round ${round}: ${violations.size} file(s)`);
  for (const [file, names] of violations) {
    let src = fs.readFileSync(file, 'utf8');
    for (const name of names) {
      const renamed = `mock${name.charAt(0).toUpperCase()}${name.slice(1)}`;
      src = src.replace(new RegExp(`\\b${name}\\b`, 'g'), renamed);
      console.log(`   ${file.split('/').pop()}: ${name} -> ${renamed}`);
      renamedTotal++;
    }
    fs.writeFileSync(file, src);
  }
}

console.log(`\ntotal identifiers renamed: ${renamedTotal}`);

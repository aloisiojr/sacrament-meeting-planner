/**
 * Systematic mutation audit.
 *
 * Hand-picked mutations prove what the author already suspected. This applies a fixed catalogue of
 * operator/literal mutations to every target file, one at a time, and runs only the tests related
 * to that file. A mutation that SURVIVES (tests still green) is a hole: production behaviour
 * changed and nothing noticed.
 *
 * Usage: node scripts/mutation-audit.mjs [--targets <fileList>] [--limit N]
 * Output: scripts/.mutation-report.json + a summary on stdout.
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

/** Text-level mutations that stay syntactically valid. */
const OPERATORS = [
  { name: 'eq->neq', find: / === /g, replace: ' !== ' },
  { name: 'neq->eq', find: / !== /g, replace: ' === ' },
  { name: 'and->or', find: / && /g, replace: ' || ' },
  { name: 'lt->lte', find: / < /g, replace: ' <= ' },
  { name: 'gt->gte', find: / > /g, replace: ' >= ' },
  { name: 'true->false', find: /\btrue\b/g, replace: 'false' },
  { name: 'false->true', find: /\bfalse\b/g, replace: 'true' },
];

const TARGETS = [
  'src/lib/permissions.ts',
  'src/lib/offlineQueue.ts',
  'src/lib/offlineGuard.ts',
  'src/lib/connectionUtils.ts',
  'src/lib/sync.ts',
  'src/hooks/useConnection.ts',
  'src/hooks/useRealtimeSync.ts',
  'src/hooks/useOfflineQueueProcessor.ts',
  'src/hooks/useVersionGate.ts',
  'src/contexts/AuthContext.tsx',
  'src/providers/SyncProvider.tsx',
  'src/app/(auth)/login.tsx',
  'src/app/(auth)/register.tsx',
  'src/app/(tabs)/settings/users.tsx',
  'src/app/(tabs)/settings/index.tsx',
  'src/components/AttendanceBlock.tsx',
  'src/components/InviteActionDropdown.tsx',
];

const argv = process.argv.slice(2);
const limitArg = argv.indexOf('--limit');
const LIMIT = limitArg >= 0 ? Number(argv[limitArg + 1]) : 8;

/**
 * Number of failing tests related to `file`.
 *
 * Comparing counts rather than demanding green: two tests in this suite fail ON PURPOSE (they
 * track product gaps), and --testPathIgnorePatterns does not compose with --findRelatedTests, so
 * requiring green would mark every file "baseline red" and make killed indistinguishable from
 * survived.
 */
function relatedFailures(file) {
  let out = '';
  try {
    out = execSync(
      `npx jest --selectProjects ios --findRelatedTests "${file}" --passWithNoTests 2>&1`,
      { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }
    );
  } catch (e) {
    out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }
  const m = out.match(/Tests:\s+(?:(\d+) failed,\s*)?(?:\d+ passed,\s*)?(\d+) total/);
  if (!m) return null; // could not parse — treat as unusable
  return Number(m[1] ?? 0);
}

const report = [];

for (const file of TARGETS) {
  if (!fs.existsSync(file)) {
    console.log(`SKIP (missing): ${file}`);
    continue;
  }

  const original = fs.readFileSync(file, 'utf8');

  const baseline = relatedFailures(file);
  if (baseline === null) {
    console.log(`SKIP (unparseable): ${file}`);
    report.push({ file, skipped: 'unparseable' });
    continue;
  }

  // Mask comments and string literals: mutating `@returns true if...` in a docstring produces a
  // meaningless "survivor" and inflates the report. My first run had 3 of 4 survivors like that.
  const masked = original
    .replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length))
    .replace(/'(?:[^'\\\n]|\\.)*'/g, (m) => ' '.repeat(m.length))
    .replace(/"(?:[^"\\\n]|\\.)*"/g, (m) => ' '.repeat(m.length))
    .replace(/`(?:[^`\\]|\\.)*`/g, (m) => ' '.repeat(m.length));

  // Build the candidate mutations for this file, capped so the run stays bounded.
  const candidates = [];
  for (const op of OPERATORS) {
    const matches = [...masked.matchAll(op.find)];
    for (let i = 0; i < matches.length; i++) {
      candidates.push({ op: op.name, index: matches[i].index, find: op.find, replace: op.replace });
    }
  }

  // Spread the sample across operators rather than taking the first N of one kind.
  const byOp = new Map();
  for (const c of candidates) {
    if (!byOp.has(c.op)) byOp.set(c.op, []);
    byOp.get(c.op).push(c);
  }
  const sample = [];
  let round = 0;
  while (sample.length < LIMIT) {
    let added = false;
    for (const list of byOp.values()) {
      if (list[round]) {
        sample.push(list[round]);
        added = true;
        if (sample.length >= LIMIT) break;
      }
    }
    if (!added) break;
    round++;
  }

  let killed = 0;
  const survivors = [];

  for (const m of sample) {
    const mutated =
      original.slice(0, m.index) +
      original.slice(m.index).replace(m.find, m.replace).slice(0, 0) +
      (() => {
        // Replace only the single occurrence at m.index.
        const tail = original.slice(m.index);
        const once = tail.replace(m.find, m.replace);
        // `replace` with a /g regex replaces all; rebuild manually for a single hit.
        const matchText = tail.match(new RegExp(m.find.source))?.[0] ?? '';
        return matchText
          ? tail.slice(0, tail.indexOf(matchText)) +
              m.replace +
              tail.slice(tail.indexOf(matchText) + matchText.length)
          : once;
      })();

    if (mutated === original) continue;

    fs.writeFileSync(file, mutated);
    const failures = relatedFailures(file);
    fs.writeFileSync(file, original);

    // Killed = the mutation made MORE tests fail than the known baseline.
    if (failures !== null && failures <= baseline) {
      const line = original.slice(0, m.index).split('\n').length;
      survivors.push({ op: m.op, line });
    } else {
      killed++;
    }
  }

  const total = killed + survivors.length;
  const score = total ? Math.round((killed / total) * 100) : 0;
  console.log(
    `${String(score).padStart(3)}%  ${String(killed).padStart(2)}/${String(total).padEnd(2)} killed  ${file}` +
      (survivors.length ? `   SURVIVORS: ${survivors.map((s) => `${s.op}@L${s.line}`).join(', ')}` : '')
  );
  report.push({ file, killed, total, score, survivors });
}

fs.writeFileSync('scripts/.mutation-report.json', JSON.stringify(report, null, 2));

const scored = report.filter((r) => r.total > 0);
const totalKilled = scored.reduce((a, r) => a + r.killed, 0);
const totalRun = scored.reduce((a, r) => a + r.total, 0);
console.log(
  `\nOVERALL: ${totalKilled}/${totalRun} mutations killed (${Math.round((totalKilled / totalRun) * 100)}%)`
);

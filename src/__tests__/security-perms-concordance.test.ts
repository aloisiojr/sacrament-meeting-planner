/**
 * Concordance: one authorization rule, three representations (DEC-04 / ARQ-06).
 *
 * The rule "bishopric and secretary are distinct roles with the same permissions; everyone
 * else is read-only" necessarily lives in three places: this client (lib/permissions.ts),
 * SQL (public.can_write()'s allowlist + role CHECKs), and the Edge Functions (Deno cannot
 * import from src/, so each carries a literal role list). They agree today; nothing used to
 * prove it. This suite is that proof, and it is deliberately COMPLETE — every permission ×
 * every role, every migration that redefines can_write, every Edge Function file — never a
 * sample ("6 of 7" is how the old database-types test produced false confidence, ARQ-07).
 *
 * For SQL there is no database inside jest, so the suite parses the SETS out of the migration
 * definitions and asserts set equality against the imported client constants (the project
 * rule: where a rule is written in two places, assert the two AGREE). Edge Function role
 * lists are checked the same way; their runtime behavior per role is executed for real in
 * the edge-*.test.ts suites via the harness.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  ALL_PERMISSIONS,
  ALL_ROLES,
  PERMISSIONS_MAP,
  WRITER_PERMISSIONS,
  WRITER_ROLES,
  getPermissions,
  hasPermission,
  isWriterRole,
  type Role,
} from '../lib/permissions';

const REPO_ROOT = path.resolve(__dirname, '../..');
const sorted = (xs: Iterable<string>) => [...xs].sort();

/** Quoted role names inside a SQL `IN (...)` list or a TS array literal body. */
function quotedRoles(body: string): string[] {
  return [...body.matchAll(/'(bishopric|secretary|observer)'/g)].map((m) => m[1]);
}

describe('client: one canonical writer set (DEC-04)', () => {
  it('bishopric and secretary hold exactly the same permissions', () => {
    expect(sorted(getPermissions('bishopric'))).toEqual(sorted(getPermissions('secretary')));
  });

  it('the writer set IS the whole permission universe (nothing lives outside it)', () => {
    expect(sorted(WRITER_PERMISSIONS)).toEqual(sorted(ALL_PERMISSIONS));
    for (const role of WRITER_ROLES) {
      expect(sorted(getPermissions(role))).toEqual(sorted(ALL_PERMISSIONS));
    }
  });

  it('both writer roles agree on EVERY permission (no cell left unchecked)', () => {
    for (const perm of ALL_PERMISSIONS) {
      expect(hasPermission('bishopric', perm)).toBe(hasPermission('secretary', perm));
      expect(hasPermission('bishopric', perm)).toBe(true);
    }
  });

  it('observer holds only read permissions, all drawn from the canonical set', () => {
    const observerPerms = getPermissions('observer');
    expect(sorted(observerPerms)).toEqual(['agenda:read', 'member:read', 'presentation:start']);
    for (const perm of observerPerms) {
      expect(ALL_PERMISSIONS).toContain(perm);
    }
    // Every permission an observer lacks is exactly the writer remainder — no third bucket.
    for (const perm of ALL_PERMISSIONS) {
      if (!observerPerms.includes(perm)) {
        expect(hasPermission('observer', perm)).toBe(false);
      }
    }
  });

  it('roles stay distinct even though permissions match (DEC-04)', () => {
    expect(ALL_ROLES).toEqual(['bishopric', 'secretary', 'observer']);
    expect(WRITER_ROLES).toEqual(['bishopric', 'secretary']);
    // Distinct Set instances: mutating one map entry can never silently mutate the other.
    expect(PERMISSIONS_MAP.bishopric).not.toBe(PERMISSIONS_MAP.secretary);
  });

  it('isWriterRole fails closed for observer, empty and garbage roles', () => {
    expect(isWriterRole('bishopric')).toBe(true);
    expect(isWriterRole('secretary')).toBe(true);
    expect(isWriterRole('observer')).toBe(false);
    for (const garbage of ['', 'admin', 'BISHOPRIC', 'bishopric ', 'root'] as Role[]) {
      expect(isWriterRole(garbage)).toBe(false);
      expect(getPermissions(garbage)).toEqual([]);
      for (const perm of ALL_PERMISSIONS) {
        expect(hasPermission(garbage, perm)).toBe(false);
      }
    }
  });
});

describe('SQL agrees with the client (can_write + role CHECKs)', () => {
  const migrationsDir = path.join(REPO_ROOT, 'supabase/migrations');
  const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  const read = (f: string) => fs.readFileSync(path.join(migrationsDir, f), 'utf8');

  /** Every migration that (re)defines can_write, newest last. */
  const canWriteFiles = migrationFiles.filter((f) =>
    /CREATE OR REPLACE FUNCTION public\.can_write\(\)/.test(read(f))
  );

  it('at least one migration defines can_write', () => {
    expect(canWriteFiles.length).toBeGreaterThan(0);
  });

  it('the LATEST can_write() allowlist equals WRITER_ROLES exactly (DEC-05)', () => {
    const latest = canWriteFiles[canWriteFiles.length - 1];
    const sql = read(latest);
    const body = sql.match(/CREATE OR REPLACE FUNCTION public\.can_write\(\)[\s\S]*?IN \(([^)]*)\)/);
    expect(body).not.toBeNull();
    expect(sorted(new Set(quotedRoles(body![1])))).toEqual(sorted(WRITER_ROLES));
    // Allowlist, not the old fail-open denylist: the definition must not be "<> 'observer'".
    expect(sql).not.toMatch(/can_write[\s\S]{0,200}<>\s*'observer'/);
  });

  it('isWriterRole agrees with the SQL allowlist for every role', () => {
    const latest = canWriteFiles[canWriteFiles.length - 1];
    const body = read(latest).match(
      /CREATE OR REPLACE FUNCTION public\.can_write\(\)[\s\S]*?IN \(([^)]*)\)/
    );
    const sqlWriters = new Set(quotedRoles(body![1]));
    for (const role of ALL_ROLES) {
      expect(isWriterRole(role)).toBe(sqlWriters.has(role));
    }
  });

  it('the invitations role CHECK (001) enumerates exactly ALL_ROLES', () => {
    const sql001 = read(migrationFiles.find((f) => f.startsWith('001_'))!);
    const check = sql001.match(/CREATE TABLE invitations \([\s\S]*?CHECK \(role IN \(([^)]*)\)\)/);
    expect(check).not.toBeNull();
    expect(sorted(new Set(quotedRoles(check![1])))).toEqual(sorted(ALL_ROLES));
  });
});

describe('Edge Functions agree with the client', () => {
  const functionsDir = path.join(REPO_ROOT, 'supabase/functions');
  const functionFiles = fs
    .readdirSync(functionsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(functionsDir, d.name, 'index.ts'))
    .filter((f) => fs.existsSync(f));

  /** Every array literal / union made ONLY of role names, per file. */
  function roleListsIn(file: string): string[][] {
    const src = fs.readFileSync(file, 'utf8');
    const lists: string[][] = [];
    for (const m of src.matchAll(/\[((?:\s*'(?:bishopric|secretary|observer)'\s*,?)+)\]/g)) {
      lists.push(quotedRoles(m[1]));
    }
    for (const m of src.matchAll(
      /'(?:bishopric|secretary|observer)'(?:\s*\|\s*'(?:bishopric|secretary|observer)')+/g
    )) {
      lists.push(quotedRoles(m[0]));
    }
    return lists;
  }

  it('finds role lists in the user-management functions (scan is not vacuous)', () => {
    const withLists = functionFiles.filter((f) => roleListsIn(f).length > 0);
    const names = withLists.map((f) => path.basename(path.dirname(f)));
    for (const expected of [
      'create-invitation',
      'delete-user',
      'list-users',
      'register-first-user',
      'update-user-role',
    ]) {
      expect(names).toContain(expected);
    }
  });

  it('EVERY role list in EVERY Edge Function is WRITER_ROLES or ALL_ROLES', () => {
    const writer = sorted(WRITER_ROLES);
    const all = sorted(ALL_ROLES);
    for (const file of functionFiles) {
      for (const list of roleListsIn(file)) {
        // No duplicates, and no third combination (e.g. bishopric-only) may appear.
        expect(new Set(list).size).toBe(list.length);
        expect([writer, all]).toContainEqual(sorted(list));
      }
    }
  });
});

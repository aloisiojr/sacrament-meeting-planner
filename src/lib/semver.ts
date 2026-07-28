/**
 * Minimal semver comparison for the version gate. Handles `major.minor.patch` with optional
 * pre-release/build suffixes (which are ignored for gating). Missing/malformed parts count as 0.
 */
export function parseVersion(v: string): [number, number, number] {
  const core = (v ?? '').trim().split(/[+-]/)[0]; // strip pre-release / build metadata
  const parts = core.split('.').map((p) => {
    const n = parseInt(p, 10);
    return Number.isFinite(n) ? n : 0;
  });
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/** -1 if a < b, 0 if equal, 1 if a > b (comparing major.minor.patch). */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    if (pa[i] < pb[i]) return -1;
    if (pa[i] > pb[i]) return 1;
  }
  return 0;
}

/** True when `version` is below `minimum` (i.e. the client must update). */
export function isBelowMinimum(version: string, minimum: string): boolean {
  return compareVersions(version, minimum) < 0;
}

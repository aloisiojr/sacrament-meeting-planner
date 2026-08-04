/**
 * Serialisation for \n-joined TEXT list fields (announcements, recognised names, …).
 *
 * Pure logic, so it lives in lib/ per CLAUDE.md rather than inside the component that renders it.
 *
 * There used to be an `Array.isArray(value)` branch here — the migration-032 shim, for rows written
 * while `recognized_names` was still TEXT[]. It is gone: 032 is applied (verified against staging),
 * `src/types/database.ts` types all three columns `string | null`, and the persisted React Query
 * cache is busted by app version, so a 2.x client can never be handed a 1.x array. v2 does not
 * carry 1.x compatibility.
 */

/** Split a stored value into list items, dropping blanks. */
export function parseItems(value: string | null): string[] {
  return (value ?? '').split('\n').filter((s) => s.trim() !== '');
}

/** Join items back into the stored representation. An empty list is stored as NULL, not "". */
export function joinItems(items: string[]): string | null {
  return items.length === 0 ? null : items.join('\n');
}

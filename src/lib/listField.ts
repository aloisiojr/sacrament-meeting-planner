/**
 * Serialisation for \n-joined TEXT list fields (announcements, recognised names, …).
 *
 * Pure logic, so it lives in lib/ per CLAUDE.md rather than inside the component that renders it.
 * Five test files used to carry their own hand-written copy of these two functions and assert
 * against that copy — 134 it-blocks that could not fail whatever the app did, and which had all
 * drifted from the real implementation in the same way: they omitted the Array.isArray branch.
 */

/**
 * Split a stored value into list items, dropping blanks.
 *
 * The Array.isArray branch is the migration-032 shim: `recognized_names` was TEXT[] before that
 * migration and TEXT after, so a client reading a row written by a pre-migration app — or a cache
 * persisted before the upgrade — still receives an array. Removing it silently turns those rows
 * into a single item, or into nothing.
 */
export function parseItems(value: string | string[] | null): string[] {
  if (Array.isArray(value)) return value.filter((s) => s.trim() !== '');
  return (value ?? '').split('\n').filter((s) => s.trim() !== '');
}

/** Join items back into the stored representation. An empty list is stored as NULL, not "". */
export function joinItems(items: string[]): string | null {
  return items.length === 0 ? null : items.join('\n');
}

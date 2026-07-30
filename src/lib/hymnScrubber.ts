/**
 * Pure helpers for the hymn number scrubber (fast-scroll rail).
 * See specs/v2-hymn-scrubber.md and specs/v2-selectors-and-testimony.md.
 */
import type { Hymn } from '../types/database';

/**
 * Build the rail's anchor numbers from the hymn numbers actually present: one anchor per populated
 * decade (`floor(number/10)*10`, with decade 0 rendered as `1`), sorted ascending. Empty decades are
 * skipped, so a catalog with a 204→1001 gap yields `[…,190,200,1000,1010,…]` instead of ~90 dead
 * anchors between them.
 *
 * Returns `[]` when there are fewer than 3 populated decades (too short to warrant a rail). (AC3.2/AC3.5)
 */
export function buildHymnAnchors(numbers: number[]): number[] {
  const decades = new Set<number>();
  for (const n of numbers) {
    if (Number.isFinite(n)) decades.add(Math.floor(n / 10) * 10);
  }
  if (decades.size < 3) return [];
  return [...decades].sort((a, b) => a - b).map((d) => (d === 0 ? 1 : d));
}

/**
 * Index of the first hymn whose `number >= n`, for a list sorted ascending by number.
 * When no hymn reaches `n` (e.g. tapping an anchor past the last hymn), clamps to the last
 * index so the rail still scrolls to the end. Returns 0 for an empty list. (AC3.3)
 */
export function firstIndexAtOrAbove(hymns: Hymn[], n: number): number {
  if (hymns.length === 0) return 0;
  for (let i = 0; i < hymns.length; i++) {
    if (hymns[i].number >= n) return i;
  }
  return hymns.length - 1;
}

/**
 * Given a vertical drag fraction (0 = top of rail, 1 = bottom), return the nearest anchor value.
 * Anchors are laid out at equal vertical spacing, so snapping is by position index. (AC3.4)
 */
export function anchorForFraction(anchors: number[], fraction: number): number | null {
  if (anchors.length === 0) return null;
  const clamped = Math.max(0, Math.min(1, fraction));
  const idx = Math.round(clamped * (anchors.length - 1));
  return anchors[idx];
}

/**
 * Pure helpers for the hymn number scrubber (fast-scroll rail).
 * See specs/v2-hymn-scrubber.md.
 */
import type { Hymn } from '../types/database';

/**
 * Build the rail's anchor numbers, spanning the list's actual range so the whole rail is useful
 * for any list (the full hymnal AND curated subsets like the sacramental hymns, ~169–196):
 * decade anchors from `floor(minNumber/10)*10` up to `ceil(maxNumber/10)*10`, with a leading `1`
 * when the list starts near the beginning (`minNumber < 10`).
 *
 * Examples: `(1, 174) → [1,10,…,180]`; `(169, 196) → [160,170,180,190,200]`; `(22, 50) → [20,30,40,50]`.
 *
 * Returns `[]` when the list is too short to warrant a rail (`maxNumber < 20`) — the caller hides
 * the rail on an empty result. (AC1, AC6)
 */
export function buildHymnAnchors(minNumber: number, maxNumber: number): number[] {
  if (!Number.isFinite(maxNumber) || maxNumber < 20) return [];
  const high = Math.ceil(maxNumber / 10) * 10;
  const lowDecade = Number.isFinite(minNumber) ? Math.floor(minNumber / 10) * 10 : 0;
  const anchors: number[] = [];
  let start: number;
  if (lowDecade <= 0) {
    anchors.push(1); // list starts near the beginning → keep the "1" anchor
    start = 10;
  } else {
    start = lowDecade;
  }
  for (let n = start; n <= high; n += 10) anchors.push(n);
  return anchors;
}

/**
 * Largest hymn `number` in a list already sorted ascending by number (0 if empty).
 */
export function maxHymnNumber(hymns: Hymn[]): number {
  if (hymns.length === 0) return 0;
  // Sorted ascending by number, but be defensive against unsorted input.
  return hymns.reduce((max, h) => (h.number > max ? h.number : max), hymns[0].number);
}

/**
 * Smallest hymn `number` in a list already sorted ascending by number (0 if empty).
 */
export function minHymnNumber(hymns: Hymn[]): number {
  if (hymns.length === 0) return 0;
  return hymns.reduce((min, h) => (h.number < min ? h.number : min), hymns[0].number);
}

/**
 * Index of the first hymn whose `number >= n`, for a list sorted ascending by number.
 * When no hymn reaches `n` (e.g. tapping an anchor past the last hymn), clamps to the last
 * index so the rail still scrolls to the end. Returns 0 for an empty list. (AC2, D4)
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
 * Used to snap the finger position to the 10s anchors during a scrub. (AC3)
 */
export function anchorForFraction(anchors: number[], fraction: number): number | null {
  if (anchors.length === 0) return null;
  const clamped = Math.max(0, Math.min(1, fraction));
  const idx = Math.round(clamped * (anchors.length - 1));
  return anchors[idx];
}

/**
 * Unit tests for the hymn scrubber pure helpers
 * (specs/v2-hymn-scrubber.md, specs/v2-selectors-and-testimony.md).
 */
import { describe, it, expect } from 'vitest';
import { buildHymnAnchors, firstIndexAtOrAbove, anchorForFraction } from '../lib/hymnScrubber';
import type { Hymn } from '../types/database';

const hymn = (number: number): Hymn => ({
  id: `h${number}`,
  language: 'pt-BR',
  number,
  title: `Hino ${number}`,
  is_sacramental: false,
});

describe('buildHymnAnchors', () => {
  it('returns one anchor per populated decade, decade 0 shown as 1, sorted (AC3.2)', () => {
    expect(buildHymnAnchors([3, 15, 25])).toEqual([1, 10, 20]);
  });

  it('skips empty decades across a 204→1001 gap (the reported bug)', () => {
    // decades: 180,190,200,1000,1010 — nothing in 210..990.
    expect(buildHymnAnchors([184, 192, 200, 1001, 1010])).toEqual([180, 190, 200, 1000, 1010]);
  });

  it('dedupes and sorts regardless of input order', () => {
    expect(buildHymnAnchors([25, 24, 11, 10, 5])).toEqual([1, 10, 20]);
  });

  it('returns [] with fewer than 3 populated decades (AC3.5)', () => {
    expect(buildHymnAnchors([3, 15])).toEqual([]); // decades 0,10
    expect(buildHymnAnchors([100, 105])).toEqual([]); // decade 100 only
    expect(buildHymnAnchors([])).toEqual([]);
  });

  it('ignores non-finite numbers', () => {
    expect(buildHymnAnchors([NaN, 10, 20, 30])).toEqual([10, 20, 30]);
  });
});

describe('firstIndexAtOrAbove', () => {
  const hymns = [hymn(1), hymn(5), hymn(22), hymn(30), hymn(174)];

  it('finds the first hymn at or above the anchor (AC3.3)', () => {
    expect(firstIndexAtOrAbove(hymns, 1)).toBe(0);
    expect(firstIndexAtOrAbove(hymns, 20)).toBe(2); // 22 is first >= 20
    expect(firstIndexAtOrAbove(hymns, 30)).toBe(3);
  });

  it('handles gaps (first >= N, not exact match)', () => {
    expect(firstIndexAtOrAbove(hymns, 6)).toBe(2); // no 6..21, first >= 6 is 22
  });

  it('clamps to the last index when the anchor is past the last hymn', () => {
    expect(firstIndexAtOrAbove(hymns, 1000)).toBe(4);
  });

  it('returns 0 for empty', () => {
    expect(firstIndexAtOrAbove([], 50)).toBe(0);
  });
});

describe('anchorForFraction', () => {
  const anchors = [1, 10, 20, 30, 40]; // 5 anchors

  it('maps the top of the rail to the first anchor and the bottom to the last (AC3.4)', () => {
    expect(anchorForFraction(anchors, 0)).toBe(1);
    expect(anchorForFraction(anchors, 1)).toBe(40);
  });

  it('snaps to the nearest anchor by position', () => {
    expect(anchorForFraction(anchors, 0.5)).toBe(20); // middle
  });

  it('clamps out-of-range fractions', () => {
    expect(anchorForFraction(anchors, -0.5)).toBe(1);
    expect(anchorForFraction(anchors, 2)).toBe(40);
  });

  it('returns null for an empty rail', () => {
    expect(anchorForFraction([], 0.5)).toBeNull();
  });
});

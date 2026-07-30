/**
 * Unit tests for the hymn scrubber pure helpers (specs/v2-hymn-scrubber.md).
 */
import { describe, it, expect } from 'vitest';
import {
  buildHymnAnchors,
  maxHymnNumber,
  minHymnNumber,
  firstIndexAtOrAbove,
  anchorForFraction,
} from '../lib/hymnScrubber';
import type { Hymn } from '../types/database';

const hymn = (number: number): Hymn => ({
  id: `h${number}`,
  language: 'pt-BR',
  number,
  title: `Hino ${number}`,
  is_sacramental: false,
});

describe('buildHymnAnchors', () => {
  it('returns [1, 10, 20, …, ceil(max/10)*10] for a full hymnal starting at 1 (AC1)', () => {
    expect(buildHymnAnchors(1, 174)).toEqual([1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180]);
  });

  it('rounds the cap up to the next 10', () => {
    expect(buildHymnAnchors(1, 191)).toEqual([1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200]);
  });

  it('spans the actual range for a high-numbered subset (sacramental ~169–196) (D1)', () => {
    expect(buildHymnAnchors(169, 196)).toEqual([160, 170, 180, 190, 200]);
  });

  it('starts at the low decade for a mid-range subset', () => {
    expect(buildHymnAnchors(22, 50)).toEqual([20, 30, 40, 50]);
  });

  it('keeps the leading "1" when the list starts below 10', () => {
    expect(buildHymnAnchors(3, 40)).toEqual([1, 10, 20, 30, 40]);
  });

  it('includes exactly [1,10,20] at the minimum threshold (max = 20, min near 1)', () => {
    expect(buildHymnAnchors(1, 20)).toEqual([1, 10, 20]);
  });

  it('returns [] when the list is too short to warrant a rail (max < 20) (AC6)', () => {
    expect(buildHymnAnchors(1, 19)).toEqual([]);
    expect(buildHymnAnchors(1, 7)).toEqual([]);
    expect(buildHymnAnchors(0, 0)).toEqual([]);
  });

  it('tolerates non-finite input', () => {
    expect(buildHymnAnchors(1, NaN)).toEqual([]);
    expect(buildHymnAnchors(NaN, 174)).toEqual([1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180]);
  });
});

describe('minHymnNumber', () => {
  it('returns the smallest number', () => {
    expect(minHymnNumber([hymn(169), hymn(196), hymn(180)])).toBe(169);
  });
  it('returns 0 for empty', () => {
    expect(minHymnNumber([])).toBe(0);
  });
});

describe('maxHymnNumber', () => {
  it('returns the largest number', () => {
    expect(maxHymnNumber([hymn(3), hymn(50), hymn(174)])).toBe(174);
  });
  it('is defensive against unsorted input', () => {
    expect(maxHymnNumber([hymn(174), hymn(3), hymn(50)])).toBe(174);
  });
  it('returns 0 for empty', () => {
    expect(maxHymnNumber([])).toBe(0);
  });
});

describe('firstIndexAtOrAbove', () => {
  const hymns = [hymn(1), hymn(5), hymn(22), hymn(30), hymn(174)];

  it('finds the first hymn at or above the anchor (AC2)', () => {
    expect(firstIndexAtOrAbove(hymns, 1)).toBe(0);
    expect(firstIndexAtOrAbove(hymns, 20)).toBe(2); // 22 is first >= 20
    expect(firstIndexAtOrAbove(hymns, 30)).toBe(3);
  });

  it('handles gaps / renumbering (first >= N, not exact match) (D4)', () => {
    expect(firstIndexAtOrAbove(hymns, 6)).toBe(2); // no 6..21, first >= 6 is 22
  });

  it('clamps to the last index when the anchor is past the last hymn', () => {
    expect(firstIndexAtOrAbove(hymns, 180)).toBe(4);
  });

  it('returns 0 for empty', () => {
    expect(firstIndexAtOrAbove([], 50)).toBe(0);
  });
});

describe('anchorForFraction', () => {
  const anchors = [1, 10, 20, 30, 40]; // 5 anchors

  it('maps the top of the rail to the first anchor and the bottom to the last (AC3)', () => {
    expect(anchorForFraction(anchors, 0)).toBe(1);
    expect(anchorForFraction(anchors, 1)).toBe(40);
  });

  it('snaps to the nearest anchor', () => {
    expect(anchorForFraction(anchors, 0.5)).toBe(20); // middle
    expect(anchorForFraction(anchors, 0.24)).toBe(10); // ~index 0.96 -> 1
  });

  it('clamps out-of-range fractions', () => {
    expect(anchorForFraction(anchors, -0.5)).toBe(1);
    expect(anchorForFraction(anchors, 2)).toBe(40);
  });

  it('returns null for an empty rail', () => {
    expect(anchorForFraction([], 0.5)).toBeNull();
  });
});

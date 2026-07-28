import { describe, it, expect } from 'vitest';
import { parseVersion, compareVersions, isBelowMinimum } from '../lib/semver';

describe('semver', () => {
  describe('parseVersion', () => {
    it('parses major.minor.patch', () => {
      expect(parseVersion('1.2.3')).toEqual([1, 2, 3]);
    });
    it('defaults missing parts to 0', () => {
      expect(parseVersion('2')).toEqual([2, 0, 0]);
      expect(parseVersion('2.5')).toEqual([2, 5, 0]);
    });
    it('strips pre-release/build metadata', () => {
      expect(parseVersion('1.1.0-beta.2')).toEqual([1, 1, 0]);
      expect(parseVersion('1.1.0+42')).toEqual([1, 1, 0]);
    });
    it('treats malformed/empty as 0', () => {
      expect(parseVersion('')).toEqual([0, 0, 0]);
      expect(parseVersion('x.y.z')).toEqual([0, 0, 0]);
    });
  });

  describe('compareVersions', () => {
    it('orders by major, then minor, then patch', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(compareVersions('1.2.0', '1.10.0')).toBe(-1); // numeric, not lexical
      expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
      expect(compareVersions('1.1.0', '1.1.0')).toBe(0);
    });
  });

  describe('isBelowMinimum', () => {
    it('is true only when strictly below the minimum', () => {
      expect(isBelowMinimum('1.0.0', '2.0.0')).toBe(true);
      expect(isBelowMinimum('1.1.0', '1.1.0')).toBe(false); // equal → allowed
      expect(isBelowMinimum('2.0.0', '1.0.0')).toBe(false);
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  getAutoAssignedType,
  getSundayOfMonth,
  SUNDAY_TYPE_SPEECHES,
  SUNDAY_TYPE_OPTIONS,
  sundayTypeKeys,
} from '../hooks/useSundayTypes';
import type { SundayExceptionReason } from '../types/database';

/**
 * Extended PHASE-02 validation tests for sunday type auto-assignment logic.
 * Covers additional edge cases and cross-year boundary scenarios.
 */

// All valid SundayExceptionReason values from the database schema
const VALID_DB_REASONS: SundayExceptionReason[] = [
  'testimony_meeting',
  'general_conference',
  'stake_conference',
  'ward_conference',
  'primary_presentation',
  'other',
];

describe('PHASE-02: Sunday Types extended validation', () => {
  describe('SUNDAY_TYPE_OPTIONS alignment with DB schema', () => {
    it('should have "speeches" as a virtual type (not stored in DB)', () => {
      expect(SUNDAY_TYPE_OPTIONS).toContain(SUNDAY_TYPE_SPEECHES);
      expect(VALID_DB_REASONS).not.toContain(SUNDAY_TYPE_SPEECHES);
    });

    it('should have "other" which IS now in the DB schema', () => {
      // "other" is in both SUNDAY_TYPE_OPTIONS and SundayExceptionReason now
      expect(SUNDAY_TYPE_OPTIONS).toContain('other');
      expect(VALID_DB_REASONS).toContain('other');
    });

    it('all non-virtual/non-other options should match DB SundayExceptionReason values', () => {
      const appOnlyTypes = [SUNDAY_TYPE_SPEECHES, 'other'];
      const dbTypes = SUNDAY_TYPE_OPTIONS.filter(
        (t) => !appOnlyTypes.includes(t)
      );
      // Each remaining type should be a valid DB reason
      dbTypes.forEach((type) => {
        expect(VALID_DB_REASONS).toContain(type);
      });
    });
  });

  describe('getAutoAssignedType: cross-year boundary', () => {
    it('should return testimony_meeting for 1st Sunday of January (year transition)', () => {
      // 2027-01-03 is a Sunday
      expect(getAutoAssignedType(new Date(2027, 0, 3))).toBe('testimony_meeting');
    });

    it('should return speeches for non-1st Sunday of December', () => {
      // 2026-12-13 is a Sunday (2nd)
      expect(getAutoAssignedType(new Date(2026, 11, 13))).toBe(SUNDAY_TYPE_SPEECHES);
    });
  });

  describe('getAutoAssignedType: all 12 months first Sunday', () => {
    // Map of month (0-indexed) -> expected type for first Sunday
    const expectedFirstSunday: Record<number, string> = {
      0: 'testimony_meeting',   // January
      1: 'testimony_meeting',   // February
      2: 'testimony_meeting',   // March
      3: 'general_conference',  // April
      4: 'testimony_meeting',   // May
      5: 'testimony_meeting',   // June
      6: 'testimony_meeting',   // July
      7: 'testimony_meeting',   // August
      8: 'testimony_meeting',   // September
      9: 'general_conference',  // October
      10: 'testimony_meeting',  // November
      11: 'testimony_meeting',  // December
    };

    for (let month = 0; month < 12; month++) {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];

      it(`should return "${expectedFirstSunday[month]}" for 1st Sunday of ${monthNames[month]}`, () => {
        // Find the first Sunday of the month in 2026
        const firstDay = new Date(2026, month, 1);
        const dayOfWeek = firstDay.getDay();
        const firstSunday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
        const date = new Date(2026, month, firstSunday);
        expect(getAutoAssignedType(date)).toBe(expectedFirstSunday[month]);
      });
    }
  });

  describe('getSundayOfMonth edge cases', () => {
    it('should handle day 1 correctly (1st Sunday)', () => {
      // Any month starting on Sunday
      expect(getSundayOfMonth(new Date(2026, 1, 1))).toBe(1); // Feb 1, 2026 is a Sunday
    });

    it('should handle day 7 correctly (still 1st Sunday)', () => {
      expect(getSundayOfMonth(new Date(2026, 0, 7))).toBe(1);
    });

    it('should handle day 8 correctly (2nd Sunday)', () => {
      expect(getSundayOfMonth(new Date(2026, 0, 8))).toBe(2);
    });

    it('should handle day 28 correctly (4th Sunday)', () => {
      expect(getSundayOfMonth(new Date(2026, 0, 28))).toBe(4);
    });

    it('should handle day 29 correctly (5th Sunday)', () => {
      expect(getSundayOfMonth(new Date(2026, 0, 29))).toBe(5);
    });
  });

  describe('sundayTypeKeys factory functions', () => {
    it('should create exception keys with all parameters included', () => {
      const key = sundayTypeKeys.exceptions('ward-abc', '2026-01-01', '2026-06-30');
      expect(key).toEqual(['sundayTypes', 'exceptions', 'ward-abc', '2026-01-01', '2026-06-30']);
      expect(key).toHaveLength(5);
    });

    it('should distinguish between different date ranges for same ward', () => {
      const key1 = sundayTypeKeys.exceptions('ward-1', '2026-01-01', '2026-03-31');
      const key2 = sundayTypeKeys.exceptions('ward-1', '2026-04-01', '2026-06-30');
      expect(key1).not.toEqual(key2);
    });
  });
});

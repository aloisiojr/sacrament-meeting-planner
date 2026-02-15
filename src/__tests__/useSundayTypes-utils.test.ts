import { describe, it, expect } from 'vitest';
import {
  getAutoAssignedType,
  getSundayOfMonth,
  SUNDAY_TYPE_SPEECHES,
  SUNDAY_TYPE_OPTIONS,
  sundayTypeKeys,
} from '../hooks/useSundayTypes';

/**
 * Tests for pure utility functions in useSundayTypes hook.
 * Tests auto-assignment logic per F007 AC-021.
 */

describe('useSundayTypes utilities', () => {
  describe('getSundayOfMonth', () => {
    it('should return 1 for first sunday (days 1-7)', () => {
      // 2026-02-01 is a Sunday
      expect(getSundayOfMonth(new Date(2026, 1, 1))).toBe(1);
    });

    it('should return 2 for second sunday (days 8-14)', () => {
      expect(getSundayOfMonth(new Date(2026, 1, 8))).toBe(2);
    });

    it('should return 3 for third sunday (days 15-21)', () => {
      expect(getSundayOfMonth(new Date(2026, 1, 15))).toBe(3);
    });

    it('should return 4 for fourth sunday (days 22-28)', () => {
      expect(getSundayOfMonth(new Date(2026, 1, 22))).toBe(4);
    });

    it('should return 5 for fifth occurrence (day 29+)', () => {
      // March 2026: 29th is a Sunday
      expect(getSundayOfMonth(new Date(2026, 2, 29))).toBe(5);
    });
  });

  describe('getAutoAssignedType', () => {
    describe('regular months (Jan-Mar, May-Sep, Nov-Dec)', () => {
      it('should return testimony_meeting for 1st Sunday of January', () => {
        // 2026-01-04 is first Sunday of January
        expect(getAutoAssignedType(new Date(2026, 0, 4))).toBe('testimony_meeting');
      });

      it('should return testimony_meeting for 1st Sunday of February', () => {
        expect(getAutoAssignedType(new Date(2026, 1, 1))).toBe('testimony_meeting');
      });

      it('should return testimony_meeting for 1st Sunday of March', () => {
        expect(getAutoAssignedType(new Date(2026, 2, 1))).toBe('testimony_meeting');
      });

      it('should return testimony_meeting for 1st Sunday of May', () => {
        expect(getAutoAssignedType(new Date(2026, 4, 3))).toBe('testimony_meeting');
      });

      it('should return testimony_meeting for 1st Sunday of September', () => {
        // 2026-09-06 is first Sunday of September
        expect(getAutoAssignedType(new Date(2026, 8, 6))).toBe('testimony_meeting');
      });

      it('should return testimony_meeting for 1st Sunday of November', () => {
        expect(getAutoAssignedType(new Date(2026, 10, 1))).toBe('testimony_meeting');
      });

      it('should return testimony_meeting for 1st Sunday of December', () => {
        // 2026-12-06 is first Sunday of December
        expect(getAutoAssignedType(new Date(2026, 11, 6))).toBe('testimony_meeting');
      });

      it('should return speeches for 2nd+ Sunday of regular months', () => {
        expect(getAutoAssignedType(new Date(2026, 1, 8))).toBe(SUNDAY_TYPE_SPEECHES);
        expect(getAutoAssignedType(new Date(2026, 1, 15))).toBe(SUNDAY_TYPE_SPEECHES);
        expect(getAutoAssignedType(new Date(2026, 1, 22))).toBe(SUNDAY_TYPE_SPEECHES);
      });
    });

    describe('April (conference month)', () => {
      it('should return general_conference for 1st Sunday of April', () => {
        // 2026-04-05 is first Sunday of April
        expect(getAutoAssignedType(new Date(2026, 3, 5))).toBe('general_conference');
      });

      it('should return testimony_meeting for 2nd Sunday of April', () => {
        expect(getAutoAssignedType(new Date(2026, 3, 12))).toBe('testimony_meeting');
      });

      it('should return speeches for 3rd+ Sunday of April', () => {
        expect(getAutoAssignedType(new Date(2026, 3, 19))).toBe(SUNDAY_TYPE_SPEECHES);
        expect(getAutoAssignedType(new Date(2026, 3, 26))).toBe(SUNDAY_TYPE_SPEECHES);
      });
    });

    describe('October (conference month)', () => {
      it('should return general_conference for 1st Sunday of October', () => {
        // 2026-10-04 is first Sunday of October
        expect(getAutoAssignedType(new Date(2026, 9, 4))).toBe('general_conference');
      });

      it('should return testimony_meeting for 2nd Sunday of October', () => {
        expect(getAutoAssignedType(new Date(2026, 9, 11))).toBe('testimony_meeting');
      });

      it('should return speeches for 3rd+ Sunday of October', () => {
        expect(getAutoAssignedType(new Date(2026, 9, 18))).toBe(SUNDAY_TYPE_SPEECHES);
        expect(getAutoAssignedType(new Date(2026, 9, 25))).toBe(SUNDAY_TYPE_SPEECHES);
      });
    });
  });

  describe('SUNDAY_TYPE_OPTIONS', () => {
    it('should include all 9 options', () => {
      expect(SUNDAY_TYPE_OPTIONS).toHaveLength(9);
    });

    it('should include speeches as first option', () => {
      expect(SUNDAY_TYPE_OPTIONS[0]).toBe('speeches');
    });

    it('should include all exception types', () => {
      expect(SUNDAY_TYPE_OPTIONS).toContain('testimony_meeting');
      expect(SUNDAY_TYPE_OPTIONS).toContain('general_conference');
      expect(SUNDAY_TYPE_OPTIONS).toContain('stake_conference');
      expect(SUNDAY_TYPE_OPTIONS).toContain('ward_conference');
      expect(SUNDAY_TYPE_OPTIONS).toContain('fast_sunday');
      expect(SUNDAY_TYPE_OPTIONS).toContain('special_program');
      expect(SUNDAY_TYPE_OPTIONS).toContain('no_meeting');
      expect(SUNDAY_TYPE_OPTIONS).toContain('other');
    });
  });

  describe('sundayTypeKeys', () => {
    it('should generate correct query keys', () => {
      expect(sundayTypeKeys.all).toEqual(['sundayTypes']);
      expect(sundayTypeKeys.exceptions('ward-1', '2026-01-01', '2026-12-31')).toEqual([
        'sundayTypes',
        'exceptions',
        'ward-1',
        '2026-01-01',
        '2026-12-31',
      ]);
    });
  });
});

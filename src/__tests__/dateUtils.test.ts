import { describe, it, expect } from 'vitest';
import {
  isSunday,
  parseLocalDate,
  toISODateString,
  zeroPad,
  zeroPadDay,
  getMonthAbbr,
  formatDate,
  generateSundayRange,
  getNextSundays,
  getPreviousSundays,
} from '../lib/dateUtils';

describe('dateUtils', () => {
  describe('isSunday', () => {
    it('should return true for a Sunday', () => {
      // 2026-02-15 is a Sunday
      expect(isSunday(new Date(2026, 1, 15))).toBe(true);
      expect(isSunday('2026-02-15')).toBe(true);
    });

    it('should return false for non-Sunday days', () => {
      // Monday through Saturday
      expect(isSunday('2026-02-16')).toBe(false); // Monday
      expect(isSunday('2026-02-17')).toBe(false); // Tuesday
      expect(isSunday('2026-02-18')).toBe(false); // Wednesday
      expect(isSunday('2026-02-19')).toBe(false); // Thursday
      expect(isSunday('2026-02-20')).toBe(false); // Friday
      expect(isSunday('2026-02-21')).toBe(false); // Saturday
    });

    it('should work with Date objects', () => {
      expect(isSunday(new Date(2026, 1, 22))).toBe(true); // Feb 22, 2026 is Sunday
      expect(isSunday(new Date(2026, 1, 23))).toBe(false); // Feb 23 is Monday
    });
  });

  describe('parseLocalDate', () => {
    it('should parse ISO date string as local date', () => {
      const d = parseLocalDate('2026-02-15');
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(1); // 0-indexed
      expect(d.getDate()).toBe(15);
    });

    it('should handle year boundaries', () => {
      const d = parseLocalDate('2025-12-31');
      expect(d.getFullYear()).toBe(2025);
      expect(d.getMonth()).toBe(11);
      expect(d.getDate()).toBe(31);

      const d2 = parseLocalDate('2026-01-01');
      expect(d2.getFullYear()).toBe(2026);
      expect(d2.getMonth()).toBe(0);
      expect(d2.getDate()).toBe(1);
    });
  });

  describe('toISODateString', () => {
    it('should format date as YYYY-MM-DD', () => {
      expect(toISODateString(new Date(2026, 1, 15))).toBe('2026-02-15');
      expect(toISODateString(new Date(2026, 0, 1))).toBe('2026-01-01');
      expect(toISODateString(new Date(2026, 11, 31))).toBe('2026-12-31');
    });

    it('should zero-pad months and days', () => {
      expect(toISODateString(new Date(2026, 0, 5))).toBe('2026-01-05');
      expect(toISODateString(new Date(2026, 8, 9))).toBe('2026-09-09');
    });
  });

  describe('zeroPad / zeroPadDay', () => {
    it('should pad single digit numbers', () => {
      expect(zeroPad(1)).toBe('01');
      expect(zeroPad(9)).toBe('09');
      expect(zeroPadDay(8)).toBe('08');
    });

    it('should not pad two-digit numbers', () => {
      expect(zeroPad(10)).toBe('10');
      expect(zeroPad(31)).toBe('31');
      expect(zeroPadDay(12)).toBe('12');
    });
  });

  describe('getMonthAbbr', () => {
    it('should return correct abbreviations for pt-BR', () => {
      expect(getMonthAbbr(1, 'pt-BR')).toBe('JAN');
      expect(getMonthAbbr(2, 'pt-BR')).toBe('FEV');
      expect(getMonthAbbr(3, 'pt-BR')).toBe('MAR');
      expect(getMonthAbbr(4, 'pt-BR')).toBe('ABR');
      expect(getMonthAbbr(5, 'pt-BR')).toBe('MAI');
      expect(getMonthAbbr(9, 'pt-BR')).toBe('SET');
      expect(getMonthAbbr(10, 'pt-BR')).toBe('OUT');
      expect(getMonthAbbr(12, 'pt-BR')).toBe('DEZ');
    });

    it('should return correct abbreviations for en', () => {
      expect(getMonthAbbr(1, 'en')).toBe('JAN');
      expect(getMonthAbbr(2, 'en')).toBe('FEB');
      expect(getMonthAbbr(4, 'en')).toBe('APR');
      expect(getMonthAbbr(9, 'en')).toBe('SEP');
      expect(getMonthAbbr(12, 'en')).toBe('DEC');
    });

    it('should return correct abbreviations for es', () => {
      expect(getMonthAbbr(1, 'es')).toBe('ENE');
      expect(getMonthAbbr(2, 'es')).toBe('FEB');
      expect(getMonthAbbr(12, 'es')).toBe('DIC');
    });

    it('should throw for invalid month', () => {
      expect(() => getMonthAbbr(0, 'pt-BR')).toThrow('Invalid month');
      expect(() => getMonthAbbr(13, 'en')).toThrow('Invalid month');
    });

    it('should default to pt-BR', () => {
      expect(getMonthAbbr(2)).toBe('FEV');
    });
  });

  describe('formatDate', () => {
    it('should format as "08 FEV" for pt-BR', () => {
      expect(formatDate('2026-02-08', 'pt-BR')).toBe('08 FEV');
    });

    it('should format as "FEB 08" for en', () => {
      expect(formatDate('2026-02-08', 'en')).toBe('FEB 08');
    });

    it('should format as "08 FEB" for es', () => {
      expect(formatDate('2026-02-08', 'es')).toBe('08 FEB');
    });

    it('should work with Date objects', () => {
      expect(formatDate(new Date(2026, 1, 8), 'pt-BR')).toBe('08 FEV');
    });

    it('should default locale to pt-BR', () => {
      expect(formatDate('2026-02-08')).toBe('08 FEV');
    });

    it('should handle day numbers correctly', () => {
      expect(formatDate('2026-01-01', 'en')).toBe('JAN 01');
      expect(formatDate('2026-12-31', 'pt-BR')).toBe('31 DEZ');
    });
  });

  describe('generateSundayRange', () => {
    it('should return all sundays in a date range', () => {
      // February 2026: Sundays are 1, 8, 15, 22
      const sundays = generateSundayRange('2026-02-01', '2026-02-28');
      const dates = sundays.map((d) => toISODateString(d));
      expect(dates).toEqual([
        '2026-02-01',
        '2026-02-08',
        '2026-02-15',
        '2026-02-22',
      ]);
    });

    it('should include sundays on boundaries', () => {
      // Start on a Sunday
      const sundays = generateSundayRange('2026-02-15', '2026-02-15');
      expect(sundays.length).toBe(1);
      expect(toISODateString(sundays[0])).toBe('2026-02-15');
    });

    it('should return empty array if no sundays in range', () => {
      // Monday to Saturday
      const sundays = generateSundayRange('2026-02-16', '2026-02-21');
      expect(sundays.length).toBe(0);
    });

    it('should handle year boundaries', () => {
      const sundays = generateSundayRange('2025-12-28', '2026-01-04');
      const dates = sundays.map((d) => toISODateString(d));
      expect(dates).toEqual(['2025-12-28', '2026-01-04']);
    });

    it('should work with Date objects', () => {
      const sundays = generateSundayRange(
        new Date(2026, 1, 1),
        new Date(2026, 1, 15)
      );
      expect(sundays.length).toBe(3); // Feb 1, 8, 15
    });
  });

  describe('getNextSundays', () => {
    it('should return next N sundays starting from a Sunday', () => {
      const sundays = getNextSundays('2026-02-15', 3);
      const dates = sundays.map((d) => toISODateString(d));
      expect(dates).toEqual(['2026-02-15', '2026-02-22', '2026-03-01']);
    });

    it('should return next N sundays starting from a non-Sunday', () => {
      // 2026-02-16 is Monday
      const sundays = getNextSundays('2026-02-16', 2);
      const dates = sundays.map((d) => toISODateString(d));
      expect(dates).toEqual(['2026-02-22', '2026-03-01']);
    });

    it('should handle year boundary', () => {
      const sundays = getNextSundays('2025-12-29', 2);
      const dates = sundays.map((d) => toISODateString(d));
      // Dec 29 2025 is Monday, so next Sunday is Jan 4, 2026
      expect(dates).toEqual(['2026-01-04', '2026-01-11']);
    });
  });

  describe('getPreviousSundays', () => {
    it('should return previous N sundays before a Sunday', () => {
      const sundays = getPreviousSundays('2026-02-22', 3);
      const dates = sundays.map((d) => toISODateString(d));
      expect(dates).toEqual(['2026-02-01', '2026-02-08', '2026-02-15']);
    });

    it('should return previous N sundays before a non-Sunday', () => {
      // 2026-02-18 is Wednesday
      const sundays = getPreviousSundays('2026-02-18', 2);
      const dates = sundays.map((d) => toISODateString(d));
      expect(dates).toEqual(['2026-02-08', '2026-02-15']);
    });

    it('should handle year boundary', () => {
      const sundays = getPreviousSundays('2026-01-05', 2);
      const dates = sundays.map((d) => toISODateString(d));
      // Jan 4 2026 is Sunday, previous is Dec 28 2025
      expect(dates).toEqual(['2025-12-28', '2026-01-04']);
    });
  });
});

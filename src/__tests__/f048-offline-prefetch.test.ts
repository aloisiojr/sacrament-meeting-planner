/**
 * Tests for F048: useOfflinePrefetch hook (getNext3Sundays utility).
 * Verifies getNext3Sundays returns 3 consecutive Sunday dates and
 * query keys match existing hook key factories.
 */

import { getNext3Sundays } from '../hooks/useOfflinePrefetch';
import { agendaKeys } from '../hooks/useAgenda';
import { speechKeys } from '../hooks/useSpeeches';
import { sundayTypeKeys } from '../hooks/useSundayTypes';

describe('F048: useOfflinePrefetch', () => {
  describe('getNext3Sundays', () => {
    it('returns an array of 3 date strings', () => {
      const sundays = getNext3Sundays();
      expect(sundays).toHaveLength(3);
    });

    it('returns valid ISO date strings', () => {
      const sundays = getNext3Sundays();
      for (const date of sundays) {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('returns consecutive Sundays (7 days apart)', () => {
      const sundays = getNext3Sundays();
      for (let i = 1; i < sundays.length; i++) {
        const prev = new Date(sundays[i - 1] + 'T12:00:00');
        const curr = new Date(sundays[i] + 'T12:00:00');
        const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
        expect(diffDays).toBe(7);
      }
    });

    it('first date is the same as getTodaySundayDate', async () => {
      const { getTodaySundayDate } = require('../hooks/usePresentationMode');
      const sundays = getNext3Sundays();
      expect(sundays[0]).toBe(getTodaySundayDate());
    });

    it('all dates are Sundays (day 0)', () => {
      const sundays = getNext3Sundays();
      for (const date of sundays) {
        const d = new Date(date + 'T12:00:00');
        expect(d.getDay()).toBe(0);
      }
    });
  });

  describe('Query key compatibility', () => {
    const wardId = 'test-ward';
    const sundays = getNext3Sundays();
    const first = sundays[0];
    const last = sundays[2];

    it('agendaKeys.bySunday matches expected format', () => {
      const key = agendaKeys.bySunday(wardId, first);
      expect(key).toEqual(['agendas', 'bySunday', wardId, first]);
    });

    it('agendaKeys.byDateRange matches expected format', () => {
      const key = agendaKeys.byDateRange(wardId, first, last);
      expect(key).toEqual(['agendas', 'byDateRange', wardId, first, last]);
    });

    it('speechKeys.byDateRange matches expected format', () => {
      const key = speechKeys.byDateRange(wardId, first, last);
      expect(key).toEqual(['speeches', 'byDateRange', wardId, first, last]);
    });

    it('sundayTypeKeys.exceptions matches expected format', () => {
      const key = sundayTypeKeys.exceptions(wardId, first, last);
      expect(key).toEqual(['sundayTypes', 'exceptions', wardId, first, last]);
    });
  });

  describe('useOfflinePrefetch export', () => {
    it('exports useOfflinePrefetch function', async () => {
      const mod = require('../hooks/useOfflinePrefetch');
      expect(typeof mod.useOfflinePrefetch).toBe('function');
    });
  });
});

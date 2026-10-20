/**
 * F050: Offline UI Behavior - Agenda Tab
 *
 * ARQ-02 rewrite: the previous version re-declared the agenda rules locally
 * ("Simulate the ... logic from agenda.tsx") and asserted the copies — including
 * an exclusion rule production no longer has (all Sundays expand now, so the type
 * can be changed). These tests import the production predicates from useAgenda
 * (isSundayExpandable / resolveExpandedDate), which agenda.tsx itself calls.
 * Screen-level passthrough (disabled props, chevron, play button, attendance
 * tile) is covered behaviorally by agenda-unified-card / unified-sunday-card
 * render tests.
 */

import { isSundayExpandable, resolveExpandedDate } from '../hooks/useAgenda';
import { getTodaySundayDate } from '../hooks/usePresentationMode';

describe('F050: Agenda Tab Offline UI Logic', () => {
  const nextSunday = getTodaySundayDate();
  const otherSunday = '2025-01-05';

  describe('AC-050-01/02: expansion rule', () => {
    it('offline: only the next Sunday expands', () => {
      expect(isSundayExpandable(false, nextSunday, nextSunday)).toBe(true);
      expect(isSundayExpandable(false, otherSunday, nextSunday)).toBe(false);
    });

    it('online: every Sunday expands (including no-sacrament ones, for type changes)', () => {
      expect(isSundayExpandable(true, nextSunday, nextSunday)).toBe(true);
      expect(isSundayExpandable(true, otherSunday, nextSunday)).toBe(true);
    });
  });

  describe('EC-050-01/02: expanded card when connectivity drops', () => {
    it('next Sunday stays expanded offline', () => {
      expect(resolveExpandedDate(false, nextSunday, nextSunday)).toBe(nextSunday);
    });

    it('a non-next-Sunday expanded card collapses offline', () => {
      expect(resolveExpandedDate(false, otherSunday, nextSunday)).toBeNull();
    });

    it('online never collapses; nothing expanded stays nothing', () => {
      expect(resolveExpandedDate(true, otherSunday, nextSunday)).toBe(otherSunday);
      expect(resolveExpandedDate(false, null, nextSunday)).toBeNull();
      expect(resolveExpandedDate(true, null, nextSunday)).toBeNull();
    });
  });
});

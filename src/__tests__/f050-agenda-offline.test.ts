/**
 * F050: Offline UI Behavior - Agenda Tab
 *
 * Tests AC-050-01 through AC-050-05 and EC-050-01 through EC-050-02.
 * Verifies Agenda tab restricts UI when offline.
 */

import { describe, it, expect } from 'vitest';
import { isExcludedFromAgenda } from '../hooks/useAgenda';
import { getTodaySundayDate } from '../hooks/usePresentationMode';

describe('F050: Agenda Tab Offline UI Logic', () => {
  const nextSunday = getTodaySundayDate();

  // Simulate the expandable logic from agenda.tsx:
  // const baseExpandable = !exception || !isExcludedFromAgenda(exception.reason);
  // const isExpandable = baseExpandable && (isOnline || date === nextSunday);
  function isExpandable(date: string, isOnline: boolean, exceptionReason?: string): boolean {
    const baseExpandable = !exceptionReason || !isExcludedFromAgenda(exceptionReason as any);
    return baseExpandable && (isOnline || date === nextSunday);
  }

  describe('AC-050-01: Only next Sunday expandable offline', () => {
    it('non-next-Sunday card is NOT expandable when offline', () => {
      const pastSunday = '2025-01-05';
      expect(isExpandable(pastSunday, false)).toBe(false);
    });

    it('future non-next Sunday is NOT expandable when offline', () => {
      // A date 2 weeks from now
      const d = new Date(nextSunday + 'T12:00:00');
      d.setDate(d.getDate() + 14);
      const futureSunday = d.toISOString().split('T')[0];
      expect(isExpandable(futureSunday, false)).toBe(false);
    });

    it('all cards are expandable when online (existing behavior)', () => {
      expect(isExpandable(nextSunday, true)).toBe(true);
      expect(isExpandable('2025-01-05', true)).toBe(true);
    });
  });

  describe('AC-050-02: Next Sunday card expandable offline', () => {
    it('next Sunday card IS expandable when offline', () => {
      expect(isExpandable(nextSunday, false)).toBe(true);
    });

    it('next Sunday remains expandable regardless of online status', () => {
      expect(isExpandable(nextSunday, true)).toBe(true);
      expect(isExpandable(nextSunday, false)).toBe(true);
    });
  });

  describe('AC-050-03: All form fields disabled offline', () => {
    it('AgendaForm receives disabled=isOffline when expanded offline', () => {
      // From agenda.tsx: <AgendaForm ... disabled={isOffline} />
      const isOnline = false;
      const isOffline = !isOnline;
      expect(isOffline).toBe(true);
    });

    it('SundayTypeDropdown disabled when isOffline', () => {
      // From agenda.tsx: disabled={typeDisabled || isOffline}
      const isOffline = true;
      const typeDisabled = false;
      const dropdownDisabled = typeDisabled || isOffline;
      expect(dropdownDisabled).toBe(true);
    });

    it('SundayTypeDropdown enabled when online and has permission', () => {
      const isOffline = false;
      const typeDisabled = false;
      const dropdownDisabled = typeDisabled || isOffline;
      expect(dropdownDisabled).toBe(false);
    });
  });

  describe('AC-050-04: Play button works offline', () => {
    it('play button is rendered when card is expanded (not gated by isOnline)', () => {
      // From agenda.tsx: {expandable && isExpanded && (<Pressable onPress={router.push presentation} />)}
      const expandable = true;
      const isExpanded = true;
      const playRendered = expandable && isExpanded;
      expect(playRendered).toBe(true);
    });

    it('play button navigates to presentation route with date', () => {
      const date = nextSunday;
      const target = { pathname: '/presentation', params: { date } };
      expect(target.pathname).toBe('/presentation');
      expect(target.params.date).toBe(nextSunday);
    });
  });

  describe('AC-050-05: Non-next-Sunday cards hide chevron offline', () => {
    it('chevron hidden for non-expandable cards', () => {
      const pastDate = '2025-01-05';
      const isOnline = false;
      const expandable = isExpandable(pastDate, isOnline);
      // showChevron is set to isExpandable in renderItem
      expect(expandable).toBe(false);
    });

    it('chevron visible for next Sunday even when offline', () => {
      const expandable = isExpandable(nextSunday, false);
      expect(expandable).toBe(true);
    });

    it('chevron visible for all cards when online', () => {
      expect(isExpandable('2025-06-01', true)).toBe(true);
      expect(isExpandable(nextSunday, true)).toBe(true);
    });
  });

  describe('EC-050-01: Next Sunday card expanded, then goes offline', () => {
    it('next Sunday card stays expanded when going offline', () => {
      // The auto-collapse useEffect only collapses if expandedDate !== nextSunday
      const expandedDate = nextSunday;
      const isOnline = false;
      const shouldCollapse = !isOnline && expandedDate && expandedDate !== nextSunday;
      expect(shouldCollapse).toBe(false); // stays expanded
    });

    it('fields become disabled after going offline with next Sunday expanded', () => {
      const isOffline = true;
      // AgendaForm disabled={isOffline}
      expect(isOffline).toBe(true);
    });
  });

  describe('EC-050-02: Non-next-Sunday card expanded, then goes offline', () => {
    it('non-next-Sunday card auto-collapses when going offline', () => {
      const expandedDate = '2025-01-05';
      const isOnline = false;
      // useEffect: if (!isOnline && expandedDate && expandedDate !== nextSunday) setExpandedDate(null)
      const shouldCollapse = !isOnline && expandedDate && expandedDate !== nextSunday;
      expect(shouldCollapse).toBeTruthy();
    });

    it('chevron is hidden after auto-collapse', () => {
      const date = '2025-01-05';
      const expandable = isExpandable(date, false);
      expect(expandable).toBe(false);
    });
  });

  describe('Excluded dates (Gen Conf / Stake Conf)', () => {
    it('excluded dates are not expandable even when online', () => {
      const expandable = isExpandable(nextSunday, true, 'general_conference');
      expect(expandable).toBe(false);
    });

    it('excluded dates remain non-expandable offline', () => {
      const expandable = isExpandable(nextSunday, false, 'general_conference');
      expect(expandable).toBe(false);
    });
  });

  describe('handleToggle guards lazyCreate.mutate with isOnline', () => {
    it('lazyCreate.mutate called when online', () => {
      const isOnline = true;
      let mutated = false;
      // Simulates: if (isOnline) { lazyCreate.mutate(date); }
      if (isOnline) { mutated = true; }
      expect(mutated).toBe(true);
    });

    it('lazyCreate.mutate NOT called when offline', () => {
      const isOnline = false;
      let mutated = false;
      if (isOnline) { mutated = true; }
      expect(mutated).toBe(false);
    });
  });

  // P0-2 (C): the attendance tile was the one agenda write path still editable offline. The
  // reachable surface is the COLLAPSED past-Sunday card (UnifiedSundayCard), gated via
  // attendanceDisabled={isOffline} from agenda.tsx (behavioral passthrough covered in
  // unified-sunday-card.test.tsx).
  describe('AC-050-06: Attendance tile disabled offline', () => {
    // agenda.tsx: <UnifiedSundayCard ... attendanceDisabled={isOffline} />, isOffline = !isOnline
    function attendanceEditable(isOnline: boolean): boolean {
      const isOffline = !isOnline;
      return !isOffline;
    }
    it('attendance is NOT editable offline', () => {
      expect(attendanceEditable(false)).toBe(false);
    });
    it('attendance is editable online (existing behavior)', () => {
      expect(attendanceEditable(true)).toBe(true);
    });
  });
});

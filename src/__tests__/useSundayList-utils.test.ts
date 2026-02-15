/**
 * Tests for useSundayList hook utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  addMonths,
  findNextSunday,
  getInitialDateRange,
} from '../hooks/useSundayList';

describe('addMonths', () => {
  it('adds months forward', () => {
    const date = new Date(2026, 0, 15); // Jan 15
    const result = addMonths(date, 6);
    expect(result.getMonth()).toBe(6); // July
    expect(result.getFullYear()).toBe(2026);
  });

  it('subtracts months backward', () => {
    const date = new Date(2026, 6, 15); // July 15
    const result = addMonths(date, -12);
    expect(result.getMonth()).toBe(6); // July
    expect(result.getFullYear()).toBe(2025);
  });

  it('handles year boundary crossing', () => {
    const date = new Date(2026, 10, 15); // Nov 15
    const result = addMonths(date, 3);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getFullYear()).toBe(2027);
  });

  it('handles backward year boundary', () => {
    const date = new Date(2026, 1, 15); // Feb 15
    const result = addMonths(date, -3);
    expect(result.getMonth()).toBe(10); // November
    expect(result.getFullYear()).toBe(2025);
  });
});

describe('findNextSunday', () => {
  it('returns same date if today is Sunday', () => {
    // Feb 15 2026 is a Sunday
    const sunday = new Date(2026, 1, 15);
    expect(findNextSunday(sunday)).toBe('2026-02-15');
  });

  it('returns next Sunday if today is not Sunday', () => {
    // Feb 16 2026 is a Monday
    const monday = new Date(2026, 1, 16);
    expect(findNextSunday(monday)).toBe('2026-02-22');
  });

  it('returns next Sunday from Saturday', () => {
    // Feb 14 2026 is a Saturday
    const saturday = new Date(2026, 1, 14);
    expect(findNextSunday(saturday)).toBe('2026-02-15');
  });

  it('returns next Sunday from Wednesday', () => {
    // Feb 11 2026 is a Wednesday
    const wednesday = new Date(2026, 1, 11);
    expect(findNextSunday(wednesday)).toBe('2026-02-15');
  });
});

describe('getInitialDateRange', () => {
  it('returns 12 months past and 12 months future', () => {
    const today = new Date(2026, 1, 15); // Feb 15, 2026
    const { start, end } = getInitialDateRange(today);

    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBe(1); // Feb 2025
    expect(end.getFullYear()).toBe(2027);
    expect(end.getMonth()).toBe(1); // Feb 2027
  });
});

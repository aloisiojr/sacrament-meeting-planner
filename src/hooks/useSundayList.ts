/**
 * Hook for managing the infinite-scroll sunday list.
 * Initial window: 12 months past + 12 months future.
 * Extends by +6 months on scroll in either direction.
 */

import { useState, useCallback, useMemo } from 'react';
import { toISODateString, generateSundayRange } from '../lib/dateUtils';

// --- Types ---

export interface SundayListState {
  /** All sunday dates as ISO strings, sorted ascending. */
  sundays: string[];
  /** Load 6 more months of future sundays. */
  loadMoreFuture: () => void;
  /** Load 6 more months of past sundays. */
  loadMorePast: () => void;
  /** Whether there are more future sundays to load. */
  hasMoreFuture: boolean;
  /** Whether there are more past sundays to load. */
  hasMorePast: boolean;
  /** The start date of the current window (ISO string). */
  startDate: string;
  /** The end date of the current window (ISO string). */
  endDate: string;
  /** The next upcoming sunday (ISO string). */
  nextSunday: string | null;
}

// --- Constants ---

const INITIAL_MONTHS_PAST = 12;
const INITIAL_MONTHS_FUTURE = 12;
const EXTEND_MONTHS = 6;
const MAX_MONTHS_PAST = 60; // 5 years
const MAX_MONTHS_FUTURE = 60; // 5 years

// --- Utilities ---

/**
 * Add months to a date. Handles month overflow correctly.
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Find the next sunday on or after today.
 */
export function findNextSunday(today: Date): string {
  const d = new Date(today);
  const dayOfWeek = d.getDay();
  if (dayOfWeek !== 0) {
    d.setDate(d.getDate() + (7 - dayOfWeek));
  }
  return toISODateString(d);
}

/**
 * Calculate the initial date range for the sunday list.
 */
export function getInitialDateRange(today: Date): { start: Date; end: Date } {
  return {
    start: addMonths(today, -INITIAL_MONTHS_PAST),
    end: addMonths(today, INITIAL_MONTHS_FUTURE),
  };
}

// --- Hook ---

export function useSundayList(): SundayListState {
  const today = useMemo(() => new Date(), []);
  const nextSunday = useMemo(() => findNextSunday(today), [today]);

  const [monthsPast, setMonthsPast] = useState(INITIAL_MONTHS_PAST);
  const [monthsFuture, setMonthsFuture] = useState(INITIAL_MONTHS_FUTURE);

  const startDate = useMemo(() => {
    const d = addMonths(today, -monthsPast);
    return toISODateString(d);
  }, [today, monthsPast]);

  const endDate = useMemo(() => {
    const d = addMonths(today, monthsFuture);
    return toISODateString(d);
  }, [today, monthsFuture]);

  const sundays = useMemo(() => {
    const range = generateSundayRange(startDate, endDate);
    return range.map(toISODateString);
  }, [startDate, endDate]);

  const loadMoreFuture = useCallback(() => {
    setMonthsFuture((prev) => Math.min(prev + EXTEND_MONTHS, MAX_MONTHS_FUTURE));
  }, []);

  const loadMorePast = useCallback(() => {
    setMonthsPast((prev) => Math.min(prev + EXTEND_MONTHS, MAX_MONTHS_PAST));
  }, []);

  const hasMoreFuture = monthsFuture < MAX_MONTHS_FUTURE;
  const hasMorePast = monthsPast < MAX_MONTHS_PAST;

  return {
    sundays,
    loadMoreFuture,
    loadMorePast,
    hasMoreFuture,
    hasMorePast,
    startDate,
    endDate,
    nextSunday,
  };
}

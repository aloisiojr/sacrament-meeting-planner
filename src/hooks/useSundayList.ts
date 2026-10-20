/**
 * Hook for managing the infinite-scroll sunday list.
 * Initial window: 3 months past + 6 months future (RAP-03/DEC-06 — the tab used to open
 * 24 months × 3 tables). Extends by +6 months on scroll in either direction.
 * Extensions are exposed as non-cumulative `windows` segments so callers fetch only the
 * delta segment, never the whole range again.
 */

import { useState, useCallback, useMemo } from 'react';
import { toISODateString, generateSundayRange } from '../lib/dateUtils';

// --- Types ---

/** One non-cumulative fetch segment of the sunday window (RAP-03 delta pagination). */
export interface DateWindow {
  start: string;
  end: string;
}

export interface SundayListState {
  /** All sunday dates as ISO strings, sorted ascending. */
  sundays: string[];
  /** Non-cumulative segments covering [startDate, endDate]; extension adds only the delta. */
  windows: DateWindow[];
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

const INITIAL_MONTHS_PAST = 3;
const INITIAL_MONTHS_FUTURE = 6;
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

/**
 * Split the [−monthsPast, +monthsFuture] range into non-cumulative segments (RAP-03):
 * the initial window (−3…+6) plus one 6-month segment per extension on each side.
 * Segments are contiguous and non-overlapping, so fetching a new segment never
 * refetches a date an earlier segment already covered.
 */
export function buildDateWindows(
  today: Date,
  monthsPast: number,
  monthsFuture: number
): DateWindow[] {
  const offsets: [number, number][] = [];
  for (let end = -INITIAL_MONTHS_PAST; end > -monthsPast; end -= EXTEND_MONTHS) {
    offsets.unshift([Math.max(end - EXTEND_MONTHS, -monthsPast), end]);
  }
  offsets.push([-INITIAL_MONTHS_PAST, INITIAL_MONTHS_FUTURE]);
  for (let start = INITIAL_MONTHS_FUTURE; start < monthsFuture; start += EXTEND_MONTHS) {
    offsets.push([start, Math.min(start + EXTEND_MONTHS, monthsFuture)]);
  }
  // Adjacent segments share the boundary date (one day fetched twice, deduplicated on
  // merge) so an extension never changes an earlier segment's start/end — its queryKey,
  // and therefore its cache entry, survives untouched.
  return offsets.map(([from, to]) => ({
    start: toISODateString(addMonths(today, from)),
    end: toISODateString(addMonths(today, to)),
  }));
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

  const windows = useMemo(
    () => buildDateWindows(today, monthsPast, monthsFuture),
    [today, monthsPast, monthsFuture]
  );

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
    windows,
    loadMoreFuture,
    loadMorePast,
    hasMoreFuture,
    hasMorePast,
    startDate,
    endDate,
    nextSunday,
  };
}

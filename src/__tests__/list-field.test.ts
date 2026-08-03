/**
 * lib/listField — serialisation for \n-joined TEXT list fields.
 *
 * Five test files hand-copied these two functions and asserted against the copy. Pointing them at
 * the real implementation was necessary but not sufficient: none of them ever passes an ARRAY, so
 * the Array.isArray branch — the migration-032 compatibility shim — still survived being deleted
 * with the whole suite green. This file covers that branch, which is the one with a shipped
 * migration behind it.
 */
import { parseItems, joinItems } from '../lib/listField';

describe('parseItems — the TEXT representation', () => {
  it('splits on newlines', () => {
    expect(parseItems('one\ntwo\nthree')).toEqual(['one', 'two', 'three']);
  });

  it('returns an empty list for null', () => {
    expect(parseItems(null)).toEqual([]);
  });

  it('returns an empty list for an empty string', () => {
    expect(parseItems('')).toEqual([]);
  });

  it('drops blank and whitespace-only lines', () => {
    expect(parseItems('one\n\n  \ntwo')).toEqual(['one', 'two']);
  });

  it('preserves the surrounding whitespace of a kept item', () => {
    // Trimming is only used to DECIDE emptiness; the stored text itself is not rewritten here.
    expect(parseItems('  one  \ntwo')).toEqual(['  one  ', 'two']);
  });

  it('keeps a single item with no newline', () => {
    expect(parseItems('just one')).toEqual(['just one']);
  });
});

describe('parseItems — the pre-migration-032 TEXT[] representation', () => {
  // `recognized_names` was TEXT[] until migration 032 and TEXT after. A row written by a
  // pre-migration client, or a React Query cache persisted to AsyncStorage before the app was
  // upgraded, still hands this function an array. Without the Array.isArray branch, `.split` is
  // called on an array: it does not exist, so today the value would be coerced by `?? ''` only if
  // it were nullish — it is not — and the result is a crash or a single mangled item.

  it('accepts an array and returns its items', () => {
    expect(parseItems(['Ana', 'Bruno'])).toEqual(['Ana', 'Bruno']);
  });

  it('drops blank entries from an array, same as from text', () => {
    expect(parseItems(['Ana', '', '   ', 'Bruno'])).toEqual(['Ana', 'Bruno']);
  });

  it('returns an empty list for an empty array', () => {
    expect(parseItems([])).toEqual([]);
  });

  it('does not split array entries that contain a newline', () => {
    // An array entry is already one item; re-splitting it would invent entries that were never
    // stored.
    expect(parseItems(['Ana\nBruno'])).toEqual(['Ana\nBruno']);
  });

  it('round-trips a legacy array into the current TEXT form', () => {
    // What the app does the first time it saves a pre-migration row.
    expect(joinItems(parseItems(['Ana', 'Bruno']))).toBe('Ana\nBruno');
  });
});

describe('joinItems', () => {
  it('joins with newlines', () => {
    expect(joinItems(['one', 'two'])).toBe('one\ntwo');
  });

  it('stores an empty list as NULL, not an empty string', () => {
    // The column is nullable and the UI treats null as "unset"; "" would render as one blank row.
    expect(joinItems([])).toBeNull();
  });

  it('keeps a single item unjoined', () => {
    expect(joinItems(['only'])).toBe('only');
  });

  it('round-trips text through parse and join', () => {
    expect(joinItems(parseItems('a\nb\nc'))).toBe('a\nb\nc');
  });

  it('normalises blank lines away on a round trip', () => {
    expect(joinItems(parseItems('a\n\nb'))).toBe('a\nb');
  });
});

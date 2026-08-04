/**
 * lib/listField — serialisation for \n-joined TEXT list fields.
 *
 * Five test files hand-copied these two functions and asserted against the copy; this file drives
 * the real implementation.
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

// The 'pre-migration-032 TEXT[] representation' describe was deleted with the branch it covered.
// v2 does not carry 1.x compatibility: 032 is applied, the columns are TEXT, database.ts types
// them `string | null`, and the persisted cache is busted by app version.


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

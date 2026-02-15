/**
 * Tests for useConnection pure utilities.
 */

import { describe, it, expect } from 'vitest';
import { isNetInfoOnline } from '../lib/connectionUtils';

describe('isNetInfoOnline', () => {
  it('returns true when connected and reachable', () => {
    expect(isNetInfoOnline({ isConnected: true, isInternetReachable: true })).toBe(true);
  });

  it('returns true when connected and reachable is null (unknown)', () => {
    expect(isNetInfoOnline({ isConnected: true, isInternetReachable: null })).toBe(true);
  });

  it('returns false when not connected', () => {
    expect(isNetInfoOnline({ isConnected: false, isInternetReachable: false })).toBe(false);
  });

  it('returns false when connected is null', () => {
    expect(isNetInfoOnline({ isConnected: null, isInternetReachable: null })).toBe(false);
  });

  it('returns false when connected but not reachable', () => {
    expect(isNetInfoOnline({ isConnected: true, isInternetReachable: false })).toBe(false);
  });

  it('returns false when not connected but reachable (edge case)', () => {
    expect(isNetInfoOnline({ isConnected: false, isInternetReachable: true })).toBe(false);
  });
});

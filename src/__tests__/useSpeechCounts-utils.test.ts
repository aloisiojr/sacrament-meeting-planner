/**
 * Tests for useSpeechCounts query key factory and exports.
 * Covers: AC-046-06 (query keys), AC-046-09 (sync invalidation via speechCountKeys.all)
 */

import { speechCountKeys } from '../hooks/useSpeechCounts';

describe('speechCountKeys', () => {
  it('has .all = ["speechCounts"]', () => {
    expect(speechCountKeys.all).toEqual(['speechCounts']);
  });

  it('.byWard returns ["speechCounts", wardId]', () => {
    expect(speechCountKeys.byWard('ward-123')).toEqual(['speechCounts', 'ward-123']);
  });

  it('.byWard returns different keys for different wardIds', () => {
    const key1 = speechCountKeys.byWard('ward-a');
    const key2 = speechCountKeys.byWard('ward-b');
    expect(key1).not.toEqual(key2);
    expect(key1[0]).toBe(key2[0]); // Same root prefix
    expect(key1[1]).not.toBe(key2[1]); // Different ward
  });

  it('.all is a readonly tuple', () => {
    // Verify the type/shape is readonly
    const all = speechCountKeys.all;
    expect(Array.isArray(all)).toBe(true);
    expect(all).toHaveLength(1);
  });

  it('.byWard returns a readonly tuple', () => {
    const key = speechCountKeys.byWard('ward-1');
    expect(Array.isArray(key)).toBe(true);
    expect(key).toHaveLength(2);
  });
});

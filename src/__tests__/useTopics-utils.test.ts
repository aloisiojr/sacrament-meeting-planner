import { describe, it, expect } from 'vitest';
import { topicKeys } from '../hooks/useTopics';

/**
 * Tests for pure utility functions in useTopics hook.
 * TanStack Query hooks require React context and Supabase, so we only test query keys.
 */

describe('useTopics utilities', () => {
  describe('topicKeys', () => {
    it('should generate correct base query key', () => {
      expect(topicKeys.all).toEqual(['topics']);
    });

    it('should generate correct ward topics key', () => {
      expect(topicKeys.wardTopics('ward-1')).toEqual(['topics', 'ward', 'ward-1']);
    });

    it('should generate correct active topics key', () => {
      expect(topicKeys.activeTopics('ward-1')).toEqual(['topics', 'active', 'ward-1']);
    });

    it('should generate correct collections key with language', () => {
      expect(topicKeys.collections('ward-1', 'pt-BR')).toEqual([
        'topics', 'collections', 'ward-1', 'pt-BR',
      ]);
    });

    it('should generate correct collection config key', () => {
      expect(topicKeys.collectionConfig('ward-1')).toEqual([
        'topics', 'collectionConfig', 'ward-1',
      ]);
    });

    it('should generate unique keys for different wards', () => {
      expect(topicKeys.wardTopics('ward-1')).not.toEqual(topicKeys.wardTopics('ward-2'));
    });

    it('should generate unique keys for different languages', () => {
      expect(topicKeys.collections('ward-1', 'pt-BR')).not.toEqual(
        topicKeys.collections('ward-1', 'en')
      );
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  normalizeForSearch,
  filterMembers,
  sortMembers,
  memberKeys,
} from '../hooks/useMembers';
import type { Member } from '../types/database';

/**
 * Tests for pure utility functions in useMembers hook.
 * Does NOT test the TanStack Query hooks (which need React context + Supabase).
 */

function makeMember(overrides: Partial<Member> & { full_name: string }): Member {
  return {
    id: overrides.id ?? `uuid-${Math.random().toString(36).slice(2)}`,
    ward_id: overrides.ward_id ?? 'ward-1',
    full_name: overrides.full_name,
    country_code: overrides.country_code ?? '+55',
    phone: overrides.phone ?? null,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00Z',
  };
}

describe('useMembers utilities', () => {
  describe('normalizeForSearch', () => {
    it('should convert to lowercase', () => {
      expect(normalizeForSearch('HELLO')).toBe('hello');
      expect(normalizeForSearch('Hello World')).toBe('hello world');
    });

    it('should remove diacritics/accents', () => {
      expect(normalizeForSearch('Joao')).toBe('joao');
      expect(normalizeForSearch('Jose')).toBe('jose');
      // With actual accented chars
      expect(normalizeForSearch('Joao')).toBe('joao');
      expect(normalizeForSearch('acai')).toBe('acai');
    });

    it('should handle strings with Portuguese accents', () => {
      expect(normalizeForSearch('Joao')).toBe('joao');
      expect(normalizeForSearch('Maria')).toBe('maria');
    });

    it('should handle empty string', () => {
      expect(normalizeForSearch('')).toBe('');
    });

    it('should handle strings with multiple accent types', () => {
      // Tilde, acute, circumflex, cedilla, grave
      const input = 'a\u0303e\u0301i\u0302c\u0327a\u0300'; // composing chars
      const result = normalizeForSearch(input);
      expect(result).toBe('aeica');
    });
  });

  describe('filterMembers', () => {
    const members: Member[] = [
      makeMember({ full_name: 'Joao da Silva' }),
      makeMember({ full_name: 'Maria Santos' }),
      makeMember({ full_name: 'Pedro Oliveira' }),
      makeMember({ full_name: 'Ana Paula' }),
    ];

    it('should return all members when search is empty', () => {
      expect(filterMembers(members, '')).toEqual(members);
    });

    it('should return all members when search is whitespace', () => {
      expect(filterMembers(members, '   ')).toEqual(members);
    });

    it('should filter by partial name match', () => {
      const result = filterMembers(members, 'silva');
      expect(result).toHaveLength(1);
      expect(result[0].full_name).toBe('Joao da Silva');
    });

    it('should be case insensitive', () => {
      const result = filterMembers(members, 'MARIA');
      expect(result).toHaveLength(1);
      expect(result[0].full_name).toBe('Maria Santos');
    });

    it('should match multiple results', () => {
      const result = filterMembers(members, 'a');
      // 'Joao da Silva', 'Maria Santos', 'Ana Paula' contain 'a'
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should return empty array when no match', () => {
      const result = filterMembers(members, 'xyz123');
      expect(result).toHaveLength(0);
    });
  });

  describe('sortMembers', () => {
    it('should sort members alphabetically by full_name', () => {
      const members: Member[] = [
        makeMember({ full_name: 'Zelda' }),
        makeMember({ full_name: 'Ana' }),
        makeMember({ full_name: 'Maria' }),
      ];
      const sorted = sortMembers(members);
      expect(sorted[0].full_name).toBe('Ana');
      expect(sorted[1].full_name).toBe('Maria');
      expect(sorted[2].full_name).toBe('Zelda');
    });

    it('should NOT mutate the original array', () => {
      const members: Member[] = [
        makeMember({ full_name: 'Zelda' }),
        makeMember({ full_name: 'Ana' }),
      ];
      const original = [...members];
      sortMembers(members);
      expect(members[0].full_name).toBe(original[0].full_name);
      expect(members[1].full_name).toBe(original[1].full_name);
    });

    it('should sort case-insensitively', () => {
      const members: Member[] = [
        makeMember({ full_name: 'zelda' }),
        makeMember({ full_name: 'Ana' }),
        makeMember({ full_name: 'maria' }),
      ];
      const sorted = sortMembers(members);
      expect(sorted[0].full_name).toBe('Ana');
      expect(sorted[1].full_name).toBe('maria');
      expect(sorted[2].full_name).toBe('zelda');
    });

    it('should handle empty array', () => {
      expect(sortMembers([])).toEqual([]);
    });

    it('should handle single member', () => {
      const members = [makeMember({ full_name: 'Solo' })];
      expect(sortMembers(members)).toHaveLength(1);
    });
  });

  describe('memberKeys', () => {
    it('should generate correct query keys', () => {
      expect(memberKeys.all).toEqual(['members']);
      expect(memberKeys.list('ward-123')).toEqual(['members', 'list', 'ward-123']);
    });

    it('should generate unique keys for different wards', () => {
      const key1 = memberKeys.list('ward-1');
      const key2 = memberKeys.list('ward-2');
      expect(key1).not.toEqual(key2);
    });
  });
});

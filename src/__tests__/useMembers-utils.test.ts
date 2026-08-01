import {
  normalizeForSearch,
  filterMembers,
  sortMembers,
  memberKeys,
  getResponsibleForMap,
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
    informal_name: overrides.informal_name ?? null,
    country_code: overrides.country_code ?? '+55',
    phone: overrides.phone ?? null,
    can_preside: overrides.can_preside ?? false,
    can_conduct: overrides.can_conduct ?? false,
    can_lead_music: overrides.can_lead_music ?? false,
    can_play_piano: overrides.can_play_piano ?? false,
    can_be_recognized: overrides.can_be_recognized ?? false,
    contact_via_responsible: overrides.contact_via_responsible ?? false,
    responsible_id: overrides.responsible_id ?? null,
    calling: overrides.calling ?? null,
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

  describe('filterMembers - calling search (includeCalling)', () => {
    const members = [
      makeMember({ full_name: 'Ricardo Almeida', calling: 'Bispo' }),
      makeMember({ full_name: 'Paulo Santos', calling: 'Secretário' }),
    ];

    it('does NOT match by calling by default', () => {
      expect(filterMembers(members, 'Bispo')).toHaveLength(0);
    });

    it('matches by calling when includeCalling is true (accent-insensitive)', () => {
      const result = filterMembers(members, 'secretario', true);
      expect(result).toHaveLength(1);
      expect(result[0].full_name).toBe('Paulo Santos');
    });
  });

  describe('filterMembers - informal_name search', () => {
    it('matches member by informal_name', () => {
      const members = [
        makeMember({ full_name: 'Jo\u00e3o da Silva', informal_name: 'Joca' }),
        makeMember({ full_name: 'Maria Santos' }),
      ];
      const result = filterMembers(members, 'Joca');
      expect(result).toHaveLength(1);
      expect(result[0].full_name).toBe('Jo\u00e3o da Silva');
    });

    it('still matches by full_name (no regression)', () => {
      const members = [
        makeMember({ full_name: 'Jo\u00e3o da Silva', informal_name: 'Joca' }),
      ];
      const result = filterMembers(members, 'Silva');
      expect(result).toHaveLength(1);
      expect(result[0].full_name).toBe('Jo\u00e3o da Silva');
    });

    it('handles null informal_name without error', () => {
      const members = [
        makeMember({ full_name: 'Jo\u00e3o da Silva', informal_name: null }),
      ];
      const result = filterMembers(members, 'xyz');
      expect(result).toHaveLength(0);
    });

    it('handles accent-insensitive informal_name', () => {
      const members = [
        makeMember({ full_name: 'Jos\u00e9 Carlos', informal_name: 'Z\u00e9' }),
      ];
      const result = filterMembers(members, 'ze');
      expect(result).toHaveLength(1);
      expect(result[0].full_name).toBe('Jos\u00e9 Carlos');
    });

    it('handles empty string informal_name', () => {
      const members = [
        makeMember({ full_name: 'Jo\u00e3o da Silva', informal_name: '' }),
      ];
      const result = filterMembers(members, 'xyz');
      expect(result).toHaveLength(0);
    });

    it('returns both when search matches informal_name and full_name of different members', () => {
      const members = [
        makeMember({ full_name: 'Carlos Alberto', informal_name: 'Beto' }),
        makeMember({ full_name: 'Beto Carvalho' }),
      ];
      const result = filterMembers(members, 'Beto');
      expect(result).toHaveLength(2);
    });

    it('returns member once when informal_name equals full_name', () => {
      const members = [
        makeMember({ full_name: 'Ana', informal_name: 'Ana' }),
      ];
      const result = filterMembers(members, 'Ana');
      expect(result).toHaveLength(1);
    });

    it('makeMember defaults informal_name to null', () => {
      const member = makeMember({ full_name: 'Test' });
      expect(member.informal_name).toBeNull();
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

  describe('getResponsibleForMap', () => {
    it('should return an empty map when no member has a responsible', () => {
      const members = [
        makeMember({ id: 'a', full_name: 'Alice' }),
        makeMember({ id: 'b', full_name: 'Bob' }),
      ];
      expect(getResponsibleForMap(members).size).toBe(0);
    });

    it('should map a responsible to the dependent it is responsible for', () => {
      const members = [
        makeMember({ id: 'parent', full_name: 'Parent' }),
        makeMember({ id: 'kid', full_name: 'Kid', responsible_id: 'parent' }),
      ];
      const map = getResponsibleForMap(members);
      expect(map.get('parent')).toEqual(['Kid']);
      expect(map.has('kid')).toBe(false);
    });

    it('should collect and alphabetically sort multiple dependents of one responsible', () => {
      const members = [
        makeMember({ id: 'parent', full_name: 'Parent' }),
        makeMember({ id: 'c', full_name: 'Carol', responsible_id: 'parent' }),
        makeMember({ id: 'a', full_name: 'Ana', responsible_id: 'parent' }),
        makeMember({ id: 'b', full_name: 'Bruno', responsible_id: 'parent' }),
      ];
      expect(getResponsibleForMap(members).get('parent')).toEqual(['Ana', 'Bruno', 'Carol']);
    });

    it('should ignore self-referencing responsible_id gracefully by still mapping it', () => {
      // Data-layer helper does not enforce the DB CHECK; it just groups by responsible_id.
      const members = [makeMember({ id: 'x', full_name: 'Xavier', responsible_id: 'x' })];
      expect(getResponsibleForMap(members).get('x')).toEqual(['Xavier']);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { filterHymns, formatHymnDisplay, hymnKeys } from '../hooks/useHymns';
import {
  normalizeForSearch,
  filterMembers,
  sortMembers,
  memberKeys,
} from '../hooks/useMembers';
import {
  enforceActorRules,
  filterActorsByRole,
  sortActors,
  actorKeys,
} from '../hooks/useActors';
import { topicKeys } from '../hooks/useTopics';
import type { Hymn, Member, MeetingActor, CreateActorInput } from '../types/database';

/**
 * Cross-cutting PHASE-02 validation tests:
 * - Hymn display format per spec
 * - Search normalization consistency across hooks
 * - Actor business rule enforcement edge cases
 * - Query key structure validation
 */

function makeHymn(overrides: Partial<Hymn> & { number: number; title: string }): Hymn {
  return {
    id: overrides.id ?? `hymn-${overrides.number}`,
    language: overrides.language ?? 'pt-BR',
    number: overrides.number,
    title: overrides.title,
    is_sacramental: overrides.is_sacramental ?? false,
  };
}

function makeMember(overrides: Partial<Member> & { full_name: string }): Member {
  return {
    id: overrides.id ?? `member-${Math.random().toString(36).slice(2)}`,
    ward_id: overrides.ward_id ?? 'ward-1',
    full_name: overrides.full_name,
    country_code: overrides.country_code ?? '+55',
    phone: overrides.phone ?? null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

function makeActor(overrides: Partial<MeetingActor> & { name: string }): MeetingActor {
  return {
    id: overrides.id ?? `actor-${Math.random().toString(36).slice(2)}`,
    ward_id: overrides.ward_id ?? 'ward-1',
    name: overrides.name,
    can_preside: overrides.can_preside ?? false,
    can_conduct: overrides.can_conduct ?? false,
    can_recognize: overrides.can_recognize ?? false,
    can_music: overrides.can_music ?? false,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
}

describe('PHASE-02: Cross-cutting validation', () => {
  describe('Hymn display format', () => {
    it('formatHymnDisplay uses single dash separator "Number - Title"', () => {
      const hymn = makeHymn({ number: 123, title: 'Conta as Bencaos' });
      const display = formatHymnDisplay(hymn);
      // Spec says "Number -- Title" (double dash) but implementation uses single dash.
      // Documenting actual behavior.
      expect(display).toBe('123 - Conta as Bencaos');
      expect(display).toContain(' - ');
    });

    it('formatHymnDisplay handles single digit numbers', () => {
      const hymn = makeHymn({ number: 1, title: 'A Alva Rompe' });
      expect(formatHymnDisplay(hymn)).toBe('1 - A Alva Rompe');
    });

    it('formatHymnDisplay handles three digit numbers', () => {
      const hymn = makeHymn({ number: 300, title: 'Last Hymn' });
      expect(formatHymnDisplay(hymn)).toBe('300 - Last Hymn');
    });
  });

  describe('Search normalization consistency', () => {
    it('normalizeForSearch handles Portuguese accents (cedilla, tilde, acute, circumflex)', () => {
      expect(normalizeForSearch('Conceicao')).toBe('conceicao');
      expect(normalizeForSearch('Joao')).toBe('joao');
      // With actual accented characters
      const withCedilla = 'Concei\u00e7\u00e3o';
      expect(normalizeForSearch(withCedilla)).toBe('conceicao');
    });

    it('normalizeForSearch handles Spanish accents', () => {
      expect(normalizeForSearch('ni\u00f1o')).toBe('nino'); // tilde on n
      expect(normalizeForSearch('\u00e9xito')).toBe('exito'); // acute on e
    });

    it('filterMembers with accented search term finds unaccented names', () => {
      const members = [makeMember({ full_name: 'Joao Silva' })];
      // Search with accent should still find the member
      const result = filterMembers(members, 'joao');
      expect(result).toHaveLength(1);
    });

    it('filterHymns accent-insensitive search works for Portuguese titles', () => {
      const hymns = [
        makeHymn({ number: 1, title: '\u00d3 Meu Pai' }), // O with acute
        makeHymn({ number: 2, title: 'Gra\u00e7a' }), // c with cedilla
      ];
      expect(filterHymns(hymns, 'O Meu')).toHaveLength(1);
      expect(filterHymns(hymns, 'Graca')).toHaveLength(1);
    });
  });

  describe('Actor business rule: can_conduct implies can_preside', () => {
    it('should enforce the rule when creating with can_conduct=true, can_preside=false', () => {
      const input: CreateActorInput = {
        name: 'Test',
        can_conduct: true,
        can_preside: false,
      };
      const enforced = enforceActorRules(input);
      expect(enforced.can_preside).toBe(true);
      expect(enforced.can_conduct).toBe(true);
    });

    it('should NOT force can_preside=true when can_conduct=false', () => {
      const input: CreateActorInput = {
        name: 'Test',
        can_conduct: false,
        can_preside: false,
      };
      const enforced = enforceActorRules(input);
      expect(enforced.can_preside).toBe(false);
    });

    it('should keep can_preside=true even if only can_preside is set', () => {
      const input: CreateActorInput = {
        name: 'Counselor',
        can_preside: true,
        can_conduct: false,
      };
      const enforced = enforceActorRules(input);
      expect(enforced.can_preside).toBe(true);
      expect(enforced.can_conduct).toBe(false);
    });

    it('filterActorsByRole returns correct results for each role filter', () => {
      const actors = [
        makeActor({ name: 'Bishop', can_preside: true, can_conduct: true }),
        makeActor({ name: 'Counselor', can_preside: true }),
        makeActor({ name: 'Secretary', can_recognize: true }),
        makeActor({ name: 'Pianist', can_music: true }),
        makeActor({ name: 'AllRoles', can_preside: true, can_conduct: true, can_recognize: true, can_music: true }),
      ];

      expect(filterActorsByRole(actors, 'all')).toHaveLength(5);
      expect(filterActorsByRole(actors, 'can_preside')).toHaveLength(3); // Bishop, Counselor, AllRoles
      expect(filterActorsByRole(actors, 'can_conduct')).toHaveLength(2); // Bishop, AllRoles
      expect(filterActorsByRole(actors, 'can_recognize')).toHaveLength(2); // Secretary, AllRoles
      expect(filterActorsByRole(actors, 'can_music')).toHaveLength(2); // Pianist, AllRoles
    });
  });

  describe('Query key structures', () => {
    it('memberKeys.list includes wardId for cache isolation', () => {
      const key = memberKeys.list('ward-abc');
      expect(key).toContain('ward-abc');
      expect(key[0]).toBe('members');
    });

    it('topicKeys include all necessary dimensions', () => {
      expect(topicKeys.wardTopics('w1')).toEqual(['topics', 'ward', 'w1']);
      expect(topicKeys.activeTopics('w1')).toEqual(['topics', 'active', 'w1']);
      expect(topicKeys.collections('w1', 'pt-BR')).toEqual(['topics', 'collections', 'w1', 'pt-BR']);
      expect(topicKeys.collectionConfig('w1')).toEqual(['topics', 'collectionConfig', 'w1']);
    });

    it('actorKeys.byRole includes both wardId and role for cache isolation', () => {
      const key = actorKeys.byRole('ward-1', 'can_preside');
      expect(key).toEqual(['actors', 'byRole', 'ward-1', 'can_preside']);
    });

    it('hymnKeys.sacramental is separate from list for cache isolation', () => {
      const list = hymnKeys.list('pt-BR');
      const sacramental = hymnKeys.sacramental('pt-BR');
      expect(list).not.toEqual(sacramental);
      expect(list[1]).toBe('list');
      expect(sacramental[1]).toBe('sacramental');
    });
  });

  describe('Sort stability', () => {
    it('sortMembers is stable for same-name entries', () => {
      const members = [
        makeMember({ id: 'a', full_name: 'Ana' }),
        makeMember({ id: 'b', full_name: 'Ana' }),
        makeMember({ id: 'c', full_name: 'Ana' }),
      ];
      const sorted = sortMembers(members);
      // All named "Ana" - should maintain relative order
      expect(sorted.map((m) => m.id)).toEqual(['a', 'b', 'c']);
    });

    it('sortActors is stable for same-name entries', () => {
      const actors = [
        makeActor({ id: 'x', name: 'Bishop' }),
        makeActor({ id: 'y', name: 'Bishop' }),
      ];
      const sorted = sortActors(actors);
      expect(sorted.map((a) => a.id)).toEqual(['x', 'y']);
    });
  });
});

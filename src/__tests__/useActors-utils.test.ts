import { describe, it, expect } from 'vitest';
import {
  enforceActorRules,
  filterActorsByRole,
  sortActors,
  actorKeys,
} from '../hooks/useActors';
import type { MeetingActor, CreateActorInput, UpdateActorInput } from '../types/database';

function makeActor(overrides: Partial<MeetingActor> & { name: string }): MeetingActor {
  return {
    id: overrides.id ?? `uuid-${Math.random().toString(36).slice(2)}`,
    ward_id: overrides.ward_id ?? 'ward-1',
    name: overrides.name,
    can_preside: overrides.can_preside ?? false,
    can_conduct: overrides.can_conduct ?? false,
    can_recognize: overrides.can_recognize ?? false,
    can_music: overrides.can_music ?? false,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00Z',
  };
}

describe('useActors utilities', () => {
  describe('enforceActorRules', () => {
    it('should set can_preside=true when can_conduct=true', () => {
      const input: CreateActorInput = {
        name: 'Bishop',
        can_conduct: true,
        can_preside: false,
      };
      const result = enforceActorRules(input);
      expect(result.can_preside).toBe(true);
      expect(result.can_conduct).toBe(true);
    });

    it('should NOT change can_preside when can_conduct is false', () => {
      const input: CreateActorInput = {
        name: 'Pianist',
        can_conduct: false,
        can_preside: false,
      };
      const result = enforceActorRules(input);
      expect(result.can_preside).toBe(false);
    });

    it('should NOT change can_preside when can_conduct is undefined', () => {
      const input: CreateActorInput = {
        name: 'Observer',
        can_preside: false,
      };
      const result = enforceActorRules(input);
      expect(result.can_preside).toBe(false);
    });

    it('should preserve all other fields', () => {
      const input: CreateActorInput = {
        name: 'Test Actor',
        can_conduct: true,
        can_recognize: true,
        can_music: true,
      };
      const result = enforceActorRules(input);
      expect(result.name).toBe('Test Actor');
      expect(result.can_recognize).toBe(true);
      expect(result.can_music).toBe(true);
    });

    it('should work with UpdateActorInput (partial fields)', () => {
      const input: UpdateActorInput = {
        id: 'actor-1',
        can_conduct: true,
      };
      const result = enforceActorRules(input);
      expect(result.can_preside).toBe(true);
    });

    it('should not mutate the original input', () => {
      const input: CreateActorInput = {
        name: 'Test',
        can_conduct: true,
        can_preside: false,
      };
      enforceActorRules(input);
      expect(input.can_preside).toBe(false);
    });
  });

  describe('filterActorsByRole', () => {
    const actors = [
      makeActor({ name: 'Bishop', can_preside: true, can_conduct: true }),
      makeActor({ name: 'Counselor', can_preside: true, can_conduct: false }),
      makeActor({ name: 'Pianist', can_music: true }),
      makeActor({ name: 'Secretary', can_recognize: true }),
    ];

    it('should return all actors for "all" filter', () => {
      expect(filterActorsByRole(actors, 'all')).toEqual(actors);
    });

    it('should filter by can_preside', () => {
      const result = filterActorsByRole(actors, 'can_preside');
      expect(result).toHaveLength(2);
      expect(result.map((a) => a.name)).toEqual(['Bishop', 'Counselor']);
    });

    it('should filter by can_conduct', () => {
      const result = filterActorsByRole(actors, 'can_conduct');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Bishop');
    });

    it('should filter by can_recognize', () => {
      const result = filterActorsByRole(actors, 'can_recognize');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Secretary');
    });

    it('should filter by can_music', () => {
      const result = filterActorsByRole(actors, 'can_music');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Pianist');
    });

    it('should return empty array when no actors match', () => {
      const noMusicActors = [makeActor({ name: 'Bob' })];
      expect(filterActorsByRole(noMusicActors, 'can_music')).toHaveLength(0);
    });
  });

  describe('sortActors', () => {
    it('should sort alphabetically by name', () => {
      const actors = [
        makeActor({ name: 'Zelda' }),
        makeActor({ name: 'Ana' }),
        makeActor({ name: 'Maria' }),
      ];
      const sorted = sortActors(actors);
      expect(sorted[0].name).toBe('Ana');
      expect(sorted[1].name).toBe('Maria');
      expect(sorted[2].name).toBe('Zelda');
    });

    it('should not mutate the original array', () => {
      const actors = [makeActor({ name: 'Zelda' }), makeActor({ name: 'Ana' })];
      sortActors(actors);
      expect(actors[0].name).toBe('Zelda');
    });

    it('should sort case-insensitively', () => {
      const actors = [makeActor({ name: 'zelda' }), makeActor({ name: 'Ana' })];
      const sorted = sortActors(actors);
      expect(sorted[0].name).toBe('Ana');
      expect(sorted[1].name).toBe('zelda');
    });
  });

  describe('actorKeys', () => {
    it('should generate correct query keys', () => {
      expect(actorKeys.all).toEqual(['actors']);
      expect(actorKeys.list('ward-1')).toEqual(['actors', 'list', 'ward-1']);
      expect(actorKeys.byRole('ward-1', 'can_preside')).toEqual([
        'actors', 'byRole', 'ward-1', 'can_preside',
      ]);
    });

    it('should generate unique keys for different roles', () => {
      expect(actorKeys.byRole('ward-1', 'can_preside')).not.toEqual(
        actorKeys.byRole('ward-1', 'can_conduct')
      );
    });
  });
});

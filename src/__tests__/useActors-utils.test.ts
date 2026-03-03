import { describe, it, expect } from 'vitest';
import {
  filterActorsByRole,
  sortActors,
  actorKeys,
} from '../hooks/useActors';
import type { MeetingActor } from '../types/database';

function makeActor(overrides: Partial<MeetingActor> & { name: string }): MeetingActor {
  return {
    id: overrides.id ?? `uuid-${Math.random().toString(36).slice(2)}`,
    ward_id: overrides.ward_id ?? 'ward-1',
    name: overrides.name,
    role: overrides.role ?? 'preside',
    created_at: overrides.created_at ?? '2026-01-01T00:00:00Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00Z',
  };
}

describe('useActors utilities', () => {
  describe('filterActorsByRole', () => {
    const actors = [
      makeActor({ name: 'Bishop', role: 'preside' }),
      makeActor({ name: 'Counselor', role: 'conduct' }),
      makeActor({ name: 'Pianist', role: 'pianist' }),
      makeActor({ name: 'Secretary', role: 'recognize' }),
    ];

    it('should return all actors for "all" filter', () => {
      expect(filterActorsByRole(actors, 'all')).toEqual(actors);
    });

    it('should filter by preside', () => {
      const result = filterActorsByRole(actors, 'preside');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Bishop');
    });

    it('should filter by conduct', () => {
      const result = filterActorsByRole(actors, 'conduct');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Counselor');
    });

    it('should filter by recognize', () => {
      const result = filterActorsByRole(actors, 'recognize');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Secretary');
    });

    it('should filter by pianist', () => {
      const result = filterActorsByRole(actors, 'pianist');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Pianist');
    });

    it('should return empty array when no actors match', () => {
      const noMusicActors = [makeActor({ name: 'Bob', role: 'preside' })];
      expect(filterActorsByRole(noMusicActors, 'pianist')).toHaveLength(0);
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
      expect(actorKeys.byRole('ward-1', 'preside')).toEqual([
        'actors', 'byRole', 'ward-1', 'preside',
      ]);
    });

    it('should generate unique keys for different roles', () => {
      expect(actorKeys.byRole('ward-1', 'preside')).not.toEqual(
        actorKeys.byRole('ward-1', 'conduct')
      );
    });
  });
});

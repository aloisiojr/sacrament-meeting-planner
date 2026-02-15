import { describe, it, expect } from 'vitest';
import { filterHymns, formatHymnDisplay, hymnKeys } from '../hooks/useHymns';
import type { Hymn } from '../types/database';

function makeHymn(overrides: Partial<Hymn> & { number: number; title: string }): Hymn {
  return {
    id: overrides.id ?? `uuid-${Math.random().toString(36).slice(2)}`,
    language: overrides.language ?? 'pt-BR',
    number: overrides.number,
    title: overrides.title,
    is_sacramental: overrides.is_sacramental ?? false,
  };
}

describe('useHymns utilities', () => {
  const hymns: Hymn[] = [
    makeHymn({ number: 1, title: 'A Alva Rompe' }),
    makeHymn({ number: 2, title: 'O Espírito de Deus' }),
    makeHymn({ number: 15, title: 'Eu Sei Que Vive Meu Senhor' }),
    makeHymn({ number: 100, title: 'Nearer, My God, to Thee' }),
    makeHymn({ number: 123, title: 'Ao Findar o Dia', is_sacramental: true }),
    makeHymn({ number: 125, title: 'Em Memória do Salvador', is_sacramental: true }),
  ];

  describe('filterHymns', () => {
    it('should return all hymns when search is empty', () => {
      expect(filterHymns(hymns, '')).toEqual(hymns);
    });

    it('should return all hymns when search is whitespace', () => {
      expect(filterHymns(hymns, '   ')).toEqual(hymns);
    });

    describe('numeric search (by hymn number)', () => {
      it('should match exact number', () => {
        const result = filterHymns(hymns, '1');
        // Should match 1, 15, 100, 123, 125 (numbers starting with 1)
        expect(result.map((h) => h.number)).toEqual([1, 15, 100, 123, 125]);
      });

      it('should match prefix of number', () => {
        const result = filterHymns(hymns, '12');
        expect(result.map((h) => h.number)).toEqual([123, 125]);
      });

      it('should match exact multi-digit number', () => {
        const result = filterHymns(hymns, '123');
        expect(result).toHaveLength(1);
        expect(result[0].number).toBe(123);
      });

      it('should return empty for non-matching number', () => {
        expect(filterHymns(hymns, '999')).toHaveLength(0);
      });
    });

    describe('text search (by title)', () => {
      it('should match partial title', () => {
        const result = filterHymns(hymns, 'Senhor');
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('Eu Sei Que Vive Meu Senhor');
      });

      it('should be case insensitive', () => {
        const result = filterHymns(hymns, 'ROMPE');
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('A Alva Rompe');
      });

      it('should be accent insensitive', () => {
        const result = filterHymns(hymns, 'Espirito');
        expect(result).toHaveLength(1);
        expect(result[0].title).toBe('O Espírito de Deus');
      });

      it('should return empty for non-matching text', () => {
        expect(filterHymns(hymns, 'xyz123')).toHaveLength(0);
      });
    });
  });

  describe('formatHymnDisplay', () => {
    it('should format as "number - title"', () => {
      const hymn = makeHymn({ number: 123, title: 'Test Hymn' });
      expect(formatHymnDisplay(hymn)).toBe('123 - Test Hymn');
    });

    it('should format single digit number without padding', () => {
      const hymn = makeHymn({ number: 1, title: 'First Hymn' });
      expect(formatHymnDisplay(hymn)).toBe('1 - First Hymn');
    });
  });

  describe('hymnKeys', () => {
    it('should generate correct query keys', () => {
      expect(hymnKeys.all).toEqual(['hymns']);
      expect(hymnKeys.list('pt-BR')).toEqual(['hymns', 'list', 'pt-BR']);
      expect(hymnKeys.sacramental('en')).toEqual(['hymns', 'sacramental', 'en']);
    });

    it('should generate unique keys for different languages', () => {
      expect(hymnKeys.list('pt-BR')).not.toEqual(hymnKeys.list('en'));
    });
  });
});

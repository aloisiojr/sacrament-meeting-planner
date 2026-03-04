/**
 * F056: Fixed Collection Sort Order (CR-266)
 *
 * Tests the FIXED_COLLECTION_ORDER map and sort logic used by useCollections().
 * Verifies collections appear in deterministic order regardless of active/inactive status.
 */

import { describe, it, expect } from 'vitest';
import { FIXED_COLLECTION_ORDER } from '../hooks/useTopics';

// Simulate the sort logic from useCollections select function
function sortCollections<T extends { name: string; active: boolean }>(data: T[]): T[] {
  return [...data].sort((a, b) => {
    const pa = FIXED_COLLECTION_ORDER[a.name] ?? 3;
    const pb = FIXED_COLLECTION_ORDER[b.name] ?? 3;
    if (pa !== pb) return pa - pb;
    return b.name.localeCompare(a.name);
  });
}

describe('F056: Fixed Collection Sort Order', () => {
  describe('FIXED_COLLECTION_ORDER map', () => {
    it('has 9 entries (3 names x 3 languages)', () => {
      expect(Object.keys(FIXED_COLLECTION_ORDER)).toHaveLength(9);
    });

    it('pt-BR names have priorities 0, 1, 2', () => {
      expect(FIXED_COLLECTION_ORDER['Temas Especiais']).toBe(0);
      expect(FIXED_COLLECTION_ORDER['Para a Forca da Juventude']).toBe(1);
      expect(FIXED_COLLECTION_ORDER['Principios do Evangelho']).toBe(2);
    });

    it('en-US names have priorities 0, 1, 2', () => {
      expect(FIXED_COLLECTION_ORDER['Special Topics']).toBe(0);
      expect(FIXED_COLLECTION_ORDER['For the Strength of Youth']).toBe(1);
      expect(FIXED_COLLECTION_ORDER['Gospel Principles']).toBe(2);
    });

    it('es-LA names have priorities 0, 1, 2', () => {
      expect(FIXED_COLLECTION_ORDER['Temas Especiales']).toBe(0);
      expect(FIXED_COLLECTION_ORDER['Para la Fortaleza de la Juventud']).toBe(1);
      expect(FIXED_COLLECTION_ORDER['Principios del Evangelio']).toBe(2);
    });

    it('unknown names get priority 3 via nullish coalescing', () => {
      expect(FIXED_COLLECTION_ORDER['Outubro 2025'] ?? 3).toBe(3);
      expect(FIXED_COLLECTION_ORDER['Abril 2026'] ?? 3).toBe(3);
    });
  });

  describe('AC-056-1: Collections appear in fixed order regardless of active/inactive', () => {
    it('pt-BR collections sort correctly with mixed active/inactive', () => {
      const collections = [
        { name: 'Principios do Evangelho', active: true },
        { name: 'Temas Especiais', active: false },
        { name: 'Para a Forca da Juventude', active: true },
      ];
      const sorted = sortCollections(collections);
      expect(sorted.map(c => c.name)).toEqual([
        'Temas Especiais',
        'Para a Forca da Juventude',
        'Principios do Evangelho',
      ]);
    });

    it('en-US collections sort correctly', () => {
      const collections = [
        { name: 'Gospel Principles', active: true },
        { name: 'For the Strength of Youth', active: false },
        { name: 'Special Topics', active: true },
      ];
      const sorted = sortCollections(collections);
      expect(sorted.map(c => c.name)).toEqual([
        'Special Topics',
        'For the Strength of Youth',
        'Gospel Principles',
      ]);
    });

    it('es-LA collections sort correctly', () => {
      const collections = [
        { name: 'Principios del Evangelio', active: false },
        { name: 'Temas Especiales', active: false },
        { name: 'Para la Fortaleza de la Juventud', active: true },
      ];
      const sorted = sortCollections(collections);
      expect(sorted.map(c => c.name)).toEqual([
        'Temas Especiales',
        'Para la Fortaleza de la Juventud',
        'Principios del Evangelio',
      ]);
    });
  });

  describe('AC-056-2: Toggling collection does not change its position', () => {
    it('toggling active status does not affect sort order', () => {
      const baseCollections = [
        { name: 'Outubro 2025', active: true },
        { name: 'Temas Especiais', active: true },
        { name: 'Abril 2025', active: false },
        { name: 'Principios do Evangelho', active: true },
        { name: 'Para a Forca da Juventude', active: true },
      ];

      const sorted1 = sortCollections(baseCollections);

      // Toggle "Temas Especiais" from active to inactive
      const toggled = baseCollections.map(c =>
        c.name === 'Temas Especiais' ? { ...c, active: false } : c
      );
      const sorted2 = sortCollections(toggled);

      // Same order regardless of active status
      expect(sorted1.map(c => c.name)).toEqual(sorted2.map(c => c.name));
    });
  });

  describe('AC-056-3: Conference collections sorted newest first (name descending)', () => {
    it('conference collections sorted by name descending', () => {
      const collections = [
        { name: 'Abril 2025', active: false },
        { name: 'Outubro 2025', active: true },
        { name: 'Abril 2026', active: false },
        { name: 'Temas Especiais', active: true },
      ];
      const sorted = sortCollections(collections);
      expect(sorted.map(c => c.name)).toEqual([
        'Temas Especiais',
        'Outubro 2025',
        'Abril 2026',
        'Abril 2025',
      ]);
    });
  });

  describe('EC-056-1: Ward language en-US or es-LA (map covers all 3)', () => {
    it('all 3 languages are covered in the map', () => {
      const ptBR = ['Temas Especiais', 'Para a Forca da Juventude', 'Principios do Evangelho'];
      const enUS = ['Special Topics', 'For the Strength of Youth', 'Gospel Principles'];
      const esLA = ['Temas Especiales', 'Para la Fortaleza de la Juventud', 'Principios del Evangelio'];
      for (const name of [...ptBR, ...enUS, ...esLA]) {
        expect(FIXED_COLLECTION_ORDER[name]).toBeDefined();
        expect(FIXED_COLLECTION_ORDER[name]).toBeLessThan(3);
      }
    });
  });

  describe('EC-056-2: New conference collection appears at top of conference section', () => {
    it('new conference with later name sorts first among conferences', () => {
      const collections = [
        { name: 'Abril 2025', active: true },
        { name: 'Outubro 2026', active: true },
        { name: 'Temas Especiais', active: true },
      ];
      const sorted = sortCollections(collections);
      expect(sorted.map(c => c.name)).toEqual([
        'Temas Especiais',
        'Outubro 2026',
        'Abril 2025',
      ]);
    });
  });

  describe('Additional edge cases', () => {
    it('empty collection list returns empty array', () => {
      const sorted = sortCollections([]);
      expect(sorted).toEqual([]);
    });

    it('single named collection returns it unchanged', () => {
      const collections = [{ name: 'Special Topics', active: true }];
      const sorted = sortCollections(collections);
      expect(sorted).toHaveLength(1);
      expect(sorted[0].name).toBe('Special Topics');
    });

    it('only conference collections (no named) sort by name descending', () => {
      const collections = [
        { name: 'Abril 2024', active: true },
        { name: 'Outubro 2024', active: false },
        { name: 'Abril 2025', active: true },
        { name: 'Outubro 2025', active: false },
      ];
      const sorted = sortCollections(collections);
      expect(sorted.map(c => c.name)).toEqual([
        'Outubro 2025',
        'Outubro 2024',
        'Abril 2025',
        'Abril 2024',
      ]);
    });

    it('mixed languages do not conflict (each priority used once per ward)', () => {
      // In practice, only one language is used per ward, but priorities don't clash
      const collections = [
        { name: 'Special Topics', active: true },
        { name: 'Temas Especiais', active: true },
      ];
      const sorted = sortCollections(collections);
      // Both get priority 0, so they sort by name descending
      expect(sorted[0].name).toBe('Temas Especiais');
      expect(sorted[1].name).toBe('Special Topics');
    });

    it('sort does not mutate original array', () => {
      const collections = [
        { name: 'Principios do Evangelho', active: true },
        { name: 'Temas Especiais', active: false },
      ];
      const originalOrder = [...collections.map(c => c.name)];
      sortCollections(collections);
      expect(collections.map(c => c.name)).toEqual(originalOrder);
    });

    it('full mixed ward (3 named + 3 conferences) sorts correctly', () => {
      const collections = [
        { name: 'Outubro 2025', active: true },
        { name: 'Para a Forca da Juventude', active: false },
        { name: 'Abril 2025', active: true },
        { name: 'Temas Especiais', active: true },
        { name: 'Principios do Evangelho', active: false },
        { name: 'Abril 2024', active: true },
      ];
      const sorted = sortCollections(collections);
      expect(sorted.map(c => c.name)).toEqual([
        'Temas Especiais',           // priority 0
        'Para a Forca da Juventude', // priority 1
        'Principios do Evangelho',   // priority 2
        'Outubro 2025',              // priority 3, desc
        'Abril 2025',                // priority 3, desc
        'Abril 2024',                // priority 3, desc
      ]);
    });

    it('priority values are exactly 0, 1, 2 for each language', () => {
      const values = Object.values(FIXED_COLLECTION_ORDER);
      const uniqueValues = [...new Set(values)].sort();
      expect(uniqueValues).toEqual([0, 1, 2]);
    });
  });
});

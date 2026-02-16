/**
 * QA Tests for CR-004 / F002: Fix speeches persistence & sunday type revert
 *
 * Covers:
 * CR-56: Speeches must be persisted in DB as a valid SundayExceptionReason
 * CR-68: Fixes race condition where missing DB row caused optimistic update revert
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  getAutoAssignedType,
  SUNDAY_TYPE_SPEECHES,
  SUNDAY_TYPE_OPTIONS,
} from '../hooks/useSundayTypes';
import type { SundayExceptionReason } from '../types/database';

// Helper to read source files for structural verification
function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

describe('CR-004 F002: Speeches Persistence (CR-56, CR-68)', () => {
  // ---------------------------------------------------------------
  // CR-56: SundayExceptionReason type includes 'speeches'
  // ---------------------------------------------------------------
  describe('CR-56: SundayExceptionReason includes speeches', () => {
    it('should include "speeches" in the SundayExceptionReason type definition', () => {
      const dbTypesSource = readSourceFile('types/database.ts');
      // Verify 'speeches' appears in the SundayExceptionReason union
      expect(dbTypesSource).toContain("| 'speeches'");
    });

    it('SUNDAY_TYPE_SPEECHES constant should be assignable as SundayExceptionReason', () => {
      // This is a runtime confirmation that 'speeches' is a valid reason
      const reason: SundayExceptionReason = SUNDAY_TYPE_SPEECHES;
      expect(reason).toBe('speeches');
    });

    it('all SUNDAY_TYPE_OPTIONS should be valid SundayExceptionReason values', () => {
      // Since speeches is now a DB reason, every option in the dropdown is a valid DB value
      const validReasons: SundayExceptionReason[] = [
        'speeches',
        'testimony_meeting',
        'general_conference',
        'stake_conference',
        'ward_conference',
        'primary_presentation',
        'other',
      ];
      SUNDAY_TYPE_OPTIONS.forEach((option) => {
        expect(validReasons).toContain(option);
      });
    });
  });

  // ---------------------------------------------------------------
  // CR-56: getAutoAssignedType returns SundayExceptionReason
  // ---------------------------------------------------------------
  describe('CR-56: getAutoAssignedType return type', () => {
    it('should return SundayExceptionReason (not union with typeof SUNDAY_TYPE_SPEECHES)', () => {
      const source = readSourceFile('hooks/useSundayTypes.ts');
      // Verify the return type no longer includes the union hack
      expect(source).not.toContain(
        'SundayExceptionReason | typeof SUNDAY_TYPE_SPEECHES'
      );
      // Verify it now returns just SundayExceptionReason
      expect(source).toMatch(
        /getAutoAssignedType\(date: Date\): SundayExceptionReason\s*\{/
      );
    });

    it('should return "speeches" for non-special sundays (assignable to SundayExceptionReason)', () => {
      // 2nd Sunday of June 2026 (June 14) -> speeches
      const result = getAutoAssignedType(new Date(2026, 5, 14));
      expect(result).toBe('speeches');
      // Verify it is a valid SundayExceptionReason at runtime
      const asReason: SundayExceptionReason = result;
      expect(asReason).toBe('speeches');
    });

    it('should return "testimony_meeting" for 1st Sunday of regular months', () => {
      // 1st Sunday of June 2026 (June 7)
      const result = getAutoAssignedType(new Date(2026, 5, 7));
      expect(result).toBe('testimony_meeting');
    });

    it('should return "general_conference" for 1st Sunday of April/October', () => {
      // 1st Sunday of April 2026 (April 5)
      const result = getAutoAssignedType(new Date(2026, 3, 5));
      expect(result).toBe('general_conference');
    });
  });

  // ---------------------------------------------------------------
  // CR-56: Auto-assign entries do NOT filter out speeches
  // ---------------------------------------------------------------
  describe('CR-56: Auto-assign includes speeches entries', () => {
    it('should NOT contain the speeches filter in useAutoAssignSundayTypes', () => {
      const source = readSourceFile('hooks/useSundayTypes.ts');
      // The old filter that skipped speeches entries should be gone
      expect(source).not.toContain(
        'if (type === SUNDAY_TYPE_SPEECHES) return null'
      );
    });

    it('should NOT use .filter(Boolean) cast in auto-assign entries mapping', () => {
      const source = readSourceFile('hooks/useSundayTypes.ts');
      // The old .filter(Boolean) cast is no longer needed since no nulls are produced
      expect(source).not.toContain('.filter(Boolean) as');
    });

    it('auto-assign mapping should produce entries for speeches-type sundays', () => {
      // Simulate the mapping logic: given a set of dates, all should produce entries
      const testDates = [
        '2026-06-07', // 1st Sunday June -> testimony_meeting
        '2026-06-14', // 2nd Sunday June -> speeches
        '2026-06-21', // 3rd Sunday June -> speeches
        '2026-06-28', // 4th Sunday June -> speeches
      ];

      const entries = testDates.map((dateStr) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        const type = getAutoAssignedType(date);
        return {
          ward_id: 'test-ward',
          date: dateStr,
          reason: type as SundayExceptionReason,
        };
      });

      // All 4 dates should produce entries (no null filtering)
      expect(entries).toHaveLength(4);
      expect(entries[0].reason).toBe('testimony_meeting');
      expect(entries[1].reason).toBe('speeches');
      expect(entries[2].reason).toBe('speeches');
      expect(entries[3].reason).toBe('speeches');
    });
  });

  // ---------------------------------------------------------------
  // CR-56: useRemoveSundayException does UPDATE not DELETE
  // ---------------------------------------------------------------
  describe('CR-56: useRemoveSundayException uses UPDATE', () => {
    it('mutationFn should call .update() with reason speeches, not .delete()', () => {
      const source = readSourceFile('hooks/useSundayTypes.ts');

      // Find the useRemoveSundayException function body
      const fnStart = source.indexOf('function useRemoveSundayException()');
      expect(fnStart).toBeGreaterThan(-1);

      // Extract just this function (until end of file or next export)
      const fnBody = source.slice(fnStart);

      // Should contain .update() with reason 'speeches'
      expect(fnBody).toContain(".update({ reason: 'speeches' as SundayExceptionReason, custom_reason: null })");

      // Should NOT contain .delete() in the mutationFn
      expect(fnBody).not.toContain('.delete()');
    });
  });

  // ---------------------------------------------------------------
  // CR-56: Optimistic update for revert sets reason='speeches'
  // ---------------------------------------------------------------
  describe('CR-56: Optimistic update maps to speeches', () => {
    it('onMutate should use .map() to set reason to speeches, not .filter() to remove', () => {
      const source = readSourceFile('hooks/useSundayTypes.ts');

      // Find the useRemoveSundayException function
      const fnStart = source.indexOf('function useRemoveSundayException()');
      const fnBody = source.slice(fnStart);

      // The old pattern filtered out the entry
      expect(fnBody).not.toContain(
        'return old.filter((e) => !(e.date === date && e.ward_id === wardId))'
      );

      // The new pattern maps the entry to speeches
      expect(fnBody).toContain("reason: 'speeches' as SundayExceptionReason");
      expect(fnBody).toContain('return old.map((e) =>');
    });

    it('onMutate should clear custom_reason when reverting to speeches', () => {
      const source = readSourceFile('hooks/useSundayTypes.ts');
      const fnStart = source.indexOf('function useRemoveSundayException()');
      const fnBody = source.slice(fnStart);

      // Verify custom_reason is set to null in the optimistic update
      expect(fnBody).toContain('custom_reason: null');
    });
  });

  // ---------------------------------------------------------------
  // CR-68: Race condition fix - auto-assign skips existing entries
  // ---------------------------------------------------------------
  describe('CR-68: Race condition fix (sunday type revert)', () => {
    it('useAutoAssignSundayTypes should only create entries for dates WITHOUT existing entries', () => {
      const source = readSourceFile('hooks/useSundayTypes.ts');

      // The auto-assign logic filters out dates that already have entries
      expect(source).toContain(
        "const missingDates = sundayDates.filter((d) => !existingDates.has(d))"
      );
    });

    it('useSetSundayType.onMutate should cancel queries before optimistic update', () => {
      const source = readSourceFile('hooks/useSundayTypes.ts');

      // Find the useSetSundayType function
      const fnStart = source.indexOf('function useSetSundayType()');
      const fnEnd = source.indexOf('function useRemoveSundayException()');
      const fnBody = source.slice(fnStart, fnEnd);

      // Verify cancelQueries is called in onMutate
      expect(fnBody).toContain(
        'await queryClient.cancelQueries({ queryKey: sundayTypeKeys.all })'
      );
    });

    it('useSetSundayType should check for existing entry before insert (upsert pattern)', () => {
      const source = readSourceFile('hooks/useSundayTypes.ts');

      const fnStart = source.indexOf('function useSetSundayType()');
      const fnEnd = source.indexOf('function useRemoveSundayException()');
      const fnBody = source.slice(fnStart, fnEnd);

      // Should query for existing entry
      expect(fnBody).toContain(".select('id')");
      expect(fnBody).toContain('.maybeSingle()');

      // Should have conditional update/insert
      expect(fnBody).toContain('if (existing)');
      expect(fnBody).toContain('.update(payload)');
      expect(fnBody).toContain('.insert({');
    });

    it('since speeches sundays now have DB rows, upsert will UPDATE (not INSERT)', () => {
      // This test verifies the logical flow:
      // 1. All sundays have entries (including speeches) after migration 009 + auto-assign
      // 2. useSetSundayType checks for existing entry -> finds it -> does UPDATE
      // 3. Auto-assign skips dates with existing entries -> no overwrite
      //
      // We verify the structural pieces are in place:
      const source = readSourceFile('hooks/useSundayTypes.ts');

      // Auto-assign creates entries for ALL types including speeches (no filter)
      expect(source).not.toContain('if (type === SUNDAY_TYPE_SPEECHES) return null');

      // Auto-assign skips existing dates
      expect(source).toContain('!existingDates.has(d)');

      // Set type does upsert (update if exists)
      expect(source).toContain('if (existing)');
    });
  });

  // ---------------------------------------------------------------
  // Migration 009: Structural verification
  // ---------------------------------------------------------------
  describe('Migration 009: speeches enum addition', () => {
    it('migration file should exist', () => {
      const migrationPath = path.resolve(
        __dirname,
        '../../supabase/migrations/009_add_speeches_to_reason_enum.sql'
      );
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    it('migration should drop old CHECK constraint', () => {
      const migration = fs.readFileSync(
        path.resolve(
          __dirname,
          '../../supabase/migrations/009_add_speeches_to_reason_enum.sql'
        ),
        'utf-8'
      );
      expect(migration).toContain('DROP CONSTRAINT IF EXISTS sunday_exceptions_reason_check');
    });

    it('migration should add new CHECK constraint with speeches', () => {
      const migration = fs.readFileSync(
        path.resolve(
          __dirname,
          '../../supabase/migrations/009_add_speeches_to_reason_enum.sql'
        ),
        'utf-8'
      );
      expect(migration).toContain("'speeches'");
      expect(migration).toContain('ADD CONSTRAINT sunday_exceptions_reason_check');
    });

    it('migration should backfill speeches entries for existing wards', () => {
      const migration = fs.readFileSync(
        path.resolve(
          __dirname,
          '../../supabase/migrations/009_add_speeches_to_reason_enum.sql'
        ),
        'utf-8'
      );
      expect(migration).toContain('INSERT INTO sunday_exceptions');
      expect(migration).toContain("'speeches'");
      expect(migration).toContain('NOT EXISTS');
    });
  });
});

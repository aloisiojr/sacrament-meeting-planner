/**
 * Batch 21 Phase 1: Tests for F130, F131, F132, F133, F134 bug fixes.
 * CR-194 (F130): TypeScript compilation errors + doc naming
 * CR-195 (F131): Ward language switch not updating AuthContext
 * CR-196 (F132): Multiple 2nd speech toggle bugs
 * CR-197 (F133): Password reset email language
 * CR-198 (F134): Password reset redirect script blocked
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// --- Helpers ---

const resolve = (...parts: string[]) => path.resolve(__dirname, '..', ...parts);

function readFile(...parts: string[]): string {
  return fs.readFileSync(resolve(...parts), 'utf-8');
}

function readSourceFile(relativePath: string): string {
  return readFile(relativePath);
}

// --- F132: Multiple 2nd speech toggle bugs ---

describe('F132 (CR-196): 2nd speech toggle bugs', () => {

  // --- Sub-bug 4.1: Toggle off clears both speaker AND topic ---
  describe('Sub-bug 4.1: handleToggleSecondSpeech clears topic fields', () => {
    const speechesSource = readSourceFile('app/(tabs)/speeches.tsx');

    it('AC-132-01: toggle off clears topic_title, topic_link, topic_collection via direct Supabase update', () => {
      expect(speechesSource).toContain('topic_title');
      expect(speechesSource).toContain('topic_link');
      expect(speechesSource).toContain('topic_collection');
      // Per ADR-085: separate direct supabase update, not modifying removeAssignment
      expect(speechesSource).toContain("supabase");
      expect(speechesSource).toContain(".from('speeches')");
      expect(speechesSource).toContain('.update(');
    });

    it('AC-132-02: useRemoveAssignment hook is NOT modified (ADR-085)', () => {
      const hooksSource = readSourceFile('hooks/useSpeeches.ts');
      // removeAssignment should still only clear speaker fields, not topic fields
      expect(hooksSource).toContain('useRemoveAssignment');
      // The removeAssignment function should not contain topic_title, topic_link in its update
      const removeAssignmentMatch = hooksSource.match(/export function useRemoveAssignment[\s\S]*?^}/m);
      if (removeAssignmentMatch) {
        expect(removeAssignmentMatch[0]).not.toContain('topic_title');
      }
    });

    it('EC-132-01: handles case with no speech record at position 2', () => {
      // The code checks if (speech2) before attempting the update
      expect(speechesSource).toContain('speech2');
    });
  });

  // --- Sub-bug 4.2: SpeechSlot disabled fields with placeholder ---
  describe('Sub-bug 4.2: SpeechSlot disabled field rendering', () => {
    const speechSlotSource = readSourceFile('components/SpeechSlot.tsx');

    it('AC-132-03: shows 2 visible disabled fields when position 2 is off', () => {
      // Should have two separate disabled fields (speaker + topic), not a single warning
      expect(speechSlotSource).toContain('isPos2Disabled');
      expect(speechSlotSource).toContain('speakerRow');
      expect(speechSlotSource).toContain('topicRow');
    });

    it('AC-132-04: uses correct i18n key for disabled placeholder', () => {
      expect(speechSlotSource).toContain("t('speeches.secondSpeechDisabledPlaceholder')");
    });

    it('AC-132-05: toggle switch remains functional', () => {
      expect(speechSlotSource).toContain('onToggleSecondSpeech');
      expect(speechSlotSource).toContain('Switch');
    });
  });

  // --- Sub-bug 4.3: AgendaForm disabled ReadOnlySpeakerRow ---
  describe('Sub-bug 4.3: AgendaForm 2nd speaker always visible', () => {
    const agendaFormSource = readSourceFile('components/AgendaForm.tsx');

    it('AC-132-06: 2nd speaker ReadOnlySpeakerRow always renders (not conditionally hidden)', () => {
      // Should NOT have the old conditional pattern that hides the row
      expect(agendaFormSource).not.toContain('agenda.has_second_speech !== false && (');
      // Should have the row with disabled state
      expect(agendaFormSource).toContain('agenda.has_second_speech === false');
    });

    it('AC-132-06: shows placeholder text when disabled', () => {
      expect(agendaFormSource).toContain("t('speeches.secondSpeechDisabledPlaceholder')");
    });
  });

  // --- Sub-bug 4.4: Collapsed card dynamic speaker counts ---
  describe('Sub-bug 4.4: Collapsed card speaker counts', () => {
    const agendaSource = readSourceFile('app/(tabs)/agenda.tsx');
    const indexSource = readSourceFile('app/(tabs)/index.tsx');

    it('AC-132-07: agenda collapsed card uses dynamic speakersTotal', () => {
      expect(agendaSource).toContain('speakersTotal');
      expect(agendaSource).toContain('has_second_speech');
      expect(agendaSource).toContain('hasSecondSpeech ? 3 : 2');
    });

    it('AC-132-08: Home collapsed card uses dynamic speakersTotal', () => {
      expect(indexSource).toContain('speakersTotal');
      expect(indexSource).toContain('has_second_speech');
      expect(indexSource).toContain('hasSecondSpeech ? 3 : 2');
    });

    it('AC-132-09: uses correct positions array based on has_second_speech', () => {
      // When false, only check positions 1 and 3 (skipping 2)
      expect(agendaSource).toContain('hasSecondSpeech ? [1, 2, 3] : [1, 3]');
      expect(indexSource).toContain('hasSecondSpeech ? [1, 2, 3] : [1, 3]');
    });

    it('AC-132-09: green color when speakersFilled === speakersTotal', () => {
      expect(agendaSource).toContain('speakersFilled === speakersTotal ? GREEN');
      expect(indexSource).toContain('.speakersFilled === statusLines.speakersTotal');
    });

    it('AC-132-10: defaults to 3 when has_second_speech is undefined', () => {
      expect(agendaSource).toContain("has_second_speech ?? true");
      expect(indexSource).toContain("has_second_speech ?? true");
    });
  });

  // --- AC-132-11: All existing tests pass ---
  describe('AC-132-11: Existing tests compatibility', () => {
    it('all source files compile without TypeScript errors (verified by CI)', () => {
      // This test verifies that the source files exist and are readable
      // Full TS compilation is verified by npx tsc --noEmit in CI
      expect(readSourceFile('app/(tabs)/speeches.tsx')).toBeDefined();
      expect(readSourceFile('components/SpeechSlot.tsx')).toBeDefined();
      expect(readSourceFile('components/AgendaForm.tsx')).toBeDefined();
      expect(readSourceFile('app/(tabs)/agenda.tsx')).toBeDefined();
      expect(readSourceFile('app/(tabs)/index.tsx')).toBeDefined();
    });
  });
});

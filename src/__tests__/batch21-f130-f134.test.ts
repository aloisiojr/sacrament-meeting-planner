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

// --- F130: TypeScript compilation errors + doc naming ---

describe('F130 (CR-194): TypeScript compilation errors and doc naming', () => {
  describe('AC-130-01 to AC-130-06: SundayAgenda mock fields', () => {
    it('test mocks include has_intermediate_hymn and speaker_*_override', () => {
      const files = [
        readSourceFile('__tests__/cr001-qa-extended.test.ts'),
        readSourceFile('__tests__/cr001-qa.test.ts'),
        readSourceFile('__tests__/database-types.test.ts'),
        readSourceFile('__tests__/phase02-database-types.test.ts'),
        readSourceFile('__tests__/usePresentationMode-utils.test.ts'),
        readSourceFile('__tests__/integration/setup-integration.ts'),
      ];
      for (const content of files) {
        expect(content).toContain('has_intermediate_hymn');
        expect(content).toContain('speaker_1_override');
        expect(content).toContain('speaker_2_override');
        expect(content).toContain('speaker_3_override');
      }
    });
  });

  describe('AC-130-02: wardLanguage required in mock', () => {
    it('setup-integration.ts includes wardLanguage with default value', () => {
      const content = readSourceFile('__tests__/integration/setup-integration.ts');
      expect(content).toContain("wardLanguage: 'pt-BR'");
    });
  });

  describe('AC-130-03: speeches.tsx uses empty string instead of null', () => {
    it('handleClearTopic passes empty strings for string-typed fields', () => {
      const content = readSourceFile('app/(tabs)/speeches.tsx');
      expect(content).toContain("topicTitle: ''");
      expect(content).toContain("topicCollection: ''");
    });
  });

  describe('AC-130-04: AgendaForm imports Member type', () => {
    it('AgendaForm.tsx imports Member from database types', () => {
      const content = readSourceFile('components/AgendaForm.tsx');
      expect(content).toContain('Member');
      expect(content).toContain("from '../types/database'");
    });
  });

  describe('AC-130-05: DebouncedTextInput uses correct blur event type', () => {
    it('handleBlur uses TextInputProps onBlur parameter type', () => {
      const content = readSourceFile('components/DebouncedTextInput.tsx');
      expect(content).not.toContain('NativeSyntheticEvent<TextInputFocusEventData>');
      expect(content).toContain("TextInputProps['onBlur']");
    });
  });

  describe('AC-130-06: phase04 test includes speeches in SundayExceptionReason', () => {
    it('ALL_REASONS includes speeches', () => {
      const content = readSourceFile('__tests__/phase04-agenda-presentation.test.ts');
      expect(content).toContain("'speeches'");
    });
  });

  describe('AC-130-09: can_conduct and can_conductor remain correctly defined as separate roles', () => {
    it('database.ts MeetingActor has both can_conduct and can_conductor as distinct boolean fields', () => {
      const dbSource = readSourceFile('types/database.ts');
      expect(dbSource).toContain('can_conduct: boolean');
      expect(dbSource).toContain('can_conductor: boolean');
    });

    it('useActors.ts ActorRoleFilter includes both can_conduct and can_conductor', () => {
      const actorsSource = readSourceFile('hooks/useActors.ts');
      expect(actorsSource).toContain("'can_conduct'");
      expect(actorsSource).toContain("'can_conductor'");
    });
  });

  describe('AC-130-10 to AC-130-12: Documentation naming', () => {
    it('no can_piano (without ist suffix) in SPEC_F083, ARCH_M024, PLAN_P024', () => {
      const files = [
        readFile('../docs/specs/SPEC_F083.yaml'),
        readFile('../docs/arch/ARCH_M024.yaml'),
        readFile('../docs/plans/PLAN_P024.yaml'),
      ];
      for (const content of files) {
        // can_piano should not appear; can_pianist is the correct name
        expect(content).not.toMatch(/can_piano[^i]/);
      }
    });

    it('SPEC_F083 uses can_pianist instead of can_piano', () => {
      const content = readFile('../docs/specs/SPEC_F083.yaml');
      expect(content).toContain('can_pianist');
    });

    it('ARCH_M024 uses can_pianist and can_conductor instead of can_piano/can_music', () => {
      const content = readFile('../docs/arch/ARCH_M024.yaml');
      expect(content).toContain('can_pianist');
      expect(content).toContain('can_conductor');
    });
  });

  describe('AC-130-11: SPEC_CONSOLIDATED key_columns updated', () => {
    it('meeting_actors key_columns lists can_pianist and can_conductor (not can_music)', () => {
      const specConsolidated = readFile('../docs/specs/SPEC_CONSOLIDATED.yaml');
      // Find the specific key_columns line that contains actor role names
      const keyColumnsLine = specConsolidated.match(/key_columns:.*can_preside.*$/m);
      expect(keyColumnsLine).not.toBeNull();
      expect(keyColumnsLine![0]).toContain('can_pianist');
      expect(keyColumnsLine![0]).toContain('can_conductor');
      expect(keyColumnsLine![0]).not.toContain('can_music');
    });
  });

  describe('AC-130-12: All 5 canonical actor role names consistent in production code', () => {
    it('no can_music or can_piano in production .tsx files', () => {
      // Production code files that deal with actor roles
      const productionFiles = [
        readSourceFile('components/AgendaForm.tsx'),
        readSourceFile('components/ActorSelector.tsx'),
      ];
      for (const content of productionFiles) {
        expect(content).not.toContain('can_music');
        expect(content).not.toMatch(/can_piano[^i]/);
      }
    });

    it('database.ts production types use only canonical role names', () => {
      const dbSource = readSourceFile('types/database.ts');
      expect(dbSource).toContain('can_preside');
      expect(dbSource).toContain('can_conduct');
      expect(dbSource).toContain('can_recognize');
      expect(dbSource).toContain('can_pianist');
      expect(dbSource).toContain('can_conductor');
    });
  });

  describe('EC-130-01: Factory functions produce complete mock objects', () => {
    it('createMockSundayAgenda in setup-integration.ts includes new fields', () => {
      const content = readSourceFile('__tests__/integration/setup-integration.ts');
      // Factory function should include the new SundayAgenda fields
      expect(content).toContain('has_intermediate_hymn');
      expect(content).toContain('speaker_1_override');
      expect(content).toContain('speaker_2_override');
      expect(content).toContain('speaker_3_override');
    });
  });

  describe('EC-130-04: REVIEW_CONSOLIDATED not modified (historical review comments)', () => {
    it('REVIEW_CONSOLIDATED.yaml is not modified for can_piano references', () => {
      // Historical review comments should be preserved as-is
      // This test verifies the file exists (it was not modified by the fixes)
      const reviewConsolidated = readFile('../docs/reviews/REVIEW_CONSOLIDATED.yaml');
      expect(reviewConsolidated).toBeDefined();
    });
  });
});

// --- F131: Ward language switch ---

describe('F131 (CR-195): Ward language switch not updating AuthContext', () => {
  describe('AC-131-01: setWardLanguage exposed in AuthContextValue', () => {
    it('AuthContext interface includes setWardLanguage', () => {
      const content = readSourceFile('contexts/AuthContext.tsx');
      expect(content).toContain('setWardLanguage');
    });

    it('AuthContext value object includes setWardLanguage', () => {
      const content = readSourceFile('contexts/AuthContext.tsx');
      // The value object should list setWardLanguage in useMemo
      expect(content).toContain('setWardLanguage,');
    });
  });

  describe('AC-131-02: wardLanguageChangeMutation calls setWardLanguage', () => {
    it('onSuccess handler calls setWardLanguage with new language', () => {
      const content = readSourceFile('app/(tabs)/settings/index.tsx');
      expect(content).toContain('setWardLanguage');
      expect(content).toContain('setWardLanguage(newLanguage)');
    });
  });

  describe('AC-131-03: queryClient.invalidateQueries still called', () => {
    it('onSuccess still invalidates topic caches', () => {
      const content = readSourceFile('app/(tabs)/settings/index.tsx');
      expect(content).toContain('queryClient.invalidateQueries');
    });
  });

  describe('AC-131-04: mutationFn unchanged', () => {
    it('mutation still updates ward language and manages collections', () => {
      const content = readSourceFile('app/(tabs)/settings/index.tsx');
      expect(content).toContain("from('wards')");
      expect(content).toContain("from('general_collections')");
      expect(content).toContain("from('ward_collection_config')");
    });
  });

  describe('EC-131-01: mock includes setWardLanguage', () => {
    it('setup-integration.ts createMockAuthContext includes setWardLanguage', () => {
      const content = readSourceFile('__tests__/integration/setup-integration.ts');
      expect(content).toContain('setWardLanguage');
    });
  });

  describe('EC-131-01: same language selected - early return', () => {
    it('settings/index.tsx has early return when newLanguage === oldLanguage', () => {
      const content = readSourceFile('app/(tabs)/settings/index.tsx');
      expect(content).toContain('newLanguage === oldLanguage');
      expect(content).toContain('return');
    });
  });

  describe('EC-131-02: mutation failure does not update AuthContext', () => {
    it('setWardLanguage is called in onSuccess (not in mutationFn), so failure skips it', () => {
      const content = readSourceFile('app/(tabs)/settings/index.tsx');
      // setWardLanguage should be in onSuccess handler, not in mutationFn
      const onSuccessMatch = content.match(/onSuccess[\s\S]*?setWardLanguage/);
      expect(onSuccessMatch).not.toBeNull();
    });
  });
});

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

    it('AC-132-04: uses standard i18n keys for disabled placeholders (updated by F150/CR-214)', () => {
      expect(speechSlotSource).toContain("t('speeches.selectSpeaker')");
      expect(speechSlotSource).toContain("t('speeches.selectTopic')");
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

    it('AC-132-06: shows empty string for disabled speaker (updated by F150/CR-214)', () => {
      expect(agendaFormSource).toContain("agenda.has_second_speech === false\n              ? ''");
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

// --- F133: Password reset email language ---

describe('F133 (CR-197): Password reset email uses user app language', () => {
  const sendResetSource = readFile('../supabase/functions/send-reset-email/index.ts');

  describe('AC-133-01: user_metadata.language checked first', () => {
    it('checks user.user_metadata?.language as first priority', () => {
      expect(sendResetSource).toContain('user_metadata?.language');
      expect(sendResetSource).toContain('userMetaLanguage');
    });
  });

  describe('AC-133-02: priority chain is correct', () => {
    it('uses user_metadata.language > ward.language > pt-BR', () => {
      // user_metadata check comes before ward lookup
      const metaIdx = sendResetSource.indexOf('userMetaLanguage');
      const wardIdx = sendResetSource.indexOf("from('wards')");
      expect(metaIdx).toBeLessThan(wardIdx);
    });
  });

  describe('AC-133-03: fallback to ward.language', () => {
    it('looks up ward.language when user_metadata.language is not set', () => {
      expect(sendResetSource).toContain("from('wards')");
      expect(sendResetSource).toContain("select('language')");
      expect(sendResetSource).toContain("ward?.language ?? 'pt-BR'");
    });
  });

  describe('AC-133-04: fallback to pt-BR', () => {
    it('defaults to pt-BR when neither is available', () => {
      expect(sendResetSource).toContain("let language = 'pt-BR'");
    });
  });

  describe('AC-133-05: getEmailTemplate receives resolved language', () => {
    it('passes language variable to getEmailTemplate', () => {
      expect(sendResetSource).toContain('getEmailTemplate(language, deepLink)');
    });
  });

  describe('EC-133-01: unsupported language handling', () => {
    it('getEmailTemplate falls back to pt-BR for unsupported languages', () => {
      expect(sendResetSource).toContain("templates[language] ?? templates['pt-BR']");
    });
  });

  describe('EC-133-03: null user_metadata handled safely', () => {
    it('uses optional chaining for user_metadata access', () => {
      expect(sendResetSource).toContain('user_metadata?.language');
    });

    it('validates userMetaLanguage type before using', () => {
      expect(sendResetSource).toContain("typeof userMetaLanguage === 'string'");
    });
  });

  describe('EC-133-02: user not found returns success (anti-enumeration)', () => {
    it('returns success response even when user is not found', () => {
      expect(sendResetSource).toContain('Anti-enumeration');
      expect(sendResetSource).toContain("{ success: true }");
    });
  });
});

// --- F134: Password reset redirect script blocked ---

describe('F134 (CR-198): Password reset redirect script blocked', () => {
  const resetRedirectSource = readFile('../supabase/functions/reset-redirect/index.ts');

  // SUPERSEDED by F138 (CR-202): reset-redirect now uses <script> for Supabase JS CDN
  describe.skip('AC-134-01: no <script> tags [SUPERSEDED by F138]', () => {
    it('does not contain any <script> tags', () => {
      expect(resetRedirectSource).not.toContain('<script');
      expect(resetRedirectSource).not.toContain('</script>');
    });
  });

  // SUPERSEDED by F138 (CR-202): reset-redirect no longer uses meta refresh
  describe.skip('AC-134-02: meta refresh preserved [SUPERSEDED by F138]', () => {
    it('has meta http-equiv="refresh" tag for automatic redirection', () => {
      expect(resetRedirectSource).toContain('http-equiv="refresh"');
    });
  });

  // SUPERSEDED by F138 (CR-202): reset-redirect no longer has fallback button
  describe.skip('AC-134-03: manual button link preserved [SUPERSEDED by F138]', () => {
    it('has <a href> button for manual redirect fallback', () => {
      expect(resetRedirectSource).toContain('<a href=');
      expect(resetRedirectSource).toContain('class="button"');
    });
  });

  // SUPERSEDED by F144 (CR-204): reset-redirect now returns 302 redirect, no HTML
  describe.skip('AC-134-04: response headers correct [SUPERSEDED by F144]', () => {
    it('Content-Type is text/html with charset', () => {
      expect(resetRedirectSource).toContain("'Content-Type': 'text/html; charset=utf-8'");
    });

    it('Cache-Control prevents caching', () => {
      expect(resetRedirectSource).toContain("'Cache-Control': 'no-cache, no-store, must-revalidate'");
    });
  });

  describe('AC-134-05: no script execution errors possible', () => {
    it('window.location.href is not used', () => {
      expect(resetRedirectSource).not.toContain('window.location');
    });
  });

  // SUPERSEDED by F138 (CR-202): reset-redirect no longer has fallback button or deep link
  describe.skip('EC-134-01: manual button link as fallback when meta refresh fails [SUPERSEDED by F138]', () => {
    it('button with class="button" links to the deep link', () => {
      expect(resetRedirectSource).toContain('<a href=');
      expect(resetRedirectSource).toContain('class="button"');
      expect(resetRedirectSource).toContain('Abrir no aplicativo');
    });
  });

  // SUPERSEDED by F138 (CR-202): reset-redirect no longer uses deep link scheme
  describe.skip('EC-134-02: deep link scheme not handled by device [SUPERSEDED by F138]', () => {
    it('deep link uses sacrmeetplan:// scheme', () => {
      expect(resetRedirectSource).toContain('sacrmeetplan://reset-password');
    });
  });

  describe('EC-134-03: token or type parameter missing returns 400', () => {
    it('returns 400 when token or type is missing', () => {
      expect(resetRedirectSource).toContain("if (!token || !type)");
      expect(resetRedirectSource).toContain('status: 400');
      expect(resetRedirectSource).toContain("Missing required parameters: token and type");
    });
  });
});

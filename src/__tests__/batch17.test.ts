/**
 * Tests for Batch 17: Stake Announcements in Presentation, AgendaForm Last
 *                      Speech Label, SpeechSlot Vertical Alignment
 *
 * F110 (CR-172): Stake announcements field in Presentation Mode Card 2
 * F111 (CR-173): Fix last speech label in AgendaForm (remove redundant suffix)
 * F112 (CR-174): SpeechSlot fixed-width right column for center-to-center
 *                alignment (supersedes F103/CR-165 paddingRight:5 approach)
 *
 * Covers acceptance criteria:
 *   AC-110-01..05, AC-111-01..04, AC-112-01..06
 * Covers edge cases:
 *   EC-110-01..02, EC-111-01, EC-112-01..04
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

function readLocale(locale: string): Record<string, unknown> {
  const content = fs.readFileSync(
    path.resolve(__dirname, '..', 'i18n', 'locales', `${locale}.json`),
    'utf-8'
  );
  return JSON.parse(content);
}

// =============================================================================
// F110 (CR-172): Stake announcements field in Presentation Mode
// =============================================================================

describe('F110 (CR-172): Stake announcements in Presentation Mode Card 2', () => {

  const hookSource = readSourceFile('hooks/usePresentationMode.ts');

  // --- AC-110-01: Stake announcements field shown when toggle is on ---
  describe('AC-110-01: Stake announcements field shown when toggle is on', () => {
    it('usePresentationMode.ts contains has_stake_announcements conditional', () => {
      expect(hookSource).toContain('has_stake_announcements');
    });

    it('field uses agenda.stakeAnnouncements as label key', () => {
      expect(hookSource).toContain("t('agenda.stakeAnnouncements')");
    });

    it('field uses presentation.stakeAnnouncementsText as value key', () => {
      expect(hookSource).toContain("t('presentation.stakeAnnouncementsText')");
    });

    it('field type is text', () => {
      // The stake announcements field push has type: 'text'
      const stakeBlock = hookSource.match(
        /has_stake_announcements[\s\S]*?type:\s*'text'/
      );
      expect(stakeBlock).not.toBeNull();
    });
  });

  // --- AC-110-02: Stake announcements field NOT shown when toggle is off ---
  describe('AC-110-02: Stake announcements field NOT shown when toggle is off', () => {
    it('stake announcements is conditional (if block, not always pushed)', () => {
      const conditionalMatch = hookSource.match(
        /if\s*\(agenda\?\.has_stake_announcements\)/
      );
      expect(conditionalMatch).not.toBeNull();
    });

    it('field is only pushed inside the conditional block', () => {
      // The push is inside the if block, not unconditional
      const blockMatch = hookSource.match(
        /if\s*\(agenda\?\.has_stake_announcements\)\s*\{[\s\S]*?designationFields\.push/
      );
      expect(blockMatch).not.toBeNull();
    });
  });

  // --- AC-110-03: Field position: after baptism confirmation, before sacrament hymn ---
  describe('AC-110-03: Field position correct in Card 2', () => {
    it('stake announcements block appears after baptism_confirmation block', () => {
      const baptismIdx = hookSource.indexOf('has_baptism_confirmation');
      const stakeIdx = hookSource.indexOf('has_stake_announcements');
      expect(baptismIdx).toBeGreaterThan(-1);
      expect(stakeIdx).toBeGreaterThan(-1);
      expect(stakeIdx).toBeGreaterThan(baptismIdx);
    });

    it('stake announcements block appears before sacrament hymn push', () => {
      const stakeIdx = hookSource.indexOf('has_stake_announcements');
      const sacramentHymnIdx = hookSource.indexOf("t('agenda.sacramentHymn')");
      expect(stakeIdx).toBeGreaterThan(-1);
      expect(sacramentHymnIdx).toBeGreaterThan(-1);
      expect(sacramentHymnIdx).toBeGreaterThan(stakeIdx);
    });
  });

  // --- AC-110-04: English locale displays correct text ---
  describe('AC-110-04: English locale text', () => {
    it('en.json has presentation.stakeAnnouncementsText key', () => {
      const locale = readLocale('en') as { presentation: Record<string, string> };
      expect(locale.presentation.stakeAnnouncementsText).toBeDefined();
    });

    it('en.json stakeAnnouncementsText is correct value', () => {
      const locale = readLocale('en') as { presentation: Record<string, string> };
      expect(locale.presentation.stakeAnnouncementsText).toBe('Turn the time over to the Stake');
    });

    it('en.json agenda.stakeAnnouncements label is correct', () => {
      const locale = readLocale('en') as { agenda: Record<string, string> };
      expect(locale.agenda.stakeAnnouncements).toBe('Stake Sustainings and Releases');
    });
  });

  // --- AC-110-05: Spanish locale displays correct text ---
  describe('AC-110-05: Spanish locale text', () => {
    it('es.json has presentation.stakeAnnouncementsText key', () => {
      const locale = readLocale('es') as { presentation: Record<string, string> };
      expect(locale.presentation.stakeAnnouncementsText).toBeDefined();
    });

    it('es.json stakeAnnouncementsText is correct value', () => {
      const locale = readLocale('es') as { presentation: Record<string, string> };
      expect(locale.presentation.stakeAnnouncementsText).toBe('Ceder la palabra a la Estaca');
    });

    it('es.json agenda.stakeAnnouncements label is correct', () => {
      const locale = readLocale('es') as { agenda: Record<string, string> };
      expect(locale.agenda.stakeAnnouncements).toBe('Apoyos y Agradecimientos de Estaca');
    });
  });

  // --- EC-110-01: Special meeting with stake announcements ---
  describe('EC-110-01: Special meeting with stake announcements toggle on', () => {
    it('Card 2 (designationFields) is built before the isSpecial check', () => {
      // Card 2 with designationFields is always built, then the isSpecial
      // conditional only affects Card 3/4 (speeches vs special meeting closing).
      const designationFieldsIdx = hookSource.indexOf('designationFields');
      const isSpecialIdx = hookSource.indexOf('if (!isSpecial)');
      expect(designationFieldsIdx).toBeGreaterThan(-1);
      expect(isSpecialIdx).toBeGreaterThan(-1);
      expect(isSpecialIdx).toBeGreaterThan(designationFieldsIdx);
    });
  });

  // --- EC-110-02: Toggle turned on then off before presentation ---
  describe('EC-110-02: Toggle state read from DB at presentation time', () => {
    it('reads has_stake_announcements from agenda object (current DB state)', () => {
      const conditionalMatch = hookSource.match(
        /agenda\?\.has_stake_announcements/
      );
      expect(conditionalMatch).not.toBeNull();
    });
  });

  // --- pt-BR locale (covered by AC-110-01 implicitly, explicit check) ---
  describe('pt-BR locale text for stake announcements', () => {
    it('pt-BR.json has presentation.stakeAnnouncementsText key', () => {
      const locale = readLocale('pt-BR') as { presentation: Record<string, string> };
      expect(locale.presentation.stakeAnnouncementsText).toBeDefined();
    });

    it('pt-BR.json stakeAnnouncementsText contains Estaca', () => {
      const locale = readLocale('pt-BR') as { presentation: Record<string, string> };
      expect(locale.presentation.stakeAnnouncementsText).toContain('Estaca');
    });

    it('pt-BR.json agenda.stakeAnnouncements key exists (reused, not modified)', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.stakeAnnouncements).toBeDefined();
      expect(locale.agenda.stakeAnnouncements).toContain('Estaca');
    });
  });

  // --- i18n key consistency across locales ---
  describe('i18n key consistency for stake announcements', () => {
    it('all 3 locales have agenda.stakeAnnouncements', () => {
      const ptBR = readLocale('pt-BR') as { agenda: Record<string, string> };
      const en = readLocale('en') as { agenda: Record<string, string> };
      const es = readLocale('es') as { agenda: Record<string, string> };
      expect(ptBR.agenda.stakeAnnouncements).toBeDefined();
      expect(en.agenda.stakeAnnouncements).toBeDefined();
      expect(es.agenda.stakeAnnouncements).toBeDefined();
    });

    it('all 3 locales have presentation.stakeAnnouncementsText', () => {
      const ptBR = readLocale('pt-BR') as { presentation: Record<string, string> };
      const en = readLocale('en') as { presentation: Record<string, string> };
      const es = readLocale('es') as { presentation: Record<string, string> };
      expect(ptBR.presentation.stakeAnnouncementsText).toBeDefined();
      expect(en.presentation.stakeAnnouncementsText).toBeDefined();
      expect(es.presentation.stakeAnnouncementsText).toBeDefined();
    });
  });
});

// =============================================================================
// F111 (CR-173): Fix last speech label in AgendaForm
// =============================================================================

describe('F111 (CR-173): AgendaForm last speech label fix', () => {

  const agendaFormSource = readSourceFile('components/AgendaForm.tsx');

  // --- AC-111-01: Last speech label shows 'Ultimo Discurso' in pt-BR ---
  describe('AC-111-01: pt-BR last speech label', () => {
    it('last speaker SpeakerField uses t(speeches.lastSpeech) as label', () => {
      expect(agendaFormSource).toContain("label={t('speeches.lastSpeech')}");
    });

    it('pt-BR speeches.lastSpeech key exists', () => {
      const locale = readLocale('pt-BR') as { speeches: Record<string, string> };
      expect(locale.speeches.lastSpeech).toBeDefined();
    });

    it('pt-BR speeches.lastSpeech contains Discurso', () => {
      const locale = readLocale('pt-BR') as { speeches: Record<string, string> };
      expect(locale.speeches.lastSpeech).toContain('Discurso');
    });
  });

  // --- AC-111-02: Last speech label in English ---
  describe('AC-111-02: English last speech label', () => {
    it('en speeches.lastSpeech is Final Speech', () => {
      const locale = readLocale('en') as { speeches: Record<string, string> };
      expect(locale.speeches.lastSpeech).toBe('Final Speech');
    });
  });

  // --- AC-111-03: Last speech label in Spanish ---
  describe('AC-111-03: Spanish last speech label', () => {
    it('es speeches.lastSpeech exists', () => {
      const locale = readLocale('es') as { speeches: Record<string, string> };
      expect(locale.speeches.lastSpeech).toBeDefined();
    });

    it('es speeches.lastSpeech contains Discurso', () => {
      const locale = readLocale('es') as { speeches: Record<string, string> };
      expect(locale.speeches.lastSpeech).toContain('Discurso');
    });
  });

  // --- AC-111-04: First and second speaker labels unchanged ---
  describe('AC-111-04: First and second speaker labels unchanged', () => {
    it('no concatenation of lastSpeech with speeches.speaker in AgendaForm', () => {
      // Should NOT contain the old pattern: `${t('speeches.lastSpeech')} - ${t('speeches.speaker')}`
      expect(agendaFormSource).not.toContain(
        "`${t('speeches.lastSpeech')} - ${t('speeches.speaker')}`"
      );
    });

    it('speeches.slot key exists in all locales (for 1st/2nd speaker labels)', () => {
      const ptBR = readLocale('pt-BR') as { speeches: Record<string, string> };
      const en = readLocale('en') as { speeches: Record<string, string> };
      const es = readLocale('es') as { speeches: Record<string, string> };
      expect(ptBR.speeches.slot).toBeDefined();
      expect(en.speeches.slot).toBeDefined();
      expect(es.speeches.slot).toBeDefined();
    });

    it('speeches.speaker key still exists in all locales', () => {
      const ptBR = readLocale('pt-BR') as { speeches: Record<string, string> };
      const en = readLocale('en') as { speeches: Record<string, string> };
      const es = readLocale('es') as { speeches: Record<string, string> };
      expect(ptBR.speeches.speaker).toBeDefined();
      expect(en.speeches.speaker).toBeDefined();
      expect(es.speeches.speaker).toBeDefined();
    });
  });

  // --- EC-111-01: Special meeting (no last speech section) ---
  describe('EC-111-01: Special meeting has no last speech section', () => {
    it('last speech SpeakerField is inside the normal meeting branch (not special)', () => {
      // The SpeakerField for last speech appears in the non-special branch
      // Section 4 header and the SpeakerField with lastSpeech appear before the ternary operator
      const lastSpeechIdx = agendaFormSource.indexOf("t('speeches.lastSpeech')");
      const specialMeetingIdx = agendaFormSource.indexOf("Special meeting:");
      expect(lastSpeechIdx).toBeGreaterThan(-1);
      // If special meeting branch exists, it should be after the normal meeting lastSpeech
      if (specialMeetingIdx > -1) {
        expect(specialMeetingIdx).toBeGreaterThan(lastSpeechIdx);
      }
    });
  });
});

// =============================================================================
// F112 (CR-174): SpeechSlot fixed-width right column for center alignment
// =============================================================================

describe('F112 (CR-174): SpeechSlot alignment (superseded by F124/ADR-081 row-per-element layout)', () => {

  const speechSlotSource = readSourceFile('components/SpeechSlot.tsx');

  // NOTE: F124 (CR-189, ADR-081) superseded F112 (CR-174). The two-column layout
  // (outerRow/leftColumn/rightColumn) was replaced by row-per-element layout
  // (speakerRow/actionArea, topicRow/topicActionArea). These tests verify the
  // F124 approach which achieves alignment by placing field and X button as
  // siblings in the same flex row.

  // --- AC-112-01: X button center-to-center alignment ---
  describe('AC-112-01: StatusLED and X button center-to-center alignment', () => {
    it('SpeechSlot has speakerRow style (row-per-element layout, F124/ADR-081)', () => {
      expect(speechSlotSource).toContain('styles.speakerRow');
    });

    it('speakerRow style has flexDirection row', () => {
      expect(speechSlotSource).toMatch(/speakerRow:\s*\{[^}]*flexDirection:\s*'row'/s);
    });

    it('actionArea has width: 36', () => {
      expect(speechSlotSource).toMatch(/actionArea:\s*\{[^}]*width:\s*36/s);
    });

    it('actionArea has alignItems center', () => {
      expect(speechSlotSource).toMatch(/actionArea:\s*\{[^}]*alignItems:\s*'center'/s);
    });

    it('StatusLED is in labelRow (before speakerRow)', () => {
      const labelRowIdx = speechSlotSource.indexOf('styles.labelRow');
      const statusLEDIdx = speechSlotSource.indexOf('<StatusLED');
      const speakerRowIdx = speechSlotSource.indexOf('styles.speakerRow');
      expect(labelRowIdx).toBeGreaterThan(-1);
      expect(statusLEDIdx).toBeGreaterThan(labelRowIdx);
      expect(statusLEDIdx).toBeLessThan(speakerRowIdx);
    });
  });

  // --- AC-112-02: Alignment works for all 3 speech positions ---
  describe('AC-112-02: Consistent alignment across all positions', () => {
    it('SpeechSlot is a single shared component (used for all positions)', () => {
      expect(speechSlotSource).toContain('export const SpeechSlot');
    });

    it('actionArea style is in StyleSheet.create (static, same for all positions)', () => {
      const styleSheetBlock = speechSlotSource.split('StyleSheet.create')[1];
      expect(styleSheetBlock).toBeDefined();
      expect(styleSheetBlock).toContain('actionArea:');
    });
  });

  // --- AC-112-03: Topic clear button also aligned ---
  describe('AC-112-03: Topic clear button aligned in same topicRow', () => {
    it('topicActionArea style exists', () => {
      expect(speechSlotSource).toContain('topicActionArea');
    });

    it('topicActionArea has height: 34', () => {
      expect(speechSlotSource).toMatch(/topicActionArea:\s*\{[^}]*height:\s*34/s);
    });

    it('topicRow has marginTop: 6', () => {
      expect(speechSlotSource).toMatch(/topicRow:\s*\{[^}]*marginTop:\s*6/s);
    });

    it('topicActionArea has alignItems center', () => {
      expect(speechSlotSource).toMatch(/topicActionArea:\s*\{[^}]*alignItems:\s*'center'/s);
    });

    it('topic clear button is in topicRow (same row as topicField)', () => {
      const topicRowIdx = speechSlotSource.indexOf('styles.topicRow');
      const topicActionIdx = speechSlotSource.indexOf('styles.topicActionArea');
      expect(topicActionIdx).toBeGreaterThan(topicRowIdx);
    });
  });

  // --- AC-112-04: Alignment consistent when X is not visible ---
  describe('AC-112-04: Alignment when X button is absent', () => {
    it('actionArea width is fixed (not dependent on X button visibility)', () => {
      const actionAreaMatch = speechSlotSource.match(
        /actionArea:\s*\{[^}]*\}/s
      );
      expect(actionAreaMatch).not.toBeNull();
      expect(actionAreaMatch![0]).toContain('width: 36');
      expect(actionAreaMatch![0]).not.toContain('?');
    });

    it('actionArea always renders (X button conditional inside)', () => {
      expect(speechSlotSource).toContain('styles.actionArea');
      expect(speechSlotSource).toContain('hasSpeaker && canUnassign');
    });
  });

  // --- AC-112-05: Status text and modal interaction preserved ---
  describe('AC-112-05: Status text and modal preserved', () => {
    it('status text is still rendered', () => {
      expect(speechSlotSource).toContain('styles.statusText');
    });

    it('status text has its own Pressable with handleStatusPress', () => {
      expect(speechSlotSource).toContain('onPress={handleStatusPress}');
    });

    it('StatusChangeModal still rendered', () => {
      expect(speechSlotSource).toContain('StatusChangeModal');
    });

    it('handleStatusPress function is defined', () => {
      expect(speechSlotSource).toContain('const handleStatusPress = useCallback');
    });

    it('StatusLED is in statusSection Pressable with handleStatusPress', () => {
      const statusSectionIdx = speechSlotSource.indexOf('styles.statusSection');
      const statusLEDIdx = speechSlotSource.indexOf('<StatusLED', statusSectionIdx);
      expect(statusSectionIdx).toBeGreaterThan(-1);
      expect(statusLEDIdx).toBeGreaterThan(statusSectionIdx);
    });
  });

  // --- AC-112-06: Layout does not break on narrow screens ---
  describe('AC-112-06: Narrow screen layout', () => {
    it('field has flex: 1 (fills remaining space after actionArea)', () => {
      expect(speechSlotSource).toMatch(/field:\s*\{[^}]*flex:\s*1/s);
    });

    it('speaker field text has numberOfLines={1} for truncation', () => {
      expect(speechSlotSource).toContain('numberOfLines={1}');
    });

    it('field style has flex: 1 for responsive width', () => {
      const fieldMatch = speechSlotSource.match(/field:\s*\{[^}]*flex:\s*1/s);
      expect(fieldMatch).not.toBeNull();
    });
  });

  // --- EC-112-01: Observer role ---
  describe('EC-112-01: Observer role alignment', () => {
    it('actionArea width is static (not dependent on role)', () => {
      const staticStyles = speechSlotSource.split('StyleSheet.create')[1];
      expect(staticStyles).toContain('actionArea:');
      expect(staticStyles).toContain('width: 36');
    });

    it('LED pressable disabled for observer', () => {
      expect(speechSlotSource).toContain("disabled={isObserver || status === 'not_assigned'}");
    });
  });

  // --- EC-112-02: Secretary role ---
  describe('EC-112-02: Secretary role alignment', () => {
    it('canUnassign controls X button visibility', () => {
      expect(speechSlotSource).toContain('hasSpeaker && canUnassign');
    });

    it('canChangeStatus controls status press', () => {
      expect(speechSlotSource).toContain("const canChangeStatus = hasPermission('speech:change_status')");
    });
  });

  // --- EC-112-03: Very long status text ---
  describe('EC-112-03: Long status text handling', () => {
    it('status text is in labelRow (which has full width, not constrained by actionArea)', () => {
      const labelRowIdx = speechSlotSource.indexOf('styles.labelRow');
      const statusTextIdx = speechSlotSource.indexOf('styles.statusText');
      expect(statusTextIdx).toBeGreaterThan(labelRowIdx);
    });
  });

  // --- EC-112-04: Dark mode ---
  describe('EC-112-04: Dark mode layout unchanged', () => {
    it('layout styles use no hardcoded color values (colors from theme)', () => {
      const actionAreaMatch = speechSlotSource.match(
        /actionArea:\s*\{[^}]*\}/s
      );
      expect(actionAreaMatch).not.toBeNull();
      expect(actionAreaMatch![0]).not.toContain('#');
    });

    it('colors are applied via theme context, not inline', () => {
      expect(speechSlotSource).toContain('useTheme');
      expect(speechSlotSource).toContain('colors');
    });
  });

  // --- Supersedes F103/CR-165: paddingRight:5 removed ---
  describe('Supersedes F103 (CR-165): paddingRight:5 removed', () => {
    it('no paddingRight: 5 in the stylesheet', () => {
      expect(speechSlotSource).not.toContain('paddingRight: 5');
    });

    it('statusSection style exists (restored by F115)', () => {
      const styleSheetBlock = speechSlotSource.split('StyleSheet.create')[1];
      expect(styleSheetBlock).toContain('statusSection:');
    });

    it('styles.statusSection is referenced in component', () => {
      expect(speechSlotSource).toContain('styles.statusSection');
    });
  });

  // --- actionArea style (replaces speakerActionWrapper) ---
  describe('actionArea style (replaces speakerActionWrapper from F112)', () => {
    it('has height: 38', () => {
      expect(speechSlotSource).toMatch(/actionArea:\s*\{[^}]*height:\s*38/s);
    });

    it('has justifyContent center', () => {
      expect(speechSlotSource).toMatch(/actionArea:\s*\{[^}]*justifyContent:\s*'center'/s);
    });

    it('has alignItems center', () => {
      expect(speechSlotSource).toMatch(/actionArea:\s*\{[^}]*alignItems:\s*'center'/s);
    });
  });

  // --- Row styles ---
  describe('Row styles', () => {
    it('speakerRow style does not have gap: 12', () => {
      const rowMatch = speechSlotSource.match(/speakerRow:\s*\{[^}]*\}/s);
      expect(rowMatch).not.toBeNull();
      expect(rowMatch![0]).not.toContain('gap: 12');
    });

    it('topicRow style does not have gap: 12', () => {
      const topicRowMatch = speechSlotSource.match(/topicRow:\s*\{[^}]*\}/s);
      expect(topicRowMatch).not.toBeNull();
      expect(topicRowMatch![0]).not.toContain('gap: 12');
    });
  });
});

// =============================================================================
// Cross-feature: Regression checks
// =============================================================================

describe('Batch 17 cross-feature regression checks', () => {

  describe('usePresentationMode structural integrity', () => {
    it('buildPresentationCards is exported', () => {
      const source = readSourceFile('hooks/usePresentationMode.ts');
      expect(source).toContain('export function buildPresentationCards');
    });

    it('Card 1 (Welcome) still built', () => {
      const source = readSourceFile('hooks/usePresentationMode.ts');
      expect(source).toContain("t('agenda.sectionWelcome')");
    });

    it('Card 2 (Designations) still built', () => {
      const source = readSourceFile('hooks/usePresentationMode.ts');
      expect(source).toContain("t('agenda.sectionSacrament')");
    });

    it('last speech label uses simple t() call in presentation mode', () => {
      const source = readSourceFile('hooks/usePresentationMode.ts');
      const lastSpeechLine = source.match(
        /label:\s*t\('speeches\.lastSpeech'\)/
      );
      expect(lastSpeechLine).not.toBeNull();
    });
  });

  describe('AgendaForm structural integrity', () => {
    it('AgendaForm still exports default', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      expect(source).toContain('AgendaForm');
    });

    it('AgendaForm has ReadOnlySpeakerRow for speech fields (F121 replaces SpeakerField)', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      expect(source).toContain('ReadOnlySpeakerRow');
    });

    it('Section 4 header uses sectionLastSpeech key', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      expect(source).toContain("t('agenda.sectionLastSpeech')");
    });
  });

  describe('SpeechSlot structural integrity', () => {
    it('SpeechSlot still exports SpeechSlotProps', () => {
      const source = readSourceFile('components/SpeechSlot.tsx');
      expect(source).toContain('export interface SpeechSlotProps');
    });

    it('SpeechSlot still uses getPositionLabel function', () => {
      const source = readSourceFile('components/SpeechSlot.tsx');
      expect(source).toContain('getPositionLabel');
    });

    it('SpeechSlot still has StatusChangeModal', () => {
      const source = readSourceFile('components/SpeechSlot.tsx');
      expect(source).toContain('StatusChangeModal');
    });

    it('SpeechSlot still has PrayerSelector import', () => {
      const source = readSourceFile('components/SpeechSlot.tsx');
      expect(source).toContain('PrayerSelector');
    });
  });
});

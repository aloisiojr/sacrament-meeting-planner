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

describe('F112 (CR-174): SpeechSlot fixed-width right column alignment', () => {

  const speechSlotSource = readSourceFile('components/SpeechSlot.tsx');

  // --- AC-112-01: StatusLED circle center aligned with X button center ---
  describe('AC-112-01: StatusLED and X button center-to-center alignment', () => {
    it('SpeechSlot has outerRow style (two-column layout)', () => {
      expect(speechSlotSource).toContain('styles.outerRow');
    });

    it('outerRow style has flexDirection row', () => {
      expect(speechSlotSource).toMatch(/outerRow:\s*\{[^}]*flexDirection:\s*'row'/s);
    });

    it('rightColumn has width: 36', () => {
      expect(speechSlotSource).toMatch(/rightColumn:\s*\{[^}]*width:\s*36/s);
    });

    it('rightColumn has alignItems center', () => {
      expect(speechSlotSource).toMatch(/rightColumn:\s*\{[^}]*alignItems:\s*'center'/s);
    });

    it('StatusLED is inside the leftColumn/labelRow (F115 supersedes F112 LED placement)', () => {
      const leftColumnIdx = speechSlotSource.indexOf('styles.leftColumn');
      const rightColumnIdx = speechSlotSource.indexOf('styles.rightColumn');
      const statusLEDIdx = speechSlotSource.indexOf('<StatusLED');
      expect(leftColumnIdx).toBeGreaterThan(-1);
      expect(statusLEDIdx).toBeGreaterThan(leftColumnIdx);
      expect(statusLEDIdx).toBeLessThan(rightColumnIdx);
    });
  });

  // --- AC-112-02: Alignment works for all 3 speech positions ---
  describe('AC-112-02: Consistent alignment across all positions', () => {
    it('SpeechSlot is a single shared component (used for all positions)', () => {
      expect(speechSlotSource).toContain('export const SpeechSlot');
    });

    it('rightColumn style is in StyleSheet.create (static, same for all positions)', () => {
      const styleSheetBlock = speechSlotSource.split('StyleSheet.create')[1];
      expect(styleSheetBlock).toBeDefined();
      expect(styleSheetBlock).toContain('rightColumn:');
    });
  });

  // --- AC-112-03: Topic clear button also aligned ---
  describe('AC-112-03: Topic clear button aligned in same right column', () => {
    it('topicActionWrapper style exists', () => {
      expect(speechSlotSource).toContain('topicActionWrapper');
    });

    it('topicActionWrapper has height: 34', () => {
      expect(speechSlotSource).toMatch(/topicActionWrapper:\s*\{[^}]*height:\s*34/s);
    });

    it('topicActionWrapper has marginTop: 6', () => {
      expect(speechSlotSource).toMatch(/topicActionWrapper:\s*\{[^}]*marginTop:\s*6/s);
    });

    it('topicActionWrapper has alignItems center', () => {
      expect(speechSlotSource).toMatch(/topicActionWrapper:\s*\{[^}]*alignItems:\s*'center'/s);
    });

    it('topic clear button is inside rightColumn (after rightColumn style ref)', () => {
      const rightColumnIdx = speechSlotSource.indexOf('styles.rightColumn');
      const topicActionIdx = speechSlotSource.indexOf('styles.topicActionWrapper');
      expect(topicActionIdx).toBeGreaterThan(rightColumnIdx);
    });
  });

  // --- AC-112-04: Alignment consistent when X is not visible ---
  describe('AC-112-04: Alignment when X button is absent', () => {
    it('rightColumn width is fixed (not dependent on X button visibility)', () => {
      const rightColumnMatch = speechSlotSource.match(
        /rightColumn:\s*\{[^}]*\}/s
      );
      expect(rightColumnMatch).not.toBeNull();
      expect(rightColumnMatch![0]).toContain('width: 36');
      // Width is static, no conditional
      expect(rightColumnMatch![0]).not.toContain('?');
    });

    it('speakerActionWrapper always renders (X button conditional inside)', () => {
      // The View with speakerActionWrapper always renders, X is conditional inside
      expect(speechSlotSource).toContain('styles.speakerActionWrapper');
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

    it('StatusLED is in statusSection Pressable with handleStatusPress (F115 layout)', () => {
      // In F115, StatusLED is inside statusSection in labelRow (leftColumn)
      const statusSectionIdx = speechSlotSource.indexOf('styles.statusSection');
      const statusLEDIdx = speechSlotSource.indexOf('<StatusLED', statusSectionIdx);
      expect(statusSectionIdx).toBeGreaterThan(-1);
      expect(statusLEDIdx).toBeGreaterThan(statusSectionIdx);
    });
  });

  // --- AC-112-06: Layout does not break on narrow screens ---
  describe('AC-112-06: Narrow screen layout', () => {
    it('leftColumn has flex: 1 (shrinks to accommodate rightColumn)', () => {
      expect(speechSlotSource).toMatch(/leftColumn:\s*\{[^}]*flex:\s*1/s);
    });

    it('speaker field text has numberOfLines={1} for truncation', () => {
      expect(speechSlotSource).toContain('numberOfLines={1}');
    });

    it('field style has flex: 1 for responsive width', () => {
      const fieldMatch = speechSlotSource.match(/field:\s*\{[^}]*flex:\s*1/s);
      expect(fieldMatch).not.toBeNull();
    });
  });

  // --- EC-112-01: Observer role (no X button, no status press) ---
  describe('EC-112-01: Observer role alignment', () => {
    it('rightColumn width is static (not dependent on role)', () => {
      const staticStyles = speechSlotSource.split('StyleSheet.create')[1];
      expect(staticStyles).toContain('rightColumn:');
      expect(staticStyles).toContain('width: 36');
    });

    it('LED pressable disabled for observer', () => {
      expect(speechSlotSource).toContain("disabled={isObserver || status === 'not_assigned'}");
    });
  });

  // --- EC-112-02: Secretary role (no X button for assignment, status pressable) ---
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
    it('status text is in leftColumn labelRow (not in fixed-width rightColumn)', () => {
      // Status text is in the labelRow inside leftColumn, so it can expand
      const leftColumnIdx = speechSlotSource.indexOf('styles.leftColumn');
      const rightColumnIdx = speechSlotSource.indexOf('styles.rightColumn');
      const statusTextIdx = speechSlotSource.indexOf('styles.statusText');
      expect(statusTextIdx).toBeGreaterThan(leftColumnIdx);
      expect(statusTextIdx).toBeLessThan(rightColumnIdx);
    });
  });

  // --- EC-112-04: Dark mode ---
  describe('EC-112-04: Dark mode layout unchanged', () => {
    it('layout styles use no color values (colors from theme)', () => {
      const rightColumnMatch = speechSlotSource.match(
        /rightColumn:\s*\{[^}]*\}/s
      );
      expect(rightColumnMatch).not.toBeNull();
      expect(rightColumnMatch![0]).not.toContain('color');
      expect(rightColumnMatch![0]).not.toContain('#');
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

    it('statusSection style exists (restored by F115, superseding F112 removal)', () => {
      const styleSheetBlock = speechSlotSource.split('StyleSheet.create')[1];
      expect(styleSheetBlock).toContain('statusSection:');
    });

    it('styles.statusSection is referenced in component (F115 layout)', () => {
      expect(speechSlotSource).toContain('styles.statusSection');
    });
  });

  // --- speakerActionWrapper style ---
  describe('speakerActionWrapper style', () => {
    it('has height: 38', () => {
      expect(speechSlotSource).toMatch(/speakerActionWrapper:\s*\{[^}]*height:\s*38/s);
    });

    it('has justifyContent center', () => {
      expect(speechSlotSource).toMatch(/speakerActionWrapper:\s*\{[^}]*justifyContent:\s*'center'/s);
    });

    it('has alignItems center', () => {
      expect(speechSlotSource).toMatch(/speakerActionWrapper:\s*\{[^}]*alignItems:\s*'center'/s);
    });
  });

  // --- statusLedPlaceholder style (was statusLedWrapper, updated by F115) ---
  describe('statusLedPlaceholder style (F115 replaces statusLedWrapper)', () => {
    it('has justifyContent center', () => {
      expect(speechSlotSource).toMatch(/statusLedPlaceholder:\s*\{[^}]*justifyContent:\s*'center'/s);
    });

    it('has alignItems center', () => {
      expect(speechSlotSource).toMatch(/statusLedPlaceholder:\s*\{[^}]*alignItems:\s*'center'/s);
    });
  });

  // --- row and topicRow no longer have gap:12 ---
  describe('Row styles updated (gap:12 removed)', () => {
    it('row style does not have gap: 12', () => {
      const rowMatch = speechSlotSource.match(/\brow:\s*\{[^}]*\}/s);
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

    it('AgendaForm still has SpeakerField components', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      expect(source).toContain('SpeakerField');
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

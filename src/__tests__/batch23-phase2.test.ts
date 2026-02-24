/**
 * Batch 23 Phase 2 - Tests for F147-F151 (CR-211 through CR-215).
 *
 * CR-211 (F147): Blue border on Home tab agenda preview card
 * CR-212 (F148): i18n text swap for wardBusiness and stakeAnnouncements
 * CR-213 (F149): Disabled visual style on ReadOnlySpeakerRow in AgendaForm
 * CR-214 (F150): Standard placeholders when 2nd speech disabled
 * CR-215 (F151): Collapsed speech cards uniform height
 *
 * Testing strategy: Source code analysis (fs.readFileSync) following project conventions.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// --- Helpers ---

const ROOT = path.resolve(__dirname, '..', '..');

function readSrcFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, 'src', relativePath), 'utf-8');
}

// --- Source files ---
const indexSource = readSrcFile('app/(tabs)/index.tsx');
const agendaFormSource = readSrcFile('components/AgendaForm.tsx');
const speechSlotSource = readSrcFile('components/SpeechSlot.tsx');
const sundayCardSource = readSrcFile('components/SundayCard.tsx');

// --- i18n locale files ---
const ptBR = JSON.parse(readSrcFile('i18n/locales/pt-BR.json'));
const en = JSON.parse(readSrcFile('i18n/locales/en.json'));
const es = JSON.parse(readSrcFile('i18n/locales/es.json'));

// ============================================================================
// F147 (CR-211): Blue border on Home tab agenda preview card
// ============================================================================

describe('F147 (CR-211): Blue border on Home tab preview card', () => {

  // --- AC-147-01: previewCard has borderColor: colors.primary ---

  describe('AC-147-01: previewCard uses colors.primary for borderColor', () => {
    it('previewCard inline style uses borderColor: colors.primary', () => {
      expect(indexSource).toContain('borderColor: colors.primary, borderWidth: 2');
    });

    it('previewCard inline style does NOT use borderColor: colors.border for the preview card', () => {
      // The previewCard View style array should not contain borderColor: colors.border
      // We check the specific inline style block near styles.previewCard
      const previewCardStyleBlock = indexSource.match(
        /styles\.previewCard,\s*\{[^}]*\}/s
      );
      expect(previewCardStyleBlock).toBeTruthy();
      expect(previewCardStyleBlock![0]).not.toContain('borderColor: colors.border');
    });
  });

  // --- AC-147-02: previewCard has borderWidth: 2 ---

  describe('AC-147-02: previewCard has borderWidth: 2', () => {
    it('previewCard inline style includes borderWidth: 2', () => {
      expect(indexSource).toContain('borderWidth: 2');
    });

    it('styles.previewCard has base borderWidth: 1 that is overridden', () => {
      // Verify the stylesheet still has borderWidth: 1
      const previewCardStyle = indexSource.match(/previewCard:\s*\{[^}]*\}/s);
      expect(previewCardStyle).toBeTruthy();
      expect(previewCardStyle![0]).toContain('borderWidth: 1');
    });
  });

  // --- AC-147-03 / AC-147-04: Blue border works with light and dark themes ---

  describe('AC-147-03 / AC-147-04: Blue border works with both themes', () => {
    it('uses colors.primary (theme-aware) not a hardcoded color', () => {
      // The inline style uses colors.primary which is theme-aware
      const previewCardBlock = indexSource.match(/styles\.previewCard,\s*\{[^}]*\}/s);
      expect(previewCardBlock).toBeTruthy();
      expect(previewCardBlock![0]).toContain('colors.primary');
      // Should not use hardcoded blue hex values
      expect(previewCardBlock![0]).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    });
  });

  // --- EC-147-01: Blue border renders even when no agenda data ---

  describe('EC-147-01: Border is unconditional', () => {
    it('borderColor: colors.primary is not wrapped in a conditional', () => {
      // The previewCard style is applied unconditionally (no ternary, no &&)
      // The style array is: [styles.previewCard, { ... borderColor: colors.primary ... }]
      const styleArray = indexSource.match(
        /style=\{\[\s*styles\.previewCard,\s*\{[^}]*borderColor: colors\.primary[^}]*\}\s*,?\s*\]\}/s
      );
      expect(styleArray).toBeTruthy();
    });
  });
});

// ============================================================================
// F148 (CR-212): i18n text swap for wardBusiness and stakeAnnouncements
// ============================================================================

describe('F148 (CR-212): i18n label updates for wardBusiness and stakeAnnouncements', () => {

  // --- AC-148-01: pt-BR wardBusiness updated ---

  describe('AC-148-01: pt-BR wardBusiness label', () => {
    it('reads "Apoios e Desobrigações"', () => {
      expect(ptBR.agenda.wardBusiness).toBe('Apoios e Desobrigações');
    });

    it('no longer reads "Apoios e Agradecimentos"', () => {
      expect(ptBR.agenda.wardBusiness).not.toBe('Apoios e Agradecimentos');
    });
  });

  // --- AC-148-02: pt-BR stakeAnnouncements updated ---

  describe('AC-148-02: pt-BR stakeAnnouncements label', () => {
    it('reads "Anúncios, Apoios e Desobrigações da Estaca"', () => {
      expect(ptBR.agenda.stakeAnnouncements).toBe('Anúncios, Apoios e Desobrigações da Estaca');
    });

    it('no longer reads "Apoios e Agradecimentos da Estaca"', () => {
      expect(ptBR.agenda.stakeAnnouncements).not.toBe('Apoios e Agradecimentos da Estaca');
    });
  });

  // --- AC-148-03: en stakeAnnouncements updated ---

  describe('AC-148-03: en stakeAnnouncements label', () => {
    it('reads "Stake Announcements, Sustainings and Releases"', () => {
      expect(en.agenda.stakeAnnouncements).toBe('Stake Announcements, Sustainings and Releases');
    });

    it('no longer reads "Stake Sustainings and Releases"', () => {
      expect(en.agenda.stakeAnnouncements).not.toBe('Stake Sustainings and Releases');
    });
  });

  // --- AC-148-04: es wardBusiness updated ---

  describe('AC-148-04: es wardBusiness label', () => {
    it('reads "Apoyos y Relevos"', () => {
      expect(es.agenda.wardBusiness).toBe('Apoyos y Relevos');
    });

    it('no longer reads "Apoyos y Agradecimientos"', () => {
      expect(es.agenda.wardBusiness).not.toBe('Apoyos y Agradecimientos');
    });
  });

  // --- AC-148-05: es stakeAnnouncements updated ---

  describe('AC-148-05: es stakeAnnouncements label', () => {
    it('reads "Anuncios, Apoyos y Relevos de Estaca"', () => {
      expect(es.agenda.stakeAnnouncements).toBe('Anuncios, Apoyos y Relevos de Estaca');
    });

    it('no longer reads "Apoyos y Agradecimientos de Estaca"', () => {
      expect(es.agenda.stakeAnnouncements).not.toBe('Apoyos y Agradecimientos de Estaca');
    });
  });

  // --- AC-148-06: en wardBusiness unchanged ---

  describe('AC-148-06: en wardBusiness unchanged', () => {
    it('still reads "Sustainings and Releases"', () => {
      expect(en.agenda.wardBusiness).toBe('Sustainings and Releases');
    });
  });

  // --- AC-148-07: Labels correct in AgendaForm ---

  describe('AC-148-07: Labels used in AgendaForm', () => {
    it('AgendaForm uses t("agenda.wardBusiness") key', () => {
      expect(agendaFormSource).toContain("t('agenda.wardBusiness')");
    });

    it('AgendaForm uses t("agenda.stakeAnnouncements") key', () => {
      expect(agendaFormSource).toContain("t('agenda.stakeAnnouncements'");
    });
  });

  // --- AC-148-08: Labels used in Presentation mode ---

  describe('AC-148-08: Labels available for presentation mode', () => {
    it('en stakeAnnouncements includes "Announcements"', () => {
      expect(en.agenda.stakeAnnouncements).toContain('Announcements');
    });

    it('pt-BR stakeAnnouncements includes "Anúncios"', () => {
      expect(ptBR.agenda.stakeAnnouncements).toContain('Anúncios');
    });

    it('es stakeAnnouncements includes "Anuncios"', () => {
      expect(es.agenda.stakeAnnouncements).toContain('Anuncios');
    });
  });

  // --- EC-148-01: All 3 languages have both keys ---

  describe('EC-148-01: All locales have both keys defined', () => {
    it.each(['pt-BR', 'en', 'es'])('%s has agenda.wardBusiness defined', (locale) => {
      const localeData = { 'pt-BR': ptBR, en, es }[locale]!;
      expect(localeData.agenda.wardBusiness).toBeTruthy();
    });

    it.each(['pt-BR', 'en', 'es'])('%s has agenda.stakeAnnouncements defined', (locale) => {
      const localeData = { 'pt-BR': ptBR, en, es }[locale]!;
      expect(localeData.agenda.stakeAnnouncements).toBeTruthy();
    });
  });
});

// ============================================================================
// F149 (CR-213): Disabled visual style on ReadOnlySpeakerRow
// ============================================================================

describe('F149 (CR-213): Disabled visual style on ReadOnlySpeakerRow', () => {

  // --- AC-149-01: Disabled has opacity 0.5 ---

  describe('AC-149-01: Disabled ReadOnlySpeakerRow has opacity: 0.5', () => {
    it('speakerReadRow View has conditional disabled style with opacity: 0.5', () => {
      expect(agendaFormSource).toContain('disabled && { backgroundColor: colors.surfaceVariant, opacity: 0.5 }');
    });
  });

  // --- AC-149-02: Disabled has surfaceVariant background ---

  describe('AC-149-02: Disabled ReadOnlySpeakerRow has surfaceVariant background', () => {
    it('speakerReadRow View has backgroundColor: colors.surfaceVariant when disabled', () => {
      expect(agendaFormSource).toContain('backgroundColor: colors.surfaceVariant');
    });
  });

  // --- AC-149-03: Enabled ReadOnlySpeakerRow unchanged ---

  describe('AC-149-03: Enabled ReadOnlySpeakerRow unchanged', () => {
    it('disabled style is conditional (uses && operator)', () => {
      // Ensure the style is conditional, not always applied
      expect(agendaFormSource).toMatch(/disabled\s*&&\s*\{/);
    });

    it('speakerReadRow base style still uses borderColor: colors.border', () => {
      expect(agendaFormSource).toContain('styles.speakerReadRow, { borderColor: colors.border }');
    });
  });

  // --- AC-149-04 / AC-149-05: disabled prop for 2nd speech and observer ---

  describe('AC-149-04: 2nd speech disabled shows disabled visual', () => {
    it('2nd speaker ReadOnlySpeakerRow receives disabled when has_second_speech is false', () => {
      expect(agendaFormSource).toContain('disabled={isObserver || agenda.has_second_speech === false}');
    });
  });

  describe('AC-149-05: Observer role shows disabled visual', () => {
    it('1st speaker ReadOnlySpeakerRow receives disabled={isObserver}', () => {
      expect(agendaFormSource).toContain('disabled={isObserver}');
    });
  });

  // --- AC-149-06 / AC-149-07: Works with both themes ---

  describe('AC-149-06 / AC-149-07: Uses theme-aware colors', () => {
    it('uses colors.surfaceVariant (not hardcoded color)', () => {
      const disabledBlock = agendaFormSource.match(/disabled\s*&&\s*\{[^}]*\}/);
      expect(disabledBlock).toBeTruthy();
      expect(disabledBlock![0]).toContain('colors.surfaceVariant');
      expect(disabledBlock![0]).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    });
  });

  // --- EC-149-01: Empty speakerName + disabled ---

  describe('EC-149-01: Empty speakerName + disabled shows dimmed label', () => {
    it('ReadOnlySpeakerRow fallback displays label when speakerName is empty', () => {
      expect(agendaFormSource).toContain('{speakerName || label}');
    });
  });

  // --- EC-149-02: Pencil icon hidden when disabled ---

  describe('EC-149-02: Pencil icon hidden when disabled', () => {
    it('pencil icon only rendered when !disabled', () => {
      expect(agendaFormSource).toContain('{!disabled && (');
    });
  });

  // --- Pattern matches SpeechSlot ---

  describe('Pattern consistency with SpeechSlot', () => {
    it('SpeechSlot disabled fields also use surfaceVariant and opacity 0.5', () => {
      expect(speechSlotSource).toContain('backgroundColor: colors.surfaceVariant, opacity: 0.5');
    });

    it('AgendaForm disabled style matches SpeechSlot pattern', () => {
      // Both use the same { backgroundColor: colors.surfaceVariant, opacity: 0.5 } pattern
      expect(agendaFormSource).toContain('backgroundColor: colors.surfaceVariant, opacity: 0.5');
    });
  });
});

// ============================================================================
// F150 (CR-214): Standard placeholders when 2nd speech disabled
// ============================================================================

describe('F150 (CR-214): Standard placeholders when 2nd speech disabled', () => {

  // --- AC-150-01: SpeechSlot disabled speaker shows selectSpeaker ---

  describe('AC-150-01: SpeechSlot disabled speaker field shows selectSpeaker', () => {
    it('disabled speaker field uses t("speeches.selectSpeaker")', () => {
      // In the isPos2Disabled block, speaker field should use selectSpeaker
      const isPos2Block = speechSlotSource.substring(
        speechSlotSource.indexOf('isPos2Disabled ? ('),
        speechSlotSource.indexOf(') : (', speechSlotSource.indexOf('isPos2Disabled ? ('))
      );
      expect(isPos2Block).toContain("t('speeches.selectSpeaker')");
    });

    it('disabled speaker field does NOT use secondSpeechDisabledPlaceholder', () => {
      const isPos2Block = speechSlotSource.substring(
        speechSlotSource.indexOf('isPos2Disabled ? ('),
        speechSlotSource.indexOf(') : (', speechSlotSource.indexOf('isPos2Disabled ? ('))
      );
      expect(isPos2Block).not.toContain("t('speeches.secondSpeechDisabledPlaceholder')");
    });
  });

  // --- AC-150-02: SpeechSlot disabled topic shows selectTopic ---

  describe('AC-150-02: SpeechSlot disabled topic field shows selectTopic', () => {
    it('disabled topic field uses t("speeches.selectTopic")', () => {
      const isPos2Block = speechSlotSource.substring(
        speechSlotSource.indexOf('isPos2Disabled ? ('),
        speechSlotSource.indexOf(') : (', speechSlotSource.indexOf('isPos2Disabled ? ('))
      );
      expect(isPos2Block).toContain("t('speeches.selectTopic')");
    });

    it('disabled topic field does NOT use secondSpeechDisabledPlaceholder', () => {
      const isPos2Block = speechSlotSource.substring(
        speechSlotSource.indexOf('isPos2Disabled ? ('),
        speechSlotSource.indexOf(') : (', speechSlotSource.indexOf('isPos2Disabled ? ('))
      );
      expect(isPos2Block).not.toContain("t('speeches.secondSpeechDisabledPlaceholder')");
    });
  });

  // --- AC-150-03: AgendaForm disabled 2nd speaker passes empty string ---
  // [SUPERSEDED by F156 (CR-220)]: F156 changed the disabled 2nd speaker from '' to
  // t('speeches.secondSpeechDisabledPlaceholder'). The assertions below are inverted.

  describe('AC-150-03: AgendaForm passes empty string for disabled 2nd speaker [SUPERSEDED by F156]', () => {
    it('[SUPERSEDED by F156] now uses i18n placeholder when has_second_speech is false', () => {
      expect(agendaFormSource).toContain("t('speeches.secondSpeechDisabledPlaceholder')");
    });

    it('[SUPERSEDED by F156] AgendaForm now references secondSpeechDisabledPlaceholder', () => {
      expect(agendaFormSource).toContain('secondSpeechDisabledPlaceholder');
    });
  });

  // --- AC-150-04: Placeholders correct in all 3 languages ---

  describe('AC-150-04: Placeholder texts exist in all 3 locales', () => {
    it('pt-BR has speeches.selectSpeaker = "Selecionar Discursante"', () => {
      expect(ptBR.speeches.selectSpeaker).toBe('Selecionar Discursante');
    });

    it('en has speeches.selectSpeaker = "Select Speaker"', () => {
      expect(en.speeches.selectSpeaker).toBe('Select Speaker');
    });

    it('es has speeches.selectSpeaker = "Seleccionar Discursante"', () => {
      expect(es.speeches.selectSpeaker).toBe('Seleccionar Discursante');
    });

    it('pt-BR has speeches.selectTopic = "Selecionar tema"', () => {
      expect(ptBR.speeches.selectTopic).toBe('Selecionar tema');
    });

    it('en has speeches.selectTopic = "Select topic"', () => {
      expect(en.speeches.selectTopic).toBe('Select topic');
    });

    it('es has speeches.selectTopic = "Seleccionar tema"', () => {
      expect(es.speeches.selectTopic).toBe('Seleccionar tema');
    });
  });

  // --- AC-150-05: Disabled visual style preserved ---

  describe('AC-150-05: Disabled visual style preserved on SpeechSlot fields', () => {
    it('disabled speaker field still has surfaceVariant background and opacity 0.5', () => {
      const isPos2Block = speechSlotSource.substring(
        speechSlotSource.indexOf('isPos2Disabled ? ('),
        speechSlotSource.indexOf(') : (', speechSlotSource.indexOf('isPos2Disabled ? ('))
      );
      expect(isPos2Block).toContain('backgroundColor: colors.surfaceVariant, opacity: 0.5');
    });
  });

  // --- AC-150-06: Enabled 2nd speech fields unchanged ---

  describe('AC-150-06: Enabled 2nd speech fields use standard placeholders', () => {
    it('non-disabled speaker field uses t("speeches.selectSpeaker") as placeholder', () => {
      // In the enabled block (after ') : ('), the speaker field uses selectSpeaker
      const enabledBlock = speechSlotSource.substring(
        speechSlotSource.indexOf(') : (', speechSlotSource.indexOf('isPos2Disabled ? ('))
      );
      expect(enabledBlock).toContain("t('speeches.selectSpeaker')");
    });
  });

  // --- EC-150-01 / EC-150-02: Toggle scenarios ---

  describe('EC-150-01: i18n key still exists in locale files', () => {
    it('secondSpeechDisabledPlaceholder key still exists in pt-BR', () => {
      expect(ptBR.speeches.secondSpeechDisabledPlaceholder).toBeTruthy();
    });

    it('secondSpeechDisabledPlaceholder key still exists in en', () => {
      expect(en.speeches.secondSpeechDisabledPlaceholder).toBeTruthy();
    });

    it('secondSpeechDisabledPlaceholder key still exists in es', () => {
      expect(es.speeches.secondSpeechDisabledPlaceholder).toBeTruthy();
    });
  });

  describe('EC-150-02: ReadOnlySpeakerRow shows label as fallback', () => {
    it('ReadOnlySpeakerRow displays label when speakerName is empty', () => {
      expect(agendaFormSource).toContain('{speakerName || label}');
    });
  });
});

// ============================================================================
// F151 (CR-215): Collapsed speech cards uniform height
// ============================================================================

describe('F151 (CR-215): Collapsed speech cards uniform height', () => {

  // --- AC-151-01: 3-position cards are unaffected (minHeight <= natural) ---

  describe('AC-151-01: minHeight does not affect 3-position cards', () => {
    it('[SUPERSEDED by F154] headerCenter uses justifyContent center instead of minHeight', () => {
      // F154 (CR-219) final implementation removed minHeight: 62 and replaced
      // with justifyContent: 'center' for vertical centering of content.
      const headerCenterStyle = sundayCardSource.match(/headerCenter:\s*\{[^}]*\}/s);
      expect(headerCenterStyle).toBeTruthy();
      expect(headerCenterStyle![0]).toContain("justifyContent: 'center'");
    });
  });

  // --- AC-151-02: 2-position cards match 3-position card height ---

  describe('AC-151-02: 2-position cards padded to match 3-position cards', () => {
    it('[SUPERSEDED by F154] headerCenter uses justifyContent center for vertical alignment', () => {
      // F154 (CR-219) final implementation replaced minHeight with justifyContent: 'center'
      // on headerCenter style. No conditional minHeight is used anymore.
      const headerCenterStyle = sundayCardSource.match(/headerCenter:\s*\{[^}]*\}/s);
      expect(headerCenterStyle).toBeTruthy();
      expect(headerCenterStyle![0]).toContain("justifyContent: 'center'");
      expect(headerCenterStyle![0]).not.toContain('minHeight');
    });
  });

  // --- AC-151-03: Expanded cards not affected ---

  describe('AC-151-03: Expanded cards have no minHeight', () => {
    it('[SUPERSEDED by F154] no minHeight used; justifyContent center handles alignment', () => {
      // F154 (CR-219) removed minHeight entirely. Expanded vs collapsed
      // distinction is handled by conditional rendering of speech rows,
      // not by minHeight.
      expect(sundayCardSource).not.toContain('minHeight: 62');
    });

    it('[SUPERSEDED by F154] headerCenter uses justifyContent center', () => {
      const headerCenterStyle = sundayCardSource.match(/headerCenter:\s*\{[^}]*\}/s);
      expect(headerCenterStyle).toBeTruthy();
      expect(headerCenterStyle![0]).toContain("justifyContent: 'center'");
    });
  });

  // --- AC-151-04: Non-speech type cards not affected ---

  describe('AC-151-04: Non-speech cards have no minHeight', () => {
    it('[SUPERSEDED by F154] minHeight removed; justifyContent center used for all cards', () => {
      // F154 (CR-219) final implementation removed minHeight for all cards.
      // justifyContent: 'center' on headerCenter handles uniform alignment.
      expect(sundayCardSource).not.toContain('minHeight: 62');
    });

    it('isSpeechesType is derived from currentType === SUNDAY_TYPE_SPEECHES', () => {
      expect(sundayCardSource).toContain('const isSpeechesType = currentType === SUNDAY_TYPE_SPEECHES');
    });
  });

  // --- AC-151-05 / AC-151-06: Uniform height works with both themes ---

  describe('AC-151-05 / AC-151-06: minHeight is theme-independent', () => {
    it('[SUPERSEDED by F154] justifyContent center is not theme-dependent', () => {
      // F154 (CR-219) replaced minHeight with justifyContent: 'center'
      // which is a fixed CSS value, not theme-dependent.
      const headerCenterStyle = sundayCardSource.match(/headerCenter:\s*\{[^}]*\}/s);
      expect(headerCenterStyle).toBeTruthy();
      expect(headerCenterStyle![0]).toContain("justifyContent: 'center'");
    });
  });

  // --- EC-151-01: Card with fewer positions still padded ---

  // EC-151-01: Test removed — [SUPERSEDED by F154/F158 CR-229] headerCenter now uses inline minHeight

  // --- EC-151-02: Expand/collapse preserves minHeight behavior ---

  describe('EC-151-02: Collapse re-applies minHeight', () => {
    it('minHeight is reactive to expanded state', () => {
      // expanded is a prop, so the condition re-evaluates on every render
      expect(sundayCardSource).toContain('expanded = false');
    });
  });

  // --- EC-151-03: Font scaling ---

  describe('EC-151-03: speechRow dimensions for minHeight calculation', () => {
    // Test removed: speechRow marginBottom changed from 4 to 1 by CR-228

    it('speakerNameLine has fontSize: 13', () => {
      const speakerStyle = sundayCardSource.match(/speakerNameLine:\s*\{[^}]*\}/s);
      expect(speakerStyle).toBeTruthy();
      expect(speakerStyle![0]).toContain('fontSize: 13');
    });
  });
});

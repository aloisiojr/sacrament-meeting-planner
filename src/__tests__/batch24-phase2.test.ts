/**
 * Batch 24 Phase 2 - Tests for F155, F156 (CR-218, CR-220).
 *
 * CR-218 (F155): Light theme bluish contrast improvement (Tailwind Slate palette)
 * CR-220 (F156): Speaker fields rework in agenda editing card (italic + textSecondary)
 *
 * Testing strategy: Source code analysis (fs.readFileSync) + direct import for theme values.
 * Following project conventions from batch23-phase2.test.ts and batch24-phase1.test.ts.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { lightColors, darkColors } from '../lib/theme';

// --- Helpers ---

const ROOT = path.resolve(__dirname, '..', '..');

function readSrcFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, 'src', relativePath), 'utf-8');
}

/**
 * Calculate relative luminance of a hex color per WCAG 2.0.
 */
function relativeLuminance(hex: string): number {
  const rgb = hex
    .replace('#', '')
    .match(/.{2}/g)!
    .map((c) => {
      const sRGB = parseInt(c, 16) / 255;
      return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/**
 * Calculate contrast ratio between two hex colors per WCAG 2.0.
 */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// --- Source files ---
const agendaFormSource = readSrcFile('components/AgendaForm.tsx');
const speechSlotSource = readSrcFile('components/SpeechSlot.tsx');

// --- i18n locale files ---
const ptBR = JSON.parse(readSrcFile('i18n/locales/pt-BR.json'));
const en = JSON.parse(readSrcFile('i18n/locales/en.json'));
const es = JSON.parse(readSrcFile('i18n/locales/es.json'));

// ============================================================================
// F155 (CR-218): Light theme bluish contrast improvement
// ============================================================================

describe('F155 (CR-218): Light theme Tailwind Slate palette', () => {

  // --- AC-155-01: Cards have visible contrast against page background ---

  describe('AC-155-01: Card vs background contrast', () => {
    it('lightColors.card (#FFFFFF) differs from lightColors.background (#F1F5F9)', () => {
      expect(lightColors.card).not.toBe(lightColors.background);
    });

    it('card is #FFFFFF and background is #F1F5F9', () => {
      expect(lightColors.card).toBe('#FFFFFF');
      expect(lightColors.background).toBe('#F1F5F9');
    });
  });

  // --- AC-155-02: Background uses Slate-100 ---

  describe('AC-155-02: Background is Slate-100', () => {
    it('lightColors.background is #F1F5F9 (Slate-100)', () => {
      expect(lightColors.background).toBe('#F1F5F9');
    });
  });

  // --- AC-155-03: Surface tokens use Slate palette ---

  describe('AC-155-03: Surface and surfaceVariant use Slate palette', () => {
    it('lightColors.surface is #E2E8F0 (Slate-200)', () => {
      expect(lightColors.surface).toBe('#E2E8F0');
    });

    it('lightColors.surfaceVariant is #CBD5E1 (Slate-300)', () => {
      expect(lightColors.surfaceVariant).toBe('#CBD5E1');
    });
  });

  // --- AC-155-04: Borders and dividers use Slate tones ---

  describe('AC-155-04: Border and divider use Slate palette', () => {
    it('lightColors.border is #94A3B8 (Slate-400)', () => {
      expect(lightColors.border).toBe('#94A3B8');
    });

    it('lightColors.divider is #CBD5E1 (Slate-300)', () => {
      expect(lightColors.divider).toBe('#CBD5E1');
    });
  });

  // --- AC-155-05: Toggle switch off-state uses bluish color ---

  describe('AC-155-05: Toggle track uses colors.border (now bluish Slate-400)', () => {
    it('lightColors.border is #94A3B8 (Slate-400, used as Switch trackColor false)', () => {
      expect(lightColors.border).toBe('#94A3B8');
    });
  });

  // --- AC-155-06: Tab bar matches background ---

  describe('AC-155-06: Tab bar colors', () => {
    it('lightColors.tabBar is #F1F5F9 (matches background)', () => {
      expect(lightColors.tabBar).toBe('#F1F5F9');
    });

    it('lightColors.tabBarInactive is #64748B (Slate-500)', () => {
      expect(lightColors.tabBarInactive).toBe('#64748B');
    });
  });

  // --- AC-155-07: Input fields use bluish background and border ---

  describe('AC-155-07: Input field colors', () => {
    it('lightColors.inputBackground is #F8FAFC (Slate-50)', () => {
      expect(lightColors.inputBackground).toBe('#F8FAFC');
    });

    it('lightColors.inputBorder is #94A3B8 (Slate-400)', () => {
      expect(lightColors.inputBorder).toBe('#94A3B8');
    });
  });

  // --- AC-155-08: Text contrast ratios maintain WCAG AA ---

  describe('AC-155-08: WCAG AA contrast ratios', () => {
    it('text (#1A1A1A) on background (#F1F5F9) ratio >= 4.5:1', () => {
      const ratio = contrastRatio(lightColors.text, lightColors.background);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('textSecondary (#5A5A5A) on background (#F1F5F9) ratio >= 4.5:1', () => {
      const ratio = contrastRatio(lightColors.textSecondary, lightColors.background);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('textTertiary (#8A8A8A) on card (#FFFFFF) ratio >= 3:1 (large text)', () => {
      const ratio = contrastRatio(lightColors.textTertiary, lightColors.card);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });

    it('textSecondary (#5A5A5A) on card (#FFFFFF) ratio >= 4.5:1', () => {
      const ratio = contrastRatio(lightColors.textSecondary, lightColors.card);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  // --- AC-155-09: Dark theme completely unchanged ---

  describe('AC-155-09: Dark theme unchanged', () => {
    it('darkColors.background is #0F172A', () => {
      expect(darkColors.background).toBe('#0F172A');
    });

    it('darkColors.surface is #1E293B', () => {
      expect(darkColors.surface).toBe('#1E293B');
    });

    it('darkColors.surfaceVariant is #334155', () => {
      expect(darkColors.surfaceVariant).toBe('#334155');
    });

    it('darkColors.card is #1E293B', () => {
      expect(darkColors.card).toBe('#1E293B');
    });

    it('darkColors.text is #F1F5F9', () => {
      expect(darkColors.text).toBe('#F1F5F9');
    });

    it('darkColors.textSecondary is #94A3B8', () => {
      expect(darkColors.textSecondary).toBe('#94A3B8');
    });

    it('darkColors.textTertiary is #64748B', () => {
      expect(darkColors.textTertiary).toBe('#64748B');
    });

    it('darkColors.border is #475569', () => {
      expect(darkColors.border).toBe('#475569');
    });

    it('darkColors.divider is #334155', () => {
      expect(darkColors.divider).toBe('#334155');
    });

    it('darkColors.primary is #60A5FA', () => {
      expect(darkColors.primary).toBe('#60A5FA');
    });

    it('darkColors.tabBar is #1E293B', () => {
      expect(darkColors.tabBar).toBe('#1E293B');
    });

    it('darkColors.tabBarInactive is #64748B', () => {
      expect(darkColors.tabBarInactive).toBe('#64748B');
    });

    it('darkColors.inputBackground is #1E293B', () => {
      expect(darkColors.inputBackground).toBe('#1E293B');
    });

    it('darkColors.inputBorder is #475569', () => {
      expect(darkColors.inputBorder).toBe('#475569');
    });

    it('darkColors.placeholder is #64748B', () => {
      expect(darkColors.placeholder).toBe('#64748B');
    });
  });

  // --- AC-155-10: Card color remains white ---

  describe('AC-155-10: Card remains #FFFFFF', () => {
    it('lightColors.card is #FFFFFF (unchanged)', () => {
      expect(lightColors.card).toBe('#FFFFFF');
    });
  });

  // --- AC-155-11: Primary and status colors unchanged ---

  describe('AC-155-11: Primary and status colors unchanged', () => {
    it('lightColors.primary is #2563EB', () => {
      expect(lightColors.primary).toBe('#2563EB');
    });

    it('lightColors.primaryContainer is #DBEAFE', () => {
      expect(lightColors.primaryContainer).toBe('#DBEAFE');
    });

    it('lightColors.onPrimary is #FFFFFF', () => {
      expect(lightColors.onPrimary).toBe('#FFFFFF');
    });

    it('lightColors.error is #DC2626', () => {
      expect(lightColors.error).toBe('#DC2626');
    });

    it('lightColors.errorContainer is #FEE2E2', () => {
      expect(lightColors.errorContainer).toBe('#FEE2E2');
    });

    it('lightColors.success is #16A34A', () => {
      expect(lightColors.success).toBe('#16A34A');
    });

    it('lightColors.warning is #D97706', () => {
      expect(lightColors.warning).toBe('#D97706');
    });
  });

  // --- Text colors unchanged ---

  describe('Text colors unchanged', () => {
    it('lightColors.text is #1A1A1A (unchanged)', () => {
      expect(lightColors.text).toBe('#1A1A1A');
    });

    it('lightColors.textSecondary is #5A5A5A (unchanged)', () => {
      expect(lightColors.textSecondary).toBe('#5A5A5A');
    });

    it('lightColors.textTertiary is #8A8A8A (unchanged)', () => {
      expect(lightColors.textTertiary).toBe('#8A8A8A');
    });
  });

  // --- Placeholder color ---

  describe('Placeholder color', () => {
    it('lightColors.placeholder is #94A3B8 (Slate-400)', () => {
      expect(lightColors.placeholder).toBe('#94A3B8');
    });
  });

  // --- EC-155-01: Disabled fields using surfaceVariant ---

  describe('EC-155-01: Disabled fields surfaceVariant more distinct', () => {
    it('surfaceVariant (#CBD5E1) is different from card (#FFFFFF)', () => {
      expect(lightColors.surfaceVariant).not.toBe(lightColors.card);
    });
  });

  // --- EC-155-02: Placeholder on input background ---

  describe('EC-155-02: Placeholder text contrast on inputBackground', () => {
    it('placeholder on inputBackground has adequate contrast', () => {
      const ratio = contrastRatio(lightColors.placeholder, lightColors.inputBackground);
      // Placeholder is decorative, 2:1 is adequate
      expect(ratio).toBeGreaterThanOrEqual(2);
    });
  });

  // --- EC-155-03: Theme toggle ---

  describe('EC-155-03: Both themes have different palettes', () => {
    it('light background differs from dark background', () => {
      expect(lightColors.background).not.toBe(darkColors.background);
    });

    it('light card differs from dark card', () => {
      expect(lightColors.card).not.toBe(darkColors.card);
    });
  });
});

// ============================================================================
// F156 (CR-220): Speaker fields rework in agenda editing card
// ============================================================================

describe('F156 (CR-220): Speaker fields rework', () => {

  // --- AC-156-01: Speaker names in ReadOnlySpeakerRow are italic ---

  describe('AC-156-01: Speaker names are italic when present', () => {
    it('ReadOnlySpeakerRow has fontStyle italic conditional on speakerName', () => {
      expect(agendaFormSource).toContain("speakerName ? { fontStyle: 'italic' } : undefined");
    });
  });

  // --- AC-156-02: Speaker names use textSecondary ---

  describe('AC-156-02: Speaker names use textSecondary color', () => {
    it('ReadOnlySpeakerRow text color is textSecondary when speakerName present', () => {
      expect(agendaFormSource).toContain('color: speakerName ? colors.textSecondary : colors.textTertiary');
    });
  });

  // --- AC-156-03: Empty speaker placeholder keeps textTertiary ---

  describe('AC-156-03: Empty speaker placeholder uses textTertiary', () => {
    it('color falls back to textTertiary when speakerName is falsy', () => {
      expect(agendaFormSource).toContain('speakerName ? colors.textSecondary : colors.textTertiary');
    });

    it('fontStyle is undefined (no italic) when speakerName is falsy', () => {
      expect(agendaFormSource).toContain("speakerName ? { fontStyle: 'italic' } : undefined");
    });
  });

  // --- AC-156-04: 2nd speech disabled shows specific placeholder message ---

  describe('AC-156-04: 2nd speech disabled shows i18n placeholder', () => {
    it('2nd speaker speakerName uses t(speeches.secondSpeechDisabledPlaceholder) when disabled', () => {
      expect(agendaFormSource).toContain("t('speeches.secondSpeechDisabledPlaceholder')");
    });

    it('the disabled placeholder is used when has_second_speech === false', () => {
      // Verify the pattern: has_second_speech === false ? t('...') : ...
      const idx = agendaFormSource.indexOf("agenda.has_second_speech === false");
      expect(idx).toBeGreaterThan(-1);
      const snippet = agendaFormSource.substring(idx, idx + 200);
      expect(snippet).toContain("t('speeches.secondSpeechDisabledPlaceholder')");
    });
  });

  // --- AC-156-05: pt-BR uses 'ajustado' ---

  describe('AC-156-05: pt-BR secondSpeechDisabledPlaceholder uses ajustado', () => {
    it('pt-BR contains ajustado not configurado', () => {
      expect(ptBR.speeches.secondSpeechDisabledPlaceholder).toContain('ajustado');
      expect(ptBR.speeches.secondSpeechDisabledPlaceholder).not.toContain('configurado');
    });

    it('pt-BR full text is correct', () => {
      expect(ptBR.speeches.secondSpeechDisabledPlaceholder).toBe(
        'Domingo ajustado para n\u00e3o ter 2\u00ba discurso'
      );
    });
  });

  // --- AC-156-06: en uses 'adjusted' ---

  describe('AC-156-06: en secondSpeechDisabledPlaceholder uses adjusted', () => {
    it('en contains adjusted not configured', () => {
      expect(en.speeches.secondSpeechDisabledPlaceholder).toContain('adjusted');
      expect(en.speeches.secondSpeechDisabledPlaceholder).not.toContain('configured');
    });

    it('en full text is correct', () => {
      expect(en.speeches.secondSpeechDisabledPlaceholder).toBe(
        'Sunday adjusted to have no 2nd speech'
      );
    });
  });

  // --- AC-156-07: es uses 'ajustado' ---

  describe('AC-156-07: es secondSpeechDisabledPlaceholder uses ajustado', () => {
    it('es contains ajustado not configurado', () => {
      expect(es.speeches.secondSpeechDisabledPlaceholder).toContain('ajustado');
      expect(es.speeches.secondSpeechDisabledPlaceholder).not.toContain('configurado');
    });

    it('es full text is correct', () => {
      expect(es.speeches.secondSpeechDisabledPlaceholder).toBe(
        'Domingo ajustado para no tener 2\u00ba discurso'
      );
    });
  });

  // --- AC-156-08: Disabled visual from F149 preserved ---

  describe('AC-156-08: Disabled row visual preserved (opacity + surfaceVariant)', () => {
    it('ReadOnlySpeakerRow still applies opacity: 0.5 when disabled', () => {
      expect(agendaFormSource).toContain('disabled && { backgroundColor: colors.surfaceVariant, opacity: 0.5 }');
    });
  });

  // --- AC-156-09: SpeechSlot.tsx is NOT modified ---

  describe('AC-156-09: SpeechSlot.tsx not modified', () => {
    it('SpeechSlot does NOT contain fontStyle italic', () => {
      expect(speechSlotSource).not.toContain("fontStyle: 'italic'");
    });

    it('SpeechSlot does NOT reference textSecondary for speaker name color', () => {
      // SpeechSlot should not have the same color pattern as the new ReadOnlySpeakerRow
      expect(speechSlotSource).not.toContain('speakerName ? colors.textSecondary');
    });
  });

  // --- AC-156-10: Italic + textSecondary works with light theme ---

  describe('AC-156-10: Light theme textSecondary contrast on card', () => {
    it('textSecondary on card has contrast >= 4.5:1', () => {
      const ratio = contrastRatio(lightColors.textSecondary, lightColors.card);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  // --- AC-156-11: Italic + textSecondary works with dark theme ---

  describe('AC-156-11: Dark theme textSecondary contrast on card', () => {
    it('dark textSecondary on dark card has adequate contrast', () => {
      const ratio = contrastRatio(darkColors.textSecondary, darkColors.card);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });
  });

  // --- AC-156-12: 3rd/last speaker also gets italic + textSecondary ---

  describe('AC-156-12: All 3 speaker positions use ReadOnlySpeakerRow', () => {
    it('AgendaForm has 3 ReadOnlySpeakerRow instances', () => {
      const matches = agendaFormSource.match(/<ReadOnlySpeakerRow/g);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBe(3);
    });

    it('the shared ReadOnlySpeakerRow function has the italic + textSecondary styling', () => {
      // The function definition should contain both styling changes
      const funcDef = agendaFormSource.substring(
        agendaFormSource.indexOf('function ReadOnlySpeakerRow('),
        agendaFormSource.indexOf('}', agendaFormSource.indexOf("speakerName || label}")) + 1
      );
      expect(funcDef).toContain('colors.textSecondary');
      expect(funcDef).toContain("fontStyle: 'italic'");
    });
  });

  // --- EC-156-01: 2nd speech disabled with disabled placeholder text ---

  describe('EC-156-01: Disabled placeholder gets italic + textSecondary styling', () => {
    it('disabled placeholder is passed as non-empty speakerName (truthy)', () => {
      // When has_second_speech === false, speakerName is t('...') which is truthy
      // So it will get italic + textSecondary styling from ReadOnlySpeakerRow
      const idx = agendaFormSource.indexOf("agenda.has_second_speech === false");
      const snippet = agendaFormSource.substring(idx, idx + 200);
      expect(snippet).toContain("t('speeches.secondSpeechDisabledPlaceholder')");
      // The ternary false-branch uses t('...') not bare ''
      // Extract just the ? ... : part (the false-branch value)
      const questionMark = snippet.indexOf('?');
      const colon = snippet.indexOf(':', questionMark + 1);
      const falseBranch = snippet.substring(questionMark, colon);
      expect(falseBranch).toContain('secondSpeechDisabledPlaceholder');
    });
  });

  // --- EC-156-02: Observer sees disabled rows ---

  describe('EC-156-02: Observer disabled state', () => {
    it('ReadOnlySpeakerRow has disabled prop', () => {
      expect(agendaFormSource).toContain('disabled={isObserver');
    });
  });

  // --- EC-156-03: numberOfLines={1} for truncation ---

  describe('EC-156-03: Text truncation with numberOfLines', () => {
    it('ReadOnlySpeakerRow text has numberOfLines={1}', () => {
      const funcDef = agendaFormSource.substring(
        agendaFormSource.indexOf('function ReadOnlySpeakerRow('),
        agendaFormSource.indexOf('}', agendaFormSource.indexOf("speakerName || label}")) + 1
      );
      expect(funcDef).toContain('numberOfLines={1}');
    });
  });

  // --- EC-156-04: Placeholder text truncation ---

  describe('EC-156-04: Placeholder text works with truncation', () => {
    it('secondSpeechDisabledPlaceholder key exists and is non-empty in all locales', () => {
      expect(ptBR.speeches.secondSpeechDisabledPlaceholder).toBeTruthy();
      expect(en.speeches.secondSpeechDisabledPlaceholder).toBeTruthy();
      expect(es.speeches.secondSpeechDisabledPlaceholder).toBeTruthy();
    });
  });

  // --- Superseded assertions from batch23-phase2 (F150) ---

  describe('Superseded: F150 AC-150-03 assertion updated by F156', () => {
    it('[SUPERSEDED by F156] AgendaForm now DOES use secondSpeechDisabledPlaceholder', () => {
      // F150 (batch23-phase2.test.ts) asserted AgendaForm should NOT contain
      // secondSpeechDisabledPlaceholder. F156 reverses this: now it DOES use it.
      expect(agendaFormSource).toContain('secondSpeechDisabledPlaceholder');
    });

    it('[SUPERSEDED by F156] AgendaForm does NOT pass empty string for disabled 2nd speech', () => {
      // F150 asserted "? ''" pattern. F156 replaces '' with the i18n placeholder.
      const idx = agendaFormSource.indexOf("agenda.has_second_speech === false");
      const snippet = agendaFormSource.substring(idx, idx + 200);
      // The ternary false-branch now uses t('...') instead of ''
      const questionMark = snippet.indexOf('?');
      const colon = snippet.indexOf(':', questionMark + 1);
      const falseBranch = snippet.substring(questionMark, colon);
      expect(falseBranch).toContain('secondSpeechDisabledPlaceholder');
      expect(falseBranch).not.toMatch(/^\?\s*''/);
    });
  });
});

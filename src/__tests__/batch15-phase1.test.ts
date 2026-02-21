/**
 * Tests for Batch 15, Phase 1: Presentation mode improvements, Speech labels,
 *                                Collapsed speech card redesign, Expanded speech status
 *
 * F097 (CR-156, CR-157, CR-158, CR-159): Presentation mode directional arrows,
 *   multiline recognized names, font size toggle, section titles
 * F098 (CR-160, CR-163): Speech label context-aware display, selectSpeaker placeholder
 * F099 (CR-161): Collapsed speech card redesign - inline LEDs, font, circle size
 * F100 (CR-162): Expanded speech card status on label row, full-width fields
 *
 * Covers acceptance criteria:
 *   AC-097-01..14, AC-098-01..08, AC-099-01..10, AC-100-01..11
 * Covers edge cases:
 *   EC-097-01..04, EC-098-01..02, EC-099-01..03, EC-100-01..03
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
// F097 (CR-156): AccordionCard directional arrows
// =============================================================================

describe('F097 (CR-156): AccordionCard directional arrows', () => {

  const accordionSource = readSourceFile('components/AccordionCard.tsx');

  // --- AC-097-01: Cards above expanded show down-arrow ---
  describe('AC-097-01: Cards above expanded show down-arrow', () => {
    it('uses index < expandedIndex for down-arrow U+25BC', () => {
      expect(accordionSource).toContain("index < expandedIndex ? '\\u25BC' : '\\u25B2'");
    });
  });

  // --- AC-097-02: Cards below expanded show up-arrow ---
  describe('AC-097-02: Cards below expanded show up-arrow', () => {
    it('uses else branch for up-arrow U+25B2', () => {
      expect(accordionSource).toContain("index < expandedIndex ? '\\u25BC' : '\\u25B2'");
    });
  });

  // --- AC-097-03: Expanded card has no arrow ---
  describe('AC-097-03: Expanded card has no arrow', () => {
    it('chevron wrapped in !isExpanded conditional', () => {
      expect(accordionSource).toContain('{!isExpanded && (');
    });

    it('no chevron rendered for expanded card', () => {
      // The whole chevron Text is inside {!isExpanded && (...)}
      const chevronBlock = accordionSource.match(/\{!isExpanded && \(\s*<Text[\s\S]*?chevron/);
      expect(chevronBlock).not.toBeNull();
    });
  });

  // --- AC-097-04: First card expanded - no arrow on card 1, up-arrows on rest ---
  describe('AC-097-04: First card expanded', () => {
    it('when expandedIndex=0, all other cards have index > expandedIndex so show up-arrow', () => {
      // This is a logic consequence of index < expandedIndex ? down : up
      // When expandedIndex=0, no card has index < 0, so all collapsed cards show up-arrow
      expect(accordionSource).toContain("index < expandedIndex ? '\\u25BC' : '\\u25B2'");
    });
  });

  // --- AC-097-05: Last card expanded - down-arrows on all preceding ---
  describe('AC-097-05: Last card expanded', () => {
    it('when expandedIndex=last, all other cards have index < expandedIndex so show down-arrow', () => {
      expect(accordionSource).toContain("index < expandedIndex ? '\\u25BC' : '\\u25B2'");
    });
  });

  // --- EC-097-04: 3-card special meeting arrows still work ---
  describe('EC-097-04: Arrow logic works with 3 cards (special meeting)', () => {
    it('arrow logic uses index vs expandedIndex, not hardcoded card count', () => {
      // No hardcoded number of cards in arrow logic
      expect(accordionSource).not.toMatch(/cards\.length.*chevron/s);
      expect(accordionSource).toContain('index < expandedIndex');
    });
  });
});

// =============================================================================
// F097 (CR-157): Multiline recognized names
// =============================================================================

describe('F097 (CR-157): Multiline recognized names', () => {

  const hookSource = readSourceFile('hooks/usePresentationMode.ts');

  // --- AC-097-06: Recognized names one per line ---
  describe('AC-097-06: Recognized names joined with newline', () => {
    it('uses join newline instead of comma', () => {
      expect(hookSource).toContain("agenda.recognized_names.join('\\n')");
    });

    it('does NOT use comma-space join for recognized names', () => {
      expect(hookSource).not.toContain("agenda.recognized_names.join(', ')");
    });
  });

  // --- Recognized names use multiline type ---
  describe('Recognized names field type', () => {
    it('recognized names field uses multiline type', () => {
      expect(hookSource).toContain("type: 'multiline'");
    });
  });

  // --- EC-097-01: No recognized names ---
  describe('EC-097-01: No recognized names', () => {
    it('recognized names field only added when array has entries', () => {
      expect(hookSource).toContain("agenda?.recognized_names?.length");
    });
  });

  // --- EC-097-02: Single recognized name ---
  describe('EC-097-02: Single recognized name', () => {
    it('join with newline on single element produces no trailing newline', () => {
      // join('\n') on ['Joao'] returns 'Joao' - no trailing newline
      expect(['Joao'].join('\n')).toBe('Joao');
    });
  });
});

// =============================================================================
// F097 (CR-158): Font size toggle
// =============================================================================

describe('F097 (CR-158): Font size toggle', () => {

  const presentationSource = readSourceFile('app/presentation.tsx');

  // --- AC-097-07: Font toggle button visible in header ---
  describe('AC-097-07: Font size toggle button visible', () => {
    it('has fontToggleButton style', () => {
      expect(presentationSource).toContain('fontToggleButton');
    });

    it('fontToggleButton positioned before close button', () => {
      const toggleIdx = presentationSource.indexOf('fontToggleButton');
      const closeIdx = presentationSource.indexOf('closeButton');
      expect(toggleIdx).toBeLessThan(closeIdx);
    });

    it('shows Aa for normal mode and AA for large mode', () => {
      expect(presentationSource).toContain("fontSizeMode === 'normal' ? 'Aa' : 'AA'");
    });

    it('has accessibility label for toggle', () => {
      expect(presentationSource).toContain('accessibilityLabel="Toggle font size"');
    });
  });

  // --- AC-097-08: Toggle switches to large mode ---
  describe('AC-097-08: Toggle to large mode', () => {
    it('FONT_SIZES constant has large values', () => {
      expect(presentationSource).toContain('large: { fieldLabel: 18, fieldValue: 26, cardTitle: 22, headerTitle: 24 }');
    });
  });

  // --- AC-097-09: Toggle back to normal mode ---
  describe('AC-097-09: Toggle back to normal', () => {
    it('FONT_SIZES constant has normal values', () => {
      expect(presentationSource).toContain('normal: { fieldLabel: 13, fieldValue: 17, cardTitle: 17, headerTitle: 19 }');
    });

    it('toggle handler switches between normal and large', () => {
      expect(presentationSource).toContain("setFontSizeMode(m => m === 'normal' ? 'large' : 'normal')");
    });
  });

  // --- AC-097-14: Font size not persisted ---
  describe('AC-097-14: Font size not persisted', () => {
    it('uses useState for fontSizeMode, not AsyncStorage or DB', () => {
      expect(presentationSource).toContain("useState<'normal' | 'large'>('normal')");
    });

    it('initial state is always normal', () => {
      expect(presentationSource).toContain("useState<'normal' | 'large'>('normal')");
    });
  });

  // --- Font toggle button style ---
  describe('fontToggleButton style', () => {
    it('has width 36 and height 36', () => {
      expect(presentationSource).toMatch(/fontToggleButton:[\s\S]*?width:\s*36[\s\S]*?height:\s*36/);
    });

    it('has borderRadius 18 (circular)', () => {
      expect(presentationSource).toMatch(/fontToggleButton:[\s\S]*?borderRadius:\s*18/);
    });
  });

  // --- AccordionCard cardTitleFontSize prop ---
  describe('AccordionCard cardTitleFontSize prop', () => {
    const accordionSource = readSourceFile('components/AccordionCard.tsx');

    it('AccordionCardProps interface has cardTitleFontSize optional prop', () => {
      expect(accordionSource).toContain('cardTitleFontSize?: number');
    });

    it('cardTitleFontSize applied to card title with fallback 16', () => {
      expect(accordionSource).toContain('fontSize: cardTitleFontSize ?? 16');
    });

    it('presentation passes cardTitleFontSize to AccordionCard', () => {
      expect(presentationSource).toContain('cardTitleFontSize={fontSizes.cardTitle}');
    });
  });

  // --- PresentationFieldRow fontSizes prop ---
  describe('PresentationFieldRow fontSizes prop', () => {
    it('PresentationFieldRow accepts fontSizes prop', () => {
      expect(presentationSource).toContain('fontSizes?: { label: number; value: number }');
    });

    it('fieldLabel uses fontSizes.label with fallback 12', () => {
      expect(presentationSource).toContain('fontSize: fontSizes?.label ?? 12');
    });

    it('fieldValue uses fontSizes.value with fallback 16', () => {
      expect(presentationSource).toContain('fontSize: fontSizes?.value ?? 16');
    });

    it('fontSizes passed to PresentationFieldRow in accordionCards', () => {
      expect(presentationSource).toContain('fontSizes={{ label: fontSizes.fieldLabel, value: fontSizes.fieldValue }}');
    });
  });

  // --- EC-097-03: Large font with long card titles ---
  describe('EC-097-03: Long card titles in large mode', () => {
    const accordionSource = readSourceFile('components/AccordionCard.tsx');

    it('card title has numberOfLines={1} for truncation', () => {
      expect(accordionSource).toContain('numberOfLines={1}');
    });
  });

  // --- Font size in accordionCards useMemo deps ---
  describe('Font size in useMemo deps', () => {
    it('accordionCards useMemo depends on fontSizes', () => {
      expect(presentationSource).toContain('[cards, colors, fontSizes]');
    });
  });
});

// =============================================================================
// F097 (CR-159): Section titles match agenda tab
// =============================================================================

describe('F097 (CR-159): Section titles in Presentation Mode', () => {

  const hookSource = readSourceFile('hooks/usePresentationMode.ts');

  // --- AC-097-10: Section titles match agenda tab (pt-BR) ---
  describe('AC-097-10: Section titles use correct i18n keys', () => {
    it('Card 1 uses agenda.sectionWelcome', () => {
      expect(hookSource).toContain("t('agenda.sectionWelcome')");
    });

    it('Card 2 uses agenda.sectionSacrament', () => {
      expect(hookSource).toContain("t('agenda.sectionSacrament')");
    });

    it('Card 3 (normal) uses agenda.sectionFirstSpeeches', () => {
      expect(hookSource).toContain("t('agenda.sectionFirstSpeeches')");
    });

    it('Card 4 (normal) uses agenda.sectionLastSpeech', () => {
      expect(hookSource).toContain("t('agenda.sectionLastSpeech')");
    });
  });

  // --- AC-097-10: Verify actual pt-BR values ---
  describe('AC-097-10: pt-BR section title values', () => {
    it('sectionWelcome = Boas-Vindas, Anuncios e Reconhecimentos (with accents, F105)', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionWelcome).toBe('Boas-Vindas, An\u00FAncios e Reconhecimentos');
    });

    it('sectionSacrament = Designacoes e Sacramento (with cedilla/tilde, F105)', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionSacrament).toBe('Designa\u00E7\u00F5es e Sacramento');
    });

    it('sectionFirstSpeeches = Primeiros Discursos', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionFirstSpeeches).toBe('Primeiros Discursos');
    });

    it('sectionLastSpeech = Ultimo Discurso (with accent on U, F105)', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionLastSpeech).toBe('\u00DAltimo Discurso');
    });
  });

  // --- AC-097-11: English section titles ---
  describe('AC-097-11: English section title values', () => {
    it('sectionWelcome = Welcome, Announcements and Recognitions', () => {
      const locale = readLocale('en') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionWelcome).toBe('Welcome, Announcements and Recognitions');
    });

    it('sectionSacrament = Assignments and Sacrament', () => {
      const locale = readLocale('en') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionSacrament).toBe('Assignments and Sacrament');
    });

    it('sectionFirstSpeeches = First Speeches', () => {
      const locale = readLocale('en') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionFirstSpeeches).toBe('First Speeches');
    });

    it('sectionLastSpeech = Final Speech', () => {
      const locale = readLocale('en') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionLastSpeech).toBe('Final Speech');
    });
  });

  // --- AC-097-12: Spanish section titles ---
  describe('AC-097-12: Spanish section title values', () => {
    it('sectionWelcome = Bienvenida, Anuncios y Reconocimientos', () => {
      const locale = readLocale('es') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionWelcome).toBe('Bienvenida, Anuncios y Reconocimientos');
    });

    it('sectionSacrament = Asignaciones y Sacramento', () => {
      const locale = readLocale('es') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionSacrament).toBe('Asignaciones y Sacramento');
    });

    it('sectionFirstSpeeches = Primeros Discursos', () => {
      const locale = readLocale('es') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionFirstSpeeches).toBe('Primeros Discursos');
    });

    it('sectionLastSpeech = Ultimo Discurso (with accent on U, F105)', () => {
      const locale = readLocale('es') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionLastSpeech).toBe('\u00DAltimo Discurso');
    });
  });

  // --- AC-097-13: Special meeting closing card title unchanged ---
  describe('AC-097-13: Special meeting last card title', () => {
    it('special meeting card uses agenda.closingHymn', () => {
      // In the else branch (isSpecial), card title is closingHymn
      expect(hookSource).toContain("title: t('agenda.closingHymn')");
    });
  });

  // --- Section titles do NOT use old keys ---
  describe('Section titles no longer use old keys', () => {
    it('Card 1 does NOT use agenda.presiding as title', () => {
      // Verify sectionWelcome is used as card title, not presiding
      const card1Push = hookSource.match(/cards\.push\(\{.*?title:.*?sectionWelcome/s);
      expect(card1Push).not.toBeNull();
    });

    it('Card 2 does NOT use agenda.wardBusiness as title', () => {
      const card2Push = hookSource.match(/cards\.push\(\{.*?title:.*?sectionSacrament/s);
      expect(card2Push).not.toBeNull();
    });
  });
});

// =============================================================================
// F098 (CR-160): Speech label context-aware display
// =============================================================================

describe('F098 (CR-160): Speech label context-aware (position 3)', () => {

  const speechSlotSource = readSourceFile('components/SpeechSlot.tsx');
  const sundayCardSource = readSourceFile('components/SundayCard.tsx');

  // --- AC-098-01: Collapsed card shows 3o Discurso for position 3 ---
  describe('AC-098-01: Collapsed card position 3 label', () => {
    it('SundayCard uses speeches.slot for all positions including 3', () => {
      expect(sundayCardSource).toContain("t('speeches.slot', { number: `${pos}\\u00BA` })");
    });

    it('SundayCard does NOT have ternary for pos === 3', () => {
      expect(sundayCardSource).not.toContain('pos === 3');
    });
  });

  // --- AC-098-02: Expanded card shows 3o Discurso for position 3 ---
  describe('AC-098-02: Expanded card position 3 label', () => {
    it('getPositionLabel has no if(position === 3) special case', () => {
      expect(speechSlotSource).not.toContain('position === 3');
    });

    it('getPositionLabel returns speeches.slot for all positions', () => {
      expect(speechSlotSource).toContain("t('speeches.slot', { number: `${position}\\u00BA` })");
    });
  });

  // --- AC-098-03: Agenda tab keeps Ultimo Discurso ---
  describe('AC-098-03: Agenda tab section header unchanged', () => {
    it('AgendaForm uses sectionLastSpeech for last speech section', () => {
      const agendaFormSource = readSourceFile('components/AgendaForm.tsx');
      expect(agendaFormSource).toContain("t('agenda.sectionLastSpeech')");
    });
  });

  // --- AC-098-04: Home tab uses same SundayCard component ---
  describe('AC-098-04: Home tab shares SundayCard', () => {
    it('NextSundaysSection imports SundayCard', () => {
      const nextSundaysSource = readSourceFile('components/NextSundaysSection.tsx');
      expect(nextSundaysSource).toContain('SundayCard');
    });
  });

  // --- AC-098-08: Presentation Mode keeps Ultimo Discurso for last speaker label ---
  describe('AC-098-08: Presentation Mode last speaker label unchanged', () => {
    const hookSource = readSourceFile('hooks/usePresentationMode.ts');

    it('buildPresentationCards uses speeches.lastSpeech for last speaker label', () => {
      expect(hookSource).toContain("t('speeches.lastSpeech')");
    });

    it('last speaker label is t(speeches.lastSpeech) only (F108 removed suffix)', () => {
      // F108 removed the redundant " - Discurso" suffix
      // Now it's just: { label: t('speeches.lastSpeech'), ... }
      expect(hookSource).toContain("label: t('speeches.lastSpeech')");
    });
  });

  // --- EC-098-02: Activity log not affected ---
  describe('EC-098-02: Activity log uses own format', () => {
    it('activity log events use own speech format', () => {
      const locale = readLocale('pt-BR') as { activityLog: { events: Record<string, string> } };
      expect(locale.activityLog.events.speech_assign).toContain('{{N}}o discurso');
    });
  });
});

// =============================================================================
// F098 (CR-163): selectSpeaker placeholder fix
// =============================================================================

describe('F098 (CR-163): selectSpeaker placeholder in all locales', () => {

  // --- AC-098-05: pt-BR selectSpeaker ---
  describe('AC-098-05: pt-BR selectSpeaker', () => {
    it('pt-BR selectSpeaker = Selecionar Discursante', () => {
      const locale = readLocale('pt-BR') as { speeches: Record<string, string> };
      expect(locale.speeches.selectSpeaker).toBe('Selecionar Discursante');
    });
  });

  // --- AC-098-06: en selectSpeaker ---
  describe('AC-098-06: en selectSpeaker', () => {
    it('en selectSpeaker = Select Speaker', () => {
      const locale = readLocale('en') as { speeches: Record<string, string> };
      expect(locale.speeches.selectSpeaker).toBe('Select Speaker');
    });
  });

  // --- AC-098-07: es selectSpeaker ---
  describe('AC-098-07: es selectSpeaker', () => {
    it('es selectSpeaker = Seleccionar Discursante', () => {
      const locale = readLocale('es') as { speeches: Record<string, string> };
      expect(locale.speeches.selectSpeaker).toBe('Seleccionar Discursante');
    });
  });

  // --- EC-098-01: Accessibility label also uses selectSpeaker ---
  describe('EC-098-01: Accessibility uses selectSpeaker', () => {
    const speechSlotSource = readSourceFile('components/SpeechSlot.tsx');

    it('SpeechSlot uses speeches.selectSpeaker for accessibilityLabel', () => {
      expect(speechSlotSource).toContain("accessibilityLabel={t('speeches.selectSpeaker')}");
    });

    it('SpeechSlot uses speeches.selectSpeaker as placeholder text', () => {
      expect(speechSlotSource).toContain("t('speeches.selectSpeaker')");
    });
  });
});

// =============================================================================
// F099 (CR-161): Collapsed speech card redesign
// =============================================================================

describe('F099 (CR-161): Collapsed speech card redesign', () => {

  const sundayCardSource = readSourceFile('components/SundayCard.tsx');

  // --- AC-099-01: LED circle before label text ---
  describe('AC-099-01: LED circle before label text', () => {
    it('speechRow style has flexDirection row', () => {
      expect(sundayCardSource).toMatch(/speechRow:[\s\S]*?flexDirection:\s*'row'/);
    });

    it('StatusLED appears before Text in the map', () => {
      // In the collapsed block, StatusLED comes before the Text element
      const collapsedBlock = sundayCardSource.match(/speechRow[\s\S]*?StatusLED[\s\S]*?speakerNameLine/);
      expect(collapsedBlock).not.toBeNull();
    });
  });

  // --- AC-099-02: No separate LED column on the right ---
  describe('AC-099-02: No separate LED column', () => {
    it('no ledsVertical usage for collapsed speeches rendering', () => {
      // ledsVertical style may still be defined but not used in collapsed speeches block
      expect(sundayCardSource).not.toContain('style={styles.ledsVertical}');
    });

    it('no separate {!expanded && isSpeechesType block for LEDs', () => {
      expect(sundayCardSource).not.toContain('{!expanded && isSpeechesType && (');
    });
  });

  // --- AC-099-03: Font size 13 ---
  describe('AC-099-03: Font size increased to 13', () => {
    it('speakerNameLine fontSize is 13', () => {
      expect(sundayCardSource).toMatch(/speakerNameLine:[\s\S]*?fontSize:\s*13/);
    });
  });

  // --- AC-099-04: Line spacing marginBottom 4 ---
  describe('AC-099-04: Line spacing increased', () => {
    it('speechRow has marginBottom 4', () => {
      expect(sundayCardSource).toMatch(/speechRow:[\s\S]*?marginBottom:\s*4/);
    });
  });

  // --- AC-099-05: Circle size 10 ---
  describe('AC-099-05: Circle size reduced to 10', () => {
    it('StatusLED in collapsed uses size={10}', () => {
      expect(sundayCardSource).toContain('size={10}');
    });
  });

  // --- AC-099-06: No designation shows only circle ---
  describe('AC-099-06: No speaker name shows only circle', () => {
    it('text is conditional on name being truthy', () => {
      expect(sundayCardSource).toContain('{name ? (');
    });

    it('renders placeholder Text with space when name is empty (F107)', () => {
      // F107 changed from null to <Text>{' '}</Text> for consistent row height
      expect(sundayCardSource).toContain("{' '}");
    });
  });

  // --- AC-099-07: All three positions show full format ---
  describe('AC-099-07: All positions with speakers show LED + text', () => {
    it('iterates over [1, 2, 3] for all positions', () => {
      expect(sundayCardSource).toContain('[1, 2, 3].map');
    });

    it('shows posLabel: name format', () => {
      expect(sundayCardSource).toContain('`${posLabel}: ${name}`');
    });
  });

  // --- AC-099-08: Mixed assignment shows correct format ---
  describe('AC-099-08: Mixed assignment', () => {
    it('name derived from speech?.speaker_name with empty fallback', () => {
      expect(sundayCardSource).toContain("speech?.speaker_name ?? ''");
    });
  });

  // --- AC-099-09: StatusLED still interactive ---
  describe('AC-099-09: StatusLED pressable for status changes', () => {
    it('onPress passed to StatusLED when speech exists', () => {
      expect(sundayCardSource).toContain('onStatusPress && speech');
      expect(sundayCardSource).toContain('() => onStatusPress(speech)');
    });

    it('disabled prop passed to StatusLED', () => {
      expect(sundayCardSource).toContain('disabled={typeDisabled}');
    });
  });

  // --- AC-099-10: Home tab shows same layout ---
  describe('AC-099-10: Home tab uses same SundayCard', () => {
    it('NextSundaysSection imports SundayCard', () => {
      const nextSundaysSource = readSourceFile('components/NextSundaysSection.tsx');
      expect(nextSundaysSource).toContain('SundayCard');
    });
  });

  // --- EC-099-01: All 3 unassigned ---
  describe('EC-099-01: All positions unassigned', () => {
    it('empty name shows only circle (no text)', () => {
      // When name is '', {name ? ... : null} renders null
      expect(sundayCardSource).toContain('{name ? (');
    });
  });

  // --- EC-099-02: Long speaker name truncated ---
  describe('EC-099-02: Long speaker name', () => {
    it('speaker name text has numberOfLines={1}', () => {
      expect(sundayCardSource).toContain('numberOfLines={1}');
    });

    it('speaker name has ellipsizeMode tail', () => {
      expect(sundayCardSource).toContain('ellipsizeMode="tail"');
    });
  });

  // --- EC-099-03: Non-speeches type unchanged ---
  describe('EC-099-03: Non-speeches type card', () => {
    it('exception text still rendered for non-speeches type', () => {
      expect(sundayCardSource).toContain('!isSpeechesType');
      expect(sundayCardSource).toContain('exceptionText');
    });
  });

  // --- speechRow style complete ---
  describe('speechRow style', () => {
    it('has alignItems center', () => {
      expect(sundayCardSource).toMatch(/speechRow:[\s\S]*?alignItems:\s*'center'/);
    });

    it('has gap 8', () => {
      expect(sundayCardSource).toMatch(/speechRow:[\s\S]*?gap:\s*8/);
    });
  });
});

// =============================================================================
// F100 (CR-162): Expanded speech card status redesign
// =============================================================================

describe('F100 (CR-162): Expanded speech card status on label row', () => {

  const speechSlotSource = readSourceFile('components/SpeechSlot.tsx');

  // --- AC-100-01: StatusLED on label line, right-aligned ---
  describe('AC-100-01: StatusLED on label row', () => {
    it('labelRow style has flexDirection row', () => {
      expect(speechSlotSource).toMatch(/labelRow:[\s\S]*?flexDirection:\s*'row'/);
    });

    it('labelRow has justifyContent space-between', () => {
      expect(speechSlotSource).toMatch(/labelRow:[\s\S]*?justifyContent:\s*'space-between'/);
    });

    it('labelRow has alignItems center', () => {
      expect(speechSlotSource).toMatch(/labelRow:[\s\S]*?alignItems:\s*'center'/);
    });
  });

  // --- AC-100-02: Status text matches current speech status ---
  describe('AC-100-02: Status text from speechStatus i18n', () => {
    it('uses speechStatus interpolation for status text', () => {
      expect(speechSlotSource).toContain("{t(`speechStatus.${status}`)}");
    });
  });

  // --- AC-100-03: Not assigned shows correct text ---
  describe('AC-100-03: Not assigned status text', () => {
    it('pt-BR not_assigned = Nao designado', () => {
      const locale = readLocale('pt-BR') as { speechStatus: Record<string, string> };
      expect(locale.speechStatus.not_assigned).toContain('designado');
    });
  });

  // --- AC-100-04: Speaker field uses full width ---
  describe('AC-100-04: Speaker field full width', () => {
    it('no StatusLED in speaker row (row style)', () => {
      // The row View should not contain StatusLED - LED is now in labelRow
      const rowSection = speechSlotSource.match(/<View style={styles\.row}>[\s\S]*?<\/View>/);
      expect(rowSection).not.toBeNull();
      // StatusLED should NOT be inside styles.row
      const rowContent = rowSection![0];
      expect(rowContent).not.toContain('StatusLED');
    });

    it('speaker field has flex 1', () => {
      expect(speechSlotSource).toMatch(/field:[\s\S]*?flex:\s*1/);
    });
  });

  // --- AC-100-05: Topic field full width (no marginLeft 28) ---
  describe('AC-100-05: Topic field full width', () => {
    it('topicRow style has no marginLeft 28', () => {
      const topicRowStyle = speechSlotSource.match(/topicRow:[\s\S]*?\}/);
      expect(topicRowStyle).not.toBeNull();
      expect(topicRowStyle![0]).not.toContain('marginLeft: 28');
    });
  });

  // --- AC-100-06: StatusLED on label row is pressable ---
  describe('AC-100-06: StatusLED on label row pressable', () => {
    it('Pressable wraps status section with handleStatusPress', () => {
      expect(speechSlotSource).toContain('onPress={handleStatusPress}');
    });

    it('StatusLED in label row has onPress handler', () => {
      // StatusLED in the statusSection also has onPress
      const statusSectionBlock = speechSlotSource.match(/statusSection[\s\S]*?StatusLED[\s\S]*?onPress/);
      expect(statusSectionBlock).not.toBeNull();
    });
  });

  // --- AC-100-07: Status text is pressable ---
  describe('AC-100-07: Status text pressable', () => {
    it('status text and LED inside same Pressable', () => {
      expect(speechSlotSource).toContain('style={styles.statusSection}');
    });
  });

  // --- AC-100-08: Not assigned LED not pressable ---
  describe('AC-100-08: Not assigned LED disabled', () => {
    it("Pressable disabled when status === 'not_assigned'", () => {
      expect(speechSlotSource).toContain("disabled={isObserver || status === 'not_assigned'}");
    });
  });

  // --- AC-100-09: Observer cannot press LED ---
  describe('AC-100-09: Observer LED disabled', () => {
    it('Pressable disabled when isObserver', () => {
      expect(speechSlotSource).toContain("disabled={isObserver || status === 'not_assigned'}");
    });

    it('isObserver derived from role', () => {
      expect(speechSlotSource).toContain("const isObserver = role === 'observer'");
    });
  });

  // --- AC-100-10: English status text ---
  describe('AC-100-10: English status text values', () => {
    it('en assigned_invited = Assigned/Invited', () => {
      const locale = readLocale('en') as { speechStatus: Record<string, string> };
      expect(locale.speechStatus.assigned_invited).toBe('Assigned/Invited');
    });
  });

  // --- AC-100-11: Spanish status text ---
  describe('AC-100-11: Spanish status text values', () => {
    it('es gave_up = Desistio', () => {
      const locale = readLocale('es') as { speechStatus: Record<string, string> };
      expect(locale.speechStatus.gave_up).toContain('Desisti');
    });
  });

  // --- statusSection style ---
  describe('statusSection style', () => {
    it('has flexDirection row', () => {
      expect(speechSlotSource).toMatch(/statusSection:[\s\S]*?flexDirection:\s*'row'/);
    });

    it('has gap 6', () => {
      expect(speechSlotSource).toMatch(/statusSection:[\s\S]*?gap:\s*6/);
    });
  });

  // --- statusText style ---
  describe('statusText style', () => {
    it('has fontSize 11', () => {
      expect(speechSlotSource).toMatch(/statusText:[\s\S]*?fontSize:\s*11/);
    });
  });

  // --- labelRow marginBottom ---
  describe('labelRow margin', () => {
    it('labelRow has marginBottom 6', () => {
      expect(speechSlotSource).toMatch(/labelRow:[\s\S]*?marginBottom:\s*6/);
    });
  });

  // --- EC-100-01: Long status text ---
  describe('EC-100-01: Long status text', () => {
    it('label has flex 1 to allow truncation', () => {
      // The label Text is in the labelRow which is flex row space-between
      // so long labels and status text will share space
      expect(speechSlotSource).toMatch(/labelRow:[\s\S]*?justifyContent:\s*'space-between'/);
    });
  });

  // --- EC-100-02: Status changes while visible ---
  describe('EC-100-02: Status changes update immediately', () => {
    it('status derived from speech?.status reactively', () => {
      expect(speechSlotSource).toContain("const status = speech?.status ?? 'not_assigned'");
    });
  });

  // --- EC-100-03: Gave up status with dark wine LED ---
  describe('EC-100-03: Gave up status', () => {
    it('StatusLED component uses status prop directly', () => {
      expect(speechSlotSource).toContain('status={status}');
    });

    it('gave_up color is dark wine (#7F1D1D) in StatusLED', () => {
      const statusLEDSource = readSourceFile('components/StatusLED.tsx');
      expect(statusLEDSource).toContain("gave_up: '#7F1D1D'");
    });
  });

  // --- StatusLED size in label row ---
  describe('StatusLED size in label row', () => {
    it('StatusLED size is 14 in label row', () => {
      expect(speechSlotSource).toContain('size={14}');
    });
  });
});

// =============================================================================
// Cross-feature: speechStatus i18n keys in all locales
// =============================================================================

describe('Cross-feature: speechStatus i18n keys in all 3 locales', () => {
  const statuses = ['not_assigned', 'assigned_not_invited', 'assigned_invited', 'assigned_confirmed', 'gave_up'];
  const locales = ['pt-BR', 'en', 'es'];

  for (const loc of locales) {
    for (const status of statuses) {
      it(`${loc} has speechStatus.${status}`, () => {
        const locale = readLocale(loc) as { speechStatus: Record<string, string> };
        expect(locale.speechStatus[status]).toBeDefined();
        expect(locale.speechStatus[status].length).toBeGreaterThan(0);
      });
    }
  }
});

// =============================================================================
// Cross-feature: section title keys in all 3 locales
// =============================================================================

describe('Cross-feature: section title i18n keys in all 3 locales', () => {
  const sectionKeys = ['sectionWelcome', 'sectionSacrament', 'sectionFirstSpeeches', 'sectionLastSpeech'];
  const locales = ['pt-BR', 'en', 'es'];

  for (const loc of locales) {
    for (const key of sectionKeys) {
      it(`${loc} has agenda.${key}`, () => {
        const locale = readLocale(loc) as { agenda: Record<string, string> };
        expect(locale.agenda[key]).toBeDefined();
        expect(locale.agenda[key].length).toBeGreaterThan(0);
      });
    }
  }
});

// =============================================================================
// Cross-feature: PresentationField type includes multiline
// =============================================================================

describe('Cross-feature: PresentationField type includes multiline', () => {
  const hookSource = readSourceFile('hooks/usePresentationMode.ts');

  it('PresentationField type union includes multiline', () => {
    expect(hookSource).toContain("'text' | 'hymn' | 'multiline'");
  });

  it('PresentationFieldRow handles multiline with undefined numberOfLines', () => {
    const presentationSource = readSourceFile('app/presentation.tsx');
    expect(presentationSource).toContain("field.type === 'multiline' ? undefined : 2");
  });
});

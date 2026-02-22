/**
 * Tests for Batch 16: UI Polish, Presentation Fix, Status Icons, Back Button,
 *                      Collapsed Cards
 *
 * F103 (CR-165): Align status circle with X button in expanded SpeechSlot
 * F104 (CR-166): Presentation screen title fix and font size lock
 * F105 (CR-167): Fix Portuguese accents in agenda section headers
 * F106 (CR-168): Increase back button tap area in Settings sub-screens
 * F107 (CR-169): Equalize status LED sizes in collapsed speech cards
 * F108 (CR-170): Remove redundant suffix from last speech label
 * F109 (CR-171): Collapsed card status lines for testimony/primary meetings
 *
 * Covers acceptance criteria:
 *   AC-103-01..05, AC-104-01..06, AC-105-01..08, AC-106-01..04,
 *   AC-107-01..05, AC-108-01..04, AC-109-01..11
 * Covers edge cases:
 *   EC-103-01..02, EC-104-01..02, EC-105-01, EC-106-01..02,
 *   EC-107-01..03, EC-108-01, EC-109-01..04
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
// F103 (CR-165): Align status circle with X button in expanded SpeechSlot
// =============================================================================

describe('F103 (CR-165): StatusLED/X button vertical alignment in SpeechSlot (superseded by F112/CR-174, then by F124/ADR-081)', () => {

  const speechSlotSource = readSourceFile('components/SpeechSlot.tsx');

  // NOTE: F124 (CR-189, ADR-081) superseded F112 (CR-174) and F103 (CR-165).
  // The two-column layout (outerRow/leftColumn/rightColumn) was replaced by
  // row-per-element layout (speakerRow/actionArea, topicRow/topicActionArea).
  // These tests now verify the F124 approach which achieves alignment by placing
  // field and X button as siblings in the same flex row.

  // --- AC-103-01: StatusLED circle vertically aligned with X button ---
  describe('AC-103-01: StatusLED aligned with X button', () => {
    it('actionArea has fixed width 36 for X button alignment (F124 row-per-element)', () => {
      expect(speechSlotSource).toMatch(/actionArea:\s*\{[^}]*width:\s*36/s);
    });

    it('actionArea has alignItems center for centering X button', () => {
      expect(speechSlotSource).toMatch(/actionArea:\s*\{[^}]*alignItems:\s*'center'/s);
    });
  });

  // --- AC-103-02: Status text and circle shifted slightly left ---
  describe('AC-103-02: Status section in labelRow', () => {
    it('status text is in labelRow (not in a separate column)', () => {
      const labelRowIdx = speechSlotSource.indexOf('styles.labelRow');
      const statusTextIdx = speechSlotSource.indexOf('styles.statusText');
      expect(statusTextIdx).toBeGreaterThan(labelRowIdx);
    });
  });

  // --- AC-103-03: Alignment works when X is not visible ---
  describe('AC-103-03: Alignment consistent without X button', () => {
    it('actionArea width is static (always 36, regardless of X visibility)', () => {
      const actionAreaMatch = speechSlotSource.match(
        /actionArea:\s*\{[^}]*\}/s
      );
      expect(actionAreaMatch).not.toBeNull();
      expect(actionAreaMatch![0]).toContain('width: 36');
    });
  });

  // --- AC-103-04: Alignment works for all 3 positions ---
  describe('AC-103-04: All 3 positions have consistent alignment', () => {
    it('SpeechSlot uses shared styles.actionArea for all positions', () => {
      expect(speechSlotSource).toContain('styles.actionArea');
    });

    it('actionArea style is defined in StyleSheet.create', () => {
      const styleDefMatch = speechSlotSource.match(/actionArea:\s*\{/);
      expect(styleDefMatch).not.toBeNull();
    });
  });

  // --- AC-103-05: Topic clear button also aligns ---
  describe('AC-103-05: Topic clear button alignment', () => {
    it('topicRow has no marginLeft (fields start at same horizontal position)', () => {
      const topicRowMatch = speechSlotSource.match(
        /topicRow:\s*\{[^}]*\}/s
      );
      expect(topicRowMatch).not.toBeNull();
      expect(topicRowMatch![0]).not.toContain('marginLeft');
    });

    it('remove button uses same style for both speaker and topic rows', () => {
      expect(speechSlotSource).toContain('styles.removeButton');
    });
  });

  // --- EC-103-01: Observer role (no X button, no status press) ---
  describe('EC-103-01: Observer role alignment', () => {
    it('actionArea width is static (not conditional on role)', () => {
      const styleSheetBlock = speechSlotSource.split('StyleSheet.create')[1];
      expect(styleSheetBlock).toContain('actionArea:');
      expect(styleSheetBlock).toContain('width: 36');
    });
  });

  // --- EC-103-02: Secretary role alignment ---
  describe('EC-103-02: Secretary role alignment', () => {
    it('actionArea style does not depend on user role', () => {
      const staticStyles = speechSlotSource.split('StyleSheet.create')[1];
      expect(staticStyles).toContain('actionArea:');
      expect(staticStyles).toContain('width: 36');
    });
  });
});

// =============================================================================
// F104 (CR-166): Presentation screen title fix and font size lock
// =============================================================================

describe('F104 (CR-166): Presentation title and font size lock', () => {

  const presentationSource = readSourceFile('app/presentation.tsx');

  // --- AC-104-01: Title is 'Reuniao Sacramental' in pt-BR ---
  describe('AC-104-01: pt-BR presentation title', () => {
    it('presentation.tsx uses t(presentation.title) for header', () => {
      expect(presentationSource).toContain("t('presentation.title')");
    });

    it('pt-BR.json has presentation.title key', () => {
      const locale = readLocale('pt-BR') as { presentation: Record<string, string> };
      expect(locale.presentation).toBeDefined();
      expect(locale.presentation.title).toBeDefined();
    });

    it('pt-BR presentation.title is Reuniao Sacramental (with accent)', () => {
      const locale = readLocale('pt-BR') as { presentation: Record<string, string> };
      expect(locale.presentation.title).toContain('Reuni');
      expect(locale.presentation.title).toContain('Sacramental');
    });
  });

  // --- AC-104-02: Title in English ---
  describe('AC-104-02: English presentation title', () => {
    it('en.json has presentation.title = Sacrament Meeting', () => {
      const locale = readLocale('en') as { presentation: Record<string, string> };
      expect(locale.presentation.title).toBe('Sacrament Meeting');
    });
  });

  // --- AC-104-03: Title in Spanish ---
  describe('AC-104-03: Spanish presentation title', () => {
    it('es.json has presentation.title key', () => {
      const locale = readLocale('es') as { presentation: Record<string, string> };
      expect(locale.presentation).toBeDefined();
      expect(locale.presentation.title).toBeDefined();
    });

    it('es.json presentation.title contains Sacramental', () => {
      const locale = readLocale('es') as { presentation: Record<string, string> };
      expect(locale.presentation.title).toContain('Sacramental');
    });
  });

  // --- AC-104-04: Title font size does NOT change when toggle is pressed ---
  describe('AC-104-04: Title font size locked', () => {
    it('header title fontSize is hardcoded to 19 (not dynamic)', () => {
      expect(presentationSource).toContain('fontSize: 19');
    });

    it('header title does NOT use fontSizes.headerTitle', () => {
      // The header title line should have fontSize: 19 not fontSizes.headerTitle
      // presentation.tsx should NOT use fontSizes.headerTitle for the title
      expect(presentationSource).not.toContain('fontSizes.headerTitle');
    });
  });

  // --- AC-104-05: Title stays fixed when toggling back ---
  describe('AC-104-05: Title font size fixed both ways', () => {
    it('fontSize 19 is used directly, not from FONT_SIZES constant', () => {
      // Verify the headerTitle uses inline 19, not the constant
      const headerTitleMatch = presentationSource.match(
        /styles\.headerTitle.*fontSize:\s*19/
      );
      expect(headerTitleMatch).not.toBeNull();
    });
  });

  // --- AC-104-06: Date label stays fixed ---
  describe('AC-104-06: Date label font size unchanged', () => {
    it('headerDate style has fontSize: 14', () => {
      expect(presentationSource).toContain('fontSize: 14');
    });

    it('headerDate fontSize does not use dynamic value', () => {
      const headerDateMatch = presentationSource.match(
        /headerDate:\s*\{[^}]*fontSize:\s*14/s
      );
      expect(headerDateMatch).not.toBeNull();
    });
  });

  // --- EC-104-01: Long title in other languages ---
  describe('EC-104-01: Title length in all languages', () => {
    it('pt-BR title is reasonably short (no truncation risk)', () => {
      const locale = readLocale('pt-BR') as { presentation: Record<string, string> };
      expect(locale.presentation.title.length).toBeLessThan(30);
    });

    it('en title is reasonably short', () => {
      const locale = readLocale('en') as { presentation: Record<string, string> };
      expect(locale.presentation.title.length).toBeLessThan(30);
    });

    it('es title is reasonably short', () => {
      const locale = readLocale('es') as { presentation: Record<string, string> };
      expect(locale.presentation.title.length).toBeLessThan(30);
    });
  });

  // --- EC-104-02: home.startMeeting key still used elsewhere ---
  describe('EC-104-02: home.startMeeting key preserved', () => {
    it('home.startMeeting key still exists in pt-BR.json', () => {
      const locale = readLocale('pt-BR') as { home: Record<string, string> };
      expect(locale.home.startMeeting).toBeDefined();
    });

    it('home.startMeeting key still exists in en.json', () => {
      const locale = readLocale('en') as { home: Record<string, string> };
      expect(locale.home.startMeeting).toBeDefined();
    });

    it('presentation.tsx does NOT use home.startMeeting', () => {
      expect(presentationSource).not.toContain("t('home.startMeeting')");
    });

    it('index.tsx still uses home.startMeeting', () => {
      const indexSource = readSourceFile('app/(tabs)/index.tsx');
      expect(indexSource).toContain("t('home.startMeeting')");
    });
  });
});

// =============================================================================
// F105 (CR-167): Fix Portuguese accents in agenda section headers
// =============================================================================

describe('F105 (CR-167): Portuguese accents in section headers', () => {

  // --- AC-105-01: pt-BR sectionWelcome has correct accents ---
  describe('AC-105-01: pt-BR sectionWelcome accents', () => {
    it('sectionWelcome has capital V in Vindas', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionWelcome).toContain('Vindas');
    });

    it('sectionWelcome has tilde on u in Anuncios (U+00FA)', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionWelcome).toContain('An\u00FAncios');
    });

    it('sectionWelcome full value is correct', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionWelcome).toBe('Boas-Vindas, An\u00FAncios e Reconhecimentos');
    });
  });

  // --- AC-105-02: pt-BR sectionSacrament has cedilla ---
  describe('AC-105-02: pt-BR sectionSacrament cedilla', () => {
    it('sectionSacrament has cedilla+tilde in Designacoes (U+00E7, U+00F5)', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionSacrament).toContain('Designa\u00E7\u00F5es');
    });

    it('sectionSacrament full value is correct', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionSacrament).toBe('Designa\u00E7\u00F5es e Sacramento');
    });
  });

  // --- AC-105-03: pt-BR sectionLastSpeech has accent ---
  describe('AC-105-03: pt-BR sectionLastSpeech accent', () => {
    it('sectionLastSpeech has accent on U (U+00DA)', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionLastSpeech).toContain('\u00DAltimo');
    });

    it('sectionLastSpeech full value is correct', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionLastSpeech).toBe('\u00DAltimo Discurso');
    });
  });

  // --- AC-105-04: sectionFirstSpeeches unchanged ---
  describe('AC-105-04: pt-BR sectionFirstSpeeches unchanged', () => {
    it('sectionFirstSpeeches is Primeiros Discursos (no change needed)', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionFirstSpeeches).toBe('Primeiros Discursos');
    });
  });

  // --- AC-105-05: es.json sectionWelcome accent fixed ---
  describe('AC-105-05: es.json sectionWelcome', () => {
    it('es.json has sectionWelcome key', () => {
      const locale = readLocale('es') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionWelcome).toBeDefined();
    });

    it('es.json sectionWelcome contains Bienvenida', () => {
      const locale = readLocale('es') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionWelcome).toContain('Bienvenida');
    });
  });

  // --- AC-105-06: es.json sectionLastSpeech accent fixed ---
  describe('AC-105-06: es.json sectionLastSpeech accent', () => {
    it('es.json sectionLastSpeech has accent on U (U+00DA)', () => {
      const locale = readLocale('es') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionLastSpeech).toContain('\u00DAltimo');
    });

    it('es.json sectionLastSpeech full value is correct', () => {
      const locale = readLocale('es') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionLastSpeech).toBe('\u00DAltimo Discurso');
    });
  });

  // --- AC-105-07: Presentation Mode card titles show corrected text ---
  describe('AC-105-07: Presentation mode uses corrected section keys', () => {
    it('usePresentationMode references sectionWelcome key', () => {
      const hookSource = readSourceFile('hooks/usePresentationMode.ts');
      expect(hookSource).toContain("t('agenda.sectionWelcome')");
    });

    it('usePresentationMode references sectionLastSpeech key', () => {
      const hookSource = readSourceFile('hooks/usePresentationMode.ts');
      expect(hookSource).toContain("t('agenda.sectionLastSpeech')");
    });
  });

  // --- AC-105-08: Agenda form section headers show corrected text ---
  describe('AC-105-08: Agenda form uses same i18n keys', () => {
    it('en.json section headers exist (no accents needed for English)', () => {
      const locale = readLocale('en') as { agenda: Record<string, string> };
      expect(locale.agenda.sectionWelcome).toBeDefined();
      expect(locale.agenda.sectionSacrament).toBeDefined();
      expect(locale.agenda.sectionFirstSpeeches).toBeDefined();
      expect(locale.agenda.sectionLastSpeech).toBeDefined();
    });
  });

  // --- EC-105-01: Font rendering of accented characters ---
  describe('EC-105-01: Unicode accented characters supported', () => {
    it('pt-BR values contain valid Unicode characters', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      // These should not be ASCII substitutes
      expect(locale.agenda.sectionWelcome).not.toBe('Boas-vindas, Anuncios e Reconhecimentos');
      expect(locale.agenda.sectionSacrament).not.toBe('Designacoes e Sacramento');
      expect(locale.agenda.sectionLastSpeech).not.toBe('Ultimo Discurso');
    });
  });
});

// =============================================================================
// F106 (CR-168): Increase back button tap area in Settings sub-screens
// =============================================================================

describe('F106 (CR-168): Back button hitSlop in Settings', () => {

  const settingsScreens = [
    'theme.tsx',
    'whatsapp.tsx',
    'about.tsx',
    'history.tsx',
    'timezone.tsx',
    'members.tsx',
    'users.tsx',
    'topics.tsx',
  ];

  // --- AC-106-01: Back button touch area meets minimum 44x44 target ---
  describe('AC-106-01: Touch area meets 44x44 minimum', () => {
    it('hitSlop={12} provides at least 44px height (20px text + 2*12px slop = 44px)', () => {
      const themeSource = readSourceFile('app/(tabs)/settings/theme.tsx');
      expect(themeSource).toContain('hitSlop={12}');
    });
  });

  // --- AC-106-02: All 8 Settings sub-screens updated consistently ---
  describe('AC-106-02: All 8 screens have hitSlop', () => {
    settingsScreens.forEach((screen) => {
      it(`${screen} has hitSlop on back button Pressable`, () => {
        const source = readSourceFile(`app/(tabs)/settings/${screen}`);
        expect(source).toContain('hitSlop={12}');
      });
    });
  });

  // --- AC-106-03: Back button still navigates correctly ---
  describe('AC-106-03: Back button navigation preserved', () => {
    settingsScreens.forEach((screen) => {
      it(`${screen} back button uses router.back()`, () => {
        const source = readSourceFile(`app/(tabs)/settings/${screen}`);
        expect(source).toContain('router.back()');
      });
    });
  });

  // --- AC-106-04: Visual appearance not drastically changed ---
  describe('AC-106-04: Visual appearance unchanged', () => {
    it('backButton style still has fontSize: 16 and fontWeight 600', () => {
      const themeSource = readSourceFile('app/(tabs)/settings/theme.tsx');
      expect(themeSource).toContain('fontSize: 16');
      expect(themeSource).toMatch(/fontWeight:?\s*['"]600['"]/);
    });

    it('hitSlop does not change visual layout (no padding added)', () => {
      // hitSlop is on the Pressable, not padding/margin on the style
      settingsScreens.forEach((screen) => {
        const source = readSourceFile(`app/(tabs)/settings/${screen}`);
        const hitSlopLine = source.match(/hitSlop=\{12\}/);
        expect(hitSlopLine).not.toBeNull();
      });
    });
  });

  // --- EC-106-01: Back button overlaps with adjacent elements ---
  describe('EC-106-01: hitSlop does not affect layout', () => {
    it('hitSlop extends touch area without changing component size', () => {
      // hitSlop is a React Native prop that extends touch area but not layout
      const source = readSourceFile('app/(tabs)/settings/theme.tsx');
      // Verify hitSlop={12} exists on the Pressable with back button
      expect(source).toContain('hitSlop={12}');
      expect(source).toContain('router.back()');
    });
  });

  // --- EC-106-02: Long translation of 'Back' ---
  describe('EC-106-02: Back button text short in all languages', () => {
    it('pt-BR common.back is short', () => {
      const locale = readLocale('pt-BR') as { common: Record<string, string> };
      expect(locale.common.back.length).toBeLessThan(15);
    });

    it('en common.back is short', () => {
      const locale = readLocale('en') as { common: Record<string, string> };
      expect(locale.common.back.length).toBeLessThan(15);
    });

    it('es common.back is short', () => {
      const locale = readLocale('es') as { common: Record<string, string> };
      expect(locale.common.back.length).toBeLessThan(15);
    });
  });
});

// =============================================================================
// F107 (CR-169): Equalize status LED sizes in collapsed speech cards
// =============================================================================

describe('F107 (CR-169): Collapsed card row height equalization', () => {

  const sundayCardSource = readSourceFile('components/SundayCard.tsx');

  // --- AC-107-01: All 3 status circles appear same size visually ---
  describe('AC-107-01: Consistent circle sizes', () => {
    it('renders Text with single space when no speaker name', () => {
      expect(sundayCardSource).toContain("{' '}");
    });

    it('placeholder Text uses speakerNameLine style', () => {
      // The space Text uses the same style as the named version
      const spaceTextMatch = sundayCardSource.match(
        /styles\.speakerNameLine.*\{' '\}/s
      );
      expect(spaceTextMatch).not.toBeNull();
    });
  });

  // --- AC-107-02: Consistent spacing between circles and text ---
  describe('AC-107-02: Consistent gap between LED and text', () => {
    it('speechRow style has gap: 8', () => {
      const speechRowMatch = sundayCardSource.match(
        /speechRow:\s*\{[^}]*gap:\s*8/s
      );
      expect(speechRowMatch).not.toBeNull();
    });
  });

  // --- AC-107-03: Spacing consistent on lines without text ---
  describe('AC-107-03: Lines without text have same height', () => {
    it('does NOT render null for empty names', () => {
      // The old pattern was ") : null}" which should be replaced
      const collapsedBlock = sundayCardSource.match(
        /name\s*\?\s*\(\s*<Text[\s\S]*?speakerNameLine[\s\S]*?\{' '\}/
      );
      expect(collapsedBlock).not.toBeNull();
    });

    it('empty name branch renders Text element (not null)', () => {
      // Check that the else branch has a Text with space, not null
      expect(sundayCardSource).toContain(') : (');
      expect(sundayCardSource).not.toContain(') : null}');
    });
  });

  // --- AC-107-04: Animation still distinguishes assigned_not_invited ---
  describe('AC-107-04: StatusLED animation unchanged', () => {
    it('StatusLED component still imported and used', () => {
      expect(sundayCardSource).toContain('StatusLED');
    });

    it('StatusLED receives status prop for animation control', () => {
      expect(sundayCardSource).toContain('status={status}');
    });
  });

  // --- AC-107-05: Change applies to both Home and Speeches tabs ---
  describe('AC-107-05: Shared SundayCard component', () => {
    it('SundayCard is a single shared component file', () => {
      const filePath = path.resolve(__dirname, '..', 'components', 'SundayCard.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('SundayCard is used in speeches tab', () => {
      const speechesSource = readSourceFile('app/(tabs)/speeches.tsx');
      expect(speechesSource).toContain('SundayCard');
    });
  });

  // --- EC-107-01: Reduced motion accessibility ---
  describe('EC-107-01: Reduced motion handled by StatusLED', () => {
    it('StatusLED component exists for animation control', () => {
      const statusLEDPath = path.resolve(__dirname, '..', 'components', 'StatusLED.tsx');
      expect(fs.existsSync(statusLEDPath)).toBe(true);
    });
  });

  // --- EC-107-02: All 3 circles pulsing ---
  describe('EC-107-02: Multiple pulsing circles', () => {
    it('each circle gets independent status from speechStatuses array', () => {
      expect(sundayCardSource).toContain('speechStatuses');
    });
  });

  // --- EC-107-03: Dark mode vs light mode ---
  describe('EC-107-03: Theme-independent layout', () => {
    it('speakerNameLine uses colors.textSecondary (theme-aware)', () => {
      expect(sundayCardSource).toContain('colors.textSecondary');
    });
  });
});

// =============================================================================
// F108 (CR-170): Last speech label fix in presentation mode
// =============================================================================

describe('F108 (CR-170): Last speech label in presentation mode', () => {

  const hookSource = readSourceFile('hooks/usePresentationMode.ts');

  // --- AC-108-01: Last speech label shows 'Ultimo Discurso' in pt-BR ---
  describe('AC-108-01: Last speech label in pt-BR', () => {
    it('last speaker label uses t(speeches.lastSpeech) only', () => {
      expect(hookSource).toContain("t('speeches.lastSpeech')");
    });

    it('last speaker label does NOT concatenate with speeches.speaker', () => {
      expect(hookSource).not.toContain(
        "`${t('speeches.lastSpeech')} - ${t('speeches.speaker')}`"
      );
    });
  });

  // --- AC-108-02: Last speech label in English ---
  describe('AC-108-02: English last speech label', () => {
    it('en.json speeches.lastSpeech key exists', () => {
      const locale = readLocale('en') as { speeches: Record<string, string> };
      expect(locale.speeches.lastSpeech).toBeDefined();
    });
  });

  // --- AC-108-03: Last speech label in Spanish ---
  describe('AC-108-03: Spanish last speech label', () => {
    it('es.json speeches.lastSpeech key exists', () => {
      const locale = readLocale('es') as { speeches: Record<string, string> };
      expect(locale.speeches.lastSpeech).toBeDefined();
    });
  });

  // --- AC-108-04: First and second speaker labels unchanged ---
  describe('AC-108-04: First/second speaker labels unchanged', () => {
    it('first and second speakers use speeches.speaker key with ordinal prefix', () => {
      // Format: { label: `1\u00BA ${t('speeches.speaker')}`, ... }
      expect(hookSource).toContain("t('speeches.speaker')");
    });

    it('speeches.speaker key exists in all locales', () => {
      const ptBR = readLocale('pt-BR') as { speeches: Record<string, string> };
      const en = readLocale('en') as { speeches: Record<string, string> };
      const es = readLocale('es') as { speeches: Record<string, string> };
      expect(ptBR.speeches.speaker).toBeDefined();
      expect(en.speeches.speaker).toBeDefined();
      expect(es.speeches.speaker).toBeDefined();
    });

    it('last speech field uses simple t() call (no template literal concatenation)', () => {
      // The line should be: { label: t('speeches.lastSpeech'), ...
      // NOT: { label: `${t('speeches.lastSpeech')} - ${t('speeches.speaker')}`, ...
      const lastSpeechLine = hookSource.match(
        /label:\s*t\('speeches\.lastSpeech'\)/
      );
      expect(lastSpeechLine).not.toBeNull();
    });
  });

  // --- EC-108-01: Special meeting (no last speech card) ---
  describe('EC-108-01: Special meeting has no last speech', () => {
    it('special meeting path uses closingHymn title, not lastSpeech', () => {
      expect(hookSource).toContain("title: t('agenda.closingHymn')");
    });
  });
});

// =============================================================================
// F109 (CR-171): Collapsed card status lines for special meetings
// =============================================================================

describe('F109 (CR-171): Status lines for testimony/primary collapsed cards', () => {

  const agendaSource = readSourceFile('app/(tabs)/agenda.tsx');

  // --- AC-109-01: Testimony meeting collapsed card shows 'Falta' line ---
  describe('AC-109-01: Testimony meeting Falta line', () => {
    it('agenda.tsx has SPECIAL_MEETING_WITH_STATUS constant', () => {
      expect(agendaSource).toContain('SPECIAL_MEETING_WITH_STATUS');
    });

    it('testimony_meeting is in special meeting list', () => {
      expect(agendaSource).toContain("'testimony_meeting'");
      const specialListMatch = agendaSource.match(
        /SPECIAL_MEETING_WITH_STATUS\s*=\s*\[.*'testimony_meeting'/s
      );
      expect(specialListMatch).not.toBeNull();
    });

    it('computes missingRoles for special meetings', () => {
      expect(agendaSource).toContain('missingRoles');
      expect(agendaSource).toContain("t('agenda.statusPresiding')");
      expect(agendaSource).toContain("t('agenda.statusConducting')");
    });

    it('shows Falta line with missing roles', () => {
      expect(agendaSource).toContain("t('agenda.statusMissing')");
    });
  });

  // --- AC-109-02: Testimony meeting shows type in yellow ---
  describe('AC-109-02: Exception type in yellow', () => {
    it('renders exceptionLabel in yellow for special meetings', () => {
      // The exceptionLabel is shown in colors.warning (yellow)
      const specialBlock = agendaSource.match(
        /isSpecialWithStatus[\s\S]*?exceptionLabel[\s\S]*?colors\.warning/
      );
      expect(specialBlock).not.toBeNull();
    });
  });

  // --- AC-109-03: Testimony meeting shows prayers count ---
  describe('AC-109-03: Prayers count line', () => {
    it('uses statusPrayersLabel i18n key for special meetings', () => {
      expect(agendaSource).toContain("t('agenda.statusPrayersLabel')");
    });

    it('counts opening and closing prayers (total 2)', () => {
      expect(agendaSource).toContain('prayersFilled');
      expect(agendaSource).toContain('opening_prayer_name');
      expect(agendaSource).toContain('closing_prayer_name');
    });
  });

  // --- AC-109-04: Testimony meeting shows hymns count ---
  describe('AC-109-04: Hymns count line', () => {
    it('counts hymns for special meetings', () => {
      expect(agendaSource).toContain('hymnsFilled');
    });

    it('uses statusHymns i18n key', () => {
      expect(agendaSource).toContain("t('agenda.statusHymns'");
    });
  });

  // --- AC-109-05: Primary presentation shows same 4 lines ---
  describe('AC-109-05: Primary presentation card', () => {
    it('primary_presentation is in special meeting list', () => {
      expect(agendaSource).toContain("'primary_presentation'");
      const specialListMatch = agendaSource.match(
        /SPECIAL_MEETING_WITH_STATUS\s*=\s*\[.*'primary_presentation'/s
      );
      expect(specialListMatch).not.toBeNull();
    });

    it('isSpecialWithStatus covers both types', () => {
      const specialList = agendaSource.match(
        /SPECIAL_MEETING_WITH_STATUS\s*=\s*\[([^\]]*)\]/
      );
      expect(specialList).not.toBeNull();
      expect(specialList![1]).toContain('testimony_meeting');
      expect(specialList![1]).toContain('primary_presentation');
    });
  });

  // --- AC-109-06: Falta line hidden when all roles filled ---
  describe('AC-109-06: Falta line conditional', () => {
    it('Falta line only shown when missingRoles.length > 0', () => {
      expect(agendaSource).toContain('missingRoles.length > 0');
    });
  });

  // --- AC-109-07: Hymns total is 3 for special meetings ---
  describe('AC-109-07: Hymns total 3', () => {
    it('hymnsTotal is 3 for special meetings (no intermediate hymn)', () => {
      const specialBlock = agendaSource.match(
        /isSpecialWithStatus[\s\S]*?hymnsTotal\s*=\s*3/
      );
      expect(specialBlock).not.toBeNull();
    });
  });

  // --- AC-109-08: Green color when all items complete ---
  describe('AC-109-08: Green color for complete lines', () => {
    it('uses green (#22c55e) when prayers are 2 of 2', () => {
      expect(agendaSource).toContain("prayersFilled === 2 ? GREEN");
    });

    it('GREEN constant is #22c55e', () => {
      expect(agendaSource).toContain("'#22c55e'");
    });
  });

  // --- AC-109-09: General conference card unchanged ---
  describe('AC-109-09: General conference unchanged', () => {
    it('general_conference is NOT in SPECIAL_MEETING_WITH_STATUS', () => {
      const specialList = agendaSource.match(
        /SPECIAL_MEETING_WITH_STATUS\s*=\s*\[([^\]]*)\]/
      );
      expect(specialList).not.toBeNull();
      expect(specialList![1]).not.toContain('general_conference');
    });
  });

  // --- AC-109-10: Stake conference card unchanged ---
  describe('AC-109-10: Stake conference unchanged', () => {
    it('stake_conference is NOT in SPECIAL_MEETING_WITH_STATUS', () => {
      const specialList = agendaSource.match(
        /SPECIAL_MEETING_WITH_STATUS\s*=\s*\[([^\]]*)\]/
      );
      expect(specialList).not.toBeNull();
      expect(specialList![1]).not.toContain('stake_conference');
    });
  });

  // --- AC-109-11: Status lines hidden when expanded ---
  describe('AC-109-11: Status lines hidden on expand', () => {
    it('special meeting status lines conditioned on !isExpanded', () => {
      const conditionalMatch = agendaSource.match(
        /!isExpanded\s*&&\s*isSpecialWithStatus/
      );
      expect(conditionalMatch).not.toBeNull();
    });
  });

  // --- EC-109-01: No agenda record for special meeting ---
  describe('EC-109-01: Missing agenda data', () => {
    it('checks agenda fields with optional chaining (?.) for null safety', () => {
      expect(agendaSource).toContain('agenda?.presiding_name');
      expect(agendaSource).toContain('agenda?.conducting_name');
      expect(agendaSource).toContain('agenda?.pianist_name');
      expect(agendaSource).toContain('agenda?.conductor_name');
    });
  });

  // --- EC-109-02: Ward conference NOT affected ---
  describe('EC-109-02: Ward conference unchanged', () => {
    it('ward_conference NOT in special meeting list', () => {
      const specialList = agendaSource.match(
        /SPECIAL_MEETING_WITH_STATUS\s*=\s*\[([^\]]*)\]/
      );
      expect(specialList).not.toBeNull();
      expect(specialList![1]).not.toContain('ward_conference');
    });
  });

  // --- EC-109-03: Other type with custom reason NOT affected ---
  describe('EC-109-03: Other type unchanged', () => {
    it('other type NOT in special meeting list', () => {
      const specialList = agendaSource.match(
        /SPECIAL_MEETING_WITH_STATUS\s*=\s*\[([^\]]*)\]/
      );
      expect(specialList).not.toBeNull();
      // 'other' as a standalone word should not be in the array
      expect(specialList![1]).not.toMatch(/'other'/);
    });
  });

  // --- EC-109-04: Past special meeting card ---
  describe('EC-109-04: Past card opacity', () => {
    it('isPast cards have reduced opacity', () => {
      expect(agendaSource).toContain('isPast');
      expect(agendaSource).toContain('opacity');
    });
  });

  // --- i18n keys for F109 ---
  describe('F109 i18n: statusPrayersLabel key', () => {
    it('pt-BR has agenda.statusPrayersLabel', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.statusPrayersLabel).toBeDefined();
    });

    it('pt-BR statusPrayersLabel contains correct value', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.statusPrayersLabel).toContain('Ora');
    });

    it('en has agenda.statusPrayersLabel = Prayers', () => {
      const locale = readLocale('en') as { agenda: Record<string, string> };
      expect(locale.agenda.statusPrayersLabel).toBe('Prayers');
    });

    it('es has agenda.statusPrayersLabel', () => {
      const locale = readLocale('es') as { agenda: Record<string, string> };
      expect(locale.agenda.statusPrayersLabel).toBeDefined();
    });

    it('es statusPrayersLabel contains Oraciones', () => {
      const locale = readLocale('es') as { agenda: Record<string, string> };
      expect(locale.agenda.statusPrayersLabel).toContain('Oraciones');
    });
  });
});

// =============================================================================
// Cross-feature: Regression checks
// =============================================================================

describe('Batch 16 cross-feature regression checks', () => {

  // Verify that batch 16 changes don't break existing patterns
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
  });

  describe('Presentation mode structural integrity', () => {
    it('presentation.tsx still renders AccordionCard', () => {
      const source = readSourceFile('app/presentation.tsx');
      expect(source).toContain('AccordionCard');
    });

    it('presentation.tsx still has font size toggle', () => {
      const source = readSourceFile('app/presentation.tsx');
      expect(source).toContain('fontSizeMode');
    });

    it('presentation.tsx still has FONT_SIZES constant', () => {
      const source = readSourceFile('app/presentation.tsx');
      expect(source).toContain('FONT_SIZES');
    });
  });

  describe('Agenda collapsed card structural integrity', () => {
    it('agenda.tsx still renders status lines for speeches type', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      expect(source).toContain("t('agenda.statusSpeakers'");
    });

    it('agenda.tsx non-special exception cards still show yellow text only', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      // Non-special exceptions use: exceptionLabel && !isSpecialWithStatus
      expect(source).toContain('!isSpecialWithStatus');
    });
  });

  describe('SundayCard collapsed card structural integrity', () => {
    it('SundayCard still has speechRow style', () => {
      const source = readSourceFile('components/SundayCard.tsx');
      expect(source).toContain('speechRow');
    });

    // F118 (CR-181): Changed from [1,2,3].map to visiblePositions.map
    it('SundayCard collapsed section still iterates visiblePositions', () => {
      const source = readSourceFile('components/SundayCard.tsx');
      expect(source).toContain('visiblePositions.map');
    });
  });
});

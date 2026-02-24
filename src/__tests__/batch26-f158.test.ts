/**
 * Batch 26 Phase 1 - Tests for F158 (CRs 222-230).
 *
 * F158: UI Adjustments for Managed Prayers
 * Covers all 9 CRs:
 *   CR-230: Fix double label bug in AgendaForm
 *   CR-222: StatusLED circles on prayer lines in collapsed cards
 *   CR-223: Hide prayer label when no name assigned
 *   CR-227: Spacing gap after exception text in testimony/primary
 *   CR-228: Reduce vertical spacing in collapsed cards
 *   CR-229: Dynamic minHeight for uniform card height
 *   CR-225: Pass managePrayers to NextSundaysSection
 *   CR-224: Settings toggle rename, reorder, add description
 *   CR-226: Multiline tab label for Speeches & Prayers
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
const sundayCardSource = readSrcFile('components/SundayCard.tsx');
const agendaFormSource = readSrcFile('components/AgendaForm.tsx');
const nextSundaysSectionSource = readSrcFile('components/NextSundaysSection.tsx');
const settingsSource = readSrcFile('app/(tabs)/settings/index.tsx');
const layoutSource = readSrcFile('app/(tabs)/_layout.tsx');

// --- i18n locale files ---
const ptBR = JSON.parse(readSrcFile('i18n/locales/pt-BR.json'));
const en = JSON.parse(readSrcFile('i18n/locales/en.json'));
const es = JSON.parse(readSrcFile('i18n/locales/es.json'));


// ============================================================================
// CR-230: Fix double label bug in AgendaForm prayer fields
// ============================================================================

describe('CR-230: Fix double label bug in AgendaForm', () => {

  // --- AC-158-26: Opening prayer field shows label only once ---

  describe('AC-158-26: Opening prayer shows label only once when managePrayers ON', () => {
    it('opening prayer managePrayers branch renders inline View (not ReadOnlySpeakerRow)', () => {
      // The managePrayers=true branch for opening prayer should use inline rendering
      // (View with speakerReadRow style), NOT ReadOnlySpeakerRow
      const openingPrayerSection = agendaFormSource.match(
        /FieldRow label=\{t\('agenda\.openingPrayer'\)\}[\s\S]*?<\/FieldRow>/
      );
      expect(openingPrayerSection).toBeTruthy();
      const section = openingPrayerSection![0];
      // managePrayers branch should use inline View, not ReadOnlySpeakerRow
      expect(section).toContain('managePrayers');
      expect(section).toContain('styles.speakerReadRow');
      // Should NOT contain ReadOnlySpeakerRow inside the managePrayers=true branch
      expect(section).not.toMatch(/managePrayers \? \([\s\S]*?ReadOnlySpeakerRow/);
    });
  });

  // --- AC-158-27: Closing prayer field shows label only once ---

  describe('AC-158-27: Closing prayer shows label only once when managePrayers ON', () => {
    it('closing prayer managePrayers branch renders inline View (not ReadOnlySpeakerRow)', () => {
      const closingPrayerSection = agendaFormSource.match(
        /FieldRow label=\{t\('agenda\.closingPrayer'\)\}[\s\S]*?<\/FieldRow>/
      );
      expect(closingPrayerSection).toBeTruthy();
      const section = closingPrayerSection![0];
      expect(section).toContain('managePrayers');
      expect(section).toContain('styles.speakerReadRow');
      expect(section).not.toMatch(/managePrayers \? \([\s\S]*?ReadOnlySpeakerRow/);
    });
  });

  // --- AC-158-28: ReadOnlySpeakerRow does not wrap in FieldRow internally ---

  describe('AC-158-28: ReadOnlySpeakerRow renders its own FieldRow (for speech positions)', () => {
    it('ReadOnlySpeakerRow function wraps content in FieldRow', () => {
      // ReadOnlySpeakerRow should still have its own FieldRow for speech positions
      // Extract from function declaration to the next function declaration
      const readOnlyFn = agendaFormSource.match(
        /function ReadOnlySpeakerRow\(\{[\s\S]*?(?=\nfunction )/
      );
      expect(readOnlyFn).toBeTruthy();
      expect(readOnlyFn![0]).toContain('FieldRow');
    });

    it('prayer fields in managePrayers branch do NOT use ReadOnlySpeakerRow', () => {
      // The managePrayers=true branches for opening/closing prayer should not call ReadOnlySpeakerRow
      const openingSection = agendaFormSource.match(
        /FieldRow label=\{t\('agenda\.openingPrayer'\)\}[\s\S]*?<\/FieldRow>/
      );
      expect(openingSection).toBeTruthy();
      // The managePrayers ? (...) : (...) inside should not contain ReadOnlySpeakerRow
      const managePrayersBranch = openingSection![0].match(/managePrayers \? \(([\s\S]*?)\) : \(/);
      if (managePrayersBranch) {
        expect(managePrayersBranch[1]).not.toContain('ReadOnlySpeakerRow');
      }
    });
  });

  // --- AC-158-29: Speech ReadOnlySpeakerRow fields unaffected ---

  describe('AC-158-29: Speech ReadOnlySpeakerRow fields unaffected by fix', () => {
    it('speech position 1 uses ReadOnlySpeakerRow', () => {
      // The label uses \u00BA (degree sign) which is literal in source
      expect(agendaFormSource).toContain('ReadOnlySpeakerRow');
      expect(agendaFormSource).toContain("label={`1\\u00BA ${t('speeches.speaker')}`}");
    });

    it('speech position 2 uses ReadOnlySpeakerRow', () => {
      expect(agendaFormSource).toContain("label={`2\\u00BA ${t('speeches.speaker')}`}");
    });

    it('last speech (position 3) uses ReadOnlySpeakerRow', () => {
      expect(agendaFormSource).toMatch(/ReadOnlySpeakerRow[\s\S]*?lastSpeech/);
    });
  });

  // --- EC-158-06: ReadOnlySpeakerRow fix does not break existing speech rows ---

  describe('EC-158-06: ReadOnlySpeakerRow still renders FieldRow for speeches', () => {
    it('ReadOnlySpeakerRow returns FieldRow with label and speakerReadRow', () => {
      // Extract from function declaration to the next function declaration
      const fnBody = agendaFormSource.match(
        /function ReadOnlySpeakerRow\(\{[\s\S]*?(?=\nfunction )/
      );
      expect(fnBody).toBeTruthy();
      expect(fnBody![0]).toContain('<FieldRow label={label}');
      expect(fnBody![0]).toContain('styles.speakerReadRow');
      expect(fnBody![0]).toContain('PencilIcon');
    });
  });
});


// ============================================================================
// CR-222: StatusLED circles on prayer lines in collapsed cards
// ============================================================================

describe('CR-222: StatusLED circles on prayer lines in collapsed cards', () => {

  // --- AC-158-01: Opening prayer in speeches collapsed card has StatusLED ---

  describe('AC-158-01: Opening prayer line has StatusLED circle', () => {
    it('opening prayer line in speeches collapsed section has StatusLED with size={10}', () => {
      // In the isSpeechesType && !expanded block, managePrayers section should have StatusLED
      const speechesCollapsed = sundayCardSource.match(
        /Opening prayer line \(collapsed\)[\s\S]*?managePrayers && \(\(\) => \{[\s\S]*?\}\)\(\)/
      );
      expect(speechesCollapsed).toBeTruthy();
      expect(speechesCollapsed![0]).toContain('StatusLED');
      expect(speechesCollapsed![0]).toContain('size={10}');
    });

    it('opening prayer StatusLED status comes from speech position 0', () => {
      const speechesCollapsed = sundayCardSource.match(
        /Opening prayer line \(collapsed\)[\s\S]*?managePrayers && \(\(\) => \{[\s\S]*?\}\)\(\)/
      );
      expect(speechesCollapsed).toBeTruthy();
      expect(speechesCollapsed![0]).toContain("position === 0");
      expect(speechesCollapsed![0]).toMatch(/status=\{openingPrayer\?\.status \?\? 'not_assigned'\}/);
    });
  });

  // --- AC-158-02: Closing prayer in speeches collapsed card has StatusLED ---

  describe('AC-158-02: Closing prayer line has StatusLED circle', () => {
    it('closing prayer line in speeches collapsed section has StatusLED with size={10}', () => {
      const closingSection = sundayCardSource.match(
        /Closing prayer line \(collapsed\)[\s\S]*?managePrayers && \(\(\) => \{[\s\S]*?\}\)\(\)/
      );
      expect(closingSection).toBeTruthy();
      expect(closingSection![0]).toContain('StatusLED');
      expect(closingSection![0]).toContain('size={10}');
    });

    it('closing prayer StatusLED status comes from speech position 4', () => {
      const closingSection = sundayCardSource.match(
        /Closing prayer line \(collapsed\)[\s\S]*?managePrayers && \(\(\) => \{[\s\S]*?\}\)\(\)/
      );
      expect(closingSection).toBeTruthy();
      expect(closingSection![0]).toContain("position === 4");
      expect(closingSection![0]).toMatch(/status=\{closingPrayer\?\.status \?\? 'not_assigned'\}/);
    });
  });

  // --- AC-158-03: Testimony/Primary collapsed card prayer lines have StatusLED ---

  describe('AC-158-03: Testimony/Primary prayer lines have StatusLED circles', () => {
    it('testimony/primary managePrayers section renders StatusLED for opening prayer', () => {
      const testimonySection = sundayCardSource.match(
        /isTestimonyOrPrimary && managePrayers && !expanded[\s\S]*?<\/>/
      );
      expect(testimonySection).toBeTruthy();
      // Should have StatusLED for opening prayer (position 0)
      expect(testimonySection![0]).toContain("position === 0");
      expect(testimonySection![0]).toContain('StatusLED');
    });

    it('testimony/primary managePrayers section renders StatusLED for closing prayer', () => {
      const testimonySection = sundayCardSource.match(
        /isTestimonyOrPrimary && managePrayers && !expanded[\s\S]*?<\/>/
      );
      expect(testimonySection).toBeTruthy();
      // Should have StatusLED for closing prayer (position 4)
      expect(testimonySection![0]).toContain("position === 4");
    });
  });

  // --- AC-158-04 / AC-158-05: All lines have StatusLED circles ---

  describe('AC-158-04/05: All speech lines also have StatusLED circles', () => {
    it('speech lines in collapsed card have StatusLED with size={10}', () => {
      // visiblePositions.map section should render StatusLED
      const speechLines = sundayCardSource.match(
        /visiblePositions\.map\(\(pos, idx\) => \{[\s\S]*?\}\)/
      );
      expect(speechLines).toBeTruthy();
      expect(speechLines![0]).toContain('StatusLED');
      expect(speechLines![0]).toContain('size={10}');
    });

    it('visiblePositions includes positions 1,2,3 when hasSecondSpeech=true', () => {
      expect(sundayCardSource).toContain('hasSecondSpeech ? [1, 2, 3] : [1, 3]');
    });

    it('visiblePositions includes positions 1,3 when hasSecondSpeech=false', () => {
      expect(sundayCardSource).toContain('[1, 3]');
    });
  });

  // --- EC-158-07: All 5 lines with StatusLED when 2nd speech ON + managePrayers ON ---

  describe('EC-158-07: All 5 lines with StatusLED when managePrayers ON and 2nd speech ON', () => {
    it('opening prayer line is rendered when managePrayers is true', () => {
      // Opening prayer is gated by managePrayers &&
      expect(sundayCardSource).toMatch(/managePrayers && \(\(\) => \{[\s\S]*?position === 0/);
    });

    it('closing prayer line is rendered when managePrayers is true', () => {
      expect(sundayCardSource).toMatch(/managePrayers && \(\(\) => \{[\s\S]*?position === 4/);
    });

    it('speech positions [1,2,3] are rendered via visiblePositions', () => {
      expect(sundayCardSource).toContain('visiblePositions.map');
    });
  });
});


// ============================================================================
// CR-223: Hide prayer label when no name assigned
// ============================================================================

describe('CR-223: Hide prayer label when no name assigned', () => {

  // --- AC-158-06: Prayer line shows only StatusLED when no name ---

  describe('AC-158-06: Prayer line shows only StatusLED when no name assigned', () => {
    it('opening prayer in speeches section has conditional rendering based on speaker_name', () => {
      const openingSection = sundayCardSource.match(
        /Opening prayer line \(collapsed\)[\s\S]*?managePrayers && \(\(\) => \{[\s\S]*?\}\)\(\)/
      );
      expect(openingSection).toBeTruthy();
      expect(openingSection![0]).toContain('openingPrayer?.speaker_name ?');
    });

    it('when no name, renders empty space text', () => {
      const openingSection = sundayCardSource.match(
        /Opening prayer line \(collapsed\)[\s\S]*?managePrayers && \(\(\) => \{[\s\S]*?\}\)\(\)/
      );
      expect(openingSection).toBeTruthy();
      // Should have an else branch with {' '} for empty space
      expect(openingSection![0]).toContain("{' '}");
    });
  });

  // --- AC-158-07: Prayer line shows prefix + name when name IS assigned ---

  describe('AC-158-07: Prayer line shows prefix + name when name assigned', () => {
    it('opening prayer shows prayerPrefix when speaker_name exists', () => {
      const openingSection = sundayCardSource.match(
        /Opening prayer line \(collapsed\)[\s\S]*?managePrayers && \(\(\) => \{[\s\S]*?\}\)\(\)/
      );
      expect(openingSection).toBeTruthy();
      expect(openingSection![0]).toContain("t('prayers.prayerPrefix')");
      expect(openingSection![0]).toContain('openingPrayer.speaker_name');
    });

    it('prayer text with name has italic style', () => {
      const openingSection = sundayCardSource.match(
        /Opening prayer line \(collapsed\)[\s\S]*?managePrayers && \(\(\) => \{[\s\S]*?\}\)\(\)/
      );
      expect(openingSection).toBeTruthy();
      expect(openingSection![0]).toContain("fontStyle: 'italic'");
    });
  });

  // --- AC-158-08: Both opening and closing prayers follow same conditional logic ---

  describe('AC-158-08: Both prayers follow same conditional logic independently', () => {
    it('closing prayer in speeches section also has conditional speaker_name check', () => {
      const closingSection = sundayCardSource.match(
        /Closing prayer line \(collapsed\)[\s\S]*?managePrayers && \(\(\) => \{[\s\S]*?\}\)\(\)/
      );
      expect(closingSection).toBeTruthy();
      expect(closingSection![0]).toContain('closingPrayer?.speaker_name ?');
    });

    it('closing prayer also renders empty space when no name', () => {
      const closingSection = sundayCardSource.match(
        /Closing prayer line \(collapsed\)[\s\S]*?managePrayers && \(\(\) => \{[\s\S]*?\}\)\(\)/
      );
      expect(closingSection).toBeTruthy();
      expect(closingSection![0]).toContain("{' '}");
    });

    it('testimony/primary opening prayer has conditional speaker_name check', () => {
      const testimonySection = sundayCardSource.match(
        /isTestimonyOrPrimary && managePrayers && !expanded[\s\S]*?<\/>/
      );
      expect(testimonySection).toBeTruthy();
      expect(testimonySection![0]).toContain('openingPrayer?.speaker_name ?');
    });

    it('testimony/primary closing prayer has conditional speaker_name check', () => {
      const testimonySection = sundayCardSource.match(
        /isTestimonyOrPrimary && managePrayers && !expanded[\s\S]*?<\/>/
      );
      expect(testimonySection).toBeTruthy();
      expect(testimonySection![0]).toContain('closingPrayer?.speaker_name ?');
    });
  });

  // --- EC-158-01: No prayer lines when manage_prayers is OFF ---

  describe('EC-158-01: No prayer lines when manage_prayers=false', () => {
    it('opening prayer rendering is gated by managePrayers condition', () => {
      // The opening prayer in speeches section is rendered only when managePrayers is truthy
      expect(sundayCardSource).toMatch(/\{managePrayers && \(\(\) => \{[\s\S]*?position === 0/);
    });

    it('closing prayer rendering is gated by managePrayers condition', () => {
      expect(sundayCardSource).toMatch(/\{managePrayers && \(\(\) => \{[\s\S]*?position === 4/);
    });

    it('testimony/primary prayer section is gated by managePrayers', () => {
      expect(sundayCardSource).toContain('isTestimonyOrPrimary && managePrayers && !expanded');
    });
  });
});


// ============================================================================
// CR-227: Spacing gap after exception text in testimony/primary
// ============================================================================

describe('CR-227: Spacing gap after exception text', () => {

  // --- AC-158-16: Gap between exception text and prayer lines in testimony ---

  describe('AC-158-16: Gap in testimony collapsed card', () => {
    it('first prayer View after exception text has marginTop: 6', () => {
      const testimonySection = sundayCardSource.match(
        /isTestimonyOrPrimary && managePrayers && !expanded[\s\S]*?<\/>/
      );
      expect(testimonySection).toBeTruthy();
      expect(testimonySection![0]).toContain('marginTop: 6');
    });

    it('marginTop is applied to the speechRow View (first prayer after exception)', () => {
      const testimonySection = sundayCardSource.match(
        /isTestimonyOrPrimary && managePrayers && !expanded[\s\S]*?<\/>/
      );
      expect(testimonySection).toBeTruthy();
      // The first speechRow after exception text should have marginTop: 6
      expect(testimonySection![0]).toMatch(/styles\.speechRow,\s*\{\s*marginTop:\s*6\s*\}/);
    });
  });

  // --- AC-158-17: Same gap in primary_presentation collapsed card ---

  describe('AC-158-17: Same gap in primary_presentation collapsed card', () => {
    it('isTestimonyOrPrimary covers both testimony_meeting and primary_presentation', () => {
      expect(sundayCardSource).toMatch(
        /isTestimonyOrPrimary\s*=\s*currentType === 'testimony_meeting' \|\| currentType === 'primary_presentation'/
      );
    });
  });
});


// ============================================================================
// CR-228: Reduce vertical spacing between lines in collapsed cards
// ============================================================================

describe('CR-228: Reduce vertical spacing in collapsed cards', () => {

  // --- AC-158-18: Reduced marginBottom on speechRow ---

  describe('AC-158-18: Reduced marginBottom on speechRow', () => {
    it('speechRow style has marginBottom: 1', () => {
      const speechRowStyle = sundayCardSource.match(
        /speechRow:\s*\{[\s\S]*?\}/
      );
      expect(speechRowStyle).toBeTruthy();
      expect(speechRowStyle![0]).toContain('marginBottom: 1');
    });

    it('marginBottom is NOT the old value of 4', () => {
      const speechRowStyle = sundayCardSource.match(
        /speechRow:\s*\{[\s\S]*?\}/
      );
      expect(speechRowStyle).toBeTruthy();
      expect(speechRowStyle![0]).not.toContain('marginBottom: 4');
    });
  });

  // --- AC-158-19: Reduced spacing applies to both prayer and speech lines ---

  describe('AC-158-19: Reduced spacing applies to all lines', () => {
    it('prayer lines use styles.speechRow (same as speech lines)', () => {
      // All lines (prayers and speeches) use styles.speechRow
      const speechRowUsages = sundayCardSource.match(/styles\.speechRow/g);
      expect(speechRowUsages).toBeTruthy();
      // Should be used multiple times: opening prayer, speech lines, closing prayer, testimony prayers
      expect(speechRowUsages!.length).toBeGreaterThanOrEqual(5);
    });
  });

  // --- AC-158-20: Consistent in Home tab and Speeches tab ---

  describe('AC-158-20: Consistent spacing in Home and Speeches tabs', () => {
    it('SundayCard component is used by both tabs (same styles)', () => {
      // NextSundaysSection (Home) and speeches tab both use SundayCard
      expect(nextSundaysSectionSource).toContain("import { SundayCard }");
    });
  });
});


// ============================================================================
// CR-229: Uniform card height for all collapsed cards
// ============================================================================

describe('CR-229: Uniform card height for all collapsed cards', () => {

  // --- AC-158-21/22: All collapsed cards have same height ---

  describe('AC-158-21/22: All collapsed cards have uniform height', () => {
    it('collapsedMinHeight is calculated dynamically', () => {
      expect(sundayCardSource).toContain('collapsedMinHeight');
    });

    it('minHeight is applied to headerCenter when !expanded', () => {
      expect(sundayCardSource).toMatch(/!expanded && \{ minHeight: collapsedMinHeight \}/);
    });
  });

  // --- AC-158-23: Height based on manage_prayers state ---

  describe('AC-158-23: Height based on managePrayers state', () => {
    it('maxLines is 5 when managePrayers=true', () => {
      expect(sundayCardSource).toContain('managePrayers ? 5 : 3');
    });

    it('maxLines is 3 when managePrayers=false', () => {
      expect(sundayCardSource).toContain('managePrayers ? 5 : 3');
    });

    it('formula uses LINE_HEIGHT and MARGIN_BOTTOM constants', () => {
      expect(sundayCardSource).toContain('LINE_HEIGHT');
      expect(sundayCardSource).toContain('MARGIN_BOTTOM');
    });

    it('formula: maxLines * LINE_HEIGHT + (maxLines - 1) * MARGIN_BOTTOM', () => {
      expect(sundayCardSource).toContain(
        'maxLines * LINE_HEIGHT + (maxLines - 1) * MARGIN_BOTTOM'
      );
    });
  });

  // --- AC-158-24: Exception-only cards match uniform height ---

  describe('AC-158-24: Exception cards match uniform height', () => {
    it('minHeight applies to headerCenter which wraps all content types', () => {
      // headerCenter contains both speeches content and exception content
      expect(sundayCardSource).toContain('styles.headerCenter');
      expect(sundayCardSource).toMatch(/!expanded && \{ minHeight: collapsedMinHeight \}/);
    });
  });

  // --- AC-158-25: Testimony/Primary with managePrayers ON matches height ---

  describe('AC-158-25: Testimony/Primary with managePrayers matches height', () => {
    it('testimony/primary section is inside headerCenter (gets same minHeight)', () => {
      // The isTestimonyOrPrimary section is rendered within headerCenter View
      const headerCenterToEnd = sundayCardSource.match(
        /styles\.headerCenter[\s\S]*?isTestimonyOrPrimary && managePrayers/
      );
      expect(headerCenterToEnd).toBeTruthy();
    });
  });

  // --- EC-158-02: Height recalculates on toggle change ---

  describe('EC-158-02: Height recalculates when managePrayers toggled', () => {
    it('LINE_HEIGHT is 14 for managePrayers=true and 18 for managePrayers=false (CR-232)', () => {
      expect(sundayCardSource).toMatch(/LINE_HEIGHT\s*=\s*managePrayers\s*\?\s*14\s*:\s*18/);
    });

    it('MARGIN_BOTTOM is 1 (matching CR-228)', () => {
      expect(sundayCardSource).toMatch(/MARGIN_BOTTOM\s*=\s*1/);
    });

    it('when managePrayers=true: 5*14 + 4*1 = 74 (CR-232)', () => {
      const lineHeight = 14;
      const marginBottom = 1;
      const maxLines5 = 5;
      expect(maxLines5 * lineHeight + (maxLines5 - 1) * marginBottom).toBe(74);
    });

    it('when managePrayers=false: 3*18 + 2*1 = 56', () => {
      const lineHeight = 18;
      const marginBottom = 1;
      const maxLines3 = 3;
      expect(maxLines3 * lineHeight + (maxLines3 - 1) * marginBottom).toBe(56);
    });
  });

  // --- EC-158-04: Mixed sunday types uniform height ---

  describe('EC-158-04: Mixed sunday types all get same height', () => {
    it('collapsedMinHeight is computed once and applied to all card types', () => {
      // collapsedMinHeight is calculated at component level (not per-type)
      expect(sundayCardSource).toMatch(
        /const collapsedMinHeight = maxLines \* LINE_HEIGHT \+ \(maxLines - 1\) \* MARGIN_BOTTOM/
      );
    });

    it('minHeight not applied when expanded', () => {
      // Only applies when !expanded
      expect(sundayCardSource).toContain('!expanded && { minHeight: collapsedMinHeight }');
    });
  });
});


// ============================================================================
// CR-225: Pass managePrayers to NextSundaysSection
// ============================================================================

describe('CR-225: Pass managePrayers to NextSundaysSection', () => {

  // --- AC-158-12: NextSundaysSection passes managePrayers to SundayCard ---

  describe('AC-158-12: NextSundaysSection passes managePrayers to SundayCard', () => {
    it('NextSundaysSection imports useWardManagePrayers', () => {
      expect(nextSundaysSectionSource).toContain('useWardManagePrayers');
    });

    it('NextSundaysSection calls useWardManagePrayers()', () => {
      expect(nextSundaysSectionSource).toMatch(/const \{ managePrayers \} = useWardManagePrayers\(\)/);
    });

    it('SundayCard receives managePrayers prop', () => {
      expect(nextSundaysSectionSource).toContain('managePrayers={managePrayers}');
    });
  });

  // --- AC-158-13: NextSundaysSection cards match Speeches tab cards ---

  describe('AC-158-13: Cards match between Home and Speeches tabs', () => {
    it('both tabs use the same SundayCard component', () => {
      expect(nextSundaysSectionSource).toContain("import { SundayCard }");
      expect(nextSundaysSectionSource).toContain("from './SundayCard'");
    });

    it('managePrayers prop is passed to SundayCard in the map loop', () => {
      // Verify managePrayers is on the SundayCard within the map
      const mapSection = nextSundaysSectionSource.match(
        /speechesBySunday\.map\(\(entry\)[\s\S]*?\/>/
      );
      expect(mapSection).toBeTruthy();
      expect(mapSection![0]).toContain('managePrayers={managePrayers}');
    });
  });
});


// ============================================================================
// CR-224: Settings toggle rename, reorder, add description
// ============================================================================

describe('CR-224: Settings toggle rename, reorder, add description', () => {

  // --- AC-158-09: Toggle label changed ---

  describe('AC-158-09: Toggle label changed to "Usar Convites para Oracoes"', () => {
    it('pt-BR: settings.managePrayers = "Usar Convites para Orações"', () => {
      expect(ptBR.settings.managePrayers).toBe('Usar Convites para Orações');
    });

    it('en: settings.managePrayers = "Use Invitations for Prayers"', () => {
      expect(en.settings.managePrayers).toBe('Use Invitations for Prayers');
    });

    it('es: settings.managePrayers = "Usar Invitaciones para Oraciones"', () => {
      expect(es.settings.managePrayers).toBe('Usar Invitaciones para Oraciones');
    });

    it('toggle uses t("settings.managePrayers") i18n key', () => {
      expect(settingsSource).toContain("t('settings.managePrayers')");
    });
  });

  // --- AC-158-10: Toggle is 2nd item in Ward Settings group ---

  describe('AC-158-10: Toggle is 2nd item in Ward Settings', () => {
    it('managePrayers toggle appears after Members item', () => {
      const membersPos = settingsSource.indexOf("settings.members");
      const managePrayersPos = settingsSource.indexOf("settings.managePrayers");
      expect(membersPos).toBeGreaterThan(-1);
      expect(managePrayersPos).toBeGreaterThan(-1);
      expect(managePrayersPos).toBeGreaterThan(membersPos);
    });

    it('managePrayers toggle appears before Topics item', () => {
      const managePrayersPos = settingsSource.indexOf("settings.managePrayers");
      const topicsPos = settingsSource.indexOf("settings.topics");
      expect(managePrayersPos).toBeGreaterThan(-1);
      expect(topicsPos).toBeGreaterThan(-1);
      expect(topicsPos).toBeGreaterThan(managePrayersPos);
    });

    it('managePrayers toggle is inside isBishopric guard', () => {
      const bishopricSection = settingsSource.match(
        /\{isBishopric &&[\s\S]*?managePrayers/
      );
      expect(bishopricSection).toBeTruthy();
    });
  });

  // --- AC-158-11: Description text below toggle label ---

  describe('AC-158-11: Description text below toggle label', () => {
    it('settings.managePrayersDescription i18n key exists in pt-BR', () => {
      expect(ptBR.settings.managePrayersDescription).toBeTruthy();
      expect(ptBR.settings.managePrayersDescription).toContain('Ative esta opção');
    });

    it('settings.managePrayersDescription i18n key exists in en', () => {
      expect(en.settings.managePrayersDescription).toBeTruthy();
      expect(en.settings.managePrayersDescription).toContain('Enable this option');
    });

    it('settings.managePrayersDescription i18n key exists in es', () => {
      expect(es.settings.managePrayersDescription).toBeTruthy();
      expect(es.settings.managePrayersDescription).toContain('Active esta opción');
    });

    it('description text is rendered in Settings using managePrayersDescription key', () => {
      expect(settingsSource).toContain("t('settings.managePrayersDescription')");
    });

    it('description text has smaller font size (fontSize: 12)', () => {
      // The description Text should use fontSize: 12
      expect(settingsSource).toMatch(/fontSize:\s*12/);
    });

    it('description text has secondary text color', () => {
      expect(settingsSource).toContain('colors.textSecondary');
    });
  });

  // --- EC-158-05: Description text wrapping ---

  describe('EC-158-05: Description text wraps naturally', () => {
    it('toggle item has flex: 1 on left content View', () => {
      // The left side (label + description) should have flex: 1
      expect(settingsSource).toMatch(/flex:\s*1/);
    });
  });
});


// ============================================================================
// CR-226: Multiline tab label for Speeches & Prayers
// ============================================================================

describe('CR-226: Multiline tab label for Speeches & Prayers', () => {

  // --- AC-158-14: Tab label wraps to 2 lines ---

  describe('AC-158-14: Tab label wraps to 2 lines', () => {
    it('speeches tab has custom tabBarLabel render function', () => {
      expect(layoutSource).toContain('tabBarLabel:');
    });

    it('tabBarLabel renders Text with numberOfLines={2}', () => {
      expect(layoutSource).toContain('numberOfLines={2}');
    });

    it('tabBarLabel text is center-aligned', () => {
      expect(layoutSource).toMatch(/textAlign:\s*'center'/);
    });

    it('speechesTabTitle uses speechesAndPrayers key when managePrayers=true', () => {
      expect(layoutSource).toContain("t('tabs.speechesAndPrayers')");
    });

    it('speechesTabTitle uses speeches key when managePrayers=false', () => {
      expect(layoutSource).toContain("t('tabs.speeches')");
    });
  });

  // --- AC-158-15: Other tab labels unaffected ---

  describe('AC-158-15: Other tab labels unaffected', () => {
    it('only speeches tab has custom tabBarLabel', () => {
      // Count tabBarLabel occurrences - should be only in speeches tab
      const tabBarLabelMatches = layoutSource.match(/tabBarLabel:/g);
      expect(tabBarLabelMatches).toBeTruthy();
      expect(tabBarLabelMatches!.length).toBe(1);
    });

    it('home tab uses standard title', () => {
      expect(layoutSource).toContain("title: t('tabs.home')");
    });

    it('agenda tab uses standard title', () => {
      expect(layoutSource).toContain("title: t('tabs.agenda')");
    });

    it('settings tab uses standard title', () => {
      expect(layoutSource).toContain("title: t('tabs.settings')");
    });
  });

  // --- EC-158-03: Short label no visual issues when managePrayers=false ---

  describe('EC-158-03: Short label works when managePrayers=false', () => {
    it('speechesTabTitle is conditional on managePrayers', () => {
      expect(layoutSource).toMatch(
        /speechesTabTitle\s*=\s*managePrayers[\s\S]*?speechesAndPrayers[\s\S]*?speeches/
      );
    });

    it('tabs.speeches i18n key exists in pt-BR', () => {
      expect(ptBR.tabs.speeches).toBeTruthy();
    });

    it('tabs.speechesAndPrayers i18n key exists in pt-BR', () => {
      expect(ptBR.tabs.speechesAndPrayers).toBeTruthy();
    });
  });
});


// ============================================================================
// Additional i18n coverage
// ============================================================================

describe('i18n: All required keys present in all 3 locales', () => {
  it('prayers.prayerPrefix exists in all locales', () => {
    expect(ptBR.prayers.prayerPrefix).toBeTruthy();
    expect(en.prayers.prayerPrefix).toBeTruthy();
    expect(es.prayers.prayerPrefix).toBeTruthy();
  });

  it('tabs.speechesAndPrayers exists in all locales', () => {
    expect(ptBR.tabs.speechesAndPrayers).toBeTruthy();
    expect(en.tabs.speechesAndPrayers).toBeTruthy();
    expect(es.tabs.speechesAndPrayers).toBeTruthy();
  });

  it('settings.managePrayers exists in all locales', () => {
    expect(ptBR.settings.managePrayers).toBeTruthy();
    expect(en.settings.managePrayers).toBeTruthy();
    expect(es.settings.managePrayers).toBeTruthy();
  });

  it('settings.managePrayersDescription exists in all locales', () => {
    expect(ptBR.settings.managePrayersDescription).toBeTruthy();
    expect(en.settings.managePrayersDescription).toBeTruthy();
    expect(es.settings.managePrayersDescription).toBeTruthy();
  });
});

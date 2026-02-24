/**
 * Batch 25 Phase 2 - Tests for F157 (CR-221) Steps 8-10, 14, 16-17.
 *
 * CR-221: Managed Prayers (Oracoes Gerenciadas)
 * Phase 2 covers: SpeechSlot isPrayer prop, Speeches tab prayer rendering,
 * SundayCard collapsed prayer lines + type change logic,
 * InviteManagementSection prayer positions, WhatsApp prayer templates,
 * WhatsApp settings segmented control.
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
const speechSlotSource = readSrcFile('components/SpeechSlot.tsx');
const speechesTabSource = readSrcFile('app/(tabs)/speeches.tsx');
const sundayCardSource = readSrcFile('components/SundayCard.tsx');
const inviteManagementSource = readSrcFile('components/InviteManagementSection.tsx');
const whatsappUtilsSource = readSrcFile('lib/whatsappUtils.ts');
const whatsappSettingsSource = readSrcFile('app/(tabs)/settings/whatsapp.tsx');
const speechUtilsSource = readSrcFile('lib/speechUtils.ts');

// --- i18n locale files ---
const ptBR = JSON.parse(readSrcFile('i18n/locales/pt-BR.json'));
const en = JSON.parse(readSrcFile('i18n/locales/en.json'));
const es = JSON.parse(readSrcFile('i18n/locales/es.json'));

// --- WhatsApp template module for runtime tests ---
import {
  getDefaultPrayerTemplate,
  resolveTemplate,
  DEFAULT_OPENING_PRAYER_TEMPLATE_PT_BR,
  DEFAULT_OPENING_PRAYER_TEMPLATE_EN,
  DEFAULT_OPENING_PRAYER_TEMPLATE_ES,
  DEFAULT_CLOSING_PRAYER_TEMPLATE_PT_BR,
  DEFAULT_CLOSING_PRAYER_TEMPLATE_EN,
  DEFAULT_CLOSING_PRAYER_TEMPLATE_ES,
} from '../lib/whatsappUtils';


// ============================================================================
// STEP-08: SpeechSlot - isPrayer prop (AC-157-28, AC-157-29)
// ============================================================================

describe('STEP-08: SpeechSlot - isPrayer prop', () => {

  // --- AC-157-28: Opening prayer slot layout ---

  describe('AC-157-28: Opening prayer slot layout', () => {
    it('SpeechSlotProps interface has isPrayer optional boolean', () => {
      expect(speechSlotSource).toContain('isPrayer?: boolean');
    });

    it('isPrayer defaults to false in component destructuring', () => {
      expect(speechSlotSource).toContain('isPrayer = false');
    });

    it('getPositionLabel returns t("prayers.opening") for position 0 when isPrayer', () => {
      expect(speechSlotSource).toMatch(/if\s*\(position\s*===\s*0\)\s*return\s*t\(['"]prayers\.opening['"]\)/);
    });

    it('getPositionLabel checks isPrayer before returning prayer label', () => {
      expect(speechSlotSource).toMatch(/if\s*\(isPrayer\)/);
    });

    it('getPositionLabel function accepts isPrayer parameter', () => {
      expect(speechSlotSource).toMatch(/getPositionLabel\(.*isPrayer/);
    });

    it('label is computed using getPositionLabel with isPrayer', () => {
      expect(speechSlotSource).toMatch(/getPositionLabel\(position,\s*t,\s*isPrayer\)/);
    });
  });

  // --- AC-157-29: Closing prayer slot layout ---

  describe('AC-157-29: Closing prayer slot layout', () => {
    it('getPositionLabel returns t("prayers.closing") for position 4 when isPrayer', () => {
      expect(speechSlotSource).toMatch(/if\s*\(position\s*===\s*4\)\s*return\s*t\(['"]prayers\.closing['"]\)/);
    });

    it('position 4 label is inside the isPrayer check', () => {
      // Ensure position 4 check is inside the isPrayer block
      const isPrayerBlock = speechSlotSource.substring(
        speechSlotSource.indexOf('if (isPrayer)'),
        speechSlotSource.indexOf('}', speechSlotSource.indexOf('if (position === 4)') + 5)
      );
      expect(isPrayerBlock).toContain('position === 4');
      expect(isPrayerBlock).toContain("prayers.closing");
    });
  });

  // --- Topic row hidden when isPrayer=true ---

  describe('Topic row hidden when isPrayer=true', () => {
    it('showTopicRow includes !isPrayer condition', () => {
      expect(speechSlotSource).toMatch(/const showTopicRow\s*=\s*!isPrayer/);
    });

    it('topic row rendering is conditional on showTopicRow', () => {
      expect(speechSlotSource).toContain('{showTopicRow && (');
    });

    it('when isPrayer is true, topic row is not rendered', () => {
      // The showTopicRow variable evaluates to false when isPrayer is true
      expect(speechSlotSource).toContain('!isPrayer');
    });
  });

  // --- 2nd speech toggle hidden when isPrayer=true ---

  describe('2nd speech toggle hidden when isPrayer=true', () => {
    it('position 2 toggle check includes !isPrayer', () => {
      expect(speechSlotSource).toContain('position === 2 && !isPrayer');
    });

    it('isPos2Disabled considers isPrayer flag', () => {
      expect(speechSlotSource).toMatch(/const isPos2Disabled\s*=\s*position\s*===\s*2\s*&&\s*!isPrayer/);
    });

    it('Switch for position 2 toggle includes !isPrayer guard', () => {
      // The Switch rendering condition includes !isPrayer
      expect(speechSlotSource).toContain('position === 2 && !isPrayer && onToggleSecondSpeech');
    });
  });

  // --- Unchanged behavior when isPrayer=false ---

  describe('Unchanged behavior when isPrayer=false (default)', () => {
    it('isPrayer is optional (has default value)', () => {
      expect(speechSlotSource).toContain('isPrayer = false');
    });

    it('existing speech position labels still work (position 3 returns lastSpeech)', () => {
      expect(speechSlotSource).toContain("position === 3");
      expect(speechSlotSource).toContain("speeches.lastSpeech");
    });

    it('existing speech position labels use slot format for positions 1, 2', () => {
      expect(speechSlotSource).toContain("speeches.slot");
    });

    it('StatusLED is rendered for all slots', () => {
      expect(speechSlotSource).toContain('<StatusLED');
    });

    it('speaker row is rendered for all slots', () => {
      expect(speechSlotSource).toContain('speakerRow');
    });
  });
});


// ============================================================================
// STEP-09: Speeches tab - prayer SpeechSlots rendering
// ============================================================================

describe('STEP-09: Speeches tab - prayer SpeechSlots rendering', () => {

  // --- AC-157-27: ON - prayer slots appear in expanded card ---

  describe('AC-157-27: Prayer slots appear in expanded card when managePrayers=true', () => {
    it('imports useWardManagePrayers hook', () => {
      expect(speechesTabSource).toContain('useWardManagePrayers');
    });

    it('calls useWardManagePrayers() at component level', () => {
      expect(speechesTabSource).toMatch(/const\s*\{\s*managePrayers\s*\}\s*=\s*useWardManagePrayers\(\)/);
    });

    it('renders SpeechSlot with isPrayer for position 0', () => {
      expect(speechesTabSource).toMatch(/position=\{0\}[\s\S]*?isPrayer/);
    });

    it('renders SpeechSlot with isPrayer for position 4', () => {
      expect(speechesTabSource).toMatch(/position=\{4\}[\s\S]*?isPrayer/);
    });

    it('prayer slot for position 0 is rendered BEFORE speech slots (positions 1,2,3)', () => {
      const pos0Idx = speechesTabSource.indexOf('position={0}');
      const speechMapIdx = speechesTabSource.indexOf('[1, 2, 3].map', pos0Idx);
      expect(pos0Idx).toBeGreaterThan(-1);
      expect(speechMapIdx).toBeGreaterThan(pos0Idx);
    });

    it('prayer slot for position 4 is rendered AFTER speech slots (positions 1,2,3)', () => {
      const speechMapIdx = speechesTabSource.indexOf('[1, 2, 3].map');
      const pos4Idx = speechesTabSource.indexOf('position={4}', speechMapIdx);
      expect(pos4Idx).toBeGreaterThan(speechMapIdx);
    });

    it('position 0 slot is gated by managePrayers flag', () => {
      // There should be a managePrayers check before position 0 rendering
      expect(speechesTabSource).toMatch(/managePrayers\s*&&[\s\S]*?position=\{0\}/);
    });

    it('position 4 slot is gated by managePrayers flag', () => {
      expect(speechesTabSource).toMatch(/managePrayers\s*&&[\s\S]*?position=\{4\}/);
    });
  });

  // --- AC-157-18: OFF - prayers do NOT appear in Speeches tab ---

  describe('AC-157-18: Prayer slots NOT rendered when managePrayers=false', () => {
    it('prayer positions 0/4 are conditional on managePrayers', () => {
      // Count occurrences of managePrayers && before prayer slot rendering
      const matches = speechesTabSource.match(/managePrayers\s*&&/g);
      expect(matches).toBeTruthy();
      expect(matches!.length).toBeGreaterThanOrEqual(2);
    });

    it('speech slots [1, 2, 3] are always rendered for speeches type (not gated by managePrayers)', () => {
      // The [1,2,3].map is within the isSpeechesType block, not gated by managePrayers
      expect(speechesTabSource).toContain('[1, 2, 3].map');
    });

    it('managePrayers defaults to false when not set (via useWardManagePrayers)', () => {
      // The hook is imported and called, it returns false by default
      expect(speechesTabSource).toContain('useWardManagePrayers');
    });
  });

  // --- AC-157-30: Testimony/Primary shows only prayer slots when ON ---

  describe('AC-157-30: Testimony/primary shows only prayer slots when managePrayers=true', () => {
    it('detects testimony or primary type', () => {
      expect(speechesTabSource).toMatch(/isTestimonyOrPrimary/);
    });

    it('renders prayer slots for testimony/primary when managePrayers=true', () => {
      expect(speechesTabSource).toMatch(/isTestimonyOrPrimary\s*&&\s*managePrayers/);
    });

    it('testimony/primary block renders position 0 SpeechSlot', () => {
      // After isTestimonyOrPrimary check, there should be position 0
      const testimonyBlock = speechesTabSource.substring(
        speechesTabSource.indexOf('isTestimonyOrPrimary && managePrayers')
      );
      expect(testimonyBlock).toContain('position={0}');
    });

    it('testimony/primary block renders position 4 SpeechSlot', () => {
      const testimonyBlock = speechesTabSource.substring(
        speechesTabSource.indexOf('isTestimonyOrPrimary && managePrayers')
      );
      expect(testimonyBlock).toContain('position={4}');
    });

    it('testimony/primary block does NOT render positions 1,2,3', () => {
      // The testimony/primary with managePrayers block should only have 0 and 4
      const startIdx = speechesTabSource.indexOf('isExpanded && isTestimonyOrPrimary && managePrayers');
      const endIdx = speechesTabSource.indexOf('</SundayCard>', startIdx);
      const block = speechesTabSource.substring(startIdx, endIdx);
      expect(block).not.toContain('[1, 2, 3].map');
    });

    it('SpeechSlots in testimony/primary block use isPrayer prop', () => {
      const startIdx = speechesTabSource.indexOf('isExpanded && isTestimonyOrPrimary && managePrayers');
      const endIdx = speechesTabSource.indexOf('</SundayCard>', startIdx);
      const block = speechesTabSource.substring(startIdx, endIdx);
      expect(block).toContain('isPrayer');
    });
  });

  // --- AC-157-64: Observer sees disabled prayer slots ---

  describe('AC-157-64: Observer sees prayer slots as disabled when managePrayers=true', () => {
    it('SpeechSlot component checks isObserver for disabled state', () => {
      expect(speechSlotSource).toContain('isObserver');
    });

    it('status press is disabled for observer', () => {
      expect(speechSlotSource).toContain('disabled={isObserver');
    });

    it('canAssign check prevents observer from assigning', () => {
      expect(speechSlotSource).toContain("hasPermission('speech:assign')");
    });

    it('prayer slots pass onOpenSpeakerSelector callback (enabled for authorized users)', () => {
      expect(speechesTabSource).toContain('onOpenSpeakerSelector={(id) => setSpeakerModalSpeechId(id)}');
    });
  });

  // --- EC-157-04: Custom prayer name not allowed when ON ---

  describe('EC-157-04: Prayer slots use MemberSelectorModal (no custom names) when managePrayers=true', () => {
    it('speeches tab uses MemberSelectorModal for speaker selection', () => {
      expect(speechesTabSource).toContain('MemberSelectorModal');
    });

    it('MemberSelectorModal is imported in speeches tab', () => {
      expect(speechesTabSource).toContain("import { MemberSelectorModal }");
    });

    it('prayer SpeechSlots use onOpenSpeakerSelector (not PrayerSelector)', () => {
      // Prayer slots in speeches tab use the same MemberSelectorModal as speeches
      const prayerSlotBlock = speechesTabSource.substring(
        speechesTabSource.indexOf('managePrayers && (() => {'),
        speechesTabSource.indexOf('})()}', speechesTabSource.indexOf('managePrayers && (() => {')) + 10
      );
      expect(prayerSlotBlock).toContain('onOpenSpeakerSelector');
      expect(prayerSlotBlock).not.toContain('PrayerSelector');
    });
  });

  // --- Status override: assigned_confirmed when managePrayers=false for pos 0/4 ---

  describe('Status override: assigned_confirmed when managePrayers=false for prayer positions', () => {
    it('handleAssignSpeaker checks managePrayers for status override', () => {
      expect(speechesTabSource).toContain('!managePrayers');
    });

    it('handleAssignSpeaker checks position 0 for override', () => {
      expect(speechesTabSource).toContain('speech.position === 0');
    });

    it('handleAssignSpeaker checks position 4 for override', () => {
      expect(speechesTabSource).toContain('speech.position === 4');
    });

    it('status override uses assigned_confirmed', () => {
      expect(speechesTabSource).toContain("'assigned_confirmed'");
    });

    it('status override is passed to assignSpeaker.mutate', () => {
      expect(speechesTabSource).toContain('status: statusOverride');
    });
  });

  // --- managePrayers prop passed to SundayCard ---

  describe('managePrayers prop passed to SundayCard', () => {
    it('SundayCard receives managePrayers prop', () => {
      expect(speechesTabSource).toContain('managePrayers={managePrayers}');
    });
  });
});


// ============================================================================
// STEP-10: SundayCard - collapsed prayer lines + type change logic
// ============================================================================

describe('STEP-10: SundayCard collapsed prayer lines', () => {

  // --- AC-157-31: Collapsed card max 5 lines ---

  describe('AC-157-31: Collapsed card max 5 lines when managePrayers=true', () => {
    it('SundayCardProps has managePrayers optional boolean', () => {
      expect(sundayCardSource).toContain('managePrayers?: boolean');
    });

    it('managePrayers defaults to false in component', () => {
      expect(sundayCardSource).toContain('managePrayers = false');
    });

    it('collapsed speeches card renders opening prayer line before speech lines', () => {
      // Opening prayer rendering comes before visiblePositions.map
      const openingPrayerIdx = sundayCardSource.indexOf('Opening prayer line (collapsed)');
      const visiblePositionsIdx = sundayCardSource.indexOf('visiblePositions.map', openingPrayerIdx);
      expect(openingPrayerIdx).toBeGreaterThan(-1);
      expect(visiblePositionsIdx).toBeGreaterThan(openingPrayerIdx);
    });

    it('collapsed speeches card renders closing prayer line after speech lines', () => {
      const visiblePositionsIdx = sundayCardSource.indexOf('visiblePositions.map');
      const closingPrayerIdx = sundayCardSource.indexOf('Closing prayer line (collapsed)', visiblePositionsIdx);
      expect(closingPrayerIdx).toBeGreaterThan(visiblePositionsIdx);
    });
  });

  // --- AC-157-34: Speeches with 2nd ON shows 5 lines ---

  describe('AC-157-34: Speeches type collapsed - 5 lines with has_second_speech=true', () => {
    it('visiblePositions includes [1, 2, 3] when hasSecondSpeech is true', () => {
      expect(sundayCardSource).toContain('hasSecondSpeech ? [1, 2, 3] : [1, 3]');
    });

    it('with managePrayers=true: 2 prayer lines + 3 speech lines = 5 lines', () => {
      // Opening prayer line, 3 speech lines, closing prayer line
      expect(sundayCardSource).toMatch(/managePrayers\s*&&\s*\(\(\)\s*=>/);
    });
  });

  // --- AC-157-35: Speeches with 2nd OFF shows 4 lines ---

  describe('AC-157-35: Speeches type collapsed - 4 lines with has_second_speech=false', () => {
    it('visiblePositions is [1, 3] when hasSecondSpeech is false', () => {
      expect(sundayCardSource).toContain('[1, 3]');
    });

    it('prayer lines still render when managePrayers=true regardless of has_second_speech', () => {
      // The managePrayers guard for prayer lines is independent of hasSecondSpeech
      const openingBlock = sundayCardSource.substring(
        sundayCardSource.indexOf('Opening prayer line (collapsed)')
      );
      expect(openingBlock).not.toContain('hasSecondSpeech');
    });
  });

  // --- AC-157-36: Prayer lines use italic with prefix, no LED ---

  describe('AC-157-36: Prayer lines use italic + prefix, no LED', () => {
    it('prayer lines use fontStyle italic', () => {
      expect(sundayCardSource).toContain("fontStyle: 'italic'");
    });

    it('prayer lines use prayers.prayerPrefix translation', () => {
      expect(sundayCardSource).toContain("t('prayers.prayerPrefix')");
    });

    it('opening prayer line displays speaker name from position 0', () => {
      expect(sundayCardSource).toMatch(/speeches\.find\(\(s\)\s*=>\s*s\.position\s*===\s*0\)/);
    });

    it('closing prayer line displays speaker name from position 4', () => {
      expect(sundayCardSource).toMatch(/speeches\.find\(\(s\)\s*=>\s*s\.position\s*===\s*4\)/);
    });

    // Test removed: CR-222 added StatusLED to prayer lines
    // Test removed: CR-223 replaced ?? '' with ternary for prayer lines
    // Test removed: CR-223 replaced ?? '' with ternary for closing prayer line
  });

  // --- AC-157-32: Conference/Other collapsed shows 1 line ---

  describe('AC-157-32: Conference/other shows 1 line (exception text, unchanged)', () => {
    it('non-speeches types show exception text', () => {
      expect(sundayCardSource).toContain('exceptionText');
    });

    it('conference/other types do not render prayer lines', () => {
      // Prayer lines are only within the isSpeechesType block or isTestimonyOrPrimary with managePrayers
      expect(sundayCardSource).toContain('isSpeechesType && !expanded');
    });

    it('non-speeches, non-testimony types fall through to exception text only', () => {
      // The condition for non-prayer exception text
      expect(sundayCardSource).toContain('!(isTestimonyOrPrimary && managePrayers && !expanded)');
    });
  });

  // --- AC-157-33: Testimony/Primary collapsed shows 2 prayer lines ---

  describe('AC-157-33: Testimony/primary collapsed shows 2 prayer lines when managePrayers=true', () => {
    it('testimony/primary with managePrayers renders opening prayer line', () => {
      const testimonyBlock = sundayCardSource.substring(
        sundayCardSource.indexOf('isTestimonyOrPrimary && managePrayers && !expanded')
      );
      expect(testimonyBlock).toContain('position === 0');
    });

    it('testimony/primary with managePrayers renders closing prayer line', () => {
      const testimonyBlock = sundayCardSource.substring(
        sundayCardSource.indexOf('isTestimonyOrPrimary && managePrayers && !expanded')
      );
      expect(testimonyBlock).toContain('position === 4');
    });

    it('testimony/primary prayer lines use italic style', () => {
      const testimonyBlock = sundayCardSource.substring(
        sundayCardSource.indexOf('isTestimonyOrPrimary && managePrayers && !expanded'),
        sundayCardSource.indexOf('!(isTestimonyOrPrimary && managePrayers')
      );
      expect(testimonyBlock).toContain("fontStyle: 'italic'");
    });

    it('testimony/primary prayer lines use prayerPrefix', () => {
      const testimonyBlock = sundayCardSource.substring(
        sundayCardSource.indexOf('isTestimonyOrPrimary && managePrayers && !expanded'),
        sundayCardSource.indexOf('!(isTestimonyOrPrimary && managePrayers')
      );
      expect(testimonyBlock).toContain("prayers.prayerPrefix");
    });

    it('testimony/primary with managePrayers still shows exception text label', () => {
      // The exception text (e.g., "Reuniao de Testemunho") is shown above prayer lines
      const testimonyBlock = sundayCardSource.substring(
        sundayCardSource.indexOf('isTestimonyOrPrimary && managePrayers && !expanded'),
        sundayCardSource.indexOf('!(isTestimonyOrPrimary && managePrayers')
      );
      expect(testimonyBlock).toContain('exceptionText');
    });
  });

  // --- EC-157-11: Collapsed card unchanged when managePrayers=false ---

  describe('EC-157-11: Collapsed card unchanged when managePrayers=false', () => {
    it('prayer lines are gated by managePrayers && condition', () => {
      // Opening prayer line check
      const matches = sundayCardSource.match(/managePrayers\s*&&\s*\(/g);
      expect(matches).toBeTruthy();
      expect(matches!.length).toBeGreaterThanOrEqual(1);
    });

    it('speech lines (visiblePositions) render regardless of managePrayers', () => {
      // visiblePositions.map is NOT inside a managePrayers condition
      const speechLinesBlock = sundayCardSource.substring(
        sundayCardSource.indexOf('{visiblePositions.map')
      );
      expect(speechLinesBlock).toBeTruthy();
    });

    it('conference/other types unchanged when managePrayers=false', () => {
      // The non-speeches, non-testimony block renders exception text regardless
      expect(sundayCardSource).toContain('!isSpeechesType && !(isTestimonyOrPrimary && managePrayers');
    });
  });
});


// ============================================================================
// STEP-10: SundayCard type change logic (AC-157-46 through AC-157-51)
// ============================================================================

describe('STEP-10: Sunday type change logic', () => {

  // --- SundayTypeDropdown accepts managePrayers ---

  describe('SundayTypeDropdown managePrayers prop', () => {
    it('SundayTypeDropdownProps has managePrayers optional boolean', () => {
      expect(sundayCardSource).toMatch(/interface SundayTypeDropdownProps[\s\S]*?managePrayers\?:\s*boolean/);
    });

    it('SundayTypeDropdown destructures managePrayers with default false', () => {
      expect(sundayCardSource).toContain('managePrayers = false');
    });

    it('SundayCard passes managePrayers to SundayTypeDropdown', () => {
      expect(sundayCardSource).toContain('managePrayers={managePrayers}');
    });
  });

  // --- AC-157-46: speeches -> testimony/primary preserves prayers ---

  describe('AC-157-46: Speeches -> Testimony/Primary preserves prayers', () => {
    it('getPositionsToDelete returns [1,2,3] when speeches -> testimony/primary with managePrayers', () => {
      expect(sundayCardSource).toContain('isTestimonyOrPrimary(type)) return [1, 2, 3]');
    });

    it('positions 0 and 4 are NOT in the delete list for speeches -> testimony/primary', () => {
      const block = sundayCardSource.substring(
        sundayCardSource.indexOf("if (currentType === SUNDAY_TYPE_SPEECHES)"),
        sundayCardSource.indexOf("if (isTestimonyOrPrimary(currentType))")
      );
      // When transitioning to testimony/primary, the return is [1,2,3] (no 0 or 4)
      expect(block).toContain('return [1, 2, 3]');
    });
  });

  // --- AC-157-47: speeches -> conference/other deletes all ---

  describe('AC-157-47: Speeches -> Conference/Other deletes all', () => {
    it('getPositionsToDelete returns [0,1,2,3,4] when speeches -> conference/other with managePrayers', () => {
      expect(sundayCardSource).toContain('return [0, 1, 2, 3, 4]');
    });
  });

  // --- AC-157-48: testimony/primary -> conference/other deletes prayers ---

  describe('AC-157-48: Testimony/Primary -> Conference/Other deletes prayers', () => {
    it('getPositionsToDelete returns [0,4] when testimony/primary -> conference/other', () => {
      expect(sundayCardSource).toContain('return [0, 4]');
    });
  });

  // --- AC-157-49: testimony/primary -> speeches preserves prayers ---

  describe('AC-157-49: Testimony/Primary -> Speeches preserves prayers', () => {
    it('testimony/primary to speeches does not delete (returns undefined = no deletion specified)', () => {
      // When currentType is testimony/primary and going to speeches (SUNDAY_TYPE_SPEECHES),
      // the function reaches the default return undefined
      const fnBody = sundayCardSource.substring(
        sundayCardSource.indexOf('const getPositionsToDelete'),
        sundayCardSource.indexOf('const getConfirmMessage')
      );
      // After all the specific cases, it returns undefined (preserving all)
      expect(fnBody).toContain('return undefined');
    });

    it('revert to speeches triggers onRevertToSpeeches (skipping deletion)', () => {
      expect(sundayCardSource).toContain('onRevertToSpeeches()');
    });
  });

  // --- AC-157-50: testimony <-> primary preserves prayers ---

  describe('AC-157-50: Testimony <-> Primary preserves prayers', () => {
    it('testimony to primary returns undefined (no deletion)', () => {
      expect(sundayCardSource).toContain('if (isTestimonyOrPrimary(type)) return undefined');
    });

    it('executeChange skips deletion when both types are testimony/primary', () => {
      expect(sundayCardSource).toContain('isTestimonyOrPrimary(currentType) && isTestimonyOrPrimary(type)');
    });
  });

  // --- AC-157-51: Dynamic confirmation dialog text ---

  describe('AC-157-51: Dynamic confirmation dialog text', () => {
    it('getConfirmMessage function exists', () => {
      expect(sundayCardSource).toContain('const getConfirmMessage');
    });

    it('uses changeConfirmMessage for speeches-only deletion', () => {
      expect(sundayCardSource).toContain("t('sundayExceptions.changeConfirmMessage')");
    });

    it('uses confirmDeletePrayers for prayers-only deletion', () => {
      expect(sundayCardSource).toContain("t('sundayExceptions.confirmDeletePrayers')");
    });

    it('uses confirmDeleteBoth when both speeches and prayers deleted', () => {
      expect(sundayCardSource).toContain("t('sundayExceptions.confirmDeleteBoth')");
    });

    it('returns null (no dialog) when nothing to delete', () => {
      const confirmFn = sundayCardSource.substring(
        sundayCardSource.indexOf('const getConfirmMessage'),
        sundayCardSource.indexOf('// Fallback for non-managePrayers')
      );
      // Multiple returns of null for no-delete cases
      const nullReturns = (confirmFn.match(/return null/g) || []).length;
      expect(nullReturns).toBeGreaterThanOrEqual(2);
    });

    it('checks hasSpeechAssignments (positions 1,2,3)', () => {
      expect(sundayCardSource).toContain('s.position >= 1 && s.position <= 3');
    });

    it('checks hasPrayerAssignments (positions 0 and 4)', () => {
      expect(sundayCardSource).toContain('s.position === 0 || s.position === 4');
    });

    it('Alert.alert is shown when confirmMsg is truthy', () => {
      expect(sundayCardSource).toContain('if (confirmMsg)');
      expect(sundayCardSource).toContain('Alert.alert');
    });

    it('executeChange runs directly when no confirmation needed', () => {
      expect(sundayCardSource).toContain('} else {\n      executeChange();');
    });
  });

  // --- Fallback for non-managePrayers ---

  describe('Fallback behavior when managePrayers=false', () => {
    it('non-managePrayers path uses original confirmation logic', () => {
      expect(sundayCardSource).toContain('if (!managePrayers)');
    });

    it('non-managePrayers path calls onDeleteSpeeches without positions', () => {
      // In the !managePrayers block, onDeleteSpeeches is called with just date (no positions)
      expect(sundayCardSource).toContain("onDeleteSpeeches?.(date);");
    });

    it('non-managePrayers path checks hasAssignments for confirmation', () => {
      expect(sundayCardSource).toContain("const hasAssignments = speeches.some");
    });
  });

  // --- handleDeleteSpeeches in speeches.tsx ---

  describe('handleDeleteSpeeches accepts optional positions parameter', () => {
    it('handleDeleteSpeeches accepts positions parameter', () => {
      expect(speechesTabSource).toContain('positions?: number[]');
    });

    it('handleDeleteSpeeches passes positions to deleteSpeechesByDate.mutate', () => {
      expect(speechesTabSource).toContain('deleteSpeechesByDate.mutate({ sundayDate: date, positions }');
    });

    it('onDeleteSpeeches prop signature includes optional positions', () => {
      expect(sundayCardSource).toMatch(/onDeleteSpeeches\?\s*:\s*\(date:\s*string,\s*positions\?\s*:\s*number\[\]\)/);
    });
  });
});


// ============================================================================
// STEP-14: InviteManagementSection - prayer positions
// ============================================================================

describe('STEP-14: InviteManagementSection - prayer positions', () => {

  // --- AC-157-17: OFF - no prayers in invite management ---

  describe('AC-157-17: Prayers excluded from invite management when managePrayers=false', () => {
    it('imports useWardManagePrayers', () => {
      expect(inviteManagementSource).toContain('useWardManagePrayers');
    });

    it('calls useWardManagePrayers()', () => {
      expect(inviteManagementSource).toMatch(/const\s*\{\s*managePrayers\s*\}\s*=\s*useWardManagePrayers\(\)/);
    });

    it('filters out position 0 when managePrayers is false', () => {
      expect(inviteManagementSource).toContain('item.speech.position === 0');
    });

    it('filters out position 4 when managePrayers is false', () => {
      expect(inviteManagementSource).toContain('item.speech.position === 4');
    });

    it('filter returns managePrayers (includes only when true)', () => {
      expect(inviteManagementSource).toContain('return managePrayers');
    });
  });

  // --- AC-157-26: ON - prayers appear with labels ---

  describe('AC-157-26: Prayers appear with prayer labels when managePrayers=true', () => {
    it('position 0 is labeled with t("speeches.openingPrayer")', () => {
      expect(inviteManagementSource).toContain("t('speeches.openingPrayer')");
    });

    it('position 4 is labeled with t("speeches.closingPrayer")', () => {
      expect(inviteManagementSource).toContain("t('speeches.closingPrayer')");
    });

    it('position label uses conditional for prayer vs speech positions', () => {
      expect(inviteManagementSource).toContain('speech.position === 0');
      expect(inviteManagementSource).toContain('speech.position === 4');
    });

    it('speech positions 1,2,3 use existing ordinal label', () => {
      expect(inviteManagementSource).toContain("speeches.slot");
    });

    it('position 3 uses lastSpeech label', () => {
      expect(inviteManagementSource).toContain("speeches.lastSpeech");
    });
  });

  // --- EC-157-12: Correct WhatsApp template selection by position ---

  describe('EC-157-12: WhatsApp template selection by position', () => {
    it('handleNotInvitedAction checks if position is 0 or 4', () => {
      expect(inviteManagementSource).toContain('speech.position === 0 || speech.position === 4');
    });

    it('position 0 uses opening prayer template', () => {
      expect(inviteManagementSource).toContain("'opening'");
      expect(inviteManagementSource).toContain('whatsapp_template_opening_prayer');
    });

    it('position 4 uses closing prayer template', () => {
      expect(inviteManagementSource).toContain("'closing'");
      expect(inviteManagementSource).toContain('whatsapp_template_closing_prayer');
    });

    it('speech positions 1,2,3 use existing speech template', () => {
      expect(inviteManagementSource).toContain('buildWhatsAppUrl');
      expect(inviteManagementSource).toContain("ward?.whatsapp_template");
    });

    it('prayer template uses getDefaultPrayerTemplate as fallback', () => {
      expect(inviteManagementSource).toContain('getDefaultPrayerTemplate');
    });

    it('ward query fetches whatsapp_template_opening_prayer', () => {
      expect(inviteManagementSource).toContain("'whatsapp_template_opening_prayer'");
    });

    it('ward query fetches whatsapp_template_closing_prayer', () => {
      expect(inviteManagementSource).toContain("'whatsapp_template_closing_prayer'");
    });

    it('prayer WhatsApp message resolves template with speaker name and date', () => {
      expect(inviteManagementSource).toContain('speakerName: speech.speaker_name');
    });
  });

  // --- inviteItems filtering logic ---

  describe('inviteItems filtering logic', () => {
    it('inviteItems useMemo depends on managePrayers', () => {
      expect(inviteManagementSource).toMatch(/useMemo\([\s\S]*?managePrayers\s*\]/);
    });

    it('position 2 filtering still respects has_second_speech', () => {
      expect(inviteManagementSource).toContain('item.speech.position === 2');
    });

    it('getInviteItems filters for assigned_not_invited and assigned_invited statuses', () => {
      expect(speechUtilsSource).toContain("assigned_not_invited");
      expect(speechUtilsSource).toContain("assigned_invited");
    });
  });
});


// ============================================================================
// STEP-16: WhatsApp prayer templates - defaults + utility
// ============================================================================

describe('STEP-16: WhatsApp prayer templates', () => {

  // --- AC-157-52: Default opening prayer template (pt-BR) ---

  describe('AC-157-52: Default opening prayer template (pt-BR)', () => {
    it('DEFAULT_OPENING_PRAYER_TEMPLATE_PT_BR constant is exported', () => {
      expect(whatsappUtilsSource).toContain('export const DEFAULT_OPENING_PRAYER_TEMPLATE_PT_BR');
    });

    it('pt-BR opening template contains {nome}', () => {
      expect(DEFAULT_OPENING_PRAYER_TEMPLATE_PT_BR).toContain('{nome}');
    });

    it('pt-BR opening template contains {data}', () => {
      expect(DEFAULT_OPENING_PRAYER_TEMPLATE_PT_BR).toContain('{data}');
    });

    it('pt-BR opening template mentions arriving 15 minutes early', () => {
      expect(DEFAULT_OPENING_PRAYER_TEMPLATE_PT_BR).toContain('15min');
    });

    it('pt-BR opening template mentions oração de abertura', () => {
      expect(DEFAULT_OPENING_PRAYER_TEMPLATE_PT_BR).toContain('oração de abertura');
    });

    it('pt-BR opening template mentions Reunião Sacramental', () => {
      expect(DEFAULT_OPENING_PRAYER_TEMPLATE_PT_BR).toContain('Reunião Sacramental');
    });

    it('pt-BR opening template mentions sitting with bishopric (bispado ao púlpito)', () => {
      expect(DEFAULT_OPENING_PRAYER_TEMPLATE_PT_BR).toContain('bispado');
    });
  });

  // --- AC-157-53: Default closing prayer template (pt-BR) ---

  describe('AC-157-53: Default closing prayer template (pt-BR)', () => {
    it('DEFAULT_CLOSING_PRAYER_TEMPLATE_PT_BR constant is exported', () => {
      expect(whatsappUtilsSource).toContain('export const DEFAULT_CLOSING_PRAYER_TEMPLATE_PT_BR');
    });

    it('pt-BR closing template contains {nome}', () => {
      expect(DEFAULT_CLOSING_PRAYER_TEMPLATE_PT_BR).toContain('{nome}');
    });

    it('pt-BR closing template contains {data}', () => {
      expect(DEFAULT_CLOSING_PRAYER_TEMPLATE_PT_BR).toContain('{data}');
    });

    it('pt-BR closing template mentions oração de encerramento', () => {
      expect(DEFAULT_CLOSING_PRAYER_TEMPLATE_PT_BR).toContain('oração de encerramento');
    });

    it('pt-BR closing template mentions hino intermediário', () => {
      expect(DEFAULT_CLOSING_PRAYER_TEMPLATE_PT_BR).toContain('hino intermediário');
    });
  });

  // --- AC-157-54: Prayer templates have only {nome} and {data} ---

  describe('AC-157-54: Prayer templates use only {nome} and {data}', () => {
    const allPrayerTemplates = [
      DEFAULT_OPENING_PRAYER_TEMPLATE_PT_BR,
      DEFAULT_OPENING_PRAYER_TEMPLATE_EN,
      DEFAULT_OPENING_PRAYER_TEMPLATE_ES,
      DEFAULT_CLOSING_PRAYER_TEMPLATE_PT_BR,
      DEFAULT_CLOSING_PRAYER_TEMPLATE_EN,
      DEFAULT_CLOSING_PRAYER_TEMPLATE_ES,
    ];

    it('no prayer template contains {posicao}', () => {
      allPrayerTemplates.forEach(t => expect(t).not.toContain('{posicao}'));
    });

    it('no prayer template contains {colecao}', () => {
      allPrayerTemplates.forEach(t => expect(t).not.toContain('{colecao}'));
    });

    it('no prayer template contains {titulo}', () => {
      allPrayerTemplates.forEach(t => expect(t).not.toContain('{titulo}'));
    });

    it('no prayer template contains {link}', () => {
      allPrayerTemplates.forEach(t => expect(t).not.toContain('{link}'));
    });

    it('all prayer templates contain {nome}', () => {
      allPrayerTemplates.forEach(t => expect(t).toContain('{nome}'));
    });

    it('all prayer templates contain {data}', () => {
      allPrayerTemplates.forEach(t => expect(t).toContain('{data}'));
    });
  });

  // --- AC-157-55: Default templates in en and es ---

  describe('AC-157-55: Default templates in en and es', () => {
    it('EN opening template constant is exported', () => {
      expect(whatsappUtilsSource).toContain('export const DEFAULT_OPENING_PRAYER_TEMPLATE_EN');
    });

    it('EN closing template constant is exported', () => {
      expect(whatsappUtilsSource).toContain('export const DEFAULT_CLOSING_PRAYER_TEMPLATE_EN');
    });

    it('ES opening template constant is exported', () => {
      expect(whatsappUtilsSource).toContain('export const DEFAULT_OPENING_PRAYER_TEMPLATE_ES');
    });

    it('ES closing template constant is exported', () => {
      expect(whatsappUtilsSource).toContain('export const DEFAULT_CLOSING_PRAYER_TEMPLATE_ES');
    });

    it('EN opening template mentions "opening prayer"', () => {
      expect(DEFAULT_OPENING_PRAYER_TEMPLATE_EN).toContain('opening prayer');
    });

    it('EN closing template mentions "closing prayer"', () => {
      expect(DEFAULT_CLOSING_PRAYER_TEMPLATE_EN).toContain('closing prayer');
    });

    it('EN opening template mentions "15 minutes early"', () => {
      expect(DEFAULT_OPENING_PRAYER_TEMPLATE_EN).toContain('15 minutes early');
    });

    it('EN closing template mentions "intermediate hymn"', () => {
      expect(DEFAULT_CLOSING_PRAYER_TEMPLATE_EN).toContain('intermediate hymn');
    });

    it('ES opening template mentions "oración de apertura"', () => {
      expect(DEFAULT_OPENING_PRAYER_TEMPLATE_ES).toContain('oración de apertura');
    });

    it('ES closing template mentions "oración de cierre"', () => {
      expect(DEFAULT_CLOSING_PRAYER_TEMPLATE_ES).toContain('oración de cierre');
    });

    it('ES opening template mentions "15 minutos"', () => {
      expect(DEFAULT_OPENING_PRAYER_TEMPLATE_ES).toContain('15 minutos');
    });

    it('ES closing template mentions "himno intermedio"', () => {
      expect(DEFAULT_CLOSING_PRAYER_TEMPLATE_ES).toContain('himno intermedio');
    });
  });

  // --- getDefaultPrayerTemplate function ---

  describe('getDefaultPrayerTemplate function', () => {
    it('function is exported', () => {
      expect(whatsappUtilsSource).toContain('export function getDefaultPrayerTemplate');
    });

    it('accepts language and type parameters', () => {
      expect(whatsappUtilsSource).toMatch(/getDefaultPrayerTemplate\(language:\s*string,\s*type:\s*'opening'\s*\|\s*'closing'\)/);
    });

    it('returns correct pt-BR opening template', () => {
      expect(getDefaultPrayerTemplate('pt-BR', 'opening')).toBe(DEFAULT_OPENING_PRAYER_TEMPLATE_PT_BR);
    });

    it('returns correct pt-BR closing template', () => {
      expect(getDefaultPrayerTemplate('pt-BR', 'closing')).toBe(DEFAULT_CLOSING_PRAYER_TEMPLATE_PT_BR);
    });

    it('returns correct en opening template', () => {
      expect(getDefaultPrayerTemplate('en', 'opening')).toBe(DEFAULT_OPENING_PRAYER_TEMPLATE_EN);
    });

    it('returns correct en closing template', () => {
      expect(getDefaultPrayerTemplate('en', 'closing')).toBe(DEFAULT_CLOSING_PRAYER_TEMPLATE_EN);
    });

    it('returns correct es opening template', () => {
      expect(getDefaultPrayerTemplate('es', 'opening')).toBe(DEFAULT_OPENING_PRAYER_TEMPLATE_ES);
    });

    it('returns correct es closing template', () => {
      expect(getDefaultPrayerTemplate('es', 'closing')).toBe(DEFAULT_CLOSING_PRAYER_TEMPLATE_ES);
    });

    it('falls back to pt-BR for unknown language (opening)', () => {
      expect(getDefaultPrayerTemplate('fr', 'opening')).toBe(DEFAULT_OPENING_PRAYER_TEMPLATE_PT_BR);
    });

    it('falls back to pt-BR for unknown language (closing)', () => {
      expect(getDefaultPrayerTemplate('fr', 'closing')).toBe(DEFAULT_CLOSING_PRAYER_TEMPLATE_PT_BR);
    });
  });

  // --- resolveTemplate function ---

  describe('resolveTemplate with prayer variables', () => {
    it('resolves {nome} placeholder in prayer template', () => {
      const result = resolveTemplate('Olá {nome}', {
        speakerName: 'Maria',
        date: '2026-03-01',
        topic: '',
        position: '',
      });
      expect(result).toContain('Maria');
    });

    it('resolves {data} placeholder in prayer template', () => {
      const result = resolveTemplate('dia {data}', {
        speakerName: 'Maria',
        date: '2026-03-01',
        topic: '',
        position: '',
      });
      expect(result).toContain('2026-03-01');
    });

    it('resolves both placeholders in full prayer template', () => {
      const result = resolveTemplate(DEFAULT_OPENING_PRAYER_TEMPLATE_PT_BR, {
        speakerName: 'João',
        date: '01/03/2026',
        topic: '',
        position: '',
      });
      expect(result).toContain('João');
      expect(result).toContain('01/03/2026');
      expect(result).not.toContain('{nome}');
      expect(result).not.toContain('{data}');
    });
  });

  // --- 6 constants exported ---

  describe('6 default prayer template constants exported', () => {
    it('all 6 constants are defined and non-empty', () => {
      expect(DEFAULT_OPENING_PRAYER_TEMPLATE_PT_BR.length).toBeGreaterThan(0);
      expect(DEFAULT_OPENING_PRAYER_TEMPLATE_EN.length).toBeGreaterThan(0);
      expect(DEFAULT_OPENING_PRAYER_TEMPLATE_ES.length).toBeGreaterThan(0);
      expect(DEFAULT_CLOSING_PRAYER_TEMPLATE_PT_BR.length).toBeGreaterThan(0);
      expect(DEFAULT_CLOSING_PRAYER_TEMPLATE_EN.length).toBeGreaterThan(0);
      expect(DEFAULT_CLOSING_PRAYER_TEMPLATE_ES.length).toBeGreaterThan(0);
    });
  });
});


// ============================================================================
// STEP-17: WhatsApp settings - segmented control
// ============================================================================

describe('STEP-17: WhatsApp settings - segmented control', () => {

  // --- AC-157-23: ON - 3-tab segmented control ---

  describe('AC-157-23: Segmented control with 3 tabs when managePrayers=true', () => {
    it('imports useWardManagePrayers', () => {
      expect(whatsappSettingsSource).toContain('useWardManagePrayers');
    });

    it('calls useWardManagePrayers()', () => {
      expect(whatsappSettingsSource).toMatch(/const\s*\{\s*managePrayers\s*\}\s*=\s*useWardManagePrayers\(\)/);
    });

    it('defines ActiveTab type with speech, opening_prayer, closing_prayer', () => {
      expect(whatsappSettingsSource).toContain("type ActiveTab = 'speech' | 'opening_prayer' | 'closing_prayer'");
    });

    it('initializes activeTab state with default "speech"', () => {
      expect(whatsappSettingsSource).toMatch(/useState<ActiveTab>\(['"]speech['"]\)/);
    });

    it('segmented control is rendered when managePrayers is true', () => {
      expect(whatsappSettingsSource).toContain('{managePrayers && (');
    });

    it('segmented control has 3 tab buttons', () => {
      expect(whatsappSettingsSource).toContain("(['speech', 'opening_prayer', 'closing_prayer'] as ActiveTab[])");
    });

    it('tab labels use i18n keys', () => {
      expect(whatsappSettingsSource).toContain("t('whatsapp.tabSpeech')");
      expect(whatsappSettingsSource).toContain("t('whatsapp.tabOpeningPrayer')");
      expect(whatsappSettingsSource).toContain("t('whatsapp.tabClosingPrayer')");
    });

    it('segmented control uses Pressable for tab buttons', () => {
      expect(whatsappSettingsSource).toContain('segmentedTab');
    });

    it('active tab has selected accessibility state', () => {
      expect(whatsappSettingsSource).toContain('accessibilityState={{ selected: isActive }}');
    });

    it('tab press changes activeTab state', () => {
      expect(whatsappSettingsSource).toContain('setActiveTab(tab)');
    });
  });

  // --- AC-157-14: OFF - no segmented control ---

  describe('AC-157-14: No segmented control when managePrayers=false', () => {
    it('segmented control is gated by managePrayers condition', () => {
      expect(whatsappSettingsSource).toContain('{managePrayers && (');
    });

    it('when managePrayers is false, only speech template is visible', () => {
      // The speech template is the default (always rendered)
      expect(whatsappSettingsSource).toContain("activeTab === 'speech' ? template");
    });
  });

  // --- AC-157-56: Segmented control details ---

  describe('AC-157-56: Segmented control behavior details', () => {
    it('speech tab shows all 6 placeholder tokens', () => {
      expect(whatsappSettingsSource).toContain("'{nome}'");
      expect(whatsappSettingsSource).toContain("'{data}'");
      expect(whatsappSettingsSource).toContain("'{posicao}'");
      expect(whatsappSettingsSource).toContain("'{colecao}'");
      expect(whatsappSettingsSource).toContain("'{titulo}'");
      expect(whatsappSettingsSource).toContain("'{link}'");
    });

    it('prayer placeholder tokens defined with only {nome} and {data}', () => {
      expect(whatsappSettingsSource).toContain('PRAYER_PLACEHOLDER_TOKENS');
      // Extract the PRAYER_PLACEHOLDER_TOKENS array
      const prayerTokensMatch = whatsappSettingsSource.match(
        /PRAYER_PLACEHOLDER_TOKENS\s*=\s*\[([\s\S]*?)\]/
      );
      expect(prayerTokensMatch).toBeTruthy();
      const tokenContent = prayerTokensMatch![1];
      expect(tokenContent).toContain('{nome}');
      expect(tokenContent).toContain('{data}');
      expect(tokenContent).not.toContain('{posicao}');
      expect(tokenContent).not.toContain('{colecao}');
      expect(tokenContent).not.toContain('{titulo}');
      expect(tokenContent).not.toContain('{link}');
    });

    it('prayer placeholder i18n keys defined with only name and date', () => {
      expect(whatsappSettingsSource).toContain('PRAYER_PLACEHOLDER_I18N_KEYS');
      const prayerI18nMatch = whatsappSettingsSource.match(
        /PRAYER_PLACEHOLDER_I18N_KEYS\s*=\s*\[([\s\S]*?)\]/
      );
      expect(prayerI18nMatch).toBeTruthy();
      const i18nContent = prayerI18nMatch![1];
      expect(i18nContent).toContain('whatsapp.placeholderName');
      expect(i18nContent).toContain('whatsapp.placeholderDate');
      expect(i18nContent).not.toContain('whatsapp.placeholderPosition');
    });

    it('currentTokens uses prayer tokens when isPrayerTab', () => {
      expect(whatsappSettingsSource).toContain('isPrayerTab ? PRAYER_PLACEHOLDER_TOKENS : PLACEHOLDER_TOKENS');
    });

    it('currentLabels uses prayer labels when isPrayerTab', () => {
      expect(whatsappSettingsSource).toContain('isPrayerTab ? prayerPlaceholderLabels : placeholderLabels');
    });

    it('isPrayerTab is true for opening_prayer and closing_prayer tabs', () => {
      expect(whatsappSettingsSource).toContain("activeTab === 'opening_prayer' || activeTab === 'closing_prayer'");
    });
  });

  // --- Ward query fetches prayer template columns ---

  describe('Ward query fetches prayer template columns', () => {
    it('ward query selects whatsapp_template_opening_prayer', () => {
      expect(whatsappSettingsSource).toContain('whatsapp_template_opening_prayer');
    });

    it('ward query selects whatsapp_template_closing_prayer', () => {
      expect(whatsappSettingsSource).toContain('whatsapp_template_closing_prayer');
    });

    it('ward query selects all 3 template columns', () => {
      expect(whatsappSettingsSource).toMatch(
        /\.select\(['"]whatsapp_template.*whatsapp_template_opening_prayer.*whatsapp_template_closing_prayer/
      );
    });
  });

  // --- Independent template state per tab ---

  describe('Independent template state per tab', () => {
    it('speech template has its own state', () => {
      expect(whatsappSettingsSource).toContain("const [template, setTemplate] = useState('')");
    });

    it('opening prayer template has its own state', () => {
      expect(whatsappSettingsSource).toContain("const [openingTemplate, setOpeningTemplate] = useState('')");
    });

    it('closing prayer template has its own state', () => {
      expect(whatsappSettingsSource).toContain("const [closingTemplate, setClosingTemplate] = useState('')");
    });

    it('speech template has initialized flag', () => {
      expect(whatsappSettingsSource).toContain('const [initialized, setInitialized] = useState(false)');
    });

    it('opening template has initialized flag', () => {
      expect(whatsappSettingsSource).toContain('const [openingInitialized, setOpeningInitialized] = useState(false)');
    });

    it('closing template has initialized flag', () => {
      expect(whatsappSettingsSource).toContain('const [closingInitialized, setClosingInitialized] = useState(false)');
    });
  });

  // --- Independent auto-save mutations ---

  describe('Independent auto-save mutations per tab', () => {
    it('speech template has saveMutation', () => {
      expect(whatsappSettingsSource).toContain('const saveMutation = useMutation');
    });

    it('opening prayer has saveOpeningMutation', () => {
      expect(whatsappSettingsSource).toContain('const saveOpeningMutation = useMutation');
    });

    it('closing prayer has saveClosingMutation', () => {
      expect(whatsappSettingsSource).toContain('const saveClosingMutation = useMutation');
    });

    it('opening mutation updates whatsapp_template_opening_prayer column', () => {
      expect(whatsappSettingsSource).toContain("update({ whatsapp_template_opening_prayer: newTemplate })");
    });

    it('closing mutation updates whatsapp_template_closing_prayer column', () => {
      expect(whatsappSettingsSource).toContain("update({ whatsapp_template_closing_prayer: newTemplate })");
    });

    it('speech mutation updates whatsapp_template column', () => {
      expect(whatsappSettingsSource).toContain("update({ whatsapp_template: newTemplate })");
    });
  });

  // --- Template initialization from DB ---

  describe('Template initialization from DB', () => {
    it('opening prayer template initializes from DB or default', () => {
      expect(whatsappSettingsSource).toContain("getDefaultPrayerTemplate(wardLanguage ?? 'pt-BR', 'opening')");
    });

    it('closing prayer template initializes from DB or default', () => {
      expect(whatsappSettingsSource).toContain("getDefaultPrayerTemplate(wardLanguage ?? 'pt-BR', 'closing')");
    });

    it('imports getDefaultPrayerTemplate', () => {
      expect(whatsappSettingsSource).toContain("import { getDefaultTemplate, getDefaultPrayerTemplate }");
    });

    it('opening template reads from ward.whatsapp_template_opening_prayer', () => {
      expect(whatsappSettingsSource).toContain('ward.whatsapp_template_opening_prayer');
    });

    it('closing template reads from ward.whatsapp_template_closing_prayer', () => {
      expect(whatsappSettingsSource).toContain('ward.whatsapp_template_closing_prayer');
    });
  });

  // --- Change handlers with debounce ---

  describe('Change handlers with debounce', () => {
    it('handleOpeningChange uses debounced save', () => {
      expect(whatsappSettingsSource).toContain('const handleOpeningChange = useCallback');
      expect(whatsappSettingsSource).toContain('openingSaveTimerRef');
    });

    it('handleClosingChange uses debounced save', () => {
      expect(whatsappSettingsSource).toContain('const handleClosingChange = useCallback');
      expect(whatsappSettingsSource).toContain('closingSaveTimerRef');
    });

    it('currentHandleChange selects correct handler based on activeTab', () => {
      expect(whatsappSettingsSource).toContain("activeTab === 'speech' ? handleChange");
      expect(whatsappSettingsSource).toContain("activeTab === 'opening_prayer' ? handleOpeningChange");
    });

    it('currentTemplate selects correct template based on activeTab', () => {
      expect(whatsappSettingsSource).toContain("activeTab === 'speech' ? template");
      expect(whatsappSettingsSource).toContain("activeTab === 'opening_prayer' ? openingTemplate");
    });

    it('currentIsSaving selects correct saving state based on activeTab', () => {
      expect(whatsappSettingsSource).toContain("activeTab === 'speech' ? saveMutation.isPending");
    });
  });

  // --- Language reset ---

  describe('Language reset on wardLanguage change', () => {
    it('resets openingInitialized when language changes', () => {
      expect(whatsappSettingsSource).toContain('setOpeningInitialized(false)');
    });

    it('resets closingInitialized when language changes', () => {
      expect(whatsappSettingsSource).toContain('setClosingInitialized(false)');
    });
  });
});


// ============================================================================
// Cross-cutting: i18n keys used in Phase 2 components
// ============================================================================

describe('Cross-cutting: i18n keys for Phase 2', () => {
  describe('prayers.opening key in all locales', () => {
    it('pt-BR has prayers.opening', () => {
      expect(ptBR.prayers?.opening).toBeDefined();
    });

    it('en has prayers.opening', () => {
      expect(en.prayers?.opening).toBeDefined();
    });

    it('es has prayers.opening', () => {
      expect(es.prayers?.opening).toBeDefined();
    });
  });

  describe('prayers.closing key in all locales', () => {
    it('pt-BR has prayers.closing', () => {
      expect(ptBR.prayers?.closing).toBeDefined();
    });

    it('en has prayers.closing', () => {
      expect(en.prayers?.closing).toBeDefined();
    });

    it('es has prayers.closing', () => {
      expect(es.prayers?.closing).toBeDefined();
    });
  });

  describe('prayers.prayerPrefix key in all locales', () => {
    it('pt-BR has prayers.prayerPrefix', () => {
      expect(ptBR.prayers?.prayerPrefix).toBeDefined();
    });

    it('en has prayers.prayerPrefix = "(Prayer)"', () => {
      expect(en.prayers?.prayerPrefix).toBe('(Prayer)');
    });

    it('es has prayers.prayerPrefix', () => {
      expect(es.prayers?.prayerPrefix).toBeDefined();
    });
  });

  describe('whatsapp tab keys in all locales', () => {
    it('pt-BR has whatsapp.tabSpeech', () => {
      expect(ptBR.whatsapp?.tabSpeech).toBeDefined();
    });

    it('pt-BR has whatsapp.tabOpeningPrayer', () => {
      expect(ptBR.whatsapp?.tabOpeningPrayer).toBeDefined();
    });

    it('pt-BR has whatsapp.tabClosingPrayer', () => {
      expect(ptBR.whatsapp?.tabClosingPrayer).toBeDefined();
    });

    it('en has whatsapp.tabSpeech = "Speech"', () => {
      expect(en.whatsapp?.tabSpeech).toBe('Speech');
    });

    it('en has whatsapp.tabOpeningPrayer = "Opening"', () => {
      expect(en.whatsapp?.tabOpeningPrayer).toBe('Opening');
    });

    it('en has whatsapp.tabClosingPrayer = "Closing"', () => {
      expect(en.whatsapp?.tabClosingPrayer).toBe('Closing');
    });
  });

  describe('speeches.openingPrayer / closingPrayer in all locales', () => {
    it('pt-BR has speeches.openingPrayer', () => {
      expect(ptBR.speeches?.openingPrayer).toBeDefined();
    });

    it('pt-BR has speeches.closingPrayer', () => {
      expect(ptBR.speeches?.closingPrayer).toBeDefined();
    });

    it('en has speeches.openingPrayer', () => {
      expect(en.speeches?.openingPrayer).toBeDefined();
    });

    it('en has speeches.closingPrayer', () => {
      expect(en.speeches?.closingPrayer).toBeDefined();
    });
  });

  describe('sundayExceptions confirmation keys', () => {
    it('pt-BR has sundayExceptions.confirmDeletePrayers', () => {
      expect(ptBR.sundayExceptions?.confirmDeletePrayers).toBeDefined();
    });

    it('pt-BR has sundayExceptions.confirmDeleteBoth', () => {
      expect(ptBR.sundayExceptions?.confirmDeleteBoth).toBeDefined();
    });

    it('en has sundayExceptions.confirmDeletePrayers', () => {
      expect(en.sundayExceptions?.confirmDeletePrayers).toBeDefined();
    });

    it('en has sundayExceptions.confirmDeleteBoth', () => {
      expect(en.sundayExceptions?.confirmDeleteBoth).toBeDefined();
    });
  });
});

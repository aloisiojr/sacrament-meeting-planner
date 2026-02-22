/**
 * Tests for Batch 9, Phase 2: Speech Cards & Agenda
 *
 * F060 (CR-114): Add X button to remove topic assignment
 * F061 (CR-115): Confirmation dialog on sunday type change
 * F062 (CR-116): LED click shows confirmed and gave_up options directly
 * F063 (CR-119): Redesign speech cards layout (LED left, X right)
 * F064 (CR-121): "(Last-minute assignment)" label in agenda
 *
 * Covers acceptance criteria:
 *   AC-F060-01..06, AC-F061-01..07, AC-F062-01..06, AC-F063-01..07, AC-F064-01..08
 * Covers edge cases:
 *   EC-F060-01..02, EC-F061-01..02, EC-F062-01..02, EC-F063-01..02, EC-F064-01..03
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

import {
  VALID_TRANSITIONS,
  getAvailableStatuses,
} from '../hooks/useSpeeches';

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
// F060 (CR-114): Add X button to remove topic assignment
// =============================================================================

describe('F060 (CR-114): Add X button to remove topic assignment', () => {
  const getSpeechSlot = () => readSourceFile('components/SpeechSlot.tsx');

  // --- AC-F060-01: X button appears next to topic field when topic is assigned ---
  describe('AC-F060-01: X button appears when topic is assigned', () => {
    it('should render X button (U+00D7) in topic field when topicDisplay exists and canAssign', () => {
      const content = getSpeechSlot();
      // X button should be conditioned on topicDisplay && canAssign
      expect(content).toContain('topicDisplay && canAssign');
      // The X button uses U+00D7 character
      expect(content).toContain("'\\u00D7'");
    });

    it('should have X button as sibling of topicField Pressable inside topicRow', () => {
      const content = getSpeechSlot();
      // F073 (CR-128) moved X outside topicField, now it's a sibling in topicRow View
      const jsxStart = content.indexOf('return (');
      const jsxContent = content.substring(jsxStart);
      const topicRowIdx = jsxContent.indexOf('styles.topicRow');
      const topicRowEnd = jsxContent.indexOf('</View>', jsxContent.indexOf('handleClearTopic', topicRowIdx));
      const topicSection = jsxContent.substring(topicRowIdx, topicRowEnd);
      // Should contain the clear topic button within topicRow
      expect(topicSection).toContain('handleClearTopic');
      expect(topicSection).toContain("'\\u00D7'");
    });

    it('X button should be after topicField Pressable (as sibling in topicRow)', () => {
      const content = getSpeechSlot();
      // F073 (CR-128): X is now outside topicField, after the dropdown arrow
      const jsxStart = content.indexOf('return (');
      const jsxContent = content.substring(jsxStart);
      const topicRowIdx = jsxContent.indexOf('styles.topicRow');
      const topicRowEnd = jsxContent.indexOf('</View>', jsxContent.indexOf('handleClearTopic', topicRowIdx));
      const topicSection = jsxContent.substring(topicRowIdx, topicRowEnd);
      // Order: topicField (with topicText + arrow) -> clearTopic X (outside)
      const topicFieldIdx = topicSection.indexOf('styles.topicField');
      const clearTopicIdx = topicSection.indexOf('handleClearTopic');
      expect(topicFieldIdx).toBeGreaterThan(-1);
      expect(clearTopicIdx).toBeGreaterThan(-1);
      expect(topicFieldIdx).toBeLessThan(clearTopicIdx);
    });
  });

  // --- AC-F060-02: Pressing X clears topic assignment ---
  describe('AC-F060-02: Pressing X clears topic assignment', () => {
    it('should have handleClearTopic callback that calls onClearTopic', () => {
      const content = getSpeechSlot();
      expect(content).toContain('handleClearTopic');
      expect(content).toContain('onClearTopic?.(speech.id)');
    });

    it('speeches.tsx should wire onClearTopic with assignTopic.mutate setting null', () => {
      const content = readSourceFile('app/(tabs)/speeches.tsx');
      expect(content).toContain('handleClearTopic');
      expect(content).toContain('topicTitle: null');
      expect(content).toContain('topicLink: null');
    });

    it('NextSundaysSection no longer has inline editing (F129 removed expand/edit)', () => {
      const content = readSourceFile('components/NextSundaysSection.tsx');
      // F129 removed all mutation hooks and inline editing from NextSundaysSection
      expect(content).not.toContain('handleClearTopic');
      expect(content).not.toContain('SpeechSlot');
    });
  });

  // --- AC-F060-03: X button visible only for canAssign ---
  describe('AC-F060-03: X button visible only for canAssign', () => {
    it('X button rendering condition includes canAssign', () => {
      const content = getSpeechSlot();
      // The condition should require both topicDisplay and canAssign
      expect(content).toContain('topicDisplay && canAssign');
    });

    it('canAssign is based on speech:assign permission', () => {
      const content = getSpeechSlot();
      expect(content).toContain("hasPermission('speech:assign')");
    });
  });

  // --- AC-F060-04: X button not visible when no topic assigned ---
  describe('AC-F060-04: X button not visible when no topic', () => {
    it('topicDisplay is null when topic_title is null', () => {
      const content = getSpeechSlot();
      // topicDisplay is null when speech?.topic_title is falsy
      expect(content).toContain('const topicDisplay = speech?.topic_title');
    });

    it('X button condition requires topicDisplay to be truthy', () => {
      const content = getSpeechSlot();
      expect(content).toContain('{topicDisplay && canAssign && (');
    });
  });

  // --- AC-F060-05: Topic modal still opens when clicking topic field ---
  describe('AC-F060-05: Topic modal still opens on field click', () => {
    it('topic field Pressable calls handleTopicPress', () => {
      const content = getSpeechSlot();
      expect(content).toContain('onPress={handleTopicPress}');
    });

    it('handleTopicPress calls onOpenTopicSelector', () => {
      const content = getSpeechSlot();
      expect(content).toContain('onOpenTopicSelector?.(speech.id)');
    });
  });

  // --- AC-F060-06: No confirmation dialog for topic removal ---
  describe('AC-F060-06: No confirmation dialog for topic removal', () => {
    it('handleClearTopic does NOT call Alert.alert', () => {
      const content = getSpeechSlot();
      // Find handleClearTopic handler
      const handlerStart = content.indexOf('const handleClearTopic');
      const handlerEnd = content.indexOf('}, [', handlerStart);
      const handlerBody = content.substring(handlerStart, handlerEnd);
      expect(handlerBody).not.toContain('Alert.alert');
    });
  });

  // --- EC-F060-01: Remove topic when speech has no speaker ---
  describe('EC-F060-01: Topic removal independent of speaker state', () => {
    it('handleClearTopic does NOT check speaker_name', () => {
      const content = getSpeechSlot();
      const handlerStart = content.indexOf('const handleClearTopic');
      const handlerEnd = content.indexOf('}, [', handlerStart);
      const handlerBody = content.substring(handlerStart, handlerEnd);
      expect(handlerBody).not.toContain('speaker_name');
      expect(handlerBody).not.toContain('hasSpeaker');
    });
  });

  // --- EC-F060-02: Remove topic from speech with confirmed status ---
  describe('EC-F060-02: Topic removal independent of speech status', () => {
    it('handleClearTopic does NOT check speech status', () => {
      const content = getSpeechSlot();
      const handlerStart = content.indexOf('const handleClearTopic');
      const handlerEnd = content.indexOf('}, [', handlerStart);
      const handlerBody = content.substring(handlerStart, handlerEnd);
      expect(handlerBody).not.toContain('status');
      expect(handlerBody).not.toContain('assigned_confirmed');
    });
  });

  // --- onClearTopic prop exists ---
  describe('onClearTopic prop interface', () => {
    it('SpeechSlotProps should include onClearTopic optional prop', () => {
      const content = getSpeechSlot();
      expect(content).toContain('onClearTopic?: (speechId: string) => void');
    });

    it('onClearTopic should be destructured in component', () => {
      const content = getSpeechSlot();
      // Find the destructuring
      const destructStart = content.indexOf('}: SpeechSlotProps)');
      const destructSection = content.substring(
        content.lastIndexOf('{', destructStart),
        destructStart
      );
      expect(destructSection).toContain('onClearTopic');
    });
  });
});

// =============================================================================
// F061 (CR-115): Confirmation dialog on sunday type change
// =============================================================================

describe('F061 (CR-115): Confirmation dialog on sunday type change', () => {
  const getSundayCard = () => readSourceFile('components/SundayCard.tsx');

  // --- AC-F061-01: Confirmation when changing FROM speeches WITH assignments ---
  describe('AC-F061-01: Confirmation shown when has assignments', () => {
    it('should call Alert.alert in handleSelect when changing from speeches with assignments', () => {
      const content = getSundayCard();
      // Find handleSelect function
      const handleSelectIdx = content.indexOf('const handleSelect');
      const handleSelectEnd = content.indexOf('};', content.indexOf('Alert.alert', handleSelectIdx));
      const handlerBody = content.substring(handleSelectIdx, handleSelectEnd);
      expect(handlerBody).toContain('Alert.alert');
      expect(handlerBody).toContain('hasAssignments');
    });

    it('should check for speaker_name OR topic_title to determine assignments', () => {
      const content = getSundayCard();
      expect(content).toContain('s.speaker_name');
      expect(content).toContain('s.topic_title');
    });

    it('should use speeches.some() to check for assignments', () => {
      const content = getSundayCard();
      expect(content).toContain('speeches.some');
    });
  });

  // --- AC-F061-02: No confirmation when no assignments ---
  describe('AC-F061-02: No confirmation when no assignments', () => {
    it('confirmation is conditional on hasAssignments being true', () => {
      const content = getSundayCard();
      // Alert.alert is inside condition: currentType === SUNDAY_TYPE_SPEECHES && hasAssignments
      expect(content).toContain('currentType === SUNDAY_TYPE_SPEECHES && hasAssignments');
    });
  });

  // --- AC-F061-03: Cancel keeps current type ---
  describe('AC-F061-03: Cancel keeps current type', () => {
    it('Alert.alert has Cancel button with style cancel', () => {
      const content = getSundayCard();
      const alertIdx = content.indexOf('Alert.alert');
      const alertEnd = content.indexOf(');', content.indexOf(']', alertIdx));
      const alertBody = content.substring(alertIdx, alertEnd);
      expect(alertBody).toContain("style: 'cancel'");
      expect(alertBody).toContain("t('common.cancel')");
    });
  });

  // --- AC-F061-04: Confirm executes the change ---
  describe('AC-F061-04: Confirm executes the change', () => {
    it('Alert.alert has Confirm button with destructive style', () => {
      const content = getSundayCard();
      const alertIdx = content.indexOf('Alert.alert');
      const alertEnd = content.indexOf(');', content.indexOf(']', alertIdx));
      const alertBody = content.substring(alertIdx, alertEnd);
      expect(alertBody).toContain("style: 'destructive'");
      expect(alertBody).toContain("t('common.confirm')");
    });

    it('Confirm button onPress calls onSelect or opens other modal', () => {
      const content = getSundayCard();
      const alertIdx = content.indexOf('Alert.alert');
      const alertEnd = content.indexOf(');', content.indexOf(']', alertIdx));
      const alertBody = content.substring(alertIdx, alertEnd);
      expect(alertBody).toContain('onPress');
      expect(alertBody).toContain('onSelect');
    });
  });

  // --- AC-F061-05: No confirmation when reverting TO speeches ---
  describe('AC-F061-05: No confirmation when reverting to speeches', () => {
    it('handleSelect returns early for SUNDAY_TYPE_SPEECHES without Alert', () => {
      const content = getSundayCard();
      const handleSelectIdx = content.indexOf('const handleSelect');
      // The first check in handleSelect should be for SUNDAY_TYPE_SPEECHES
      const firstCheck = content.indexOf('if (type === SUNDAY_TYPE_SPEECHES)', handleSelectIdx);
      const firstReturn = content.indexOf('return;', firstCheck);
      const section = content.substring(firstCheck, firstReturn + 10);
      expect(section).toContain('onRevertToSpeeches()');
      expect(section).not.toContain('Alert');
    });
  });

  // --- AC-F061-06: SundayTypeDropdown receives speeches prop ---
  describe('AC-F061-06: SundayTypeDropdown has speeches prop', () => {
    it('SundayTypeDropdownProps includes speeches: Speech[]', () => {
      const content = getSundayCard();
      const propsIdx = content.indexOf('interface SundayTypeDropdownProps');
      const propsEnd = content.indexOf('}', propsIdx);
      const propsBody = content.substring(propsIdx, propsEnd);
      expect(propsBody).toContain('speeches: Speech[]');
    });

    it('SundayCard passes speeches prop to SundayTypeDropdown', () => {
      const content = getSundayCard();
      // In the JSX where SundayTypeDropdown is rendered
      const dropdownIdx = content.indexOf('<SundayTypeDropdown');
      const dropdownEnd = content.indexOf('/>', dropdownIdx);
      const dropdownSection = content.substring(dropdownIdx, dropdownEnd);
      expect(dropdownSection).toContain('speeches={speeches}');
    });
  });

  // --- AC-F061-07: Dialog texts translated in 3 languages ---
  describe('AC-F061-07: Dialog texts translated in 3 languages', () => {
    it('pt-BR has changeConfirmTitle', () => {
      const locale = readLocale('pt-BR') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmTitle).toBe('Alterar tipo de domingo?');
    });

    it('pt-BR has changeConfirmMessage', () => {
      const locale = readLocale('pt-BR') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmMessage).toContain('e/ou temas designados');
    });

    it('en has changeConfirmTitle', () => {
      const locale = readLocale('en') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmTitle).toBe('Change Sunday type?');
    });

    it('en has changeConfirmMessage', () => {
      const locale = readLocale('en') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmMessage).toContain('and/or topics assigned');
    });

    it('es has changeConfirmTitle', () => {
      const locale = readLocale('es') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmTitle).toBe('Cambiar tipo de domingo?');
    });

    it('es has changeConfirmMessage', () => {
      const locale = readLocale('es') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmMessage).toContain('y/o temas designados');
    });
  });

  // --- EC-F061-01: Change type when only topic assigned (no speaker) ---
  describe('EC-F061-01: Confirmation triggered by topic_title alone', () => {
    it('hasAssignments checks both speaker_name and topic_title with OR', () => {
      const content = getSundayCard();
      // The condition uses || so either speaker_name or topic_title triggers it
      expect(content).toContain('!!s.speaker_name || !!s.topic_title');
    });
  });

  // --- EC-F061-02: Change to other type (with custom reason modal) ---
  describe('EC-F061-02: Change to other type with confirmation', () => {
    it('confirmation onPress handles other type by opening otherModal', () => {
      const content = getSundayCard();
      const alertIdx = content.indexOf('Alert.alert');
      const alertEnd = content.indexOf(');', content.indexOf(']', alertIdx));
      const alertBody = content.substring(alertIdx, alertEnd);
      expect(alertBody).toContain("type === 'other'");
      expect(alertBody).toContain('setOtherModalVisible(true)');
    });
  });
});

// =============================================================================
// F062 (CR-116): LED click shows confirmed and gave_up options directly
// =============================================================================

describe('F062 (CR-116): LED click shows confirmed and gave_up options directly', () => {
  const getSpeechSlot = () => readSourceFile('components/SpeechSlot.tsx');
  const getStatusChangeModal = () => readSourceFile('components/StatusChangeModal.tsx');

  // --- AC-F062-01: LED click on assigned_invited shows only confirmed and gave_up ---
  // NOTE: Updated by CR-129 (F071) - ledAllowedStatuses is now a constant list
  //       excluding not_assigned, no longer conditional on assigned_invited only.
  describe('AC-F062-01: LED click on assigned_invited filters to 2 options', () => {
    it('ledAllowedStatuses is set for assigned_invited', () => {
      const content = getSpeechSlot();
      // F071 changed ledAllowedStatuses to a constant array
      expect(content).toContain('const ledAllowedStatuses: SpeechStatus[]');
      expect(content).toContain("'assigned_confirmed'");
      expect(content).toContain("'gave_up'");
    });

    it('ledAllowedStatuses contains assigned_confirmed and gave_up', () => {
      const content = getSpeechSlot();
      const ledIdx = content.indexOf('const ledAllowedStatuses');
      const ledEnd = content.indexOf('];', ledIdx) + 2;
      const ledSection = content.substring(ledIdx, ledEnd);
      expect(ledSection).toContain("'assigned_confirmed'");
      expect(ledSection).toContain("'gave_up'");
      // F071: also contains assigned_not_invited and assigned_invited
      expect(ledSection).toContain("'assigned_not_invited'");
      expect(ledSection).toContain("'assigned_invited'");
      // but not not_assigned
      expect(ledSection).not.toContain("'not_assigned'");
    });

    it('StatusChangeModal receives allowedStatuses prop', () => {
      const content = getSpeechSlot();
      expect(content).toContain('allowedStatuses={ledAllowedStatuses}');
    });
  });

  // --- AC-F062-02: LED click on assigned_not_invited shows all transitions ---
  // NOTE: Updated by CR-129 (F071) - ledAllowedStatuses is now constant
  describe('AC-F062-02: LED click on assigned_not_invited shows all transitions', () => {
    it('ledAllowedStatuses is a constant array (not conditional)', () => {
      const content = getSpeechSlot();
      const ledIdx = content.indexOf('const ledAllowedStatuses');
      const ledEnd = content.indexOf('];', ledIdx) + 2;
      const ledSection = content.substring(ledIdx, ledEnd);
      // F071: ledAllowedStatuses is now a constant, not conditional
      expect(ledSection).toContain("'assigned_not_invited'");
      expect(ledSection).toContain("'assigned_invited'");
    });

    it('assigned_not_invited has correct transitions in VALID_TRANSITIONS', () => {
      expect(getAvailableStatuses('assigned_not_invited')).toContain('assigned_invited');
      expect(getAvailableStatuses('assigned_not_invited')).toContain('not_assigned');
      // F077: assigned_not_invited now has 4 transitions (full mesh)
      expect(getAvailableStatuses('assigned_not_invited')).toHaveLength(4);
    });
  });

  // --- AC-F062-03: LED click on assigned_confirmed shows all except current and not_assigned ---
  // NOTE: F077 (CR-134) expanded transitions - assigned_confirmed now has 4 transitions
  describe('AC-F062-03: LED click on assigned_confirmed shows not_assigned', () => {
    it('assigned_confirmed has correct transitions (updated by F077)', () => {
      expect(getAvailableStatuses('assigned_confirmed')).toContain('not_assigned');
      // F077: assigned_confirmed now has 4 transitions (full mesh)
      expect(getAvailableStatuses('assigned_confirmed')).toHaveLength(4);
    });
  });

  // --- AC-F062-04: Labels translated using existing i18n keys ---
  describe('AC-F062-04: Labels use existing i18n speechStatus keys', () => {
    it('StatusChangeModal uses speechStatus.{status} for labels', () => {
      const content = getStatusChangeModal();
      expect(content).toContain('speechStatus.${status}');
    });

    it('pt-BR has speechStatus.assigned_confirmed', () => {
      const locale = readLocale('pt-BR') as { speechStatus: Record<string, string> };
      expect(locale.speechStatus.assigned_confirmed).toBeDefined();
    });

    it('pt-BR has speechStatus.gave_up', () => {
      const locale = readLocale('pt-BR') as { speechStatus: Record<string, string> };
      expect(locale.speechStatus.gave_up).toBeDefined();
    });
  });

  // --- AC-F062-05: LED not interactive for not_assigned ---
  // NOTE: F077 (CR-134) removed assigned_confirmed and gave_up from disabled
  describe('AC-F062-05: LED disabled for not_assigned', () => {
    it('LED disabled condition includes status not_assigned', () => {
      const content = getSpeechSlot();
      expect(content).toContain("disabled={isObserver || status === 'not_assigned'}");
      // F077: assigned_confirmed and gave_up no longer in disabled condition
      expect(content).not.toContain("status === 'assigned_confirmed'");
      expect(content).not.toContain("status === 'gave_up'");
    });
  });

  // --- AC-F062-06: StatusChangeModal without allowedStatuses works normally ---
  describe('AC-F062-06: StatusChangeModal backward compatible', () => {
    it('allowedStatuses is optional in StatusChangeModalProps', () => {
      const content = getStatusChangeModal();
      expect(content).toContain('allowedStatuses?: SpeechStatus[]');
    });

    it('when allowedStatuses undefined, filtered equals availableStatuses', () => {
      const content = getStatusChangeModal();
      // The filter logic: allowedStatuses ? filter : availableStatuses
      expect(content).toContain('const filtered = allowedStatuses');
      expect(content).toContain('availableStatuses.filter(s => allowedStatuses.includes(s))');
      expect(content).toContain(': availableStatuses');
    });

    it('FlatList uses filtered (not raw availableStatuses)', () => {
      const content = getStatusChangeModal();
      expect(content).toContain('data={filtered}');
    });

    it('assigned_invited has 4 available statuses by default', () => {
      const available = getAvailableStatuses('assigned_invited');
      expect(available).toHaveLength(4);
      expect(available).toContain('assigned_confirmed');
      expect(available).toContain('assigned_not_invited');
      expect(available).toContain('gave_up');
      expect(available).toContain('not_assigned');
    });

    it('filtering assigned_invited to [assigned_confirmed, gave_up] yields 2 results', () => {
      const available = getAvailableStatuses('assigned_invited');
      const allowed = ['assigned_confirmed', 'gave_up'];
      const filtered = available.filter(s => allowed.includes(s));
      expect(filtered).toHaveLength(2);
      expect(filtered).toContain('assigned_confirmed');
      expect(filtered).toContain('gave_up');
    });
  });

  // --- EC-F062-01: Status gave_up - LED click ---
  // NOTE: F077 (CR-134) expanded transitions - gave_up now has 4 transitions
  describe('EC-F062-01: gave_up LED click shows transitions', () => {
    it('gave_up has 4 transitions (updated by F077)', () => {
      const available = getAvailableStatuses('gave_up');
      expect(available).toContain('not_assigned');
      expect(available).toContain('assigned_not_invited');
      expect(available).toContain('assigned_invited');
      expect(available).toContain('assigned_confirmed');
      expect(available).toHaveLength(4);
    });

    it('ledAllowedStatuses is a constant that includes gave_up', () => {
      // F071: ledAllowedStatuses is now a constant array (not conditional)
      const content = getSpeechSlot();
      const ledIdx = content.indexOf('const ledAllowedStatuses');
      const ledEnd = content.indexOf('];', ledIdx) + 2;
      const ledSection = content.substring(ledIdx, ledEnd);
      // gave_up is in the allowed list (but LED is disabled for this state)
      expect(ledSection).toContain("'gave_up'");
    });
  });

  // --- EC-F062-02: Select confirmed from filtered modal ---
  describe('EC-F062-02: Select confirmed from filtered modal', () => {
    it('StatusChangeModal onSelect callback passes selected status', () => {
      const content = getStatusChangeModal();
      expect(content).toContain('onPress={() => onSelect(item)}');
    });

    it('assigned_confirmed is a valid transition from assigned_invited', () => {
      expect(VALID_TRANSITIONS.assigned_invited).toContain('assigned_confirmed');
    });
  });
});

// =============================================================================
// F063 (CR-119): Redesign speech cards layout (LED left, X right)
// =============================================================================

describe('F063 (CR-119): Redesign speech cards layout (superseded by F124/ADR-081)', () => {
  const getSpeechSlot = () => readSourceFile('components/SpeechSlot.tsx');

  // NOTE: F124 (CR-189, ADR-081) replaced the two-column layout with row-per-element.

  describe('AC-F063-01: LED is on label row (F124 row-per-element)', () => {
    it('StatusLED appears in labelRow (before speakerRow)', () => {
      const content = getSpeechSlot();
      expect(content).toContain('styles.labelRow');
      expect(content).toContain('styles.speakerRow');
      expect(content).toContain('<StatusLED');
    });

    it('label row contains status text', () => {
      const content = getSpeechSlot();
      const labelRowIdx = content.indexOf('styles.labelRow');
      expect(labelRowIdx).toBeGreaterThan(-1);
      const statusTextIdx = content.indexOf('styles.statusText', labelRowIdx);
      expect(statusTextIdx).toBeGreaterThan(-1);
    });
  });

  describe('AC-F063-02: X button in speakerRow actionArea (F124)', () => {
    it('Remove button appears in actionArea within speakerRow', () => {
      const content = getSpeechSlot();
      const speakerRowIdx = content.indexOf('styles.speakerRow');
      const actionAreaIdx = content.indexOf('styles.actionArea', speakerRowIdx);
      expect(actionAreaIdx).toBeGreaterThan(speakerRowIdx);
    });
  });

  describe('AC-F063-03: Speaker field has flex:1', () => {
    it('field style has flex: 1', () => {
      const content = getSpeechSlot();
      const fieldIdx = content.indexOf("field: {");
      const fieldEnd = content.indexOf('},', fieldIdx);
      const section = content.substring(fieldIdx, fieldEnd);
      expect(section).toContain('flex: 1');
    });
  });

  describe('AC-F063-04: Topic field aligned with speaker field', () => {
    it('topicRow no longer has marginLeft: 28', () => {
      const content = getSpeechSlot();
      const topicRowIdx = content.indexOf('topicRow:');
      const topicRowEnd = content.indexOf('},', topicRowIdx);
      const section = content.substring(topicRowIdx, topicRowEnd);
      expect(section).not.toContain('marginLeft: 28');
    });

    it('StatusLED size is 14, actionArea has width: 36 (F124 layout)', () => {
      const content = getSpeechSlot();
      expect(content).toContain('size={14}');
      expect(content).toMatch(/actionArea:\s*\{[^}]*width:\s*36/s);
    });
  });

  describe('AC-F063-05: All positions use same SpeechSlot', () => {
    it('speeches.tsx renders SpeechSlot for positions 1, 2, 3', () => {
      const content = readSourceFile('app/(tabs)/speeches.tsx');
      expect(content).toContain('SpeechSlot');
      expect(content).toContain('[1, 2, 3]');
    });

    it('SpeechSlot is a single component (not separate per position)', () => {
      const content = getSpeechSlot();
      const exportCount = content.split('export const SpeechSlot').length - 1;
      expect(exportCount).toBe(1);
    });
  });

  describe('AC-F063-06: LED continues to be pressable', () => {
    it('StatusLED has onPress={handleStatusPress}', () => {
      const content = getSpeechSlot();
      expect(content).toContain('onPress={handleStatusPress}');
    });

    it('handleStatusPress opens StatusChangeModal', () => {
      const content = getSpeechSlot();
      expect(content).toContain('setStatusModalVisible(true)');
    });
  });

  describe('AC-F063-07: Secretary/Observer do not see X', () => {
    it('X button conditional includes canUnassign', () => {
      const content = getSpeechSlot();
      expect(content).toContain('hasSpeaker && canUnassign');
    });

    it('canUnassign is based on speech:unassign permission', () => {
      const content = getSpeechSlot();
      expect(content).toContain("hasPermission('speech:unassign')");
    });
  });

  describe('EC-F063-01: SpeechSlot without speaker', () => {
    it('StatusLED still renders when no speaker (in labelRow, not in actionArea)', () => {
      const content = getSpeechSlot();
      expect(content).toContain('styles.labelRow');
      expect(content).toContain('<StatusLED');
      expect(content).toContain('hasSpeaker && canUnassign');
    });
  });

  describe('EC-F063-02: Layout handles narrow screens', () => {
    it('speaker field text has numberOfLines={1} for truncation', () => {
      const content = getSpeechSlot();
      expect(content).toContain('numberOfLines={1}');
    });

    it('fieldText has flex: 1', () => {
      const content = getSpeechSlot();
      const textIdx = content.indexOf('fieldText:');
      const textEnd = content.indexOf('},', textIdx);
      const section = content.substring(textIdx, textEnd);
      expect(section).toContain('flex: 1');
    });
  });
});

// =============================================================================
// F064 (CR-121): "(Last-minute assignment)" label in agenda
// =============================================================================

describe('F064 (CR-121): Last-minute assignment label (superseded by F121/CR-182: SpeakerField removed)', () => {
  const getAgendaForm = () => readSourceFile('components/AgendaForm.tsx');

  // NOTE: F121 (CR-182) removed SpeakerField (and with it, the lastMinuteLabel).
  // Override fields still exist in DB and are used by Presentation Mode, but
  // the label and inline editing UI are gone from AgendaForm.

  describe('AC-F064-01..03: lastMinuteLabel removed with SpeakerField (F121)', () => {
    it('no lastMinuteLabel in AgendaForm', () => {
      const content = getAgendaForm();
      expect(content).not.toContain('lastMinuteLabel');
    });

    it('no hasOverride in AgendaForm', () => {
      const content = getAgendaForm();
      expect(content).not.toContain('hasOverride');
    });

    it('no handleRevert in AgendaForm', () => {
      const content = getAgendaForm();
      expect(content).not.toContain('handleRevert');
    });
  });

  describe('AC-F064-04..06: i18n keys for lastMinuteAssignment still in locale files', () => {
    it('pt-BR has agenda.lastMinuteAssignment', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.lastMinuteAssignment).toContain('ltima hora');
    });

    it('en has agenda.lastMinuteAssignment', () => {
      const locale = readLocale('en') as { agenda: Record<string, string> };
      expect(locale.agenda.lastMinuteAssignment).toBe('(Last-minute assignment)');
    });

    it('es has agenda.lastMinuteAssignment', () => {
      const locale = readLocale('es') as { agenda: Record<string, string> };
      expect(locale.agenda.lastMinuteAssignment).toContain('ltima hora');
    });
  });

  describe('AC-F064-07: lastMinuteLabel style removed', () => {
    it('no lastMinuteLabel style in AgendaForm stylesheet', () => {
      const content = getAgendaForm();
      expect(content).not.toContain('lastMinuteLabel:');
    });
  });

  describe('AC-F064-08: No editing mode (removed by F121)', () => {
    it('no isEditing state in AgendaForm', () => {
      const content = getAgendaForm();
      expect(content).not.toContain('function SpeakerField');
    });
  });

  describe('EC-F064-01..02: Override comparison logic removed from AgendaForm (F121)', () => {
    it('no overrideName comparison in AgendaForm', () => {
      const content = getAgendaForm();
      expect(content).not.toContain('overrideName');
    });

    it('no handleSave function in AgendaForm', () => {
      const content = getAgendaForm();
      expect(content).not.toContain('const handleSave');
    });
  });

  // --- EC-F064-03: Presentation mode with override ---
  describe('EC-F064-03: Presentation mode does not show lastMinuteLabel', () => {
    it('lastMinuteLabel style is only in AgendaForm, not PresentationMode', () => {
      const content = readSourceFile('hooks/usePresentationMode.ts');
      expect(content).not.toContain('lastMinuteLabel');
      expect(content).not.toContain('lastMinuteAssignment');
    });
  });
});

// =============================================================================
// Cross-feature: i18n key consistency for Phase 2
// =============================================================================

describe('Cross-feature: i18n key consistency (Phase 2)', () => {
  it('all 3 locales should have sundayExceptions.changeConfirmTitle', () => {
    const ptBR = readLocale('pt-BR') as { sundayExceptions: Record<string, string> };
    const en = readLocale('en') as { sundayExceptions: Record<string, string> };
    const es = readLocale('es') as { sundayExceptions: Record<string, string> };

    expect(ptBR.sundayExceptions.changeConfirmTitle).toBeDefined();
    expect(en.sundayExceptions.changeConfirmTitle).toBeDefined();
    expect(es.sundayExceptions.changeConfirmTitle).toBeDefined();
  });

  it('all 3 locales should have sundayExceptions.changeConfirmMessage', () => {
    const ptBR = readLocale('pt-BR') as { sundayExceptions: Record<string, string> };
    const en = readLocale('en') as { sundayExceptions: Record<string, string> };
    const es = readLocale('es') as { sundayExceptions: Record<string, string> };

    expect(ptBR.sundayExceptions.changeConfirmMessage).toBeDefined();
    expect(en.sundayExceptions.changeConfirmMessage).toBeDefined();
    expect(es.sundayExceptions.changeConfirmMessage).toBeDefined();
  });

  it('all 3 locales should have agenda.lastMinuteAssignment', () => {
    const ptBR = readLocale('pt-BR') as { agenda: Record<string, string> };
    const en = readLocale('en') as { agenda: Record<string, string> };
    const es = readLocale('es') as { agenda: Record<string, string> };

    expect(ptBR.agenda.lastMinuteAssignment).toBeDefined();
    expect(en.agenda.lastMinuteAssignment).toBeDefined();
    expect(es.agenda.lastMinuteAssignment).toBeDefined();
  });

  it('all locale files should be valid JSON', () => {
    const ptBR = readLocale('pt-BR');
    const en = readLocale('en');
    const es = readLocale('es');
    expect(ptBR).toBeDefined();
    expect(en).toBeDefined();
    expect(es).toBeDefined();
  });
});

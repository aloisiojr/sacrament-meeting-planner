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

    it('should have X button inside topicField Pressable', () => {
      const content = getSpeechSlot();
      // Find the topic field section
      const topicFieldIdx = content.indexOf('styles.topicField');
      const topicFieldEnd = content.indexOf('</Pressable>', topicFieldIdx);
      const topicSection = content.substring(topicFieldIdx, topicFieldEnd);
      // Should contain the clear topic button within
      expect(topicSection).toContain('handleClearTopic');
      expect(topicSection).toContain("'\\u00D7'");
    });

    it('X button should be between topic text and dropdown arrow', () => {
      const content = getSpeechSlot();
      // Find topic field section (the outer Pressable with topicField style)
      const topicFieldIdx = content.indexOf('{/* Topic field */}');
      const topicFieldEnd = content.indexOf('{/* Status Change Modal */}');
      const topicSection = content.substring(topicFieldIdx, topicFieldEnd);
      // Order: topicText -> clearTopic X -> fieldArrow
      const topicTextIdx = topicSection.indexOf('topicText');
      const clearTopicIdx = topicSection.indexOf('handleClearTopic');
      const arrowIdx = topicSection.indexOf('fieldArrow');
      expect(topicTextIdx).toBeGreaterThan(-1);
      expect(clearTopicIdx).toBeGreaterThan(-1);
      expect(arrowIdx).toBeGreaterThan(-1);
      expect(topicTextIdx).toBeLessThan(clearTopicIdx);
      expect(clearTopicIdx).toBeLessThan(arrowIdx);
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

    it('NextSundaysSection should wire onClearTopic with assignTopic.mutate setting null', () => {
      const content = readSourceFile('components/NextSundaysSection.tsx');
      expect(content).toContain('handleClearTopic');
      expect(content).toContain('topicTitle: null');
      expect(content).toContain('topicLink: null');
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
      expect(locale.sundayExceptions.changeConfirmTitle).toBe('Alterar tipo de domingo');
    });

    it('pt-BR has changeConfirmMessage', () => {
      const locale = readLocale('pt-BR') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmMessage).toContain('discursantes ou temas');
    });

    it('en has changeConfirmTitle', () => {
      const locale = readLocale('en') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmTitle).toBe('Change sunday type');
    });

    it('en has changeConfirmMessage', () => {
      const locale = readLocale('en') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmMessage).toContain('speakers or topics');
    });

    it('es has changeConfirmTitle', () => {
      const locale = readLocale('es') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmTitle).toBe('Cambiar tipo de domingo');
    });

    it('es has changeConfirmMessage', () => {
      const locale = readLocale('es') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmMessage).toContain('oradores o temas');
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
      expect(getAvailableStatuses('assigned_not_invited')).toHaveLength(2);
    });
  });

  // --- AC-F062-03: LED click on assigned_confirmed shows not_assigned ---
  describe('AC-F062-03: LED click on assigned_confirmed shows not_assigned', () => {
    it('assigned_confirmed has correct transition', () => {
      expect(getAvailableStatuses('assigned_confirmed')).toContain('not_assigned');
      expect(getAvailableStatuses('assigned_confirmed')).toHaveLength(1);
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
  // NOTE: Updated by CR-129 (F071) - disabled now includes terminal states
  describe('AC-F062-05: LED disabled for not_assigned', () => {
    it('LED disabled condition includes status not_assigned', () => {
      const content = getSpeechSlot();
      expect(content).toContain("disabled={isObserver || status === 'not_assigned'");
      expect(content).toContain("status === 'assigned_confirmed'");
      expect(content).toContain("status === 'gave_up'");
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
  // NOTE: Updated by CR-129 (F071) - gave_up LED is now disabled
  describe('EC-F062-01: gave_up LED click shows not_assigned', () => {
    it('gave_up has only not_assigned as transition', () => {
      expect(getAvailableStatuses('gave_up')).toEqual(['not_assigned']);
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

describe('F063 (CR-119): Redesign speech cards layout (LED left, X right)', () => {
  const getSpeechSlot = () => readSourceFile('components/SpeechSlot.tsx');

  // --- AC-F063-01: LED positioned as first element in row ---
  describe('AC-F063-01: LED is first element in row', () => {
    it('StatusLED appears before speaker field inside styles.row', () => {
      const content = getSpeechSlot();
      // Find the row View
      const rowIdx = content.indexOf('styles.row');
      // Find the closing of the row View
      const rowEnd = content.indexOf('</View>', rowIdx);
      const rowSection = content.substring(rowIdx, rowEnd);
      // LED should come before Pressable (speaker field)
      const ledIdx = rowSection.indexOf('StatusLED');
      const speakerFieldIdx = rowSection.indexOf('<Pressable');
      expect(ledIdx).toBeGreaterThan(-1);
      expect(speakerFieldIdx).toBeGreaterThan(-1);
      expect(ledIdx).toBeLessThan(speakerFieldIdx);
    });

    it('row contains LED comment before speaker comment', () => {
      const content = getSpeechSlot();
      const rowIdx = content.indexOf('styles.row');
      const rowEnd = content.indexOf('</View>', rowIdx);
      const rowSection = content.substring(rowIdx, rowEnd);
      const ledCommentIdx = rowSection.indexOf('{/* LED */}');
      const speakerCommentIdx = rowSection.indexOf('{/* Speaker field */}');
      expect(ledCommentIdx).toBeLessThan(speakerCommentIdx);
    });
  });

  // --- AC-F063-02: X button is last element in row ---
  describe('AC-F063-02: X button is last element in row', () => {
    it('Remove button appears after speaker field in row', () => {
      const content = getSpeechSlot();
      const rowIdx = content.indexOf('styles.row');
      const rowEnd = content.indexOf('</View>', rowIdx);
      const rowSection = content.substring(rowIdx, rowEnd);
      const speakerCommentIdx = rowSection.indexOf('{/* Speaker field */}');
      const removeCommentIdx = rowSection.indexOf('{/* Remove button */}');
      expect(removeCommentIdx).toBeGreaterThan(speakerCommentIdx);
    });
  });

  // --- AC-F063-03: Speaker field has flex:1 ---
  describe('AC-F063-03: Speaker field has flex:1', () => {
    it('field style has flex: 1', () => {
      const content = getSpeechSlot();
      const fieldIdx = content.indexOf("field: {");
      const fieldEnd = content.indexOf('},', fieldIdx);
      const section = content.substring(fieldIdx, fieldEnd);
      expect(section).toContain('flex: 1');
    });
  });

  // --- AC-F063-04: Topic field aligned with speaker field ---
  describe('AC-F063-04: Topic field aligned with speaker field', () => {
    it('topicField has marginLeft: 28', () => {
      const content = getSpeechSlot();
      const topicFieldIdx = content.indexOf('topicField:');
      const topicFieldEnd = content.indexOf('},', topicFieldIdx);
      const section = content.substring(topicFieldIdx, topicFieldEnd);
      expect(section).toContain('marginLeft: 28');
    });

    it('marginLeft 28 = LED size 16 + gap 12', () => {
      // Verify the LED size and gap values
      const content = getSpeechSlot();
      // LED size is 16
      expect(content).toContain('size={16}');
      // Row gap is 12
      expect(content).toContain('gap: 12');
      // 16 + 12 = 28
    });
  });

  // --- AC-F063-05: All 3 positions use the same SpeechSlot component ---
  describe('AC-F063-05: All positions use same SpeechSlot', () => {
    it('speeches.tsx renders SpeechSlot for positions 1, 2, 3', () => {
      const content = readSourceFile('app/(tabs)/speeches.tsx');
      // All positions use the same SpeechSlot component
      expect(content).toContain('SpeechSlot');
      // Uses map over positions [1, 2, 3]
      expect(content).toContain('[1, 2, 3]');
    });

    it('SpeechSlot is a single component (not separate per position)', () => {
      const content = getSpeechSlot();
      // Should have exactly one export of SpeechSlot
      const exportCount = content.split('export const SpeechSlot').length - 1;
      expect(exportCount).toBe(1);
    });
  });

  // --- AC-F063-06: LED continues to be functional ---
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

  // --- AC-F063-07: Secretary and Observer do not see X button ---
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

  // --- EC-F063-01: SpeechSlot without speaker ---
  describe('EC-F063-01: SpeechSlot without speaker', () => {
    it('LED still renders when no speaker (status not_assigned)', () => {
      const content = getSpeechSlot();
      // StatusLED is always rendered (not conditional on hasSpeaker)
      const rowIdx = content.indexOf('styles.row');
      const rowEnd = content.indexOf('</View>', rowIdx);
      const rowSection = content.substring(rowIdx, rowEnd);
      // LED is unconditional inside the row
      expect(rowSection).toContain('<StatusLED');
      // X button is conditional
      expect(rowSection).toContain('hasSpeaker && canUnassign');
    });
  });

  // --- EC-F063-02: Narrow screen ---
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

describe('F064 (CR-121): Last-minute assignment label in agenda', () => {
  const getAgendaForm = () => readSourceFile('components/AgendaForm.tsx');

  // --- AC-F064-01: Label shown when override is active ---
  describe('AC-F064-01: Label shown when hasOverride && !isEditing', () => {
    it('lastMinuteAssignment label rendered when hasOverride and not editing', () => {
      const content = getAgendaForm();
      expect(content).toContain('hasOverride && !isEditing');
      expect(content).toContain("t('agenda.lastMinuteAssignment')");
    });

    it('label uses lastMinuteLabel style', () => {
      const content = getAgendaForm();
      expect(content).toContain('styles.lastMinuteLabel');
    });
  });

  // --- AC-F064-02: Label NOT shown when no override ---
  describe('AC-F064-02: Label NOT shown when no override', () => {
    it('hasOverride is false when overrideName is null', () => {
      const content = getAgendaForm();
      expect(content).toContain('const hasOverride = overrideName !== null && overrideName !== speakerName');
    });
  });

  // --- AC-F064-03: Label disappears when override is reverted ---
  describe('AC-F064-03: Label disappears on revert', () => {
    it('handleRevert calls onEditOverride(null)', () => {
      const content = getAgendaForm();
      const revertIdx = content.indexOf('const handleRevert');
      const revertEnd = content.indexOf('}, [', revertIdx);
      const revertBody = content.substring(revertIdx, revertEnd);
      expect(revertBody).toContain('onEditOverride(null)');
    });
  });

  // --- AC-F064-04: Label translated in pt-BR ---
  describe('AC-F064-04: Label translated in pt-BR', () => {
    it('pt-BR has agenda.lastMinuteAssignment', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.lastMinuteAssignment).toContain('ltima hora');
    });
  });

  // --- AC-F064-05: Label translated in English ---
  describe('AC-F064-05: Label translated in English', () => {
    it('en has agenda.lastMinuteAssignment = "(Last-minute assignment)"', () => {
      const locale = readLocale('en') as { agenda: Record<string, string> };
      expect(locale.agenda.lastMinuteAssignment).toBe('(Last-minute assignment)');
    });
  });

  // --- AC-F064-06: Label translated in Spanish ---
  describe('AC-F064-06: Label translated in Spanish', () => {
    it('es has agenda.lastMinuteAssignment', () => {
      const locale = readLocale('es') as { agenda: Record<string, string> };
      expect(locale.agenda.lastMinuteAssignment).toContain('ltima hora');
    });
  });

  // --- AC-F064-07: Label has subtle visual style ---
  describe('AC-F064-07: Label style is subtle (fontSize, italic, tertiary color)', () => {
    it('lastMinuteLabel has fontSize 11', () => {
      const content = getAgendaForm();
      const styleIdx = content.indexOf('lastMinuteLabel:');
      const styleEnd = content.indexOf('},', styleIdx);
      const section = content.substring(styleIdx, styleEnd);
      expect(section).toContain('fontSize: 11');
    });

    it('lastMinuteLabel has fontStyle italic', () => {
      const content = getAgendaForm();
      const styleIdx = content.indexOf('lastMinuteLabel:');
      const styleEnd = content.indexOf('},', styleIdx);
      const section = content.substring(styleIdx, styleEnd);
      expect(section).toContain("fontStyle: 'italic'");
    });

    it('label uses textTertiary color', () => {
      const content = getAgendaForm();
      // The label's color is set to colors.textTertiary
      expect(content).toContain('styles.lastMinuteLabel, { color: colors.textTertiary }');
    });
  });

  // --- AC-F064-08: Label NOT shown during editing ---
  describe('AC-F064-08: Label NOT shown during editing mode', () => {
    it('label condition includes !isEditing', () => {
      const content = getAgendaForm();
      // The rendering condition is: {hasOverride && !isEditing && (
      expect(content).toContain('hasOverride && !isEditing');
    });
  });

  // --- EC-F064-01: Override with same name as speaker ---
  describe('EC-F064-01: Override with same name as speaker', () => {
    it('hasOverride is false when overrideName equals speakerName', () => {
      const content = getAgendaForm();
      // The condition: overrideName !== null && overrideName !== speakerName
      expect(content).toContain('overrideName !== speakerName');
    });

    it('handleSave clears override when trimmed equals speakerName', () => {
      const content = getAgendaForm();
      const saveIdx = content.indexOf('const handleSave');
      const saveEnd = content.indexOf('}, [', saveIdx);
      const saveBody = content.substring(saveIdx, saveEnd);
      expect(saveBody).toContain('trimmed === speakerName');
      expect(saveBody).toContain('onEditOverride(null)');
    });
  });

  // --- EC-F064-02: Override with empty name ---
  describe('EC-F064-02: Override with empty name', () => {
    it('handleSave clears override when input is empty', () => {
      const content = getAgendaForm();
      const saveIdx = content.indexOf('const handleSave');
      const saveEnd = content.indexOf('}, [', saveIdx);
      const saveBody = content.substring(saveIdx, saveEnd);
      expect(saveBody).toContain('!trimmed');
      expect(saveBody).toContain('onEditOverride(null)');
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

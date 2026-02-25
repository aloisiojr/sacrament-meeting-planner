/**
 * Tests for Batch 11: Status Options Fix, Custom Name Help Text,
 *   Agenda Initial Scroll, Checkbox Visual in ActorSelector, Actor Delete Text
 *
 * F077 (CR-134): Show all status options except current and not_assigned
 * F078 (CR-135): Change custom name help text in PrayerSelector
 * F079 (CR-136): Agenda tab initial scroll to next sunday (centered)
 * F080 (CR-137): Checkbox-style visual for multi-select in ActorSelector
 * F081 (CR-138): Change actor delete confirmation text
 *
 * Covers acceptance criteria:
 *   AC-077-01..08, AC-078-01..04, AC-079-01..04, AC-080-01..07, AC-081-01..05
 * Covers edge cases:
 *   EC-077-01..02, EC-078-01, EC-079-01..02, EC-080-01..02, EC-081-01
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  VALID_TRANSITIONS,
  isValidTransition,
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
// F077 (CR-134): Show all status options except current and not_assigned
// =============================================================================

describe('F077 (CR-134): Status transition full mesh', () => {
  const getSpeechSlot = () => readSourceFile('components/SpeechSlot.tsx');
  const getDropdown = () => readSourceFile('components/InviteActionDropdown.tsx');
  const getUseSpeeches = () => readSourceFile('hooks/useSpeeches.ts');

  // --- VALID_TRANSITIONS expansion ---
  describe('VALID_TRANSITIONS: full mesh for assigned statuses', () => {
    it('assigned_not_invited has 4 transitions', () => {
      expect(VALID_TRANSITIONS.assigned_not_invited).toHaveLength(4);
    });

    it('assigned_not_invited can go to assigned_invited', () => {
      expect(VALID_TRANSITIONS.assigned_not_invited).toContain('assigned_invited');
    });

    it('assigned_not_invited can go to assigned_confirmed', () => {
      expect(VALID_TRANSITIONS.assigned_not_invited).toContain('assigned_confirmed');
    });

    it('assigned_not_invited can go to gave_up', () => {
      expect(VALID_TRANSITIONS.assigned_not_invited).toContain('gave_up');
    });

    it('assigned_not_invited can go to not_assigned', () => {
      expect(VALID_TRANSITIONS.assigned_not_invited).toContain('not_assigned');
    });

    it('assigned_invited has 4 transitions', () => {
      expect(VALID_TRANSITIONS.assigned_invited).toHaveLength(4);
    });

    it('assigned_confirmed has 4 transitions', () => {
      expect(VALID_TRANSITIONS.assigned_confirmed).toHaveLength(4);
    });

    it('assigned_confirmed can go to assigned_not_invited', () => {
      expect(VALID_TRANSITIONS.assigned_confirmed).toContain('assigned_not_invited');
    });

    it('assigned_confirmed can go to assigned_invited', () => {
      expect(VALID_TRANSITIONS.assigned_confirmed).toContain('assigned_invited');
    });

    it('assigned_confirmed can go to gave_up', () => {
      expect(VALID_TRANSITIONS.assigned_confirmed).toContain('gave_up');
    });

    it('gave_up has 4 transitions', () => {
      expect(VALID_TRANSITIONS.gave_up).toHaveLength(4);
    });

    it('gave_up can go to assigned_not_invited', () => {
      expect(VALID_TRANSITIONS.gave_up).toContain('assigned_not_invited');
    });

    it('gave_up can go to assigned_invited', () => {
      expect(VALID_TRANSITIONS.gave_up).toContain('assigned_invited');
    });

    it('gave_up can go to assigned_confirmed', () => {
      expect(VALID_TRANSITIONS.gave_up).toContain('assigned_confirmed');
    });

    it('not_assigned -> [assigned_not_invited] preserved', () => {
      expect(VALID_TRANSITIONS.not_assigned).toEqual(['assigned_not_invited']);
    });

    it('getAvailableStatuses returns 4 for assigned_not_invited', () => {
      expect(getAvailableStatuses('assigned_not_invited')).toHaveLength(4);
    });

    it('getAvailableStatuses returns 4 for assigned_confirmed', () => {
      expect(getAvailableStatuses('assigned_confirmed')).toHaveLength(4);
    });

    it('getAvailableStatuses returns 4 for gave_up', () => {
      expect(getAvailableStatuses('gave_up')).toHaveLength(4);
    });

    it('getAvailableStatuses returns 1 for not_assigned', () => {
      expect(getAvailableStatuses('not_assigned')).toHaveLength(1);
    });

    it('isValidTransition(assigned_confirmed, assigned_invited) is true', () => {
      expect(isValidTransition('assigned_confirmed', 'assigned_invited')).toBe(true);
    });

    it('isValidTransition(gave_up, assigned_confirmed) is true', () => {
      expect(isValidTransition('gave_up', 'assigned_confirmed')).toBe(true);
    });

    it('isValidTransition(assigned_confirmed, gave_up) is true', () => {
      expect(isValidTransition('assigned_confirmed', 'gave_up')).toBe(true);
    });

    it('isValidTransition(gave_up, assigned_invited) is true', () => {
      expect(isValidTransition('gave_up', 'assigned_invited')).toBe(true);
    });
  });

  // --- AC-077-01: InviteActionDropdown dynamic options ---
  describe('AC-077-01: InviteActionDropdown shows dynamic options excluding current status', () => {
    it('ALL_ASSIGNED_STATUSES defined with 4 statuses', () => {
      const content = getDropdown();
      expect(content).toContain('const ALL_ASSIGNED_STATUSES');
      expect(content).toContain("'assigned_not_invited'");
      expect(content).toContain("'assigned_invited'");
      expect(content).toContain("'assigned_confirmed'");
      expect(content).toContain("'gave_up'");
    });

    it('statusOptions filters out current speech status', () => {
      const content = getDropdown();
      expect(content).toContain('ALL_ASSIGNED_STATUSES.filter');
      expect(content).toContain('s !== speech?.status');
    });

    it('statusOptions.map renders dynamic Pressable list', () => {
      const content = getDropdown();
      expect(content).toContain('statusOptions.map');
      expect(content).toContain('key={statusOption}');
    });

    it('onChangeStatus called with speech.id and statusOption', () => {
      const content = getDropdown();
      expect(content).toContain('onChangeStatus(speech.id, statusOption)');
    });

    it('t() uses template literal for speech status labels', () => {
      const content = getDropdown();
      expect(content).toContain('speechStatus.${statusOption}');
    });

    it('STATUS_INDICATOR_COLORS used dynamically with bracket notation', () => {
      const content = getDropdown();
      expect(content).toContain('STATUS_INDICATOR_COLORS[statusOption]');
    });
  });

  // --- AC-077-02: not_assigned never in InviteActionDropdown ---
  describe('AC-077-02: not_assigned never appears in InviteActionDropdown', () => {
    it('ALL_ASSIGNED_STATUSES does not contain not_assigned', () => {
      const content = getDropdown();
      const allIdx = content.indexOf('const ALL_ASSIGNED_STATUSES');
      const allEnd = content.indexOf('];', allIdx) + 2;
      const allSection = content.substring(allIdx, allEnd);
      expect(allSection).not.toContain("'not_assigned'");
    });
  });

  // --- AC-077-03: StatusChangeModal shows 3 options for assigned_not_invited ---
  describe('AC-077-03: StatusChangeModal shows 3 options from SpeechSlot', () => {
    it('ledAllowedStatuses contains 4 assigned statuses', () => {
      const content = getSpeechSlot();
      const ledIdx = content.indexOf('const ledAllowedStatuses');
      const ledEnd = content.indexOf('];', ledIdx) + 2;
      const ledSection = content.substring(ledIdx, ledEnd);
      expect(ledSection).toContain("'assigned_not_invited'");
      expect(ledSection).toContain("'assigned_invited'");
      expect(ledSection).toContain("'assigned_confirmed'");
      expect(ledSection).toContain("'gave_up'");
    });

    it('ledAllowedStatuses does NOT contain not_assigned', () => {
      const content = getSpeechSlot();
      const ledIdx = content.indexOf('const ledAllowedStatuses');
      const ledEnd = content.indexOf('];', ledIdx) + 2;
      const ledSection = content.substring(ledIdx, ledEnd);
      expect(ledSection).not.toContain("'not_assigned'");
    });

    it('StatusChangeModal receives allowedStatuses={ledAllowedStatuses}', () => {
      const content = getSpeechSlot();
      expect(content).toContain('allowedStatuses={ledAllowedStatuses}');
    });
  });

  // --- AC-077-04: LED clicavel para assigned_confirmed ---
  describe('AC-077-04: LED clickable for assigned_confirmed', () => {
    it('handleStatusPress does NOT block assigned_confirmed', () => {
      const content = getSpeechSlot();
      const handlePress = content.substring(
        content.indexOf('handleStatusPress'),
        content.indexOf('setStatusModalVisible(true)')
      );
      expect(handlePress).not.toContain("status === 'assigned_confirmed'");
    });

    it('StatusLED disabled does NOT include assigned_confirmed', () => {
      const content = getSpeechSlot();
      const disabledIdx = content.indexOf('disabled={isObserver');
      const disabledEnd = content.indexOf('}', disabledIdx + 20) + 1;
      const disabledSection = content.substring(disabledIdx, disabledEnd);
      expect(disabledSection).not.toContain("'assigned_confirmed'");
    });
  });

  // --- AC-077-05: LED clicavel para gave_up ---
  describe('AC-077-05: LED clickable for gave_up', () => {
    it('handleStatusPress does NOT block gave_up', () => {
      const content = getSpeechSlot();
      const handlePress = content.substring(
        content.indexOf('handleStatusPress'),
        content.indexOf('setStatusModalVisible(true)')
      );
      expect(handlePress).not.toContain("status === 'gave_up'");
    });

    it('StatusLED disabled does NOT include gave_up', () => {
      const content = getSpeechSlot();
      const disabledIdx = content.indexOf('disabled={isObserver');
      const disabledEnd = content.indexOf('}', disabledIdx + 20) + 1;
      const disabledSection = content.substring(disabledIdx, disabledEnd);
      expect(disabledSection).not.toContain("'gave_up'");
    });
  });

  // --- AC-077-06: LED disabled for not_assigned ---
  describe('AC-077-06: LED disabled for not_assigned (preserved)', () => {
    it('handleStatusPress blocks not_assigned', () => {
      const content = getSpeechSlot();
      const handlePress = content.substring(
        content.indexOf('handleStatusPress'),
        content.indexOf('setStatusModalVisible(true)')
      );
      expect(handlePress).toContain("status === 'not_assigned'");
    });

    it('StatusLED disabled includes not_assigned', () => {
      const content = getSpeechSlot();
      expect(content).toContain("disabled={isObserver || status === 'not_assigned'}");
    });
  });

  // --- AC-077-07: Observer cannot click LED ---
  describe('AC-077-07: Observer LED disabled (preserved)', () => {
    it('StatusLED disabled includes isObserver', () => {
      const content = getSpeechSlot();
      expect(content).toContain('disabled={isObserver');
    });
  });

  // --- AC-077-08: Status change persists correctly ---
  describe('AC-077-08: Status change uses onChangeStatus callback', () => {
    it('handleStatusSelect calls onChangeStatus with speech.id and newStatus', () => {
      const content = getSpeechSlot();
      expect(content).toContain("onChangeStatus?.(speech.id, newStatus)");
    });

    it('StatusChangeModal onSelect calls handleStatusSelect', () => {
      const content = getSpeechSlot();
      expect(content).toContain('onSelect={handleStatusSelect}');
    });

    it('InviteActionDropdown calls onChangeStatus(speech.id, statusOption)', () => {
      const content = getDropdown();
      expect(content).toContain('onChangeStatus(speech.id, statusOption)');
    });
  });

  // --- EC-077-01: InviteActionDropdown with null speech ---
  describe('EC-077-01: InviteActionDropdown safety for null speech', () => {
    it('statusOptions uses optional chaining on speech?.status', () => {
      const content = getDropdown();
      expect(content).toContain('speech?.status');
    });

    it('onChangeStatus guarded by speech check', () => {
      const content = getDropdown();
      expect(content).toContain('if (speech)');
    });
  });

  // --- EC-077-02: Concurrent status changes ---
  describe('EC-077-02: Concurrent status changes (last-write-wins)', () => {
    it('all assigned statuses can reach not_assigned (unassign path)', () => {
      expect(isValidTransition('assigned_not_invited', 'not_assigned')).toBe(true);
      expect(isValidTransition('assigned_invited', 'not_assigned')).toBe(true);
      expect(isValidTransition('assigned_confirmed', 'not_assigned')).toBe(true);
      expect(isValidTransition('gave_up', 'not_assigned')).toBe(true);
    });
  });
});

// =============================================================================
// F078 (CR-135): Change custom name help text
// =============================================================================

describe('F078 (CR-135): Change custom name help text in PrayerSelector', () => {
  // --- AC-078-01: pt-BR text updated ---
  describe('AC-078-01: pt-BR customNameHint text updated', () => {
    it('pt-BR agenda.customNameHint has new text', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.customNameHint).toBe(
        'Para escolher um não membro, digite o nome da pessoa e adicione como nome personalizado'
      );
    });
  });

  // --- AC-078-02: en text updated ---
  describe('AC-078-02: en customNameHint text updated', () => {
    it('en agenda.customNameHint has new text', () => {
      const locale = readLocale('en') as { agenda: Record<string, string> };
      expect(locale.agenda.customNameHint).toBe(
        "To choose a non-member, type the person's name and add as a custom name"
      );
    });
  });

  // --- AC-078-03: es text updated ---
  describe('AC-078-03: es customNameHint text updated', () => {
    it('es agenda.customNameHint has new text', () => {
      const locale = readLocale('es') as { agenda: Record<string, string> };
      expect(locale.agenda.customNameHint).toBe(
        'Para elegir un no miembro, escriba el nombre de la persona y agregue como nombre personalizado'
      );
    });
  });

  // --- AC-078-04: PrayerSelector renders hint correctly ---
  describe('AC-078-04: PrayerSelector renders hint via i18n key', () => {
    it('PrayerSelector uses t(agenda.customNameHint)', () => {
      const content = readSourceFile('components/PrayerSelector.tsx');
      expect(content).toContain("t('agenda.customNameHint')");
    });
  });

  // --- EC-078-01: Long text wraps naturally ---
  describe('EC-078-01: Long text wraps naturally', () => {
    it('customNameHintText style does not have numberOfLines', () => {
      const content = readSourceFile('components/PrayerSelector.tsx');
      const hintIdx = content.indexOf('customNameHintText');
      const hintSection = content.substring(hintIdx, hintIdx + 200);
      expect(hintSection).not.toContain('numberOfLines');
    });
  });
});

// =============================================================================
// F079 (CR-136): Agenda tab initial scroll to next sunday (centered)
// =============================================================================

describe('F079 (CR-136): Agenda tab initial scroll to show next sunday in middle', () => {
  const getAgenda = () => readSourceFile('app/(tabs)/agenda.tsx');
  const getSpeeches = () => readSourceFile('app/(tabs)/speeches.tsx');

  // --- AC-079-01/02: scrollToIndex uses viewPosition: 0.5 ---
  describe('AC-079-01/02: Initial scroll centers next sunday', () => {
    it('scrollToIndex in useEffect uses viewPosition: 0.5', () => {
      const content = getAgenda();
      const useEffectIdx = content.indexOf('hasScrolled.current = true');
      const useEffectEnd = content.indexOf('}, [initialIndex', useEffectIdx);
      const useEffectSection = content.substring(useEffectIdx, useEffectEnd);
      expect(useEffectSection).toContain('viewPosition: 0.5');
    });

    it('scrollToIndex uses animated: false', () => {
      const content = getAgenda();
      const useEffectIdx = content.indexOf('hasScrolled.current = true');
      const useEffectEnd = content.indexOf('}, [initialIndex', useEffectIdx);
      const useEffectSection = content.substring(useEffectIdx, useEffectEnd);
      expect(useEffectSection).toContain('animated: false');
    });
  });

  // --- AC-079-03: onScrollToIndexFailed fallback with retry ---
  describe('AC-079-03: onScrollToIndexFailed with retry', () => {
    it('onScrollToIndexFailed uses scrollToOffset first', () => {
      const content = getAgenda();
      const failIdx = content.indexOf('onScrollToIndexFailed');
      const failEnd = content.indexOf('[listItems.length]', failIdx);
      const failSection = content.substring(failIdx, failEnd);
      expect(failSection).toContain('scrollToOffset');
    });

    it('onScrollToIndexFailed retries with setTimeout', () => {
      const content = getAgenda();
      const failIdx = content.indexOf('onScrollToIndexFailed');
      const failEnd = content.indexOf('[listItems.length]', failIdx);
      const failSection = content.substring(failIdx, failEnd);
      expect(failSection).toContain('setTimeout');
    });

    it('retry uses viewPosition: 0.5', () => {
      const content = getAgenda();
      const failIdx = content.indexOf('onScrollToIndexFailed');
      const failEnd = content.indexOf('[listItems.length]', failIdx);
      const failSection = content.substring(failIdx, failEnd);
      expect(failSection).toContain('viewPosition: 0.5');
    });

    it('retry uses Math.min(info.index, listItems.length - 1)', () => {
      const content = getAgenda();
      const failIdx = content.indexOf('onScrollToIndexFailed');
      const failEnd = content.indexOf('[listItems.length]', failIdx);
      const failSection = content.substring(failIdx, failEnd);
      expect(failSection).toContain('Math.min(info.index, listItems.length - 1)');
    });

    it('onScrollToIndexFailed dependency array includes listItems.length', () => {
      const content = getAgenda();
      const failIdx = content.indexOf('onScrollToIndexFailed');
      const failDeps = content.indexOf('[listItems.length]', failIdx);
      expect(failDeps).toBeGreaterThan(failIdx);
    });
  });

  // --- AC-079-04: speeches.tsx not affected ---
  describe('AC-079-04: speeches.tsx not affected', () => {
    it('speeches.tsx does NOT use viewPosition: 0.5 for initial scroll', () => {
      const content = getSpeeches();
      // speeches initial scroll does NOT have viewPosition
      const initialScrollIdx = content.indexOf('flatListRef.current?.scrollToIndex({ index, animated: false }');
      expect(initialScrollIdx).toBeGreaterThan(-1);
    });

    it('speeches.tsx handleToggle still uses viewPosition: 0', () => {
      const content = getSpeeches();
      const toggleIdx = content.indexOf('handleToggle');
      const toggleEnd = content.indexOf('}, [', toggleIdx);
      const toggleSection = content.substring(toggleIdx, toggleEnd);
      expect(toggleSection).toContain('viewPosition: 0');
    });
  });

  // --- EC-079-01: Empty list ---
  describe('EC-079-01: Empty list guard', () => {
    it('useEffect guards initialIndex > 0', () => {
      const content = getAgenda();
      expect(content).toContain('initialIndex > 0');
    });

    it('useEffect guards listItems.length > 0', () => {
      const content = getAgenda();
      expect(content).toContain('listItems.length > 0');
    });
  });

  // --- EC-079-02: Next sunday is first item ---
  describe('EC-079-02: Next sunday is first item', () => {
    it('viewPosition: 0.5 handles first item naturally (scroll to top area)', () => {
      // viewPosition: 0.5 with index 0 or 1 results in top-of-list scroll
      // FlatList handles this edge case natively
      const content = getAgenda();
      expect(content).toContain('viewPosition: 0.5');
    });
  });

  // --- Agenda handleToggle not affected ---
  describe('Internal: handleToggle scroll unchanged', () => {
    it('handleToggle uses viewPosition: 0 (card at top)', () => {
      const content = getAgenda();
      const handleToggleIdx = content.indexOf('handleToggle');
      const handleToggleEnd = content.indexOf('], [expandedDate', handleToggleIdx);
      const handleToggleSection = content.substring(handleToggleIdx, handleToggleEnd);
      expect(handleToggleSection).toContain('viewPosition: 0');
    });
  });
});

// =============================================================================
// F080 (CR-137): Checkbox-style visual for multi-select in ActorSelector
// =============================================================================

describe('F080 (CR-137): Checkbox visual in ActorSelector multi-select', () => {
  const getActorSelector = () => readSourceFile('components/ActorSelector.tsx');

  // --- AC-080-01: Checkbox rendered in multi-select mode ---
  describe('AC-080-01: Checkbox visual in multi-select mode', () => {
    it('multiSelect conditional renders checkbox icons', () => {
      const content = getActorSelector();
      expect(content).toContain('{multiSelect && (');
    });

    it('checkbox area uses marginRight: 8 for spacing', () => {
      const content = getActorSelector();
      // CR-236: SVG icons replaced Unicode checkboxes; wrapper View uses marginRight: 8
      expect(content).toContain('marginRight: 8');
    });
  });

  // --- AC-080-02: Checkbox filled for selected items ---
  describe('AC-080-02: Checkbox filled for selected items', () => {
    it('selected items render CheckSquareIcon SVG component', () => {
      const content = getActorSelector();
      // CR-236: Replaced Unicode U+2611 with CheckSquareIcon SVG
      expect(content).toContain('CheckSquareIcon');
    });
  });

  // --- AC-080-03: Checkbox empty for unselected items ---
  describe('AC-080-03: Checkbox empty for unselected items', () => {
    it('unselected items render SquareIcon SVG component', () => {
      const content = getActorSelector();
      // CR-236: Replaced Unicode U+2610 with SquareIcon SVG
      expect(content).toContain('SquareIcon');
    });

    it('isSelected ternary switches between CheckSquareIcon and SquareIcon', () => {
      const content = getActorSelector();
      // CR-236: SVG icons replaced Unicode checkbox ternary
      expect(content).toContain('isSelected');
      expect(content).toContain('CheckSquareIcon');
      expect(content).toContain('SquareIcon');
    });
  });

  // --- AC-080-04: Toggle via checkbox or name ---
  describe('AC-080-04: Toggle via Pressable area (checkbox + name)', () => {
    it('actorNameArea Pressable has onPress={handleSelect}', () => {
      const content = getActorSelector();
      expect(content).toContain('onPress={() => handleSelect(item)}');
    });
  });

  // --- AC-080-05: Edit/delete icons visually separate ---
  describe('AC-080-05: Edit/delete icons remain in separate area', () => {
    it('actorActions View with edit and delete icons exists', () => {
      const content = getActorSelector();
      expect(content).toContain('styles.actorActions');
    });

    it('edit icon (U+270E) still rendered', () => {
      const content = getActorSelector();
      expect(content).toContain("'\\u270E'");
    });

    it('delete icon (U+2716) still rendered', () => {
      const content = getActorSelector();
      expect(content).toContain("'\\u2716'");
    });
  });

  // --- AC-080-06: Single-select mode unchanged ---
  describe('AC-080-06: Single-select mode has no checkbox', () => {
    it('checkbox is guarded by multiSelect condition', () => {
      const content = getActorSelector();
      // The checkbox is only rendered when multiSelect is true
      const checkboxIdx = content.indexOf("'\\u2611'");
      const preCheckbox = content.substring(checkboxIdx - 200, checkboxIdx);
      expect(preCheckbox).toContain('multiSelect');
    });

    it('old checkmark prefix U+2713 is NOT in source', () => {
      const content = getActorSelector();
      expect(content).not.toContain("'\\u2713 '");
    });
  });

  // --- AC-080-07: Toggle logic preserved ---
  describe('AC-080-07: Toggle logic via handleSelect preserved', () => {
    it('handleSelect calls onSelect(actor)', () => {
      const content = getActorSelector();
      expect(content).toContain('onSelect(actor)');
    });
  });

  // --- EC-080-01: Empty list ---
  describe('EC-080-01: Empty actor list shows noResults', () => {
    it('FlatList has ListEmptyComponent with noResults', () => {
      const content = getActorSelector();
      expect(content).toContain('ListEmptyComponent');
      expect(content).toContain("t('common.noResults')");
    });
  });

  // --- EC-080-02: Actor in edit mode during multi-select ---
  describe('EC-080-02: Editing mode hides checkbox', () => {
    it('checkbox is inside the non-editing branch', () => {
      const content = getActorSelector();
      // When isEditing, a TextInput is shown instead of Pressable with checkbox
      expect(content).toContain('isEditing ?');
      const editInputIdx = content.indexOf('isEditing ?');
      const pressableIdx = content.indexOf('styles.actorNameArea', editInputIdx);
      const checkboxInPressable = content.indexOf("'\\u2611'", pressableIdx);
      // Checkbox is in the else branch (after the editing TextInput)
      expect(checkboxInPressable).toBeGreaterThan(editInputIdx);
    });
  });

  // --- Styles ---
  describe('Internal: actorNameArea styles for checkbox layout', () => {
    it('actorNameArea has flexDirection row', () => {
      const content = getActorSelector();
      const areaIdx = content.indexOf('actorNameArea:');
      const areaEnd = content.indexOf('},', areaIdx);
      const areaStyle = content.substring(areaIdx, areaEnd);
      expect(areaStyle).toContain("flexDirection: 'row'");
    });

    it('actorNameArea has alignItems center', () => {
      const content = getActorSelector();
      const areaIdx = content.indexOf('actorNameArea:');
      const areaEnd = content.indexOf('},', areaIdx);
      const areaStyle = content.substring(areaIdx, areaEnd);
      expect(areaStyle).toContain("alignItems: 'center'");
    });

    it('CheckSquareIcon and SquareIcon use size={20}', () => {
      const content = getActorSelector();
      // CR-236: SVG icons use size={20} prop instead of fontSize style
      expect(content).toContain('size={20}');
    });

    it('checkbox wrapper View has marginRight 8', () => {
      const content = getActorSelector();
      // CR-236: SVG icon wrapper uses inline marginRight: 8 instead of styles.checkbox
      expect(content).toContain('marginRight: 8');
    });
  });
});

// =============================================================================
// F081 (CR-138): Change actor delete confirmation text
// =============================================================================

describe('F081 (CR-138): Actor delete confirmation text', () => {
  const getActorSelector = () => readSourceFile('components/ActorSelector.tsx');

  // --- AC-081-01: ActorSelector uses new i18n key ---
  describe('AC-081-01: ActorSelector uses actors.deleteConfirm', () => {
    it('handleDelete uses t(actors.deleteConfirm)', () => {
      const content = getActorSelector();
      expect(content).toContain("t('actors.deleteConfirm')");
    });

    it('handleDelete does NOT use members.deleteConfirm', () => {
      const content = getActorSelector();
      expect(content).not.toContain("t('members.deleteConfirm')");
    });
  });

  // --- AC-081-02: pt-BR text correct ---
  describe('AC-081-02: pt-BR actors.deleteConfirm text', () => {
    it('pt-BR actors.deleteConfirm has correct text', () => {
      const locale = readLocale('pt-BR') as { actors: Record<string, string> };
      expect(locale.actors.deleteConfirm).toBe(
        'Tem certeza que deseja excluir essa pessoa da lista de pessoas que podem ser escolhidas para serem reconhecidas durante a Reunião Sacramental?'
      );
    });
  });

  // --- AC-081-03: en text correct ---
  describe('AC-081-03: en actors.deleteConfirm text', () => {
    it('en actors.deleteConfirm has correct text', () => {
      const locale = readLocale('en') as { actors: Record<string, string> };
      expect(locale.actors.deleteConfirm).toBe(
        'Are you sure you want to remove this person from the list of people who can be chosen to be acknowledged during Sacrament Meeting?'
      );
    });
  });

  // --- AC-081-04: es text correct ---
  describe('AC-081-04: es actors.deleteConfirm text', () => {
    it('es actors.deleteConfirm has correct text', () => {
      const locale = readLocale('es') as { actors: Record<string, string> };
      expect(locale.actors.deleteConfirm).toBe(
        '¿Está seguro de que desea eliminar a esta persona de la lista de personas que pueden ser elegidas para ser reconocidas durante la Reunión Sacramental?'
      );
    });
  });

  // --- AC-081-05: members.deleteConfirm unchanged ---
  describe('AC-081-05: members.deleteConfirm preserved', () => {
    it('pt-BR members.deleteConfirm still has original text', () => {
      const locale = readLocale('pt-BR') as { members: Record<string, string> };
      expect(locale.members.deleteConfirm).toBe(
        'Tem certeza que deseja excluir este membro?'
      );
    });

    it('en members.deleteConfirm still has original text', () => {
      const locale = readLocale('en') as { members: Record<string, string> };
      expect(locale.members.deleteConfirm).toBe(
        'Are you sure you want to delete this member?'
      );
    });

    it('es members.deleteConfirm still has original text', () => {
      const locale = readLocale('es') as { members: Record<string, string> };
      expect(locale.members.deleteConfirm).toBe(
        '¿Está seguro de que desea eliminar este miembro?'
      );
    });
  });

  // --- EC-081-01: i18n fallback for missing key ---
  describe('EC-081-01: actors section exists in all locales', () => {
    it('pt-BR has actors section', () => {
      const locale = readLocale('pt-BR') as { actors: Record<string, string> };
      expect(locale.actors).toBeDefined();
    });

    it('en has actors section', () => {
      const locale = readLocale('en') as { actors: Record<string, string> };
      expect(locale.actors).toBeDefined();
    });

    it('es has actors section', () => {
      const locale = readLocale('es') as { actors: Record<string, string> };
      expect(locale.actors).toBeDefined();
    });
  });
});

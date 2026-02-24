/**
 * Tests for Batch 10, Phase 1: LED Redesign, Sunday Type Data Cleanup,
 *   Speech LED Status Options, Country Code Display Fix
 *
 * F069 (CR-126): StatusLED redesign - flat circle without 3D effect, new color scheme
 * F070 (CR-127): Delete speech assignments when changing sunday type away from 'speeches'
 * F071 (CR-129): LED click shows all status options except 'not_assigned'
 * F072 (CR-130): Fix country code display for countries sharing same dial code
 *
 * Covers acceptance criteria:
 *   AC-F069-01..12, AC-F070-01..08, AC-F071-01..07, AC-F072-01..08
 * Covers edge cases:
 *   EC-F069-01..03, EC-F070-01..04, EC-F071-01..02, EC-F072-01..02
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
// F069 (CR-126): StatusLED flat circle redesign
// =============================================================================

describe('F069 (CR-126): StatusLED flat circle redesign', () => {
  const getStatusLED = () => readSourceFile('components/StatusLED.tsx');
  const getStatusChangeModal = () => readSourceFile('components/StatusChangeModal.tsx');

  // --- AC-F069-01: LED is a flat circle without 3D effect ---
  describe('AC-F069-01: LED is a flat circle without 3D effect', () => {
    it('StatusLED does NOT contain outerRing style', () => {
      const content = getStatusLED();
      expect(content).not.toContain('outerRing');
    });

    it('StatusLED does NOT contain innerCircle style', () => {
      const content = getStatusLED();
      expect(content).not.toContain('innerCircle');
    });

    it('StatusLED does NOT contain glowDot style', () => {
      const content = getStatusLED();
      expect(content).not.toContain('glowDot');
    });

    it('StatusLED contains styles.circle', () => {
      const content = getStatusLED();
      expect(content).toContain('styles.circle');
    });

    it('StatusLED renders single Animated.View with circle style', () => {
      const content = getStatusLED();
      expect(content).toContain('<Animated.View');
      expect(content).toContain('styles.circle');
      expect(content).toContain('borderRadius: size / 2');
    });
  });

  // --- AC-F069-02: Gray color for not_assigned ---
  describe('AC-F069-02: Gray color for not_assigned', () => {
    it('STATUS_COLORS.not_assigned is #9CA3AF', () => {
      const content = getStatusLED();
      const match = content.match(/not_assigned:\s*'([^']+)'/);
      expect(match?.[1]).toBe('#9CA3AF');
    });
  });

  // --- AC-F069-03: Orange color for assigned_not_invited ---
  describe('AC-F069-03: Orange color for assigned_not_invited', () => {
    it('STATUS_COLORS.assigned_not_invited is #F97316', () => {
      const content = getStatusLED();
      const match = content.match(/assigned_not_invited:\s*'([^']+)'/);
      expect(match?.[1]).toBe('#F97316');
    });
  });

  // --- AC-F069-04: Yellow color for assigned_invited ---
  describe('AC-F069-04: Yellow color for assigned_invited', () => {
    it('STATUS_COLORS.assigned_invited is #EAB308', () => {
      const content = getStatusLED();
      const match = content.match(/assigned_invited:\s*'([^']+)'/);
      expect(match?.[1]).toBe('#EAB308');
    });
  });

  // --- AC-F069-05: Green color for assigned_confirmed ---
  describe('AC-F069-05: Green color for assigned_confirmed', () => {
    it('STATUS_COLORS.assigned_confirmed is #22C55E', () => {
      const content = getStatusLED();
      const match = content.match(/assigned_confirmed:\s*'([^']+)'/);
      expect(match?.[1]).toBe('#22C55E');
    });
  });

  // --- AC-F069-06: Dark wine color for gave_up ---
  describe('AC-F069-06: Dark wine color for gave_up', () => {
    it('STATUS_COLORS.gave_up is #7F1D1D', () => {
      const content = getStatusLED();
      const match = content.match(/gave_up:\s*'([^']+)'/);
      expect(match?.[1]).toBe('#7F1D1D');
    });
  });

  // --- AC-F069-07: Fading animation for assigned_not_invited ---
  describe('AC-F069-07: Fading animation for assigned_not_invited', () => {
    it('StatusLED has withRepeat animation for assigned_not_invited', () => {
      const content = getStatusLED();
      expect(content).toContain("status === 'assigned_not_invited'");
      expect(content).toContain('withRepeat');
      expect(content).toContain('withSequence');
    });

    it('animation uses opacity 0.3 to 1', () => {
      const content = getStatusLED();
      expect(content).toContain('withTiming(0.3');
      expect(content).toContain('withTiming(1');
    });

    it('animation duration is 1000ms per phase (total ~2s)', () => {
      const content = getStatusLED();
      expect(content).toContain('duration: 1000');
    });
  });

  // --- AC-F069-08: Reduced motion disables animation ---
  describe('AC-F069-08: Reduced motion disables animation', () => {
    it('StatusLED checks isReduceMotionEnabled', () => {
      const content = getStatusLED();
      expect(content).toContain('isReduceMotionEnabled');
    });

    it('StatusLED listens for reduceMotionChanged', () => {
      const content = getStatusLED();
      expect(content).toContain('reduceMotionChanged');
    });

    it('reduced motion cancels animation and sets opacity to 1', () => {
      const content = getStatusLED();
      expect(content).toContain('cancelAnimation(fadeOpacity)');
      expect(content).toContain('fadeOpacity.value = 1');
    });
  });

  // --- AC-F069-09: StatusChangeModal uses same new colors ---
  describe('AC-F069-09: StatusChangeModal uses same new colors', () => {
    it('STATUS_INDICATOR_COLORS.assigned_not_invited is #F97316', () => {
      const content = getStatusChangeModal();
      const match = content.match(/assigned_not_invited:\s*'([^']+)'/);
      expect(match?.[1]).toBe('#F97316');
    });

    it('STATUS_INDICATOR_COLORS.assigned_invited is #EAB308', () => {
      const content = getStatusChangeModal();
      const match = content.match(/assigned_invited:\s*'([^']+)'/);
      expect(match?.[1]).toBe('#EAB308');
    });

    it('STATUS_INDICATOR_COLORS.assigned_confirmed is #22C55E', () => {
      const content = getStatusChangeModal();
      const match = content.match(/assigned_confirmed:\s*'([^']+)'/);
      expect(match?.[1]).toBe('#22C55E');
    });

    it('STATUS_INDICATOR_COLORS.gave_up is #7F1D1D', () => {
      const content = getStatusChangeModal();
      const match = content.match(/gave_up:\s*'([^']+)'/);
      expect(match?.[1]).toBe('#7F1D1D');
    });

    it('STATUS_INDICATOR_COLORS.not_assigned is #9CA3AF (maintained)', () => {
      const content = getStatusChangeModal();
      const match = content.match(/not_assigned:\s*'([^']+)'/);
      expect(match?.[1]).toBe('#9CA3AF');
    });
  });

  // --- AC-F069-10: LED pressable preserved ---
  describe('AC-F069-10: LED pressable preserved', () => {
    it('StatusLED renders Pressable when onPress and not disabled', () => {
      const content = getStatusLED();
      expect(content).toContain('onPress && !disabled');
      expect(content).toContain('<Pressable');
    });

    it('StatusLED renders View when no onPress or disabled', () => {
      const content = getStatusLED();
      expect(content).toContain("accessibilityRole=\"image\"");
    });
  });

  // --- AC-F069-11: Size prop preserved ---
  describe('AC-F069-11: Size prop preserved', () => {
    it('StatusLED uses size prop for width and height', () => {
      const content = getStatusLED();
      expect(content).toContain('width: size');
      expect(content).toContain('height: size');
    });

    it('StatusLED has default size of 16', () => {
      const content = getStatusLED();
      expect(content).toContain('size = 16');
    });
  });

  // --- AC-F069-12: LEDs in SundayCard header use new colors ---
  describe('AC-F069-12: LEDs in SundayCard header use StatusLED component', () => {
    it('SundayCard imports StatusLED', () => {
      const content = readSourceFile('components/SundayCard.tsx');
      expect(content).toContain("import { StatusLED }");
    });

    it('SundayCard renders StatusLED in header', () => {
      const content = readSourceFile('components/SundayCard.tsx');
      expect(content).toContain('<StatusLED');
    });
  });

  // --- EC-F069-01: Dark wine in light mode ---
  describe('EC-F069-01: Dark wine (#7F1D1D) visibility', () => {
    it('gave_up color is #7F1D1D (acceptable in both modes)', () => {
      const content = getStatusLED();
      expect(content).toContain("'#7F1D1D'");
    });
  });

  // --- EC-F069-02: Dark wine in dark mode ---
  describe('EC-F069-02: Same color in dark mode (no theme switch)', () => {
    it('STATUS_COLORS does not reference theme colors (static)', () => {
      const content = getStatusLED();
      const colorsSection = content.substring(
        content.indexOf('STATUS_COLORS'),
        content.indexOf('// --- Component ---')
      );
      expect(colorsSection).not.toContain('colors.');
      expect(colorsSection).not.toContain('useTheme');
    });
  });

  // --- EC-F069-03: InviteActionDropdown inherits STATUS_INDICATOR_COLORS ---
  describe('EC-F069-03: InviteActionDropdown inherits colors from StatusChangeModal', () => {
    it('InviteActionDropdown imports STATUS_INDICATOR_COLORS from StatusChangeModal', () => {
      const content = readSourceFile('components/InviteActionDropdown.tsx');
      expect(content).toContain('STATUS_INDICATOR_COLORS');
      expect(content).toContain("from './StatusChangeModal'");
    });

    it('InviteManagementSection uses StatusLED component (inherits new colors)', () => {
      const content = readSourceFile('components/InviteManagementSection.tsx');
      expect(content).toContain("import { StatusLED }");
    });
  });

  // --- LEDColors interface removed ---
  describe('Internal: LEDColors interface removed', () => {
    it('StatusLED does NOT contain LEDColors interface', () => {
      const content = getStatusLED();
      expect(content).not.toContain('interface LEDColors');
    });

    it('STATUS_COLORS is Record<SpeechStatus, string> (not LEDColors)', () => {
      const content = getStatusLED();
      expect(content).toContain('Record<SpeechStatus, string>');
    });
  });
});

// =============================================================================
// F070 (CR-127): Delete speeches on sunday type change
// =============================================================================

describe('F070 (CR-127): Delete speech assignments on sunday type change', () => {
  const getUseSpeeches = () => readSourceFile('hooks/useSpeeches.ts');
  const getSundayCard = () => readSourceFile('components/SundayCard.tsx');
  const getSpeeches = () => readSourceFile('app/(tabs)/speeches.tsx');

  // --- AC-F070-01: Speeches deleted from DB after confirming type change ---
  describe('AC-F070-01: useDeleteSpeechesByDate hook exists and deletes speeches', () => {
    it('useDeleteSpeechesByDate is exported from useSpeeches.ts', () => {
      const content = getUseSpeeches();
      expect(content).toContain('export function useDeleteSpeechesByDate()');
    });

    it('useDeleteSpeechesByDate calls supabase.delete on speeches table', () => {
      const content = getUseSpeeches();
      const hookStart = content.indexOf('useDeleteSpeechesByDate');
      const hookSection = content.substring(hookStart);
      expect(hookSection).toContain(".from('speeches')");
      expect(hookSection).toContain('.delete()');
    });

    it('useDeleteSpeechesByDate filters by ward_id and sunday_date', () => {
      const content = getUseSpeeches();
      const hookStart = content.indexOf('useDeleteSpeechesByDate');
      const hookSection = content.substring(hookStart);
      expect(hookSection).toContain(".eq('ward_id'");
      expect(hookSection).toContain(".eq('sunday_date'");
    });
  });

  // --- AC-F070-02: Cancel does NOT delete speeches ---
  describe('AC-F070-02: Cancel in dialog does NOT call onDeleteSpeeches', () => {
    it('Alert.alert has cancel button with style cancel', () => {
      const content = getSundayCard();
      const alertSection = content.substring(
        content.indexOf('changeConfirmTitle'),
        content.indexOf("style: 'destructive'")
      );
      expect(alertSection).toContain("style: 'cancel'");
    });

    it('onDeleteSpeeches is only called in destructive onPress', () => {
      const content = getSundayCard();
      // onDeleteSpeeches should appear in the destructive onPress callback
      const destructiveIdx = content.indexOf("style: 'destructive'");
      const cancelIdx = content.indexOf("style: 'cancel'");
      // The onDeleteSpeeches call should be after destructive, not in cancel
      const deleteCallIdx = content.indexOf('onDeleteSpeeches?.(date)', cancelIdx);
      expect(deleteCallIdx).toBeGreaterThan(destructiveIdx - 200); // close to destructive handler
    });
  });

  // --- AC-F070-03: No assignments - speeches still cleaned up ---
  describe('AC-F070-03: No assignments flow also cleans up speeches', () => {
    it('SundayCard calls onDeleteSpeeches when currentType is speeches (no assignments)', () => {
      const content = getSundayCard();
      // After the hasAssignments block with return, there should be another
      // check for currentType === SUNDAY_TYPE_SPEECHES that calls onDeleteSpeeches
      const handleSelectSection = content.substring(
        content.indexOf('const handleSelect'),
        content.indexOf('const handleOtherConfirm')
      );
      // Count occurrences of SUNDAY_TYPE_SPEECHES
      const matches = handleSelectSection.match(/currentType === SUNDAY_TYPE_SPEECHES/g);
      expect(matches?.length).toBeGreaterThanOrEqual(2); // One for hasAssignments, one for no assignments
      // The second occurrence should have onDeleteSpeeches
      const secondIdx = handleSelectSection.indexOf(
        'currentType === SUNDAY_TYPE_SPEECHES',
        handleSelectSection.indexOf('currentType === SUNDAY_TYPE_SPEECHES') + 10
      );
      const afterSecond = handleSelectSection.substring(secondIdx, secondIdx + 100);
      expect(afterSecond).toContain('onDeleteSpeeches');
    });
  });

  // --- AC-F070-04: Revert to speeches does NOT call onDeleteSpeeches ---
  describe('AC-F070-04: Revert to speeches does NOT delete', () => {
    it('revert to speeches calls onRevertToSpeeches, not onDeleteSpeeches', () => {
      const content = getSundayCard();
      // The handleSelect function returns early when type === SUNDAY_TYPE_SPEECHES
      const handleSelectIdx = content.indexOf('const handleSelect');
      const handleSelectSection = content.substring(handleSelectIdx, handleSelectIdx + 300);
      expect(handleSelectSection).toContain('SUNDAY_TYPE_SPEECHES');
      expect(handleSelectSection).toContain('onRevertToSpeeches');
      // The onRevertToSpeeches block should return before any onDeleteSpeeches call
      const revertIdx = handleSelectSection.indexOf('onRevertToSpeeches');
      const returnIdx = handleSelectSection.indexOf('return', handleSelectSection.indexOf('SUNDAY_TYPE_SPEECHES'));
      expect(returnIdx).toBeLessThan(revertIdx + 50); // return is near onRevertToSpeeches
    });
  });

  // --- AC-F070-05: SundayCard receives onDeleteSpeeches from speeches.tsx ---
  describe('AC-F070-05: speeches.tsx wiring', () => {
    it('speeches.tsx imports useDeleteSpeechesByDate', () => {
      const content = getSpeeches();
      expect(content).toContain('useDeleteSpeechesByDate');
    });

    it('speeches.tsx creates deleteSpeechesByDate instance', () => {
      const content = getSpeeches();
      expect(content).toContain('useDeleteSpeechesByDate()');
    });

    it('speeches.tsx has handleDeleteSpeeches callback', () => {
      const content = getSpeeches();
      expect(content).toContain('handleDeleteSpeeches');
      expect(content).toContain('deleteSpeechesByDate.mutate');
    });

    it('SundayCard receives onDeleteSpeeches prop', () => {
      const content = getSpeeches();
      expect(content).toContain('onDeleteSpeeches={handleDeleteSpeeches}');
    });
  });

  // --- AC-F070-06: Cache invalidated after delete ---
  describe('AC-F070-06: speechKeys.all invalidated on success', () => {
    it('useDeleteSpeechesByDate invalidates speechKeys.all', () => {
      const content = getUseSpeeches();
      const hookStart = content.indexOf('useDeleteSpeechesByDate');
      const hookSection = content.substring(hookStart);
      expect(hookSection).toContain('speechKeys.all');
      expect(hookSection).toContain('invalidateQueries');
    });
  });

  // --- AC-F070-07: Audit log records cleanup ---
  describe('AC-F070-07: Activity log for speech_cleanup', () => {
    it('useDeleteSpeechesByDate logs speech_cleanup action', () => {
      const content = getUseSpeeches();
      const hookStart = content.indexOf('useDeleteSpeechesByDate');
      const hookSection = content.substring(hookStart);
      expect(hookSection).toContain("'speech_cleanup'");
      expect(hookSection).toContain('logAction');
    });
  });

  // --- AC-F070-08: Other type flow works ---
  describe('AC-F070-08: Other type with confirmation', () => {
    it('SundayCard calls onDeleteSpeeches before opening other modal', () => {
      const content = getSundayCard();
      const destructiveSection = content.substring(
        content.indexOf("style: 'destructive'"),
        content.indexOf("style: 'destructive'") + 400
      );
      expect(destructiveSection).toContain('onDeleteSpeeches');
      expect(destructiveSection).toContain("'other'");
    });
  });

  // --- EC-F070-01/02: Only topic or mix of assignments ---
  describe('EC-F070-01/02: hasAssignments checks both speaker and topic', () => {
    it('SundayCard checks speaker_name and topic_title for hasAssignments', () => {
      const content = getSundayCard();
      expect(content).toContain('s.speaker_name');
      expect(content).toContain('s.topic_title');
    });
  });

  // --- EC-F070-03: Error on delete propagated ---
  describe('EC-F070-03: Error propagated from supabase delete', () => {
    it('useDeleteSpeechesByDate throws on error', () => {
      const content = getUseSpeeches();
      const hookStart = content.indexOf('useDeleteSpeechesByDate');
      // CR-221 expanded input type, so function is longer; use 600 chars (superseded by batch25-phase1)
      const hookSection = content.substring(hookStart, hookStart + 600);
      expect(hookSection).toContain('if (error) throw error');
    });
  });

  // --- EC-F070-04: Empty speeches (0 rows) do not cause error ---
  describe('EC-F070-04: Delete with 0 rows does not error', () => {
    it('delete uses eq filters (returns 0 rows safely)', () => {
      const content = getUseSpeeches();
      const hookStart = content.indexOf('useDeleteSpeechesByDate');
      const hookSection = content.substring(hookStart, hookStart + 400);
      // Supabase .delete().eq() returns success even with 0 rows affected
      expect(hookSection).toContain('.delete()');
      expect(hookSection).toContain(".eq('ward_id'");
      expect(hookSection).toContain(".eq('sunday_date'");
    });
  });

  // --- SundayTypeDropdown has date prop ---
  describe('Internal: SundayTypeDropdown receives date prop', () => {
    it('SundayTypeDropdownProps includes date', () => {
      const content = getSundayCard();
      const propsSection = content.substring(
        content.indexOf('interface SundayTypeDropdownProps'),
        content.indexOf('function SundayTypeDropdown')
      );
      expect(propsSection).toContain('date: string');
    });

    it('SundayTypeDropdownProps includes onDeleteSpeeches', () => {
      const content = getSundayCard();
      const propsSection = content.substring(
        content.indexOf('interface SundayTypeDropdownProps'),
        content.indexOf('function SundayTypeDropdown')
      );
      expect(propsSection).toContain('onDeleteSpeeches');
    });

    it('SundayCardProps includes onDeleteSpeeches', () => {
      const content = getSundayCard();
      const propsSection = content.substring(
        content.indexOf('interface SundayCardProps'),
        content.indexOf('// --- DateBlock')
      );
      expect(propsSection).toContain('onDeleteSpeeches');
    });

    it('SundayCard passes date to SundayTypeDropdown', () => {
      const content = getSundayCard();
      expect(content).toContain('date={date}');
    });
  });

  // --- handleDeleteSpeeches in renderItem deps ---
  describe('Internal: handleDeleteSpeeches in renderItem deps', () => {
    it('speeches.tsx renderItem deps include handleDeleteSpeeches', () => {
      const content = getSpeeches();
      const depsSection = content.substring(
        content.lastIndexOf('handleRemoveException'),
        content.indexOf('if (speechesError')
      );
      expect(depsSection).toContain('handleDeleteSpeeches');
    });
  });
});

// =============================================================================
// F071 (CR-129): LED click filter + disable for terminal states
// =============================================================================

describe('F071 (CR-129): LED click shows all except not_assigned', () => {
  const getSpeechSlot = () => readSourceFile('components/SpeechSlot.tsx');

  // --- AC-F071-01: assigned_not_invited -> modal shows [assigned_invited] ---
  describe('AC-F071-01: LED filter for assigned_not_invited', () => {
    it('ledAllowedStatuses includes assigned_invited', () => {
      const content = getSpeechSlot();
      const ledSection = content.substring(
        content.indexOf('ledAllowedStatuses'),
        content.indexOf('];', content.indexOf('ledAllowedStatuses')) + 2
      );
      expect(ledSection).toContain("'assigned_invited'");
    });
  });

  // --- AC-F071-02: assigned_invited -> modal shows 3 options ---
  describe('AC-F071-02: LED filter for assigned_invited shows 3 options', () => {
    it('ledAllowedStatuses includes assigned_confirmed', () => {
      const content = getSpeechSlot();
      const ledSection = content.substring(
        content.indexOf('ledAllowedStatuses'),
        content.indexOf('];', content.indexOf('ledAllowedStatuses')) + 2
      );
      expect(ledSection).toContain("'assigned_confirmed'");
    });

    it('ledAllowedStatuses includes gave_up', () => {
      const content = getSpeechSlot();
      const ledSection = content.substring(
        content.indexOf('ledAllowedStatuses'),
        content.indexOf('];', content.indexOf('ledAllowedStatuses')) + 2
      );
      expect(ledSection).toContain("'gave_up'");
    });

    it('ledAllowedStatuses includes assigned_not_invited', () => {
      const content = getSpeechSlot();
      const ledSection = content.substring(
        content.indexOf('ledAllowedStatuses'),
        content.indexOf('];', content.indexOf('ledAllowedStatuses')) + 2
      );
      expect(ledSection).toContain("'assigned_not_invited'");
    });
  });

  // --- AC-F071-03: assigned_confirmed LED now enabled (F077 override) ---
  // NOTE: F077 (CR-134) removed the assigned_confirmed block from handleStatusPress and disabled prop.
  describe('AC-F071-03: LED enabled for assigned_confirmed (updated by F077)', () => {
    it('handleStatusPress does NOT return early for assigned_confirmed', () => {
      const content = getSpeechSlot();
      const handlePress = content.substring(
        content.indexOf('handleStatusPress'),
        content.indexOf('setStatusModalVisible(true)')
      );
      expect(handlePress).not.toContain("status === 'assigned_confirmed'");
    });

    it('StatusLED disabled does NOT include assigned_confirmed', () => {
      const content = getSpeechSlot();
      const disabledSection = content.substring(
        content.indexOf('disabled={isObserver'),
        content.indexOf('}', content.indexOf('disabled={isObserver') + 20) + 1
      );
      expect(disabledSection).not.toContain("'assigned_confirmed'");
    });
  });

  // --- AC-F071-04: gave_up LED now enabled (F077 override) ---
  // NOTE: F077 (CR-134) removed the gave_up block from handleStatusPress and disabled prop.
  describe('AC-F071-04: LED enabled for gave_up (updated by F077)', () => {
    it('handleStatusPress does NOT return early for gave_up', () => {
      const content = getSpeechSlot();
      const handlePress = content.substring(
        content.indexOf('handleStatusPress'),
        content.indexOf('setStatusModalVisible(true)')
      );
      expect(handlePress).not.toContain("status === 'gave_up'");
    });

    it('StatusLED disabled does NOT include gave_up', () => {
      const content = getSpeechSlot();
      const disabledSection = content.substring(
        content.indexOf('disabled={isObserver'),
        content.indexOf('}', content.indexOf('disabled={isObserver') + 20) + 1
      );
      expect(disabledSection).not.toContain("'gave_up'");
    });
  });

  // --- AC-F071-05: not_assigned LED disabled (preserved) ---
  describe('AC-F071-05: LED disabled for not_assigned (preserved)', () => {
    it('handleStatusPress returns early for not_assigned', () => {
      const content = getSpeechSlot();
      const handlePress = content.substring(
        content.indexOf('handleStatusPress'),
        content.indexOf('setStatusModalVisible(true)')
      );
      expect(handlePress).toContain("status === 'not_assigned'");
    });

    // F118 (CR-181): StatusLED disabled check is now inside !isPos2Disabled block
    it('StatusLED disabled includes not_assigned', () => {
      const content = getSpeechSlot();
      // StatusLED has disabled={isObserver || status === 'not_assigned'}
      expect(content).toContain("disabled={isObserver || status === 'not_assigned'}");
    });
  });

  // --- AC-F071-06: StatusChangeModal without allowedStatuses not affected ---
  describe('AC-F071-06: StatusChangeModal without allowedStatuses works', () => {
    it('StatusChangeModal allowedStatuses is optional', () => {
      const content = readSourceFile('components/StatusChangeModal.tsx');
      expect(content).toContain('allowedStatuses?: SpeechStatus[]');
    });

    it('StatusChangeModal shows all transitions when allowedStatuses not provided', () => {
      const content = readSourceFile('components/StatusChangeModal.tsx');
      expect(content).toContain('allowedStatuses\n    ? availableStatuses.filter');
    });
  });

  // --- AC-F071-07: Observer LED disabled (preserved) ---
  describe('AC-F071-07: Observer LED disabled (preserved)', () => {
    it('StatusLED disabled includes isObserver', () => {
      const content = getSpeechSlot();
      expect(content).toContain('disabled={isObserver');
    });
  });

  // --- EC-F071-01/02: Terminal states require X button to change ---
  describe('EC-F071-01/02: Terminal states use X button to re-assign', () => {
    it('ledAllowedStatuses is a constant (not conditional on status)', () => {
      const content = getSpeechSlot();
      expect(content).toContain('const ledAllowedStatuses: SpeechStatus[]');
      // It should NOT contain the old conditional pattern
      expect(content).not.toContain("status === 'assigned_invited'\n    ? ['assigned_confirmed'");
    });

    it('ledAllowedStatuses does NOT include not_assigned', () => {
      const content = getSpeechSlot();
      const ledSection = content.substring(
        content.indexOf('const ledAllowedStatuses'),
        content.indexOf('];', content.indexOf('const ledAllowedStatuses')) + 2
      );
      // It should include 4 statuses
      expect(ledSection).toContain("'assigned_not_invited'");
      expect(ledSection).toContain("'assigned_invited'");
      expect(ledSection).toContain("'assigned_confirmed'");
      expect(ledSection).toContain("'gave_up'");
      // And not include not_assigned
      expect(ledSection).not.toContain("'not_assigned'");
    });
  });

  // --- Internal: ledAllowedStatuses has exactly 4 entries ---
  describe('Internal: ledAllowedStatuses structure', () => {
    it('ledAllowedStatuses has 4 entries', () => {
      const content = getSpeechSlot();
      const ledSection = content.substring(
        content.indexOf('const ledAllowedStatuses'),
        content.indexOf('];', content.indexOf('const ledAllowedStatuses')) + 2
      );
      const statusMatches = ledSection.match(/'/g);
      // 4 statuses * 2 quotes each = 8 quote marks
      expect(statusMatches?.length).toBe(8);
    });
  });
});

// =============================================================================
// F072 (CR-130): Country code display fix
// =============================================================================

describe('F072 (CR-130): Country code display fix for shared dial codes', () => {
  const getMembers = () => readSourceFile('app/(tabs)/settings/members.tsx');
  const getCountryCodes = () => readSourceFile('lib/countryCodes.ts');

  // --- AC-F072-01/02/03: Flag display uses getCountryByLabel ---
  describe('AC-F072-01/02/03: Flag display via getCountryByLabel', () => {
    it('members.tsx imports getCountryByLabel from countryCodes', () => {
      const content = getMembers();
      expect(content).toContain('getCountryByLabel');
      expect(content).toContain("from '../../../lib/countryCodes'");
    });

    it('flag text uses getCountryByLabel(countryLabel)?.flag', () => {
      const content = getMembers();
      expect(content).toContain('getCountryByLabel(countryLabel)?.flag');
    });

    it('fallback to getFlagForCode(countryCode) when label not found', () => {
      const content = getMembers();
      expect(content).toContain('?? getFlagForCode(countryCode)');
    });
  });

  // --- AC-F072-04/05: Russia/Kazakhstan with +7 ---
  describe('AC-F072-04/05: Countries with shared +7 code', () => {
    it('getCountryByLabel exists in countryCodes.ts', () => {
      const content = getCountryCodes();
      expect(content).toContain('function getCountryByLabel');
    });

    it('Russia exists in COUNTRY_CODES with +7', () => {
      const content = getCountryCodes();
      expect(content).toContain("code: '+7'");
      expect(content).toContain('Russia');
    });

    it('Kazakhstan exists in COUNTRY_CODES with +7', () => {
      const content = getCountryCodes();
      expect(content).toContain('Kazakhstan');
    });
  });

  // --- AC-F072-06: Highlight uses label (preserved) ---
  describe('AC-F072-06: Highlight uses countryLabel (preserved)', () => {
    it('members.tsx highlight compares item.label with countryLabel', () => {
      const content = getMembers();
      expect(content).toContain('item.label === countryLabel');
    });
  });

  // --- AC-F072-07: Unique code countries not affected ---
  describe('AC-F072-07: Brazil with +55 not affected', () => {
    it('Brazil exists in COUNTRY_CODES with unique code +55', () => {
      const content = getCountryCodes();
      expect(content).toContain('Brazil');
      expect(content).toContain("code: '+55'");
    });
  });

  // --- AC-F072-08: Existing member with +1 shows US by default ---
  describe('AC-F072-08: Initialization with +1 defaults to US', () => {
    it('countryLabel initializes via COUNTRY_CODES.find by code', () => {
      const content = getMembers();
      expect(content).toContain("COUNTRY_CODES.find((c) => c.code ===");
    });

    it('US is listed before Canada in COUNTRY_CODES (ADR-043)', () => {
      const content = getCountryCodes();
      const usIdx = content.indexOf("'United States (+1)'");
      const caIdx = content.indexOf("'Canada (+1)'");
      expect(usIdx).toBeGreaterThan(-1);
      expect(caIdx).toBeGreaterThan(-1);
      expect(usIdx).toBeLessThan(caIdx);
    });
  });

  // --- EC-F072-01: Label not found fallback ---
  describe('EC-F072-01: Fallback when countryLabel not found', () => {
    it('uses nullish coalescing operator for fallback', () => {
      const content = getMembers();
      expect(content).toContain('getCountryByLabel(countryLabel)?.flag ?? getFlagForCode(countryCode)');
    });
  });

  // --- EC-F072-02: New member default +55 ---
  describe('EC-F072-02: New member defaults to Brazil +55', () => {
    it('countryCode default is +55', () => {
      const content = getMembers();
      expect(content).toContain("member?.country_code ?? '+55'");
    });

    it('countryLabel fallback is Brazil (+55)', () => {
      const content = getMembers();
      expect(content).toContain("'Brazil (+55)'");
    });
  });
});

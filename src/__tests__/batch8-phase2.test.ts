/**
 * Tests for Batch 8, Phase 2: Invite Management UX
 *
 * F050 (CR-105): Replace text buttons with icons in invite management
 * F051 (CR-106): Replace Alert with custom dropdown for status actions
 * F052 (CR-107): Show speech position + LED + status name in invite second line
 * F053 (CR-110): Show invite management section for bishopric
 * F054 (CR-111): Increase spacing and X icon size in SpeechSlot
 *
 * Covers acceptance criteria:
 *   AC-F050-01..05, AC-F051-01..08, AC-F052-01..05, AC-F053-01..05, AC-F054-01..04
 * Covers edge cases:
 *   EC-F050-01..02, EC-F051-01..03, EC-F052-01..02, EC-F053-01, EC-F054-01..02
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { hasPermission, getPermissions } from '../lib/permissions';
import {
  VALID_TRANSITIONS,
  isValidTransition,
  getAvailableStatuses,
} from '../hooks/useSpeeches';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

// =============================================================================
// F050 (CR-105): Replace text buttons with icons in invite management
// =============================================================================

describe('F050 (CR-105): Replace text buttons with icons', () => {

  const getInviteManagement = () => readSourceFile('components/InviteManagementSection.tsx');

  describe('AC-F050-01: WhatsApp icon button for assigned_not_invited', () => {
    it('should import WhatsAppIcon from centralized icons module', () => {
      const content = getInviteManagement();
      expect(content).toContain("from './icons'");
      expect(content).toContain('WhatsAppIcon');
    });

    it('should import WhatsAppIcon (not define locally)', () => {
      const content = getInviteManagement();
      expect(content).not.toContain('function WhatsAppIcon');
      expect(content).toContain('WhatsAppIcon');
    });

    it('should render WhatsAppIcon for isNotInvited button', () => {
      const content = getInviteManagement();
      expect(content).toContain('<WhatsAppIcon size={18}');
    });

    it('should NOT render text "WhatsApp" in button', () => {
      const content = getInviteManagement();
      // Find the Pressable action button section
      const actionIdx = content.indexOf('accessibilityLabel={isNotInvited');
      const sectionEnd = content.indexOf('</Pressable>', actionIdx);
      const section = content.substring(actionIdx, sectionEnd);
      expect(section).not.toContain(">'WhatsApp'<");
      expect(section).not.toContain(">WhatsApp<");
    });
  });

  describe('AC-F050-02: Three dots button for assigned_invited', () => {
    it('should render MoreVerticalIcon SVG component for non-isNotInvited button', () => {
      const content = getInviteManagement();
      expect(content).toContain('MoreVerticalIcon');
    });

    it('should import MoreVerticalIcon from centralized icons module', () => {
      const content = getInviteManagement();
      expect(content).toContain('MoreVerticalIcon');
      expect(content).toContain("from './icons'");
    });
  });

  describe('AC-F050-03: WhatsApp button onPress unchanged', () => {
    it('should call handleNotInvitedAction for isNotInvited', () => {
      const content = getInviteManagement();
      expect(content).toContain('handleNotInvitedAction(speech)');
    });
  });

  describe('AC-F050-04: Three dots button opens dropdown', () => {
    it('should call handleInvitedAction for !isNotInvited', () => {
      const content = getInviteManagement();
      expect(content).toContain('handleInvitedAction(speech)');
    });
  });

  describe('AC-F050-05: Both buttons have accessibilityLabel', () => {
    it('should have accessibilityLabel for WhatsApp button', () => {
      const content = getInviteManagement();
      expect(content).toContain("accessibilityLabel={isNotInvited ? 'WhatsApp'");
    });

    it('should have accessibilityLabel for changeStatus button', () => {
      const content = getInviteManagement();
      expect(content).toContain("t('speeches.changeStatus')}");
    });
  });

  describe('EC-F050-01: WhatsApp icon uses theme-aware color', () => {
    it('should use colors.onPrimary for WhatsApp icon color', () => {
      const content = getInviteManagement();
      expect(content).toContain('color={colors.onPrimary}');
    });
  });

  describe('EC-F050-02: Button has adequate touch target', () => {
    it('should have fixed width and height for icon button', () => {
      const content = getInviteManagement();
      expect(content).toContain('width: 36');
      expect(content).toContain('height: 36');
    });

    it('should have justifyContent and alignItems center', () => {
      const content = getInviteManagement();
      // Check styles section
      const stylesIdx = content.indexOf('StyleSheet.create');
      const stylesSection = content.substring(stylesIdx);
      expect(stylesSection).toContain("justifyContent: 'center'");
      expect(stylesSection).toContain("alignItems: 'center'");
    });
  });
});

// =============================================================================
// F051 (CR-106): Replace Alert with custom dropdown for status actions
// =============================================================================

describe('F051 (CR-106): Replace Alert with custom dropdown', () => {

  const getInviteManagement = () => readSourceFile('components/InviteManagementSection.tsx');
  const getDropdown = () => readSourceFile('components/InviteActionDropdown.tsx');

  describe('AC-F051-01: Alert.alert not used in handleInvitedAction', () => {
    it('handleInvitedAction should NOT use Alert.alert (uses dropdown instead)', () => {
      const content = getInviteManagement();
      // SUPERSEDED by F152 (CR-216): Alert IS now imported for handleNotInvitedAction (no-phone dialog)
      // But handleInvitedAction should still use setDropdownSpeech, not Alert.alert
      const handleInvitedBlock = content.substring(
        content.indexOf('const handleInvitedAction'),
        content.indexOf(');', content.indexOf('[]', content.indexOf('const handleInvitedAction'))) + 2
      );
      expect(handleInvitedBlock).not.toContain('Alert.alert');
    });

    it('should set dropdownSpeech state instead of Alert', () => {
      const content = getInviteManagement();
      expect(content).toContain('setDropdownSpeech(speech)');
    });
  });

  describe('AC-F051-02: Dropdown has "View conversation" option with WhatsApp icon', () => {
    it('should use viewConversation i18n key', () => {
      const content = getDropdown();
      expect(content).toContain("t('home.viewConversation')");
    });

    it('should have WhatsAppIcon in dropdown', () => {
      const content = getDropdown();
      expect(content).toContain('<WhatsAppIcon');
    });

    it('i18n key exists in pt-BR', () => {
      const ptBR = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'i18n/locales/pt-BR.json'), 'utf-8'));
      expect(ptBR.home.viewConversation).toBe('Ver conversa');
    });

    it('i18n key exists in en', () => {
      const en = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'i18n/locales/en.json'), 'utf-8'));
      expect(en.home.viewConversation).toBe('View conversation');
    });

    it('i18n key exists in es', () => {
      const es = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'i18n/locales/es.json'), 'utf-8'));
      expect(es.home.viewConversation).toBeDefined();
    });
  });

  describe('AC-F051-03: Dropdown has "Assigned/Confirmed" option with green indicator', () => {
    it('should render assigned_confirmed option (via dynamic template)', () => {
      const content = getDropdown();
      // F077: options are now rendered dynamically via statusOptions.map
      // The template literal `speechStatus.${statusOption}` covers all statuses
      expect(content).toContain('speechStatus.');
      // ALL_ASSIGNED_STATUSES array contains assigned_confirmed
      expect(content).toContain("'assigned_confirmed'");
    });

    it('should use STATUS_INDICATOR_COLORS for status indicators', () => {
      const content = getDropdown();
      // F077: uses STATUS_INDICATOR_COLORS[statusOption] instead of direct property access
      expect(content).toContain('STATUS_INDICATOR_COLORS[statusOption]');
    });
  });

  describe('AC-F051-04: Dropdown has "Assigned/Not invited" reverse transition', () => {
    it('should render assigned_not_invited option (via dynamic template)', () => {
      const content = getDropdown();
      // F077: ALL_ASSIGNED_STATUSES array contains assigned_not_invited
      expect(content).toContain("'assigned_not_invited'");
    });

    it('should use STATUS_INDICATOR_COLORS for all status indicators', () => {
      const content = getDropdown();
      // F077: uses STATUS_INDICATOR_COLORS[statusOption] for all dynamic options
      expect(content).toContain('STATUS_INDICATOR_COLORS[statusOption]');
    });

    it('assigned_invited -> assigned_not_invited is valid transition', () => {
      expect(isValidTransition('assigned_invited', 'assigned_not_invited')).toBe(true);
    });

    it('getAvailableStatuses includes assigned_not_invited for assigned_invited', () => {
      const statuses = getAvailableStatuses('assigned_invited');
      expect(statuses).toContain('assigned_not_invited');
    });
  });

  describe('AC-F051-05: Dropdown has "Gave up" option with red indicator', () => {
    it('should render gave_up option (via dynamic template)', () => {
      const content = getDropdown();
      // F077: ALL_ASSIGNED_STATUSES array contains gave_up
      expect(content).toContain("'gave_up'");
    });

    it('should use STATUS_INDICATOR_COLORS for gave_up indicator', () => {
      const content = getDropdown();
      // F077: uses STATUS_INDICATOR_COLORS[statusOption] dynamically
      expect(content).toContain('STATUS_INDICATOR_COLORS[statusOption]');
    });
  });

  describe('AC-F051-06: Dropdown has "Cancel" option that closes', () => {
    it('should render cancel option with onClose', () => {
      const content = getDropdown();
      expect(content).toContain("t('common.cancel')");
      expect(content).toContain('onPress={onClose}');
    });
  });

  describe('AC-F051-07: Dropdown is custom Modal component', () => {
    it('should use Modal from react-native', () => {
      const content = getDropdown();
      expect(content).toContain("import");
      expect(content).toContain('Modal');
    });

    it('should have transparent overlay', () => {
      const content = getDropdown();
      expect(content).toContain('transparent');
      expect(content).toContain('overlay');
    });

    it('should have borderRadius 12', () => {
      const content = getDropdown();
      expect(content).toContain('borderRadius: 12');
    });
  });

  describe('AC-F051-08: Dropdown shows i18n changeStatus as title', () => {
    it('should display t(speeches.changeStatus) instead of speaker_name', () => {
      const content = getDropdown();
      // F056 changed title from speech?.speaker_name to t('speeches.changeStatus')
      expect(content).toContain("t('speeches.changeStatus')");
    });
  });

  describe('EC-F051-01: View conversation disabled when no phone', () => {
    it('should check for speaker_phone', () => {
      const content = getDropdown();
      expect(content).toContain('speech?.speaker_phone');
    });

    it('should disable option when no phone', () => {
      const content = getDropdown();
      expect(content).toContain('disabled={!hasPhone}');
    });

    it('should apply disabled opacity style', () => {
      const content = getDropdown();
      expect(content).toContain('disabledOption');
    });
  });

  describe('EC-F051-02: Tap outside overlay closes dropdown', () => {
    it('should have overlay Pressable with onPress={onClose}', () => {
      const content = getDropdown();
      expect(content).toContain('style={styles.overlay} onPress={onClose}');
    });
  });

  describe('EC-F051-03: Dark mode support', () => {
    it('should use useTheme for colors', () => {
      const content = getDropdown();
      expect(content).toContain('useTheme');
      expect(content).toContain('colors.card');
      expect(content).toContain('colors.text');
    });
  });

  describe('Integration: InviteActionDropdown in InviteManagementSection', () => {
    it('should import InviteActionDropdown', () => {
      const content = getInviteManagement();
      expect(content).toContain("from './InviteActionDropdown'");
    });

    it('should have dropdownSpeech state', () => {
      const content = getInviteManagement();
      expect(content).toContain('useState<Speech | null>(null)');
      expect(content).toContain('dropdownSpeech');
    });

    it('should render InviteActionDropdown conditionally', () => {
      const content = getInviteManagement();
      expect(content).toContain('visible={!!dropdownSpeech}');
      expect(content).toContain('speech={dropdownSpeech}');
    });

    it('should have handleDropdownWhatsApp callback', () => {
      const content = getInviteManagement();
      expect(content).toContain('handleDropdownWhatsApp');
    });

    it('should have handleDropdownStatusChange callback', () => {
      const content = getInviteManagement();
      expect(content).toContain('handleDropdownStatusChange');
    });

    it('should close dropdown after action', () => {
      const content = getInviteManagement();
      // Both handlers should set dropdownSpeech to null
      const whatsappHandler = content.substring(
        content.indexOf('handleDropdownWhatsApp'),
        content.indexOf('handleDropdownStatusChange')
      );
      expect(whatsappHandler).toContain('setDropdownSpeech(null)');

      const statusHandler = content.substring(
        content.indexOf('handleDropdownStatusChange')
      );
      expect(statusHandler).toContain('setDropdownSpeech(null)');
    });
  });
});

// =============================================================================
// F052 (CR-107): Show speech position + LED + status name in invite second line
// =============================================================================

describe('F052 (CR-107): Enhanced second line in invite row', () => {

  const getInviteManagement = () => readSourceFile('components/InviteManagementSection.tsx');

  describe('AC-F052-01: Second line shows full slot label', () => {
    it('should use t("speeches.slot") for label', () => {
      const content = getInviteManagement();
      expect(content).toContain("t('speeches.slot', { number:");
    });

    it('should use ordinal position format', () => {
      const content = getInviteManagement();
      expect(content).toContain("speech.position}\\u00BA");
    });
  });

  describe('AC-F052-02: StatusLED rendered inline', () => {
    it('should import StatusLED', () => {
      const content = getInviteManagement();
      expect(content).toContain("from './StatusLED'");
    });

    it('should render StatusLED with size 10', () => {
      const content = getInviteManagement();
      expect(content).toContain('<StatusLED status={speech.status} size={10}');
    });
  });

  describe('AC-F052-03: Status name translated after LED', () => {
    it('should render translated status name', () => {
      const content = getInviteManagement();
      expect(content).toContain("t(`speechStatus.${speech.status}`)");
    });
  });

  describe('AC-F052-04: Full format "{No} Discurso - LED StatusName"', () => {
    it('should have separator between slot label and LED', () => {
      const content = getInviteManagement();
      expect(content).toContain("' - '");
    });

    it('should have speechInfoRow with row layout', () => {
      const content = getInviteManagement();
      expect(content).toContain('styles.speechInfoRow');
      expect(content).toContain("flexDirection: 'row'");
    });
  });

  describe('AC-F052-05: LED size is 10px (smaller than 16px default)', () => {
    it('should pass size={10} to StatusLED', () => {
      const content = getInviteManagement();
      expect(content).toContain('size={10}');
    });
  });

  describe('EC-F052-01: Long status text truncation', () => {
    it('should have numberOfLines={1} on status name', () => {
      const content = getInviteManagement();
      // Find the statusName Text that has numberOfLines
      const statusNameIdx = content.indexOf('styles.statusName');
      const statusNameEnd = content.indexOf('</Text>', statusNameIdx);
      const section = content.substring(statusNameIdx - 100, statusNameEnd);
      expect(section).toContain('numberOfLines={1}');
    });
  });

  describe('EC-F052-02: LED animation works inline', () => {
    it('StatusLED supports inline rendering via size prop', () => {
      const statusLED = readSourceFile('components/StatusLED.tsx');
      expect(statusLED).toContain('size = 16');
      expect(statusLED).toContain('size?: number');
    });
  });
});

// =============================================================================
// F053 (CR-110): Show invite management section for bishopric
// =============================================================================

describe('F053 (CR-110): Bishopric sees invite management section', () => {

  const getPermissions = () => readSourceFile('lib/permissions.ts');
  const getInviteManagement = () => readSourceFile('components/InviteManagementSection.tsx');

  describe('AC-F053-01: Bishopric has home:invite_mgmt permission', () => {
    it('hasPermission("bishopric", "home:invite_mgmt") returns true', () => {
      expect(hasPermission('bishopric', 'home:invite_mgmt')).toBe(true);
    });

    it('permissions.ts includes home:invite_mgmt for bishopric', () => {
      const content = getPermissions();
      // Find the bishopric Set section
      const bishopricIdx = content.indexOf('bishopric: new Set');
      const secretaryIdx = content.indexOf('secretary: new Set');
      const section = content.substring(bishopricIdx, secretaryIdx);
      expect(section).toContain("'home:invite_mgmt'");
    });
  });

  describe('AC-F053-02: InviteManagementSection visible for bishopric', () => {
    it('guard uses hasPermission which now includes bishopric', () => {
      const content = getInviteManagement();
      expect(content).toContain("hasPermission('home:invite_mgmt')");
    });
  });

  describe('AC-F053-03: Secretary still sees InviteManagementSection', () => {
    it('secretary retains home:invite_mgmt permission', () => {
      expect(hasPermission('secretary', 'home:invite_mgmt')).toBe(true);
    });
  });

  describe('AC-F053-04: Observer does NOT see InviteManagementSection', () => {
    it('observer does not have home:invite_mgmt', () => {
      expect(hasPermission('observer', 'home:invite_mgmt')).toBe(false);
    });
  });

  describe('AC-F053-05: Bishopric sees both sections', () => {
    it('bishopric has home:next_assignments', () => {
      expect(hasPermission('bishopric', 'home:next_assignments')).toBe(true);
    });

    it('bishopric has home:invite_mgmt', () => {
      expect(hasPermission('bishopric', 'home:invite_mgmt')).toBe(true);
    });
  });

  describe('EC-F053-01: Docstring updated for new visibility', () => {
    it('should mention "Secretary and Bishopric" in docstring', () => {
      const content = getInviteManagement();
      expect(content).toContain('Secretary and Bishopric');
    });

    it('guard comment should mention "Secretary and Bishopric"', () => {
      const content = getInviteManagement();
      expect(content).toContain('Only visible for Secretary and Bishopric');
    });
  });
});

// =============================================================================
// F054 (CR-111): Increase spacing and X icon size in SpeechSlot
// =============================================================================

describe('F054 (CR-111): SpeechSlot spacing and X size', () => {

  const getSpeechSlot = () => readSourceFile('components/SpeechSlot.tsx');

  describe('AC-F054-01: Row gap removed (F124 uses row-per-element layout)', () => {
    it('should NOT have gap: 12 in speakerRow style (F124 row-per-element layout)', () => {
      const content = getSpeechSlot();
      const rowMatch = content.match(/speakerRow:\s*\{[^}]*\}/s);
      expect(rowMatch).not.toBeNull();
      expect(rowMatch![0]).not.toContain('gap: 12');
    });

    // F118 (CR-181): gap: 8 now exists in new labelWithToggle style, but NOT in speakerRow style
    it('should NOT have gap: 8 in speakerRow style', () => {
      const content = getSpeechSlot();
      const rowMatch = content.match(/speakerRow:\s*\{[^}]*\}/s);
      expect(rowMatch).not.toBeNull();
      expect(rowMatch![0]).not.toContain('gap: 8');
    });
  });

  describe('AC-F054-02: RemoveButton fontSize is 24 (was 20)', () => {
    it('should have fontSize: 24 in removeButton style', () => {
      const content = getSpeechSlot();
      // Find removeButton style
      const removeIdx = content.indexOf('removeButton:');
      const nextStyle = content.indexOf('},', removeIdx);
      const section = content.substring(removeIdx, nextStyle);
      expect(section).toContain('fontSize: 24');
    });

    it('should NOT have fontSize: 20 in removeButton style', () => {
      const content = getSpeechSlot();
      const removeIdx = content.indexOf('removeButton:');
      const nextStyle = content.indexOf('},', removeIdx);
      const section = content.substring(removeIdx, nextStyle);
      expect(section).not.toContain('fontSize: 20');
    });
  });

  describe('AC-F054-03: hitSlop adequate', () => {
    it('should have hitSlop={8} on remove button', () => {
      const content = getSpeechSlot();
      expect(content).toContain('hitSlop={8}');
    });
  });

  describe('AC-F054-04: Layout does not break with larger gap', () => {
    it('field has flex: 1 for truncation', () => {
      const content = getSpeechSlot();
      const fieldIdx = content.indexOf("field: {");
      const fieldEnd = content.indexOf('},', fieldIdx);
      const section = content.substring(fieldIdx, fieldEnd);
      expect(section).toContain('flex: 1');
    });

    it('speaker text has numberOfLines={1} for truncation', () => {
      const content = getSpeechSlot();
      expect(content).toContain('numberOfLines={1}');
    });
  });

  describe('EC-F054-01: Long speaker name with increased gap', () => {
    it('fieldText has flex: 1 for text truncation', () => {
      const content = getSpeechSlot();
      const textIdx = content.indexOf('fieldText:');
      const textEnd = content.indexOf('},', textIdx);
      const section = content.substring(textIdx, textEnd);
      expect(section).toContain('flex: 1');
    });
  });

  describe('EC-F054-02: X only shown when applicable', () => {
    it('remove button is conditional on hasSpeaker && canUnassign', () => {
      const content = getSpeechSlot();
      expect(content).toContain('hasSpeaker && canUnassign');
    });
  });
});

// =============================================================================
// Cross-cutting: VALID_TRANSITIONS updated correctly
// =============================================================================

describe('Cross-cutting: VALID_TRANSITIONS for assigned_invited', () => {

  it('assigned_invited has 4 valid transitions', () => {
    expect(VALID_TRANSITIONS.assigned_invited).toHaveLength(4);
  });

  it('includes all expected statuses', () => {
    expect(VALID_TRANSITIONS.assigned_invited).toContain('assigned_confirmed');
    expect(VALID_TRANSITIONS.assigned_invited).toContain('assigned_not_invited');
    expect(VALID_TRANSITIONS.assigned_invited).toContain('gave_up');
    expect(VALID_TRANSITIONS.assigned_invited).toContain('not_assigned');
  });

  it('reverse transition assigned_invited -> assigned_not_invited is valid', () => {
    expect(isValidTransition('assigned_invited', 'assigned_not_invited')).toBe(true);
  });

  it('forward transitions still valid', () => {
    expect(isValidTransition('assigned_invited', 'assigned_confirmed')).toBe(true);
    expect(isValidTransition('assigned_invited', 'gave_up')).toBe(true);
    expect(isValidTransition('assigned_invited', 'not_assigned')).toBe(true);
  });
});

// =============================================================================
// Cross-cutting: STATUS_INDICATOR_COLORS exported
// =============================================================================

describe('Cross-cutting: STATUS_INDICATOR_COLORS exported', () => {

  it('StatusChangeModal exports STATUS_INDICATOR_COLORS', () => {
    const content = readSourceFile('components/StatusChangeModal.tsx');
    expect(content).toContain('export const STATUS_INDICATOR_COLORS');
  });

  it('InviteActionDropdown imports STATUS_INDICATOR_COLORS', () => {
    const content = readSourceFile('components/InviteActionDropdown.tsx');
    expect(content).toContain("{ STATUS_INDICATOR_COLORS }");
    expect(content).toContain("from './StatusChangeModal'");
  });
});

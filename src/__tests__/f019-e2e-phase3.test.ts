/**
 * Tests for F019_E2E: E2E Testing — Phase 3 (Speeches + Members Flows) (CR-284)
 *
 * Covers:
 * - AC-SF1-01, AC-SF1-02, AC-SF1-03: SpeechSlot 6 dynamic testID props (speaker, topic, status, remove, clear-topic, toggle)
 * - AC-SF2-01, AC-SF2-02: MemberSelectorModal 3 testID props (search, close, dynamic item)
 * - AC-SF3-01, AC-SF3-02: StatusChangeModal 3 testID props (current, close, dynamic option)
 * - AC-SF4-01, AC-SF4-02: TopicSelectorModal 2 testID props (search, close)
 * - AC-SF5-01, AC-SF5-02: SundayCard testID prop + speeches.tsx passes dynamic testID
 * - AC-SF6-01, AC-SF6-02, AC-SF6-03: Members screen 8 testID props
 * - AC-SF7-01, AC-SF7-02: SwipeableCard 2 static testID props (edit, delete)
 * - AC-SF8-01: SettingsItem testID prop for members navigation
 * - AC-SF9-01 to AC-SF9-04: Maestro 05-speeches flow structure
 * - AC-SF10-01, AC-SF10-02, AC-SF10-03: Maestro 06-members flow structure
 *
 * Edge cases:
 * - EC_E2E_P3_001: Dynamic date computation in 05-speeches via evalScript
 * - EC_E2E_P3_002: Lazy speech creation wait (extendedWaitUntil 15s)
 * - EC_E2E_P3_003: Empty member list handled by creating member first
 * - EC_E2E_P3_004: StatusChangeModal opens only after speaker assignment
 * - EC_E2E_P3_005: Swipe gesture reliability (extendedWaitUntil after swipe)
 * - EC_E2E_P3_006: Native Alert 'Excluir' text handling
 * - EC_E2E_P3_007: Informal name auto-fill on blur
 * - EC_E2E_P3_008: Keyboard covering (KeyboardAvoidingView)
 * - EC_E2E_P3_009: Conference Sunday non-expandable
 * - EC_E2E_P3_010: No conflict between flow 05 and 06 member names
 * - EC_E2E_P3_011: FlatList auto-scroll to highlighted Sunday
 * - EC_E2E_P3_012: Position 2 toggle edge case (uses position 1 instead)
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import ptBR from '../i18n/locales/pt-BR.json';

// =============================================================================
// Helpers (reused from Phase 1+2 convention)
// =============================================================================

const projectRoot = path.resolve(__dirname, '../..');

function extractTestIDs(content: string): string[] {
  const ids: string[] = [];
  const regex = /id:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

function extractAssertVisibleTexts(content: string): string[] {
  const texts: string[] = [];
  const simpleRegex = /- assertVisible:\s*"([^"]+)"/g;
  let match;
  while ((match = simpleRegex.exec(content)) !== null) {
    texts.push(match[1]);
  }
  return texts;
}

function extractWaitUntilVisibleTexts(content: string): string[] {
  const texts: string[] = [];
  const regex = /visible:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    texts.push(match[1]);
  }
  return texts;
}

function extractAssertNotVisibleTexts(content: string): string[] {
  const texts: string[] = [];
  const regex = /- assertNotVisible:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    texts.push(match[1]);
  }
  return texts;
}

function extractTimeouts(content: string): number[] {
  const timeouts: number[] = [];
  const regex = /timeout:\s*(\d+)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    timeouts.push(parseInt(match[1], 10));
  }
  return timeouts;
}

function extractStaticTestIDs(src: string): string[] {
  const ids: string[] = [];
  const regex = /testID="([^"]+)"/g;
  let match;
  while ((match = regex.exec(src)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

function extractDynamicTestIDs(src: string): string[] {
  const ids: string[] = [];
  const regex = /testID=\{`([^`]+)`\}/g;
  let match;
  while ((match = regex.exec(src)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

// =============================================================================
// Source file paths
// =============================================================================

const speechSlotPath = path.resolve(__dirname, '../components/SpeechSlot.tsx');
const memberSelectorPath = path.resolve(__dirname, '../components/MemberSelectorModal.tsx');
const statusChangePath = path.resolve(__dirname, '../components/StatusChangeModal.tsx');
const topicSelectorPath = path.resolve(__dirname, '../components/TopicSelectorModal.tsx');
const sundayCardPath = path.resolve(__dirname, '../components/SundayCard.tsx');
const speechesPath = path.resolve(__dirname, '../app/(tabs)/speeches.tsx');
const membersPath = path.resolve(__dirname, '../app/(tabs)/settings/members.tsx');
const swipeableCardPath = path.resolve(__dirname, '../components/SwipeableCard.tsx');
const settingsPath = path.resolve(__dirname, '../app/(tabs)/settings/index.tsx');

// Flow file paths
const speechesFlowPath = path.join(projectRoot, 'e2e/maestro/05-speeches.yaml');
const membersFlowPath = path.join(projectRoot, 'e2e/maestro/06-members.yaml');

// =============================================================================
// AC-SF1-01, AC-SF1-02, AC-SF1-03: SpeechSlot testIDs (6 dynamic elements)
// =============================================================================

describe('F019_E2E: SpeechSlot testIDs (AC-SF1)', () => {
  const src = fs.readFileSync(speechSlotPath, 'utf-8');
  const staticTestIDs = extractStaticTestIDs(src);
  const dynamicTestIDs = extractDynamicTestIDs(src);

  it('includes speech-slot-${position}-speaker-button dynamic testID (AC-SF1-01)', () => {
    expect(dynamicTestIDs).toContain('speech-slot-${position}-speaker-button');
  });

  it('includes speech-slot-${position}-status-button dynamic testID (AC-SF1-02)', () => {
    expect(dynamicTestIDs).toContain('speech-slot-${position}-status-button');
  });

  it('includes speech-slot-${position}-topic-button dynamic testID (AC-SF1-03)', () => {
    expect(dynamicTestIDs).toContain('speech-slot-${position}-topic-button');
  });

  it('includes speech-slot-${position}-remove-button dynamic testID', () => {
    expect(dynamicTestIDs).toContain('speech-slot-${position}-remove-button');
  });

  it('includes speech-slot-${position}-clear-topic-button dynamic testID', () => {
    expect(dynamicTestIDs).toContain('speech-slot-${position}-clear-topic-button');
  });

  it('includes speech-slot-2-toggle static testID for 2nd speech switch', () => {
    expect(staticTestIDs).toContain('speech-slot-2-toggle');
  });

  it('has exactly 5 dynamic testIDs using position suffix', () => {
    const positionDynamic = dynamicTestIDs.filter((id) => id.startsWith('speech-slot-${position}'));
    expect(positionDynamic).toHaveLength(5);
  });

  it('has exactly 1 static testID (speech-slot-2-toggle)', () => {
    const speechSlotStatic = staticTestIDs.filter((id) => id.startsWith('speech-slot'));
    expect(speechSlotStatic).toHaveLength(1);
  });

  it('total of 6 testID props (5 dynamic + 1 static)', () => {
    const allTestIDs = [
      ...dynamicTestIDs.filter((id) => id.startsWith('speech-slot')),
      ...staticTestIDs.filter((id) => id.startsWith('speech-slot')),
    ];
    expect(allTestIDs).toHaveLength(6);
  });
});

// =============================================================================
// AC-SF2-01, AC-SF2-02: MemberSelectorModal testIDs (3 elements)
// =============================================================================

describe('F019_E2E: MemberSelectorModal testIDs (AC-SF2)', () => {
  const src = fs.readFileSync(memberSelectorPath, 'utf-8');
  const staticTestIDs = extractStaticTestIDs(src);
  const dynamicTestIDs = extractDynamicTestIDs(src);

  it('includes member-selector-search-input testID (AC-SF2-01)', () => {
    expect(staticTestIDs).toContain('member-selector-search-input');
  });

  it('includes member-selector-close-button testID (AC-SF2-02)', () => {
    expect(staticTestIDs).toContain('member-selector-close-button');
  });

  it('includes member-selector-item-${member.id} dynamic testID', () => {
    expect(dynamicTestIDs).toContain('member-selector-item-${item.id}');
  });

  it('has exactly 2 static testIDs + 1 dynamic testID = 3 total', () => {
    expect(staticTestIDs.filter((id) => id.startsWith('member-selector'))).toHaveLength(2);
    expect(dynamicTestIDs.filter((id) => id.startsWith('member-selector'))).toHaveLength(1);
  });
});

// =============================================================================
// AC-SF3-01, AC-SF3-02: StatusChangeModal testIDs (3 elements)
// =============================================================================

describe('F019_E2E: StatusChangeModal testIDs (AC-SF3)', () => {
  const src = fs.readFileSync(statusChangePath, 'utf-8');
  const staticTestIDs = extractStaticTestIDs(src);
  const dynamicTestIDs = extractDynamicTestIDs(src);

  it('includes status-modal-current testID (AC-SF3-01)', () => {
    expect(staticTestIDs).toContain('status-modal-current');
  });

  it('includes status-modal-close-button testID', () => {
    expect(staticTestIDs).toContain('status-modal-close-button');
  });

  it('includes status-modal-option-${item} dynamic testID (AC-SF3-02)', () => {
    expect(dynamicTestIDs).toContain('status-modal-option-${item}');
  });

  it('has exactly 2 static testIDs + 1 dynamic testID = 3 total', () => {
    expect(staticTestIDs.filter((id) => id.startsWith('status-modal'))).toHaveLength(2);
    expect(dynamicTestIDs.filter((id) => id.startsWith('status-modal'))).toHaveLength(1);
  });
});

// =============================================================================
// AC-SF4-01, AC-SF4-02: TopicSelectorModal testIDs (2 elements)
// =============================================================================

describe('F019_E2E: TopicSelectorModal testIDs (AC-SF4)', () => {
  const src = fs.readFileSync(topicSelectorPath, 'utf-8');
  const staticTestIDs = extractStaticTestIDs(src);

  it('includes topic-selector-search-input testID (AC-SF4-01)', () => {
    expect(staticTestIDs).toContain('topic-selector-search-input');
  });

  it('includes topic-selector-close-button testID (AC-SF4-02)', () => {
    expect(staticTestIDs).toContain('topic-selector-close-button');
  });

  it('has exactly 2 testID props', () => {
    expect(staticTestIDs.filter((id) => id.startsWith('topic-selector'))).toHaveLength(2);
  });
});

// =============================================================================
// AC-SF5-01, AC-SF5-02: SundayCard testID prop + speeches.tsx forwarding
// =============================================================================

describe('F019_E2E: SundayCard testID prop (AC-SF5)', () => {
  const sundayCardSrc = fs.readFileSync(sundayCardPath, 'utf-8');
  const speechesSrc = fs.readFileSync(speechesPath, 'utf-8');

  it('SundayCard interface has testID?: string prop', () => {
    expect(sundayCardSrc).toContain('testID?: string');
  });

  it('SundayCard root View forwards testID (AC-SF5-01)', () => {
    expect(sundayCardSrc).toContain('testID={testID}');
  });

  it('SundayCard header Pressable uses derived headerTestID (AC-SF5-02)', () => {
    expect(sundayCardSrc).toContain('testID={headerTestID}');
  });

  it('headerTestID is derived by replacing "card" with "card-header"', () => {
    expect(sundayCardSrc).toContain("testID.replace('card', 'card-header')");
  });

  it('speeches.tsx passes testID with date suffix to SundayCard', () => {
    const speechesDynamic = extractDynamicTestIDs(speechesSrc);
    expect(speechesDynamic).toContain('speeches-card-${item.date}');
  });
});

// =============================================================================
// AC-SF6-01, AC-SF6-02, AC-SF6-03: Members screen testIDs (8 elements)
// =============================================================================

describe('F019_E2E: Members screen testIDs (AC-SF6)', () => {
  const src = fs.readFileSync(membersPath, 'utf-8');
  const staticTestIDs = extractStaticTestIDs(src);

  it('includes members-back-button testID', () => {
    expect(staticTestIDs).toContain('members-back-button');
  });

  it('includes members-add-button testID (AC-SF6-01)', () => {
    expect(staticTestIDs).toContain('members-add-button');
  });

  it('includes members-search-input testID', () => {
    expect(staticTestIDs).toContain('members-search-input');
  });

  it('includes members-editor-fullname-input testID (AC-SF6-02)', () => {
    expect(staticTestIDs).toContain('members-editor-fullname-input');
  });

  it('includes members-editor-informal-input testID', () => {
    expect(staticTestIDs).toContain('members-editor-informal-input');
  });

  it('includes members-editor-phone-input testID', () => {
    expect(staticTestIDs).toContain('members-editor-phone-input');
  });

  it('includes members-editor-cancel-button testID', () => {
    expect(staticTestIDs).toContain('members-editor-cancel-button');
  });

  it('includes members-editor-save-button testID (AC-SF6-03)', () => {
    expect(staticTestIDs).toContain('members-editor-save-button');
  });

  it('has exactly 8 testID props', () => {
    expect(staticTestIDs.filter((id) => id.startsWith('members-'))).toHaveLength(8);
  });
});

// =============================================================================
// AC-SF7-01, AC-SF7-02: SwipeableCard testIDs (2 static elements)
// =============================================================================

describe('F019_E2E: SwipeableCard testIDs (AC-SF7)', () => {
  const src = fs.readFileSync(swipeableCardPath, 'utf-8');
  const staticTestIDs = extractStaticTestIDs(src);

  it('includes swipeable-edit-button testID (AC-SF7-01)', () => {
    expect(staticTestIDs).toContain('swipeable-edit-button');
  });

  it('includes swipeable-delete-button testID (AC-SF7-02)', () => {
    expect(staticTestIDs).toContain('swipeable-delete-button');
  });

  it('has exactly 2 testID props', () => {
    expect(staticTestIDs.filter((id) => id.startsWith('swipeable-'))).toHaveLength(2);
  });
});

// =============================================================================
// AC-SF8-01: SettingsItem testID prop for members navigation
// =============================================================================

describe('F019_E2E: SettingsItem testID prop (AC-SF8)', () => {
  const src = fs.readFileSync(settingsPath, 'utf-8');
  const staticTestIDs = extractStaticTestIDs(src);

  it('SettingsItemProps interface has testID?: string', () => {
    expect(src).toContain('testID?: string');
  });

  it('SettingsItem Pressable forwards testID prop', () => {
    expect(src).toContain('testID={testID}');
  });

  it('members SettingsItem uses testID="settings-members-button" (AC-SF8-01)', () => {
    expect(staticTestIDs).toContain('settings-members-button');
  });
});

// =============================================================================
// AC-SF9-01 to AC-SF9-04: Maestro 05-speeches flow structure
// =============================================================================

describe('F019_E2E: Maestro 05-speeches flow (AC-SF9)', () => {
  const flowContent = fs.readFileSync(speechesFlowPath, 'utf-8');
  const testIDs = extractTestIDs(flowContent);
  const assertTexts = extractAssertVisibleTexts(flowContent);
  const waitUntilTexts = extractWaitUntilVisibleTexts(flowContent);
  const timeouts = extractTimeouts(flowContent);

  it('flow file exists', () => {
    expect(fs.existsSync(speechesFlowPath)).toBe(true);
  });

  it('starts with appId configuration', () => {
    expect(flowContent).toMatch(/^appId:\s+com\.alouisio\.sacramentmeetingplanner/);
  });

  // Part A: Login
  it('reads credentials from 01-register output', () => {
    expect(flowContent).toContain('${output.TEST_EMAIL}');
    expect(flowContent).toContain('${output.TEST_PASSWORD}');
  });

  it('uses login testIDs for authentication', () => {
    expect(testIDs).toContain('login-email-input');
    expect(testIDs).toContain('login-password-input');
    expect(testIDs).toContain('login-submit-button');
  });

  it('waits for Home tab after login with pt-BR text', () => {
    expect(waitUntilTexts).toContain('Início');
  });

  // Part B: Navigate to Members and add test member (AC-SF9-01)
  it('taps settings-members-button to navigate to Members (AC-SF9-01)', () => {
    expect(testIDs).toContain('settings-members-button');
  });

  it('taps members-add-button to add a new member', () => {
    expect(testIDs).toContain('members-add-button');
  });

  it('inputs "E2E Orador" as the member name', () => {
    expect(flowContent).toContain('E2E Orador');
  });

  it('taps members-editor-save-button to save member', () => {
    expect(testIDs).toContain('members-editor-save-button');
  });

  it('waits for "E2E Orador" to be visible after save', () => {
    expect(waitUntilTexts).toContain('E2E Orador');
  });

  it('taps members-back-button to return', () => {
    expect(testIDs).toContain('members-back-button');
  });

  // Part C: Navigate to Speeches tab
  it('navigates to Speeches tab by text "Discursos"', () => {
    expect(flowContent).toContain('tapOn: "Discursos"');
  });

  // Part D: Expand next Sunday card (EC_E2E_P3_001, EC_E2E_P3_002)
  it('computes next Sunday date via evalScript (EC_E2E_P3_001)', () => {
    expect(flowContent).toContain('evalScript');
    expect(flowContent).toContain('NEXT_SUNDAY');
    expect(flowContent).toContain('getDay()');
    expect(flowContent).toContain('toISOString()');
  });

  it('uses dynamic speeches-card-header testID to tap card header', () => {
    expect(flowContent).toContain('speeches-card-header-${output.NEXT_SUNDAY}');
  });

  it('waits 15s for lazy speech creation (EC_E2E_P3_002)', () => {
    expect(timeouts).toContain(15000);
  });

  it('waits for speech-slot-1-speaker-button after card expansion', () => {
    expect(testIDs).toContain('speech-slot-1-speaker-button');
  });

  // Part E: Assign speaker (AC-SF9-02, EC_E2E_P3_003)
  it('taps speech-slot-1-speaker-button to open MemberSelectorModal (AC-SF9-02)', () => {
    expect(testIDs).toContain('speech-slot-1-speaker-button');
  });

  it('waits for member-selector-search-input (MemberSelectorModal visible)', () => {
    expect(testIDs).toContain('member-selector-search-input');
  });

  it('asserts "E2E Orador" visible in member list (EC_E2E_P3_003)', () => {
    expect(assertTexts).toContain('E2E Orador');
  });

  it('selects member by tapping "E2E Orador" text', () => {
    expect(flowContent).toContain('tapOn: "E2E Orador"');
  });

  it('waits for MemberSelectorModal to close after selection', () => {
    expect(flowContent).toContain('notVisible');
  });

  it('asserts "E2E Orador" visible in speech slot after assignment', () => {
    // E2E Orador should appear in assertVisible at least twice (in member list and after assignment)
    const oradorVisibleCount = assertTexts.filter((t) => t === 'E2E Orador').length;
    expect(oradorVisibleCount).toBeGreaterThanOrEqual(2);
  });

  // Part F: Change status (AC-SF9-03, EC_E2E_P3_004)
  it('taps speech-slot-1-status-button to open StatusChangeModal (AC-SF9-03)', () => {
    expect(testIDs).toContain('speech-slot-1-status-button');
  });

  it('waits for status-modal-close-button (StatusChangeModal visible)', () => {
    expect(testIDs).toContain('status-modal-close-button');
  });

  it('taps status-modal-option-assigned_confirmed to change status (EC_E2E_P3_004)', () => {
    expect(testIDs).toContain('status-modal-option-assigned_confirmed');
  });

  // Part G: Open/close topic modal (AC-SF9-04)
  it('taps speech-slot-1-topic-button to open TopicSelectorModal (AC-SF9-04)', () => {
    expect(testIDs).toContain('speech-slot-1-topic-button');
  });

  it('waits for topic-selector-close-button (TopicSelectorModal visible)', () => {
    expect(testIDs).toContain('topic-selector-close-button');
  });

  it('taps topic-selector-close-button to close modal without selection', () => {
    // topic-selector-close-button appears at least twice (once in waitUntil visible, once in tapOn)
    const closeCount = testIDs.filter((id) => id === 'topic-selector-close-button').length;
    expect(closeCount).toBeGreaterThanOrEqual(2);
  });

  // Part H: Collapse card
  it('taps card header again to collapse (EC_E2E_P3_011)', () => {
    // speeches-card-header should appear at least twice (expand + collapse)
    const headerCount = (flowContent.match(/speeches-card-header-\$\{output\.NEXT_SUNDAY\}/g) || []).length;
    expect(headerCount).toBeGreaterThanOrEqual(2);
  });

  it('asserts speech-slot-1-speaker-button NOT visible after collapse', () => {
    const assertNotIDs = extractTestIDs(
      flowContent.split('assertNotVisible').slice(1).join('assertNotVisible')
    );
    expect(assertNotIDs).toContain('speech-slot-1-speaker-button');
  });

  it('has all 8 parts (A through H)', () => {
    expect(flowContent).toContain('Part A');
    expect(flowContent).toContain('Part B');
    expect(flowContent).toContain('Part C');
    expect(flowContent).toContain('Part D');
    expect(flowContent).toContain('Part E');
    expect(flowContent).toContain('Part F');
    expect(flowContent).toContain('Part G');
    expect(flowContent).toContain('Part H');
  });

  it('has extendedWaitUntil with sufficient timeouts (at least 5 waits)', () => {
    expect(timeouts.length).toBeGreaterThanOrEqual(5);
    const maxTimeout = Math.max(...timeouts);
    expect(maxTimeout).toBeGreaterThanOrEqual(15000);
  });

  // EC_E2E_P3_012: Uses position 1, not position 2 (avoids toggle edge case)
  it('uses speech position 1 (not position 2) to avoid toggle edge case (EC_E2E_P3_012)', () => {
    expect(testIDs).toContain('speech-slot-1-speaker-button');
    expect(testIDs).toContain('speech-slot-1-status-button');
    expect(testIDs).toContain('speech-slot-1-topic-button');
    // Should NOT target position 2 elements in the flow
    expect(testIDs).not.toContain('speech-slot-2-speaker-button');
  });
});

// =============================================================================
// AC-SF10-01 to AC-SF10-03: Maestro 06-members flow structure
// =============================================================================

describe('F019_E2E: Maestro 06-members flow (AC-SF10)', () => {
  const flowContent = fs.readFileSync(membersFlowPath, 'utf-8');
  const testIDs = extractTestIDs(flowContent);
  const assertTexts = extractAssertVisibleTexts(flowContent);
  const waitUntilTexts = extractWaitUntilVisibleTexts(flowContent);
  const assertNotTexts = extractAssertNotVisibleTexts(flowContent);
  const timeouts = extractTimeouts(flowContent);

  it('flow file exists', () => {
    expect(fs.existsSync(membersFlowPath)).toBe(true);
  });

  it('starts with appId configuration', () => {
    expect(flowContent).toMatch(/^appId:\s+com\.alouisio\.sacramentmeetingplanner/);
  });

  // Part A: Login
  it('reads credentials from 01-register output', () => {
    expect(flowContent).toContain('${output.TEST_EMAIL}');
    expect(flowContent).toContain('${output.TEST_PASSWORD}');
  });

  it('uses login testIDs for authentication', () => {
    expect(testIDs).toContain('login-email-input');
    expect(testIDs).toContain('login-password-input');
    expect(testIDs).toContain('login-submit-button');
  });

  // Part B: Navigate to Members
  it('navigates to Settings by text "Configurações"', () => {
    expect(flowContent).toContain('Configurações');
  });

  it('taps settings-members-button to enter Members screen', () => {
    expect(testIDs).toContain('settings-members-button');
  });

  it('waits for members-add-button (Members screen visible)', () => {
    expect(testIDs).toContain('members-add-button');
  });

  // Part C: Add new member (AC-SF10-01)
  it('taps members-add-button to add member (AC-SF10-01)', () => {
    expect(testIDs).toContain('members-add-button');
  });

  it('inputs "E2E Membro Teste" as full name', () => {
    expect(flowContent).toContain('E2E Membro Teste');
  });

  it('inputs "Teste" as informal name (EC_E2E_P3_007)', () => {
    expect(testIDs).toContain('members-editor-informal-input');
    expect(flowContent).toContain('Teste');
  });

  it('taps save button to create member', () => {
    expect(testIDs).toContain('members-editor-save-button');
  });

  it('waits for "E2E Membro Teste" visible after save', () => {
    expect(waitUntilTexts).toContain('E2E Membro Teste');
  });

  // Part D: Edit member via swipe (AC-SF10-02, EC_E2E_P3_005)
  it('swipes left on "E2E Membro Teste" to reveal actions (EC_E2E_P3_005)', () => {
    expect(flowContent).toContain('direction: LEFT');
  });

  it('waits for swipeable-edit-button after swipe', () => {
    expect(testIDs).toContain('swipeable-edit-button');
  });

  it('taps swipeable-edit-button to edit member (AC-SF10-02)', () => {
    expect(testIDs).toContain('swipeable-edit-button');
  });

  it('clears and inputs "E2E Membro Editado" as new name', () => {
    expect(flowContent).toContain('clearText');
    expect(flowContent).toContain('E2E Membro Editado');
  });

  it('taps save button to save edited member', () => {
    // Save button appears multiple times (create + edit)
    const saveCount = testIDs.filter((id) => id === 'members-editor-save-button').length;
    expect(saveCount).toBeGreaterThanOrEqual(2);
  });

  it('waits for "E2E Membro Editado" visible after edit', () => {
    expect(waitUntilTexts).toContain('E2E Membro Editado');
  });

  it('asserts "E2E Membro Teste" NOT visible after edit (old name gone)', () => {
    expect(assertNotTexts).toContain('E2E Membro Teste');
  });

  // Part E: Delete member via swipe (AC-SF10-03, EC_E2E_P3_006)
  it('swipes left on "E2E Membro Editado" to reveal delete', () => {
    expect(flowContent).toContain('E2E Membro Editado');
    // direction: LEFT appears at least twice (edit swipe + delete swipe)
    const swipeCount = (flowContent.match(/direction: LEFT/g) || []).length;
    expect(swipeCount).toBeGreaterThanOrEqual(2);
  });

  it('taps swipeable-delete-button (AC-SF10-03)', () => {
    expect(testIDs).toContain('swipeable-delete-button');
  });

  it('confirms deletion via native Alert "Excluir" text (EC_E2E_P3_006)', () => {
    expect(flowContent).toContain('tapOn: "Excluir"');
  });

  it('waits for "E2E Membro Editado" NOT visible after deletion', () => {
    // Uses extendedWaitUntil notVisible
    expect(flowContent).toContain('notVisible: "E2E Membro Editado"');
  });

  // Part F: Navigate back
  it('taps members-back-button to return to Settings', () => {
    expect(testIDs).toContain('members-back-button');
  });

  it('waits for settings-members-button (back on Settings screen)', () => {
    // settings-members-button appears at least twice (navigate to + return to)
    const settingsCount = testIDs.filter((id) => id === 'settings-members-button').length;
    expect(settingsCount).toBeGreaterThanOrEqual(2);
  });

  it('has all 6 parts (A through F)', () => {
    expect(flowContent).toContain('Part A');
    expect(flowContent).toContain('Part B');
    expect(flowContent).toContain('Part C');
    expect(flowContent).toContain('Part D');
    expect(flowContent).toContain('Part E');
    expect(flowContent).toContain('Part F');
  });

  it('has extendedWaitUntil with sufficient timeouts', () => {
    expect(timeouts.length).toBeGreaterThanOrEqual(5);
  });

  // EC_E2E_P3_010: No conflict between flow 05 and 06 member names
  it('uses unique member names different from flow 05 (EC_E2E_P3_010)', () => {
    expect(flowContent).not.toContain('E2E Orador');
  });
});

// =============================================================================
// Cross-validation: Phase 3 Maestro flow testIDs exist in source files
// =============================================================================

describe('F019_E2E: Cross-validation - Phase 3 Maestro testIDs in source', () => {
  // Collect ALL testIDs from Phase 3 source files
  const speechSlotSrc = fs.readFileSync(speechSlotPath, 'utf-8');
  const memberSelectorSrc = fs.readFileSync(memberSelectorPath, 'utf-8');
  const statusChangeSrc = fs.readFileSync(statusChangePath, 'utf-8');
  const topicSelectorSrc = fs.readFileSync(topicSelectorPath, 'utf-8');
  const membersSrc = fs.readFileSync(membersPath, 'utf-8');
  const swipeableCardSrc = fs.readFileSync(swipeableCardPath, 'utf-8');
  const settingsSrc = fs.readFileSync(settingsPath, 'utf-8');

  // Phase 1 login testIDs (reused in Phase 3 flows)
  const loginSrc = fs.readFileSync(
    path.resolve(__dirname, '../app/(auth)/login.tsx'),
    'utf-8'
  );

  const allStaticTestIDs = new Set([
    ...extractStaticTestIDs(speechSlotSrc),
    ...extractStaticTestIDs(memberSelectorSrc),
    ...extractStaticTestIDs(statusChangeSrc),
    ...extractStaticTestIDs(topicSelectorSrc),
    ...extractStaticTestIDs(membersSrc),
    ...extractStaticTestIDs(swipeableCardSrc),
    ...extractStaticTestIDs(settingsSrc),
    ...extractStaticTestIDs(loginSrc),
  ]);

  // Dynamic testID template patterns from source files
  const allDynamicTestIDTemplates = [
    ...extractDynamicTestIDs(speechSlotSrc),
    ...extractDynamicTestIDs(memberSelectorSrc),
    ...extractDynamicTestIDs(statusChangeSrc),
    ...extractDynamicTestIDs(topicSelectorSrc),
    ...extractDynamicTestIDs(membersSrc),
    ...extractDynamicTestIDs(swipeableCardSrc),
    ...extractDynamicTestIDs(settingsSrc),
  ];

  /**
   * Checks if a resolved testID matches any dynamic template in source.
   * E.g., "status-modal-option-assigned_confirmed" matches "status-modal-option-${item}".
   * E.g., "speech-slot-1-speaker-button" matches "speech-slot-${position}-speaker-button".
   */
  function matchesDynamicTemplate(resolvedId: string): boolean {
    for (const template of allDynamicTestIDTemplates) {
      // Replace ${...} with .+ first, then escape the rest as literal
      const parts = template.split(/\$\{[^}]+\}/);
      const escapedParts = parts.map((p) => p.replace(/[.*+?^$()|[\]\\]/g, '\\$&'));
      const regexStr = '^' + escapedParts.join('.+') + '$';
      const pattern = new RegExp(regexStr);
      if (pattern.test(resolvedId)) return true;
    }
    return false;
  }

  it('every static testID in 05-speeches flow exists in source (excluding dynamic date refs)', () => {
    const flowContent = fs.readFileSync(speechesFlowPath, 'utf-8');
    const flowIDs = extractTestIDs(flowContent);

    // Filter out dynamic testIDs with ${output.*}
    const staticFlowIDs = flowIDs.filter(
      (id) => !id.includes('${output.')
    );

    for (const id of staticFlowIDs) {
      const inSource = allStaticTestIDs.has(id) || matchesDynamicTemplate(id);
      expect(
        inSource,
        `testID "${id}" referenced in 05-speeches but not found in source`
      ).toBe(true);
    }
  });

  it('every static testID in 06-members flow exists in source', () => {
    const flowContent = fs.readFileSync(membersFlowPath, 'utf-8');
    const flowIDs = extractTestIDs(flowContent);

    for (const id of flowIDs) {
      expect(
        allStaticTestIDs.has(id),
        `testID "${id}" referenced in 06-members but not found in source`
      ).toBe(true);
    }
  });

  it('speeches.tsx has dynamic template for speeches-card-* testID', () => {
    const speechesSrc = fs.readFileSync(speechesPath, 'utf-8');
    const dynamicTestIDs = extractDynamicTestIDs(speechesSrc);
    expect(dynamicTestIDs).toContain('speeches-card-${item.date}');
  });

  it('SpeechSlot has dynamic templates for speech-slot-{position}-* testIDs', () => {
    const dynamicTestIDs = extractDynamicTestIDs(speechSlotSrc);
    expect(dynamicTestIDs.filter((id) => id.startsWith('speech-slot-${position}'))).toHaveLength(5);
  });

  it('StatusChangeModal has dynamic template for status-modal-option-* testID', () => {
    const dynamicTestIDs = extractDynamicTestIDs(statusChangeSrc);
    expect(dynamicTestIDs).toContain('status-modal-option-${item}');
  });
});

// =============================================================================
// Phase 3 testID naming convention (ADR-052 extension + ADR-056 dynamic)
// =============================================================================

describe('F019_E2E: Phase 3 testID naming convention (ADR-052 + ADR-056)', () => {
  const speechesFlowTestIDs = extractTestIDs(fs.readFileSync(speechesFlowPath, 'utf-8'));
  const membersFlowTestIDs = extractTestIDs(fs.readFileSync(membersFlowPath, 'utf-8'));
  const allFlowTestIDs = [...new Set([...speechesFlowTestIDs, ...membersFlowTestIDs])];

  const staticTestIDs = allFlowTestIDs.filter(
    (id) => !id.includes('${output.')
  );
  const dynamicTestIDs = allFlowTestIDs.filter(
    (id) => id.includes('${output.')
  );

  it('all static testIDs follow kebab-case convention (underscores allowed in dynamic status suffix)', () => {
    // Dynamic status values like "assigned_confirmed" use underscores (from DB enum values)
    // Pattern allows: kebab-case-prefix + optional underscore-containing suffix (for status values)
    const pattern = /^[a-z]+-[a-z0-9]+(-[a-z0-9_]+)*$/;
    for (const id of staticTestIDs) {
      expect(id, `testID "${id}" does not match convention`).toMatch(pattern);
    }
  });

  it('all static testIDs start with known screen prefixes', () => {
    const validPrefixes = [
      'login-',
      'settings-',
      'members-',
      'speech-slot-',
      'member-selector-',
      'status-modal-',
      'topic-selector-',
      'swipeable-',
      'speeches-card-',
    ];
    for (const id of staticTestIDs) {
      const hasValidPrefix = validPrefixes.some((p) => id.startsWith(p));
      expect(
        hasValidPrefix,
        `testID "${id}" has unknown prefix`
      ).toBe(true);
    }
  });

  it('all static testIDs end with known type suffixes (or dynamic status values)', () => {
    const validSuffixes = [
      '-input',
      '-button',
      '-current',
      '-toggle',
    ];
    // Dynamic status testIDs end with DB status enum values (contain underscores)
    const dynamicStatusPattern = /status-modal-option-[a-z_]+$/;
    for (const id of staticTestIDs) {
      const hasValidSuffix = validSuffixes.some((s) => id.endsWith(s));
      const isDynamicStatus = dynamicStatusPattern.test(id);
      expect(
        hasValidSuffix || isDynamicStatus,
        `testID "${id}" has unknown suffix`
      ).toBe(true);
    }
  });

  it('dynamic testIDs use ${output.NEXT_SUNDAY} pattern (ADR-056)', () => {
    for (const id of dynamicTestIDs) {
      expect(id).toContain('${output.NEXT_SUNDAY}');
    }
  });
});

// =============================================================================
// Phase 3 Maestro flow file naming (ADR-053)
// =============================================================================

describe('F019_E2E: Phase 3 Maestro flow file naming (ADR-053)', () => {
  it('05-speeches.yaml exists with correct prefix', () => {
    expect(fs.existsSync(speechesFlowPath)).toBe(true);
    expect(path.basename(speechesFlowPath)).toBe('05-speeches.yaml');
  });

  it('06-members.yaml exists with correct prefix', () => {
    expect(fs.existsSync(membersFlowPath)).toBe(true);
    expect(path.basename(membersFlowPath)).toBe('06-members.yaml');
  });

  it('all flow files use zero-padded numeric prefix (01-06)', () => {
    const files = fs.readdirSync(path.join(projectRoot, 'e2e/maestro'));
    const yamlFiles = files.filter((f) => f.endsWith('.yaml'));
    expect(yamlFiles.length).toBeGreaterThanOrEqual(6);
    for (const file of yamlFiles) {
      expect(file).toMatch(/^\d{2}-/);
    }
  });

  it('flow files are in correct sequential order (01-06)', () => {
    const files = fs.readdirSync(path.join(projectRoot, 'e2e/maestro'));
    const yamlFiles = files.filter((f) => f.endsWith('.yaml')).sort();
    expect(yamlFiles[0]).toBe('01-register.yaml');
    expect(yamlFiles[1]).toBe('02-login-logout.yaml');
    expect(yamlFiles[2]).toBe('03-home-presentation.yaml');
    expect(yamlFiles[3]).toBe('04-agenda.yaml');
    expect(yamlFiles[4]).toBe('05-speeches.yaml');
    expect(yamlFiles[5]).toBe('06-members.yaml');
  });
});

// =============================================================================
// pt-BR i18n strings used in Phase 3 Maestro assertions
// =============================================================================

describe('F019_E2E: pt-BR strings used in Phase 3 Maestro assertions', () => {
  it('pt-BR has home tab label "Início"', () => {
    expect((ptBR as any).tabs.home).toBe('Início');
  });

  it('pt-BR has speeches tab label "Discursos"', () => {
    expect((ptBR as any).speeches.title).toBe('Discursos');
  });

  it('pt-BR has settings tab label "Configurações"', () => {
    expect((ptBR as any).settings.title).toBe('Configurações');
  });

  it('pt-BR has delete confirmation text "Excluir"', () => {
    expect((ptBR as any).common.delete).toBe('Excluir');
  });

  it('pt-BR has settings members item label "Discursantes"', () => {
    expect((ptBR as any).settings.members).toBe('Discursantes');
  });
});

// =============================================================================
// Total testID count verification
// =============================================================================

describe('F019_E2E: Total testID count verification', () => {
  it('Phase 3 adds 27 testIDs across 9 source files', () => {
    const speechSlotSrc = fs.readFileSync(speechSlotPath, 'utf-8');
    const memberSelectorSrc = fs.readFileSync(memberSelectorPath, 'utf-8');
    const statusChangeSrc = fs.readFileSync(statusChangePath, 'utf-8');
    const topicSelectorSrc = fs.readFileSync(topicSelectorPath, 'utf-8');
    const sundayCardSrc = fs.readFileSync(sundayCardPath, 'utf-8');
    const speechesSrc = fs.readFileSync(speechesPath, 'utf-8');
    const membersSrc = fs.readFileSync(membersPath, 'utf-8');
    const swipeableCardSrc = fs.readFileSync(swipeableCardPath, 'utf-8');
    const settingsSrc = fs.readFileSync(settingsPath, 'utf-8');

    // SpeechSlot: 5 dynamic + 1 static = 6
    const speechSlotCount =
      extractDynamicTestIDs(speechSlotSrc).filter((id) => id.startsWith('speech-slot')).length +
      extractStaticTestIDs(speechSlotSrc).filter((id) => id.startsWith('speech-slot')).length;
    expect(speechSlotCount).toBe(6);

    // MemberSelectorModal: 2 static + 1 dynamic = 3
    const memberSelectorCount =
      extractStaticTestIDs(memberSelectorSrc).filter((id) => id.startsWith('member-selector')).length +
      extractDynamicTestIDs(memberSelectorSrc).filter((id) => id.startsWith('member-selector')).length;
    expect(memberSelectorCount).toBe(3);

    // StatusChangeModal: 2 static + 1 dynamic = 3
    const statusChangeCount =
      extractStaticTestIDs(statusChangeSrc).filter((id) => id.startsWith('status-modal')).length +
      extractDynamicTestIDs(statusChangeSrc).filter((id) => id.startsWith('status-modal')).length;
    expect(statusChangeCount).toBe(3);

    // TopicSelectorModal: 2 static
    const topicSelectorCount = extractStaticTestIDs(topicSelectorSrc).filter(
      (id) => id.startsWith('topic-selector')
    ).length;
    expect(topicSelectorCount).toBe(2);

    // SundayCard: 1 prop forwarding + 1 header derived = 2 (via testID={testID} + testID={headerTestID})
    // But the testID?: string is a prop, not a hardcoded value. Count the testID usages in SundayCard.
    expect(sundayCardSrc).toContain('testID={testID}');
    expect(sundayCardSrc).toContain('testID={headerTestID}');

    // speeches.tsx: 1 dynamic
    const speechesCount = extractDynamicTestIDs(speechesSrc).filter(
      (id) => id.startsWith('speeches-card')
    ).length;
    expect(speechesCount).toBe(1);

    // Members: 8 static
    const membersCount = extractStaticTestIDs(membersSrc).filter(
      (id) => id.startsWith('members-')
    ).length;
    expect(membersCount).toBe(8);

    // SwipeableCard: 2 static
    const swipeableCount = extractStaticTestIDs(swipeableCardSrc).filter(
      (id) => id.startsWith('swipeable-')
    ).length;
    expect(swipeableCount).toBe(2);

    // SettingsItem: 1 static (settings-members-button) + 1 forwarding (testID={testID})
    // But settings/index.tsx also has settings-sign-out-button from Phase 1
    // Phase 3 only added: settings-members-button
    expect(extractStaticTestIDs(settingsSrc)).toContain('settings-members-button');
  });
});

// =============================================================================
// EC_E2E_P3_009: Conference Sunday handling
// =============================================================================

describe('F019_E2E: Conference Sunday handling (EC_E2E_P3_009)', () => {
  const flowContent = fs.readFileSync(speechesFlowPath, 'utf-8');

  it('flow computes next Sunday dynamically (may or may not be conference)', () => {
    // The flow will fail gracefully if next Sunday is a conference (no speech slots).
    // This is documented in the plan as a known limitation.
    expect(flowContent).toContain('NEXT_SUNDAY');
    expect(flowContent).toContain('evalScript');
  });

  it('uses timeout to handle both regular and slow expansion', () => {
    const timeouts = extractTimeouts(flowContent);
    expect(timeouts).toContain(15000);
  });
});

// =============================================================================
// EC_E2E_P3_008: Keyboard covering fields
// =============================================================================

describe('F019_E2E: Keyboard covering fields (EC_E2E_P3_008)', () => {
  const membersSrc = fs.readFileSync(membersPath, 'utf-8');

  it('Members screen uses KeyboardAvoidingView', () => {
    expect(membersSrc).toContain('KeyboardAvoidingView');
  });
});

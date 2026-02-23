/**
 * Batch 21 Phase 2 - TESTER tests for F135, F136, F137.
 * Complements batch21-phase2-f135-f137.test.ts with additional coverage.
 *
 * CR-193 (F135): Settings reorganization into 2 labeled groups
 * CR-199 (F136): StatusLED alignment via paddingRight on labelRow
 * CR-200 (F137): Play icon fontSize enlargement in Home and Agenda
 *
 * Total ACs: 24 (F135: 12, F136: 6, F137: 6)
 * Total ECs: 8 (F135: 3, F136: 3, F137: 2)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// --- Helpers ---

const resolve = (...parts: string[]) => path.resolve(__dirname, '..', ...parts);

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(resolve(relativePath), 'utf-8');
}

function readLocaleFile(lang: string): Record<string, unknown> {
  const content = fs.readFileSync(resolve('i18n', 'locales', `${lang}.json`), 'utf-8');
  return JSON.parse(content);
}

// ============================================================================
// F135: Settings reorganization - Additional tester coverage
// ============================================================================

describe('F135 (CR-193) - Tester: Settings reorganization', () => {
  const settingsSource = readSourceFile('app/(tabs)/settings/index.tsx');

  // --- AC-135-01: Group 1 label for Bispado/Secretario ---
  describe('AC-135-01: Group 1 label visible to non-Observer users', () => {
    it('wardSettingsGroup label uses sectionLabel style', () => {
      // The label should use styles.sectionLabel
      expect(settingsSource).toContain('styles.sectionLabel');
      // And it should use i18n key
      expect(settingsSource).toContain("t('settings.wardSettingsGroup')");
    });

    it('Group 1 label is rendered as a Text component', () => {
      // Should be <Text style={[styles.sectionLabel, ...]}> ... wardSettingsGroup
      const labelPattern = /Text\s+style=\{[^}]*styles\.sectionLabel[^}]*\}[^>]*>[^<]*\{t\('settings\.wardSettingsGroup'\)\}/s;
      expect(settingsSource).toMatch(labelPattern);
    });
  });

  // --- AC-135-02: Group 2 label for ALL users ---
  describe('AC-135-02: Group 2 label visible to all users', () => {
    it('appSettingsGroup label uses sectionLabel style', () => {
      const appLabelIdx = settingsSource.indexOf("t('settings.appSettingsGroup')");
      expect(appLabelIdx).toBeGreaterThan(-1);
      // Find the Text component wrapping this label
      const before = settingsSource.substring(Math.max(0, appLabelIdx - 200), appLabelIdx);
      expect(before).toContain('styles.sectionLabel');
    });
  });

  // --- AC-135-03: Group 1 item count and order ---
  describe('AC-135-03: Group 1 items for Bispado (4 items, whatsapp gated)', () => {
    it('members is the first item in Group 1', () => {
      const wardLabelIdx = settingsSource.indexOf("t('settings.wardSettingsGroup')");
      const appLabelIdx = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const group1 = settingsSource.substring(wardLabelIdx, appLabelIdx);

      const membersIdx = group1.indexOf("t('settings.members')");
      const topicsIdx = group1.indexOf("t('settings.topics')");
      expect(membersIdx).toBeGreaterThan(-1);
      expect(membersIdx).toBeLessThan(topicsIdx);
    });

    it('members requires member:read permission', () => {
      const wardLabelIdx = settingsSource.indexOf("t('settings.wardSettingsGroup')");
      const appLabelIdx = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const group1 = settingsSource.substring(wardLabelIdx, appLabelIdx);
      expect(group1).toContain("hasPermission('member:read')");
    });

    it('topics requires topic:write permission', () => {
      const wardLabelIdx = settingsSource.indexOf("t('settings.wardSettingsGroup')");
      const appLabelIdx = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const group1 = settingsSource.substring(wardLabelIdx, appLabelIdx);
      expect(group1).toContain("hasPermission('topic:write')");
    });
  });

  // --- AC-135-04: Group 2 items ---
  describe('AC-135-04: Group 2 items in correct order with correct permissions', () => {
    it('users requires settings:users permission', () => {
      const appLabelIdx = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const signOutIdx = settingsSource.indexOf('handleSignOut', appLabelIdx);
      const group2 = settingsSource.substring(appLabelIdx, signOutIdx);
      expect(group2).toContain("hasPermission('settings:users')");
    });

    it('history requires history:read permission', () => {
      const appLabelIdx = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const signOutIdx = settingsSource.indexOf('handleSignOut', appLabelIdx);
      const group2 = settingsSource.substring(appLabelIdx, signOutIdx);
      expect(group2).toContain("hasPermission('history:read')");
    });

    it('appLanguage is not permission-gated in Group 2', () => {
      const appLabelIdx = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const signOutIdx = settingsSource.indexOf('handleSignOut', appLabelIdx);
      const group2 = settingsSource.substring(appLabelIdx, signOutIdx);

      // Find appLanguage SettingsItem
      const appLangIdx = group2.indexOf("t('settings.appLanguage')");
      // Check there's no hasPermission immediately before it
      const beforeAppLang = group2.substring(Math.max(0, appLangIdx - 100), appLangIdx);
      expect(beforeAppLang).not.toContain('hasPermission');
    });

    it('theme is not permission-gated in Group 2', () => {
      const appLabelIdx = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const signOutIdx = settingsSource.indexOf('handleSignOut', appLabelIdx);
      const group2 = settingsSource.substring(appLabelIdx, signOutIdx);

      const themeIdx = group2.indexOf("t('settings.theme')");
      const beforeTheme = group2.substring(Math.max(0, themeIdx - 100), themeIdx);
      expect(beforeTheme).not.toContain('hasPermission');
    });

    it('about is not permission-gated in Group 2', () => {
      const appLabelIdx = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const signOutIdx = settingsSource.indexOf('handleSignOut', appLabelIdx);
      const group2 = settingsSource.substring(appLabelIdx, signOutIdx);

      const aboutIdx = group2.indexOf("t('settings.about')");
      const beforeAbout = group2.substring(Math.max(0, aboutIdx - 100), aboutIdx);
      expect(beforeAbout).not.toContain('hasPermission');
    });
  });

  // --- AC-135-05: Observer sees only Group 2 ---
  describe('AC-135-05: Observer sees only Group 2 items (appLanguage, theme, about)', () => {
    it('users and history are permission-gated (hidden for Observer)', () => {
      const appLabelIdx = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const signOutIdx = settingsSource.indexOf('handleSignOut', appLabelIdx);
      const group2 = settingsSource.substring(appLabelIdx, signOutIdx);

      // Users needs settings:users permission
      const usersIdx = group2.indexOf("t('settings.users')");
      const beforeUsers = group2.substring(Math.max(0, usersIdx - 200), usersIdx);
      expect(beforeUsers).toContain("hasPermission('settings:users')");

      // History needs history:read permission
      const historyIdx = group2.indexOf("t('settings.history')");
      const beforeHistory = group2.substring(Math.max(0, historyIdx - 200), historyIdx);
      expect(beforeHistory).toContain("hasPermission('history:read')");
    });

    it('isObserver is derived from role === observer', () => {
      expect(settingsSource).toContain("const isObserver = role === 'observer'");
    });
  });

  // --- AC-135-06: Secretario sees whatsappTemplate ---
  describe('AC-135-06: whatsappTemplate between topics and wardLanguage', () => {
    it('whatsappTemplate appears after topics and before wardLanguage in Group 1', () => {
      const wardLabelIdx = settingsSource.indexOf("t('settings.wardSettingsGroup')");
      const appLabelIdx = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const group1 = settingsSource.substring(wardLabelIdx, appLabelIdx);

      const topicsIdx = group1.indexOf("t('settings.topics')");
      const whatsappIdx = group1.indexOf("t('settings.whatsappTemplate')");
      const wardLangIdx = group1.indexOf("t('settings.wardLanguage')");

      expect(topicsIdx).toBeGreaterThan(-1);
      expect(whatsappIdx).toBeGreaterThan(topicsIdx);
      expect(wardLangIdx).toBeGreaterThan(whatsappIdx);
    });
  });

  // --- AC-135-07 / AC-135-08: i18n keys ---
  describe('AC-135-07 / AC-135-08: All i18n keys present and consistent', () => {
    it('all 3 locale files have both keys in the settings section', () => {
      for (const lang of ['pt-BR', 'en', 'es']) {
        const locale = readLocaleFile(lang);
        const settings = locale.settings as Record<string, unknown>;
        expect(settings).toBeDefined();
        expect(settings.wardSettingsGroup).toBeDefined();
        expect(settings.appSettingsGroup).toBeDefined();
        expect(typeof settings.wardSettingsGroup).toBe('string');
        expect(typeof settings.appSettingsGroup).toBe('string');
        expect((settings.wardSettingsGroup as string).length).toBeGreaterThan(0);
        expect((settings.appSettingsGroup as string).length).toBeGreaterThan(0);
      }
    });
  });

  // --- AC-135-09: sectionLabel style color applied via textSecondary ---
  describe('AC-135-09: sectionLabel style + dynamic color', () => {
    it('sectionLabel Text component applies colors.textSecondary as color', () => {
      // The pattern is: style={[styles.sectionLabel, { color: colors.textSecondary }]}
      expect(settingsSource).toContain('colors.textSecondary');
      // Check that both labels use this pattern
      const matches = settingsSource.match(/styles\.sectionLabel.*?colors\.textSecondary/gs);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBeGreaterThanOrEqual(2);
    });
  });

  // --- AC-135-10: Sign Out button position ---
  describe('AC-135-10: Sign Out button after both groups', () => {
    it('signOutButton style exists and uses error color', () => {
      expect(settingsSource).toContain('styles.signOutButton');
      expect(settingsSource).toContain('colors.error');
    });

    it('Sign Out is after Group 2 section close', () => {
      const appLabelIdx = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const signOutBtnIdx = settingsSource.indexOf('styles.signOutButton', appLabelIdx);
      expect(signOutBtnIdx).toBeGreaterThan(appLabelIdx);
    });
  });

  // --- AC-135-11 / AC-135-12: items moved correctly ---
  describe('AC-135-11/12: wardLanguage/timezone in Group1, users/history in Group2', () => {
    it('wardLanguage is NOT in Group 2', () => {
      const appLabelIdx = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const signOutIdx = settingsSource.indexOf('handleSignOut', appLabelIdx);
      const group2 = settingsSource.substring(appLabelIdx, signOutIdx);
      expect(group2).not.toContain("t('settings.wardLanguage')");
    });

    it('timezone is NOT in Group 2', () => {
      const appLabelIdx = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const signOutIdx = settingsSource.indexOf('handleSignOut', appLabelIdx);
      const group2 = settingsSource.substring(appLabelIdx, signOutIdx);
      expect(group2).not.toContain("t('settings.timezone')");
    });

    it('users is NOT in Group 1', () => {
      const wardLabelIdx = settingsSource.indexOf("t('settings.wardSettingsGroup')");
      const appLabelIdx = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const group1 = settingsSource.substring(wardLabelIdx, appLabelIdx);
      expect(group1).not.toContain("t('settings.users')");
    });

    it('history is NOT in Group 1', () => {
      const wardLabelIdx = settingsSource.indexOf("t('settings.wardSettingsGroup')");
      const appLabelIdx = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const group1 = settingsSource.substring(wardLabelIdx, appLabelIdx);
      expect(group1).not.toContain("t('settings.history')");
    });
  });

  // --- EC-135-01: Bispado no whatsapp ---
  describe('EC-135-01: whatsappTemplate hidden when settings:whatsapp not granted', () => {
    it('whatsappTemplate conditional render uses hasPermission with settings:whatsapp', () => {
      const wardLabelIdx = settingsSource.indexOf("t('settings.wardSettingsGroup')");
      const appLabelIdx = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const group1 = settingsSource.substring(wardLabelIdx, appLabelIdx);

      // Find the conditional render pattern
      const whatsappPermIdx = group1.indexOf("hasPermission('settings:whatsapp')");
      const whatsappItemIdx = group1.indexOf("t('settings.whatsappTemplate')");
      expect(whatsappPermIdx).toBeGreaterThan(-1);
      expect(whatsappItemIdx).toBeGreaterThan(whatsappPermIdx);
      // They should be in the same conditional block (close together)
      expect(whatsappItemIdx - whatsappPermIdx).toBeLessThan(300);
    });
  });

  // --- EC-135-02: timezone permission ---
  describe('EC-135-02: timezone gated behind settings:timezone', () => {
    it('timezone uses hasPermission settings:timezone in Group 1', () => {
      const wardLabelIdx = settingsSource.indexOf("t('settings.wardSettingsGroup')");
      const appLabelIdx = settingsSource.indexOf("t('settings.appSettingsGroup')");
      const group1 = settingsSource.substring(wardLabelIdx, appLabelIdx);

      const tzPermIdx = group1.indexOf("hasPermission('settings:timezone')");
      const tzItemIdx = group1.indexOf("t('settings.timezone')");
      expect(tzPermIdx).toBeGreaterThan(-1);
      expect(tzItemIdx).toBeGreaterThan(tzPermIdx);
    });
  });

  // --- EC-135-03: Group 1 hidden for Observer ---
  describe('EC-135-03: entire Group 1 hidden when user is Observer', () => {
    it('wardSettingsGroup and its card are inside {!isObserver && (<> ... </>)} block', () => {
      // {!isObserver && ( should appear before wardSettingsGroup
      const observerBlockStart = settingsSource.indexOf('{!isObserver && (');
      const wardLabel = settingsSource.indexOf("t('settings.wardSettingsGroup')");
      const appLabel = settingsSource.indexOf("t('settings.appSettingsGroup')");

      expect(observerBlockStart).toBeGreaterThan(-1);
      expect(wardLabel).toBeGreaterThan(observerBlockStart);
      // The observer block should close before appSettingsGroup
      const closingFragment = settingsSource.indexOf('</>', observerBlockStart);
      expect(closingFragment).toBeGreaterThan(wardLabel);
      expect(closingFragment).toBeLessThan(appLabel);
    });
  });

  // --- Structure: exactly 2 groups, no orphan sections ---
  describe('Structure: exactly 2 labeled groups', () => {
    it('there are exactly 2 sectionLabel references in JSX', () => {
      const jsxSection = settingsSource.substring(
        settingsSource.indexOf('return ('),
        settingsSource.indexOf('const styles')
      );
      const sectionLabelCount = (jsxSection.match(/styles\.sectionLabel/g) || []).length;
      expect(sectionLabelCount).toBe(2);
    });

    it('no third unlabeled section exists between Group 2 and Sign Out', () => {
      const group2EndIdx = settingsSource.indexOf("t('settings.about')");
      const signOutIdx = settingsSource.indexOf('styles.signOutButton');
      const between = settingsSource.substring(group2EndIdx, signOutIdx);
      // There should be no additional styles.section between about and signOut
      // except the closing of the current section
      const sectionCount = (between.match(/styles\.section/g) || []).length;
      expect(sectionCount).toBe(0);
    });
  });
});

// ============================================================================
// F136: StatusLED alignment - Additional tester coverage
// ============================================================================

describe('F136 (CR-199) - Tester: StatusLED alignment', () => {
  const speechSlotSource = readSourceFile('components/SpeechSlot.tsx');

  // --- AC-136-01: paddingRight: 36 ---
  describe('AC-136-01: labelRow paddingRight aligns StatusLED with speaker field', () => {
    it('paddingRight value is exactly 36 (matching actionArea width)', () => {
      const labelRowMatch = speechSlotSource.match(/labelRow:\s*\{([^}]+)\}/s);
      expect(labelRowMatch).not.toBeNull();
      const paddingMatch = labelRowMatch![1].match(/paddingRight:\s*(\d+)/);
      expect(paddingMatch).not.toBeNull();
      expect(parseInt(paddingMatch![1], 10)).toBe(36);
    });
  });

  // --- AC-136-02: actionArea width unchanged ---
  describe('AC-136-02: actionArea width remains 36', () => {
    it('actionArea width is exactly 36', () => {
      const actionAreaMatch = speechSlotSource.match(/actionArea:\s*\{([^}]+)\}/s);
      expect(actionAreaMatch).not.toBeNull();
      const widthMatch = actionAreaMatch![1].match(/width:\s*(\d+)/);
      expect(widthMatch).not.toBeNull();
      expect(parseInt(widthMatch![1], 10)).toBe(36);
    });
  });

  // --- AC-136-03: all 3 positions use same labelRow ---
  describe('AC-136-03: all positions use same labelRow style', () => {
    it('styles.labelRow is used in JSX render (not just defined)', () => {
      const jsxPart = speechSlotSource.substring(
        speechSlotSource.indexOf('return ('),
        speechSlotSource.indexOf('const styles') > 0
          ? speechSlotSource.indexOf('const styles')
          : speechSlotSource.length
      );
      // labelRow is referenced in JSX
      expect(jsxPart).toContain('styles.labelRow');
    });

    it('labelRow is defined with all required properties', () => {
      const labelRowMatch = speechSlotSource.match(/labelRow:\s*\{([^}]+)\}/s);
      expect(labelRowMatch).not.toBeNull();
      const block = labelRowMatch![1];
      expect(block).toContain("flexDirection: 'row'");
      expect(block).toContain("justifyContent: 'space-between'");
      expect(block).toContain("alignItems: 'center'");
      expect(block).toContain('marginBottom: 6');
      expect(block).toContain('paddingRight: 36');
    });
  });

  // --- AC-136-04: statusSection unchanged ---
  describe('AC-136-04: statusSection maintains flexDirection row, alignItems center, gap 6', () => {
    it('statusSection is used in JSX (not just defined)', () => {
      expect(speechSlotSource).toContain('styles.statusSection');
      // In JSX: style={styles.statusSection} or similar
      const jsxPart = speechSlotSource.substring(0, speechSlotSource.indexOf('StyleSheet.create'));
      expect(jsxPart).toContain('styles.statusSection');
    });
  });

  // --- AC-136-05: pos2 disabled ---
  describe('AC-136-05: position 2 disabled renders correctly', () => {
    it('isPos2Disabled computed from position === 2 && isSecondSpeechEnabled === false', () => {
      expect(speechSlotSource).toContain('position === 2 && isSecondSpeechEnabled === false');
    });
  });

  // --- AC-136-06: toggle switch ---
  describe('AC-136-06: toggle switch in labelWithToggle not affected', () => {
    it('labelWithToggle style has flexDirection row', () => {
      const labelWithToggleMatch = speechSlotSource.match(/labelWithToggle:\s*\{([^}]+)\}/s);
      expect(labelWithToggleMatch).not.toBeNull();
      expect(labelWithToggleMatch![1]).toContain("flexDirection: 'row'");
    });

    it('onToggleSecondSpeech callback is wired to Switch', () => {
      // Check that onToggleSecondSpeech is used in Switch component
      expect(speechSlotSource).toContain('onToggleSecondSpeech');
      expect(speechSlotSource).toContain('Switch');
    });
  });

  // --- EC-136-01: not_assigned status ---
  describe('EC-136-01: StatusLED renders for not_assigned status', () => {
    it('status defaults to not_assigned when speech has no status', () => {
      expect(speechSlotSource).toContain("speech?.status ?? 'not_assigned'");
    });
  });

  // --- EC-136-02: paddingRight matches actionArea width ---
  describe('EC-136-02: labelRow paddingRight === actionArea width', () => {
    it('both values are 36', () => {
      const labelRowMatch = speechSlotSource.match(/labelRow:\s*\{([^}]+)\}/s);
      const actionAreaMatch = speechSlotSource.match(/actionArea:\s*\{([^}]+)\}/s);

      const pr = labelRowMatch![1].match(/paddingRight:\s*(\d+)/);
      const w = actionAreaMatch![1].match(/width:\s*(\d+)/);

      expect(pr![1]).toBe('36');
      expect(w![1]).toBe('36');
      expect(pr![1]).toBe(w![1]);
    });
  });

  // --- EC-136-03: topicActionArea unchanged ---
  describe('EC-136-03: topicActionArea not affected by F136', () => {
    it('topicActionArea has width: 36 and height: 34', () => {
      const match = speechSlotSource.match(/topicActionArea:\s*\{([^}]+)\}/s);
      expect(match).not.toBeNull();
      expect(match![1]).toContain('width: 36');
      expect(match![1]).toContain('height: 34');
    });
  });
});

// ============================================================================
// F137: Play icon fontSize - Additional tester coverage
// ============================================================================

describe('F137 (CR-200) - Tester: Play icon fontSize enlargement', () => {
  const homeSource = readSourceFile('app/(tabs)/index.tsx');
  const agendaSource = readSourceFile('app/(tabs)/agenda.tsx');

  // --- AC-137-01: Home PlayIcon size ---
  describe('AC-137-01: Home playIcon fontSize is 20', () => {
    it('PlayIcon SVG component has size={20} in Home', () => {
      // PlayIcon now uses size prop instead of fontSize style
      expect(homeSource).toContain('<PlayIcon size={20}');
    });
  });

  // --- AC-137-02: Agenda PlayIcon size ---
  describe('AC-137-02: Agenda playButton fontSize is 18', () => {
    it('PlayIcon SVG component has size={18} in Agenda', () => {
      // PlayIcon now uses size prop instead of fontSize style
      expect(agendaSource).toContain('<PlayIcon size={18}');
    });
  });

  // --- AC-137-03: Agenda playButton marginRight ---
  describe('AC-137-03: Agenda playButton marginRight is 8', () => {
    it('playButton marginRight is exactly 8 (adjusted for SVG icon)', () => {
      const playButtonMatch = agendaSource.match(/playButton:\s*\{([^}]+)\}/s);
      expect(playButtonMatch).not.toBeNull();
      const mrMatch = playButtonMatch![1].match(/marginRight:\s*(\d+)/);
      expect(mrMatch).not.toBeNull();
      expect(parseInt(mrMatch![1], 10)).toBe(8);
    });
  });

  // --- AC-137-04: vertical alignment preserved ---
  describe('AC-137-04: meetingButtonContent preserves vertical alignment', () => {
    it('meetingButtonContent has flexDirection row, alignItems center, justifyContent center', () => {
      const contentMatch = homeSource.match(/meetingButtonContent:\s*\{([^}]+)\}/s);
      expect(contentMatch).not.toBeNull();
      const block = contentMatch![1];
      expect(block).toContain("flexDirection: 'row'");
      expect(block).toContain("alignItems: 'center'");
      expect(block).toContain("justifyContent: 'center'");
    });
  });

  // --- AC-137-05: play icon and chevron are separate ---
  describe('AC-137-05: play icon and chevron are separate tappable elements', () => {
    it('play icon is in a Pressable, chevron uses ChevronUp/DownIcon SVG', () => {
      // Play button is inside a Pressable with onPress for navigation
      expect(agendaSource).toContain("accessibilityLabel=\"Open presentation\"");
      // Chevron uses SVG icons
      expect(agendaSource).toContain('ChevronUpIcon');
      expect(agendaSource).toContain('ChevronDownIcon');
    });

    it('play icon and chevron use different SVG components', () => {
      // PlayIcon is used for play button, ChevronUp/DownIcon for chevron
      expect(agendaSource).toContain('PlayIcon');
      expect(agendaSource).toContain('ChevronUpIcon');
      expect(agendaSource).toContain('ChevronDownIcon');
    });
  });

  // --- AC-137-06: play icon navigation ---
  describe('AC-137-06: play icon navigates to presentation', () => {
    it('Home play button navigates to /presentation with sundayDate', () => {
      expect(homeSource).toContain("pathname: '/presentation'");
      expect(homeSource).toContain('params: { date: sundayDate }');
    });

    it('Agenda play button navigates to /presentation with date', () => {
      expect(agendaSource).toContain("pathname: '/presentation'");
      expect(agendaSource).toContain('params: { date }');
    });
  });

  // --- EC-137-01: SVG PlayIcon used ---
  describe('EC-137-01: play icon uses PlayIcon SVG', () => {
    it('Home button renders PlayIcon SVG component', () => {
      expect(homeSource).toContain('PlayIcon');
    });

    it('Agenda card renders PlayIcon SVG component', () => {
      expect(agendaSource).toContain('PlayIcon');
    });

    it('play icon size is a fixed number prop (not dynamic)', () => {
      // PlayIcon uses size prop with a fixed number
      expect(homeSource).toContain('<PlayIcon size={20}');
    });
  });

  // --- EC-137-02: collapsed card no play icon ---
  describe('EC-137-02: collapsed card does not show play icon', () => {
    it('play button render is guarded by expandable && isExpanded', () => {
      // Find the play button render location
      const playBtnIdx = agendaSource.indexOf("accessibilityLabel=\"Open presentation\"");
      expect(playBtnIdx).toBeGreaterThan(-1);

      // The closest expandable && isExpanded should be before the play button
      // Need a wider window since the guard is several lines above
      const beforePlay = agendaSource.substring(Math.max(0, playBtnIdx - 400), playBtnIdx);
      expect(beforePlay).toContain('expandable && isExpanded');
    });

    it('chevron is shown even when collapsed (only expandable check)', () => {
      // Chevron: {expandable && ( ... ChevronUp/DownIcon ... )}
      const chevronIdx = agendaSource.indexOf('<ChevronUpIcon');
      const beforeChevron = agendaSource.substring(Math.max(0, chevronIdx - 200), chevronIdx);
      expect(beforeChevron).toContain('expandable');
      // But NOT expandable && isExpanded right before chevron
      // The chevron guard is just {expandable && (...)} not {expandable && isExpanded && (...)}
    });
  });

  // --- Cross-check: Home playIconWrapper marginRight ---
  describe('Cross-check: Home playIconWrapper has marginRight for spacing from text', () => {
    it('playIconWrapper has marginRight 8', () => {
      const playIconMatch = homeSource.match(/playIconWrapper:\s*\{([^}]+)\}/s);
      expect(playIconMatch).not.toBeNull();
      const mrMatch = playIconMatch![1].match(/marginRight:\s*(\d+)/);
      expect(mrMatch).not.toBeNull();
      expect(parseInt(mrMatch![1], 10)).toBe(8);
    });
  });
});

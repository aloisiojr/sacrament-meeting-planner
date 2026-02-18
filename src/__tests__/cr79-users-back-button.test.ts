/**
 * QA Tests for CR-79: Users Screen Back Button Fix
 *
 * Covers:
 * - AC-1: Back button visible with t('common.back') text in primary color
 * - AC-2: Back button calls router.back() on press
 * - AC-3: Header follows 3-element layout [Back | Title | Invite] consistent with other sub-screens
 * - AC-4: Invite button still functional (no regression)
 * - AC-5: Back button has accessibilityRole='button'
 * - EC-1: router.back() called without errors (deep link scenario)
 * - EC-2: Header layout uses flexDirection row with space-between (small screen support)
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

/**
 * Extracts the header JSX block from users.tsx.
 * The header is the first <View style={styles.header}> block after the return.
 */
function extractHeaderBlock(source: string): string {
  const returnIdx = source.indexOf('return (');
  if (returnIdx === -1) throw new Error('return statement not found');
  const afterReturn = source.slice(returnIdx);

  // Find the header View
  const headerStart = afterReturn.indexOf('<View style={styles.header}>');
  if (headerStart === -1) throw new Error('Header View not found');

  // Track depth to find closing </View>
  let depth = 0;
  let i = headerStart;
  while (i < afterReturn.length) {
    if (afterReturn.slice(i).startsWith('<View')) {
      depth++;
      i += 5;
    } else if (afterReturn.slice(i).startsWith('</View>')) {
      depth--;
      if (depth === 0) {
        return afterReturn.slice(headerStart, i + 7);
      }
      i += 7;
    } else {
      i++;
    }
  }
  throw new Error('Could not extract header block');
}

/**
 * Extracts the StyleSheet.create({...}) block from the source.
 */
function extractStyleSheet(source: string): string {
  const start = source.indexOf('StyleSheet.create({');
  if (start === -1) throw new Error('StyleSheet.create not found');
  let braceDepth = 0;
  let end = -1;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') braceDepth++;
    if (source[i] === '}') braceDepth--;
    if (braceDepth === 0) {
      end = i + 1;
      break;
    }
  }
  return source.slice(start, end);
}

describe('CR-79: Users Screen Back Button Fix', () => {
  // ---------------------------------------------------------------
  // AC-1: Back button is visible with t('common.back') text
  // ---------------------------------------------------------------
  describe('AC-1: Back button visible with localized text in primary color', () => {
    it('should have a Pressable with t(common.back) text in the header', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const header = extractHeaderBlock(source);
      expect(header).toContain("t('common.back')");
    });

    it('should style the back button text with colors.primary', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const header = extractHeaderBlock(source);
      expect(header).toContain('color: colors.primary');
    });

    it('should use styles.backButton for back button text styling', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const header = extractHeaderBlock(source);
      expect(header).toContain('styles.backButton');
    });

    it('should have backButton style defined in StyleSheet with fontSize 16 and fontWeight 600', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const styleSheet = extractStyleSheet(source);
      expect(styleSheet).toContain('backButton:');
      // Extract backButton style block
      const backBtnIdx = styleSheet.indexOf('backButton:');
      const backBtnBlock = styleSheet.slice(backBtnIdx, styleSheet.indexOf('}', backBtnIdx) + 1);
      expect(backBtnBlock).toContain('fontSize: 16');
      expect(backBtnBlock).toContain("fontWeight: '600'");
    });
  });

  // ---------------------------------------------------------------
  // AC-2: Back button calls router.back() on press
  // ---------------------------------------------------------------
  describe('AC-2: Back button calls router.back() on press', () => {
    it('should import useRouter from expo-router', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("import { useRouter } from 'expo-router'");
    });

    it('should call useRouter() inside the component', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('const router = useRouter()');
    });

    it('should have router.back() as onPress handler in the back button Pressable', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const header = extractHeaderBlock(source);
      expect(header).toContain('onPress={() => router.back()}');
    });

    it('should call router.back() in the same Pressable that contains t(common.back)', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const header = extractHeaderBlock(source);
      // Find the back button Pressable
      const routerBackIdx = header.indexOf('router.back()');
      const commonBackIdx = header.indexOf("t('common.back')");
      // Both must exist
      expect(routerBackIdx).toBeGreaterThan(-1);
      expect(commonBackIdx).toBeGreaterThan(-1);
      // router.back() should appear before the t('common.back') text (onPress is on Pressable, text is child)
      expect(routerBackIdx).toBeLessThan(commonBackIdx);
    });
  });

  // ---------------------------------------------------------------
  // AC-3: Header follows 3-element layout [Back | Title | Invite]
  // ---------------------------------------------------------------
  describe('AC-3: Header follows 3-element layout matching other sub-screens', () => {
    it('should have exactly 3 direct child elements in the header: back button, title, invite button', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const header = extractHeaderBlock(source);

      // The header should contain: back Pressable, title Text, invite Pressable
      // Check back button (first Pressable with router.back)
      expect(header).toContain('onPress={() => router.back()}');
      // Check title
      expect(header).toContain("t('users.title')");
      // Check invite button
      expect(header).toContain('onPress={openInviteModal}');
    });

    it('should have back button BEFORE the title in DOM order', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const header = extractHeaderBlock(source);
      const backIdx = header.indexOf("t('common.back')");
      const titleIdx = header.indexOf("t('users.title')");
      expect(backIdx).toBeGreaterThan(-1);
      expect(titleIdx).toBeGreaterThan(-1);
      expect(backIdx).toBeLessThan(titleIdx);
    });

    it('should have title BEFORE the invite button in DOM order', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const header = extractHeaderBlock(source);
      const titleIdx = header.indexOf("t('users.title')");
      const inviteIdx = header.indexOf('openInviteModal');
      expect(titleIdx).toBeGreaterThan(-1);
      expect(inviteIdx).toBeGreaterThan(-1);
      expect(titleIdx).toBeLessThan(inviteIdx);
    });

    it('should use title style with fontSize 22 and fontWeight 700 (matching settings sub-screen pattern)', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const styleSheet = extractStyleSheet(source);
      const titleIdx = styleSheet.indexOf('title:');
      const titleBlock = styleSheet.slice(titleIdx, styleSheet.indexOf('}', titleIdx) + 1);
      expect(titleBlock).toContain('fontSize: 22');
      expect(titleBlock).toContain("fontWeight: '700'");
    });

    it('should NOT use fontSize 28 (the old outlier style) for the title', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const styleSheet = extractStyleSheet(source);
      const titleIdx = styleSheet.indexOf('title:');
      const titleBlock = styleSheet.slice(titleIdx, styleSheet.indexOf('}', titleIdx) + 1);
      expect(titleBlock).not.toContain('fontSize: 28');
    });

    it('should follow the same header pattern as members.tsx: [Back | Title | Action button]', () => {
      const usersSource = readSourceFile('app/(tabs)/settings/users.tsx');
      const membersSource = readSourceFile('app/(tabs)/settings/members.tsx');

      // Both should have back button with router.back()
      expect(usersSource).toContain('onPress={() => router.back()}');
      expect(membersSource).toContain('onPress={() => router.back()}');

      // Both should have t('common.back')
      expect(usersSource).toContain("t('common.back')");
      expect(membersSource).toContain("t('common.back')");

      // Both should have accessibilityRole="button" on the back button Pressable
      expect(usersSource).toContain('onPress={() => router.back()} accessibilityRole="button"');
      expect(membersSource).toContain('onPress={() => router.back()} accessibilityRole="button"');

      // Both should have styles.backButton
      expect(usersSource).toContain('styles.backButton');
      expect(membersSource).toContain('styles.backButton');
    });
  });

  // ---------------------------------------------------------------
  // AC-4: Invite button still functional (no regression)
  // ---------------------------------------------------------------
  describe('AC-4: Invite button remains functional (no regression)', () => {
    it('should still have invite button in the header with onPress={openInviteModal}', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const header = extractHeaderBlock(source);
      expect(header).toContain('onPress={openInviteModal}');
    });

    it('should still have invite button with t(users.inviteUser) text', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const header = extractHeaderBlock(source);
      expect(header).toContain("t('users.inviteUser')");
    });

    it('should still have inviteButton style applied to the invite Pressable', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const header = extractHeaderBlock(source);
      expect(header).toContain('styles.inviteButton');
    });

    it('should still have the invite button styled with colors.primary background', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const header = extractHeaderBlock(source);
      expect(header).toContain('backgroundColor: colors.primary');
    });

    it('should still have the invite modal component in the JSX', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('<Modal');
      expect(source).toContain('visible={inviteModalVisible}');
    });

    it('should still have openInviteModal function that sets state correctly', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('const openInviteModal = useCallback(');
      expect(source).toContain('setInviteModalVisible(true)');
    });

    it('should have accessibilityLabel on invite button for screen reader', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const header = extractHeaderBlock(source);
      expect(header).toContain("accessibilityLabel={t('users.inviteUser')}");
    });
  });

  // ---------------------------------------------------------------
  // AC-5: Back button has accessibilityRole='button'
  // ---------------------------------------------------------------
  describe('AC-5: Back button has accessibilityRole=button', () => {
    it('should have accessibilityRole="button" on the back button Pressable', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');

      // Verify the back button Pressable has accessibilityRole="button" in the same tag
      // The Pressable with router.back() should include accessibilityRole="button"
      expect(source).toContain('onPress={() => router.back()} accessibilityRole="button"');
    });

    it('should follow the same accessibility pattern as about.tsx back button', () => {
      const usersSource = readSourceFile('app/(tabs)/settings/users.tsx');
      const aboutSource = readSourceFile('app/(tabs)/settings/about.tsx');

      // Both back buttons should have accessibilityRole="button"
      expect(usersSource).toContain('onPress={() => router.back()} accessibilityRole="button"');
      expect(aboutSource).toContain('onPress={() => router.back()} accessibilityRole="button"');
    });
  });

  // ---------------------------------------------------------------
  // EC-1: router.back() called without issues (deep link scenario)
  // ---------------------------------------------------------------
  describe('EC-1: Deep link scenario - router.back() uses expo-router default', () => {
    it('should use router.back() (not router.push or router.replace) for back navigation', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const header = extractHeaderBlock(source);
      expect(header).toContain('router.back()');
      expect(header).not.toContain('router.push');
      expect(header).not.toContain('router.replace');
    });

    it('should match the same router.back() pattern used by all other settings sub-screens', () => {
      const usersSource = readSourceFile('app/(tabs)/settings/users.tsx');
      const aboutSource = readSourceFile('app/(tabs)/settings/about.tsx');
      const membersSource = readSourceFile('app/(tabs)/settings/members.tsx');

      // All use the same router.back() call pattern, no custom deep link handling
      expect(usersSource).toContain('onPress={() => router.back()}');
      expect(aboutSource).toContain('onPress={() => router.back()}');
      expect(membersSource).toContain('onPress={() => router.back()}');

      // None use router.push or router.replace for back navigation in the header
      const usersHeader = extractHeaderBlock(usersSource);
      expect(usersHeader).toContain('router.back()');
      expect(usersHeader).not.toContain('router.push');
      expect(usersHeader).not.toContain('router.replace');
    });
  });

  // ---------------------------------------------------------------
  // EC-2: Header layout supports small screens via flexDirection row
  // ---------------------------------------------------------------
  describe('EC-2: Header layout fits small screens with flexDirection row + space-between', () => {
    it('should have header style with flexDirection row', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const styleSheet = extractStyleSheet(source);
      const headerIdx = styleSheet.indexOf('header:');
      const headerBlock = styleSheet.slice(headerIdx, styleSheet.indexOf('}', headerIdx) + 1);
      expect(headerBlock).toContain("flexDirection: 'row'");
    });

    it('should have header style with justifyContent space-between', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const styleSheet = extractStyleSheet(source);
      const headerIdx = styleSheet.indexOf('header:');
      const headerBlock = styleSheet.slice(headerIdx, styleSheet.indexOf('}', headerIdx) + 1);
      expect(headerBlock).toContain("justifyContent: 'space-between'");
    });

    it('should have header style with alignItems center for vertical centering', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      const styleSheet = extractStyleSheet(source);
      const headerIdx = styleSheet.indexOf('header:');
      const headerBlock = styleSheet.slice(headerIdx, styleSheet.indexOf('}', headerIdx) + 1);
      expect(headerBlock).toContain("alignItems: 'center'");
    });

    it('should match the same header layout style as members.tsx (which also has 3 elements)', () => {
      const usersSource = readSourceFile('app/(tabs)/settings/users.tsx');
      const membersSource = readSourceFile('app/(tabs)/settings/members.tsx');

      const usersStyleSheet = extractStyleSheet(usersSource);
      const membersStyleSheet = extractStyleSheet(membersSource);

      // Extract header styles from both
      const usersHeaderIdx = usersStyleSheet.indexOf('header:');
      const usersHeaderBlock = usersStyleSheet.slice(usersHeaderIdx, usersStyleSheet.indexOf('}', usersHeaderIdx) + 1);

      const membersHeaderIdx = membersStyleSheet.indexOf('header:');
      const membersHeaderBlock = membersStyleSheet.slice(membersHeaderIdx, membersStyleSheet.indexOf('}', membersHeaderIdx) + 1);

      // Both should have the same layout properties
      expect(usersHeaderBlock).toContain("flexDirection: 'row'");
      expect(membersHeaderBlock).toContain("flexDirection: 'row'");
      expect(usersHeaderBlock).toContain("justifyContent: 'space-between'");
      expect(membersHeaderBlock).toContain("justifyContent: 'space-between'");
    });
  });

  // ---------------------------------------------------------------
  // No regressions: existing functionality intact
  // ---------------------------------------------------------------
  describe('No regressions in existing Users screen functionality', () => {
    it('should still have ScrollView wrapping the content', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('<ScrollView>');
      expect(source).toContain('</ScrollView>');
    });

    it('should still have user cards rendered from users.map()', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('users.map((u)');
    });

    it('should still have loading state with ActivityIndicator', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('{isLoading && (');
      expect(source).toContain('<ActivityIndicator');
    });

    it('should still have error state with retry button', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('{usersError && (');
      expect(source).toContain('onPress={() => refetch()}');
    });

    it('should still have empty state message', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain("t('users.noUsers')");
    });

    it('should still export userManagementKeys for query cache management', () => {
      const source = readSourceFile('app/(tabs)/settings/users.tsx');
      expect(source).toContain('export const userManagementKeys');
    });
  });
});

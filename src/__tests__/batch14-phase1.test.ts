/**
 * Tests for Batch 14, Phase 1: Password Reset, Offline Degradation, Offline Banner,
 *                                Alert Message, Button Visibility
 *
 * F088 (CR-145): Password reset email redirect URL + reset page
 * F089 (CR-146): Offline graceful degradation via TanStack Query onlineManager
 * F090 (CR-147): Offline banner readability on iPhone with safe area insets
 * F091 (CR-148): Update sunday type change confirmation message text
 * F092 (CR-149): Presentation mode button always visible
 *
 * Covers acceptance criteria:
 *   AC-088-01..05, AC-089-01..06, AC-090-01..04, AC-091-01..05, AC-092-01..05
 * Covers edge cases:
 *   EC-088-01..04, EC-089-01..03, EC-090-01..03, EC-091-01..03, EC-092-01..02
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
// F091 (CR-148): Update sunday type change confirmation message
// =============================================================================

describe('F091 (CR-148): Update sunday type change confirmation message', () => {

  // --- AC-091-01: changeConfirmTitle updated with question mark ---
  describe('AC-091-01: changeConfirmTitle updated with question mark', () => {
    it('pt-BR changeConfirmTitle ends with question mark', () => {
      const locale = readLocale('pt-BR') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmTitle).toBe('Alterar tipo de domingo?');
    });

    it('en changeConfirmTitle has capitalized Sunday and question mark', () => {
      const locale = readLocale('en') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmTitle).toBe('Change Sunday type?');
    });

    it('es changeConfirmTitle ends with question mark', () => {
      const locale = readLocale('es') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmTitle).toBe('Cambiar tipo de domingo?');
    });
  });

  // --- AC-091-02: changeConfirmMessage has new descriptive text ---
  describe('AC-091-02: changeConfirmMessage updated with detailed text', () => {
    it('pt-BR changeConfirmMessage mentions e/ou and designacoes serao apagadas', () => {
      const locale = readLocale('pt-BR') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmMessage).toContain('e/ou temas designados');
      expect(locale.sundayExceptions.changeConfirmMessage).toContain('designacoes serao apagadas');
    });

    it('en changeConfirmMessage mentions and/or and will be deleted', () => {
      const locale = readLocale('en') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmMessage).toContain('and/or topics assigned');
      expect(locale.sundayExceptions.changeConfirmMessage).toContain('will be deleted');
    });

    it('es changeConfirmMessage mentions y/o and seran eliminadas', () => {
      const locale = readLocale('es') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmMessage).toContain('y/o temas asignados');
      expect(locale.sundayExceptions.changeConfirmMessage).toContain('seran eliminadas');
    });
  });

  // --- AC-091-03: All 3 locale files updated ---
  describe('AC-091-03: All 3 locale files updated', () => {
    it('all 3 locales have changeConfirmTitle defined', () => {
      const ptBR = readLocale('pt-BR') as { sundayExceptions: Record<string, string> };
      const en = readLocale('en') as { sundayExceptions: Record<string, string> };
      const es = readLocale('es') as { sundayExceptions: Record<string, string> };
      expect(ptBR.sundayExceptions.changeConfirmTitle).toBeDefined();
      expect(en.sundayExceptions.changeConfirmTitle).toBeDefined();
      expect(es.sundayExceptions.changeConfirmTitle).toBeDefined();
    });

    it('all 3 locales have changeConfirmMessage defined', () => {
      const ptBR = readLocale('pt-BR') as { sundayExceptions: Record<string, string> };
      const en = readLocale('en') as { sundayExceptions: Record<string, string> };
      const es = readLocale('es') as { sundayExceptions: Record<string, string> };
      expect(ptBR.sundayExceptions.changeConfirmMessage).toBeDefined();
      expect(en.sundayExceptions.changeConfirmMessage).toBeDefined();
      expect(es.sundayExceptions.changeConfirmMessage).toBeDefined();
    });
  });

  // --- AC-091-04: SundayCard still uses same i18n keys ---
  describe('AC-091-04: SundayCard uses same i18n keys', () => {
    it('SundayCard.tsx uses sundayExceptions.changeConfirmTitle', () => {
      const content = readSourceFile('components/SundayCard.tsx');
      expect(content).toContain("sundayExceptions.changeConfirmTitle");
    });

    it('SundayCard.tsx uses sundayExceptions.changeConfirmMessage', () => {
      const content = readSourceFile('components/SundayCard.tsx');
      expect(content).toContain("sundayExceptions.changeConfirmMessage");
    });
  });

  // --- AC-091-05: Zero TypeScript code changes ---
  describe('AC-091-05: No TypeScript code changes needed', () => {
    it('i18n keys remain unchanged (same key names)', () => {
      const ptBR = readLocale('pt-BR') as { sundayExceptions: Record<string, string> };
      // Keys exist with the same name - only values changed
      expect('changeConfirmTitle' in ptBR.sundayExceptions).toBe(true);
      expect('changeConfirmMessage' in ptBR.sundayExceptions).toBe(true);
    });
  });

  // --- EC-091-01: Confirmation message mentions deletion warning ---
  describe('EC-091-01: Message includes deletion warning', () => {
    it('pt-BR message warns about deletion', () => {
      const locale = readLocale('pt-BR') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmMessage).toContain('apagadas');
    });

    it('en message warns about deletion', () => {
      const locale = readLocale('en') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmMessage).toContain('deleted');
    });

    it('es message warns about deletion', () => {
      const locale = readLocale('es') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmMessage).toContain('eliminadas');
    });
  });

  // --- EC-091-02: Message asks for confirmation ---
  describe('EC-091-02: Message ends with confirmation question', () => {
    it('pt-BR message ends with question', () => {
      const locale = readLocale('pt-BR') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmMessage).toContain('alterar o tipo?');
    });

    it('en message ends with question', () => {
      const locale = readLocale('en') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmMessage).toContain('change the type?');
    });

    it('es message ends with question', () => {
      const locale = readLocale('es') as { sundayExceptions: Record<string, string> };
      expect(locale.sundayExceptions.changeConfirmMessage).toContain('cambiar el tipo?');
    });
  });
});

// =============================================================================
// F092 (CR-149): Presentation mode button always visible
// =============================================================================

describe('F092 (CR-149): Presentation mode button always visible', () => {
  const getIndex = () => readSourceFile('app/(tabs)/index.tsx');

  // --- AC-092-01: Button rendered unconditionally ---
  describe('AC-092-01: Button rendered unconditionally', () => {
    it('index.tsx does NOT contain showMeetingButton', () => {
      const content = getIndex();
      expect(content).not.toContain('showMeetingButton');
    });

    it('index.tsx renders meetingButton without conditional', () => {
      const content = getIndex();
      expect(content).toContain('styles.meetingButton');
      expect(content).not.toContain('showMeetingButton &&');
    });
  });

  // --- AC-092-02: Button visible every day (no Sunday check) ---
  describe('AC-092-02: Button visible every day', () => {
    it('index.tsx does NOT import isTodaySunday', () => {
      const content = getIndex();
      expect(content).not.toContain('isTodaySunday');
    });
  });

  // --- AC-092-03: getTodaySundayDate still works correctly ---
  describe('AC-092-03: getTodaySundayDate unchanged', () => {
    it('usePresentationMode.ts still exports isTodaySunday', () => {
      const content = readSourceFile('hooks/usePresentationMode.ts');
      expect(content).toContain('export function isTodaySunday');
    });

    it('usePresentationMode.ts still exports getTodaySundayDate', () => {
      const content = readSourceFile('hooks/usePresentationMode.ts');
      expect(content).toContain('getTodaySundayDate');
    });
  });

  // --- AC-092-04: No role check on button ---
  describe('AC-092-04: No role gating on button', () => {
    it('index.tsx does not gate button on user role', () => {
      const content = getIndex();
      // The View with meetingButton is not wrapped in any role condition
      expect(content).not.toContain('canManage && (');
      expect(content).not.toContain("role === 'bishopric'");
    });
  });

  // --- AC-092-05: Button uses same styles and i18n keys ---
  describe('AC-092-05: Button styles and i18n unchanged', () => {
    it('index.tsx uses meetingButton style', () => {
      const content = getIndex();
      expect(content).toContain('styles.meetingButton');
    });

    it('index.tsx uses meetingButtonText style', () => {
      const content = getIndex();
      expect(content).toContain('styles.meetingButtonText');
    });

    it('index.tsx uses home.startMeeting i18n key', () => {
      const content = getIndex();
      expect(content).toContain("'home.startMeeting'");
    });

    it('index.tsx uses home.meetingAgendaTitle i18n key', () => {
      const content = getIndex();
      expect(content).toContain("'home.meetingAgendaTitle'");
    });
  });

  // --- EC-092-01: useMemo removed from React import ---
  describe('EC-092-01: useMemo removed from React import', () => {
    it('index.tsx does NOT import useMemo', () => {
      const content = getIndex();
      expect(content).not.toContain('useMemo');
    });
  });

  // --- EC-092-02: Presentation mode route unchanged ---
  describe('EC-092-02: Presentation mode route unchanged', () => {
    it('index.tsx still navigates to /presentation', () => {
      const content = getIndex();
      expect(content).toContain("'/presentation'");
    });
  });
});

// =============================================================================
// F090 (CR-147): Offline banner readability on iPhone
// =============================================================================

describe('F090 (CR-147): Offline banner readability on iPhone', () => {
  const getBanner = () => readSourceFile('components/OfflineBanner.tsx');

  // --- AC-090-01: Safe area insets applied ---
  describe('AC-090-01: Safe area insets applied', () => {
    it('imports useSafeAreaInsets from react-native-safe-area-context', () => {
      const content = getBanner();
      expect(content).toContain("useSafeAreaInsets");
      expect(content).toContain("react-native-safe-area-context");
    });

    it('calls useSafeAreaInsets() inside component', () => {
      const content = getBanner();
      expect(content).toContain('useSafeAreaInsets()');
    });

    it('applies paddingTop using insets.top', () => {
      const content = getBanner();
      expect(content).toContain('insets.top + 8');
    });
  });

  // --- AC-090-02: Font sizes increased ---
  describe('AC-090-02: Font sizes increased', () => {
    it('text fontSize is 15 (was 14)', () => {
      const content = getBanner();
      // Find the text style section
      const textStyleIdx = content.indexOf("text: {");
      const textStyleEnd = content.indexOf('}', textStyleIdx);
      const textStyle = content.substring(textStyleIdx, textStyleEnd);
      expect(textStyle).toContain('fontSize: 15');
    });

    it('subtext fontSize is 13 (was 12)', () => {
      const content = getBanner();
      const subtextIdx = content.indexOf("subtext: {");
      const subtextEnd = content.indexOf('}', subtextIdx);
      const subtextStyle = content.substring(subtextIdx, subtextEnd);
      expect(subtextStyle).toContain('fontSize: 13');
    });
  });

  // --- AC-090-03: Banner colors unchanged ---
  describe('AC-090-03: Banner colors unchanged', () => {
    it('background color is #E53E3E', () => {
      const content = getBanner();
      expect(content).toContain("'#E53E3E'");
    });

    it('text color is #FFFFFF', () => {
      const content = getBanner();
      expect(content).toContain("'#FFFFFF'");
    });

    it('subtext color is #FED7D7', () => {
      const content = getBanner();
      expect(content).toContain("'#FED7D7'");
    });
  });

  // --- AC-090-04: Content pushed down, not absolute ---
  describe('AC-090-04: Banner uses View (not absolute positioning)', () => {
    it('banner does not use position absolute', () => {
      const content = getBanner();
      expect(content).not.toContain("position: 'absolute'");
    });

    it('banner has paddingBottom 8', () => {
      const content = getBanner();
      const bannerIdx = content.indexOf("banner: {");
      const bannerEnd = content.indexOf('},', bannerIdx);
      const bannerStyle = content.substring(bannerIdx, bannerEnd);
      expect(bannerStyle).toContain('paddingBottom: 8');
    });
  });

  // --- EC-090-01: No paddingVertical (split into paddingTop + paddingBottom) ---
  describe('EC-090-01: paddingVertical replaced with separate top/bottom', () => {
    it('banner style does not have paddingVertical', () => {
      const content = getBanner();
      const bannerIdx = content.indexOf("banner: {");
      const bannerEnd = content.indexOf('},', bannerIdx);
      const bannerStyle = content.substring(bannerIdx, bannerEnd);
      expect(bannerStyle).not.toContain('paddingVertical');
    });
  });

  // --- EC-090-02: paddingHorizontal preserved ---
  describe('EC-090-02: paddingHorizontal preserved', () => {
    it('banner has paddingHorizontal 16', () => {
      const content = getBanner();
      expect(content).toContain('paddingHorizontal: 16');
    });
  });
});

// =============================================================================
// F088 (CR-145): Password reset email redirect URL + reset page
// =============================================================================

describe('F088 (CR-145): Password reset email redirect URL', () => {
  const getForgotPassword = () => readSourceFile('app/(auth)/forgot-password.tsx');

  // --- AC-088-02: redirectTo with Linking.createURL ---
  describe('AC-088-02: redirectTo with Linking.createURL', () => {
    it('forgot-password.tsx imports expo-linking', () => {
      const content = getForgotPassword();
      expect(content).toContain("from 'expo-linking'");
    });

    it('forgot-password.tsx uses Linking.createURL', () => {
      const content = getForgotPassword();
      expect(content).toContain("Linking.createURL");
    });

    it('creates URL with /(auth)/reset-password path', () => {
      const content = getForgotPassword();
      expect(content).toContain("'/(auth)/reset-password'");
    });

    it('passes redirectTo option to resetPasswordForEmail', () => {
      const content = getForgotPassword();
      expect(content).toContain('redirectTo: redirectUrl');
    });
  });

  // --- AC-088-03: reset-password page exists ---
  describe('AC-088-03: reset-password.tsx exists', () => {
    it('reset-password.tsx file exists', () => {
      const filePath = path.resolve(__dirname, '..', 'app', '(auth)', 'reset-password.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('reset-password.tsx exports default component', () => {
      const content = readSourceFile('app/(auth)/reset-password.tsx');
      expect(content).toContain('export default function');
    });

    it('reset-password.tsx has password input field', () => {
      const content = readSourceFile('app/(auth)/reset-password.tsx');
      expect(content).toContain('secureTextEntry');
      expect(content).toContain('newPassword');
    });

    it('reset-password.tsx has confirm password field', () => {
      const content = readSourceFile('app/(auth)/reset-password.tsx');
      expect(content).toContain('confirmPassword');
    });

    it('reset-password.tsx calls updateUser with password', () => {
      const content = readSourceFile('app/(auth)/reset-password.tsx');
      expect(content).toContain('supabase.auth.updateUser');
      expect(content).toContain('password');
    });
  });

  // --- AC-088-04: Success and error handling ---
  describe('AC-088-04: Success and error handling', () => {
    it('reset-password.tsx shows success message', () => {
      const content = readSourceFile('app/(auth)/reset-password.tsx');
      expect(content).toContain('auth.passwordUpdated');
    });

    it('reset-password.tsx shows back to login link', () => {
      const content = readSourceFile('app/(auth)/reset-password.tsx');
      expect(content).toContain('auth.backToLogin');
    });

    it('reset-password.tsx handles expired token', () => {
      const content = readSourceFile('app/(auth)/reset-password.tsx');
      expect(content).toContain('auth.resetExpired');
    });
  });

  // --- AC-088-05: All 7 new auth i18n keys exist ---
  describe('AC-088-05: All 7 new auth i18n keys in 3 locales', () => {
    const authKeys = [
      'resetPasswordTitle',
      'newPassword',
      'confirmPassword',
      'passwordMismatch',
      'passwordUpdated',
      'resetExpired',
      'updatePassword',
    ];

    it('pt-BR has all 7 new auth keys', () => {
      const locale = readLocale('pt-BR') as { auth: Record<string, string> };
      for (const key of authKeys) {
        expect(locale.auth[key]).toBeDefined();
      }
    });

    it('en has all 7 new auth keys', () => {
      const locale = readLocale('en') as { auth: Record<string, string> };
      for (const key of authKeys) {
        expect(locale.auth[key]).toBeDefined();
      }
    });

    it('es has all 7 new auth keys', () => {
      const locale = readLocale('es') as { auth: Record<string, string> };
      for (const key of authKeys) {
        expect(locale.auth[key]).toBeDefined();
      }
    });
  });

  // --- EC-088-01: Linking import style ---
  describe('EC-088-01: Linking imported correctly', () => {
    it('uses * as Linking namespace import', () => {
      const content = getForgotPassword();
      expect(content).toContain("import * as Linking from 'expo-linking'");
    });
  });

  // --- EC-088-02: Password validation in reset page ---
  describe('EC-088-02: Password validation', () => {
    it('reset-password.tsx checks password length', () => {
      const content = readSourceFile('app/(auth)/reset-password.tsx');
      expect(content).toContain('auth.passwordMinLength');
    });

    it('reset-password.tsx checks password mismatch', () => {
      const content = readSourceFile('app/(auth)/reset-password.tsx');
      expect(content).toContain('password !== confirmPassword');
    });
  });

  // --- EC-088-03: Deep link session handling ---
  describe('EC-088-03: Deep link session handling', () => {
    it('reset-password.tsx listens for PASSWORD_RECOVERY event', () => {
      const content = readSourceFile('app/(auth)/reset-password.tsx');
      expect(content).toContain('PASSWORD_RECOVERY');
    });

    it('reset-password.tsx uses onAuthStateChange', () => {
      const content = readSourceFile('app/(auth)/reset-password.tsx');
      expect(content).toContain('onAuthStateChange');
    });
  });

  // --- EC-088-04: i18n values are correct ---
  describe('EC-088-04: i18n values correct for each locale', () => {
    it('pt-BR resetPasswordTitle is correct', () => {
      const locale = readLocale('pt-BR') as { auth: Record<string, string> };
      expect(locale.auth.resetPasswordTitle).toBe('Redefinir senha');
    });

    it('en resetPasswordTitle is correct', () => {
      const locale = readLocale('en') as { auth: Record<string, string> };
      expect(locale.auth.resetPasswordTitle).toBe('Reset Password');
    });

    it('es resetPasswordTitle is correct', () => {
      const locale = readLocale('es') as { auth: Record<string, string> };
      expect(locale.auth.resetPasswordTitle).toBe('Restablecer contrasena');
    });

    it('pt-BR updatePassword is correct', () => {
      const locale = readLocale('pt-BR') as { auth: Record<string, string> };
      expect(locale.auth.updatePassword).toBe('Atualizar senha');
    });

    it('en updatePassword is correct', () => {
      const locale = readLocale('en') as { auth: Record<string, string> };
      expect(locale.auth.updatePassword).toBe('Update password');
    });

    it('es updatePassword is correct', () => {
      const locale = readLocale('es') as { auth: Record<string, string> };
      expect(locale.auth.updatePassword).toBe('Actualizar contrasena');
    });
  });
});

// =============================================================================
// F089 (CR-146): Offline graceful degradation via TanStack Query onlineManager
// =============================================================================

describe('F089 (CR-146): Offline graceful degradation', () => {
  const getUseConnection = () => readSourceFile('hooks/useConnection.ts');
  const getLayout = () => readSourceFile('app/_layout.tsx');

  // --- AC-089-01: networkMode offlineFirst configured ---
  describe('AC-089-01: networkMode offlineFirst configured', () => {
    it('_layout.tsx has networkMode offlineFirst in queries', () => {
      const content = getLayout();
      expect(content).toContain("networkMode: 'offlineFirst'");
    });
  });

  // --- AC-089-02: MutationCache.onError silences offline errors ---
  describe('AC-089-02: MutationCache.onError silences offline errors', () => {
    it('_layout.tsx checks onlineManager.isOnline() in MutationCache.onError', () => {
      const content = getLayout();
      expect(content).toContain('onlineManager.isOnline()');
    });

    it('_layout.tsx checks for network error messages', () => {
      const content = getLayout();
      expect(content).toContain("'network'");
      expect(content).toContain("'Failed to fetch'");
    });

    it('_layout.tsx returns early when offline or network error', () => {
      const content = getLayout();
      expect(content).toContain('isOffline || isNetworkError');
    });
  });

  // --- AC-089-03: common.offlineNoData i18n key ---
  describe('AC-089-03: common.offlineNoData i18n key', () => {
    it('pt-BR has common.offlineNoData', () => {
      const locale = readLocale('pt-BR') as { common: Record<string, string> };
      expect(locale.common.offlineNoData).toBe('Dados indisponiveis no modo offline');
    });

    it('en has common.offlineNoData', () => {
      const locale = readLocale('en') as { common: Record<string, string> };
      expect(locale.common.offlineNoData).toBe('Data unavailable in offline mode');
    });

    it('es has common.offlineNoData', () => {
      const locale = readLocale('es') as { common: Record<string, string> };
      expect(locale.common.offlineNoData).toBe('Datos no disponibles en modo sin conexion');
    });
  });

  // --- AC-089-04: Cached data shown when offline ---
  describe('AC-089-04: offlineFirst provides cached data when offline', () => {
    it('networkMode offlineFirst is set globally', () => {
      const content = getLayout();
      // Verify it's in defaultOptions.queries
      const queriesIdx = content.indexOf('queries: {');
      const queriesEnd = content.indexOf('},', queriesIdx);
      const queriesSection = content.substring(queriesIdx, queriesEnd);
      expect(queriesSection).toContain("networkMode: 'offlineFirst'");
    });
  });

  // --- AC-089-05: No retry when offline ---
  describe('AC-089-05: No retry when offline', () => {
    it('retry function checks onlineManager.isOnline()', () => {
      const content = getLayout();
      // Verify retry function checks online status
      expect(content).toContain('!onlineManager.isOnline()');
    });

    it('retry returns false when offline', () => {
      const content = getLayout();
      // Find retry function
      const retryIdx = content.indexOf('retry:');
      const retryEnd = content.indexOf('},', retryIdx);
      const retrySection = content.substring(retryIdx, retryEnd);
      expect(retrySection).toContain('!onlineManager.isOnline()');
      expect(retrySection).toContain('return false');
    });
  });

  // --- AC-089-06: onlineManager synced with useConnection ---
  describe('AC-089-06: onlineManager synced with useConnection', () => {
    it('useConnection.ts imports onlineManager', () => {
      const content = getUseConnection();
      expect(content).toContain("onlineManager");
      expect(content).toContain("@tanstack/react-query");
    });

    it('useConnection.ts calls onlineManager.setOnline', () => {
      const content = getUseConnection();
      expect(content).toContain('onlineManager.setOnline(online)');
    });

    it('onlineManager.setOnline is called after setIsOnline', () => {
      const content = getUseConnection();
      const setIsOnlineIdx = content.indexOf('setIsOnline(online)');
      const setOnlineIdx = content.indexOf('onlineManager.setOnline(online)');
      // setOnline should come after setIsOnline
      expect(setOnlineIdx).toBeGreaterThan(setIsOnlineIdx);
    });
  });

  // --- EC-089-01: onlineManager import from @tanstack/react-query ---
  describe('EC-089-01: Correct import source', () => {
    it('_layout.tsx imports onlineManager from @tanstack/react-query', () => {
      const content = getLayout();
      expect(content).toContain('onlineManager');
      expect(content).toContain("from '@tanstack/react-query'");
    });

    it('useConnection.ts imports onlineManager from @tanstack/react-query', () => {
      const content = getUseConnection();
      expect(content).toContain("import { onlineManager } from '@tanstack/react-query'");
    });
  });

  // --- EC-089-02: No new useEffect in useConnection ---
  describe('EC-089-02: No new useEffect in useConnection', () => {
    it('useConnection.ts has only one useEffect', () => {
      const content = getUseConnection();
      const matches = content.match(/useEffect\(/g);
      expect(matches).toHaveLength(1);
    });
  });

  // --- EC-089-03: Alert.alert still called for non-network errors ---
  describe('EC-089-03: Alert.alert still shows for non-network errors', () => {
    it('_layout.tsx still has Alert.alert call', () => {
      const content = getLayout();
      expect(content).toContain('Alert.alert');
    });

    it('_layout.tsx still references errors.mutationFailed', () => {
      const content = getLayout();
      expect(content).toContain("'errors.mutationFailed'");
    });
  });
});

// =============================================================================
// Cross-feature: i18n key consistency (Batch 14 Phase 1)
// =============================================================================

describe('Cross-feature: i18n key consistency (Batch 14 Phase 1)', () => {
  it('all 3 locales have common.offlineNoData', () => {
    const ptBR = readLocale('pt-BR') as { common: Record<string, string> };
    const en = readLocale('en') as { common: Record<string, string> };
    const es = readLocale('es') as { common: Record<string, string> };
    expect(ptBR.common.offlineNoData).toBeDefined();
    expect(en.common.offlineNoData).toBeDefined();
    expect(es.common.offlineNoData).toBeDefined();
  });

  it('all 3 locales have auth.resetPasswordTitle', () => {
    const ptBR = readLocale('pt-BR') as { auth: Record<string, string> };
    const en = readLocale('en') as { auth: Record<string, string> };
    const es = readLocale('es') as { auth: Record<string, string> };
    expect(ptBR.auth.resetPasswordTitle).toBeDefined();
    expect(en.auth.resetPasswordTitle).toBeDefined();
    expect(es.auth.resetPasswordTitle).toBeDefined();
  });

  it('all 3 locales have updated sundayExceptions.changeConfirmTitle with ?', () => {
    const ptBR = readLocale('pt-BR') as { sundayExceptions: Record<string, string> };
    const en = readLocale('en') as { sundayExceptions: Record<string, string> };
    const es = readLocale('es') as { sundayExceptions: Record<string, string> };
    expect(ptBR.sundayExceptions.changeConfirmTitle).toContain('?');
    expect(en.sundayExceptions.changeConfirmTitle).toContain('?');
    expect(es.sundayExceptions.changeConfirmTitle).toContain('?');
  });
});

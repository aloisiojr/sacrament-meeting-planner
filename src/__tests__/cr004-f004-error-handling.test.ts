/**
 * QA Tests for CR-004 / F004: Error Handling Overhaul
 *
 * Covers:
 * CR-57: Global mutationCache.onError for all mutations
 * CR-58: QueryErrorView in speeches/agenda tabs
 * CR-59: ErrorBoundary i18n + whatsapp.ts i18n
 * CR-60: ThemedErrorBoundary per-tab wrapping
 * CR-61: QueryClient config with caches, smart retry
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

function readLocale(locale: string): Record<string, unknown> {
  const filePath = path.resolve(__dirname, '..', 'i18n', 'locales', `${locale}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

describe('CR-004 F004: Error Handling Overhaul', () => {
  // ---------------------------------------------------------------
  // CR-57 + CR-61: QueryClient config
  // ---------------------------------------------------------------
  describe('CR-57/CR-61: QueryClient config', () => {
    it('should import QueryCache and MutationCache', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain('QueryCache');
      expect(source).toContain('MutationCache');
    });

    it('should import QueryCache and MutationCache from tanstack', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toMatch(/import\s*\{[^}]*QueryCache[^}]*\}\s*from\s*'@tanstack\/react-query'/);
      expect(source).toMatch(/import\s*\{[^}]*MutationCache[^}]*\}\s*from\s*'@tanstack\/react-query'/);
    });

    it('should import QueryClient and QueryClientProvider', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toMatch(/import\s*\{[^}]*QueryClient[^}]*\}\s*from\s*'@tanstack\/react-query'/);
      expect(source).toMatch(/import\s*\{[^}]*QueryClientProvider[^}]*\}\s*from\s*'@tanstack\/react-query'/);
    });

    it('should have queryCache with onError', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain('queryCache: new QueryCache({');
      expect(source).toContain('[QueryCache] Error:');
    });

    it('queryCache onError should log error message', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain('console.error');
      expect(source).toContain('error.message');
    });

    it('should have mutationCache with onError using i18n', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain('mutationCache: new MutationCache({');
      expect(source).toContain("i18n.t('errors.mutationFailed'");
    });

    it('mutationCache onError should show Alert', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain('Alert.alert');
      expect(source).toContain("i18n.t('common.error')");
    });

    it('mutationCache onError should only log error.message in __DEV__', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain('__DEV__');
      expect(source).toContain("console.error('[MutationCache] Error:', error.message)");
    });

    it('mutationCache should respect suppressGlobalError meta', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain('suppressGlobalError');
    });

    it('suppressGlobalError should cause early return', () => {
      const source = readSourceFile('app/_layout.tsx');
      const idx = source.indexOf('suppressGlobalError');
      expect(idx).toBeGreaterThan(-1);
      const nearby = source.slice(Math.max(0, idx - 50), idx + 80);
      expect(nearby).toContain('return');
    });

    it('mutationCache onError should receive mutation parameter', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain('_variables');
      expect(source).toContain('_context');
      expect(source).toContain('mutation');
    });

    it('should have smart retry that skips 4xx errors', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain('error?.status >= 400');
      expect(source).toContain('error?.status < 500');
      expect(source).toContain('return false');
    });

    it('smart retry should allow retry for non-4xx up to 2 times', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain('failureCount < 2');
    });

    it('retry function should accept failureCount and error params', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toMatch(/retry:\s*\(failureCount:\s*number,\s*error:\s*any\)/);
    });

    it('mutations should have retry: 0', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain('mutations: {');
      expect(source).toContain('retry: 0');
    });

    it('should have staleTime configured', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain('staleTime');
      expect(source).toContain('1000 * 60 * 5');
    });

    it('should have defaultOptions with queries and mutations sections', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain('defaultOptions: {');
      expect(source).toContain('queries: {');
      expect(source).toContain('mutations: {');
    });

    it('should instantiate QueryClient with new keyword', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toMatch(/const queryClient = new QueryClient\(\{/);
    });

    it('should import i18n for mutationCache messages', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain("import i18n from '../i18n'");
    });

    it('should import Alert for mutation error display', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toMatch(/import\s*\{[^}]*Alert[^}]*\}\s*from\s*'react-native'/);
    });
  });

  // ---------------------------------------------------------------
  // CR-57: Root layout provider hierarchy
  // ---------------------------------------------------------------
  describe('CR-57: Root layout provider hierarchy', () => {
    it('RootLayout should wrap with ErrorBoundary at the top', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain('<ErrorBoundary>');
      expect(source).toContain('</ErrorBoundary>');
    });

    it('ErrorBoundary should wrap QueryClientProvider', () => {
      const source = readSourceFile('app/_layout.tsx');
      const ebIdx = source.indexOf('<ErrorBoundary>');
      const qcpIdx = source.indexOf('<QueryClientProvider');
      expect(ebIdx).toBeLessThan(qcpIdx);
    });

    it('QueryClientProvider should wrap I18nextProvider', () => {
      const source = readSourceFile('app/_layout.tsx');
      const qcpIdx = source.indexOf('<QueryClientProvider');
      const i18nIdx = source.indexOf('<I18nextProvider');
      expect(qcpIdx).toBeLessThan(i18nIdx);
    });

    it('I18nextProvider should wrap ThemeProvider', () => {
      const source = readSourceFile('app/_layout.tsx');
      const i18nIdx = source.indexOf('<I18nextProvider');
      const themeIdx = source.indexOf('<ThemeProvider>');
      expect(i18nIdx).toBeLessThan(themeIdx);
    });

    it('should pass queryClient to QueryClientProvider', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain('client={queryClient}');
    });

    it('should pass i18n to I18nextProvider', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain('i18n={i18n}');
    });

    it('should export RootLayout as default', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain('export default function RootLayout');
    });

    it('should import ErrorBoundary from components', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain("import { ErrorBoundary } from '../components/ErrorBoundary'");
    });
  });

  // ---------------------------------------------------------------
  // CR-58: QueryErrorView
  // ---------------------------------------------------------------
  describe('CR-58: QueryErrorView component', () => {
    it('QueryErrorView.tsx should exist', () => {
      const filePath = path.resolve(__dirname, '..', 'components', 'QueryErrorView.tsx');
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should use i18n for title and message', () => {
      const source = readSourceFile('components/QueryErrorView.tsx');
      expect(source).toContain("t('errors.queryFailed')");
      expect(source).toContain("t('errors.queryFailedMessage')");
    });

    it('should have retry button with common.retry', () => {
      const source = readSourceFile('components/QueryErrorView.tsx');
      expect(source).toContain("t('common.retry')");
      expect(source).toContain('onRetry');
    });

    it('should show error detail in __DEV__', () => {
      const source = readSourceFile('components/QueryErrorView.tsx');
      expect(source).toContain('__DEV__');
      expect(source).toContain('error.message');
    });

    it('should export QueryErrorView as named export', () => {
      const source = readSourceFile('components/QueryErrorView.tsx');
      expect(source).toContain('export function QueryErrorView');
    });

    it('should accept error, onRetry, and optional message props', () => {
      const source = readSourceFile('components/QueryErrorView.tsx');
      expect(source).toContain('error: Error | null');
      expect(source).toContain('onRetry: () => void');
      expect(source).toContain('message?: string');
    });

    it('should use useTranslation hook', () => {
      const source = readSourceFile('components/QueryErrorView.tsx');
      expect(source).toContain('useTranslation');
      expect(source).toContain("const { t } = useTranslation()");
    });

    it('should use useTheme for colors', () => {
      const source = readSourceFile('components/QueryErrorView.tsx');
      expect(source).toContain('useTheme');
      expect(source).toContain("const { colors } = useTheme()");
    });

    it('should display warning icon', () => {
      const source = readSourceFile('components/QueryErrorView.tsx');
      // Unicode warning sign U+26A0
      expect(source).toContain('\\u26A0');
    });

    it('should use theme colors for text and background', () => {
      const source = readSourceFile('components/QueryErrorView.tsx');
      expect(source).toContain('colors.background');
      expect(source).toContain('colors.text');
      expect(source).toContain('colors.textSecondary');
    });

    it('should use theme colors for retry button', () => {
      const source = readSourceFile('components/QueryErrorView.tsx');
      expect(source).toContain('colors.primary');
      expect(source).toContain('colors.onPrimary');
    });

    it('retry button should have accessibilityRole', () => {
      const source = readSourceFile('components/QueryErrorView.tsx');
      expect(source).toContain('accessibilityRole="button"');
    });

    it('should use Pressable for retry button', () => {
      const source = readSourceFile('components/QueryErrorView.tsx');
      expect(source).toContain('Pressable');
      expect(source).toContain('onPress={onRetry}');
    });

    it('should fall back to custom message via message prop', () => {
      const source = readSourceFile('components/QueryErrorView.tsx');
      expect(source).toContain("message ?? t('errors.queryFailedMessage')");
    });

    it('error detail should use surfaceVariant background and monospace', () => {
      const source = readSourceFile('components/QueryErrorView.tsx');
      expect(source).toContain('colors.surfaceVariant');
      expect(source).toContain("fontFamily: 'monospace'");
    });

    it('should have StyleSheet.create with proper styles', () => {
      const source = readSourceFile('components/QueryErrorView.tsx');
      expect(source).toContain('StyleSheet.create');
      expect(source).toContain('container');
      expect(source).toContain('title');
      expect(source).toContain('retryButton');
      expect(source).toContain('retryText');
    });

    it('container should center content', () => {
      const source = readSourceFile('components/QueryErrorView.tsx');
      expect(source).toContain("justifyContent: 'center'");
      expect(source).toContain("alignItems: 'center'");
    });
  });

  describe('CR-58: QueryErrorView wired into tabs', () => {
    it('speeches.tsx should use QueryErrorView on error', () => {
      const source = readSourceFile('app/(tabs)/speeches.tsx');
      expect(source).toContain('QueryErrorView');
      expect(source).toContain('speechesError || exceptionsError');
    });

    it('speeches.tsx should destructure error/refetch from queries', () => {
      const source = readSourceFile('app/(tabs)/speeches.tsx');
      expect(source).toContain('isError: speechesError');
      expect(source).toContain('refetch: refetchSpeeches');
    });

    it('speeches.tsx should destructure error object for QueryErrorView', () => {
      const source = readSourceFile('app/(tabs)/speeches.tsx');
      expect(source).toContain('error: speechesErr');
      expect(source).toContain('error: exceptionsErr');
    });

    it('speeches.tsx should pass combined error to QueryErrorView', () => {
      const source = readSourceFile('app/(tabs)/speeches.tsx');
      expect(source).toContain('speechesErr ?? exceptionsErr ?? null');
    });

    it('speeches.tsx should pass combined refetch to onRetry', () => {
      const source = readSourceFile('app/(tabs)/speeches.tsx');
      expect(source).toContain('refetchSpeeches()');
      expect(source).toContain('refetchExceptions()');
    });

    it('speeches.tsx auto-assign should suppress global error', () => {
      const source = readSourceFile('app/(tabs)/speeches.tsx');
      expect(source).toContain('suppressGlobalError: true');
    });

    it('speeches.tsx should import QueryErrorView from components', () => {
      const source = readSourceFile('app/(tabs)/speeches.tsx');
      expect(source).toContain("import { QueryErrorView } from '../../components/QueryErrorView'");
    });

    it('agenda.tsx should use QueryErrorView on error', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      expect(source).toContain('QueryErrorView');
      expect(source).toContain('exceptionsError');
    });

    it('agenda.tsx should destructure isError, error, and refetch', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      expect(source).toContain('isError: exceptionsError');
      expect(source).toContain('error: exceptionsErr');
      expect(source).toContain('refetch: refetchExceptions');
    });

    it('agenda.tsx should pass error and onRetry to QueryErrorView', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      expect(source).toContain('error={exceptionsErr ?? null}');
      expect(source).toContain('onRetry={refetchExceptions}');
    });

    it('agenda.tsx should import QueryErrorView from components', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      expect(source).toContain("import { QueryErrorView } from '../../components/QueryErrorView'");
    });

    it('QueryErrorView should render inside SafeAreaView when error', () => {
      const speechesSource = readSourceFile('app/(tabs)/speeches.tsx');
      const agendaSource = readSourceFile('app/(tabs)/agenda.tsx');
      expect(speechesSource).toContain('SafeAreaView');
      expect(agendaSource).toContain('SafeAreaView');
    });
  });

  // ---------------------------------------------------------------
  // CR-59: ErrorBoundary i18n
  // ---------------------------------------------------------------
  describe('CR-59: ErrorBoundary i18n', () => {
    it('should import i18n', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain("import i18n from '../i18n'");
    });

    it('should use i18n.t for boundary title', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain("i18n.t('errors.boundaryTitle')");
    });

    it('should use i18n.t for boundary message', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain("i18n.t('errors.boundaryMessage')");
    });

    it('should use i18n.t for retry button', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain("i18n.t('common.retry')");
    });

    it('should NOT have hardcoded English strings', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).not.toContain("'Something went wrong'");
      expect(source).not.toContain("'Try Again'");
    });

    it('should support fallbackTitle and fallbackMessage props', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain('fallbackTitle?: string');
      expect(source).toContain('fallbackMessage?: string');
    });

    it('should use fallbackTitle when provided, otherwise i18n', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain("this.props.fallbackTitle ?? i18n.t('errors.boundaryTitle')");
    });

    it('should use fallbackMessage when provided, otherwise i18n', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain("this.props.fallbackMessage ?? i18n.t('errors.boundaryMessage')");
    });

    it('should be a class component extending Component', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain('export class ErrorBoundary extends Component');
    });

    it('should implement getDerivedStateFromError', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain('static getDerivedStateFromError');
    });

    it('should implement componentDidCatch with console.error', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain('componentDidCatch');
      expect(source).toContain("console.error('ErrorBoundary caught:'");
    });

    it('should have handleReset that clears error state', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain('handleReset');
      expect(source).toContain('hasError: false, error: null');
    });

    it('should show error detail in __DEV__ mode', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain('__DEV__');
      expect(source).toContain('this.state.error.message');
    });

    it('should render children when no error', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain('return this.props.children');
    });

    it('should use Pressable for retry button', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain('Pressable');
      expect(source).toContain('onPress={this.handleReset}');
    });

    it('should use theme colors with fallback defaults', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain("c?.background ?? '#FFFFFF'");
      expect(source).toContain("c?.text ?? '#333'");
      expect(source).toContain("c?.textSecondary ?? '#666'");
      expect(source).toContain("c?.primary ?? '#007AFF'");
      expect(source).toContain("c?.onPrimary ?? '#FFFFFF'");
    });

    it('error detail should have monospace font', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain("fontFamily: 'monospace'");
    });

    it('error detail should use surfaceVariant background with fallback', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain("c?.surfaceVariant ?? '#f5f5f5'");
    });

    it('should have ErrorBoundaryState interface with hasError and error', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain('hasError: boolean');
      expect(source).toContain('error: Error | null');
    });

    it('initial state should have hasError false and error null', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain('this.state = { hasError: false, error: null }');
    });
  });

  describe('CR-59: whatsapp.ts i18n', () => {
    it('should import i18n', () => {
      const source = readSourceFile('lib/whatsapp.ts');
      expect(source).toContain("import i18n from '../i18n'");
    });

    it('should use i18n for not installed message', () => {
      const source = readSourceFile('lib/whatsapp.ts');
      expect(source).toContain("i18n.t('errors.whatsappNotInstalled')");
    });

    it('should use i18n for failed message', () => {
      const source = readSourceFile('lib/whatsapp.ts');
      expect(source).toContain("i18n.t('errors.whatsappFailed')");
    });

    it('should NOT have hardcoded English error strings', () => {
      const source = readSourceFile('lib/whatsapp.ts');
      expect(source).not.toContain("'WhatsApp is not installed on this device.'");
      expect(source).not.toContain("'Failed to open WhatsApp.'");
    });

    it('should use Linking.canOpenURL before opening', () => {
      const source = readSourceFile('lib/whatsapp.ts');
      expect(source).toContain('Linking.canOpenURL');
      expect(source).toContain('Linking.openURL');
    });

    it('should use Alert.alert for error display', () => {
      const source = readSourceFile('lib/whatsapp.ts');
      expect(source).toContain('Alert.alert');
    });

    it('should show WhatsApp title in alerts', () => {
      const source = readSourceFile('lib/whatsapp.ts');
      const alertMatches = source.match(/Alert\.alert\('WhatsApp'/g);
      expect(alertMatches).not.toBeNull();
      expect(alertMatches!.length).toBe(2);
    });

    it('should export openWhatsApp as async function', () => {
      const source = readSourceFile('lib/whatsapp.ts');
      expect(source).toContain('export async function openWhatsApp');
    });

    it('openWhatsApp should accept url parameter', () => {
      const source = readSourceFile('lib/whatsapp.ts');
      expect(source).toContain('openWhatsApp(url: string)');
    });

    it('should return Promise<void>', () => {
      const source = readSourceFile('lib/whatsapp.ts');
      expect(source).toContain('Promise<void>');
    });

    it('should re-export utilities from whatsappUtils', () => {
      const source = readSourceFile('lib/whatsapp.ts');
      expect(source).toContain('resolveTemplate');
      expect(source).toContain('buildWhatsAppUrl');
      expect(source).toContain('DEFAULT_TEMPLATE_PT_BR');
      expect(source).toContain('WhatsAppVariables');
    });

    it('should import Linking and Alert from react-native', () => {
      const source = readSourceFile('lib/whatsapp.ts');
      expect(source).toMatch(/import\s*\{[^}]*Linking[^}]*\}\s*from\s*'react-native'/);
      expect(source).toMatch(/import\s*\{[^}]*Alert[^}]*\}\s*from\s*'react-native'/);
    });

    it('should handle catch block for unexpected errors', () => {
      const source = readSourceFile('lib/whatsapp.ts');
      expect(source).toContain('} catch {');
    });
  });

  // ---------------------------------------------------------------
  // CR-60: ThemedErrorBoundary per-tab
  // ---------------------------------------------------------------
  describe('CR-60: ThemedErrorBoundary', () => {
    it('should export ThemedErrorBoundary from ErrorBoundary.tsx', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain('export function ThemedErrorBoundary');
    });

    it('ThemedErrorBoundary should use useTheme colors', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain('useTheme');
      expect(source).toContain('colors={colors}');
    });

    it('ErrorBoundary should accept colors prop', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain('colors?: Partial<ThemeColors>');
    });

    it('ThemedErrorBoundary should omit colors prop from its own interface', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain("Omit<ErrorBoundaryProps, 'colors'>");
    });

    it('ThemedErrorBoundary should spread props and pass children', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain('{...props}');
      expect(source).toContain('{props.children}');
    });

    it('should import ThemeColors type from ThemeContext', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain('type ThemeColors');
      expect(source).toContain("from '../contexts/ThemeContext'");
    });

    it('speeches.tsx should wrap with ThemedErrorBoundary', () => {
      const source = readSourceFile('app/(tabs)/speeches.tsx');
      expect(source).toContain('ThemedErrorBoundary');
      expect(source).toContain('<ThemedErrorBoundary>');
    });

    it('speeches.tsx should import ThemedErrorBoundary from ErrorBoundary', () => {
      const source = readSourceFile('app/(tabs)/speeches.tsx');
      expect(source).toContain("import { ThemedErrorBoundary } from '../../components/ErrorBoundary'");
    });

    it('speeches.tsx ThemedErrorBoundary wraps SpeechesTabContent', () => {
      const source = readSourceFile('app/(tabs)/speeches.tsx');
      expect(source).toContain('<ThemedErrorBoundary>');
      expect(source).toContain('<SpeechesTabContent />');
      expect(source).toContain('</ThemedErrorBoundary>');
    });

    it('speeches.tsx should export default SpeechesTab function', () => {
      const source = readSourceFile('app/(tabs)/speeches.tsx');
      expect(source).toContain('export default function SpeechesTab()');
    });

    it('agenda.tsx should wrap with ThemedErrorBoundary', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      expect(source).toContain('ThemedErrorBoundary');
      expect(source).toContain('<ThemedErrorBoundary>');
    });

    it('agenda.tsx should import ThemedErrorBoundary from ErrorBoundary', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      expect(source).toContain("import { ThemedErrorBoundary } from '../../components/ErrorBoundary'");
    });

    it('agenda.tsx ThemedErrorBoundary wraps AgendaTabContent', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      expect(source).toContain('<ThemedErrorBoundary>');
      expect(source).toContain('<AgendaTabContent />');
      expect(source).toContain('</ThemedErrorBoundary>');
    });

    it('agenda.tsx should export default AgendaTab function', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      expect(source).toContain('export default function AgendaTab()');
    });

    it('index.tsx (home) should wrap with ThemedErrorBoundary', () => {
      const source = readSourceFile('app/(tabs)/index.tsx');
      expect(source).toContain('ThemedErrorBoundary');
      expect(source).toContain('<ThemedErrorBoundary>');
    });

    it('index.tsx should import ThemedErrorBoundary from ErrorBoundary', () => {
      const source = readSourceFile('app/(tabs)/index.tsx');
      expect(source).toContain("import { ThemedErrorBoundary } from '../../components/ErrorBoundary'");
    });

    it('index.tsx ThemedErrorBoundary wraps HomeTabContent', () => {
      const source = readSourceFile('app/(tabs)/index.tsx');
      expect(source).toContain('<ThemedErrorBoundary>');
      expect(source).toContain('<HomeTabContent />');
      expect(source).toContain('</ThemedErrorBoundary>');
    });

    it('index.tsx should export default HomeTab function', () => {
      const source = readSourceFile('app/(tabs)/index.tsx');
      expect(source).toContain('export default function HomeTab()');
    });
  });

  // ---------------------------------------------------------------
  // CR-60: ErrorBoundary vs ThemedErrorBoundary usage
  // ---------------------------------------------------------------
  describe('CR-60: ErrorBoundary vs ThemedErrorBoundary usage patterns', () => {
    it('root _layout.tsx should use plain ErrorBoundary (no theme available)', () => {
      const source = readSourceFile('app/_layout.tsx');
      expect(source).toContain('<ErrorBoundary>');
      // Should NOT use ThemedErrorBoundary at root level (ThemeProvider is inside)
      expect(source).not.toContain('ThemedErrorBoundary');
    });

    it('tab screens should use ThemedErrorBoundary (inside ThemeProvider)', () => {
      const speeches = readSourceFile('app/(tabs)/speeches.tsx');
      const agenda = readSourceFile('app/(tabs)/agenda.tsx');
      const home = readSourceFile('app/(tabs)/index.tsx');
      // All tabs should use Themed variant
      expect(speeches).toContain('ThemedErrorBoundary');
      expect(agenda).toContain('ThemedErrorBoundary');
      expect(home).toContain('ThemedErrorBoundary');
    });

    it('each tab should have separate content function and wrapper', () => {
      const speeches = readSourceFile('app/(tabs)/speeches.tsx');
      const agenda = readSourceFile('app/(tabs)/agenda.tsx');
      const home = readSourceFile('app/(tabs)/index.tsx');
      // Content functions
      expect(speeches).toContain('function SpeechesTabContent()');
      expect(agenda).toContain('function AgendaTabContent()');
      expect(home).toContain('function HomeTabContent()');
      // Wrapper exports
      expect(speeches).toContain('export default function SpeechesTab()');
      expect(agenda).toContain('export default function AgendaTab()');
      expect(home).toContain('export default function HomeTab()');
    });
  });

  // ---------------------------------------------------------------
  // i18n keys exist in all locales
  // ---------------------------------------------------------------
  describe('i18n error keys', () => {
    (['pt-BR', 'en', 'es'] as const).forEach((locale) => {
      describe(`${locale}`, () => {
        it('errors.boundaryTitle should exist', () => {
          const data = readLocale(locale);
          const errors = data.errors as Record<string, string>;
          expect(errors.boundaryTitle).toBeDefined();
        });

        it('errors.boundaryMessage should exist', () => {
          const data = readLocale(locale);
          const errors = data.errors as Record<string, string>;
          expect(errors.boundaryMessage).toBeDefined();
        });

        it('errors.queryFailed should exist', () => {
          const data = readLocale(locale);
          const errors = data.errors as Record<string, string>;
          expect(errors.queryFailed).toBeDefined();
        });

        it('errors.queryFailedMessage should exist', () => {
          const data = readLocale(locale);
          const errors = data.errors as Record<string, string>;
          expect(errors.queryFailedMessage).toBeDefined();
        });

        it('errors.mutationFailed should NOT contain {{message}} (no raw error exposure)', () => {
          const data = readLocale(locale);
          const errors = data.errors as Record<string, string>;
          expect(errors.mutationFailed).not.toContain('{{message}}');
        });

        it('errors.whatsappNotInstalled should exist', () => {
          const data = readLocale(locale);
          const errors = data.errors as Record<string, string>;
          expect(errors.whatsappNotInstalled).toBeDefined();
        });

        it('errors.whatsappFailed should exist', () => {
          const data = readLocale(locale);
          const errors = data.errors as Record<string, string>;
          expect(errors.whatsappFailed).toBeDefined();
        });

        it('common.retry should exist', () => {
          const data = readLocale(locale);
          const common = data.common as Record<string, string>;
          expect(common.retry).toBeDefined();
        });

        it('common.error should exist', () => {
          const data = readLocale(locale);
          const common = data.common as Record<string, string>;
          expect(common.error).toBeDefined();
        });

        it('errors.boundaryTitle should be non-empty string', () => {
          const data = readLocale(locale);
          const errors = data.errors as Record<string, string>;
          expect(typeof errors.boundaryTitle).toBe('string');
          expect(errors.boundaryTitle.length).toBeGreaterThan(0);
        });

        it('errors.queryFailed should be non-empty string', () => {
          const data = readLocale(locale);
          const errors = data.errors as Record<string, string>;
          expect(typeof errors.queryFailed).toBe('string');
          expect(errors.queryFailed.length).toBeGreaterThan(0);
        });

        it('errors.mutationFailed should be non-empty string', () => {
          const data = readLocale(locale);
          const errors = data.errors as Record<string, string>;
          expect(typeof errors.mutationFailed).toBe('string');
          expect(errors.mutationFailed.length).toBeGreaterThan(0);
        });
      });
    });
  });

  // ---------------------------------------------------------------
  // Cross-cutting: no hardcoded error strings in components
  // ---------------------------------------------------------------
  describe('Cross-cutting: no hardcoded error strings', () => {
    it('ErrorBoundary should not have hardcoded title strings', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).not.toContain("'Something went wrong'");
      expect(source).not.toContain('"Something went wrong"');
      expect(source).not.toContain("'An error occurred'");
    });

    it('ErrorBoundary should not have hardcoded button text', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).not.toContain("'Try Again'");
      expect(source).not.toContain('"Try Again"');
      expect(source).not.toContain("'Retry'");
    });

    it('QueryErrorView should not have hardcoded strings', () => {
      const source = readSourceFile('components/QueryErrorView.tsx');
      expect(source).not.toContain("'Failed to load'");
      expect(source).not.toContain('"Failed to load"');
      expect(source).not.toContain("'Try Again'");
    });

    it('whatsapp.ts should not have hardcoded error messages', () => {
      const source = readSourceFile('lib/whatsapp.ts');
      expect(source).not.toContain("'WhatsApp is not installed on this device.'");
      expect(source).not.toContain("'Failed to open WhatsApp.'");
      expect(source).not.toContain("'WhatsApp nao esta instalado'");
    });
  });

  // ---------------------------------------------------------------
  // Structural: ErrorBoundary styles
  // ---------------------------------------------------------------
  describe('ErrorBoundary and QueryErrorView styles', () => {
    it('ErrorBoundary should have StyleSheet.create', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain('StyleSheet.create');
    });

    it('ErrorBoundary styles should include container, title, message, button', () => {
      const source = readSourceFile('components/ErrorBoundary.tsx');
      expect(source).toContain('container:');
      expect(source).toContain('title:');
      expect(source).toContain('message:');
      expect(source).toContain('button:');
      expect(source).toContain('buttonText:');
      expect(source).toContain('errorDetail:');
    });

    it('QueryErrorView styles should include container, title, message, retryButton', () => {
      const source = readSourceFile('components/QueryErrorView.tsx');
      expect(source).toContain('container:');
      expect(source).toContain('title:');
      expect(source).toContain('message:');
      expect(source).toContain('retryButton:');
      expect(source).toContain('retryText:');
      expect(source).toContain('detail:');
      expect(source).toContain('icon:');
    });
  });
});

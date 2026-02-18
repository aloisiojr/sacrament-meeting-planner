# PLAN_CR4_F004 - Error Handling Overhaul

## PLAN_SUMMARY

```yaml
type: plan_summary
total_steps: 7
parallel_tracks: 3
estimated_commits: 7
coverage:
  cr_57: "Global mutationCache.onError covers all 18 mutations without individual onError"
  cr_58: "QueryErrorView + isError checks in speeches.tsx, agenda.tsx, index.tsx"
  cr_59: "ErrorBoundary i18n + whatsapp.ts i18n (5 hardcoded strings)"
  cr_60: "ThemedErrorBoundary wrapper + per-tab wrapping"
  cr_61: "QueryClient config with caches, smart retry, mutation defaults"
critical_path:
  - "STEP-01: i18n keys (all steps depend on this)"
  - "STEP-02: ErrorBoundary refactor (CR-59, CR-60 depend on this)"
  - "STEP-03: QueryClient config (CR-57, CR-61)"
  - "STEP-04: QueryErrorView component (CR-58 depends on this)"
main_risks:
  - "Root ErrorBoundary cannot access ThemeProvider (wraps it) - uses hardcoded fallback colors"
  - "Global mutationCache.onError fires for ALL mutations including background auto-assign"
  - "Class component ErrorBoundary using i18n.t() directly (not hook) - works but non-standard"
```

## PLAN

```yaml
type: plan
version: 1

goal: "Add comprehensive error handling: global mutation errors, query error views, i18n strings, per-tab error boundaries, and improved QueryClient config"

strategy:
  order: "i18n keys -> ErrorBoundary refactor -> QueryClient config -> QueryErrorView -> Tab wiring -> whatsapp i18n -> Tests"
  commit_strategy: "1 commit per step, conventional commit messages"
  test_strategy: "QA tests in final step covering all CRs"

steps:
  - id: STEP-01
    description: "Add all error-related i18n keys in all 3 languages"
    files:
      - "src/i18n/locales/pt-BR.json"
      - "src/i18n/locales/en.json"
      - "src/i18n/locales/es.json"
    dependencies: []
    parallelizable_with: []
    done_when:
      - "All 3 locale files contain an 'errors' section with keys: boundaryTitle, boundaryMessage, queryFailed, queryFailedMessage, mutationFailed, whatsappNotInstalled, whatsappFailed"
      - "errors.mutationFailed uses interpolation: {{message}}"
      - "common.retry key already exists (confirmed at en.json L22)"
    changes:
      - file: "src/i18n/locales/en.json"
        action: "Add 'errors' section before closing brace"
        content: |
          "errors": {
            "boundaryTitle": "Something went wrong",
            "boundaryMessage": "An unexpected error occurred. Please try again.",
            "queryFailed": "Failed to load data",
            "queryFailedMessage": "Please check your connection and try again.",
            "mutationFailed": "Operation failed: {{message}}",
            "whatsappNotInstalled": "WhatsApp is not installed on this device.",
            "whatsappFailed": "Failed to open WhatsApp."
          }
      - file: "src/i18n/locales/pt-BR.json"
        action: "Add 'errors' section"
        content: |
          "errors": {
            "boundaryTitle": "Algo deu errado",
            "boundaryMessage": "Ocorreu um erro inesperado. Por favor, tente novamente.",
            "queryFailed": "Falha ao carregar dados",
            "queryFailedMessage": "Verifique sua conexao e tente novamente.",
            "mutationFailed": "Operacao falhou: {{message}}",
            "whatsappNotInstalled": "O WhatsApp nao esta instalado neste dispositivo.",
            "whatsappFailed": "Falha ao abrir o WhatsApp."
          }
      - file: "src/i18n/locales/es.json"
        action: "Add 'errors' section"
        content: |
          "errors": {
            "boundaryTitle": "Algo salio mal",
            "boundaryMessage": "Ocurrio un error inesperado. Por favor, intentalo de nuevo.",
            "queryFailed": "Error al cargar datos",
            "queryFailedMessage": "Verifique su conexion e intentelo de nuevo.",
            "mutationFailed": "La operacion fallo: {{message}}",
            "whatsappNotInstalled": "WhatsApp no esta instalado en este dispositivo.",
            "whatsappFailed": "Error al abrir WhatsApp."
          }
    covers:
      crs: ["CR-57", "CR-58", "CR-59"]
    commit: "chore(i18n): add error handling keys for CR-57, CR-58, CR-59"

  - id: STEP-02
    description: "Refactor ErrorBoundary: add i18n support, theme via props, export ThemedErrorBoundary wrapper"
    files:
      - "src/components/ErrorBoundary.tsx"
    dependencies: ["STEP-01"]
    parallelizable_with: []
    done_when:
      - "ErrorBoundary accepts optional `colors` prop (ThemeColors type or undefined)"
      - "Fallback title uses: this.props.fallbackTitle ?? i18n.t('errors.boundaryTitle')"
      - "Fallback message uses: this.props.fallbackMessage ?? i18n.t('errors.boundaryMessage')"
      - "Button text uses: i18n.t('common.retry')"
      - "Styles use colors prop when available, fallback to hardcoded light-mode colors (#333, #666, #007AFF, etc.)"
      - "errorDetail bg uses colors?.surfaceVariant ?? '#f5f5f5'"
      - "New export: ThemedErrorBoundary function component that wraps ErrorBoundary passing useTheme().colors"
      - "import i18n from '../i18n' added at top"
    changes:
      - file: "src/components/ErrorBoundary.tsx"
        action: "Full rewrite"
        details: |
          1. Add import: import i18n from '../i18n';
          2. Add import: import { useTheme } from '../contexts/ThemeContext';
          3. Add colors? to ErrorBoundaryProps interface:
             colors?: { text: string; textSecondary: string; background: string; primary: string; onPrimary: string; surfaceVariant: string; }
          4. In render(), replace hardcoded strings:
             L42: this.props.fallbackTitle ?? i18n.t('errors.boundaryTitle')
             L45: this.props.fallbackMessage ?? i18n.t('errors.boundaryMessage')
             L53: i18n.t('common.retry')
          5. In render(), use colors from props with fallbacks:
             container bg: this.props.colors?.background ?? '#FFFFFF'
             title color: this.props.colors?.text ?? '#333'
             message color: this.props.colors?.textSecondary ?? '#666'
             errorDetail bg: this.props.colors?.surfaceVariant ?? '#f5f5f5'
             button bg: this.props.colors?.primary ?? '#007AFF'
             buttonText color: this.props.colors?.onPrimary ?? '#FFFFFF'
          6. Remove hardcoded colors from StyleSheet (use dynamic styles)
          7. Add at bottom:
             export function ThemedErrorBoundary(props: Omit<ErrorBoundaryProps, 'colors'>) {
               const { colors } = useTheme();
               return <ErrorBoundary {...props} colors={colors}>{props.children}</ErrorBoundary>;
             }
    covers:
      crs: ["CR-59", "CR-60"]
    commit: "fix(ErrorBoundary): add i18n, theme support, and ThemedErrorBoundary wrapper (CR-59, CR-60)"

  - id: STEP-03
    description: "Update QueryClient config: add queryCache, mutationCache, smart retry, mutation defaults"
    files:
      - "src/app/_layout.tsx"
    dependencies: ["STEP-01"]
    parallelizable_with: ["STEP-02"]
    done_when:
      - "Import added: QueryCache, MutationCache from '@tanstack/react-query'"
      - "Import added: Alert from 'react-native'"
      - "Import added: i18n from '../i18n' (already imported at L10)"
      - "queryClient uses new QueryCache with onError that console.error logs"
      - "queryClient uses new MutationCache with onError that calls Alert.alert using i18n.t('common.error') and i18n.t('errors.mutationFailed', { message })"
      - "mutationCache.onError checks mutation.meta?.suppressGlobalError and returns early if true"
      - "queries.retry is a function: skip retry on 4xx (error.status >= 400 && < 500), else retry up to 2"
      - "mutations.retry: 0"
      - "mutations.networkMode: 'online'"
      - "staleTime remains 5 minutes"
    changes:
      - file: "src/app/_layout.tsx"
        action: "Replace L5 import and L12-19 queryClient"
        details: |
          L5: import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
          Add: import { Alert } from 'react-native'; (merge with existing L4 import)

          Replace L12-19 with:
          const queryClient = new QueryClient({
            queryCache: new QueryCache({
              onError: (error) => {
                console.error('[QueryCache] Error:', error.message);
              },
            }),
            mutationCache: new MutationCache({
              onError: (error, _variables, _context, mutation) => {
                if ((mutation as any).meta?.suppressGlobalError) return;
                Alert.alert(
                  i18n.t('common.error'),
                  i18n.t('errors.mutationFailed', { message: error.message })
                );
              },
            }),
            defaultOptions: {
              queries: {
                staleTime: 1000 * 60 * 5,
                retry: (failureCount, error: any) => {
                  if (error?.status >= 400 && error?.status < 500) return false;
                  return failureCount < 2;
                },
              },
              mutations: {
                retry: 0,
              },
            },
          });
    covers:
      crs: ["CR-57", "CR-61"]
    commit: "fix(QueryClient): add global error handlers, smart retry policy (CR-57, CR-61)"

  - id: STEP-04
    description: "Create QueryErrorView reusable component for tab-level query error display"
    files:
      - "src/components/QueryErrorView.tsx"
    dependencies: ["STEP-01"]
    parallelizable_with: ["STEP-02", "STEP-03"]
    done_when:
      - "New file src/components/QueryErrorView.tsx created"
      - "Component accepts props: error (Error | null), onRetry (() => void), message? (string)"
      - "Uses useTheme() for colors and useTranslation() for i18n"
      - "Renders centered layout with: warning icon text, title (t('errors.queryFailed')), message (custom or t('errors.queryFailedMessage')), retry button (t('common.retry'))"
      - "In __DEV__, shows error.message in monospace detail text"
      - "Retry button calls onRetry"
      - "Component is exported as named export"
    changes:
      - file: "src/components/QueryErrorView.tsx"
        action: "Create new file"
        details: |
          import React from 'react';
          import { View, Text, StyleSheet, Pressable } from 'react-native';
          import { useTranslation } from 'react-i18next';
          import { useTheme } from '../contexts/ThemeContext';

          interface QueryErrorViewProps {
            error: Error | null;
            onRetry: () => void;
            message?: string;
          }

          export function QueryErrorView({ error, onRetry, message }: QueryErrorViewProps) {
            const { colors } = useTheme();
            const { t } = useTranslation();

            return (
              <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Text style={styles.icon}>{'\u26A0'}</Text>
                <Text style={[styles.title, { color: colors.text }]}>
                  {t('errors.queryFailed')}
                </Text>
                <Text style={[styles.message, { color: colors.textSecondary }]}>
                  {message ?? t('errors.queryFailedMessage')}
                </Text>
                {__DEV__ && error && (
                  <Text style={[styles.detail, { color: colors.textSecondary, backgroundColor: colors.surfaceVariant }]}>
                    {error.message}
                  </Text>
                )}
                <Pressable
                  style={[styles.retryButton, { backgroundColor: colors.primary }]}
                  onPress={onRetry}
                  accessibilityRole="button"
                >
                  <Text style={[styles.retryText, { color: colors.onPrimary }]}>
                    {t('common.retry')}
                  </Text>
                </Pressable>
              </View>
            );
          }

          Styles: centered flex container, icon fontSize 40, title fontSize 20 bold,
          message fontSize 15, detail fontSize 12 monospace, retryButton with padding and borderRadius 8
    covers:
      crs: ["CR-58"]
    commit: "feat(QueryErrorView): add reusable query error component (CR-58)"

  - id: STEP-05
    description: "Wire QueryErrorView + ThemedErrorBoundary into all 3 tabs"
    files:
      - "src/app/(tabs)/speeches.tsx"
      - "src/app/(tabs)/agenda.tsx"
      - "src/app/(tabs)/index.tsx"
    dependencies: ["STEP-02", "STEP-04"]
    parallelizable_with: []
    done_when:
      - "speeches.tsx: Wrap with ThemedErrorBoundary"
      - "speeches.tsx: Destructure isError, error, refetch from useSpeeches (L93)"
      - "speeches.tsx: Destructure isError, error, refetch from useSundayExceptions (L94)"
      - "speeches.tsx: Before FlatList return, check if (speechesError || exceptionsError) and render QueryErrorView"
      - "speeches.tsx: auto-assign meta: autoAssign.mutate(sundays) at L100 becomes autoAssign.mutate(sundays, { meta: { suppressGlobalError: true } })"
      - "agenda.tsx: Wrap with ThemedErrorBoundary"
      - "agenda.tsx: Destructure isError, error, refetch from useSundayExceptions (L60)"
      - "agenda.tsx: Before FlatList return, check if (exceptionsError) and render QueryErrorView"
      - "index.tsx: Wrap with ThemedErrorBoundary"
      - "All tabs import ThemedErrorBoundary from '../../components/ErrorBoundary'"
      - "Speeches and Agenda tabs import QueryErrorView from '../../components/QueryErrorView'"
    changes:
      - file: "src/app/(tabs)/speeches.tsx"
        action: "Restructure as wrapper + content"
        details: |
          1. Add imports:
             import { ThemedErrorBoundary } from '../../components/ErrorBoundary';
             import { QueryErrorView } from '../../components/QueryErrorView';

          2. Rename current SpeechesTab to SpeechesTabContent (internal function)

          3. New default export:
             export default function SpeechesTab() {
               return (
                 <ThemedErrorBoundary>
                   <SpeechesTabContent />
                 </ThemedErrorBoundary>
               );
             }

          4. In SpeechesTabContent, change L93-94:
             BEFORE: const { data: speeches } = useSpeeches({ start: startDate, end: endDate });
             AFTER:  const { data: speeches, isError: speechesError, error: speechesErr, refetch: refetchSpeeches } = useSpeeches({ start: startDate, end: endDate });

             BEFORE: const { data: exceptions } = useSundayExceptions(startDate, endDate);
             AFTER:  const { data: exceptions, isError: exceptionsError, error: exceptionsErr, refetch: refetchExceptions } = useSundayExceptions(startDate, endDate);

          5. Change L100:
             BEFORE: autoAssign.mutate(sundays);
             AFTER:  autoAssign.mutate(sundays, { meta: { suppressGlobalError: true } });

          6. Before the return statement (before L312), add:
             if (speechesError || exceptionsError) {
               return (
                 <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                   <QueryErrorView
                     error={speechesErr ?? exceptionsErr ?? null}
                     onRetry={() => { refetchSpeeches(); refetchExceptions(); }}
                   />
                 </SafeAreaView>
               );
             }

      - file: "src/app/(tabs)/agenda.tsx"
        action: "Restructure as wrapper + content"
        details: |
          1. Add imports:
             import { ThemedErrorBoundary } from '../../components/ErrorBoundary';
             import { QueryErrorView } from '../../components/QueryErrorView';

          2. Rename current AgendaTab to AgendaTabContent

          3. New default export:
             export default function AgendaTab() {
               return (
                 <ThemedErrorBoundary>
                   <AgendaTabContent />
                 </ThemedErrorBoundary>
               );
             }

          4. In AgendaTabContent, change L60:
             BEFORE: const { data: exceptions } = useSundayExceptions(startDate, endDate);
             AFTER:  const { data: exceptions, isError: exceptionsError, error: exceptionsErr, refetch: refetchExceptions } = useSundayExceptions(startDate, endDate);

          5. Before the return statement (before L196), add:
             if (exceptionsError) {
               return (
                 <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                   <QueryErrorView
                     error={exceptionsErr ?? null}
                     onRetry={refetchExceptions}
                   />
                 </SafeAreaView>
               );
             }

      - file: "src/app/(tabs)/index.tsx"
        action: "Wrap content with ThemedErrorBoundary"
        details: |
          1. Add import:
             import { ThemedErrorBoundary } from '../../components/ErrorBoundary';

          2. Rename current HomeTab to HomeTabContent

          3. New default export:
             export default function HomeTab() {
               return (
                 <ThemedErrorBoundary>
                   <HomeTabContent />
                 </ThemedErrorBoundary>
               );
             }

          Note: HomeTab delegates queries to child section components (NextSundaysSection,
          NextAssignmentsSection, InviteManagementSection). Each handles its own data loading.
          The ThemedErrorBoundary catches render errors from any section.
          Query errors in child sections are lower priority - they show empty sections gracefully.
    covers:
      crs: ["CR-58", "CR-60"]
    commit: "fix(tabs): add ThemedErrorBoundary and QueryErrorView to all tabs (CR-58, CR-60)"

  - id: STEP-06
    description: "Replace hardcoded English strings in whatsapp.ts with i18n"
    files:
      - "src/lib/whatsapp.ts"
    dependencies: ["STEP-01"]
    parallelizable_with: ["STEP-02", "STEP-03", "STEP-04", "STEP-05"]
    done_when:
      - "import i18n from '../i18n' added at top"
      - "L26: Alert.alert('WhatsApp', i18n.t('errors.whatsappNotInstalled'))"
      - "L29: Alert.alert('WhatsApp', i18n.t('errors.whatsappFailed'))"
      - "No hardcoded English strings remain in file"
    changes:
      - file: "src/lib/whatsapp.ts"
        action: "Replace 2 hardcoded strings"
        details: |
          1. Add at L2 (after Linking/Alert import):
             import i18n from '../i18n';

          2. L26: Replace 'WhatsApp is not installed on this device.' with i18n.t('errors.whatsappNotInstalled')
          3. L29: Replace 'Failed to open WhatsApp.' with i18n.t('errors.whatsappFailed')
    covers:
      crs: ["CR-59"]
    commit: "fix(whatsapp): replace hardcoded English with i18n (CR-59)"

  - id: STEP-07
    description: "Add QA tests for all error handling changes"
    files:
      - "src/__tests__/cr004-f004-error-handling.test.ts"
    dependencies: ["STEP-01", "STEP-02", "STEP-03", "STEP-04", "STEP-05", "STEP-06"]
    parallelizable_with: []
    done_when:
      - "Test file created with comprehensive tests"
      - "Tests verify i18n error keys exist in all 3 languages"
      - "Tests verify ErrorBoundary uses i18n.t() for default strings"
      - "Tests verify ThemedErrorBoundary is exported"
      - "Tests verify QueryErrorView renders title, message, retry button"
      - "Tests verify QueryClient has mutationCache and queryCache"
      - "Tests verify mutationCache.onError respects suppressGlobalError meta"
      - "Tests verify whatsapp.ts uses i18n.t() for error messages"
      - "Tests verify tabs export default wraps with ThemedErrorBoundary"
      - "Tests verify speeches.tsx uses suppressGlobalError for autoAssign"
      - "All tests pass"
    covers:
      crs: ["CR-57", "CR-58", "CR-59", "CR-60", "CR-61"]
    commit: "test(qa): add QA tests for F004 error handling overhaul"

validation:
  - cr_id: CR-57
    how_to_verify: "Any mutation that fails shows Alert with error message via global mutationCache.onError"
    covered_by_steps: ["STEP-03", "STEP-07"]
  - cr_id: CR-58
    how_to_verify: "Disable network, open Speeches/Agenda tab -> QueryErrorView shown with retry button; retry works"
    covered_by_steps: ["STEP-04", "STEP-05", "STEP-07"]
  - cr_id: CR-59
    how_to_verify: "ErrorBoundary shows translated strings in all 3 languages; whatsapp.ts shows translated errors; no hardcoded English in error UI"
    covered_by_steps: ["STEP-01", "STEP-02", "STEP-06", "STEP-07"]
  - cr_id: CR-60
    how_to_verify: "Force render error in one tab (e.g., Speeches) -> only that tab shows error boundary, other tabs still work"
    covered_by_steps: ["STEP-02", "STEP-05", "STEP-07"]
  - cr_id: CR-61
    how_to_verify: "QueryClient has queryCache, mutationCache, smart retry (no retry on 4xx), mutations retry 0"
    covered_by_steps: ["STEP-03", "STEP-07"]
```

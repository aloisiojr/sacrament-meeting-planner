import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { QueryClient, QueryCache, MutationCache, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { I18nextProvider } from 'react-i18next';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SyncProvider } from '../providers/SyncProvider';
import i18n from '../i18n';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const SEVEN_DAYS_MS = 1000 * 60 * 60 * 24 * 7;

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: '@query_cache',
  throttleTime: 1000,
});

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      console.error('[QueryCache] Error:', error.message);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if ((mutation as any).meta?.suppressGlobalError) return;
      const isOffline = !onlineManager.isOnline();
      const isNetworkError = error?.message?.includes('network') ||
                             error?.message?.includes('fetch') ||
                             error?.message?.includes('Failed to fetch');
      if (isOffline || isNetworkError) return;
      if (__DEV__) {
        console.error('[MutationCache] Error:', error.message);
      }
      Alert.alert(
        i18n.t('common.error'),
        i18n.t('errors.mutationFailed')
      );
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: SEVEN_DAYS_MS,
      networkMode: 'offlineFirst' as const,
      retry: (failureCount: number, error: any) => {
        if (!onlineManager.isOnline()) return false;
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * Navigation guard: redirects based on auth state.
 * - Unauthenticated -> (auth) group
 * - Authenticated -> (tabs) group
 */
function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const { colors } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isAuthenticated = !!session;

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Redirect to home
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return children;
}

/**
 * Inner layout that uses theme context (must be inside ThemeProvider).
 */
function InnerLayout() {
  const { mode } = useTheme();

  return (
    <AuthProvider>
      <SyncProvider>
        <NavigationGuard>
          <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
          <Slot />
        </NavigationGuard>
      </SyncProvider>
    </AuthProvider>
  );
}

/**
 * Root layout: wraps all providers.
 * Provider order: QueryClient > I18n > Theme > Auth > Navigation
 */
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: asyncStoragePersister,
            maxAge: SEVEN_DAYS_MS,
            buster: Constants.expoConfig?.version ?? '1.0.0',
          }}
        >
          <I18nextProvider i18n={i18n}>
            <ThemeProvider>
              <InnerLayout />
            </ThemeProvider>
          </I18nextProvider>
        </PersistQueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

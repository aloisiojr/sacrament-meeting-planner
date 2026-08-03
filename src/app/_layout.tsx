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
import { UpdateRequiredScreen } from '../components/UpdateRequiredScreen';
import { useVersionGate } from '../hooks/useVersionGate';
import i18n from '../i18n';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  CACHE_GC_TIME_MS,
  CACHE_MAX_AGE_MS,
  CACHE_STORAGE_KEY,
  CACHE_THROTTLE_MS,
  STALE_TIME_MS,
  cacheBuster,
  shouldAlertMutationError,
  shouldRetryQuery,
} from '../lib/queryConfig';

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: CACHE_STORAGE_KEY,
  throttleTime: CACHE_THROTTLE_MS,
});

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      console.error('[QueryCache] Error:', error.message);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (!shouldAlertMutationError(error, onlineManager.isOnline(), (mutation as any).meta)) {
        return;
      }
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
      staleTime: STALE_TIME_MS,
      gcTime: CACHE_GC_TIME_MS,
      networkMode: 'offlineFirst' as const,
      retry: (failureCount: number, error: any) =>
        shouldRetryQuery(failureCount, error, onlineManager.isOnline()),
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
  }, [session, loading, segments, router]);

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
 * Blocks the app with an update screen when this build is below the minimum supported version.
 * Fail-open: renders children while checking or on any config error (see useVersionGate).
 */
function VersionGate({ children }: { children: React.ReactNode }) {
  const status = useVersionGate();
  if (status === 'blocked') return <UpdateRequiredScreen />;
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
        <VersionGate>
          <NavigationGuard>
            <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
            <Slot />
          </NavigationGuard>
        </VersionGate>
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
            maxAge: CACHE_MAX_AGE_MS,
            buster: cacheBuster(Constants.expoConfig?.version),
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

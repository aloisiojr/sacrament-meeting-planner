import { useEffect, useMemo, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { I18nextProvider } from 'react-i18next';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { RootErrorBoundary } from '../components/ErrorBoundary';
import { SyncProvider } from '../providers/SyncProvider';
import { UpdateRequiredScreen } from '../components/UpdateRequiredScreen';
import { useVersionGate } from '../hooks/useVersionGate';
import i18n from '../i18n';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  CACHE_MAX_AGE_MS,
  CACHE_STORAGE_KEY,
  CACHE_THROTTLE_MS,
  cacheBuster,
  prunePersistedCache,
  shouldDehydratePersistedQuery,
} from '../lib/queryConfig';
import { installGlobalErrorHandler } from '../lib/errorReporter';
import { installFontScalingCap } from '../lib/fontScaling';
import { queryClient } from '../lib/queryClient';
import { getStartupGateState } from '../lib/startupGate';
import { supabase } from '../lib/supabase';
import { reportHealthEvent } from '../lib/appHealth';

/**
 * RAP-04/DEC-02: the persisted cache belongs to one ward. The buster and the dehydrate
 * allowlist both need the current ward id, but the AuthProvider lives INSIDE the query
 * provider — so the root tracks the session itself (same app_metadata derivation as
 * AuthContext) and remounts the provider when the ward changes. A cache written under
 * another ward then fails the buster check on restore and is discarded, never read.
 */
function useCacheWardId(): string {
  const [wardId, setWardId] = useState('');
  useEffect(() => {
    let cancelled = false;
    const apply = (user: { app_metadata?: Record<string, unknown> } | null | undefined) => {
      if (!cancelled) setWardId((user?.app_metadata?.ward_id as string) ?? '');
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => apply(session?.user));
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);
  return wardId;
}

/**
 * AsyncStorage wrapper that caps the persisted cache (RAP-04): when a write exceeds
 * CACHE_MAX_BYTES the oldest queries are pruned and the prune is reported (numbers only,
 * per the appHealth contract). Other keys pass through untouched.
 */
function createCappedStorage(wardId: string) {
  return {
    getItem: (key: string) => AsyncStorage.getItem(key),
    removeItem: (key: string) => AsyncStorage.removeItem(key),
    setItem: async (key: string, value: string) => {
      if (key !== CACHE_STORAGE_KEY) return AsyncStorage.setItem(key, value);
      const pruned = prunePersistedCache(value);
      if (pruned.dropped > 0) {
        void reportHealthEvent(wardId || null, 'query_cache_pruned', {
          droppedQueries: pruned.dropped,
          bytesBefore: pruned.bytesBefore,
        });
      }
      return AsyncStorage.setItem(key, pruned.value);
    },
  };
}

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

  // EST-20: efeito e render consomem a MESMA decisão pura.
  const gate = getStartupGateState({
    loading,
    isAuthenticated: !!session,
    inAuthGroup: segments[0] === '(auth)',
  });

  useEffect(() => {
    if (gate === 'redirect-login') {
      router.replace('/(auth)/login');
    } else if (gate === 'redirect-home') {
      router.replace('/(tabs)');
    }
  }, [gate, router]);

  if (gate === 'loading') {
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
  const { mode, colors } = useTheme();

  return (
    <AuthProvider>
      <SyncProvider>
        <VersionGate>
          <NavigationGuard>
            <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
            {/* A Stack, not a Slot: without a navigator there is no history at the root, so
                leaving a route that lives outside (tabs) — designations, speeches, presentation —
                unmounted the tab group and dropped the user on the first tab with its state gone.
                Matches the (auth) and settings layouts. */}
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.background },
              }}
            />
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
  const cacheWardId = useCacheWardId();
  const persister = useMemo(
    () =>
      createAsyncStoragePersister({
        storage: createCappedStorage(cacheWardId),
        key: CACHE_STORAGE_KEY,
        throttleTime: CACHE_THROTTLE_MS,
      }),
    [cacheWardId]
  );

  useEffect(() => {
    installFontScalingCap();
    installGlobalErrorHandler();
  }, []);

  return (
    <RootErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PersistQueryClientProvider
          key={cacheWardId || 'anon'}
          client={queryClient}
          persistOptions={{
            persister,
            maxAge: CACHE_MAX_AGE_MS,
            buster: cacheBuster(Constants.expoConfig?.version, cacheWardId || null),
            dehydrateOptions: {
              shouldDehydrateQuery: (query) =>
                shouldDehydratePersistedQuery(query, cacheWardId || null),
            },
          }}
        >
          <I18nextProvider i18n={i18n}>
            <ThemeProvider>
              <InnerLayout />
            </ThemeProvider>
          </I18nextProvider>
        </PersistQueryClientProvider>
      </GestureHandlerRootView>
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

/**
 * Singleton do QueryClient (EST-26). Antes a criação vivia em `app/_layout.tsx` e a
 * unicidade era convenção: qualquer outro `new QueryClient` criaria um cache paralelo
 * que o sign-out não limparia. Aqui é um módulo importável — `_layout` monta o provider
 * com ele e o `AuthContext` (via `useQueryClient`) recebe exatamente este objeto.
 */
import { QueryClient, QueryCache, MutationCache, onlineManager } from '@tanstack/react-query';
import { Alert } from 'react-native';
import i18n from '../i18n';
import {
  CACHE_GC_TIME_MS,
  STALE_TIME_MS,
  shouldAlertMutationError,
  shouldRetryQuery,
} from './queryConfig';
import { isOfflineBlockedError } from './offlineGuard';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // EST-20: sem dump em produção — o erro já chega às telas via QueryErrorView
      // e ao diagnóstico via errorReporter; console em release é ruído invisível.
      if (__DEV__) {
        console.error('[QueryCache] Error:', error.message);
      }
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
        // A blocked-offline edit (DEC-01) already carries its translated "connect to save"
        // message; the generic failure text would hide the one actionable fact.
        isOfflineBlockedError(error) ? error.message : i18n.t('errors.mutationFailed')
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

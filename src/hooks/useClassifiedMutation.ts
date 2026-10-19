/**
 * useClassifiedMutation — the one entry point every mutation in the app is born through
 * (EST-03 / DEC-01, owner decision — hybrid).
 *
 * Each mutation is registered in `lib/mutationClassification` as either:
 *  - `queued` (meeting flows): the mutationFn itself persists the write via `withOfflineQueue`
 *    when the transport fails, so an offline edit is replayed on reconnect; or
 *  - `blocked-offline` (everything else): while offline the mutation rejects with
 *    `offline_blocked` BEFORE its mutationFn (and therefore the server) is ever called, and the
 *    global mutation alert shows the translated "connect to save" message.
 *
 * An unregistered name throws when the hook runs: a new mutation cannot silently be born
 * unclassified — the first render in dev or in any test that mounts it fails loudly.
 *
 * `networkMode: 'always'` is load-bearing. React Query's default (`'online'`) PAUSES a mutation
 * while offline and runs it later on reconnect: a blocked mutation would never reject (and the
 * edit would eventually go through as if nothing happened), and a queued mutation's
 * `mutateAsync` would pend forever instead of resolving as "safely queued". Classified mutations
 * always execute their mutationFn, which is where the queue/block decision actually lives.
 */
import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from '@tanstack/react-query';
import { useOnlineStatus } from '../contexts/OnlineStatusContext';
import { offlineClassFor, type MutationName } from '../lib/mutationClassification';
import { throwIfOfflineBlocked } from '../lib/offlineGuard';

export function useClassifiedMutation<TData, TError, TVariables, TContext>(
  name: MutationName,
  options: UseMutationOptions<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const isOnline = useOnlineStatus();
  const offlineClass = offlineClassFor(name);
  const innerFn = options.mutationFn;

  const result = useMutation<TData, TError, TVariables, TContext>({
    ...options,
    networkMode: options.networkMode ?? 'always',
    mutationFn: innerFn
      ? async (variables: TVariables, context) => {
          if (offlineClass === 'blocked-offline') throwIfOfflineBlocked(isOnline);
          return innerFn(variables, context);
        }
      : innerFn,
  });

  if (!offlineClass) {
    throw new Error(
      `Mutation "${name}" has no offline classification. Register it in ` +
        `lib/mutationClassification (queued = meeting flows, blocked-offline = everything else).`
    );
  }

  return result;
}

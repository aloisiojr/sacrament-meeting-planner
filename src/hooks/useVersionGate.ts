import { useState, useEffect } from 'react';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { isBelowMinimum } from '../lib/semver';

export type VersionGateStatus = 'checking' | 'ok' | 'blocked';

/**
 * Calls the `app-config` edge function on mount and decides whether this build is below the
 * minimum supported version. FAIL-OPEN: on any error, offline, or slow response it resolves to
 * 'ok' (never blocks the app on a config problem). Only returns 'blocked' when the config is read
 * successfully AND this version is strictly below `min_supported_version`.
 */
export function useVersionGate(): VersionGateStatus {
  const [status, setStatus] = useState<VersionGateStatus>('checking');

  useEffect(() => {
    let cancelled = false;
    // Fail-open if the check is slow (e.g. flaky network) — never hang the launch.
    const timer = setTimeout(() => {
      if (!cancelled) setStatus('ok');
    }, 4000);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('app-config');
        if (cancelled) return;
        clearTimeout(timer);
        const min = (data as { min_supported_version?: string } | null)?.min_supported_version;
        const version = Constants.expoConfig?.version ?? '0.0.0';
        setStatus(!error && min && isBelowMinimum(version, min) ? 'blocked' : 'ok');
      } catch {
        if (cancelled) return;
        clearTimeout(timer);
        setStatus('ok');
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return status;
}

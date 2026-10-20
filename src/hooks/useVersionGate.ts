import { useState, useEffect } from 'react';
import { AppState } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import { isBelowMinimum } from '../lib/semver';

export type VersionGateStatus = 'checking' | 'ok' | 'blocked';

/**
 * Calls the `app-config` edge function on mount — and again every time the app returns to the
 * foreground — and decides whether this build is below the minimum supported version.
 * FAIL-OPEN: on any error, offline, or slow response it resolves to 'ok' (never blocks the app
 * on a config problem). Only returns 'blocked' when the config is read successfully AND this
 * version is strictly below `min_supported_version`.
 *
 * First resolution wins per check (CONF-08): the 4s timer and the invoke race, and whichever
 * settles first decides — a late 'blocked' never swaps the screen under the user after the
 * timer already let them in. A missing build version (expoConfig null) is an explicit,
 * logged fail-open: comparing a spurious '0.0.0' would strand the user on the update screen.
 */
export function useVersionGate(): VersionGateStatus {
  const [status, setStatus] = useState<VersionGateStatus>('checking');

  useEffect(() => {
    let mounted = true;
    let runId = 0;

    const check = () => {
      const myRun = ++runId;
      const version = Constants.expoConfig?.version;
      if (!version) {
        console.warn(
          '[VersionGate] No app version in expoConfig; failing open (update gate disabled for this build).'
        );
        if (mounted) setStatus('ok');
        return;
      }

      let settled = false;
      // Fail-open if the check is slow (e.g. flaky network) — never hang the launch.
      const timer = setTimeout(() => {
        if (settled || !mounted || myRun !== runId) return;
        settled = true;
        setStatus('ok');
      }, 4000);

      (async () => {
        try {
          const { data, error } = await supabase.functions.invoke('app-config');
          if (settled || !mounted || myRun !== runId) return;
          settled = true;
          clearTimeout(timer);
          const min = (data as { min_supported_version?: string } | null)?.min_supported_version;
          setStatus(!error && min && isBelowMinimum(version, min) ? 'blocked' : 'ok');
        } catch {
          if (settled || !mounted || myRun !== runId) return;
          settled = true;
          clearTimeout(timer);
          setStatus('ok');
        }
      })();
    };

    check();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') check();
    });

    return () => {
      mounted = false;
      runId++;
      subscription.remove();
    };
  }, []);

  return status;
}

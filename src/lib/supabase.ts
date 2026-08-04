import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (SUPABASE_URL === 'https://placeholder.supabase.co') {
  console.warn(
    'Supabase URL not configured. ' +
      'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your environment.'
  );
}

/**
 * Which backend this build talks to, for display. `null` when it is production — the badge exists
 * to make a NON-production build obvious, and labelling the real one would just be noise.
 *
 * Exists because a staging build once shipped to real testers under the production app's identity:
 * from inside the app there was no way to tell which database you were looking at.
 */
export function backendLabel(): string | null {
  if (SUPABASE_URL === 'https://placeholder.supabase.co') return 'NOT CONFIGURED';
  const ref = SUPABASE_URL.replace(/^https?:\/\//, '').split('.')[0];
  if (ref === 'poizgglzdjqwrhsnhkke') return null; // production
  if (ref === 'nfraidzguordqmbpqkcf') return 'STAGING';
  return ref;
}

/**
 * Storage adapter that wraps AsyncStorage with error resilience.
 * On Android, AsyncStorage uses SQLite internally and can throw
 * "unable to open database file" (code 14) if the native module
 * is not fully initialized when first accessed. This wrapper
 * catches those errors and returns safe fallback values so the
 * Supabase auth client can recover gracefully.
 */
const resilientStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn('[Storage] getItem failed, returning null:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn('[Storage] setItem failed:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn('[Storage] removeItem failed:', error);
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: resilientStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

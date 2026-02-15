import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  lightColors,
  darkColors,
  THEME_STORAGE_KEY,
  type ThemeMode,
  type ResolvedTheme,
  type ThemeContextValue,
} from '../lib/theme';

// Re-export types for convenience
export type { ThemeMode, ResolvedTheme, ThemeColors, ThemeContextValue } from '../lib/theme';

// --- Storage helpers ---

async function loadThemePreference(): Promise<ThemeMode | null> {
  try {
    const value = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (value === 'automatic' || value === 'light' || value === 'dark') {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

async function saveThemePreference(mode: ThemeMode): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Silently fail - non-critical operation
  }
}

// --- Context ---

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Force a specific preference (for testing) */
  initialPreference?: ThemeMode;
}

export function ThemeProvider({ children, initialPreference }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemeMode>(
    initialPreference ?? 'automatic'
  );
  const [loading, setLoading] = useState(!initialPreference);

  // Load saved preference on mount
  useEffect(() => {
    if (initialPreference) return;

    loadThemePreference().then((saved) => {
      if (saved) {
        setPreferenceState(saved);
      }
      setLoading(false);
    });
  }, [initialPreference]);

  // Resolve the actual theme based on preference and system scheme
  const mode: ResolvedTheme = useMemo(() => {
    if (preference === 'automatic') {
      if (systemScheme === null || systemScheme === undefined) {
        // EC-CR022-1: useColorScheme returns null -> fallback to light with log
        console.warn('ThemeContext: useColorScheme returned null, falling back to light');
        return 'light';
      }
      return systemScheme;
    }
    return preference;
  }, [preference, systemScheme]);

  const colors = useMemo(() => {
    return mode === 'dark' ? darkColors : lightColors;
  }, [mode]);

  const setPreference = useCallback((newMode: ThemeMode) => {
    setPreferenceState(newMode);
    saveThemePreference(newMode);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      preference,
      setPreference,
      colors,
      loading,
    }),
    [mode, preference, setPreference, colors, loading]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Hook to access the current theme.
 * Must be used within a ThemeProvider.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

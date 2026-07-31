// --- Types ---

import type { SpeechStatus } from '../types/database';

export type ThemeMode = 'automatic' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeColors {
  // Background
  background: string;
  surface: string;
  surfaceVariant: string;
  card: string;

  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  textZebraFaded: string;

  // Primary
  primary: string;
  primaryContainer: string;
  onPrimary: string;

  // Status
  error: string;
  errorContainer: string;
  success: string;
  warning: string;
  /** Success/warning tuned for use as TEXT (AA on light backgrounds); success/warning stay for fills. */
  successText: string;
  warningText: string;
  /** Speech-status indicator colors, tuned per theme for ≥3:1 as dots/LEDs. Single source of truth. */
  status: Record<SpeechStatus, string>;

  // Borders & Dividers
  border: string;
  divider: string;

  // Tab bar
  tabBar: string;
  tabBarInactive: string;

  // Input
  inputBackground: string;
  inputBorder: string;
  placeholder: string;
}

export interface ThemeContextValue {
  mode: ResolvedTheme;
  preference: ThemeMode;
  setPreference(mode: ThemeMode): void;
  /** Toggle between light and dark (cycles: light -> dark -> light). Per ARCH_M008 contract. */
  toggleMode(): void;
  colors: ThemeColors;
  loading: boolean;
}

// --- Color Palettes ---
// Designed for WCAG AA contrast compliance (4.5:1 for normal text, 3:1 for large text)

export const lightColors: ThemeColors = {
  background: '#F1F5F9',        // Slate-100 (bluish-gray, creates contrast with white cards)
  surface: '#E2E8F0',           // Slate-200
  surfaceVariant: '#CBD5E1',    // Slate-300
  card: '#FFFFFF',              // white (unchanged, stands out against Slate-100 background)

  text: '#1A1A1A',              // contrast 14.1:1 on Slate-100
  textSecondary: '#5A5A5A',     // contrast 6.0:1 on Slate-100
  textTertiary: '#8A8A8A',      // contrast 3.0:1 on Slate-100 (large text only)
  textInverse: '#FFFFFF',
  textZebraFaded: '#4A4A4A',

  primary: '#2563EB',           // unchanged
  primaryContainer: '#DBEAFE',
  onPrimary: '#FFFFFF',

  error: '#DC2626',
  errorContainer: '#FEE2E2',
  success: '#16A34A',
  warning: '#D97706',
  successText: '#166534',       // green-800, 4.9:1 on white / 4.6:1 on hero (AA text)
  warningText: '#B45309',       // amber-700, 5.3:1 on white (AA text)
  status: {
    not_assigned: '#6B7280',          // 4.5:1 on white
    assigned_not_invited: '#EA580C',  // 3.8:1 on white
    assigned_invited: '#A16207',      // 5.3:1 on white (yellow is illegible bright on white)
    assigned_confirmed: '#15803D',    // 4.6:1 on white
    gave_up: '#7F1D1D',               // 13:1 on white
  },

  border: '#94A3B8',            // Slate-400 (bluish border)
  divider: '#CBD5E1',           // Slate-300 (bluish divider)

  tabBar: '#F1F5F9',            // matches background
  tabBarInactive: '#64748B',    // Slate-500

  inputBackground: '#F8FAFC',   // Slate-50
  inputBorder: '#94A3B8',       // Slate-400 (matches border)
  placeholder: '#64748B',       // Slate-500 (~4.6:1 on inputBackground; was #94A3B8 at 2.45:1)
};

export const darkColors: ThemeColors = {
  background: '#0F172A',
  surface: '#1E293B',
  surfaceVariant: '#334155',
  card: '#1E293B',

  text: '#F1F5F9',           // contrast 14.4:1 on #0F172A
  textSecondary: '#94A3B8',  // contrast 5.5:1 on #0F172A
  textTertiary: '#64748B',   // contrast 3.2:1 on #0F172A (large text only)
  textInverse: '#0F172A',
  textZebraFaded: '#B8C5D4',

  primary: '#60A5FA',        // contrast 5.8:1 on #0F172A
  primaryContainer: '#1E3A5F',
  onPrimary: '#0F172A',

  error: '#F87171',
  errorContainer: '#451A1A',
  success: '#4ADE80',
  warning: '#FBBF24',
  successText: '#4ADE80',       // already high-contrast on dark surfaces
  warningText: '#FBBF24',
  status: {
    not_assigned: '#9CA3AF',
    assigned_not_invited: '#F97316',
    assigned_invited: '#EAB308',
    assigned_confirmed: '#22C55E',
    gave_up: '#F87171',               // was #7F1D1D → 1.46:1 (invisible) on dark; now legible
  },

  border: '#475569',
  divider: '#334155',

  tabBar: '#1E293B',
  tabBarInactive: '#64748B',

  inputBackground: '#1E293B',
  inputBorder: '#475569',
  placeholder: '#64748B',
};

// --- Storage ---

export const THEME_STORAGE_KEY = '@theme_preference';

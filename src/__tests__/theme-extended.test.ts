import { describe, it, expect } from 'vitest';
import {
  lightColors,
  darkColors,
  THEME_STORAGE_KEY,
} from '../lib/theme';
import type {
  ThemeMode,
  ResolvedTheme,
  ThemeColors,
  ThemeContextValue,
} from '../lib/theme';

/**
 * Extended theme tests covering storage key, type safety, and
 * additional color palette properties not in the base theme test.
 */

describe('Theme Module', () => {
  describe('THEME_STORAGE_KEY', () => {
    it('should be a string prefixed with @', () => {
      expect(typeof THEME_STORAGE_KEY).toBe('string');
      expect(THEME_STORAGE_KEY).toMatch(/^@/);
    });

    it('should be the expected key for AsyncStorage', () => {
      expect(THEME_STORAGE_KEY).toBe('@theme_preference');
    });
  });

  describe('ThemeMode type', () => {
    it('should allow automatic, light, and dark', () => {
      const modes: ThemeMode[] = ['automatic', 'light', 'dark'];
      expect(modes).toHaveLength(3);
    });
  });

  describe('ResolvedTheme type', () => {
    it('should only allow light and dark (no automatic)', () => {
      const resolved: ResolvedTheme[] = ['light', 'dark'];
      expect(resolved).toHaveLength(2);
    });
  });

  describe('Color palette contrast - additional checks', () => {
    /**
     * Calculate relative luminance per WCAG 2.0.
     */
    function relativeLuminance(hex: string): number {
      const rgb = hex
        .replace('#', '')
        .match(/.{2}/g)!
        .map((c) => {
          const sRGB = parseInt(c, 16) / 255;
          return sRGB <= 0.03928
            ? sRGB / 12.92
            : Math.pow((sRGB + 0.055) / 1.055, 2.4);
        });
      return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    }

    function contrastRatio(hex1: string, hex2: string): number {
      const l1 = relativeLuminance(hex1);
      const l2 = relativeLuminance(hex2);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    it('should have adequate contrast for error text on errorContainer in light mode', () => {
      const ratio = contrastRatio(lightColors.error, lightColors.errorContainer);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });

    it('should have adequate contrast for error text on errorContainer in dark mode', () => {
      const ratio = contrastRatio(darkColors.error, darkColors.errorContainer);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });

    it('should have adequate contrast for onPrimary on primary in light mode', () => {
      const ratio = contrastRatio(lightColors.onPrimary, lightColors.primary);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should have adequate contrast for onPrimary on primary in dark mode', () => {
      const ratio = contrastRatio(darkColors.onPrimary, darkColors.primary);
      expect(ratio).toBeGreaterThanOrEqual(3);
    });

    it('should have visually distinct light and dark backgrounds', () => {
      // Light background should be much brighter than dark background
      const lightLum = relativeLuminance(lightColors.background);
      const darkLum = relativeLuminance(darkColors.background);
      expect(lightLum).toBeGreaterThan(darkLum);
      expect(lightLum).toBeGreaterThan(0.8); // White-ish
      expect(darkLum).toBeLessThan(0.1); // Dark-ish
    });
  });

  describe('Color palette values differ between light and dark', () => {
    it('should have different background colors', () => {
      expect(lightColors.background).not.toBe(darkColors.background);
    });

    it('should have different text colors', () => {
      expect(lightColors.text).not.toBe(darkColors.text);
    });

    it('should have different surface colors', () => {
      expect(lightColors.surface).not.toBe(darkColors.surface);
    });

    it('should have different primary colors', () => {
      expect(lightColors.primary).not.toBe(darkColors.primary);
    });
  });
});

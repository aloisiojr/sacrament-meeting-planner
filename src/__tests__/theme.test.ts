import { lightColors, darkColors } from '../lib/theme';
import type { ThemeColors } from '../lib/theme';

/**
 * Calculate relative luminance of a hex color per WCAG 2.0.
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function relativeLuminance(hex: string): number {
  const rgb = hex
    .replace('#', '')
    .match(/.{2}/g)!
    .map((c) => {
      const sRGB = parseInt(c, 16) / 255;
      return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/**
 * Calculate contrast ratio between two hex colors per WCAG 2.0.
 * https://www.w3.org/TR/WCAG20/#contrast-ratiodef
 */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('ThemeContext - Color Palettes', () => {
  describe('Light mode colors', () => {
    it('should have valid hex colors for all properties', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      for (const [key, value] of Object.entries(lightColors)) {
        const vals = typeof value === 'string' ? [value] : Object.values(value);
        for (const v of vals) expect(v).toMatch(hexRegex);
      }
    });

    // The highlighted hero card uses primaryContainer as its background, so status dots + success/
    // warning text must clear their thresholds on BOTH the white card and the hero (H1/H2/H3).
    const lightSurfaces = [lightColors.card, lightColors.primaryContainer];

    it('status dots meet ≥3:1 on the white card AND the hero (H2)', () => {
      for (const bg of lightSurfaces) {
        for (const [k, v] of Object.entries(lightColors.status)) {
          const ratio = contrastRatio(v, bg);
          expect(ratio).toBeGreaterThanOrEqual(3);
        }
      }
    });

    it('successText / warningText meet AA (4.5:1) as text on the white card AND the hero (H1/H3)', () => {
      for (const bg of lightSurfaces) {
        expect(contrastRatio(lightColors.successText, bg)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(lightColors.warningText, bg)).toBeGreaterThanOrEqual(4.5);
      }
    });

    it('should have WCAG AA contrast for text on background (4.5:1)', () => {
      const ratio = contrastRatio(lightColors.text, lightColors.background);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should have WCAG AA contrast for secondary text on background (4.5:1)', () => {
      const ratio = contrastRatio(lightColors.textSecondary, lightColors.background);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should have WCAG AA contrast for primary on background (3:1 for large text)', () => {
      const ratio = contrastRatio(lightColors.primary, lightColors.background);
      expect(ratio).toBeGreaterThanOrEqual(
        3
      );
    });
  });

  describe('Dark mode colors', () => {
    it('should have valid hex colors for all properties', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      for (const [key, value] of Object.entries(darkColors)) {
        const vals = typeof value === 'string' ? [value] : Object.values(value);
        for (const v of vals) expect(v).toMatch(hexRegex);
      }
    });

    it('status dots meet ≥3:1 on the dark card (incl. gave_up, H2)', () => {
      for (const [k, v] of Object.entries(darkColors.status)) {
        const ratio = contrastRatio(v, darkColors.card);
        expect(ratio).toBeGreaterThanOrEqual(3);
      }
    });

    it('should have WCAG AA contrast for text on background (4.5:1)', () => {
      const ratio = contrastRatio(darkColors.text, darkColors.background);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should have WCAG AA contrast for secondary text on background (4.5:1)', () => {
      const ratio = contrastRatio(darkColors.textSecondary, darkColors.background);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('should have WCAG AA contrast for primary on background (3:1 for large text)', () => {
      const ratio = contrastRatio(darkColors.primary, darkColors.background);
      expect(ratio).toBeGreaterThanOrEqual(
        3
      );
    });
  });

  describe('Color palette completeness', () => {
    const requiredKeys: (keyof ThemeColors)[] = [
      'background',
      'surface',
      'surfaceVariant',
      'card',
      'text',
      'textSecondary',
      'textTertiary',
      'textInverse',
      'primary',
      'primaryContainer',
      'onPrimary',
      'error',
      'errorContainer',
      'success',
      'warning',
      'border',
      'divider',
      'tabBar',
      'tabBarInactive',
      'inputBackground',
      'inputBorder',
      'placeholder',
    ];

    it('should have all required keys in light palette', () => {
      for (const key of requiredKeys) {
        expect(lightColors[key]).toBeDefined();
      }
    });

    it('should have all required keys in dark palette', () => {
      for (const key of requiredKeys) {
        expect(darkColors[key]).toBeDefined();
      }
    });

    it('should have matching keys between light and dark palettes', () => {
      const lightKeys = Object.keys(lightColors).sort();
      const darkKeys = Object.keys(darkColors).sort();
      expect(lightKeys).toEqual(darkKeys);
    });
  });
});

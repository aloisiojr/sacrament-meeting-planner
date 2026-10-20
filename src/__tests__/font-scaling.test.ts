import { Text, TextInput } from 'react-native';
import { installFontScalingCap, MAX_FONT_SIZE_MULTIPLIER } from '../lib/fontScaling';

describe('BEL-10: font scaling cap', () => {
  it('caps Text and TextInput at 1.8x', () => {
    installFontScalingCap();
    const textDefaults = (Text as unknown as { defaultProps?: Record<string, unknown> }).defaultProps;
    const inputDefaults = (TextInput as unknown as { defaultProps?: Record<string, unknown> }).defaultProps;
    expect(textDefaults?.maxFontSizeMultiplier).toBe(MAX_FONT_SIZE_MULTIPLIER);
    expect(inputDefaults?.maxFontSizeMultiplier).toBe(MAX_FONT_SIZE_MULTIPLIER);
    expect(MAX_FONT_SIZE_MULTIPLIER).toBeGreaterThan(1);
    expect(MAX_FONT_SIZE_MULTIPLIER).toBeLessThanOrEqual(2);
  });
});

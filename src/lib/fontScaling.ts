import { Text, TextInput } from 'react-native';

/**
 * BEL-10: cap dynamic-type growth so very large system fonts (200%) cannot break
 * fixed-height chrome (tab bar, headers, list rows). Content remains scalable up
 * to the cap; nothing is pinned to 1.0 (that would defeat accessibility).
 */
export const MAX_FONT_SIZE_MULTIPLIER = 1.8;

type WithDefaultProps = { defaultProps?: Record<string, unknown> };

export function installFontScalingCap(): void {
  for (const component of [Text, TextInput] as unknown as WithDefaultProps[]) {
    component.defaultProps = {
      ...(component.defaultProps ?? {}),
      maxFontSizeMultiplier: MAX_FONT_SIZE_MULTIPLIER,
    };
  }
}

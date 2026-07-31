/**
 * AppSwitch: the app's single toggle. Wraps RN Switch with theme-aware defaults so every toggle
 * has a visible OFF track (the platform default off-track — iOS ios_backgroundColor — is a near-
 * white gray that all but disappears on light backgrounds). Defaults: off track = switchTrackOff,
 * on track = primary. Callers may still override `trackColor` (partial merge) and `ios_backgroundColor`
 * — e.g. a destructive toggle passing `trackColor={{ true: colors.error }}` keeps the visible off track.
 */
import React from 'react';
import { Switch, type SwitchProps } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export function AppSwitch({ trackColor, ios_backgroundColor, ...rest }: SwitchProps) {
  const { colors } = useTheme();
  const off = colors.switchTrackOff ?? colors.inputBorder ?? '#94A3B8';
  const track = { false: off, true: colors.primary, ...(trackColor ?? {}) };
  return <Switch trackColor={track} ios_backgroundColor={ios_backgroundColor ?? off} {...rest} />;
}

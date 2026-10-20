/**
 * StatusLED: Flat circle LED indicator for speech status.
 * 5 states with flat solid color and fading animation for assigned_not_invited.
 * Supports reduced motion accessibility preference.
 *
 * States (colors come from the theme's `status` tokens — single source of truth):
 * - not_assigned / assigned_not_invited (fading ~2s) / assigned_invited /
 *   assigned_confirmed / gave_up
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import type { SpeechStatus } from '../types/database';
import { useTheme } from '../contexts/ThemeContext';

// --- Types ---

export interface StatusLEDProps {
  /** The current speech status. */
  status: SpeechStatus;
  /** Size of the LED in pixels (default: 16). */
  size?: number;
  /** Called when the LED is pressed (opens status menu). */
  onPress?: () => void;
  /** Whether the LED is pressable (disabled for Observer). */
  disabled?: boolean;
}

// --- Component ---

export function StatusLED({
  status,
  size = 16,
  onPress,
  disabled = false,
}: StatusLEDProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const dotColor = colors.status[status];
  const fadeOpacity = useSharedValue(1);
  // State (not a ref) so the animation effect re-runs once the async check resolves — a ref
  // read at mount was still false and the animation played even with reduce-motion enabled.
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isReduced) => setReducedMotion(isReduced)
    );

    AccessibilityInfo.isReduceMotionEnabled().then((isReduced) => {
      setReducedMotion(isReduced);
    });

    return () => {
      listener.remove();
    };
  }, []);

  // Animate fading for assigned_not_invited status
  useEffect(() => {
    if (status === 'assigned_not_invited' && !reducedMotion) {
      fadeOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1, // infinite repeat
        false
      );
    } else {
      cancelAnimation(fadeOpacity);
      fadeOpacity.value = 1;
    }

    return () => {
      cancelAnimation(fadeOpacity);
    };
  }, [status, reducedMotion, fadeOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
  }));

  const content = (
    <Animated.View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: dotColor,
        },
        animatedStyle,
      ]}
    />
  );

  if (onPress && !disabled) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={t(`speechStatus.${status}`)}
        accessibilityHint={t('a11y.changeSpeechStatus')}
        hitSlop={Math.max(0, Math.ceil((44 - size) / 2))}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={t(`speechStatus.${status}`)}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {},
});

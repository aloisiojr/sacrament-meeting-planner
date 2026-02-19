/**
 * StatusLED: Flat circle LED indicator for speech status.
 * 5 states with flat solid color and fading animation for assigned_not_invited.
 * Supports reduced motion accessibility preference.
 *
 * States:
 * - not_assigned: gray (#9CA3AF)
 * - assigned_not_invited: orange (#F97316) with ~2s fading animation
 * - assigned_invited: yellow (#EAB308) solid
 * - assigned_confirmed: green (#22C55E) solid
 * - gave_up: dark wine (#7F1D1D) solid
 */

import React, { useEffect, useRef } from 'react';
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
import type { SpeechStatus } from '../types/database';

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

// --- Color Map ---

const STATUS_COLORS: Record<SpeechStatus, string> = {
  not_assigned: '#9CA3AF',
  assigned_not_invited: '#F97316',
  assigned_invited: '#EAB308',
  assigned_confirmed: '#22C55E',
  gave_up: '#7F1D1D',
};

// --- Component ---

export function StatusLED({
  status,
  size = 16,
  onPress,
  disabled = false,
}: StatusLEDProps) {
  const fadeOpacity = useSharedValue(1);
  const reducedMotionRef = useRef(false);

  // Check for reduced motion preference
  useEffect(() => {
    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (isReduced) => {
        reducedMotionRef.current = isReduced;
        if (isReduced) {
          cancelAnimation(fadeOpacity);
          fadeOpacity.value = 1;
        }
      }
    );

    AccessibilityInfo.isReduceMotionEnabled().then((isReduced) => {
      reducedMotionRef.current = isReduced;
    });

    return () => {
      listener.remove();
    };
  }, []);

  // Animate fading for assigned_not_invited status
  useEffect(() => {
    if (status === 'assigned_not_invited' && !reducedMotionRef.current) {
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
  }, [status]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
  }));

  const statusLabels: Record<SpeechStatus, string> = {
    not_assigned: 'Not assigned',
    assigned_not_invited: 'Assigned, not invited',
    assigned_invited: 'Assigned, invited',
    assigned_confirmed: 'Assigned, confirmed',
    gave_up: 'Gave up',
  };

  const content = (
    <Animated.View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: STATUS_COLORS[status],
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
        accessibilityLabel={statusLabels[status]}
        accessibilityHint="Change speech status"
        hitSlop={8}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={statusLabels[status]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {},
});

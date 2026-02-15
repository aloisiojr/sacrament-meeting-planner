/**
 * StatusLED: 3D-style LED indicator for speech status.
 * 5 states with gradient effect and fading animation.
 * Supports reduced motion accessibility preference.
 *
 * States:
 * - not_assigned: gray (off)
 * - assigned_not_invited: yellow with ~2s fading animation
 * - assigned_invited: yellow solid
 * - assigned_confirmed: green solid
 * - gave_up: red solid
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

interface LEDColors {
  outer: string;
  inner: string;
  glow: string;
}

const STATUS_COLORS: Record<SpeechStatus, LEDColors> = {
  not_assigned: {
    outer: '#6B7280',
    inner: '#9CA3AF',
    glow: 'transparent',
  },
  assigned_not_invited: {
    outer: '#D97706',
    inner: '#FBBF24',
    glow: '#FDE68A',
  },
  assigned_invited: {
    outer: '#D97706',
    inner: '#FBBF24',
    glow: '#FDE68A',
  },
  assigned_confirmed: {
    outer: '#059669',
    inner: '#34D399',
    glow: '#A7F3D0',
  },
  gave_up: {
    outer: '#DC2626',
    inner: '#F87171',
    glow: '#FECACA',
  },
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

  const colors = STATUS_COLORS[status];
  const halfSize = size / 2;
  const innerSize = size * 0.65;
  const glowSize = size * 0.4;

  const animatedInnerStyle = useAnimatedStyle(() => ({
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
    <View
      style={[
        styles.outerRing,
        {
          width: size,
          height: size,
          borderRadius: halfSize,
          backgroundColor: colors.outer,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.innerCircle,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: colors.inner,
          },
          animatedInnerStyle,
        ]}
      >
        {/* Highlight/glow for 3D effect */}
        {status !== 'not_assigned' && (
          <View
            style={[
              styles.glowDot,
              {
                width: glowSize,
                height: glowSize,
                borderRadius: glowSize / 2,
                backgroundColor: colors.glow,
              },
            ]}
          />
        )}
      </Animated.View>
    </View>
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
  outerRing: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowDot: {
    position: 'absolute',
    top: 1,
    left: 1,
    opacity: 0.6,
  },
});

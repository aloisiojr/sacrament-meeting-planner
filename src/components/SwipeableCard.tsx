/**
 * SwipeableCard: Reusable swipe-to-reveal component.
 * Reveals edit/delete action buttons on left swipe.
 * Threshold ~20px to start revealing, snaps open/closed.
 * Only one card can be revealed at a time (managed by parent via activeId).
 */

import React, { useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  AccessibilityInfo,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../contexts/ThemeContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- Types ---

export interface SwipeableCardProps {
  /** Unique ID for this card (used for single-reveal management). */
  id: string;
  /** The currently revealed card ID (null if none). */
  activeId: string | null;
  /** Callback when this card becomes active (revealed). */
  onReveal: (id: string | null) => void;
  /** Whether swipe is disabled (e.g., Observer role). */
  disabled?: boolean;
  /** The card content. */
  children: React.ReactNode;
  /** Called when Edit button is pressed. */
  onEdit?: () => void;
  /** Called when Delete button is pressed. */
  onDelete?: () => void;
  /** Custom edit button label (default: i18n edit). */
  editLabel?: string;
  /** Custom delete button label (default: i18n delete). */
  deleteLabel?: string;
  /** Width of the action buttons area. */
  actionWidth?: number;
}

const SWIPE_THRESHOLD = 20;
const ACTION_WIDTH_DEFAULT = 140;
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
};

export function SwipeableCard({
  id,
  activeId,
  onReveal,
  disabled = false,
  children,
  onEdit,
  onDelete,
  editLabel,
  deleteLabel,
  actionWidth = ACTION_WIDTH_DEFAULT,
}: SwipeableCardProps) {
  const { colors } = useTheme();
  const translateX = useSharedValue(0);
  const isRevealed = activeId === id;

  // Close card when another card is revealed
  useEffect(() => {
    if (!isRevealed && translateX.value !== 0) {
      translateX.value = withSpring(0, SPRING_CONFIG);
    }
  }, [isRevealed]);

  // Snap to revealed position when set externally
  useEffect(() => {
    if (isRevealed && translateX.value === 0) {
      translateX.value = withSpring(-actionWidth, SPRING_CONFIG);
    }
  }, [isRevealed, actionWidth]);

  const handleReveal = useCallback(
    (revealed: boolean) => {
      onReveal(revealed ? id : null);
    },
    [id, onReveal]
  );

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-SWIPE_THRESHOLD, SWIPE_THRESHOLD])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      const base = isRevealed ? -actionWidth : 0;
      const newX = base + event.translationX;
      // Clamp between -actionWidth and 0
      translateX.value = Math.max(-actionWidth, Math.min(0, newX));
    })
    .onEnd((event) => {
      const velocity = event.velocityX;
      const currentX = translateX.value;

      // Determine target based on position and velocity
      const shouldReveal =
        velocity < -500 || (currentX < -actionWidth / 2 && velocity < 200);

      if (shouldReveal) {
        translateX.value = withSpring(-actionWidth, SPRING_CONFIG);
        runOnJS(handleReveal)(true);
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
        runOnJS(handleReveal)(false);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const handleEdit = useCallback(() => {
    translateX.value = withSpring(0, SPRING_CONFIG);
    onReveal(null);
    onEdit?.();
  }, [onEdit, onReveal]);

  const handleDelete = useCallback(() => {
    translateX.value = withSpring(0, SPRING_CONFIG);
    onReveal(null);
    onDelete?.();
  }, [onDelete, onReveal]);

  return (
    <View style={styles.container}>
      {/* Action buttons (behind the card) */}
      <View style={[styles.actionsContainer, { width: actionWidth }]}>
        {onEdit && (
          <Pressable
            style={[styles.actionButton, styles.editButton, { backgroundColor: colors.primary }]}
            onPress={handleEdit}
            accessibilityRole="button"
            accessibilityLabel={editLabel ?? 'Edit'}
          >
            <Text style={[styles.actionText, { color: colors.onPrimary }]}>
              {editLabel ?? 'Edit'}
            </Text>
          </Pressable>
        )}
        {onDelete && (
          <Pressable
            style={[styles.actionButton, styles.deleteButton, { backgroundColor: colors.error }]}
            onPress={handleDelete}
            accessibilityRole="button"
            accessibilityLabel={deleteLabel ?? 'Delete'}
          >
            <Text style={[styles.actionText, { color: '#FFFFFF' }]}>
              {deleteLabel ?? 'Delete'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Card content (slides left to reveal actions) */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[styles.cardContent, animatedStyle]}
          pointerEvents="box-none"
        >
          <View style={{ backgroundColor: colors.card }}>
            {children}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  actionsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  actionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  editButton: {},
  deleteButton: {},
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardContent: {
    zIndex: 1,
  },
});

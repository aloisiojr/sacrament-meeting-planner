/**
 * HymnScrubberRail: vertical fast-scroll rail for the hymn picker.
 *
 * Shows anchor numbers (1, 10, 20, …) along the right edge. Touching the rail scrolls to the
 * anchor under the finger; dragging scrubs live and shows a preview bubble to the left of the
 * rail with the snapped anchor number. See specs/v2-hymn-scrubber.md.
 *
 * Uses core PanResponder (not react-native-gesture-handler) so it works inside a RN Modal —
 * which renders outside the app-root GestureHandlerRootView — and on react-native-web.
 */
import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import type { ThemeColors } from '../contexts/ThemeContext';
import { anchorForFraction } from '../lib/hymnScrubber';

export const HYMN_RAIL_WIDTH = 30;
const BUBBLE_SIZE = 44;

export interface HymnScrubberRailProps {
  /** Anchor numbers to display, e.g. [1, 10, 20, …]. Empty → renders nothing. */
  anchors: number[];
  colors: ThemeColors;
  /** Called (on touch and live during drag) with the snapped anchor number. */
  onScrubToAnchor: (anchor: number) => void;
  testID?: string;
}

export function HymnScrubberRail({ anchors, colors, onScrubToAnchor, testID }: HymnScrubberRailProps) {
  const heightRef = useRef(0);
  const [bubble, setBubble] = useState<{ y: number; value: number } | null>(null);

  // Keep the latest handler so the once-created PanResponder never uses a stale `anchors`.
  const handleAtRef = useRef<(localY: number) => void>(() => {});
  handleAtRef.current = useCallback(
    (localY: number) => {
      const h = heightRef.current || 1;
      const value = anchorForFraction(anchors, localY / h);
      if (value == null) return;
      setBubble({ y: Math.max(0, Math.min(h, localY)), value });
      onScrubToAnchor(value);
    },
    [anchors, onScrubToAnchor]
  );

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => handleAtRef.current(e.nativeEvent.locationY),
      onPanResponderMove: (e: GestureResponderEvent) => handleAtRef.current(e.nativeEvent.locationY),
      onPanResponderRelease: () => setBubble(null),
      onPanResponderTerminate: () => setBubble(null),
    })
  ).current;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    heightRef.current = e.nativeEvent.layout.height;
  }, []);

  if (anchors.length === 0) return null;

  return (
    <View
      testID={testID ?? 'hymn-scrubber-rail'}
      style={[styles.rail, { width: HYMN_RAIL_WIDTH }]}
      onLayout={onLayout}
      {...pan.panHandlers}
    >
      {anchors.map((n) => (
        <Text
          key={n}
          style={[styles.anchorText, { color: colors.primary }]}
          allowFontScaling={false}
        >
          {n}
        </Text>
      ))}

      {bubble && (
        <View
          testID="hymn-scrubber-bubble"
          pointerEvents="none"
          style={[
            styles.bubble,
            {
              top: bubble.y - BUBBLE_SIZE / 2,
              backgroundColor: 'rgba(45,45,50,0.92)',
            },
          ]}
        >
          <Text style={styles.bubbleText} allowFontScaling={false}>
            {bubble.value}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  anchorText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  bubble: {
    position: 'absolute',
    right: HYMN_RAIL_WIDTH + 6,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});

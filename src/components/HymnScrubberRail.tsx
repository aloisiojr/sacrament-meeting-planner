/**
 * HymnScrubberRail: vertical fast-scroll rail for the hymn picker.
 *
 * Anchor numbers (data-driven, e.g. 1,10,…,200,1000,…) run down the right edge. Each anchor is a
 * Pressable, so a TAP jumps to it exactly (no coordinate math). A press-DRAG scrubs live and shows
 * a preview bubble to the left of the rail. See specs/v2-selectors-and-testimony.md.
 *
 * Uses core PanResponder (works inside a RN Modal and on react-native-web). The PanResponder claims
 * the gesture only on MOVE, so per-anchor taps still fire; drag maps `pageY − railTop` (measured) to
 * an anchor, fixing the earlier bug where locationY was relative to the tapped number, not the rail.
 */
import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  PanResponder,
  type GestureResponderEvent,
  type PanResponderGestureState,
  type LayoutChangeEvent,
} from 'react-native';
import type { ThemeColors } from '../contexts/ThemeContext';
import { anchorForFraction } from '../lib/hymnScrubber';

export const HYMN_RAIL_WIDTH = 34;
const BUBBLE_SIZE = 48;
const DRAG_THRESHOLD = 4;

export interface HymnScrubberRailProps {
  /** Anchor numbers to display, e.g. [1, 10, 20, …]. Empty → renders nothing. */
  anchors: number[];
  colors: ThemeColors;
  /** Called on tap and live during drag with the target anchor number. */
  onScrubToAnchor: (anchor: number) => void;
  testID?: string;
}

export function HymnScrubberRail({ anchors, colors, onScrubToAnchor, testID }: HymnScrubberRailProps) {
  const railRef = useRef<View>(null);
  const geom = useRef({ top: 0, height: 1 });
  const [bubble, setBubble] = useState<{ y: number; value: number } | null>(null);

  // Keep the latest handler so the once-created PanResponder never uses a stale `anchors`.
  const scrubAtRef = useRef<(pageY: number) => void>(() => {});
  scrubAtRef.current = useCallback(
    (pageY: number) => {
      const { top, height } = geom.current;
      const localY = pageY - top;
      const value = anchorForFraction(anchors, localY / (height || 1));
      if (value == null) return;
      setBubble({ y: Math.max(0, Math.min(height, localY)), value });
      onScrubToAnchor(value);
    },
    [anchors, onScrubToAnchor]
  );

  const refreshTop = useCallback(() => {
    railRef.current?.measureInWindow?.((_x, y) => {
      geom.current.top = y;
    });
  }, []);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      geom.current.height = e.nativeEvent.layout.height || 1;
      refreshTop();
    },
    [refreshTop]
  );

  const pan = useRef(
    PanResponder.create({
      // Per-anchor Pressables handle taps; only claim the gesture once the finger actually drags.
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_e, g: PanResponderGestureState) => Math.abs(g.dy) > DRAG_THRESHOLD,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        refreshTop();
        scrubAtRef.current(e.nativeEvent.pageY);
      },
      onPanResponderMove: (e: GestureResponderEvent) => scrubAtRef.current(e.nativeEvent.pageY),
      onPanResponderRelease: () => setBubble(null),
      onPanResponderTerminate: () => setBubble(null),
    })
  ).current;

  if (anchors.length === 0) return null;

  return (
    <View
      ref={railRef}
      testID={testID ?? 'hymn-scrubber-rail'}
      style={[styles.rail, { width: HYMN_RAIL_WIDTH }]}
      onLayout={onLayout}
      {...pan.panHandlers}
    >
      {anchors.map((n) => (
        <Pressable
          key={n}
          testID={`hymn-anchor-${n}`}
          onPress={() => onScrubToAnchor(n)}
          hitSlop={4}
          style={styles.anchorHit}
        >
          <Text style={[styles.anchorText, { color: colors.primary }]} allowFontScaling={false}>
            {n}
          </Text>
        </Pressable>
      ))}

      {bubble && (
        <View
          testID="hymn-scrubber-bubble"
          pointerEvents="none"
          style={[styles.bubble, { top: bubble.y - BUBBLE_SIZE / 2, backgroundColor: 'rgba(45,45,50,0.92)' }]}
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
  anchorHit: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1,
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

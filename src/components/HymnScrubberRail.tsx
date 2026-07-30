/**
 * HymnScrubberRail: vertical fast-scroll rail for the hymn picker (iOS section-index style).
 *
 * A compact, vertically-centered column of anchor numbers (1,10,…,200,1000,…) on the right edge.
 * A SINGLE PanResponder owns the whole strip and claims the gesture on touch START, so both a tap
 * and a press-drag work: the touch's screen Y is mapped to the nearest anchor (over the numbers'
 * centered band), the list scrolls, and a preview bubble shows the target. Owning the gesture from
 * the start is what makes dragging work — per-anchor Pressables let the initial press win and the
 * drag was ignored. See specs/v2-selectors-and-testimony.md.
 *
 * Core PanResponder (not gesture-handler) so it works inside a RN Modal and on react-native-web.
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

export const HYMN_RAIL_WIDTH = 28;
/** Height of each anchor number — kept small so the numbers sit close together. */
export const HYMN_RAIL_ROW_H = 15;
const BUBBLE_SIZE = 48;

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
      // The numbers are centered in the strip, so map over their band, not the full height.
      const bandHeight = Math.max(1, anchors.length * HYMN_RAIL_ROW_H);
      const bandTop = top + (height - bandHeight) / 2;
      const value = anchorForFraction(anchors, (pageY - bandTop) / bandHeight);
      if (value == null) return;
      setBubble({ y: Math.max(0, Math.min(height, pageY - top)), value });
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
      // Own the whole strip from the first touch — including the capture phase — so we win the
      // gesture over the FlatList underneath, and NEVER yield it mid-drag. Without
      // onPanResponderTerminationRequest:false the list's native ScrollView steals the responder
      // the moment the finger moves, so the tap registers but the drag is ignored.
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
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
    // Cluster the numbers tightly, centered vertically (not spread across the whole height).
    alignItems: 'center',
    justifyContent: 'center',
  },
  anchorText: {
    height: HYMN_RAIL_ROW_H,
    lineHeight: HYMN_RAIL_ROW_H,
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

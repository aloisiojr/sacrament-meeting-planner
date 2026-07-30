/**
 * Behavioral tests for HymnScrubberRail (specs/v2-selectors-and-testimony.md).
 * Tap goes through per-anchor Pressables; drag through the stub PanResponder (config exposed as
 * panHandlers). Height comes from onLayout; railTop defaults to 0 in the stub (no measureInWindow).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TestRenderer, { act } from 'react-test-renderer';
import { HymnScrubberRail } from '../components/HymnScrubberRail';

// @ts-expect-error test env flag
global.IS_REACT_ACT_ENVIRONMENT = true;

const colors = { primary: '#0aa' } as any;

function render(anchors: number[], onScrubToAnchor = vi.fn()) {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(
      <HymnScrubberRail anchors={anchors} colors={colors} onScrubToAnchor={onScrubToAnchor} />
    );
  });
  return { tree, onScrubToAnchor };
}

const rail = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root.findAll(
    (n: any) => typeof n.type === 'string' && n.props.testID === 'hymn-scrubber-rail'
  )[0] as any;

const anchorPressable = (tree: TestRenderer.ReactTestRenderer, n: number) =>
  tree.root.findAll(
    (x: any) => typeof x.type === 'string' && x.props.testID === `hymn-anchor-${n}`
  )[0] as any;

const bubble = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root.findAll(
    (n: any) => typeof n.type === 'string' && n.props.testID === 'hymn-scrubber-bubble'
  );

describe('HymnScrubberRail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders one Pressable per anchor number (AC3.2)', () => {
    const { tree } = render([1, 10, 200, 1000, 1010]);
    for (const n of [1, 10, 200, 1000, 1010]) {
      expect(anchorPressable(tree, n)).toBeTruthy();
    }
  });

  it('renders nothing when there are no anchors (AC3.5)', () => {
    const { tree } = render([]);
    expect(rail(tree)).toBeUndefined();
    expect(tree.toJSON()).toBeNull();
  });

  it('tapping an anchor scrubs to exactly that anchor — no mis-mapping (AC3.3)', () => {
    const { tree, onScrubToAnchor } = render([1, 10, 100, 200, 1000]);
    act(() => anchorPressable(tree, 100).props.onPress());
    expect(onScrubToAnchor).toHaveBeenLastCalledWith(100); // not 10
    act(() => anchorPressable(tree, 1000).props.onPress());
    expect(onScrubToAnchor).toHaveBeenLastCalledWith(1000);
  });

  it('claims the gesture only on move, so taps are not swallowed (AC3.4)', () => {
    const { tree } = render([1, 10, 20, 30, 40]);
    const r = rail(tree);
    expect(r.props.onStartShouldSetPanResponder()).toBe(false);
    expect(r.props.onMoveShouldSetPanResponder({}, { dy: 1 })).toBe(false); // below threshold
    expect(r.props.onMoveShouldSetPanResponder({}, { dy: 20 })).toBe(true); // a real drag
  });

  it('drag maps pageY→anchor and shows the preview bubble, hidden on release (AC3.4)', () => {
    const { tree, onScrubToAnchor } = render([1, 10, 20, 30, 40]);
    const r = rail(tree);
    act(() => r.props.onLayout({ nativeEvent: { layout: { height: 100 } } }));

    expect(bubble(tree).length).toBe(0);

    act(() => r.props.onPanResponderGrant({ nativeEvent: { pageY: 100 } })); // bottom → last anchor
    expect(onScrubToAnchor).toHaveBeenLastCalledWith(40);
    const b = bubble(tree);
    expect(b.length).toBe(1);
    const label = b[0].findAll((n: any) => typeof n.type === 'string' && n.type === 'Text')[0];
    expect(label.props.children).toBe(40);

    act(() => r.props.onPanResponderMove({ nativeEvent: { pageY: 50 } })); // middle → 20
    expect(onScrubToAnchor).toHaveBeenLastCalledWith(20);

    act(() => r.props.onPanResponderRelease());
    expect(bubble(tree).length).toBe(0);
  });
});

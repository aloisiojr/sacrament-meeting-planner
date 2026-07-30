/**
 * Behavioral tests for HymnScrubberRail (specs/v2-hymn-scrubber.md).
 * Uses the react-native stub's PanResponder, which exposes the config as panHandlers.
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

const texts = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root
    .findAll((n: any) => typeof n.type === 'string' && n.type === 'Text')
    .map((n: any) => n.props.children);

const bubble = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root.findAll(
    (n: any) => typeof n.type === 'string' && n.props.testID === 'hymn-scrubber-bubble'
  );

describe('HymnScrubberRail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders each anchor number (AC1)', () => {
    const { tree } = render([1, 10, 20, 30]);
    expect(texts(tree)).toEqual([1, 10, 20, 30]);
  });

  it('renders nothing when there are no anchors (AC6)', () => {
    const { tree } = render([]);
    expect(rail(tree)).toBeUndefined();
    expect(tree.toJSON()).toBeNull();
  });

  it('scrubs to the anchor under the finger on touch, and snaps by position (AC2/AC3)', () => {
    const { tree, onScrubToAnchor } = render([1, 10, 20, 30, 40]);
    const r = rail(tree);

    act(() => r.props.onLayout({ nativeEvent: { layout: { height: 100 } } }));

    act(() => r.props.onPanResponderGrant({ nativeEvent: { locationY: 0 } }));
    expect(onScrubToAnchor).toHaveBeenLastCalledWith(1); // top

    act(() => r.props.onPanResponderMove({ nativeEvent: { locationY: 100 } }));
    expect(onScrubToAnchor).toHaveBeenLastCalledWith(40); // bottom

    act(() => r.props.onPanResponderMove({ nativeEvent: { locationY: 50 } }));
    expect(onScrubToAnchor).toHaveBeenLastCalledWith(20); // middle
  });

  it('shows the preview bubble with the snapped value during a drag, hides it on release (AC3/AC4)', () => {
    const { tree } = render([1, 10, 20, 30, 40]);
    const r = rail(tree);
    act(() => r.props.onLayout({ nativeEvent: { layout: { height: 100 } } }));

    expect(bubble(tree).length).toBe(0); // hidden before touch

    act(() => r.props.onPanResponderGrant({ nativeEvent: { locationY: 100 } }));
    const b = bubble(tree);
    expect(b.length).toBe(1);
    // bubble label shows the snapped anchor
    const label = b[0].findAll((n: any) => typeof n.type === 'string' && n.type === 'Text')[0];
    expect(label.props.children).toBe(40);

    act(() => r.props.onPanResponderRelease());
    expect(bubble(tree).length).toBe(0); // hidden again
  });

  it('does not crash / does not scrub if height is unmeasured but still returns an anchor', () => {
    const { tree, onScrubToAnchor } = render([1, 10, 20]);
    const r = rail(tree);
    // no onLayout -> heightRef falls back to 1; locationY 0 -> fraction 0 -> anchor 1
    act(() => r.props.onPanResponderGrant({ nativeEvent: { locationY: 0 } }));
    expect(onScrubToAnchor).toHaveBeenLastCalledWith(1);
  });
});

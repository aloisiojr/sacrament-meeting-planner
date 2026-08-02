/**
 * Behavioral tests for HymnScrubberRail (specs/v2-selectors-and-testimony.md).
 * A single PanResponder owns the strip and claims on START (so drag isn't stolen by a tap);
 * both tap and drag map the touch's pageY over the centered numbers band. The stub PanResponder
 * exposes the config as panHandlers; height comes from onLayout, railTop defaults to 0 (no
 * measureInWindow in the stub).
 */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { HymnScrubberRail, HYMN_RAIL_ROW_H } from '../components/HymnScrubberRail';

global.IS_REACT_ACT_ENVIRONMENT = true;

const colors = { primary: '#0aa' } as any;

function render(anchors: number[], onScrubToAnchor = jest.fn()) {
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

const anchorText = (tree: TestRenderer.ReactTestRenderer, value: number) =>
  tree.root.findAll((n: any) => typeof n.type === 'string' && n.type === 'Text' && n.props.children === value);

const bubble = (tree: TestRenderer.ReactTestRenderer) =>
  tree.root.findAll(
    (n: any) => typeof n.type === 'string' && n.props.testID === 'hymn-scrubber-bubble'
  );

/** Screen Y (pageY) of an anchor index given the onLayout height, mirroring the component math. */
function pageYForIndex(anchors: number[], index: number, height: number): number {
  const bandHeight = anchors.length * HYMN_RAIL_ROW_H;
  const bandTop = (height - bandHeight) / 2; // railTop = 0 in the stub
  return bandTop + (index / (anchors.length - 1)) * bandHeight;
}

describe('HymnScrubberRail', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders one number per anchor (AC3.2)', () => {
    const { tree } = render([1, 10, 200, 1000, 1010]);
    for (const n of [1, 10, 200, 1000, 1010]) {
      expect(anchorText(tree, n).length).toBe(1);
    }
  });

  it('renders nothing when there are no anchors (AC3.5)', () => {
    const { tree } = render([]);
    expect(rail(tree)).toBeUndefined();
    expect(tree.toJSON()).toBeNull();
  });

  it('owns the gesture from the start and never yields it mid-drag (AC3.4)', () => {
    const { tree } = render([1, 10, 20, 30, 40]);
    const r = rail(tree);
    // Claim on start + capture so we win over the FlatList underneath.
    expect(r.props.onStartShouldSetResponder()).toBe(true);
    expect(r.props.onStartShouldSetResponderCapture()).toBe(true);
    expect(r.props.onMoveShouldSetResponder()).toBe(true);
    expect(r.props.onMoveShouldSetResponderCapture()).toBe(true);
    // Do NOT let the list's ScrollView steal the responder once dragging (this was the bug).
    expect(r.props.onResponderTerminationRequest()).toBe(false);
    expect(r.props.onShouldBlockNativeResponder()).toBe(true);
  });

  it('maps the touch position to the right anchor for both tap and drag (AC3.3/AC3.4)', () => {
    const anchors = [1, 10, 20, 30, 40];
    const { tree, onScrubToAnchor } = render(anchors);
    const r = rail(tree);
    act(() => r.props.onLayout({ nativeEvent: { layout: { height: 200 } } }));

    // Tap at the position of "20" (index 2) → scrubs to 20 exactly (no mis-mapping).
    act(() => r.props.onResponderGrant({ nativeEvent: { pageY: pageYForIndex(anchors, 2, 200) } }));
    expect(onScrubToAnchor).toHaveBeenLastCalledWith(20);

    // Drag to the bottom → last anchor.
    act(() => r.props.onResponderMove({ nativeEvent: { pageY: pageYForIndex(anchors, 4, 200) } }));
    expect(onScrubToAnchor).toHaveBeenLastCalledWith(40);

    // Drag to the top → first anchor.
    act(() => r.props.onResponderMove({ nativeEvent: { pageY: pageYForIndex(anchors, 0, 200) } }));
    expect(onScrubToAnchor).toHaveBeenLastCalledWith(1);
  });

  it('shows the preview bubble during the gesture and hides it on release (AC3.4)', () => {
    const anchors = [1, 10, 20, 30, 40];
    const { tree } = render(anchors);
    const r = rail(tree);
    act(() => r.props.onLayout({ nativeEvent: { layout: { height: 200 } } }));

    expect(bubble(tree).length).toBe(0);
    act(() => r.props.onResponderGrant({ nativeEvent: { pageY: pageYForIndex(anchors, 4, 200) } }));
    const b = bubble(tree);
    expect(b.length).toBe(1);
    const label = b[0].findAll((n: any) => typeof n.type === 'string' && n.type === 'Text')[0];
    expect(label.props.children).toBe(40);

    act(() => r.props.onResponderRelease());
    expect(bubble(tree).length).toBe(0);
  });
});

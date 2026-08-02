/**
 * Behavioral tests for HymnScrubberRail (specs/v2-selectors-and-testimony.md).
 * A single PanResponder owns the strip and claims on START (so drag isn't stolen by a tap);
 * both tap and drag map the touch's pageY over the centered numbers band. Against real React
 * Native the element carries the responder panHandlers (onResponderGrant, ...), not the config
 * keys, and those handlers require a responder event carrying touchHistory. Height comes from
 * onLayout; railTop stays 0 because measureInWindow does not resolve under the test renderer.
 */
import React from 'react';
import { render as rtlRender, screen, fireEvent, act } from '@testing-library/react-native';
import { HymnScrubberRail, HYMN_RAIL_ROW_H } from '../components/HymnScrubberRail';


const colors = { primary: '#0aa' } as any;

async function render(anchors: number[], onScrubToAnchor = jest.fn()) {
  await rtlRender(<HymnScrubberRail anchors={anchors} colors={colors} onScrubToAnchor={onScrubToAnchor} />);
  return { tree: null, onScrubToAnchor };
}

const rail = (_tree?: unknown) => screen.queryByTestId('hymn-scrubber-rail') as any;

const anchorText = (_tree: unknown, value: number) =>
  screen.root?.queryAll((n: any) => typeof n.type === 'string' && n.type === 'Text' && n.props.children === value) ?? [];

const bubble = (_tree?: unknown) => screen.queryAllByTestId('hymn-scrubber-bubble');

/** Screen Y (pageY) of an anchor index given the onLayout height, mirroring the component math. */
function pageYForIndex(anchors: number[], index: number, height: number): number {
  const bandHeight = anchors.length * HYMN_RAIL_ROW_H;
  const bandTop = (height - bandHeight) / 2; // railTop = 0 in the stub
  return bandTop + (index / (anchors.length - 1)) * bandHeight;
}


/** Real PanResponder handlers read event.touchHistory.touchBank, so a bare object will not do. */
function moveEvent(fromY: number, toY: number) {
  const e = touchEvent(toY);
  // Real onMoveShouldSet* wrappers derive dx/dy from the touch bank, so the previous position
  // has to differ from the current one for the gesture to register as a move.
  e.touchHistory.touchBank[0].startPageY = fromY;
  e.touchHistory.touchBank[0].previousPageY = fromY;
  e.touchHistory.mostRecentTimeStamp = 1;
  e.touchHistory.touchBank[0].currentTimeStamp = 1;
  return e;
}

function touchEvent(pageY = 0) {
  return {
    nativeEvent: {
      pageY, pageX: 0, locationX: 0, locationY: 0, identifier: 1, target: 1,
      timestamp: 0,
      // One active touch: PanResponder's shouldSet* wrappers consult the touch list.
      touches: [{ identifier: 1, pageX: 0, pageY, locationX: 0, locationY: 0, target: 1, timestamp: 0 }],
      changedTouches: [],
    },
    touchHistory: {
      touchBank: [
        { touchActive: true, startPageY: pageY, currentPageY: pageY, currentTimeStamp: 0,
          startTimeStamp: 0, previousPageY: pageY, previousTimeStamp: 0,
          startPageX: 0, currentPageX: 0, previousPageX: 0 },
      ],
      numberActiveTouches: 1, indexOfSingleActiveTouch: 0, mostRecentTimeStamp: 0,
    },
  };
}

describe('HymnScrubberRail', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders one number per anchor (AC3.2)', async () => {
    const { tree } = await render([1, 10, 200, 1000, 1010]);
    for (const n of [1, 10, 200, 1000, 1010]) {
      expect(anchorText(tree, n).length).toBe(1);
    }
  });

  it('renders nothing when there are no anchors (AC3.5)', async () => {
    const { tree } = await render([]);
    expect(rail(tree)).toBeNull();
    expect(screen.toJSON()).toBeNull();
  });

  it('owns the gesture from the start and never yields it mid-drag (AC3.4)', async () => {
    const { tree } = await render([1, 10, 20, 30, 40]);
    const r = rail(tree);
    // Claim on start + capture so we win over the FlatList underneath.
    expect(r.props.onStartShouldSetResponder(touchEvent())).toBe(true);
    expect(r.props.onStartShouldSetResponderCapture(touchEvent())).toBe(true);
    expect(r.props.onMoveShouldSetResponder(moveEvent(0, 50))).toBe(true);
    expect(r.props.onMoveShouldSetResponderCapture(moveEvent(0, 50))).toBe(true);
    // Do NOT let the list's ScrollView steal the responder once dragging (this was the bug).
    expect(r.props.onResponderTerminationRequest(touchEvent())).toBe(false);
    // onShouldBlockNativeResponder is a PanResponder config option, not a panHandler, so it is
    // not observable from props against real RN. The termination-request assertion above is what
    // actually encodes "never yield the responder mid-drag".
  });

  it('maps the touch position to the right anchor for both tap and drag (AC3.3/AC3.4)', async () => {
    const anchors = [1, 10, 20, 30, 40];
    const { tree, onScrubToAnchor } = await render(anchors);
    const r = rail(tree);
    await act(async () => r.props.onLayout({ nativeEvent: { layout: { height: 200 } } }));

    // Tap at the position of "20" (index 2) → scrubs to 20 exactly (no mis-mapping).
    await act(async () => r.props.onResponderGrant(touchEvent(pageYForIndex(anchors, 2, 200))));
    expect(onScrubToAnchor).toHaveBeenLastCalledWith(20);

    // Drag to the bottom → last anchor.
    await act(async () => r.props.onResponderMove(touchEvent(pageYForIndex(anchors, 4, 200))));
    expect(onScrubToAnchor).toHaveBeenLastCalledWith(40);

    // Drag to the top → first anchor.
    await act(async () => r.props.onResponderMove(touchEvent(pageYForIndex(anchors, 0, 200))));
    expect(onScrubToAnchor).toHaveBeenLastCalledWith(1);
  });

  it('shows the preview bubble during the gesture and hides it on release (AC3.4)', async () => {
    const anchors = [1, 10, 20, 30, 40];
    const { tree } = await render(anchors);
    const r = rail(tree);
    await act(async () => r.props.onLayout({ nativeEvent: { layout: { height: 200 } } }));

    expect(bubble(tree).length).toBe(0);
    await act(async () => r.props.onResponderGrant(touchEvent(pageYForIndex(anchors, 4, 200))));
    const b = bubble(tree);
    expect(b.length).toBe(1);
    const label = b[0].queryAll((n: any) => typeof n.type === 'string' && n.type === 'Text')[0];
    expect(label.props.children).toBe(40);

    await act(async () => r.props.onResponderRelease(touchEvent()));
    expect(bubble(tree).length).toBe(0);
  });
});

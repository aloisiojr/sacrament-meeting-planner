/**
 * Timing tests for useConnection (was 0% — never executed by any test).
 *
 * The hook is almost entirely temporal logic, which is where bugs hide well:
 *  - going offline is DEBOUNCED by 3s, so a blip on app resume does not flip the app to offline;
 *  - going online is IMMEDIATE, and cancels any pending offline transition;
 *  - the banner lingers 1.5s after reconnect so the user sees the recovery.
 *
 * It also drives @tanstack/react-query's onlineManager, which decides whether queries run at all —
 * getting that wrong strands the app in a permanently paused state.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { Text } from 'react-native';

type NetInfoListener = (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void;

const mockNetInfo: { listener: NetInfoListener | null; unsubscribe: jest.Mock } = {
  listener: null,
  unsubscribe: jest.fn(),
};
const mockSetOnline = jest.fn();

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: (cb: NetInfoListener) => {
      mockNetInfo.listener = cb;
      return mockNetInfo.unsubscribe;
    },
  },
}));

jest.mock('@tanstack/react-query', () => ({
  onlineManager: {
    get setOnline() {
      return mockSetOnline;
    },
  },
}));

import { useConnection } from '../hooks/useConnection';

function Harness() {
  const { isOnline, showOfflineBanner, isWebSocketConnected, setWebSocketConnected } =
    useConnection();
  return (
    <Text
      testID="probe"
      onPress={() => setWebSocketConnected(true)}
    >
      {JSON.stringify({ isOnline, showOfflineBanner, isWebSocketConnected })}
    </Text>
  );
}

const state = () => JSON.parse(screen.getByTestId('probe').props.children as string);

/** Deliver a NetInfo update to the hook's listener. */
async function netInfo(isConnected: boolean | null, isInternetReachable: boolean | null = true) {
  await act(async () => {
    mockNetInfo.listener?.({ isConnected, isInternetReachable });
  });
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockNetInfo.listener = null;
  mockNetInfo.unsubscribe = jest.fn();
  mockSetOnline.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useConnection — initial state', () => {
  it('assumes online before NetInfo reports, so the app is usable on a cold start', async () => {
    await render(<Harness />);
    const s = state();
    expect(s.isOnline).toBe(true);
    expect(s.showOfflineBanner).toBe(false);
    expect(s.isWebSocketConnected).toBe(false);
  });
});

describe('useConnection — going offline is debounced', () => {
  it('does NOT flip to offline before the debounce elapses', async () => {
    await render(<Harness />);
    await netInfo(false, false);

    await advance(2999);
    expect(state().isOnline).toBe(true);
    expect(mockSetOnline).not.toHaveBeenCalledWith(false);
  });

  it('flips to offline once the debounce elapses, and shows the banner', async () => {
    await render(<Harness />);
    await netInfo(false, false);
    await advance(3000);

    const s = state();
    expect(s.isOnline).toBe(false);
    expect(s.showOfflineBanner).toBe(true);
    expect(mockSetOnline).toHaveBeenCalledWith(false);
  });

  it('a blip shorter than the debounce never reaches the app', async () => {
    await render(<Harness />);
    await netInfo(false, false);
    await advance(1500);
    await netInfo(true); // recovered mid-debounce
    await advance(5000);

    // The pending offline transition must have been cancelled, not merely delayed.
    expect(state().isOnline).toBe(true);
    expect(mockSetOnline).not.toHaveBeenCalledWith(false);
  });

  it('does not stack debounce timers when offline is reported repeatedly', async () => {
    await render(<Harness />);
    await netInfo(false, false);
    await netInfo(false, false);
    await netInfo(false, false);
    await advance(3000);

    expect(state().isOnline).toBe(false);
    // One transition, not three.
    expect(mockSetOnline.mock.calls.filter(([v]) => v === false)).toHaveLength(1);
  });
});

describe('useConnection — going online is immediate', () => {
  it('restores connectivity without waiting', async () => {
    await render(<Harness />);
    await netInfo(false, false);
    await advance(3000);
    expect(state().isOnline).toBe(false);

    await netInfo(true);
    expect(state().isOnline).toBe(true);
    expect(mockSetOnline).toHaveBeenLastCalledWith(true);
  });

  it('keeps the banner up briefly after reconnecting, then hides it', async () => {
    await render(<Harness />);
    await netInfo(false, false);
    await advance(3000);
    expect(state().showOfflineBanner).toBe(true);

    await netInfo(true);
    // Still visible immediately after recovery, so the transition is perceptible.
    expect(state().showOfflineBanner).toBe(true);

    await advance(1500);
    expect(state().showOfflineBanner).toBe(false);
  });
});

describe('useConnection — what counts as online', () => {
  it('treats a connection with unknown reachability as online (avoids false offline)', async () => {
    await render(<Harness />);
    await netInfo(true, null);
    await advance(3000);
    expect(state().isOnline).toBe(true);
  });

  it('treats connected-but-unreachable as offline', async () => {
    await render(<Harness />);
    await netInfo(true, false);
    await advance(3000);
    expect(state().isOnline).toBe(false);
  });

  it('treats a null isConnected as offline', async () => {
    await render(<Harness />);
    await netInfo(null, null);
    await advance(3000);
    expect(state().isOnline).toBe(false);
  });
});

describe('useConnection — websocket flag and teardown', () => {
  it('exposes the websocket status setter for RealtimeSync', async () => {
    await render(<Harness />);
    expect(state().isWebSocketConnected).toBe(false);

    await act(async () => {
      screen.getByTestId('probe').props.onPress();
    });
    expect(state().isWebSocketConnected).toBe(true);
  });

  it('unsubscribes from NetInfo on unmount', async () => {
    await render(<Harness />);
    await screen.unmount();
    expect(mockNetInfo.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not flip state after unmount when a debounce was pending', async () => {
    await render(<Harness />);
    await netInfo(false, false);
    await screen.unmount();

    // The pending timer must be cleared; firing it after teardown would warn and leak.
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockSetOnline).not.toHaveBeenCalledWith(false);
  });
});

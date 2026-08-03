/**
 * Wiring tests for SyncProvider (was 0% — never executed by any test).
 *
 * It has no logic of its own; its whole job is to compose six hooks in the right order and feed
 * them the connection state. That ordering is the contract: useConnection must run first because
 * everything else depends on the isOnline it produces, and a hook wired to a stale or hardcoded
 * value fails silently — the app just stops syncing.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { Text } from 'react-native';

const mockConnection = {
  isOnline: true,
  showOfflineBanner: false,
  isWebSocketConnected: false,
  setWebSocketConnected: jest.fn(),
};

const mockCalls: Record<string, unknown[]> = {
  useRealtimeSync: [],
  useOfflineQueueProcessor: [],
  useOfflinePrefetch: [],
  useRegisterPushToken: [],
  useNotificationHandler: [],
  OnlineStatusProvider: [],
  OfflineBanner: [],
};

jest.mock('../hooks/useConnection', () => ({
  useConnection: () => mockConnection,
}));
jest.mock('../hooks/useRealtimeSync', () => ({
  useRealtimeSync: (opts: unknown) => {
    mockCalls.useRealtimeSync.push(opts);
  },
}));
jest.mock('../hooks/useOfflineQueueProcessor', () => ({
  useOfflineQueueProcessor: (isOnline: unknown) => {
    mockCalls.useOfflineQueueProcessor.push(isOnline);
  },
}));
jest.mock('../hooks/useOfflinePrefetch', () => ({
  useOfflinePrefetch: (isOnline: unknown) => {
    mockCalls.useOfflinePrefetch.push(isOnline);
  },
}));
jest.mock('../hooks/useNotifications', () => ({
  useRegisterPushToken: (isOnline: unknown) => {
    mockCalls.useRegisterPushToken.push(isOnline);
  },
  useNotificationHandler: () => {
    mockCalls.useNotificationHandler.push(true);
  },
}));
jest.mock('../components/OfflineBanner', () => ({
  OfflineBanner: (props: { visible: boolean }) => {
    mockCalls.OfflineBanner.push(props.visible);
    return require('react').createElement(
      require('react-native').Text,
      { testID: 'offline-banner' },
      String(props.visible)
    );
  },
}));
jest.mock('../contexts/OnlineStatusContext', () => ({
  OnlineStatusProvider: (props: { isOnline: boolean; children: React.ReactNode }) => {
    mockCalls.OnlineStatusProvider.push(props.isOnline);
    return props.children;
  },
}));

import { SyncProvider } from '../providers/SyncProvider';

function renderProvider() {
  return render(
    <SyncProvider>
      <Text testID="child">app</Text>
    </SyncProvider>
  );
}

beforeEach(() => {
  for (const k of Object.keys(mockCalls)) mockCalls[k] = [];
  mockConnection.isOnline = true;
  mockConnection.showOfflineBanner = false;
  mockConnection.setWebSocketConnected = jest.fn();
});

describe('SyncProvider — composition', () => {
  it('renders its children', async () => {
    await renderProvider();
    expect(screen.getByTestId('child')).toBeOnTheScreen();
  });

  it('engages every sync concern exactly once per render', async () => {
    await renderProvider();

    expect(mockCalls.useRealtimeSync).toHaveLength(1);
    expect(mockCalls.useOfflineQueueProcessor).toHaveLength(1);
    expect(mockCalls.useOfflinePrefetch).toHaveLength(1);
    expect(mockCalls.useRegisterPushToken).toHaveLength(1);
    expect(mockCalls.useNotificationHandler).toHaveLength(1);
  });
});

describe('SyncProvider — connection state reaches every consumer', () => {
  it('passes isOnline (true) to the queue processor, prefetch and push registration', async () => {
    mockConnection.isOnline = true;
    await renderProvider();

    expect(mockCalls.useOfflineQueueProcessor[0]).toBe(true);
    expect(mockCalls.useOfflinePrefetch[0]).toBe(true);
    expect(mockCalls.useRegisterPushToken[0]).toBe(true);
  });

  it('passes isOnline (false) through when offline — not a hardcoded true', async () => {
    mockConnection.isOnline = false;
    await renderProvider();

    expect(mockCalls.useOfflineQueueProcessor[0]).toBe(false);
    expect(mockCalls.useOfflinePrefetch[0]).toBe(false);
    expect(mockCalls.useRegisterPushToken[0]).toBe(false);
  });

  it('hands RealtimeSync both isOnline and the websocket setter it must call back on', async () => {
    mockConnection.isOnline = false;
    await renderProvider();

    expect(mockCalls.useRealtimeSync[0]).toEqual({
      isOnline: false,
      setWebSocketConnected: mockConnection.setWebSocketConnected,
    });
  });

  it('publishes isOnline to the OnlineStatus context that screens read', async () => {
    mockConnection.isOnline = false;
    await renderProvider();
    expect(mockCalls.OnlineStatusProvider[0]).toBe(false);
  });
});

describe('SyncProvider — offline banner', () => {
  it('is hidden while the connection is healthy', async () => {
    mockConnection.showOfflineBanner = false;
    await renderProvider();
    expect(screen.getByTestId('offline-banner')).toHaveTextContent('false');
  });

  it('is shown from showOfflineBanner, not from isOnline directly', async () => {
    // The two differ on purpose: the banner lingers after reconnect so the user sees it recover.
    mockConnection.isOnline = true;
    mockConnection.showOfflineBanner = true;
    await renderProvider();

    expect(screen.getByTestId('offline-banner')).toHaveTextContent('true');
  });
});

describe('SyncProvider — reacting to a connection change', () => {
  it('re-runs the sync hooks with the new value when connectivity flips', async () => {
    mockConnection.isOnline = false;
    const view = await renderProvider();
    expect(mockCalls.useOfflineQueueProcessor[0]).toBe(false);

    mockConnection.isOnline = true;
    await act(async () => {
      await view.rerender(
        <SyncProvider>
          <Text testID="child">app</Text>
        </SyncProvider>
      );
    });

    expect(mockCalls.useOfflineQueueProcessor.at(-1)).toBe(true);
    expect(mockCalls.OnlineStatusProvider.at(-1)).toBe(true);
  });
});

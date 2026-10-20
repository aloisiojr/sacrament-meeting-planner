/**
 * EST-14: History formats timestamps in the WARD's timezone, refetches when the screen
 * regains focus / on pull-to-refresh, and its offline banner reads the real connection
 * state instead of being absent or decorative.
 */
import React from 'react';
import { render as rtlRender, screen, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockState = {
  online: true,
  refetch: jest.fn().mockResolvedValue(undefined),
  focusCb: null as null | (() => void),
};

jest.mock('react-i18next', () => ({
  ...(jest.requireActual('react-i18next') as object),
  useTranslation: () => ({ t: (k: string) => k }),
}));
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', card: '#111', primary: '#07f', text: '#fff',
      textSecondary: '#aaa', error: '#f00',
    },
  }),
}));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ wardId: 'w1' }) }));
jest.mock('../contexts/OnlineStatusContext', () => ({
  useOnlineStatus: () => mockState.online,
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
  useFocusEffect: (cb: () => void) => {
    mockState.focusCb = cb;
    const { useEffect } = require('react') as typeof import('react');
    useEffect(() => {
      cb();
    }, [cb]);
  },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) =>
    require('react').createElement('SafeAreaView', {}, children),
}));
jest.mock('../components/SearchInput', () => ({ SearchInput: () => null }));
jest.mock('../hooks/useActivityLog', () => ({
  useActivityLog: () => ({
    entries: [
      {
        id: 'e1',
        created_at: '2026-01-15T15:00:00.000Z',
        user_email: 'a@b.c',
        user_name: 'Ana',
        description: 'member:create|nome=Ana',
      },
    ],
    isLoading: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    error: null,
    refetch: mockState.refetch,
    isRefetching: false,
    canRead: true,
  }),
  useActivityLogSearch: () => ({
    searchText: '',
    debouncedSearch: '',
    updateSearch: jest.fn(),
  }),
}));
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: { timezone: 'America/New_York' }, error: null }),
        }),
      }),
    }),
  },
}));

import HistoryScreen, { formatDateTime } from '../app/(tabs)/settings/history';

async function render() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = await rtlRender(
    <QueryClientProvider client={client}>
      <HistoryScreen />
    </QueryClientProvider>
  );
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return view;
}

beforeEach(() => {
  mockState.online = true;
  mockState.refetch.mockClear();
  mockState.focusCb = null;
});

describe('formatDateTime (EST-14)', () => {
  it('formats in the given ward timezone, not the device clock', () => {
    // 15:00 UTC = 10:00 in New York (EST, UTC-5) and 00:00 next day in Tokyo (UTC+9).
    expect(formatDateTime('2026-01-15T15:00:00.000Z', 'America/New_York')).toBe('2026-01-15 10:00');
    expect(formatDateTime('2026-01-15T15:00:00.000Z', 'Asia/Tokyo')).toBe('2026-01-16 00:00');
  });

  it('returns the raw string for an unparseable value', () => {
    expect(formatDateTime('not-a-date', 'America/New_York')).toBe('not-a-date');
  });
});

describe('History screen (EST-14)', () => {
  it('shows no offline banner while online and shows it when offline', async () => {
    await render();
    expect(screen.queryByTestId('history-offline-banner')).toBeNull();

    mockState.online = false;
    await render();
    expect(screen.getByTestId('history-offline-banner')).toBeOnTheScreen();
  });

  it('refetches when the screen gains focus', async () => {
    await render();
    expect(mockState.focusCb).not.toBeNull();
    expect(mockState.refetch).toHaveBeenCalled();
  });

  it('renders entry timestamps in the ward timezone once loaded', async () => {
    await render();
    expect(await screen.findByText('2026-01-15 10:00')).toBeOnTheScreen();
  });

  it('pull-to-refresh triggers a refetch', async () => {
    const view = await render();
    mockState.refetch.mockClear();
    // Find the FlatList by its refreshControl prop, then fire the pull gesture's callback.
    type Node = { props?: Record<string, unknown>; children?: unknown[] };
    const findRefresh = (node: unknown): (() => void) | null => {
      const n = node as Node;
      const rc = n?.props?.refreshControl as { props?: { onRefresh?: () => void } } | undefined;
      if (rc?.props?.onRefresh) return rc.props.onRefresh;
      for (const child of n?.children ?? []) {
        const found = findRefresh(child);
        if (found) return found;
      }
      return null;
    };
    const onRefresh = findRefresh(view.container);
    expect(onRefresh).not.toBeNull();
    await act(async () => {
      onRefresh!();
    });
    expect(mockState.refetch).toHaveBeenCalled();
  });
});

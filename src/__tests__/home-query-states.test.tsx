/**
 * EST-06/19: Home distinguishes loading / empty / error, and a failed section
 * does not blank the others. Hooks are mocked at the seam (full useQuery-shaped
 * results); buildUnifiedCardData stays real. Old code read only `data`, so an
 * errored query rendered "valid" empty cards — every case below fails there.
 */
import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';
import HomeTab from '../app/(tabs)/index';

const D1 = '2026-08-02';
const D2 = '2026-08-09';
const D3 = '2026-08-16';

type Q = {
  data: unknown[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: jest.Mock;
};
const ok = (data: unknown[]): Q => ({ data, isLoading: false, isError: false, error: null, refetch: jest.fn() });
const loading = (): Q => ({ data: undefined, isLoading: true, isError: false, error: null, refetch: jest.fn() });
const failing = (): Q => ({ data: undefined, isLoading: false, isError: true, error: new Error('boom'), refetch: jest.fn() });

const mockQ: { speeches: Q; exceptions: Q; agendas: Q } = {
  speeches: ok([]),
  exceptions: ok([]),
  agendas: ok([]),
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
jest.mock('../components/HomeMemberImportPrompt', () => ({ HomeMemberImportPrompt: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) =>
    require('react').createElement('SafeAreaView', {}, children),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', card: '#111', border: '#333', text: '#fff', textSecondary: '#aaa',
      primary: '#07f', onPrimary: '#fff', warning: '#fb0', divider: '#333', surfaceVariant: '#222',
      primaryContainer: '#123',
    },
  }),
}));
jest.mock('../contexts/OnlineStatusContext', () => ({ useOnlineStatus: () => true }));
jest.mock('../components/ErrorBoundary', () => ({
  ThemedErrorBoundary: ({ children }: { children?: React.ReactNode }) =>
    require('react').createElement(require('react').Fragment, {}, children),
}));
jest.mock('../components/icons', () => ({ PlayIcon: () => null }));
jest.mock('../components/NextAssignmentsSection', () => ({
  NextAssignmentsSection: () => require('react').createElement('NextAssignmentsSection', { testID: 'next-assignments' }),
}));
jest.mock('../components/InviteManagementSection', () => ({
  InviteManagementSection: () => require('react').createElement('InviteManagementSection', { testID: 'invite-management' }),
}));
jest.mock('../components/UnifiedSundayCard', () => ({
  UnifiedSundayCard: (props: Record<string, unknown>) => require('react').createElement('UnifiedSundayCard', props),
}));
jest.mock('../lib/dateUtils', () => ({
  getNextSundays: () => [new Date(`${D1}T12:00:00`), new Date(`${D2}T12:00:00`), new Date(`${D3}T12:00:00`)],
  toISODateString: (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
}));
jest.mock('../hooks/useSpeeches', () => ({
  useSpeeches: () => mockQ.speeches,
  useWardManagePrayers: () => ({ managePrayers: false, isLoading: false }),
}));
jest.mock('../hooks/useSundayTypes', () => ({
  useSundayExceptions: () => mockQ.exceptions,
}));
jest.mock('../hooks/useAgenda', () => ({
  useAgendaRange: () => mockQ.agendas,
}));
jest.mock('../hooks/useWard', () => ({ useWardName: () => 'Ala Modelo' }));

const cards = () => screen.root!.queryAll((n) => n.type === 'UnifiedSundayCard');

async function render() {
  await rtlRender(React.createElement(HomeTab));
}

beforeEach(() => {
  mockQ.speeches = ok([]);
  mockQ.exceptions = ok([]);
  mockQ.agendas = ok([]);
});

describe('Home query states (EST-06/19)', () => {
  it('all queries failing with no data shows error with retry, not empty cards', async () => {
    mockQ.speeches = failing();
    mockQ.exceptions = failing();
    mockQ.agendas = failing();
    await render();
    expect(screen.getByTestId('home-query-error')).toBeTruthy();
    expect(cards()).toHaveLength(0);
    fireEvent.press(screen.getByText('common.retry'));
    expect(mockQ.speeches.refetch).toHaveBeenCalled();
    expect(mockQ.agendas.refetch).toHaveBeenCalled();
    expect(mockQ.exceptions.refetch).toHaveBeenCalled();
  });

  it('loading with no data shows the loading state only', async () => {
    mockQ.speeches = loading();
    mockQ.exceptions = loading();
    mockQ.agendas = loading();
    await render();
    expect(screen.getByTestId('home-loading')).toBeTruthy();
    expect(cards()).toHaveLength(0);
    expect(screen.queryByTestId('home-query-error')).toBeNull();
  });

  it('one failing section keeps the others and retries only the failed query', async () => {
    mockQ.speeches = failing();
    // agendas/exceptions succeed with (empty) data: cards must stay.
    await render();
    expect(cards().length).toBeGreaterThan(0);
    expect(screen.getByTestId('home-partial-error')).toBeTruthy();
    fireEvent.press(screen.getByTestId('home-partial-retry'));
    expect(mockQ.speeches.refetch).toHaveBeenCalledTimes(1);
    expect(mockQ.agendas.refetch).not.toHaveBeenCalled();
    expect(mockQ.exceptions.refetch).not.toHaveBeenCalled();
  });

  it('loaded-but-empty is neither loading nor error', async () => {
    await render();
    expect(cards().length).toBeGreaterThan(0);
    expect(screen.queryByTestId('home-loading')).toBeNull();
    expect(screen.queryByTestId('home-query-error')).toBeNull();
    expect(screen.queryByTestId('home-partial-error')).toBeNull();
  });
});

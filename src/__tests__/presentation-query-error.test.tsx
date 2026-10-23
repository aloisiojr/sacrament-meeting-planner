/**
 * EST-06: Presentation must not conduct a meeting over `---` when the backend
 * failed. With the data hook in error state it shows QueryErrorView and its
 * retry calls the hook's refetch. Old code never read isError.
 */
import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';

const DATE = '2026-08-02';
const mockRefetch = jest.fn();
const mockDataState: { isError: boolean; isLoading: boolean } = { isError: true, isLoading: false };

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, f?: string) => f ?? k }),
}));
jest.mock('expo-blur', () => ({
  BlurView: (p: Record<string, unknown> & { children?: React.ReactNode }) =>
    require('react').createElement('BlurView', p, p.children),
}));
jest.mock('../hooks/useWard', () => ({
  useWardInfo: () => ({ data: undefined }),
  useWardName: () => 'Jardim',
  useWardDesignationTemplates: () => ({ templates: {}, isLoaded: true }),
}));
jest.mock('../components/icons', () => new Proxy({}, {
  get: (_t, name: string) => (p: Record<string, unknown>) =>
    require('react').createElement(String(name), p),
}));
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', card: '#111', border: '#333', text: '#fff', textSecondary: '#aaa',
      textTertiary: '#777', primary: '#07f', onPrimary: '#fff', surfaceVariant: '#222',
      divider: '#333', textZebraFaded: '#888',
    },
  }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: (p: Record<string, unknown> & { children?: React.ReactNode }) =>
    require('react').createElement('SafeAreaView', p, p.children),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({ date: DATE }),
}));
jest.mock('../i18n', () => ({ getCurrentLanguage: () => 'en-US' }));
jest.mock('../hooks/usePresentationMode', () => {
  const actual = jest.requireActual('../hooks/usePresentationMode') as Record<string, unknown>;
  return {
    ...actual,
    usePresentationData: () => ({
      agenda: undefined,
      speeches: [],
      exception: null,
      isSpecial: false,
      isLoading: mockDataState.isLoading,
      isError: mockDataState.isError,
      error: mockDataState.isError ? new Error('boom') : null,
      refetch: mockRefetch,
      hymnLookup: () => '',
      members: [],
      sundayDate: DATE,
    }),
  };
});

import PresentationScreen from '../app/presentation';

beforeEach(() => {
  mockDataState.isError = true;
  mockDataState.isLoading = false;
  mockRefetch.mockClear();
});

describe('Presentation query error (EST-06)', () => {
  it('shows the error view with retry instead of blank cards', async () => {
    await rtlRender(<PresentationScreen />);
    expect(screen.getByTestId('presentation-query-error')).toBeTruthy();
    expect(screen.queryByText('---')).toBeNull();
    fireEvent.press(screen.getByText('common.retry'));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('loading still wins over a stale error flag', async () => {
    mockDataState.isLoading = true;
    mockDataState.isError = false;
    await rtlRender(<PresentationScreen />);
    expect(screen.queryByTestId('presentation-query-error')).toBeNull();
  });
});

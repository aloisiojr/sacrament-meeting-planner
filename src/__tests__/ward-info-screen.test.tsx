/**
 * Behavioral test for the ward/stake name editor (P2 gap B): seeds from useWardInfo, validates that
 * both names are present, and persists via useUpdateWardInfo.
 *
 * `react-native` is aliased to a test stub (vitest.config.ts).
 */
import React from 'react';
import { render as rtlRender, screen, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';


const mockUpdateMock = jest.fn(
  (_input: unknown, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.()
);
const mockWardInfoHolder = {
  data: { name: 'Alpha Ward', stake_name: 'Beta Stake' } as { name: string; stake_name: string } | undefined,
  isLoading: false,
};
const mockOnlineHolder = { value: true };

jest.mock('react-i18next', () => {
  const actual = (jest.requireActual('react-i18next')) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { background: '#000', text: '#fff', textSecondary: '#aaa', textTertiary: '#777', primary: '#07f', inputBorder: '#333', inputBackground: '#111', placeholder: '#555', error: '#f00', errorContainer: '#300' } }),
}));
jest.mock('../contexts/OnlineStatusContext', () => ({ useOnlineStatus: () => mockOnlineHolder.value }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('../hooks/useWard', () => ({
  useWardInfo: () => ({ data: mockWardInfoHolder.data, isLoading: mockWardInfoHolder.isLoading }),
  useUpdateWardInfo: () => ({ mutate: mockUpdateMock, isPending: false }),
}));

import WardInfoScreen from '../app/(tabs)/settings/ward';

async function render() {
  await rtlRender(<WardInfoScreen />);
  return null; // call-site compatibility; the helpers query `screen`
}

function node(_renderer: unknown, testID: string) {
  return screen.getByTestId(testID);
}

beforeEach(() => {
  mockUpdateMock.mockClear();
  mockWardInfoHolder.data = { name: 'Alpha Ward', stake_name: 'Beta Stake' };
  mockWardInfoHolder.isLoading = false;
  mockOnlineHolder.value = true;
});

describe('WardInfoScreen (P2 gap B)', () => {
  it('seeds inputs from the loaded ward info', async () => {
    const renderer = await render();
    expect(node(renderer, 'ward-info-name').props.value).toBe('Alpha Ward');
    expect(node(renderer, 'ward-info-stake').props.value).toBe('Beta Stake');
  });

  it('persists name and stake on save', async () => {
    await render();
    await fireEvent.changeText(screen.getByTestId('ward-info-name'), 'New Ward');
    await fireEvent.press(screen.getByTestId('ward-info-save'));
    expect(mockUpdateMock).toHaveBeenCalledTimes(1);
    expect(mockUpdateMock.mock.calls[0][0]).toEqual({ name: 'New Ward', stake_name: 'Beta Stake' });
  });

  it('blocks saving when a field is blank', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render();
    await fireEvent.changeText(screen.getByTestId('ward-info-stake'), '   ');
    await fireEvent.press(screen.getByTestId('ward-info-save'));
    expect(mockUpdateMock).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe('keyboard reachability', () => {
  /*
   * Removing the KeyboardAvoider from every screen used to leave the whole suite green — the
   * wrapper was the branch's main deliverable and nothing pinned it. This asserts presence only:
   * whether a field ends up visible needs a device, but silent removal is now caught.
   */
  it('keeps the form inside a KeyboardAvoider', async () => {
    await render();
    expect(screen.getByTestId('ward-keyboard-avoider')).toBeTruthy();
  });
});

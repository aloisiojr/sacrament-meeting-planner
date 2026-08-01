/**
 * Behavioral test for the ward/stake name editor (P2 gap B): seeds from useWardInfo, validates that
 * both names are present, and persists via useUpdateWardInfo.
 *
 * `react-native` is aliased to a test stub (vitest.config.ts).
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { Alert } from 'react-native';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

function render() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(WardInfoScreen));
  });
  return renderer;
}

function node(renderer: TestRenderer.ReactTestRenderer, testID: string) {
  return renderer.root.findAll((n) => typeof n.type === 'string' && n.props.testID === testID)[0];
}

beforeEach(() => {
  mockUpdateMock.mockClear();
  mockWardInfoHolder.data = { name: 'Alpha Ward', stake_name: 'Beta Stake' };
  mockWardInfoHolder.isLoading = false;
  mockOnlineHolder.value = true;
});

describe('WardInfoScreen (P2 gap B)', () => {
  it('seeds inputs from the loaded ward info', () => {
    const renderer = render();
    expect(node(renderer, 'ward-info-name').props.value).toBe('Alpha Ward');
    expect(node(renderer, 'ward-info-stake').props.value).toBe('Beta Stake');
  });

  it('persists name and stake on save', () => {
    const renderer = render();
    act(() => {
      (node(renderer, 'ward-info-name').props.onChangeText as (v: string) => void)('New Ward');
    });
    act(() => {
      (node(renderer, 'ward-info-save').props.onPress as () => void)();
    });
    expect(mockUpdateMock).toHaveBeenCalledTimes(1);
    expect(mockUpdateMock.mock.calls[0][0]).toEqual({ name: 'New Ward', stake_name: 'Beta Stake' });
  });

  it('blocks saving when a field is blank', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const renderer = render();
    act(() => {
      (node(renderer, 'ward-info-stake').props.onChangeText as (v: string) => void)('   ');
    });
    act(() => {
      (node(renderer, 'ward-info-save').props.onPress as () => void)();
    });
    expect(mockUpdateMock).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

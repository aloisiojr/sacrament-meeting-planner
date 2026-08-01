/**
 * Behavioral test for the notification settings screen (P2 gap D): the master switch reflects the
 * current opt-out and toggling it persists via useSetNotificationsEnabled.
 *
 * `react-native` is aliased to a test stub (vitest.config.ts).
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockSetMock = jest.fn();
const mockPrefHolder = { enabled: true, isLoading: false };
const mockOnlineHolder = { value: true };

jest.mock('react-i18next', () => {
  const actual = (jest.requireActual('react-i18next')) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { background: '#000', text: '#fff', textSecondary: '#aaa', primary: '#07f', card: '#111', divider: '#333' } }),
}));
jest.mock('../contexts/OnlineStatusContext', () => ({ useOnlineStatus: () => mockOnlineHolder.value }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('../hooks/useNotifications', () => ({
  useNotificationsEnabled: () => ({ enabled: mockPrefHolder.enabled, isLoading: mockPrefHolder.isLoading }),
  useSetNotificationsEnabled: () => ({ mutate: mockSetMock, isPending: false }),
}));

import NotificationsSettingsScreen from '../app/(tabs)/settings/notifications';

function render() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(NotificationsSettingsScreen));
  });
  return renderer;
}

function sw(renderer: TestRenderer.ReactTestRenderer) {
  return renderer.root.findAll((n) => n.props?.testID === 'notifications-master-switch')[0];
}

beforeEach(() => {
  mockSetMock.mockClear();
  mockPrefHolder.enabled = true;
  mockPrefHolder.isLoading = false;
  mockOnlineHolder.value = true;
});

describe('NotificationsSettingsScreen (P2 gap D)', () => {
  it('reflects the current opt-out state', () => {
    mockPrefHolder.enabled = false;
    const renderer = render();
    expect(sw(renderer).props.value).toBe(false);
  });

  it('persists the new value when toggled', () => {
    const renderer = render();
    act(() => {
      (sw(renderer).props.onValueChange as (v: boolean) => void)(false);
    });
    expect(mockSetMock).toHaveBeenCalledWith(false);
  });

  it('disables the switch when offline', () => {
    mockOnlineHolder.value = false;
    const renderer = render();
    expect(sw(renderer).props.disabled).toBe(true);
  });
});

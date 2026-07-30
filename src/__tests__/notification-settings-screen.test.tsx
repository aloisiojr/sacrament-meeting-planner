/**
 * Behavioral test for the notification settings screen (P2 gap D): the master switch reflects the
 * current opt-out and toggling it persists via useSetNotificationsEnabled.
 *
 * `react-native` is aliased to a test stub (vitest.config.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const setMock = vi.fn();
const prefHolder = vi.hoisted(() => ({ enabled: true, isLoading: false }));
const onlineHolder = vi.hoisted(() => ({ value: true }));

vi.mock('react-i18next', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { background: '#000', text: '#fff', textSecondary: '#aaa', primary: '#07f', card: '#111', divider: '#333' } }),
}));
vi.mock('../contexts/OnlineStatusContext', () => ({ useOnlineStatus: () => onlineHolder.value }));
vi.mock('expo-router', () => ({ useRouter: () => ({ back: vi.fn() }) }));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('../hooks/useNotifications', () => ({
  useNotificationsEnabled: () => ({ enabled: prefHolder.enabled, isLoading: prefHolder.isLoading }),
  useSetNotificationsEnabled: () => ({ mutate: setMock, isPending: false }),
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
  setMock.mockClear();
  prefHolder.enabled = true;
  prefHolder.isLoading = false;
  onlineHolder.value = true;
});

describe('NotificationsSettingsScreen (P2 gap D)', () => {
  it('reflects the current opt-out state', () => {
    prefHolder.enabled = false;
    const renderer = render();
    expect(sw(renderer).props.value).toBe(false);
  });

  it('persists the new value when toggled', () => {
    const renderer = render();
    act(() => {
      (sw(renderer).props.onValueChange as (v: boolean) => void)(false);
    });
    expect(setMock).toHaveBeenCalledWith(false);
  });

  it('disables the switch when offline', () => {
    onlineHolder.value = false;
    const renderer = render();
    expect(sw(renderer).props.disabled).toBe(true);
  });
});

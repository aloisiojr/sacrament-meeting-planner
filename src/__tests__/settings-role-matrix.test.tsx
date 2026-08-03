/**
 * Role matrix for the settings menu — item 5 of the coverage plan, and the gap the audit named:
 * "permissions.ts has an exhaustive role x permission map and looks excellent, but no test renders
 * any screen as observer and asserts mutating affordances are absent."
 *
 * The unit tests prove the MAP is right. These prove the UI READS it. Those are different claims,
 * and only the second one protects a ward's data from an observer.
 *
 * Deliberately driven through the real hasPermission from lib/permissions rather than a stubbed
 * predicate, so the map and the screen are checked against each other.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { hasPermission as realHasPermission } from '../lib/permissions';
import type { Role } from '../types/database';

const mockAuthState: { role: Role } = { role: 'observer' };
const mockOnline = { value: true };

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', card: '#111', text: '#fff', textSecondary: '#aaa',
      textTertiary: '#888', primary: '#07f', onPrimary: '#fff', border: '#333',
      error: '#f00', errorContainer: '#300', surfaceVariant: '#222', divider: '#333',
      inputBackground: '#111', inputBorder: '#222', placeholder: '#555',
      primaryContainer: '#013',
    },
  }),
}));
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    // Real permission logic, driven by the role under test.
    hasPermission: (p: string) =>
      (jest.requireActual('../lib/permissions') as {
        hasPermission: (r: string, p: string) => boolean;
      }).hasPermission(mockAuthState.role, p),
    wardId: 'w1',
    wardLanguage: 'pt-BR',
    user: { id: 'u1', email: 'me@ward.org' },
    userName: 'Me',
    signOut: jest.fn(),
    updateAppLanguage: jest.fn(),
    setWardLanguage: jest.fn(),
  }),
}));
jest.mock('../contexts/OnlineStatusContext', () => ({
  useOnlineStatus: () => mockOnline.value,
  OnlineStatusProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../hooks/useSpeeches', () => ({
  useWardManagePrayers: () => ({ managePrayers: false, isLoading: false }),
}));
jest.mock('@tanstack/react-query', () => ({
  useMutation: () => ({ mutate: jest.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));
jest.mock('../i18n', () => ({
  getCurrentLanguage: () => 'pt-BR',
  changeLanguage: jest.fn(),
  SUPPORTED_LANGUAGES: ['pt-BR', 'en-US', 'es-LA'],
  LANGUAGE_LABELS: { 'pt-BR': 'Português', 'en-US': 'English', 'es-LA': 'Español' },
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import SettingsScreen from '../app/(tabs)/settings/index';

async function renderAs(role: Role, online = true) {
  mockAuthState.role = role;
  mockOnline.value = online;
  await render(<SettingsScreen />);
}

/**
 * Each gated entry with the permission(s) that must ALL hold for it to render. The ward-settings
 * group is wrapped in `settings:access`, so entries inside it need that too — `member:read` alone
 * does not surface the members entry.
 */
const GATED_ENTRIES: { testID: string; permissions: string[] }[] = [
  { testID: 'settings-ward-button', permissions: ['settings:access'] },
  { testID: 'settings-members-button', permissions: ['settings:access', 'member:read'] },
  { testID: 'settings-text-templates-group', permissions: ['settings:access', 'settings:whatsapp'] },
  { testID: 'settings-notifications-button', permissions: ['push:receive'] },
];

const ROLES: Role[] = ['bishopric', 'secretary', 'observer'];

describe('settings menu — gated entries follow PERMISSIONS_MAP for every role', () => {
  for (const role of ROLES) {
    for (const { testID, permissions } of GATED_ENTRIES) {
      const allowed = permissions.every((p) => realHasPermission(role, p as never));

      it(`${role}: ${testID} is ${allowed ? 'visible' : 'hidden'} (${permissions.join(' + ')})`, async () => {
        await renderAs(role);
        const el = screen.queryByTestId(testID);
        if (allowed) {
          expect(el).not.toBeNull();
        } else {
          expect(el).toBeNull();
        }
      });
    }
  }
});

describe('settings menu — observer sees no administrative surface', () => {
  it('the whole ward-settings group is absent (no settings:access)', async () => {
    await renderAs('observer');
    expect(screen.queryByTestId('settings-ward-button')).toBeNull();
    expect(screen.queryByTestId('settings-members-button')).toBeNull();
    expect(screen.queryByTestId('settings-text-templates-group')).toBeNull();
  });

  it('holding member:read is not enough to reach the members screen from here', async () => {
    // Defence in depth: the outer settings:access gate wins. Worth pinning, because loosening the
    // outer gate would silently expose the group.
    expect(realHasPermission('observer', 'member:read' as never)).toBe(true);
    await renderAs('observer');
    expect(screen.queryByTestId('settings-members-button')).toBeNull();
  });

  it('does not see the activity history', async () => {
    await renderAs('observer');
    expect(screen.queryByText('settings.history')).toBeNull();
  });

  it('does not see notification settings', async () => {
    await renderAs('observer');
    expect(screen.queryByTestId('settings-notifications-button')).toBeNull();
  });

  it('keeps the entries every signed-in user needs', async () => {
    await renderAs('observer');
    expect(screen.queryByTestId('settings-app-language-button')).not.toBeNull();
    expect(screen.queryByTestId('settings-theme-button')).not.toBeNull();
    expect(screen.queryByTestId('settings-sign-out-button')).not.toBeNull();
  });

  it('reaches the users entry, which then restricts them to their own account', async () => {
    // Only gated by connectivity: an observer opens it to manage their own login. users.tsx gates
    // the ADMIN affordances behind settings:users — asserted separately.
    await renderAs('observer');
    expect(screen.queryByTestId('settings-users-button')).not.toBeNull();
  });
});

describe('settings menu — bishopric and secretary see the administrative entries', () => {
  it.each(['bishopric', 'secretary'] as Role[])('%s sees the ward-settings group', async (role) => {
    await renderAs(role);
    expect(screen.queryByTestId('settings-ward-button')).not.toBeNull();
    expect(screen.queryByTestId('settings-text-templates-group')).not.toBeNull();
  });

  it.each(['bishopric', 'secretary'] as Role[])('%s sees the activity history', async (role) => {
    await renderAs(role);
    expect(screen.queryByText('settings.history')).not.toBeNull();
  });
});

describe('settings menu — connectivity gates, not permission gates', () => {
  it('hides the users entry while offline, even for bishopric', async () => {
    // User management is edge-function backed, so it cannot work offline at all.
    await renderAs('bishopric', false);
    expect(screen.queryByTestId('settings-users-button')).toBeNull();
  });
});

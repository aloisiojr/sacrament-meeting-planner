/**
 * Role gates on the user-management screen — items 3 and 5.
 *
 * The audit flagged this file as the worst case in the repo: 925 lines whose only "coverage" was
 * f022-app-store-compliance doing ~45 fs.readFileSync substring assertions against its source. It
 * is also the highest-stakes screen in the app — it grants and revokes roles.
 *
 * The screen gates on the PERMISSION (settings:users), not the role, so a user without it manages
 * only their own account. These assert exactly that, driven through the real PERMISSIONS_MAP.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { hasPermission as realHasPermission } from '../lib/permissions';
import type { Role } from '../types/database';

const mockRole: { value: Role } = { value: 'observer' };
const mockUsers: { value: unknown[]; error: unknown } = { value: [], error: null };

const CURRENT_USER = { id: 'me', email: 'me@ward.org' };

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
      primaryContainer: '#013', success: '#0a0',
    },
  }),
}));
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    hasPermission: (p: string) =>
      (jest.requireActual('../lib/permissions') as {
        hasPermission: (r: string, p: string) => boolean;
      }).hasPermission(mockRole.value, p),
    user: CURRENT_USER,
    session: { access_token: 'tok' },
    userName: 'Me',
    wardId: 'w1',
  }),
}));
jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: mockUsers.value, error: mockUsers.error, isLoading: false }),
  useMutation: () => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('../lib/supabase', () => ({
  supabase: { functions: { invoke: jest.fn() }, from: jest.fn() },
}));
jest.mock('../lib/activityLog', () => ({
  logAction: jest.fn(),
  buildLogDescription: () => '',
}));
jest.mock('../components/icons', () => ({
  ChevronDownIcon: () => null,
  ChevronUpIcon: () => null,
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

import UsersScreen from '../app/(tabs)/settings/users';

const OTHER_USERS = [
  { id: 'me', email: 'me@ward.org', full_name: 'Me', role: 'observer' as Role },
  { id: 'u2', email: 'bishop@ward.org', full_name: 'Bishop Silva', role: 'bishopric' as Role },
  { id: 'u3', email: 'sec@ward.org', full_name: 'Sec Souza', role: 'secretary' as Role },
];

async function renderAs(role: Role, users = OTHER_USERS, error: unknown = null) {
  mockRole.value = role;
  mockUsers.value = users;
  mockUsers.error = error;
  await render(<UsersScreen />);
}

describe('users screen — the invite affordance follows settings:users', () => {
  it.each(['bishopric', 'secretary', 'observer'] as Role[])(
    '%s: invite button matches the permission map',
    async (role) => {
      await renderAs(role);
      const allowed = realHasPermission(role, 'settings:users' as never);
      const btn = screen.queryByTestId('users-invite-button');

      if (allowed) {
        expect(btn).not.toBeNull();
      } else {
        expect(btn).toBeNull();
      }
    }
  );

  it('observer cannot invite — the button is not merely disabled, it is absent', async () => {
    await renderAs('observer');
    expect(screen.queryByTestId('users-invite-button')).toBeNull();
  });
});

describe('users screen — an observer sees only their own account', () => {
  it('does not list other ward members', async () => {
    await renderAs('observer');

    expect(screen.queryByText('Me')).not.toBeNull();
    // Rows render full_name (email is only the fallback). The other two accounts must not be
    // reachable at all.
    expect(screen.queryByText('Bishop Silva')).toBeNull();
    expect(screen.queryByText('Sec Souza')).toBeNull();
  });

  it('falls back to its own row when the privileged query is rejected', async () => {
    // RLS refuses the full list for a non-manager; the screen must still let them manage
    // themselves rather than render an error page.
    await renderAs('observer', [], { message: 'permission denied' });
    expect(screen.queryByText('Me')).not.toBeNull();
  });

  it('does not surface the query error to a user who was never entitled to the list', async () => {
    await renderAs('observer', [], { message: 'permission denied' });
    expect(screen.queryByTestId('users-error-text')).toBeNull();
  });
});

describe('users screen — a manager sees the whole ward', () => {
  it.each(['bishopric', 'secretary'] as Role[])('%s lists every account', async (role) => {
    await renderAs(role);

    expect(screen.queryByText('Me')).not.toBeNull();
    expect(screen.queryByText('Bishop Silva')).not.toBeNull();
    expect(screen.queryByText('Sec Souza')).not.toBeNull();
  });

  it('bishopric gets the invite affordance', async () => {
    await renderAs('bishopric');
    expect(screen.queryByTestId('users-invite-button')).not.toBeNull();
  });
});

/**
 * The user-management screen — role gates AND the destructive actions.
 *
 * The audit flagged this file as the worst case in the repo: 925 lines whose only "coverage" was
 * f022-app-store-compliance doing ~45 fs.readFileSync substring assertions against its source. It
 * is also the highest-stakes screen in the app — it grants and revokes roles, and deletes accounts.
 *
 * The screen gates on the PERMISSION (settings:users), not the role, so a user without it manages
 * only their own account. These assert exactly that, driven through the real PERMISSIONS_MAP.
 *
 * useMutation is mocked to RUN the real mutationFn and its onSuccess/onError, so assertions land on
 * `supabase.functions.invoke` — which edge function was called, with which arguments. A mock that
 * returned a throwaway jest.fn() per mutation (the previous version) could not observe any of that,
 * which is why role change and delete went untested.
 */
import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { hasPermission as realHasPermission } from '../lib/permissions';
import type { Role } from '../types/database';

const mockRole: { value: Role } = { value: 'observer' };
const mockUsers: { value: unknown[]; error: unknown } = { value: [], error: null };
const mockInvoke = jest.fn();
const mockSignOut = jest.fn();
const mockRefreshSession = jest.fn();
const mockOnline = { value: true };

const CURRENT_USER = { id: 'me', email: 'me@ward.org', app_metadata: {}, created_at: '2026-01-01' };

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

/**
 * Runs the real mutationFn and its callbacks. Without this the screen's whole write path — which
 * edge function, which arguments, which alert — is invisible to the test.
 */
jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: mockUsers.value,
    error: mockUsers.error,
    isLoading: false,
    refetch: jest.fn(),
  }),
  useMutation: (options: {
    mutationFn: (v: unknown) => Promise<unknown>;
    onSuccess?: (d: unknown, v: unknown) => void;
    onError?: (e: unknown, v: unknown, c: unknown) => void;
  }) => ({
    mutate: (vars: unknown) =>
      options
        .mutationFn(vars)
        .then((data) => options.onSuccess?.(data, vars))
        .catch((err) => options.onError?.(err, vars, undefined)),
    mutateAsync: (vars: unknown) => options.mutationFn(vars),
    isPending: false,
    reset: jest.fn(),
  }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('../contexts/OnlineStatusContext', () => ({
  useOnlineStatus: () => mockOnline.value,
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
// Indirected through arrows on purpose: `import UsersScreen` below is hoisted above the `const
// mockInvoke = jest.fn()` declarations, so binding them directly here would capture undefined.
jest.mock('../lib/supabase', () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
    auth: {
      refreshSession: (...args: unknown[]) => mockRefreshSession(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
    from: jest.fn(),
  },
}));
// offlineGuard imports the i18n instance at module load, which would boot i18next for real.
jest.mock('../i18n', () => ({
  __esModule: true,
  default: { t: (k: string) => k },
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

/** Expand a user's card by pressing its row; the destructive controls live inside. */
async function expandCard(displayName: string) {
  await act(async () => {
    fireEvent.press(screen.getByText(displayName));
  });
}

/**
 * The role-selector option for `role`, inside the expanded card.
 *
 * Querying by text alone is ambiguous: every collapsed row also prints its own role label in the
 * header, so `getByText('roles.bishopric')` can match a row you are not acting on.
 */
function roleOption(role: Role) {
  const option = screen
    .getAllByRole('radio')
    .find((r) => within(r).queryByText(`roles.${role}`) !== null);
  if (!option) throw new Error(`No role option rendered for ${role}`);
  return option;
}

/** Alert.alert's last invocation, as [title, message, buttons]. */
function lastAlert(spy: jest.SpyInstance) {
  return spy.mock.calls[spy.mock.calls.length - 1];
}

let alertSpy: jest.SpyInstance;

beforeEach(() => {
  mockInvoke.mockReset();
  mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
  mockRefreshSession.mockReset();
  mockRefreshSession.mockResolvedValue({
    data: { session: { access_token: 'tok' } },
    error: null,
  });
  mockSignOut.mockReset();
  mockOnline.value = true;
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  alertSpy.mockRestore();
});

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
    // The error block is `usersError && canManageUsers`. For an observer the failure is expected,
    // so showing "could not load users" would be alarming and wrong. Assert the real rendered
    // string, not a testID the screen does not have.
    await renderAs('observer', [], { message: 'permission denied' });
    expect(screen.queryByText('users.loadError')).toBeNull();
    expect(screen.queryByText('common.retry')).toBeNull();
  });

  it('does surface the error to a manager, who was entitled to it', async () => {
    // The counterpart that makes the assertion above meaningful: deleting `canManageUsers` from
    // that condition must break something.
    await renderAs('bishopric', [], { message: 'permission denied' });
    expect(screen.queryByText('users.loadError')).not.toBeNull();
    expect(screen.queryByText('common.retry')).not.toBeNull();
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

describe('users screen — changing another user\'s role', () => {
  it('calls update-user-role with the target and the new role', async () => {
    await renderAs('bishopric');
    await expandCard('Bishop Silva');

    await act(async () => {
      fireEvent.press(roleOption('observer'));
    });

    expect(mockInvoke).toHaveBeenCalledWith('update-user-role', {
      body: { targetUserId: 'u2', newRole: 'observer' },
    });
  });

  it('refreshes the session before calling the edge function (ADR-028)', async () => {
    // An expired access token makes the edge function 401. The guard must run FIRST, not after.
    await renderAs('bishopric');
    await expandCard('Bishop Silva');

    await act(async () => {
      fireEvent.press(roleOption('observer'));
    });

    expect(mockRefreshSession).toHaveBeenCalled();
    expect(mockRefreshSession.mock.invocationCallOrder[0]).toBeLessThan(
      mockInvoke.mock.invocationCallOrder[0]
    );
  });

  it('does not call the edge function when the role is unchanged', async () => {
    // Pressing the already-selected role is a no-op, not a redundant privileged write.
    await renderAs('bishopric');
    await expandCard('Bishop Silva');

    await act(async () => {
      fireEvent.press(roleOption('bishopric'));
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('reports the last-bishopric refusal with its own message, not the generic one', async () => {
    // Demoting the last bishopric would lock the ward out of its own administration. The server
    // enforces it; the screen must explain it rather than saying "role change failed".
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'cannot_demote_last_bishopric' },
    });
    await renderAs('bishopric');
    await expandCard('Bishop Silva');

    await act(async () => {
      fireEvent.press(roleOption('observer'));
    });

    expect(lastAlert(alertSpy)[1]).toBe('users.lastBishopricWarning');
  });

  it('reports the own-role refusal with its own message', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'cannot_change_own_role' } });
    await renderAs('bishopric');
    await expandCard('Bishop Silva');

    await act(async () => {
      fireEvent.press(roleOption('observer'));
    });

    expect(lastAlert(alertSpy)[1]).toBe('users.cannotChangeOwnRole');
  });

  it('falls back to the generic message for an unrecognised failure', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await renderAs('bishopric');
    await expandCard('Bishop Silva');

    await act(async () => {
      fireEvent.press(roleOption('observer'));
    });

    expect(lastAlert(alertSpy)[1]).toBe('users.roleChangeFailed');
  });

  it('offers no role selector on your own card — you cannot promote yourself', async () => {
    // The privilege-escalation guard. It is structural (`!isSelf`), which is stronger than the
    // runtime check in handleRoleChange, so pin the structure.
    await renderAs('bishopric', [OTHER_USERS[0]]);
    await expandCard('Me');

    // No radios at all on your own expanded card, and no selector row label.
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.queryByText('users.role')).toBeNull();
    // The delete control IS there, so this is not just "the card failed to expand".
    expect(screen.queryByLabelText('users.deleteMyAccount')).not.toBeNull();
  });
});

describe('users screen — deleting an account', () => {
  /** Press the confirm button of the last Alert (index 1 — index 0 is Cancel). */
  async function confirmLastAlert() {
    const buttons = lastAlert(alertSpy)[2] as { text: string; onPress?: () => void }[];
    await act(async () => {
      buttons[1].onPress?.();
    });
  }

  it('asks for confirmation before deleting and does nothing until it is given', async () => {
    await renderAs('bishopric');
    await expandCard('Bishop Silva');

    await act(async () => {
      fireEvent.press(screen.getByLabelText('users.deleteUser'));
    });

    expect(alertSpy).toHaveBeenCalled();
    // Confirmation pending: no destructive call yet.
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('calls delete-user with the target id once confirmed', async () => {
    await renderAs('bishopric');
    await expandCard('Bishop Silva');

    await act(async () => {
      fireEvent.press(screen.getByLabelText('users.deleteUser'));
    });
    await confirmLastAlert();

    expect(mockInvoke).toHaveBeenCalledWith('delete-user', { body: { targetUserId: 'u2' } });
  });

  it('cancelling deletes nothing', async () => {
    await renderAs('bishopric');
    await expandCard('Bishop Silva');

    await act(async () => {
      fireEvent.press(screen.getByLabelText('users.deleteUser'));
    });
    const buttons = lastAlert(alertSpy)[2] as { text: string; style?: string }[];
    expect(buttons[0].style).toBe('cancel');

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('signs you out after you delete your own account', async () => {
    // Leaving a session alive against a deleted user leaves the app in an unrecoverable state.
    await renderAs('observer', [OTHER_USERS[0]]);
    await expandCard('Me');

    await act(async () => {
      fireEvent.press(screen.getByLabelText('users.deleteMyAccount'));
    });
    await confirmLastAlert();

    expect(mockInvoke).toHaveBeenCalledWith('delete-user', { body: { targetUserId: 'me' } });
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('does not sign you out when you delete someone else', async () => {
    await renderAs('bishopric');
    await expandCard('Bishop Silva');

    await act(async () => {
      fireEvent.press(screen.getByLabelText('users.deleteUser'));
    });
    await confirmLastAlert();

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('warns you when deleting your own account would leave the ward with no users', async () => {
    await renderAs('observer', [OTHER_USERS[0]]);
    await expandCard('Me');

    await act(async () => {
      fireEvent.press(screen.getByLabelText('users.deleteMyAccount'));
    });

    expect(lastAlert(alertSpy)[1]).toBe('users.deleteAccountLastMemberWarning');
  });

  it('uses the ordinary confirmation when other users remain', async () => {
    await renderAs('bishopric');
    await expandCard('Me');

    await act(async () => {
      fireEvent.press(screen.getByLabelText('users.deleteMyAccount'));
    });

    expect(lastAlert(alertSpy)[1]).toBe('users.deleteAccountConfirm');
  });

  it('reports a failed deletion instead of pretending it worked', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await renderAs('bishopric');
    await expandCard('Bishop Silva');

    await act(async () => {
      fireEvent.press(screen.getByLabelText('users.deleteUser'));
    });
    await confirmLastAlert();

    expect(lastAlert(alertSpy)[1]).toBe('users.deleteFailed');
  });
});

describe('users screen — inviting a user', () => {
  async function openInviteAndSubmit(email = 'new@ward.org') {
    await act(async () => {
      fireEvent.press(screen.getByTestId('users-invite-button'));
    });
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('users-invite-email-input'), email);
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('users-invite-submit-button'));
    });
  }

  it('creates the invitation with the typed email and the selected role', async () => {
    mockInvoke.mockResolvedValue({
      data: { invitation: { deepLink: 'smp://invite/abc' } },
      error: null,
    });
    await renderAs('bishopric');
    await act(async () => {
      fireEvent.press(screen.getByTestId('users-invite-button'));
    });
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('users-invite-email-input'), 'new@ward.org');
      fireEvent.press(screen.getByTestId('users-invite-role-secretary-radio'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('users-invite-submit-button'));
    });

    expect(mockInvoke).toHaveBeenCalledWith('create-invitation', {
      body: { email: 'new@ward.org', role: 'secretary' },
    });
  });

  it('shows the deep link so it can be shared', async () => {
    mockInvoke.mockResolvedValue({
      data: { invitation: { deepLink: 'smp://invite/abc' } },
      error: null,
    });
    await renderAs('bishopric');
    await openInviteAndSubmit();

    expect(screen.queryByTestId('users-invite-link-text')).toHaveTextContent('smp://invite/abc');
  });

  it('reports a failed invitation with the i18n key, never the raw server message', async () => {
    // Raw messages leak internals and are untranslated. Replaces a source-text assertion in
    // f060-f061-f062 that only checked the literal `t('users.inviteFailed')` appeared in the file.
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'PGRST301 jwt malformed' } });
    await renderAs('bishopric');
    await openInviteAndSubmit();

    expect(lastAlert(alertSpy)[1]).toBe('users.inviteFailed');
    expect(lastAlert(alertSpy)[1]).not.toContain('jwt malformed');
    expect(screen.queryByTestId('users-invite-link-text')).toBeNull();
  });

  it('reports an expired session distinctly from a failed invitation', async () => {
    mockRefreshSession.mockResolvedValue({ data: { session: null }, error: null });
    await renderAs('bishopric');
    await openInviteAndSubmit();

    expect(lastAlert(alertSpy)[1]).toBe('users.sessionExpired');
  });

  it('does not call the server for an empty email', async () => {
    await renderAs('bishopric');
    await act(async () => {
      fireEvent.press(screen.getByTestId('users-invite-button'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId('users-invite-submit-button'));
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe('users screen — offline is reported as offline, not as a generic failure', () => {
  // lib/offlineGuard shipped throwIfOffline and ONLINE_ONLY_OPERATIONS, and nothing called them:
  // every user-management action offline produced "role change failed" / "delete failed", which
  // sends the user looking for a permission problem instead of a connection.

  it('does not even attempt a role change while offline', async () => {
    mockOnline.value = false;
    await renderAs('bishopric');
    await expandCard('Bishop Silva');

    await act(async () => {
      fireEvent.press(roleOption('observer'));
    });

    expect(mockRefreshSession).not.toHaveBeenCalled();
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(lastAlert(alertSpy)[1]).toBe('auth.requiresConnection');
  });

  it('does not even attempt a delete while offline', async () => {
    mockOnline.value = false;
    await renderAs('bishopric');
    await expandCard('Bishop Silva');

    await act(async () => {
      fireEvent.press(screen.getByLabelText('users.deleteUser'));
    });
    const buttons = lastAlert(alertSpy)[2] as { onPress?: () => void }[];
    await act(async () => {
      buttons[1].onPress?.();
    });

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(lastAlert(alertSpy)[1]).toBe('auth.requiresConnection');
  });

  it('still says "failed" for a genuine server refusal, not "reconnect"', async () => {
    // The counterpart: the offline branch must not swallow real errors.
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await renderAs('bishopric');
    await expandCard('Bishop Silva');

    await act(async () => {
      fireEvent.press(roleOption('observer'));
    });

    expect(lastAlert(alertSpy)[1]).toBe('users.roleChangeFailed');
  });
});

describe('users screen — an expired session is reported, not swallowed', () => {
  it('does not call the edge function when the session cannot be refreshed', async () => {
    mockRefreshSession.mockResolvedValue({ data: { session: null }, error: null });
    await renderAs('bishopric');
    await expandCard('Bishop Silva');

    await act(async () => {
      fireEvent.press(roleOption('observer'));
    });

    expect(mockInvoke).not.toHaveBeenCalled();
    expect(lastAlert(alertSpy)[1]).toBe('users.roleChangeFailed');
  });
});

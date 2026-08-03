/**
 * Role matrix for the settings menu — the gap the audit named: "permissions.ts has an exhaustive
 * role x permission map and looks excellent, but no test renders any screen as observer and
 * asserts mutating affordances are absent."
 *
 * The unit tests prove the MAP is right. These prove the UI READS it. Those are different claims,
 * and only the second one protects a ward's data from an observer.
 *
 * Two layers, because neither alone is enough:
 *
 *  1. REAL ROLES — hasPermission comes from lib/permissions, so the map and the screen are checked
 *     against each other. This catches "the screen gates on the wrong permission".
 *
 *  2. SYNTHETIC PERMISSION SETS — an explicit Set, so each gate's boolean SHAPE can be exercised
 *     independently of which combinations the three shipped roles happen to have. Layer 1 cannot
 *     do this: no real role holds settings:access without member:read, so the `member:read` half
 *     of the members gate was deletable with every role test still green. Likewise the text
 *     templates group is `settings:access && (whatsapp || designations)` — an OR that no pair of
 *     real roles distinguishes, and which the previous version of this file modelled as an AND.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { hasPermission as realHasPermission } from '../lib/permissions';
import type { Role } from '../types/database';

/** Either drive hasPermission from a real role, or from an explicit set of permissions. */
const mockAuthState: { role: Role; permissions: Set<string> | null } = {
  role: 'observer',
  permissions: null,
};
const mockOnline = { value: true };
const mockPush = jest.fn();

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
const mockUpdateAppLanguage = jest.fn();

jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    hasPermission: (p: string) =>
      mockAuthState.permissions
        ? mockAuthState.permissions.has(p)
        : (jest.requireActual('../lib/permissions') as {
            hasPermission: (r: string, p: string) => boolean;
          }).hasPermission(mockAuthState.role, p),
    wardId: 'w1',
    wardLanguage: 'pt-BR',
    user: { id: 'u1', email: 'me@ward.org' },
    userName: 'Me',
    signOut: jest.fn(),
    updateAppLanguage: (...a: unknown[]) => mockUpdateAppLanguage(...a),
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
  useRouter: () => ({ push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn() }),
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
  mockAuthState.permissions = null;
  mockOnline.value = online;
  await render(<SettingsScreen />);
}

async function renderWith(permissions: string[], online = true) {
  mockAuthState.permissions = new Set(permissions);
  mockOnline.value = online;
  await render(<SettingsScreen />);
}

beforeEach(() => {
  mockAuthState.permissions = null;
  mockOnline.value = true;
  mockPush.mockReset();
  mockUpdateAppLanguage.mockReset();
  mockUpdateAppLanguage.mockResolvedValue(undefined);
});

describe('settings menu — changing the app language', () => {
  /** Open the app-language picker and choose `lang`. */
  async function chooseLanguage(lang: string) {
    await act(async () => {
      fireEvent.press(screen.getByTestId('settings-app-language-button'));
    });
    await act(async () => {
      fireEvent.press(screen.getByTestId(`settings-app-language-${lang}-option`));
    });
  }

  it('persists a different language', async () => {
    await renderAs('observer');
    await chooseLanguage('en-US');

    expect(mockUpdateAppLanguage).toHaveBeenCalledWith('en-US');
  });

  it('does nothing when the chosen language is the one already active', async () => {
    // The mocked i18n reports pt-BR as current. Re-selecting it must not write to user_metadata:
    // that is a pointless round-trip that can also raise a spurious "language change failed".
    await renderAs('observer');
    await chooseLanguage('pt-BR');

    expect(mockUpdateAppLanguage).not.toHaveBeenCalled();
  });

  it('closes the picker either way', async () => {
    await renderAs('observer');
    await chooseLanguage('pt-BR');

    expect(screen.queryByTestId('settings-app-language-en-US-option')).toBeNull();
  });

  it('reports a failed change instead of leaving the UI in the old language silently', async () => {
    mockUpdateAppLanguage.mockRejectedValue(new Error('boom'));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await renderAs('observer');
    await chooseLanguage('en-US');
    const call = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
    alertSpy.mockRestore();

    expect(call?.[1]).toBe('settings.languageChangeFailed');
  });
});

describe('settings menu — entries navigate where they say they do', () => {
  it.each([
    ['settings-users-button', '/(tabs)/settings/users'],
    ['settings-ward-button', '/(tabs)/settings/ward'],
    ['settings-members-button', '/(tabs)/settings/members'],
  ])('%s pushes %s', async (testID, route) => {
    await renderAs('bishopric');
    await act(async () => {
      fireEvent.press(screen.getByTestId(testID));
    });
    expect(mockPush).toHaveBeenCalledWith(route);
  });
});

// ---------------------------------------------------------------------------
// Layer 1 — the three shipped roles, against the real PERMISSIONS_MAP
// ---------------------------------------------------------------------------

/**
 * Each gated entry and the predicate production applies, transcribed from settings/index.tsx.
 * The ward-settings group is wrapped in `settings:access`, so entries inside it need that too.
 */
const GATED_ENTRIES: { testID: string; gate: (has: (p: string) => boolean) => boolean; desc: string }[] = [
  {
    testID: 'settings-ward-button',
    gate: (has) => has('settings:access'),
    desc: 'settings:access',
  },
  {
    testID: 'settings-members-button',
    gate: (has) => has('settings:access') && has('member:read'),
    desc: 'settings:access AND member:read',
  },
  {
    testID: 'settings-text-templates-group',
    // An OR inside the group's AND — not an AND, which is what this file used to claim.
    gate: (has) => has('settings:access') && (has('settings:whatsapp') || has('settings:designations')),
    desc: 'settings:access AND (settings:whatsapp OR settings:designations)',
  },
  {
    testID: 'settings-notifications-button',
    gate: (has) => has('push:receive'),
    desc: 'push:receive',
  },
];

const ROLES: Role[] = ['bishopric', 'secretary', 'observer'];

describe('settings menu — gated entries follow PERMISSIONS_MAP for every role', () => {
  for (const role of ROLES) {
    for (const { testID, gate, desc } of GATED_ENTRIES) {
      const has = (p: string) => realHasPermission(role, p as never);
      const allowed = gate(has);

      it(`${role}: ${testID} is ${allowed ? 'visible' : 'hidden'} (${desc})`, async () => {
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

// ---------------------------------------------------------------------------
// Layer 2 — synthetic permission sets, one per boolean edge
// ---------------------------------------------------------------------------

describe('settings menu — the members entry needs BOTH halves of its gate', () => {
  it('is visible with settings:access AND member:read', async () => {
    await renderWith(['settings:access', 'member:read']);
    expect(screen.queryByTestId('settings-members-button')).not.toBeNull();
  });

  it('is hidden with settings:access but no member:read', async () => {
    // No shipped role is in this state, which is exactly why role-driven tests could not pin it:
    // deleting `hasPermission('member:read') &&` from the screen left every one of them green.
    await renderWith(['settings:access']);
    expect(screen.queryByTestId('settings-members-button')).toBeNull();
    // The group itself is still there, so this is not "the whole group disappeared".
    expect(screen.queryByTestId('settings-ward-button')).not.toBeNull();
  });

  it('is hidden with member:read but no settings:access', async () => {
    await renderWith(['member:read']);
    expect(screen.queryByTestId('settings-members-button')).toBeNull();
  });
});

describe('settings menu — the text-templates group is an OR inside the group gate', () => {
  it('appears with settings:whatsapp alone', async () => {
    await renderWith(['settings:access', 'settings:whatsapp']);
    expect(screen.queryByTestId('settings-text-templates-group')).not.toBeNull();
  });

  it('appears with settings:designations alone — the OR branch', async () => {
    // Modelling this gate as an AND (the previous version of this file did) asserts the opposite
    // and would demand the group be hidden here.
    await renderWith(['settings:access', 'settings:designations']);
    expect(screen.queryByTestId('settings-text-templates-group')).not.toBeNull();
  });

  it('is absent with neither', async () => {
    await renderWith(['settings:access']);
    expect(screen.queryByTestId('settings-text-templates-group')).toBeNull();
  });

  it('is absent without settings:access, however many template permissions are held', async () => {
    await renderWith(['settings:whatsapp', 'settings:designations']);
    expect(screen.queryByTestId('settings-text-templates-group')).toBeNull();
  });

  it('expands to only the items the holder is entitled to', async () => {
    // Holding the group's OR does not entitle you to both of its children.
    await renderWith(['settings:access', 'settings:whatsapp']);
    await act(async () => {
      fireEvent.press(screen.getByTestId('settings-text-templates-group'));
    });

    expect(screen.queryByTestId('settings-whatsapp-item')).not.toBeNull();
    expect(screen.queryByTestId('settings-designations-item')).toBeNull();
  });

  it('expands to the designations item for the other branch', async () => {
    await renderWith(['settings:access', 'settings:designations']);
    await act(async () => {
      fireEvent.press(screen.getByTestId('settings-text-templates-group'));
    });

    expect(screen.queryByTestId('settings-designations-item')).not.toBeNull();
    expect(screen.queryByTestId('settings-whatsapp-item')).toBeNull();
  });

  it('keeps both items collapsed until the group is pressed', async () => {
    await renderWith(['settings:access', 'settings:whatsapp', 'settings:designations']);
    expect(screen.queryByTestId('settings-whatsapp-item')).toBeNull();
    expect(screen.queryByTestId('settings-designations-item')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Observer — the role that must see no administrative surface
// ---------------------------------------------------------------------------

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
    // the ADMIN affordances behind settings:users — asserted in users-screen-role-gates.
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

describe('settings menu — history follows history:read, not the ward-settings group', () => {
  it('is visible with history:read alone', async () => {
    await renderWith(['history:read']);
    expect(screen.queryByText('settings.history')).not.toBeNull();
  });

  it('is hidden with the whole ward-settings group but no history:read', async () => {
    await renderWith(['settings:access', 'member:read', 'settings:whatsapp']);
    expect(screen.queryByText('settings.history')).toBeNull();
  });
});

describe('settings menu — connectivity gates, not permission gates', () => {
  it('hides the users entry while offline, even for bishopric', async () => {
    // User management is edge-function backed, so it cannot work offline at all.
    await renderAs('bishopric', false);
    expect(screen.queryByTestId('settings-users-button')).toBeNull();
  });

  it('shows the users entry offline to nobody, regardless of permissions', async () => {
    await renderWith(['settings:access', 'settings:users'], false);
    expect(screen.queryByTestId('settings-users-button')).toBeNull();
  });

  it('still shows the ward-settings group offline — those screens read cached data', async () => {
    // Connectivity gates only what genuinely needs the network. Hiding everything offline would
    // make the app useless in a chapel basement, which is where it is used.
    await renderAs('bishopric', false);
    expect(screen.queryByTestId('settings-ward-button')).not.toBeNull();
  });

  // The three assertions below replace f052-settings-offline.test.ts, which was deleted. That file
  // defined `function usersItemVisible(a, b) { return a && b }` and then asserted it — 20 blocks
  // that never touched the screen. It also modelled the users entry as
  // `hasPermission('settings:users') && isOnline`; production gates it on connectivity alone, so
  // the file simultaneously proved nothing and described the wrong app.

  it('disables the ward write-settings entries offline instead of hiding them', async () => {
    // Visible-but-disabled is the deliberate choice: the user can see the setting exists and that
    // it needs a connection, rather than wondering where it went.
    await renderWith(['settings:access', 'settings:whatsapp', 'settings:designations'], false);
    await act(async () => {
      fireEvent.press(screen.getByTestId('settings-text-templates-group'));
    });

    expect(screen.getByTestId('settings-whatsapp-item')).toBeDisabled();
    expect(screen.getByTestId('settings-designations-item')).toBeDisabled();
  });

  it('enables those same entries when online', async () => {
    await renderWith(['settings:access', 'settings:whatsapp', 'settings:designations'], true);
    await act(async () => {
      fireEvent.press(screen.getByTestId('settings-text-templates-group'));
    });

    expect(screen.getByTestId('settings-whatsapp-item')).toBeEnabled();
    expect(screen.getByTestId('settings-designations-item')).toBeEnabled();
  });

  it('disables the ward-language control offline — it is a server write', async () => {
    await renderWith(['settings:access', 'settings:language'], false);
    expect(screen.getByText('settings.wardLanguage')).toBeDisabled();
  });

  it('keeps the purely local entries usable offline', async () => {
    // App language, theme and sign-out touch nothing on the server.
    await renderAs('bishopric', false);
    expect(screen.getByTestId('settings-app-language-button')).toBeEnabled();
    expect(screen.getByTestId('settings-theme-button')).toBeEnabled();
    expect(screen.getByTestId('settings-sign-out-button')).toBeEnabled();
  });

  it('keeps the activity history reachable offline — it reads the cache', async () => {
    await renderWith(['history:read'], false);
    expect(screen.queryByText('settings.history')).not.toBeNull();
  });
});

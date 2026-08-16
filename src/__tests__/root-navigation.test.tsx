/**
 * The REAL root layout must provide a navigation stack (specs/root-navigation-stack.md).
 *
 * With `<Slot />` there is no history at the root: opening a route outside `(tabs)` unmounts the
 * whole tab group, so `router.back()` has nothing to pop and the app lands on the first tab — with
 * the tab's local state (which agenda card is expanded) gone. That was the reported bug: saving a
 * designation dropped the user on Home with the card closed.
 *
 * `src/app/_layout.tsx` itself is mounted here — mocking a Stack into the route map would make
 * these tests pass no matter what the app does. Its providers are stubbed to passthroughs because
 * the property under test belongs to the navigator, not to auth, sync, theming or React Query. The
 * child routes mirror the app's SHAPE (a `(tabs)` group plus a sibling route at the root) rather
 * than being the real screens, which would drag in Supabase and notifications.
 */
import React from 'react';
import { Text } from 'react-native';
import { router, Tabs } from 'expo-router';
import { screen, act, fireEvent } from 'expo-router/testing-library';

import { renderApp } from './helpers/renderApp';

jest.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children?: React.ReactNode }) => children,
  useAuth: () => ({ session: { user: { id: 'u1' } }, loading: false }),
}));
jest.mock('../contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children?: React.ReactNode }) => children,
  useTheme: () => ({ mode: 'light', colors: { background: '#fff', primary: '#07f' } }),
}));
jest.mock('../providers/SyncProvider', () => ({
  SyncProvider: ({ children }: { children?: React.ReactNode }) => children,
}));
jest.mock('../components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children?: React.ReactNode }) => children,
}));
jest.mock('../components/UpdateRequiredScreen', () => ({ UpdateRequiredScreen: () => null }));
jest.mock('../hooks/useVersionGate', () => ({ useVersionGate: () => 'ok' }));
jest.mock('@tanstack/react-query-persist-client', () => ({
  PersistQueryClientProvider: ({ children }: { children?: React.ReactNode }) => children,
}));
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: { children?: React.ReactNode }) => children,
}));

const RootLayout = require('../app/_layout').default as React.ComponentType;

// renderRouter turns on fake timers and never turns them back off.
afterEach(() => {
  jest.useRealTimers();
});

/** A tab screen holding local state, like the real Agendas tab's expanded card. */
function AgendaTab() {
  const [expandedDate, setExpandedDate] = React.useState<string | null>(null);
  return (
    <>
      <Text testID="agenda-card" onPress={() => setExpandedDate('2026-01-04')}>
        4 de janeiro
      </Text>
      {expandedDate === '2026-01-04' ? (
        <Text testID="agenda-card-body">Apoios e desobrigações</Text>
      ) : null}
    </>
  );
}

const ROUTES = {
  _layout: RootLayout,
  // A layout route must render a navigator; expo-router does not pass `children` to it.
  '(tabs)/_layout': () => <Tabs screenOptions={{ headerShown: false }} />,
  '(tabs)/index': () => <Text testID="home">Home</Text>,
  '(tabs)/agenda': AgendaTab,
  'designations/[date]': () => <Text testID="designations">Editar apoio</Text>,
};

describe('the real root layout keeps a navigation stack', () => {
  it('going back from a sibling route returns to the route it came from', async () => {
    const app = await renderApp(ROUTES, { initialUrl: '/agenda' });
    expect(app.getPathname()).toBe('/agenda');

    await act(async () => {
      router.push('/designations/2026-01-04');
    });
    expect(app.getPathname()).toBe('/designations/2026-01-04');

    await act(async () => {
      router.back();
    });

    // With a bare Slot at the root this lands on the first tab instead.
    expect(app.getPathname()).toBe('/agenda');
  });

  it("preserves the tab's own state, so the expanded card is still open on return", async () => {
    const app = await renderApp(ROUTES, { initialUrl: '/agenda' });

    await act(async () => {
      fireEvent.press(screen.getByTestId('agenda-card'));
    });
    expect(screen.getByTestId('agenda-card-body')).toBeVisible();

    await act(async () => {
      router.push('/designations/2026-01-04');
    });
    await act(async () => {
      router.back();
    });

    // The tab was never unmounted, so its useState survived — this is what the user actually sees.
    expect(app.getPathname()).toBe('/agenda');
    expect(screen.getByTestId('agenda-card-body')).toBeVisible();
  });
});

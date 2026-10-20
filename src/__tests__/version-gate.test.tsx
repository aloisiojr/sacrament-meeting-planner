/**
 * Version gate (spec: specs/v1x-version-gate.md; honest-gate behavior: specs/cutover-gate.md
 * CONF-08 — first resolution wins, foreground recheck, missing version fails open logged).
 */
import React from 'react';
import { AppState } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { useVersionGate, type VersionGateStatus } from '../hooks/useVersionGate';
import { UpdateRequiredScreen } from '../components/UpdateRequiredScreen';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The gate reads Constants.expoConfig?.version. jest-expo does not populate expoConfig, so
// without this pin every test would exercise the missing-version path. Mutable so tests can
// also simulate a build with no version at all.
let mockExpoConfig: { version?: string } | null = { version: '2.0.0' };
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockExpoConfig;
    },
  },
}));

const mockInvokeMock = jest.fn();
jest.mock('../lib/supabase', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvokeMock(...args) } },
}));

// Capture the AppState listener so tests can drive foreground/background transitions
// (spying on the real AppState avoids re-mocking the whole react-native module).
let mockAppStateListener: ((state: string) => void) | null = null;

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { background: '#000', text: '#fff', textSecondary: '#aaa', primary: '#07f', onPrimary: '#fff' },
  }),
}));

function mountProbe() {
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _event: string,
    cb: (state: string) => void
  ) => {
    mockAppStateListener = cb;
    return { remove: () => { mockAppStateListener = null; } };
  }) as never);
  let status: VersionGateStatus = 'checking';
  function Probe() {
    status = useVersionGate();
    return null;
  }
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(Probe));
  });
  return {
    get status() {
      return status;
    },
    async flush() {
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
    },
    unmount() {
      act(() => renderer.unmount());
    },
  };
}

describe('useVersionGate', () => {
  beforeEach(() => {
    mockInvokeMock.mockReset();
    mockExpoConfig = { version: '2.0.0' };
    mockAppStateListener = null;
  });

  it('blocks when the app version is below the minimum', async () => {
    mockInvokeMock.mockResolvedValue({ data: { min_supported_version: '2.1.0' }, error: null });
    const probe = mountProbe();
    await probe.flush();
    expect(probe.status).toBe('blocked');
    probe.unmount();
  });

  it('allows when at or above the minimum', async () => {
    mockInvokeMock.mockResolvedValue({ data: { min_supported_version: '2.0.0' }, error: null });
    const probe = mountProbe();
    await probe.flush();
    expect(probe.status).toBe('ok');
    probe.unmount();
  });

  it('fails open when the config call returns an error', async () => {
    mockInvokeMock.mockResolvedValue({ data: null, error: { message: 'offline' } });
    const probe = mountProbe();
    await probe.flush();
    expect(probe.status).toBe('ok');
    probe.unmount();
  });

  it('first resolution wins: a late blocked never overrides the 4s fail-open (CONF-08)', async () => {
    jest.useFakeTimers();
    try {
      let resolveInvoke!: (v: unknown) => void;
      mockInvokeMock.mockReturnValue(new Promise((r) => { resolveInvoke = r; }));
      const probe = mountProbe();
      act(() => { jest.advanceTimersByTime(4000); });
      expect(probe.status).toBe('ok');
      await act(async () => {
        resolveInvoke({ data: { min_supported_version: '9.9.9' }, error: null });
        await Promise.resolve();
      });
      expect(probe.status).toBe('ok');
      probe.unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it('first resolution wins: a fast blocked is not overridden by the timer (CONF-08)', async () => {
    jest.useFakeTimers();
    try {
      mockInvokeMock.mockResolvedValue({ data: { min_supported_version: '2.1.0' }, error: null });
      const probe = mountProbe();
      await act(async () => { await Promise.resolve(); await Promise.resolve(); });
      expect(probe.status).toBe('blocked');
      act(() => { jest.advanceTimersByTime(10000); });
      expect(probe.status).toBe('blocked');
      probe.unmount();
    } finally {
      jest.useRealTimers();
    }
  });

  it('rechecks when the app returns to the foreground, not on background (CONF-08)', async () => {
    mockInvokeMock.mockResolvedValue({ data: { min_supported_version: '2.0.0' }, error: null });
    const probe = mountProbe();
    await probe.flush();
    expect(probe.status).toBe('ok');
    expect(mockInvokeMock).toHaveBeenCalledTimes(1);

    act(() => { mockAppStateListener?.('background'); });
    expect(mockInvokeMock).toHaveBeenCalledTimes(1);

    // The minimum was raised while the app sat in the background (cutover window).
    mockInvokeMock.mockResolvedValue({ data: { min_supported_version: '3.0.0' }, error: null });
    act(() => { mockAppStateListener?.('active'); });
    await probe.flush();
    expect(mockInvokeMock).toHaveBeenCalledTimes(2);
    expect(probe.status).toBe('blocked');
    probe.unmount();
  });

  it.each([
    ['expoConfig null', null],
    ['version missing', {}],
  ])('fails open explicitly and logged when %s — never a 0.0.0 block (CONF-08)', async (_label, cfg) => {
    mockExpoConfig = cfg as { version?: string } | null;
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const probe = mountProbe();
    await probe.flush();
    expect(probe.status).toBe('ok');
    expect(mockInvokeMock).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[VersionGate]'));
    warn.mockRestore();
    probe.unmount();
  });
});

describe('UpdateRequiredScreen', () => {
  it('renders the update title', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(React.createElement(UpdateRequiredScreen));
    });
    expect(JSON.stringify(renderer.toJSON())).toContain('update.title');
  });
});

/**
 * Version gate (spec: specs/v1x-version-gate.md). `react-native` is aliased to a stub (vitest.config).
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { useVersionGate, type VersionGateStatus } from '../hooks/useVersionGate';
import { UpdateRequiredScreen } from '../components/UpdateRequiredScreen';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// App build is '1.0.0' in every test; we vary min_supported_version via the mocked edge call.
jest.mock('expo-constants', () => ({ default: { expoConfig: { version: '1.0.0' } } }));

const mockInvokeMock = jest.fn();
jest.mock('../lib/supabase', () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvokeMock(...args) } },
}));

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { background: '#000', text: '#fff', textSecondary: '#aaa', primary: '#07f', onPrimary: '#fff' },
  }),
}));

async function resolveStatus(): Promise<VersionGateStatus> {
  let status: VersionGateStatus = 'checking';
  function Probe() {
    status = useVersionGate();
    return null;
  }
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(Probe));
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  act(() => renderer.unmount());
  return status;
}

describe('useVersionGate', () => {
  beforeEach(() => mockInvokeMock.mockReset());

  it('blocks when the app version is below the minimum', async () => {
    mockInvokeMock.mockResolvedValue({ data: { min_supported_version: '2.0.0' }, error: null });
    expect(await resolveStatus()).toBe('blocked');
  });

  it('allows when at or above the minimum', async () => {
    mockInvokeMock.mockResolvedValue({ data: { min_supported_version: '1.0.0' }, error: null });
    expect(await resolveStatus()).toBe('ok');
  });

  it('fails open when the config call returns an error', async () => {
    mockInvokeMock.mockResolvedValue({ data: null, error: { message: 'offline' } });
    expect(await resolveStatus()).toBe('ok');
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

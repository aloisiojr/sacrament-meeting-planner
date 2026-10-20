/**
 * EST-23 — erro ao registrar token de push vira health event e não marca como registrado.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';
import { Text } from 'react-native';

const mockUpsert = jest.fn();
const mockReportHealthEvent = jest.fn(() => Promise.resolve());
const mockUser = { id: 'u1' };

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: () => Promise.resolve({ status: 'granted' }),
  requestPermissionsAsync: () => Promise.resolve({ status: 'granted' }),
  getExpoPushTokenAsync: () => Promise.resolve({ data: 'ExpoTok[A]' }),
  setNotificationChannelAsync: () => Promise.resolve(),
  AndroidImportance: { MAX: 5 },
  addNotificationResponseReceivedListener: () => ({ remove: jest.fn() }),
  getLastNotificationResponseAsync: () => Promise.resolve(null),
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '2.0.0', extra: { eas: { projectId: 'proj-1' } } } },
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    role: 'bishopric',
    wardId: 'w1',
    hasPermission: () => true,
  }),
}));
jest.mock('../lib/supabase', () => ({
  supabase: { from: () => ({ upsert: (...a: unknown[]) => mockUpsert(...a) }) },
}));
jest.mock('../lib/appHealth', () => ({
  reportHealthEvent: (...a: unknown[]) => mockReportHealthEvent(...(a as [])),
}));

import { useRegisterPushToken } from '../hooks/useNotifications';

function Probe({ online }: { online: boolean }) {
  useRegisterPushToken(online);
  return <Text>probe</Text>;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  (console.warn as jest.Mock).mockRestore?.();
});

describe('useRegisterPushToken (EST-23)', () => {
  it('upsert com erro registra push_token_register_failed e tenta de novo na próxima abertura', async () => {
    mockUpsert.mockResolvedValue({ error: { message: 'rls denied' } });
    const view = await render(<Probe online />);
    await flush();
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockReportHealthEvent).toHaveBeenCalledWith(
      'w1', 'push_token_register_failed', { fromUpsert: true }
    );

    // "Próxima abertura" neste hook = efeito roda de novo (offline -> online).
    // Se tivesse marcado como registrado, o segundo upsert não aconteceria.
    await view.rerender(<Probe online={false} />);
    await view.rerender(<Probe online />);
    await flush();
    expect(mockUpsert).toHaveBeenCalledTimes(2);
    expect(mockReportHealthEvent).toHaveBeenCalledTimes(2);
  });

  it('upsert conflita só no token, transferindo a linha ao dono atual (CONF-13)', async () => {
    mockUpsert.mockResolvedValue({ error: null });
    await render(<Probe online />);
    await flush();
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', ward_id: 'w1', expo_push_token: 'ExpoTok[A]' }),
      { onConflict: 'expo_push_token' }
    );
  });

  it('upsert com sucesso não registra evento de falha', async () => {
    mockUpsert.mockResolvedValue({ error: null });
    await render(<Probe online />);
    await flush();
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(mockReportHealthEvent).not.toHaveBeenCalled();
  });
});

/**
 * S8 — HomeMemberImportPrompt (AC14): shows only for empty wards + manage permission; dismiss
 * persists; import navigates to the members screen.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const state = vi.hoisted(() => ({ members: [] as unknown[], canManage: true }));
const pushMock = vi.hoisted(() => vi.fn());
const asyncStore = vi.hoisted(() => ({ getItem: vi.fn(() => Promise.resolve(null as string | null)), setItem: vi.fn(() => Promise.resolve()) }));

vi.mock('react-i18next', async (o) => ({ ...(await o() as object), useTranslation: () => ({ t: (k: string) => k }) }));
vi.mock('../contexts/ThemeContext', () => ({ useTheme: () => ({ colors: { card: '#111', primary: '#07f', text: '#fff', textSecondary: '#aaa', onPrimary: '#fff' } }) }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ wardId: 'w1', hasPermission: () => state.canManage }) }));
vi.mock('../hooks/useMembers', () => ({ useMembers: () => ({ data: state.members, isSuccess: true }) }));
vi.mock('expo-router', () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: asyncStore }));

import { HomeMemberImportPrompt } from '../components/HomeMemberImportPrompt';

async function render() {
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(HomeMemberImportPrompt));
    await Promise.resolve(); // flush AsyncStorage.getItem
  });
  return r;
}
const find = (r: TestRenderer.ReactTestRenderer, id: string) => r.root.findAll((n) => n.props?.testID === id);

beforeEach(() => {
  state.members = [];
  state.canManage = true;
  pushMock.mockClear();
  asyncStore.getItem.mockClear().mockResolvedValue(null);
  asyncStore.setItem.mockClear().mockResolvedValue(undefined);
});

describe('HomeMemberImportPrompt (AC14)', () => {
  it('shows for an empty ward with manage permission', async () => {
    const r = await render();
    expect(find(r, 'home-import-prompt').length).toBeGreaterThan(0);
  });

  it('is hidden when the ward already has members', async () => {
    state.members = [{ id: 'm1' }];
    const r = await render();
    expect(find(r, 'home-import-prompt')).toHaveLength(0);
  });

  it('is hidden without manage permission', async () => {
    state.canManage = false;
    const r = await render();
    expect(find(r, 'home-import-prompt')).toHaveLength(0);
  });

  it('is hidden when previously dismissed', async () => {
    asyncStore.getItem.mockResolvedValue('1');
    const r = await render();
    expect(find(r, 'home-import-prompt')).toHaveLength(0);
  });

  it('dismiss hides it and persists the flag', async () => {
    const r = await render();
    await act(async () => { (find(r, 'home-import-prompt-dismiss')[0].props.onPress as () => void)(); });
    expect(find(r, 'home-import-prompt')).toHaveLength(0);
    expect(asyncStore.setItem).toHaveBeenCalledWith('pdf-import-prompt-dismissed:w1', '1');
  });

  it('import navigates to the members screen', async () => {
    const r = await render();
    act(() => { (find(r, 'home-import-prompt-action')[0].props.onPress as () => void)(); });
    expect(pushMock).toHaveBeenCalledWith('/(tabs)/settings/members');
  });
});

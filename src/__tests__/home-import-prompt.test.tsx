/**
 * S8 — HomeMemberImportPrompt (AC14): shows only for empty wards + manage permission; dismiss
 * persists; import navigates to the members screen.
 */
import React from 'react';
import { render as rtlRender, screen, fireEvent, act } from '@testing-library/react-native';


const mockState = { members: [] as unknown[], canManage: true };
const mockPushMock = jest.fn();
const mockAsyncStore = { getItem: jest.fn(() => Promise.resolve(null as string | null)), setItem: jest.fn(() => Promise.resolve()) };

jest.mock('react-i18next', () => ({ ...(jest.requireActual('react-i18next') as object), useTranslation: () => ({ t: (k: string) => k }) }));
jest.mock('../contexts/ThemeContext', () => ({ useTheme: () => ({ colors: { card: '#111', primary: '#07f', text: '#fff', textSecondary: '#aaa', onPrimary: '#fff' } }) }));
jest.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ wardId: 'w1', hasPermission: () => mockState.canManage }) }));
jest.mock('../hooks/useMembers', () => ({ useMembers: () => ({ data: mockState.members, isSuccess: true }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPushMock }) }));
// Getter: babel-jest hoists this factory above `const mockAsyncStore`, and it runs while the
// component module is being imported — an eager read would capture undefined.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  get default() {
    return mockAsyncStore;
  },
}));

import { HomeMemberImportPrompt } from '../components/HomeMemberImportPrompt';

async function render() {
  await rtlRender(<HomeMemberImportPrompt />);
  // Flush the AsyncStorage.getItem the prompt kicks off on mount.
  await act(async () => { await Promise.resolve(); });
  return null;
}
const find = (r: unknown, id: string) => screen.root!.queryAll((n) => n.props?.testID === id);

beforeEach(() => {
  mockState.members = [];
  mockState.canManage = true;
  mockPushMock.mockClear();
  mockAsyncStore.getItem.mockClear().mockResolvedValue(null);
  mockAsyncStore.setItem.mockClear().mockResolvedValue(undefined);
});

describe('HomeMemberImportPrompt (AC14)', () => {
  it('shows for an empty ward with manage permission', async () => {
    const r = await render();
    expect(find(r, 'home-import-prompt').length).toBeGreaterThan(0);
  });

  it('is hidden when the ward already has members', async () => {
    mockState.members = [{ id: 'm1' }];
    const r = await render();
    expect(find(r, 'home-import-prompt')).toHaveLength(0);
  });

  it('is hidden without manage permission', async () => {
    mockState.canManage = false;
    const r = await render();
    expect(find(r, 'home-import-prompt')).toHaveLength(0);
  });

  it('is hidden when previously dismissed', async () => {
    mockAsyncStore.getItem.mockResolvedValue('1');
    const r = await render();
    expect(find(r, 'home-import-prompt')).toHaveLength(0);
  });

  it('dismiss hides it and persists the flag', async () => {
    const r = await render();
    await act(async () => { (find(r, 'home-import-prompt-dismiss')[0].props.onPress as () => void)(); });
    expect(find(r, 'home-import-prompt')).toHaveLength(0);
    expect(mockAsyncStore.setItem).toHaveBeenCalledWith('pdf-import-prompt-dismissed:w1', '1');
  });

  it('import navigates to the members screen', async () => {
    const r = await render();
    await act(async () => { (find(r, 'home-import-prompt-action')[0].props.onPress as () => void)(); });
    expect(mockPushMock).toHaveBeenCalledWith('/(tabs)/settings/members');
  });
});

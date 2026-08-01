/**
 * Behavioral tests for InviteActionDropdown (two-section invite dropdown).
 *
 * Renders against real React Native via jest-expo. Presses go through RNTL's fireEvent, which
 * honours `disabled` / `pointerEvents` — the previous version called `props.onPress()` directly,
 * so the "disabled row does not fire" assertions could not actually fail.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import type { Speech } from '../types/database';

import { InviteActionDropdown } from '../components/InviteActionDropdown';

// --- Mocks ---

jest.mock('react-i18next', () => {
  const actual = (jest.requireActual('react-i18next')) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { card: '#111', text: '#fff', textSecondary: '#aaa' } }),
}));

jest.mock('../components/icons', () => ({
  WhatsAppIcon: () => null,
  PhoneIcon: () => null,
  SendIcon: () => null,
}));

jest.mock('../components/StatusChangeModal', () => ({
  STATUS_INDICATOR_COLORS: {
    not_assigned: '#000',
    assigned_not_invited: '#000',
    assigned_invited: '#000',
    assigned_confirmed: '#000',
    gave_up: '#000',
  },
}));

// --- Helpers ---

function makeSpeech(over: Partial<Speech> = {}): Speech {
  return {
    id: 'sp1', ward_id: 'w1', sunday_date: '2099-01-04', position: 1, member_id: 'm1',
    speaker_name: 'Speaker', speaker_informal_name: 'Sp', speaker_phone: '+15550009',
    topic_title: 'Faith', topic_link: null, topic_collection: null, assigned_by_role: null,
    status: 'assigned_invited', contact_phone: null, is_delegated: false, delegate_for_name: null,
    created_at: '', updated_at: '', ...over,
  } as Speech;
}

async function renderDropdown(
  props: Partial<React.ComponentProps<typeof InviteActionDropdown>> = {}
) {
  const handlers = {
    onOpenWhatsApp: jest.fn(),
    onChangeStatus: jest.fn(),
    onEditContact: jest.fn(),
    onResendInvite: jest.fn(),
    onClose: jest.fn(),
  };
  await render(
    <InviteActionDropdown visible speech={makeSpeech()} {...handlers} {...props} />
  );
  return { handlers };
}

const row = (testID: string) => screen.getByTestId(testID);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('InviteActionDropdown', () => {
  it('renders both section headers', async () => {
    await renderDropdown();
    expect(screen.getByText('home.changeStatusSection')).toBeOnTheScreen();
    expect(screen.getByText('home.actionSection')).toBeOnTheScreen();
  });

  it('renders all four assigned statuses; the current one is disabled and does not fire onChangeStatus', async () => {
    const { handlers } = await renderDropdown({ speech: makeSpeech({ status: 'assigned_invited' }) });
    for (const s of ['assigned_not_invited', 'assigned_invited', 'assigned_confirmed', 'gave_up']) {
      expect(row(`invite-dropdown-status-${s}`)).toBeOnTheScreen();
    }
    const current = row('invite-dropdown-status-assigned_invited');
    expect(current).toBeDisabled();
    await fireEvent.press(current);
    expect(handlers.onChangeStatus).not.toHaveBeenCalled();
  });

  it('a non-current status fires onChangeStatus with speech id + status', async () => {
    const { handlers } = await renderDropdown({
      speech: makeSpeech({ id: 'sp9', status: 'assigned_invited' }),
    });
    await fireEvent.press(row('invite-dropdown-status-assigned_confirmed'));
    expect(handlers.onChangeStatus).toHaveBeenCalledWith('sp9', 'assigned_confirmed');
  });

  it('"Alterar telefone" fires onEditContact when member_id is set', async () => {
    const { handlers } = await renderDropdown({ speech: makeSpeech({ member_id: 'm1' }) });
    const el = row('invite-dropdown-edit-phone');
    expect(el).toBeEnabled();
    await fireEvent.press(el);
    expect(handlers.onEditContact).toHaveBeenCalledTimes(1);
  });

  it('"Alterar telefone" is disabled and does not fire without member_id', async () => {
    const { handlers } = await renderDropdown({ speech: makeSpeech({ member_id: null }) });
    const el = row('invite-dropdown-edit-phone');
    expect(el).toBeDisabled();
    await fireEvent.press(el);
    expect(handlers.onEditContact).not.toHaveBeenCalled();
  });

  it('"Re-enviar convite" fires onResendInvite when a phone exists', async () => {
    const { handlers } = await renderDropdown({
      speech: makeSpeech({ contact_phone: '+15550009', speaker_phone: null }),
    });
    const el = row('invite-dropdown-resend');
    expect(el).toBeEnabled();
    await fireEvent.press(el);
    expect(handlers.onResendInvite).toHaveBeenCalledTimes(1);
  });

  it('"Re-enviar convite" is disabled and does not fire without a phone', async () => {
    const { handlers } = await renderDropdown({
      speech: makeSpeech({ contact_phone: null, speaker_phone: null }),
    });
    const el = row('invite-dropdown-resend');
    expect(el).toBeDisabled();
    await fireEvent.press(el);
    expect(handlers.onResendInvite).not.toHaveBeenCalled();
  });

  it('"Ver conversa" fires onOpenWhatsApp when a phone exists', async () => {
    const { handlers } = await renderDropdown({ speech: makeSpeech({ speaker_phone: '+15550009' }) });
    await fireEvent.press(row('invite-dropdown-view-conversation'));
    expect(handlers.onOpenWhatsApp).toHaveBeenCalledTimes(1);
  });

  it('"Ver conversa" is disabled and does not fire without a phone', async () => {
    const { handlers } = await renderDropdown({
      speech: makeSpeech({ contact_phone: null, speaker_phone: null }),
    });
    const el = row('invite-dropdown-view-conversation');
    expect(el).toBeDisabled();
    await fireEvent.press(el);
    expect(handlers.onOpenWhatsApp).not.toHaveBeenCalled();
  });
});

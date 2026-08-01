/**
 * Behavioral tests for InviteActionDropdown (two-section invite dropdown).
 *
 * `react-native` is aliased to a test stub (vitest.config.ts). i18n/theme/icons and the
 * StatusChangeModal color map are mocked per-file so we can press rows and assert the callbacks.
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import type { Speech } from '../types/database';

import { InviteActionDropdown } from '../components/InviteActionDropdown';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

function render(props: Partial<React.ComponentProps<typeof InviteActionDropdown>> = {}) {
  const handlers = {
    onOpenWhatsApp: jest.fn(),
    onChangeStatus: jest.fn(),
    onEditContact: jest.fn(),
    onResendInvite: jest.fn(),
    onClose: jest.fn(),
  };
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      React.createElement(InviteActionDropdown, {
        visible: true,
        speech: makeSpeech(),
        ...handlers,
        ...props,
      })
    );
  });
  return { renderer, handlers };
}

function node(renderer: TestRenderer.ReactTestRenderer, testID: string) {
  return renderer.root.findAll((n) => typeof n.type === 'string' && n.props.testID === testID)[0];
}

function pressRow(renderer: TestRenderer.ReactTestRenderer, testID: string) {
  act(() => {
    (node(renderer, testID).props.onPress as () => void)();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('InviteActionDropdown', () => {
  it('renders both section headers', () => {
    const { renderer } = render();
    const headers = renderer.root.findAll(
      (n) =>
        typeof n.type === 'string' &&
        (n.props.children === 'home.changeStatusSection' || n.props.children === 'home.actionSection')
    );
    expect(headers.length).toBe(2);
  });

  it('renders all four assigned statuses; the current one is disabled and does not fire onChangeStatus', () => {
    const { renderer, handlers } = render({ speech: makeSpeech({ status: 'assigned_invited' }) });
    for (const s of ['assigned_not_invited', 'assigned_invited', 'assigned_confirmed', 'gave_up']) {
      expect(node(renderer, `invite-dropdown-status-${s}`)).toBeTruthy();
    }
    const current = node(renderer, 'invite-dropdown-status-assigned_invited');
    expect(current.props.disabled).toBe(true);
    pressRow(renderer, 'invite-dropdown-status-assigned_invited');
    expect(handlers.onChangeStatus).not.toHaveBeenCalled();
  });

  it('a non-current status fires onChangeStatus with speech id + status', () => {
    const { renderer, handlers } = render({ speech: makeSpeech({ id: 'sp9', status: 'assigned_invited' }) });
    pressRow(renderer, 'invite-dropdown-status-assigned_confirmed');
    expect(handlers.onChangeStatus).toHaveBeenCalledWith('sp9', 'assigned_confirmed');
  });

  it('"Alterar telefone" fires onEditContact when member_id is set', () => {
    const { renderer, handlers } = render({ speech: makeSpeech({ member_id: 'm1' }) });
    expect(node(renderer, 'invite-dropdown-edit-phone').props.disabled).toBe(false);
    pressRow(renderer, 'invite-dropdown-edit-phone');
    expect(handlers.onEditContact).toHaveBeenCalledTimes(1);
  });

  it('"Alterar telefone" is disabled and does not fire without member_id', () => {
    const { renderer, handlers } = render({ speech: makeSpeech({ member_id: null }) });
    expect(node(renderer, 'invite-dropdown-edit-phone').props.disabled).toBe(true);
    pressRow(renderer, 'invite-dropdown-edit-phone');
    expect(handlers.onEditContact).not.toHaveBeenCalled();
  });

  it('"Re-enviar convite" fires onResendInvite when a phone exists; disabled without one', () => {
    const withPhone = render({ speech: makeSpeech({ contact_phone: '+15550009', speaker_phone: null }) });
    expect(node(withPhone.renderer, 'invite-dropdown-resend').props.disabled).toBe(false);
    pressRow(withPhone.renderer, 'invite-dropdown-resend');
    expect(withPhone.handlers.onResendInvite).toHaveBeenCalledTimes(1);

    const noPhone = render({ speech: makeSpeech({ contact_phone: null, speaker_phone: null }) });
    expect(node(noPhone.renderer, 'invite-dropdown-resend').props.disabled).toBe(true);
    pressRow(noPhone.renderer, 'invite-dropdown-resend');
    expect(noPhone.handlers.onResendInvite).not.toHaveBeenCalled();
  });

  it('"Ver conversa" fires onOpenWhatsApp when a phone exists; disabled without one', () => {
    const withPhone = render({ speech: makeSpeech({ speaker_phone: '+15550009' }) });
    pressRow(withPhone.renderer, 'invite-dropdown-view-conversation');
    expect(withPhone.handlers.onOpenWhatsApp).toHaveBeenCalledTimes(1);

    const noPhone = render({ speech: makeSpeech({ contact_phone: null, speaker_phone: null }) });
    expect(node(noPhone.renderer, 'invite-dropdown-view-conversation').props.disabled).toBe(true);
    pressRow(noPhone.renderer, 'invite-dropdown-view-conversation');
    expect(noPhone.handlers.onOpenWhatsApp).not.toHaveBeenCalled();
  });
});

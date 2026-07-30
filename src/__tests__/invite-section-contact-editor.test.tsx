/**
 * Behavioral test for InviteManagementSection's no-phone → edit-contact → send-invite flow.
 *
 * `react-native` is aliased to a test stub (vitest.config.ts). PersonEditor is mocked to a prop
 * capturer so the test can drive its `onSaved` callback; the WhatsApp send URL is inspected via the
 * mocked openWhatsApp.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { Alert } from 'react-native';
import type { Member, Speech } from '../types/database';

import { InviteManagementSection } from '../components/InviteManagementSection';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// --- Controlled data ---

function makeMember(over: Partial<Member> & { id: string; full_name: string }): Member {
  return {
    ward_id: 'w1', informal_name: null, country_code: '+55', phone: null,
    can_preside: false, can_conduct: false, can_lead_music: false, can_play_piano: false,
    can_be_recognized: false, contact_via_responsible: false, responsible_id: null,
    calling: null, created_at: '', updated_at: '', ...over,
  };
}

const MEMBER = makeMember({ id: 'm-del', full_name: 'Delegate Person', informal_name: 'Del' });
const MEMBERS = [MEMBER];

function makeSpeech(over: Partial<Speech>): Speech {
  return {
    id: 'sp1', ward_id: 'w1', sunday_date: '2099-01-04', position: 1, member_id: 'm-del',
    speaker_name: 'Delegate Person', speaker_informal_name: 'Del', speaker_phone: null,
    topic_title: 'Faith', topic_link: null, topic_collection: 'Ward Topics', assigned_by_role: null,
    status: 'assigned_not_invited', contact_phone: null, is_delegated: false, delegate_for_name: null,
    created_at: '', updated_at: '', ...over,
  };
}

const WARD = {
  whatsapp_template_speech_1: null, whatsapp_template_speech_2: null, whatsapp_template_speech_3: null,
  whatsapp_template_opening_prayer: null, whatsapp_template_closing_prayer: null,
  whatsapp_template_delegation_wrapper: null,
  designation_template_sustain: null,
  designation_template_release: null,
  designation_template_priesthood: null,
  designation_template_new_member: null,
};

let SPEECHES: Speech[] = [];
const openWhatsAppMock = vi.fn((..._args: unknown[]) => Promise.resolve(true));
const changeStatusMock = vi.fn();

// Capture PersonEditor props so the test can drive onSaved / inspect visibility + member.
const editorHolder = vi.hoisted(
  () => ({ props: null as null | { visible: boolean; member?: Member | null; onSaved?: (m: Member) => void; onClose?: () => void } })
);

// --- Mocks ---

vi.mock('react-i18next', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});

vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { background: '#000', text: '#fff', textSecondary: '#aaa', primary: '#07f', primaryContainer: '#013', onPrimary: '#fff', error: '#f00', divider: '#333' } }),
}));
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: () => true, wardId: 'w1', wardLanguage: 'pt-BR' }),
}));

vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: WARD }) }));

vi.mock('../lib/whatsapp', () => ({
  openWhatsApp: (...args: unknown[]) => openWhatsAppMock(...args),
  buildWhatsAppConversationUrl: (phone: string) => `https://wa.me/${phone.replace('+', '')}`,
}));

vi.mock('../lib/supabase', () => ({ supabase: {} }));

vi.mock('../components/icons', () => ({ WhatsAppIcon: () => null, MoreVerticalIcon: () => null }));
vi.mock('../components/StatusLED', () => ({ StatusLED: () => null }));
vi.mock('../components/InviteActionDropdown', () => ({ InviteActionDropdown: () => null }));
vi.mock('../components/QueryErrorView', () => ({ QueryErrorView: () => null }));
vi.mock('../components/PersonEditor', () => ({
  PersonEditor: (props: typeof editorHolder.props) => {
    editorHolder.props = props;
    return null;
  },
}));

vi.mock('../hooks/useMembers', () => ({ useMembers: () => ({ data: MEMBERS }) }));
vi.mock('../hooks/useAgenda', () => ({ useAgendaRange: () => ({ data: [] }) }));
vi.mock('../hooks/useSpeeches', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useSpeeches: () => ({ data: SPEECHES, isError: false, error: null, refetch: vi.fn() }),
    useChangeStatus: () => ({ mutate: changeStatusMock }),
    useWardManagePrayers: () => ({ managePrayers: true, isLoading: false }),
  };
});

// --- Helpers ---

function render() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(InviteManagementSection));
  });
  return renderer;
}

async function pressSend(renderer: TestRenderer.ReactTestRenderer) {
  const btn = renderer.root.findAll(
    (n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'WhatsApp' && typeof n.props.onPress === 'function'
  )[0];
  await act(async () => {
    await (btn.props.onPress as () => Promise<void>)();
  });
}

type AlertButton = { text: string; style?: string; onPress?: () => void };

beforeEach(() => {
  openWhatsAppMock.mockClear();
  changeStatusMock.mockClear();
  editorHolder.props = null;
  SPEECHES = [];
});

describe('InviteManagementSection — no-phone edit-contact → send-invite flow', () => {
  it('no-phone Alert offers an "Editar Contato" button (member exists)', () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    SPEECHES = [makeSpeech({ id: 'sp1', member_id: 'm-del', contact_phone: null, speaker_phone: null })];
    const renderer = render();
    act(() => {
      const btn = renderer.root.findAll(
        (n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'WhatsApp'
      )[0];
      (btn.props.onPress as () => void)();
    });

    expect(alertSpy).toHaveBeenCalledTimes(1);
    const buttons = alertSpy.mock.calls[0][2] as AlertButton[];
    expect(buttons.map((b) => b.text)).toEqual([
      'home.editContact',
      'invite.markAsInvited',
      'common.cancel',
    ]);
    alertSpy.mockRestore();
  });

  it('saving a contact with a phone triggers the send-invite confirm and sends', async () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    SPEECHES = [makeSpeech({ id: 'sp1', member_id: 'm-del', contact_phone: null, speaker_phone: null })];
    const renderer = render();

    // 1) Press send → no-phone Alert → invoke "Editar Contato".
    act(() => {
      const btn = renderer.root.findAll(
        (n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'WhatsApp'
      )[0];
      (btn.props.onPress as () => void)();
    });
    const noPhoneButtons = alertSpy.mock.calls[0][2] as AlertButton[];
    act(() => {
      noPhoneButtons.find((b) => b.text === 'home.editContact')!.onPress!();
    });

    // 2) The editor opens with the member prefilled.
    expect(editorHolder.props?.visible).toBe(true);
    expect(editorHolder.props?.member?.id).toBe('m-del');

    // 3) Save the member (now with a phone) → send-invite confirm Alert appears.
    alertSpy.mockClear();
    act(() => {
      editorHolder.props!.onSaved!(makeMember({ id: 'm-del', full_name: 'Delegate Person', country_code: '+55', phone: '11999998888' }));
    });
    expect(alertSpy).toHaveBeenCalledTimes(1);
    const confirmButtons = alertSpy.mock.calls[0][2] as AlertButton[];
    const sendBtn = confirmButtons.find((b) => b.text === 'home.sendInvite')!;
    expect(sendBtn).toBeTruthy();

    // 4) Confirm → WhatsApp opens to the freshly built phone and status flips to invited.
    await act(async () => {
      await (sendBtn.onPress as () => Promise<void>)();
    });
    const url = openWhatsAppMock.mock.calls[openWhatsAppMock.mock.calls.length - 1][0] as string;
    expect(url).toContain('wa.me/5511999998888');
    expect(changeStatusMock).toHaveBeenCalledWith({ speechId: 'sp1', status: 'assigned_invited' });
    alertSpy.mockRestore();
  });

  it('sends immediately when a phone already exists (no Alert)', async () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    SPEECHES = [makeSpeech({ id: 'sp1', member_id: 'm-del', contact_phone: '+15550009' })];
    const renderer = render();
    await pressSend(renderer);

    expect(alertSpy).not.toHaveBeenCalled();
    expect(openWhatsAppMock).toHaveBeenCalledTimes(1);
    expect(changeStatusMock).toHaveBeenCalledWith({ speechId: 'sp1', status: 'assigned_invited' });
    alertSpy.mockRestore();
  });

  it('does NOT mark invited when WhatsApp fails to open', async () => {
    const alertSpy = vi.spyOn(Alert, 'alert').mockImplementation(() => {});
    // openWhatsApp reports it could not open (not installed / launch failed).
    openWhatsAppMock.mockImplementationOnce(() => Promise.resolve(false));
    SPEECHES = [makeSpeech({ id: 'sp1', member_id: 'm-del', contact_phone: '+15550009' })];
    const renderer = render();
    await pressSend(renderer);

    expect(openWhatsAppMock).toHaveBeenCalledTimes(1);
    expect(changeStatusMock).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

/**
 * Behavioral test for InviteManagementSection's no-phone → edit-contact → send-invite flow.
 *
 * `react-native` is aliased to a test stub (vitest.config.ts). PersonEditor is mocked to a prop
 * capturer so the test can drive its `onSaved` callback; the WhatsApp send URL is inspected via the
 * mocked openWhatsApp.
 */
import React from 'react';
import { render as rtlRender, screen, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { Member, Speech } from '../types/database';

import { InviteManagementSection } from '../components/InviteManagementSection';


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
const mockMEMBERS = [MEMBER];

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

let mockSPEECHES: Speech[] = [];
const mockOpenWhatsAppMock = jest.fn((..._args: unknown[]) => Promise.resolve(true));
const mockChangeStatusMock = jest.fn();

// Capture PersonEditor props so the test can drive onSaved / inspect visibility + member.
const mockEditorHolder = { props: null as null | { visible: boolean; member?: Member | null; onSaved?: (m: Member) => void; onClose?: () => void } };

// --- Mocks ---

jest.mock('react-i18next', () => {
  const actual = (jest.requireActual('react-i18next')) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({ colors: { background: '#000', text: '#fff', textSecondary: '#aaa', primary: '#07f', primaryContainer: '#013', onPrimary: '#fff', error: '#f00', divider: '#333' } }),
}));
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: () => true, wardId: 'w1', wardLanguage: 'pt-BR' }),
}));

jest.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: WARD }) }));

jest.mock('../lib/whatsapp', () => ({
  openWhatsApp: (...args: unknown[]) => mockOpenWhatsAppMock(...args),
  buildWhatsAppConversationUrl: (phone: string) => `https://wa.me/${phone.replace('+', '')}`,
}));

jest.mock('../lib/supabase', () => ({ supabase: {} }));

jest.mock('../components/icons', () => ({ WhatsAppIcon: () => null, MoreVerticalIcon: () => null }));
jest.mock('../components/StatusLED', () => ({ StatusLED: () => null }));
jest.mock('../components/InviteActionDropdown', () => ({ InviteActionDropdown: () => null }));
jest.mock('../components/QueryErrorView', () => ({ QueryErrorView: () => null }));
jest.mock('../components/PersonEditor', () => ({
  PersonEditor: (props: typeof mockEditorHolder.props) => {
    mockEditorHolder.props = props;
    return null;
  },
}));

jest.mock('../hooks/useMembers', () => ({ useMembers: () => ({ data: mockMEMBERS }) }));
jest.mock('../hooks/useAgenda', () => ({ useAgendaRange: () => ({ data: [] }) }));
jest.mock('../hooks/useSpeeches', () => {
  const actual = (jest.requireActual('../hooks/useSpeeches')) as Record<string, unknown>;
  return {
    ...actual,
    useSpeeches: () => ({ data: mockSPEECHES, isError: false, error: null, refetch: jest.fn() }),
    useChangeStatus: () => ({ mutate: mockChangeStatusMock }),
    useWardManagePrayers: () => ({ managePrayers: true, isLoading: false }),
  };
});

// --- Helpers ---

async function render() {
  await rtlRender(React.createElement(InviteManagementSection));
  return null; // call-site compatibility; the helpers query `screen`
}

async function pressSend(_renderer?: unknown) {
  await act(async () => {
    await fireEvent.press(screen.getAllByLabelText('WhatsApp')[0]);
  });
}

type AlertButton = { text: string; style?: string; onPress?: () => void };

beforeEach(() => {
  mockOpenWhatsAppMock.mockClear();
  mockChangeStatusMock.mockClear();
  mockEditorHolder.props = null;
  mockSPEECHES = [];
});

describe('InviteManagementSection — no-phone edit-contact → send-invite flow', () => {
  it('no-phone Alert offers an "Editar Contato" button (member exists)', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockSPEECHES = [makeSpeech({ id: 'sp1', member_id: 'm-del', contact_phone: null, speaker_phone: null })];
    await render();
    await act(async () => {
      await fireEvent.press(screen.getAllByLabelText('WhatsApp')[0]);
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
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockSPEECHES = [makeSpeech({ id: 'sp1', member_id: 'm-del', contact_phone: null, speaker_phone: null })];
    await render();

    // 1) Press send → no-phone Alert → invoke "Editar Contato".
    await act(async () => {
      await fireEvent.press(screen.getAllByLabelText('WhatsApp')[0]);
    });
    const noPhoneButtons = alertSpy.mock.calls[0][2] as AlertButton[];
    await act(async () => {
      noPhoneButtons.find((b) => b.text === 'home.editContact')!.onPress!();
    });

    // 2) The editor opens with the member prefilled.
    expect(mockEditorHolder.props?.visible).toBe(true);
    expect(mockEditorHolder.props?.member?.id).toBe('m-del');

    // 3) Save the member (now with a phone) → send-invite confirm Alert appears.
    alertSpy.mockClear();
    await act(async () => {
      mockEditorHolder.props!.onSaved!(makeMember({ id: 'm-del', full_name: 'Delegate Person', country_code: '+55', phone: '11999998888' }));
    });
    expect(alertSpy).toHaveBeenCalledTimes(1);
    const confirmButtons = alertSpy.mock.calls[0][2] as AlertButton[];
    const sendBtn = confirmButtons.find((b) => b.text === 'home.sendInvite')!;
    expect(sendBtn).toBeTruthy();

    // 4) Confirm → WhatsApp opens to the freshly built phone and status flips to invited.
    await act(async () => {
      await (sendBtn.onPress as () => Promise<void>)();
    });
    const url = mockOpenWhatsAppMock.mock.calls[mockOpenWhatsAppMock.mock.calls.length - 1][0] as string;
    expect(url).toContain('wa.me/5511999998888');
    expect(mockChangeStatusMock).toHaveBeenCalledWith({ speechId: 'sp1', status: 'assigned_invited' });
    alertSpy.mockRestore();
  });

  it('sends immediately when a phone already exists (no Alert)', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockSPEECHES = [makeSpeech({ id: 'sp1', member_id: 'm-del', contact_phone: '+15550009' })];
    const renderer = await render();
    await pressSend(renderer);

    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockOpenWhatsAppMock).toHaveBeenCalledTimes(1);
    expect(mockChangeStatusMock).toHaveBeenCalledWith({ speechId: 'sp1', status: 'assigned_invited' });
    alertSpy.mockRestore();
  });

  it('does NOT mark invited when WhatsApp fails to open', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    // openWhatsApp reports it could not open (not installed / launch failed).
    mockOpenWhatsAppMock.mockImplementationOnce(() => Promise.resolve(false));
    mockSPEECHES = [makeSpeech({ id: 'sp1', member_id: 'm-del', contact_phone: '+15550009' })];
    const renderer = await render();
    await pressSend(renderer);

    expect(mockOpenWhatsAppMock).toHaveBeenCalledTimes(1);
    expect(mockChangeStatusMock).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

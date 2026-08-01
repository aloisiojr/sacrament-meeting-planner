/**
 * Behavioral test for InviteManagementSection v2.0 delegation send (specs/v2-member-management.md).
 *
 * `react-native` is aliased to a test stub (vitest.config.ts). Heavy children/deps are mocked so we
 * can press the WhatsApp action and inspect the wa.me URL that openWhatsApp receives:
 *  - recipient = speech.contact_phone (fallback to speaker_phone)
 *  - when speech.is_delegated, the base message is wrapped by the delegation wrapper, addressed to
 *    the responsible resolved LIVE from the member chain.
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import type { Member, Speech } from '../types/database';

import { InviteManagementSection } from '../components/InviteManagementSection';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// --- Controlled data ---

function makeMember(over: Partial<Member> & { id: string; full_name: string }): Member {
  return {
    ward_id: 'w1', informal_name: null, country_code: '+1', phone: null,
    can_preside: false, can_conduct: false, can_lead_music: false, can_play_piano: false,
    can_be_recognized: false, contact_via_responsible: false, responsible_id: null,
    calling: null, created_at: '', updated_at: '', ...over,
  };
}

const RESPONSIBLE = makeMember({ id: 'm-resp', full_name: 'Resp Person', informal_name: 'Resp', country_code: '+55', phone: '11999998888' });
const DELEGATE = makeMember({ id: 'm-del', full_name: 'Delegate Person', informal_name: 'Del', contact_via_responsible: true, responsible_id: 'm-resp' });
const MEMBERS = [RESPONSIBLE, DELEGATE];

function makeSpeech(over: Partial<Speech>): Speech {
  return {
    id: 'sp1', ward_id: 'w1', sunday_date: '2099-01-04', position: 1, member_id: 'm-del',
    speaker_name: 'Delegate Person', speaker_informal_name: 'Del', speaker_phone: '+15550009',
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

jest.mock('../components/icons', () => ({
  WhatsAppIcon: () => null,
  MoreVerticalIcon: () => null,
}));
jest.mock('../components/StatusLED', () => ({ StatusLED: () => null }));
jest.mock('../components/InviteActionDropdown', () => ({ InviteActionDropdown: () => null }));
jest.mock('../components/PersonEditor', () => ({ PersonEditor: () => null }));
jest.mock('../components/QueryErrorView', () => ({ QueryErrorView: () => null }));

jest.mock('../hooks/useMembers', () => ({ useMembers: () => ({ data: MEMBERS }) }));
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

function render() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(InviteManagementSection));
  });
  return renderer;
}

/** Press the not-invited WhatsApp action button (accessibilityLabel 'WhatsApp'). */
async function pressSend(renderer: TestRenderer.ReactTestRenderer) {
  const btn = renderer.root.findAll(
    (n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'WhatsApp' && typeof n.props.onPress === 'function'
  )[0];
  await act(async () => {
    await (btn.props.onPress as () => Promise<void>)();
  });
}

/** Decode the ?text= payload from the last wa.me URL passed to openWhatsApp. */
function lastSentText(): { phone: string; text: string } {
  const url = mockOpenWhatsAppMock.mock.calls[mockOpenWhatsAppMock.mock.calls.length - 1][0] as string;
  const m = url.match(/wa\.me\/([^?]+)\?text=(.*)$/)!;
  return { phone: m[1], text: decodeURIComponent(m[2]) };
}

beforeEach(() => {
  mockOpenWhatsAppMock.mockClear();
  mockChangeStatusMock.mockClear();
  mockSPEECHES = [];
});

describe('InviteManagementSection — v2.0 delegation send (AC9)', () => {
  it('non-delegated: sends the plain base message to contact_phone', async () => {
    mockSPEECHES = [makeSpeech({ id: 'sp1', is_delegated: false, contact_phone: '+15550009' })];
    const renderer = render();
    await pressSend(renderer);

    expect(mockOpenWhatsAppMock).toHaveBeenCalledTimes(1);
    const { phone, text } = lastSentText();
    expect(phone).toBe('15550009');
    expect(text).not.toContain('Temos um convite para');
    expect(mockChangeStatusMock).toHaveBeenCalledWith({ speechId: 'sp1', status: 'assigned_invited' });
  });

  it('delegated: wraps the base message and sends to the responsible phone (AC9)', async () => {
    mockSPEECHES = [
      makeSpeech({
        id: 'sp1',
        is_delegated: true,
        contact_phone: '+5511999998888', // responsible phone snapshot
        delegate_for_name: 'Del',
        member_id: 'm-del',
      }),
    ];
    const renderer = render();
    await pressSend(renderer);

    const { phone, text } = lastSentText();
    // recipient = responsible snapshot phone
    expect(phone).toBe('5511999998888');
    // wrapper (pt-BR default) addressed to the LIVE-resolved responsible name + delegate name
    expect(text).toContain('Olá Resp Person, tudo bom?');
    expect(text).toContain('Temos um convite para Del:');
    // base per-position message still embedded inside the wrapper
    expect(text).toContain('primeiro discurso');
    expect(mockChangeStatusMock).toHaveBeenCalledWith({ speechId: 'sp1', status: 'assigned_invited' });
  });

  it('orphaned delegation (no contact_phone): still wraps, falls back to the assignee phone', async () => {
    mockSPEECHES = [
      makeSpeech({
        id: 'sp1',
        is_delegated: true,
        contact_phone: null,
        speaker_phone: '+15550009',
        delegate_for_name: 'Del',
        member_id: 'm-del',
      }),
    ];
    const renderer = render();
    await pressSend(renderer);

    const { phone, text } = lastSentText();
    expect(phone).toBe('15550009'); // fell back to own phone
    expect(text).toContain('Olá Resp Person, tudo bom?');
  });
});

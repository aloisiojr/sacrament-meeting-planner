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
import { render as rtlRender, screen, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { Member, Speech } from '../types/database';

import { InviteManagementSection } from '../components/InviteManagementSection';


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
const PLAIN = makeMember({ id: 'm-plain', full_name: 'Plain Person', informal_name: 'Plain', country_code: '+1', phone: '5550009' });
const mockMEMBERS = [RESPONSIBLE, DELEGATE, PLAIN];

function makeSpeech(over: Partial<Speech>): Speech {
  return {
    id: 'sp1', ward_id: 'w1', sunday_date: '2099-01-04', position: 1, member_id: 'm-del',
    speaker_name: 'Delegate Person', speaker_informal_name: 'Del', speaker_phone: '+15550009',
    topic_title: 'Faith', topic_link: null, topic_collection: 'Ward Topics', assigned_by_role: null,
    status: 'assigned_not_invited', contact_phone: null, is_delegated: false, delegate_for_name: null,
    created_at: '', updated_at: '', ...over,
  };
}

// Mutable so a test can install a ward-custom template; reset in beforeEach.
const WARD: Record<string, string | null> = {
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
const mockUpdateContactMock = jest.fn();

// --- Mocks ---

jest.mock('react-i18next', () => {
  const actual = (jest.requireActual('react-i18next')) as Record<string, unknown>;
  return {
    ...actual,
    useTranslation: () => ({
      // Returns the key, but SUBSTITUTES {{placeholders}} — otherwise a message built from
      // interpolated values is untestable, and the divergence dialog is exactly that.
      t: (k: string, vars?: Record<string, unknown>) =>
        vars && typeof vars === 'object'
          ? Object.entries(vars).reduce(
              (acc, [name, v]) => acc + ` ${name}=${String(v)}`,
              k
            )
          : k,
    }),
  };
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

// The `mock` prefix is load-bearing here. babel-plugin-jest-hoist HOISTS a declaration that a
// factory references when it deems the initializer safe (an array literal qualifies), so an
// unprefixed `const MEMBERS = [RESPONSIBLE, DELEGATE]` got lifted above the two consts it depends
// on and evaluated to [undefined, undefined]. The mock-prefix escape hatch permits the reference
// without hoisting the declaration.
jest.mock('../hooks/useMembers', () => ({ useMembers: () => ({ data: mockMEMBERS }) }));
jest.mock('../hooks/useAgenda', () => ({ useAgendaRange: () => ({ data: [] }) }));
jest.mock('../hooks/useSpeeches', () => {
  const actual = (jest.requireActual('../hooks/useSpeeches')) as Record<string, unknown>;
  return {
    ...actual,
    useSpeeches: () => ({ data: mockSPEECHES, isError: false, error: null, refetch: jest.fn() }),
    useChangeStatus: () => ({ mutate: mockChangeStatusMock }),
    useUpdateSpeechContact: () => ({ mutate: mockUpdateContactMock }),
    useWardManagePrayers: () => ({ managePrayers: true, isLoading: false }),
  };
});

// --- Helpers ---

async function render() {
  await rtlRender(React.createElement(InviteManagementSection));
  return null; // call-site compatibility; the helpers query `screen`
}

/** Press the not-invited WhatsApp action button (accessibilityLabel 'WhatsApp'). */
async function pressSend(_renderer?: unknown) {
  const btn = screen.getAllByLabelText('WhatsApp')[0];
  await act(async () => {
    await fireEvent.press(btn);
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
  WARD.whatsapp_template_speech_1 = null;
});

describe('a ward that never configured anything still sends real text', () => {
  // Since the edge function stopped seeding, the five template columns are NULL the day a ward is
  // created. The fallback to the app's default IS the message — if it ever returns '', a brand-new
  // ward sends an empty WhatsApp invite. Prayers are covered here because nothing else exercises
  // positions 0 and 4 through this component.
  it.each([
    [0, 'oração de abertura'],
    [4, 'oração de encerramento'],
  ])('position %i sends the default prayer text with every column NULL', (position, phrase) => {
    mockSPEECHES = [
      makeSpeech({
        id: 'sp1',
        position,
        member_id: 'm-plain',
        contact_phone: '+15550009',
        speaker_name: 'Plain Person',
        speaker_informal_name: 'Plain',
        topic_title: null,
        topic_collection: null,
      }),
    ];

    return render()
      .then(pressSend)
      .then(() => {
        const { text } = lastSentText();
        expect(text).toContain(`Olá Plain, tudo bom? O bispado gostaria de te convidar para fazer a ${phrase}`);
        expect(text).toContain('Podemos contar com você?');
        expect(text).not.toContain('{');
      });
  });

  it('a speech sends the default text with every column NULL', () => {
    mockSPEECHES = [
      makeSpeech({
        id: 'sp1',
        position: 1,
        member_id: 'm-plain',
        contact_phone: '+15550009',
        speaker_name: 'Plain Person',
        speaker_informal_name: 'Plain',
      }),
    ];

    return render()
      .then(pressSend)
      .then(() => {
        const { text } = lastSentText();
        expect(text).toContain('Olá Plain, tudo bom? O bispado gostaria de te convidar para fazer o 1º discurso');
        expect(text).not.toContain('{');
      });
  });
});

describe('the message distinguishes the full name from the informal one', () => {
  it('{nome} is the full name and {nome informal} the informal one', () => {
    WARD.whatsapp_template_speech_1 = 'Olá {nome informal}, convite para {nome}.';
    mockSPEECHES = [
      makeSpeech({
        id: 'sp1',
        member_id: 'm-plain',
        contact_phone: '+15550009',
        speaker_name: 'Plain Person',
        speaker_informal_name: 'Plain',
      }),
    ];

    return render()
      .then(pressSend)
      .then(() => {
        expect(lastSentText().text).toBe('Olá Plain, convite para Plain Person.');
      });
  });

  it('greets with the full name when the member has no informal name', () => {
    WARD.whatsapp_template_speech_1 = 'Olá {nome informal}, convite para {nome}.';
    mockSPEECHES = [
      makeSpeech({
        id: 'sp1',
        member_id: 'm-plain',
        contact_phone: '+15550009',
        speaker_name: 'Plain Person',
        speaker_informal_name: null,
      }),
    ];

    return render()
      .then(pressSend)
      .then(() => {
        expect(lastSentText().text).toBe('Olá Plain Person, convite para Plain Person.');
      });
  });
});

describe('InviteManagementSection — v2.0 delegation send (AC9)', () => {
  it('non-delegated: sends the plain base message to contact_phone', async () => {
    // member_id points at a member whose record AGREES with the snapshot; a mismatch is a
    // divergence and now raises the "which number?" dialog instead of sending.
    mockSPEECHES = [
      makeSpeech({ id: 'sp1', is_delegated: false, contact_phone: '+15550009', member_id: 'm-plain' }),
    ];
    const renderer = await render();
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
    const renderer = await render();
    await pressSend(renderer);

    const { phone, text } = lastSentText();
    // recipient = responsible snapshot phone
    expect(phone).toBe('5511999998888');
    // wrapper (pt-BR default) addressed to the LIVE-resolved responsible name + delegate name
    expect(text).toContain('Olá Resp Person, tudo bom?');
    expect(text).toContain('Temos um convite para Del:');
    // base per-position message still embedded inside the wrapper
    expect(text).toContain('1º discurso');
    expect(mockChangeStatusMock).toHaveBeenCalledWith({ speechId: 'sp1', status: 'assigned_invited' });
  });

  it('orphaned delegation (no contact_phone): offers the record number, and still wraps', async () => {
    // The snapshot never captured a contact, but the record has a responsible with a phone. That
    // is a real divergence: the sender is asked rather than quietly falling back to the assignee's
    // own number, which is what used to happen.
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
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render();
    await pressSend();
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    alertSpy.mockRestore();

    await act(async () => {
      buttons[2].onPress?.(); // "use the record"
    });

    const { phone, text } = lastSentText();
    expect(phone).toBe('5511999998888'); // the responsible's number, from the record
    expect(text).toContain('Olá Resp Person, tudo bom?');
  });
});


describe('a legacy snapshot without a country code still dials correctly', () => {
  // Reported 2026-08-05 against staging: sending an invite via the responsible produced
  // wa.me/11987650026 — no country code. buildFullPhone was applied when the snapshot is WRITTEN,
  // but rows written before that fix (and rows seeded straight into the database) hold a bare
  // national number, and the send path used the snapshot verbatim.

  it('prepends the RESPONSIBLE country code for a delegated invite', async () => {
    mockSPEECHES = [
      makeSpeech({
        id: 'sp-legacy',
        is_delegated: true,
        delegate_for_name: 'Del',
        speaker_phone: null,
        contact_phone: '11999998888', // stored without +55
      }),
    ];
    await render();
    await pressSend();

    expect(lastSentText().phone).toBe('5511999998888');
  });

  it('does not double the code when the snapshot is already international', async () => {
    mockSPEECHES = [
      makeSpeech({
        id: 'sp-ok',
        is_delegated: true,
        delegate_for_name: 'Del',
        speaker_phone: null,
        contact_phone: '+5511999998888',
      }),
    ];
    await render();
    await pressSend();

    expect(lastSentText().phone).toBe('5511999998888');
  });

  it('still sends when no country code can be resolved, rather than refusing', async () => {
    // Better a possibly-local number than a button that does nothing.
    mockSPEECHES = [
      makeSpeech({
        id: 'sp-unknown',
        member_id: 'nobody',
        is_delegated: true,
        speaker_phone: null,
        contact_phone: '11999998888',
      }),
    ];
    await render();
    await pressSend();

    expect(lastSentText().phone).toBe('11999998888');
  });
});


describe('the snapshot diverged from the member record — the sender chooses', () => {
  // The snapshot is frozen at assignment time so a later edit cannot silently redirect an
  // invitation. But silently sending to a number the person no longer uses is the same failure
  // from the other side. So when the two genuinely differ, ask.

  /** A speech whose stored contact is a number the record no longer has. */
  function divergedSpeech() {
    return makeSpeech({
      id: 'sp-div',
      member_id: 'm-del',
      is_delegated: true,
      delegate_for_name: 'Del',
      speaker_phone: null,
      contact_phone: '+5511000000000', // record says +5511999998888
    });
  }

  async function pressAndCaptureDialog() {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render();
    await pressSend();
    const call = alertSpy.mock.calls[0];
    alertSpy.mockRestore();
    return {
      message: call?.[1] as string,
      buttons: call[2] as { text: string; style?: string; onPress?: () => void }[],
    };
  }

  it('does not send anything until the question is answered', async () => {
    mockSPEECHES = [divergedSpeech()];
    await pressAndCaptureDialog();

    expect(mockOpenWhatsAppMock).not.toHaveBeenCalled();
    expect(mockChangeStatusMock).not.toHaveBeenCalled();
  });

  it('shows both numbers so the choice is informed', async () => {
    mockSPEECHES = [divergedSpeech()];
    const { message } = await pressAndCaptureDialog();

    // The mock t appends the interpolated values, so both numbers reach the dialog.
    expect(message).toContain('stored=+5511000000000');
    expect(message).toContain('current=+5511999998888');
  });

  it('offers cancel, and cancelling sends nothing', async () => {
    mockSPEECHES = [divergedSpeech()];
    const { buttons } = await pressAndCaptureDialog();

    expect(buttons[0].style).toBe('cancel');
    expect(buttons).toHaveLength(3);
    expect(mockOpenWhatsAppMock).not.toHaveBeenCalled();
  });

  it('keeping the assignment number sends there and leaves the snapshot alone', async () => {
    mockSPEECHES = [divergedSpeech()];
    const { buttons } = await pressAndCaptureDialog();
    await act(async () => {
      buttons[1].onPress?.();
    });

    expect(lastSentText().phone).toBe('5511000000000');
    expect(mockUpdateContactMock).not.toHaveBeenCalled();
  });

  it('choosing the record sends there AND refreshes the snapshot, so it is asked once', async () => {
    mockSPEECHES = [divergedSpeech()];
    const { buttons } = await pressAndCaptureDialog();
    await act(async () => {
      buttons[2].onPress?.();
    });

    expect(lastSentText().phone).toBe('5511999998888');
    expect(mockUpdateContactMock).toHaveBeenCalledWith({
      speechId: 'sp-div',
      contactPhone: '+5511999998888',
      isDelegated: true,
      delegateForName: 'Del',
    });
  });

  it('marks the invite sent only after the chosen number actually opened WhatsApp', async () => {
    mockSPEECHES = [divergedSpeech()];
    const { buttons } = await pressAndCaptureDialog();
    await act(async () => {
      buttons[2].onPress?.();
    });

    expect(mockChangeStatusMock).toHaveBeenCalledWith({
      speechId: 'sp-div',
      status: 'assigned_invited',
    });
  });

  it('asks nothing when the snapshot only lacks the country code', async () => {
    // Same number, written before buildFullPhone existed. A dialog here would appear on every
    // legacy row and train the user to dismiss it.
    mockSPEECHES = [
      makeSpeech({
        id: 'sp-legacy2',
        member_id: 'm-del',
        is_delegated: true,
        delegate_for_name: 'Del',
        speaker_phone: null,
        contact_phone: '11999998888',
      }),
    ];
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render();
    await pressSend();
    const alerts = alertSpy.mock.calls.length;
    alertSpy.mockRestore();

    expect(alerts).toBe(0);
    expect(lastSentText().phone).toBe('5511999998888');
  });
});

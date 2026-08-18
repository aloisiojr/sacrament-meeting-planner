/**
 * A linha de convite com um nome longo (`specs/invite-row-long-name.md`).
 *
 * No React Native `flexShrink` é 0 por padrão, ao contrário da web: dois textos irmãos numa row não
 * cedem espaço e a soma das larguras transborda o container, empurrando o aviso por baixo do botão.
 *
 * LIMITE DESTE TESTE: o jest não faz layout. Largura, truncamento e sobreposição não são
 * observáveis aqui — o que se prende é que os estilos que repartem o espaço estão aplicados nos
 * dois textos, o que pega remoção acidental num refactor. Que o resultado ficou legível é
 * conferência no aparelho, registrada no spec.
 *
 * O preâmbulo de mocks é o mesmo de `invite-section-contact-editor.test.tsx`, por ser o setup
 * mínimo que monta esta seção.
 */
import React from 'react';
import { render as rtlRender, screen, fireEvent, act } from '@testing-library/react-native';
import { Alert, StyleSheet } from 'react-native';
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
const mockUpdateContactMock = jest.fn();

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
    useUpdateSpeechContact: () => ({ mutate: mockUpdateContactMock }),
    useWardManagePrayers: () => ({ managePrayers: true, isLoading: false }),
  };
});

// --- Helpers ---

async function render() {
  await rtlRender(React.createElement(InviteManagementSection));
  return null; // call-site compatibility; the helpers query `screen`
}

const NOME_LONGO = 'Fulana Sobrenome Composto de Exemplo Anonimizada';

describe('nome longo não empurra o aviso para cima do botão', () => {
  it('o nome cede espaço e é truncado (AC1)', async () => {
    mockSPEECHES = [makeSpeech({ speaker_name: NOME_LONGO, topic_title: '' })];
    await render();

    const nome = screen.getByTestId('invite-speaker-name');
    expect(StyleSheet.flatten(nome.props.style).flexShrink).toBe(1);
    expect(nome.props.numberOfLines).toBe(1);
  });

  it('o aviso permanece inteiro, sem encolher (AC1, AC2)', async () => {
    mockSPEECHES = [makeSpeech({ speaker_name: NOME_LONGO, topic_title: '' })];
    await render();

    // 0 é o padrão do RN, mas explícito aqui: é o que impede o aviso de ser espremido junto.
    expect(StyleSheet.flatten(screen.getByTestId('invite-topic-missing').props.style).flexShrink).toBe(0);
  });

  it('sem aviso, o nome fica sozinho na linha (AC3)', async () => {
    mockSPEECHES = [makeSpeech({ speaker_name: NOME_LONGO, topic_title: 'Fé' })];
    await render();

    expect(screen.queryByTestId('invite-topic-missing')).toBeNull();
    expect(screen.getByTestId('invite-speaker-name')).toBeTruthy();
  });
});

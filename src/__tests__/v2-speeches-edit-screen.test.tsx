/**
 * Behavioral test for the full-screen speeches/prayers editor route (specs/v2-unified-cards.md,
 * N2). `react-native` is aliased to a test stub (vitest.config.ts). Heavy children (SpeechSlot,
 * PeoplePicker, TopicSelectorModal) are mocked to lightweight seams; the data hooks are mocked so
 * we can drive the sunday-type / managePrayers matrix and assert which rows the screen renders.
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
// Imported after the (hoisted) jest.mock calls below take effect.
import SpeechesEditScreen from '../app/speeches/[date]';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DATE = '2026-08-02';

// Mutable mockState shared with the hoisted mocks.
const mockState = {
  managePrayers: true,
  exceptions: [] as { date: string; reason: string; custom_reason?: string | null }[],
  speeches: [] as { id: string; position: number }[] | undefined,
  rendered: [] as { position: number; isPrayer: boolean }[],
};

function makeSpeech(position: number) {
  return {
    id: `sp${position}`,
    ward_id: 'w1',
    sunday_date: DATE,
    position,
    member_id: null,
    speaker_name: null,
    speaker_informal_name: null,
    speaker_phone: null,
    topic_title: null,
    topic_link: null,
    topic_collection: null,
    assigned_by_role: null,
    status: 'not_assigned' as const,
    contact_phone: null,
    is_delegated: false,
    delegate_for_name: null,
    created_at: '',
    updated_at: '',
  };
}

// --- Mocks ---

// Partial mock: keep initReactI18next (used by the real i18n loaded via getCurrentLanguage).
jest.mock('react-i18next', () => {
  const actual = (jest.requireActual('react-i18next')) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', text: '#fff', textSecondary: '#aaa', divider: '#333',
      primary: '#07f', warning: '#fb0',
    },
  }),
}));
jest.mock('../contexts/OnlineStatusContext', () => ({ useOnlineStatus: () => true }));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => require('react').createElement('SafeAreaView', {}, children),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ date: DATE }),
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock('../components/ErrorBoundary', () => ({
  ThemedErrorBoundary: ({ children }: { children?: React.ReactNode }) => require('react').createElement(require('react').Fragment, {}, children),
}));
jest.mock('../components/QueryErrorView', () => ({ QueryErrorView: () => null }));
jest.mock('../components/TopicSelectorModal', () => ({ TopicSelectorModal: () => null }));
jest.mock('../components/PeoplePicker', () => ({ PeoplePicker: () => null }));

// SpeechSlot mock: record each rendered row (position + prayer flag).
jest.mock('../components/SpeechSlot', () => ({
  SpeechSlot: ({ position, isPrayer }: { position: number; isPrayer?: boolean }) => {
    mockState.rendered.push({ position, isPrayer: !!isPrayer });
    return require('react').createElement('SpeechSlot', { testID: `slot-${position}` });
  },
}));

jest.mock('../hooks/useMembers', () => ({ useMembers: () => ({ data: [] }) }));
jest.mock('../hooks/useAgenda', () => ({
  useAgenda: () => ({ data: { has_second_speech: true } }),
  useUpdateAgendaByDate: () => ({ mutate: jest.fn() }),
}));
jest.mock('../hooks/useSundayTypes', () => ({
  useSundayExceptions: () => ({ data: mockState.exceptions, isError: false, error: null, refetch: jest.fn() }),
}));
jest.mock('../hooks/useSpeeches', () => {
  const actual = (jest.requireActual('../hooks/useSpeeches')) as Record<string, unknown>;
  return {
    ...actual,
    useSpeeches: () => ({ data: mockState.speeches, isError: false, error: null, refetch: jest.fn() }),
    useLazyCreateSpeeches: () => ({ mutate: jest.fn() }),
    useAssignSpeaker: () => ({ mutate: jest.fn() }),
    useAssignTopic: () => ({ mutate: jest.fn() }),
    useChangeStatus: () => ({ mutate: jest.fn() }),
    useRemoveAssignment: () => ({ mutate: jest.fn() }),
    useWardManagePrayers: () => ({ managePrayers: mockState.managePrayers, isLoading: false }),
  };
});
jest.mock('../lib/supabase', () => ({ supabase: {} }));

function render() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(SpeechesEditScreen));
  });
  return renderer;
}

function positions() {
  return mockState.rendered.map((r) => r.position).sort((a, b) => a - b);
}

beforeEach(() => {
  mockState.managePrayers = true;
  mockState.exceptions = [];
  mockState.speeches = [0, 1, 2, 3, 4].map(makeSpeech);
  mockState.rendered = [];
});

describe('Speeches edit screen (N2)', () => {
  it('renders opening/closing prayer rows + speech rows for a speeches Sunday (managePrayers on)', () => {
    render();
    expect(positions()).toEqual([0, 1, 2, 3, 4]);
    // Positions 0 and 4 render as prayer rows.
    const prayerPositions = mockState.rendered.filter((r) => r.isPrayer).map((r) => r.position).sort();
    expect(prayerPositions).toEqual([0, 4]);
  });

  it('renders no prayer rows when managePrayers is off (speeches 1..3 only)', () => {
    mockState.managePrayers = false;
    render();
    expect(positions()).toEqual([1, 2, 3]);
    expect(mockState.rendered.some((r) => r.isPrayer)).toBe(false);
  });

  it('renders only prayer rows for a testimony meeting (managePrayers on)', () => {
    mockState.exceptions = [{ date: DATE, reason: 'testimony_meeting' }];
    render();
    expect(positions()).toEqual([0, 4]);
    expect(mockState.rendered.every((r) => r.isPrayer)).toBe(true);
  });

  it('renders nothing (no rows) for a testimony meeting when managePrayers is off', () => {
    mockState.managePrayers = false;
    mockState.exceptions = [{ date: DATE, reason: 'testimony_meeting' }];
    render();
    expect(mockState.rendered.length).toBe(0);
  });
});

/**
 * Behavioral test for the full-screen speeches/prayers editor route (specs/v2-unified-cards.md,
 * N2). `react-native` is aliased to a test stub (vitest.config.ts). Heavy children (SpeechSlot,
 * PeoplePicker, TopicSelectorModal) are mocked to lightweight seams; the data hooks are mocked so
 * we can drive the sunday-type / managePrayers matrix and assert which rows the screen renders.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import TestRenderer from 'react-test-renderer';
// Imported after the (hoisted) vi.mock calls below take effect.
import SpeechesEditScreen from '../app/speeches/[date]';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const DATE = '2026-08-02';

// Mutable state shared with the hoisted mocks.
const state = vi.hoisted(() => ({
  managePrayers: true,
  exceptions: [] as { date: string; reason: string; custom_reason?: string | null }[],
  speeches: [] as { id: string; position: number }[] | undefined,
  rendered: [] as { position: number; isPrayer: boolean }[],
}));

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
vi.mock('react-i18next', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, useTranslation: () => ({ t: (k: string) => k }) };
});
vi.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', text: '#fff', textSecondary: '#aaa', divider: '#333',
      primary: '#07f', warning: '#fb0',
    },
  }),
}));
vi.mock('../contexts/OnlineStatusContext', () => ({ useOnlineStatus: () => true }));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => React.createElement('SafeAreaView', {}, children),
}));

vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ date: DATE }),
  useRouter: () => ({ back: vi.fn() }),
}));

vi.mock('../components/ErrorBoundary', () => ({
  ThemedErrorBoundary: ({ children }: { children?: React.ReactNode }) => React.createElement(React.Fragment, {}, children),
}));
vi.mock('../components/QueryErrorView', () => ({ QueryErrorView: () => null }));
vi.mock('../components/TopicSelectorModal', () => ({ TopicSelectorModal: () => null }));
vi.mock('../components/PeoplePicker', () => ({ PeoplePicker: () => null }));

// SpeechSlot mock: record each rendered row (position + prayer flag).
vi.mock('../components/SpeechSlot', () => ({
  SpeechSlot: ({ position, isPrayer }: { position: number; isPrayer?: boolean }) => {
    state.rendered.push({ position, isPrayer: !!isPrayer });
    return React.createElement('SpeechSlot', { testID: `slot-${position}` });
  },
}));

vi.mock('../hooks/useMembers', () => ({ useMembers: () => ({ data: [] }) }));
vi.mock('../hooks/useAgenda', () => ({
  useAgenda: () => ({ data: { has_second_speech: true } }),
  useUpdateAgendaByDate: () => ({ mutate: vi.fn() }),
}));
vi.mock('../hooks/useSundayTypes', () => ({
  useSundayExceptions: () => ({ data: state.exceptions, isError: false, error: null, refetch: vi.fn() }),
}));
vi.mock('../hooks/useSpeeches', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useSpeeches: () => ({ data: state.speeches, isError: false, error: null, refetch: vi.fn() }),
    useLazyCreateSpeeches: () => ({ mutate: vi.fn() }),
    useAssignSpeaker: () => ({ mutate: vi.fn() }),
    useAssignTopic: () => ({ mutate: vi.fn() }),
    useChangeStatus: () => ({ mutate: vi.fn() }),
    useRemoveAssignment: () => ({ mutate: vi.fn() }),
    useWardManagePrayers: () => ({ managePrayers: state.managePrayers, isLoading: false }),
  };
});
vi.mock('../lib/supabase', () => ({ supabase: {} }));

function render() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(React.createElement(SpeechesEditScreen));
  });
  return renderer;
}

function positions() {
  return state.rendered.map((r) => r.position).sort((a, b) => a - b);
}

beforeEach(() => {
  state.managePrayers = true;
  state.exceptions = [];
  state.speeches = [0, 1, 2, 3, 4].map(makeSpeech);
  state.rendered = [];
});

describe('Speeches edit screen (N2)', () => {
  it('renders opening/closing prayer rows + speech rows for a speeches Sunday (managePrayers on)', () => {
    render();
    expect(positions()).toEqual([0, 1, 2, 3, 4]);
    // Positions 0 and 4 render as prayer rows.
    const prayerPositions = state.rendered.filter((r) => r.isPrayer).map((r) => r.position).sort();
    expect(prayerPositions).toEqual([0, 4]);
  });

  it('renders no prayer rows when managePrayers is off (speeches 1..3 only)', () => {
    state.managePrayers = false;
    render();
    expect(positions()).toEqual([1, 2, 3]);
    expect(state.rendered.some((r) => r.isPrayer)).toBe(false);
  });

  it('renders only prayer rows for a testimony meeting (managePrayers on)', () => {
    state.exceptions = [{ date: DATE, reason: 'testimony_meeting' }];
    render();
    expect(positions()).toEqual([0, 4]);
    expect(state.rendered.every((r) => r.isPrayer)).toBe(true);
  });

  it('renders nothing (no rows) for a testimony meeting when managePrayers is off', () => {
    state.managePrayers = false;
    state.exceptions = [{ date: DATE, reason: 'testimony_meeting' }];
    render();
    expect(state.rendered.length).toBe(0);
  });
});

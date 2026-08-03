/**
 * F057: topic/speaker field visibility parity in SpeechSlot (CR-267).
 *
 * The previous version of this file imported nothing from src/. It re-declared the guard —
 *
 *     function computeShowTopicRow(isPrayer: boolean) { return !isPrayer }
 *     it('...', () => expect(computeShowTopicRow(false)).toBe(true))
 *
 * — and asserted its own copy, 20 times. The rule it describes is real and worth keeping: a speech
 * slot must show its topic field even before a speech row exists, or the bishopric cannot assign a
 * topic ahead of a speaker; and a prayer slot must not show one at all. These render the component.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import type { Speech, SpeechStatus } from '../types/database';

const mockPermissions = { value: new Set<string>(['speech:assign', 'speech:unassign', 'prayer:assign', 'prayer:unassign', 'speech:status']) };

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      background: '#000', card: '#111', text: '#fff', textSecondary: '#aaa',
      textTertiary: '#888', primary: '#07f', onPrimary: '#fff', border: '#333',
      error: '#f00', errorContainer: '#300', surfaceVariant: '#222', divider: '#333',
      inputBackground: '#111', inputBorder: '#222', placeholder: '#555',
      primaryContainer: '#013', success: '#0a0', warning: '#fa0',
    },
  }),
}));
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ hasPermission: (p: string) => mockPermissions.value.has(p) }),
}));
// SpeechSlot -> StatusChangeModal -> useSpeeches -> i18n, which boots i18next at module load.
jest.mock('../i18n', () => ({
  __esModule: true,
  default: { t: (k: string) => k },
  getCurrentLanguage: () => 'pt-BR',
  changeLanguage: jest.fn(),
  SUPPORTED_LANGUAGES: ['pt-BR', 'en-US', 'es-LA'],
}));
jest.mock('../lib/supabase', () => ({ supabase: { from: jest.fn(), auth: {} } }));

import { SpeechSlot } from '../components/SpeechSlot';

function makeSpeech(over: Partial<Speech> = {}): Speech {
  return {
    id: 'sp1',
    ward_id: 'w1',
    sunday_date: '2026-08-09',
    position: 1,
    member_id: null,
    speaker_name: null,
    speaker_informal_name: null,
    speaker_phone: null,
    contact_phone: null,
    is_delegated: false,
    delegate_for_name: null,
    topic_title: null,
    topic_link: null,
    topic_collection: null,
    status: 'not_assigned' as SpeechStatus,
    assigned_by_role: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...over,
  } as Speech;
}

async function renderSlot(props: Partial<React.ComponentProps<typeof SpeechSlot>> = {}) {
  await render(
    <SpeechSlot
      speech={null}
      position={1}
      onOpenSpeakerSelector={jest.fn()}
      onOpenTopicSelector={jest.fn()}
      {...props}
    />
  );
}

const speakerField = (position: number) =>
  screen.queryByTestId(`speech-slot-${position}-speaker-button`);
const topicField = (position: number) =>
  screen.queryByTestId(`speech-slot-${position}-topic-button`);

beforeEach(() => {
  mockPermissions.value = new Set([
    'speech:assign', 'speech:unassign', 'prayer:assign', 'prayer:unassign', 'speech:status',
  ]);
});

describe('SpeechSlot — a speech slot shows both fields, assigned or not', () => {
  it.each([1, 2, 3])('position %i with no speech row yet shows speaker AND topic', async (position) => {
    // The parity rule: a topic can be chosen before a speaker exists. Hiding the topic field until
    // a speech row is created is the bug CR-267 fixed.
    await renderSlot({ position, speech: null });

    expect(speakerField(position)).not.toBeNull();
    expect(topicField(position)).not.toBeNull();
  });

  it.each([1, 2, 3])('position %i with an assigned speech shows both', async (position) => {
    await renderSlot({
      position,
      speech: makeSpeech({ position, speaker_name: 'Ana', status: 'assigned_not_invited' }),
    });

    expect(speakerField(position)).not.toBeNull();
    expect(topicField(position)).not.toBeNull();
  });

  it('renders the assigned speaker and topic text', async () => {
    await renderSlot({
      speech: makeSpeech({ speaker_name: 'Ana Silva', topic_title: 'Fé em Cristo' }),
    });

    expect(screen.queryByText('Ana Silva')).not.toBeNull();
    expect(screen.queryByText('Fé em Cristo')).not.toBeNull();
  });
});

describe('SpeechSlot — a prayer slot has no topic', () => {
  it.each([0, 4])('position %i shows the speaker field but no topic field', async (position) => {
    // A prayer has no subject to assign; rendering a topic field invites data that means nothing.
    await renderSlot({ position, isPrayer: true, speech: makeSpeech({ position }) });

    expect(speakerField(position)).not.toBeNull();
    expect(topicField(position)).toBeNull();
  });

  it('hides the topic even when the row somehow carries one', async () => {
    await renderSlot({
      position: 0,
      isPrayer: true,
      speech: makeSpeech({ position: 0, topic_title: 'Leftover' }),
    });

    expect(topicField(0)).toBeNull();
    expect(screen.queryByText('Leftover')).toBeNull();
  });

  it('offers no second-speech toggle on a prayer', async () => {
    await renderSlot({
      position: 2,
      isPrayer: true,
      isSecondSpeechEnabled: true,
      onToggleSecondSpeech: jest.fn(),
    });

    expect(screen.queryByTestId('speech-slot-2-toggle')).toBeNull();
  });
});

describe('SpeechSlot — position 2 turned off', () => {
  it('still shows both placeholder fields, so the slot does not vanish', async () => {
    // AC-057-2: the disabled branch renders its own pair of placeholders rather than falling
    // through the topic guard, so the card keeps its shape when the 2nd speech is off.
    await renderSlot({ position: 2, isSecondSpeechEnabled: false, speech: null });

    expect(screen.queryByText('speeches.selectSpeaker')).not.toBeNull();
    expect(screen.queryByText('speeches.selectTopic')).not.toBeNull();
  });

  it('makes them inert — no interactive speaker or topic control', async () => {
    await renderSlot({ position: 2, isSecondSpeechEnabled: false, speech: null });

    expect(speakerField(2)).toBeNull();
    expect(topicField(2)).toBeNull();
    expect(screen.queryByTestId('speech-slot-2-status-button')).toBeNull();
  });

  it('keeps the toggle itself reachable, or it could never be turned back on', async () => {
    await renderSlot({
      position: 2,
      isSecondSpeechEnabled: false,
      onToggleSecondSpeech: jest.fn(),
    });

    expect(screen.queryByTestId('speech-slot-2-toggle')).not.toBeNull();
  });

  it('restores the real fields when it is turned on', async () => {
    await renderSlot({ position: 2, isSecondSpeechEnabled: true, speech: makeSpeech({ position: 2 }) });

    expect(speakerField(2)).not.toBeNull();
    expect(topicField(2)).not.toBeNull();
  });

  it('does not disable positions 1 and 3 when 2 is off', async () => {
    for (const position of [1, 3]) {
      await renderSlot({ position, isSecondSpeechEnabled: false, speech: makeSpeech({ position }) });
      expect(speakerField(position)).not.toBeNull();
      expect(topicField(position)).not.toBeNull();
    }
  });
});

describe('SpeechSlot — an observer sees the fields but cannot act', () => {
  it('renders both fields read-only', async () => {
    mockPermissions.value = new Set();
    await renderSlot({ speech: makeSpeech({ speaker_name: 'Ana' }) });

    expect(speakerField(1)).toBeDisabled();
    expect(topicField(1)).toBeDisabled();
  });

  it('offers no remove control without the unassign permission', async () => {
    mockPermissions.value = new Set(['speech:assign']);
    await renderSlot({ speech: makeSpeech({ speaker_name: 'Ana' }) });

    expect(screen.queryByTestId('speech-slot-1-remove-button')).toBeNull();
  });
});

describe('SpeechSlot — offline read-only mode', () => {
  it('disables both fields even for a bishopric', async () => {
    await renderSlot({ speech: makeSpeech({ speaker_name: 'Ana' }), disabled: true });

    expect(speakerField(1)).toBeDisabled();
    expect(topicField(1)).toBeDisabled();
  });
});

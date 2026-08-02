/**
 * Behavioral tests for UnifiedSundayCard (v2.0 single collapsed card).
 *
 * `react-native` is aliased to a test stub (vitest.config.ts). Icons, StatusLED, theme, i18n and
 * the current-language helper are mocked per-file so we render the card in the node environment and
 * assert on host-node props (colors, testIDs, tap handlers).
 */
import React from 'react';
import type { TestInstance as Node } from 'test-renderer';
import { render as rtlRender, screen, fireEvent, act } from '@testing-library/react-native';
import { UnifiedSundayCard, type UnifiedSundayCardProps, type UnifiedNameRow } from '../components/UnifiedSundayCard';
import { AttendanceBlock } from '../components/AttendanceBlock';


const GREEN = '#22c55e';
const SECONDARY = '#aaa';
const WARNING = '#ff0';

// Render icons + StatusLED as identifiable host elements (no react-native-svg / reanimated needed).
jest.mock('../components/icons', () => ({
  ChevronRightIcon: (p: Record<string, unknown>) => require('react').createElement('ChevronRightIcon', p),
  PencilIcon: (p: Record<string, unknown>) => require('react').createElement('PencilIcon', p),
}));

jest.mock('../components/StatusLED', () => ({
  StatusLED: (p: Record<string, unknown>) => require('react').createElement('StatusLED', p),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, opts?: unknown) =>
      opts && typeof opts === 'object' ? `${k}${JSON.stringify(opts)}` : k,
  }),
}));

jest.mock('../i18n', () => ({ getCurrentLanguage: () => 'en-US' }));

jest.mock('../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      card: '#111',
      border: '#333',
      text: '#fff',
      textSecondary: SECONDARY,
      primary: '#07f',
      primaryContainer: '#012',
      surfaceVariant: '#222',
      warning: WARNING,
    },
  }),
}));

// --- Helpers ---


function baseProps(over: Partial<UnifiedSundayCardProps> = {}): UnifiedSundayCardProps {
  return {
    date: '2026-08-02',
    exceptionReason: null,
    roles: { preside: false, conduct: false, piano: false, lead: false },
    speakers: { done: 0, total: 3 },
    prayers: { done: 0, total: 2 },
    hymns: { done: 0, total: 4 },
    managePrayers: false,
    nameRows: [],
    onPressStatus: jest.fn(),
    onPressSpeakers: jest.fn(),
    ...over,
  };
}

async function render(props: UnifiedSundayCardProps) {
  await rtlRender(React.createElement(UnifiedSundayCard, props));
  return null; // call-site compatibility; the helpers query `screen`
}

function byTestID(root: unknown, testID: string): Node[] {
  return screen.root!.queryAll((n) => typeof n.type === 'string' && n.props.testID === testID);
}

function flattenStyle(style: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const walk = (s: unknown) => {
    if (!s) return;
    if (Array.isArray(s)) { s.forEach(walk); return; }
    if (typeof s === 'object') Object.assign(out, s as Record<string, unknown>);
  };
  walk(style);
  return out;
}

function colorOf(root: unknown, testID: string): unknown {
  const node = byTestID(null, testID)[0];
  return flattenStyle(node.props.style).color;
}

async function press(_root: unknown, testID: string) {
  await fireEvent.press(screen.getByTestId(testID));
}

// --- Tests ---

describe('UnifiedSundayCard — Block 1 roles line (U2)', () => {
  it('colors each role green when filled and secondary when not', async () => {
    await render(
      baseProps({ roles: { preside: true, conduct: false, piano: true, lead: false } })
    );
    expect(colorOf(null, 'unified-role-preside')).toBe(GREEN);
    expect(colorOf(null, 'unified-role-conduct')).toBe(SECONDARY);
    expect(colorOf(null, 'unified-role-piano')).toBe(GREEN);
    expect(colorOf(null, 'unified-role-lead')).toBe(SECONDARY);
  });
});

describe('UnifiedSundayCard — Block 1 counts (U2)', () => {
  it('renders speakers + hymns counts; hides prayers when managePrayers is off', async () => {
    await render(baseProps({ managePrayers: false }));
    expect(byTestID(null, 'unified-count-speakers').length).toBe(1);
    expect(byTestID(null, 'unified-count-hymns').length).toBe(1);
    expect(byTestID(null, 'unified-count-prayers').length).toBe(0);
  });

  it('renders prayers count when managePrayers is on', async () => {
    await render(baseProps({ managePrayers: true }));
    expect(byTestID(null, 'unified-count-prayers').length).toBe(1);
  });

  it('colors a count green only when done === total', async () => {
    await render(baseProps({ speakers: { done: 1, total: 3 } }));
    expect(colorOf(null, 'unified-count-speakers')).toBe(SECONDARY);
    await render(baseProps({ speakers: { done: 3, total: 3 } }));
    expect(colorOf(null, 'unified-count-speakers')).toBe(GREEN);
  });
});

describe('UnifiedSundayCard — Block 2 name rows (U3, U4)', () => {
  const rows: UnifiedNameRow[] = [
    { key: 'speaker-1', kind: 'speaker', status: 'assigned_confirmed', name: 'Alice' },
    { key: 'speaker-2', kind: 'speaker', status: 'not_assigned', name: null },
    { key: 'speaker-3', kind: 'speaker', status: 'assigned_invited', name: 'Carol' },
  ];

  it('renders one row per name row with a StatusLED', async () => {
    await render(baseProps({ nameRows: rows }));
    expect(byTestID(null, 'unified-name-row-speaker-1').length).toBe(1);
    expect(byTestID(null, 'unified-name-row-speaker-3').length).toBe(1);
    expect(screen.root!.queryAll((n) => n.type === 'StatusLED').length).toBe(3);
    expect(byTestID(null, 'unified-empty-row').length).toBe(0);
  });

  it('shows a single empty-state row when no name is assigned (U4)', async () => {
    const empty: UnifiedNameRow[] = [
      { key: 'speaker-1', kind: 'speaker', status: 'not_assigned', name: null },
      { key: 'speaker-2', kind: 'speaker', status: 'not_assigned', name: null },
      { key: 'speaker-3', kind: 'speaker', status: 'not_assigned', name: '' },
    ];
    await render(baseProps({ nameRows: empty }));
    expect(byTestID(null, 'unified-empty-row').length).toBe(1);
    expect(screen.root!.queryAll((n) => n.type === 'StatusLED').length).toBe(1);
    expect(byTestID(null, 'unified-name-row-speaker-1').length).toBe(0);
  });
});

describe('UnifiedSundayCard — testimony meeting (U6)', () => {
  const prayerRows: UnifiedNameRow[] = [
    { key: 'prayer-0', kind: 'prayer', status: 'assigned_confirmed', name: 'Opener' },
    { key: 'prayer-4', kind: 'prayer', status: 'not_assigned', name: null },
  ];

  it('replaces the speakers line with a yellow testimony label', async () => {
    await render(baseProps({ exceptionReason: 'testimony_meeting' }));
    expect(byTestID(null, 'unified-testimony').length).toBe(1);
    expect(byTestID(null, 'unified-count-speakers').length).toBe(0);
    expect(colorOf(null, 'unified-testimony')).toBe(WARNING);
  });

  it('omits Block 2 when managePrayers is off', async () => {
    await render(
      baseProps({ exceptionReason: 'testimony_meeting', managePrayers: false })
    );
    expect(byTestID(null, 'unified-speakers-2026-08-02').length).toBe(0);
  });

  it('shows only prayer rows in Block 2 when managePrayers is on', async () => {
    await render(
      baseProps({
        exceptionReason: 'testimony_meeting',
        managePrayers: true,
        nameRows: prayerRows,
      })
    );
    expect(byTestID(null, 'unified-speakers-2026-08-02').length).toBe(1);
    expect(byTestID(null, 'unified-name-row-prayer-0').length).toBe(1);
    expect(byTestID(null, 'unified-name-row-prayer-4').length).toBe(1);
  });
});

describe('UnifiedSundayCard — names-block empty message + testimony (item 3)', () => {
  const speakerRows = (over: Partial<UnifiedNameRow>[] = []): UnifiedNameRow[] =>
    [1, 2, 3].map((n, i) => ({ key: `speaker-${n}`, kind: 'speaker', status: 'not_assigned', name: null, ...(over[i] ?? {}) }));
  const fiveRows: UnifiedNameRow[] = [
    { key: 'prayer-0', kind: 'prayer', status: 'not_assigned', name: null },
    ...speakerRows(),
    { key: 'prayer-4', kind: 'prayer', status: 'not_assigned', name: null },
  ];
  const testimonyPrayers: UnifiedNameRow[] = [
    { key: 'prayer-0', kind: 'prayer', status: 'assigned_confirmed', name: 'Opener' },
    { key: 'prayer-4', kind: 'prayer', status: 'not_assigned', name: null },
  ];
  function textOf(_root: unknown, testID: string): string {
    const node = byTestID(null, testID)[0];
    const text = node.queryAll((n) => n.type === 'Text')[0];
    return String(text.props.children);
  }

  it('regular + prayers off + all unassigned → noSpeakers message (AC4)', async () => {
    await render(baseProps({ managePrayers: false, nameRows: speakerRows() }));
    expect(textOf(null, 'unified-empty-row')).toBe('agenda.noSpeakers');
  });

  it('regular + prayers on + all unassigned → generic noAssignments message (AC5)', async () => {
    await render(baseProps({ managePrayers: true, nameRows: fiveRows }));
    expect(textOf(null, 'unified-empty-row')).toBe('agenda.noAssignments');
  });

  it('regular + at least one assigned → rows, no empty message (AC6)', async () => {
    await render(baseProps({ nameRows: speakerRows([{ name: 'Alice', status: 'assigned_confirmed' }]) }));
    expect(byTestID(null, 'unified-empty-row').length).toBe(0);
    expect(byTestID(null, 'unified-name-row-speaker-1').length).toBe(1);
  });

  it('testimony + prayers off + hideStatusBlock → single yellow testimony line (AC7)', async () => {
    await render(
      baseProps({ exceptionReason: 'testimony_meeting', managePrayers: false, hideStatusBlock: true, nameRows: [] })
    );
    const line = byTestID(null, 'unified-block2-testimony')[0];
    expect(line).toBeDefined();
    const text = line.queryAll((n) => n.type === 'Text')[0];
    expect(flattenStyle(text.props.style).color).toBe(WARNING);
  });

  const testimonyNoPrayers: UnifiedNameRow[] = [
    { key: 'prayer-0', kind: 'prayer', status: 'not_assigned', name: null },
    { key: 'prayer-4', kind: 'prayer', status: 'not_assigned', name: null },
  ];

  it('testimony + prayers on + hideStatusBlock + no prayers → label first, then noPrayersInvited row (item2 AC2.1)', async () => {
    await render(
      baseProps({ exceptionReason: 'testimony_meeting', managePrayers: true, hideStatusBlock: true, nameRows: testimonyNoPrayers })
    );
    // testimony label present, empty-prayers row present, and NO prayer name rows.
    expect(byTestID(null, 'unified-block2-testimony').length).toBe(1);
    expect(textOf(null, 'unified-prayers-empty')).toBe('agenda.noPrayersInvited');
    expect(byTestID(null, 'unified-name-row-prayer-0').length).toBe(0);
    expect(byTestID(null, 'unified-name-row-prayer-4').length).toBe(0);
    // label comes first (tree order): testimony precedes the empty-prayers row.
    const order = screen.root!.queryAll(
      (n) => typeof n.type === 'string' &&
        (n.props.testID === 'unified-block2-testimony' || n.props.testID === 'unified-prayers-empty')
    );
    expect(order[0].props.testID).toBe('unified-block2-testimony');
  });

  it('testimony + prayers on + hideStatusBlock + ≥1 prayer → label first, then the two prayer rows (item2 AC2.2)', async () => {
    await render(
      baseProps({ exceptionReason: 'testimony_meeting', managePrayers: true, hideStatusBlock: true, nameRows: testimonyPrayers })
    );
    expect(byTestID(null, 'unified-prayers-empty').length).toBe(0);
    expect(byTestID(null, 'unified-name-row-prayer-0').length).toBe(1);
    expect(byTestID(null, 'unified-name-row-prayer-4').length).toBe(1);
    // testimony label comes before the prayer rows.
    const order = screen.root!.queryAll(
      (n) => typeof n.type === 'string' &&
        (n.props.testID === 'unified-block2-testimony' || n.props.testID === 'unified-name-row-prayer-0')
    );
    expect(order[0].props.testID).toBe('unified-block2-testimony');
  });

  it('testimony + NOT hideStatusBlock → no testimony line in the names block (AC9)', async () => {
    await render(
      baseProps({ exceptionReason: 'testimony_meeting', managePrayers: true, nameRows: testimonyPrayers })
    );
    expect(byTestID(null, 'unified-block2-testimony').length).toBe(0);
    expect(byTestID(null, 'unified-name-row-prayer-0').length).toBe(1);
  });
});

describe('UnifiedSundayCard — no-sacrament Sunday (U5)', () => {
  it('shows only the yellow reason and omits Block 2 and counts', async () => {
    await render(
      baseProps({ exceptionReason: 'general_conference', nameRows: [
        { key: 'speaker-1', kind: 'speaker', status: 'not_assigned', name: 'X' },
      ] })
    );
    expect(byTestID(null, 'unified-reason').length).toBe(1);
    expect(colorOf(null, 'unified-reason')).toBe(WARNING);
    expect(byTestID(null, 'unified-count-speakers').length).toBe(0);
    expect(byTestID(null, 'unified-count-hymns').length).toBe(0);
    expect(byTestID(null, 'unified-speakers-2026-08-02').length).toBe(0);
    // 1a: no roles line for a no-sacrament Sunday. It still has ONE chevron (status zone) so it
    // can be expanded to change the Sunday type; Block 2 (with its own chevron) is omitted.
    expect(byTestID(null, 'unified-roles').length).toBe(0);
    expect(screen.root!.queryAll((n) => n.type === 'ChevronRightIcon').length).toBe(1);
  });

  it('makes the WHOLE card (incl. DateBlock) the tap zone → onPressStatus (#3)', async () => {
    const onPressStatus = jest.fn();
    await render(
      baseProps({ exceptionReason: 'general_conference', onPressStatus })
    );
    // There is a single pressable, and it is the status zone (no separate speakers zone).
    const pressables = screen.root!.queryAll(
      // Real Pressable maps onPress onto the responder handlers, so the host node exposes
      // onStartShouldSetResponder rather than onPress.
      (n) => typeof n.type === 'string' && typeof n.props.onStartShouldSetResponder === 'function'
    );
    expect(pressables.map((n) => n.props.testID)).toEqual(['unified-status-2026-08-02']);
    // That single pressable wraps the DateBlock too, so tapping anywhere on the card expands it.
    await press(null, 'unified-status-2026-08-02');
    expect(onPressStatus).toHaveBeenCalledWith('2026-08-02');
  });
});

describe('UnifiedSundayCard — attendance tile (past Sundays)', () => {
  const ATT = 'unified-attendance-2026-08-02';

  it('is hidden by default (no isPast / no callback)', async () => {
    await render(baseProps());
    expect(byTestID(null, ATT).length).toBe(0);
  });

  it('is shown when isPast and onSetAttendance are both provided', async () => {
    await render(baseProps({ isPast: true, onSetAttendance: jest.fn() }));
    expect(byTestID(null, ATT).length).toBe(1);
  });

  // P0-2 (C): offline, the collapsed past-Sunday card must not allow attendance edits.
  it('passes attendanceDisabled through to the AttendanceBlock (read-only offline)', async () => {
    await render(baseProps({ isPast: true, onSetAttendance: jest.fn(), attendanceDisabled: true }));
    // Assert the outcome rather than the prop: a disabled tile must not open its inline editor.
    const tile = screen.getByTestId('unified-attendance-2026-08-02');
    await fireEvent.press(tile);
    expect(screen.queryByTestId('unified-attendance-2026-08-02-input')).toBeNull();
  });

  it('attendance tile is editable when not disabled (online)', async () => {
    await render(baseProps({ isPast: true, onSetAttendance: jest.fn() }));
    const tile = screen.getByTestId('unified-attendance-2026-08-02');
    await fireEvent.press(tile);
    expect(screen.getByTestId('unified-attendance-2026-08-02-input')).toBeOnTheScreen();
  });

  it('is hidden when isPast but no callback', async () => {
    await render(baseProps({ isPast: true }));
    expect(byTestID(null, ATT).length).toBe(0);
  });

  it('is hidden for future Sundays even with a callback', async () => {
    await render(baseProps({ isPast: false, onSetAttendance: jest.fn() }));
    expect(byTestID(null, ATT).length).toBe(0);
  });

  it('is hidden for no-sacrament Sundays even when past', async () => {
    await render(
      baseProps({ isPast: true, onSetAttendance: jest.fn(), exceptionReason: 'general_conference' })
    );
    expect(byTestID(null, ATT).length).toBe(0);
  });

  it('tapping the attendance tile does NOT call onPressStatus', async () => {
    const onPressStatus = jest.fn();
    await render(baseProps({ isPast: true, onSetAttendance: jest.fn(), onPressStatus }));
    await press(null, ATT);
    expect(onPressStatus).not.toHaveBeenCalled();
  });
});

describe('UnifiedSundayCard — hideStatusBlock (Home upcoming cards)', () => {
  it('hides Block 1 (status) but keeps Block 2 (speakers) when hideStatusBlock', async () => {
    await render(
      baseProps({ hideStatusBlock: true, nameRows: [{ key: 's1', kind: 'speaker', name: 'Alice', status: 'assigned_confirmed' }] })
    );
    expect(byTestID(null, 'unified-status-2026-08-02').length).toBe(0);
    expect(byTestID(null, 'unified-speakers-2026-08-02').length).toBe(1);
  });

  it('shows Block 1 by default (hero / Agendas cards)', async () => {
    await render(baseProps());
    expect(byTestID(null, 'unified-status-2026-08-02').length).toBe(1);
  });

  it('does not affect the no-sacrament layout (reason still shown)', async () => {
    await render(baseProps({ exceptionReason: 'stake_conference', hideStatusBlock: true }));
    // No-sacrament card keeps its single status/reason zone.
    expect(byTestID(null, 'unified-status-2026-08-02').length).toBe(1);
  });
});

describe('UnifiedSundayCard — tap zones + chevron (U7)', () => {
  it('calls onPressStatus when the status zone is tapped', async () => {
    const onPressStatus = jest.fn();
    await render(baseProps({ onPressStatus }));
    await press(null, 'unified-status-2026-08-02');
    expect(onPressStatus).toHaveBeenCalledWith('2026-08-02');
  });

  it('calls onPressSpeakers when the speakers zone is tapped', async () => {
    const onPressSpeakers = jest.fn();
    await render(baseProps({ onPressSpeakers }));
    await press(null, 'unified-speakers-2026-08-02');
    expect(onPressSpeakers).toHaveBeenCalledWith('2026-08-02');
  });

  it('has exactly two pressable zones (DateBlock is not pressable)', async () => {
    await render(baseProps());
    const pressables = screen.root!.queryAll(
      // Real Pressable maps onPress onto the responder handlers, so the host node exposes
      // onStartShouldSetResponder rather than onPress.
      (n) => typeof n.type === 'string' && typeof n.props.onStartShouldSetResponder === 'function'
    );
    const ids = pressables.map((n) => n.props.testID).sort();
    expect(ids).toEqual(['unified-speakers-2026-08-02', 'unified-status-2026-08-02']);
  });

  it('renders a right chevron and no pencil', async () => {
    await render(baseProps());
    // Two chevrons on a regular card: the Block-1 status zone + the Block-2 speakers zone (#3).
    expect(screen.root!.queryAll((n) => n.type === 'ChevronRightIcon').length).toBe(2);
    expect(screen.root!.queryAll((n) => n.type === 'PencilIcon').length).toBe(0);
  });
});

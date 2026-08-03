/**
 * NOTE — the source-text blocks that lived in this file were deleted.
 *
 * They were ~20 `readFileSync(...)` + `toContain('multiline')` / `toContain('dragHitSlop')` /
 * `toContain('startEdit(idx)')` assertions against EditableListField.tsx, AgendaForm.tsx and
 * migration 032. They cannot tell whether typing two lines creates two items, and they break on a
 * rename that changes nothing.
 *
 * Replaced by behaviour:
 *   editable-list-field.test.tsx — add / paste-split / inline edit / delete / drag config /
 *                                  onItemPress and onAddPress variants / disabled / legacy arrays
 *   list-field.test.ts           — parseItems and joinItems, including the migration-032
 *                                  TEXT[] -> TEXT compatibility branch
 * What remains below imports from src/ and asserts real behaviour.
 */

/**
 * F071 Tests (CR-281, CR-282, CR-283)
 *
 * CR-281: Inline edit TextInput multiline/blurOnSubmit/paddingVertical
 * CR-282: DraggableFlatList activationDistance={9999}
 * CR-283: recognized_names rework (EditableListField + PeoplePicker)
 *
 * Tests import BEHAVIOR - no fs.readFileSync or string matching.
 */

import ptBR from '../i18n/locales/pt-BR.json';
import enUS from '../i18n/locales/en-US.json';
import esLA from '../i18n/locales/es-LA.json';
import { buildPresentationCards } from '../hooks/usePresentationMode';
import type { SundayAgenda } from '../types/database';

// parseItems/joinItems come from the real implementation. These files used to carry a
// hand-written copy, justified by "cannot import from EditableListField (react-native runtime
// dep)" — true of the component, but the logic itself has no such dependency and now lives in
// lib/. Every copy had drifted the same way: none had the Array.isArray branch, so the
// migration-032 shim could be deleted from production with all of these tests still green.
import { parseItems, joinItems } from '../lib/listField';

// Agenda factory
function makeAgenda(overrides: Partial<SundayAgenda> = {}): SundayAgenda {
  return {
    id: 'a1',
    ward_id: 'w1',
    sunday_date: '2026-03-08',
    presiding_name: null,
    conducting_name: null,
    recognized_names: null,
    welcome_new_families: null,
    announcements: null,
    pianist_name: null,
    conductor_name: null,
    opening_hymn_id: null,
    sacrament_hymn_id: null,
    intermediate_hymn_id: null,
    closing_hymn_id: null,
    has_baby_blessing: false,
    baby_blessing_names: null,
    has_baptism_confirmation: false,
    baptism_confirmation_names: null,
    has_stake_announcements: false,
    has_intermediate_hymn: true,
    has_special_presentation: false,
    special_presentation_description: null,
    has_second_speech: true,
    speaker_1_override: null,
    speaker_2_override: null,
    speaker_3_override: null,
    created_at: '2026-03-08T00:00:00Z',
    updated_at: '2026-03-08T00:00:00Z',
    designations: [],
    opening_prayer_member_id: null,
    opening_prayer_name: null,
    closing_prayer_member_id: null,
    closing_prayer_name: null,
    ...overrides,
  } as SundayAgenda;
}

const noopHymnLookup = (_id: string | null) => '';
const tFn = (key: string) => key;

// =============================================================================
// CR-281: S016-01 - Inline edit TextInput multiline, blurOnSubmit, editInput
// =============================================================================


// =============================================================================
// CR-282: S016-02 - DraggableFlatList activationDistance
// =============================================================================


// =============================================================================
// CR-283: S016-03 - i18n key agenda.addPresence
// =============================================================================

describe('CR-283 S016-03: i18n key agenda.addPresence', () => {
  it('i18n key agenda.addPresence exists in pt-BR', () => {
    expect((ptBR as any).agenda.addPresence).toBe('Reconhecer nova presença');
  });

  it('i18n key agenda.addPresence exists in en-US', () => {
    expect((enUS as any).agenda.addPresence).toBe('Recognize new presence');
  });

  it('i18n key agenda.addPresence exists in es-LA', () => {
    expect((esLA as any).agenda.addPresence).toBe('Reconocer nueva presencia');
  });

  it('SundayAgenda.recognized_names type is string | null (not string[])', () => {
    // Verify by constructing an agenda with string recognized_names
    const agenda = makeAgenda({ recognized_names: 'Alice\nBob' });
    expect(typeof agenda.recognized_names).toBe('string');
    expect(agenda.recognized_names).toBe('Alice\nBob');
  });
});

// =============================================================================
// CR-283: S016-04 - Migration 032 file exists
// =============================================================================


// =============================================================================
// CR-283: S016-05 - onItemPress/onAddPress callback props
// =============================================================================


// =============================================================================
// CR-283: S016-07 - AgendaForm recognized_names rework + usePresentationMode
// =============================================================================

describe('CR-283 S016-07: AgendaForm recognized_names rework', () => {
  // The six readFileSync assertions that were here (EditableListField present, onItemPress /
  // onAddPress passed, the addPresence placeholder, PeoplePicker instead of MemberSelectorModal,
  // be_recognized + multiSelect) are all covered behaviourally by agenda-people-picker.test.tsx,
  // which renders AgendaForm and inspects the props the picker is actually opened with.

  it('recognition disabledNames: add mode = all current names', () => {
    // Test the logic: in add mode, all current items are disabled
    const currentItems = ['Alice', 'Bob'];
    const mode = 'add' as 'add' | 'edit';
    const editIndex = undefined;
    const disabledNames = mode === 'edit' && editIndex !== undefined
      ? currentItems.filter((_, i) => i !== editIndex)
      : currentItems;
    expect(disabledNames).toEqual(['Alice', 'Bob']);
  });
  it('recognition disabledNames: edit mode = all except current', () => {
    // Test the logic: in edit mode, all except current are disabled
    const currentItems = ['Alice', 'Bob', 'Charlie'];
    const mode = 'edit' as const;
    const editIndex = 1;
    const disabledNames = mode === 'edit' && editIndex !== undefined
      ? currentItems.filter((_, i) => i !== editIndex)
      : currentItems;
    expect(disabledNames).toEqual(['Alice', 'Charlie']);
  });
  it('onSelect in add mode appends actor name to list', () => {
    const currentItems = ['Alice'];
    const newItems = [...currentItems, 'Bob'];
    expect(joinItems(newItems)).toBe('Alice\nBob');
  });
  it('onSelect in edit mode replaces name at editIndex', () => {
    const currentItems = ['Alice', 'Bob', 'Charlie'];
    const editIndex = 1;
    const newItems = [...currentItems];
    newItems[editIndex] = 'David';
    expect(joinItems(newItems)).toBe('Alice\nDavid\nCharlie');
  });
  it('onClose clears recognizeSelector (name preserved)', () => {
    // When closing without selecting, original items stay unchanged
    const original = 'Alice\nBob';
    expect(parseItems(original)).toEqual(['Alice', 'Bob']);
  });
});

describe('CR-283 S016-07: usePresentationMode recognized_names', () => {
  it('usePresentationMode: recognized_names uses bullet_list type', () => {
    const agenda = makeAgenda({ recognized_names: 'Alice\nBob' });
    const cards = buildPresentationCards(agenda, [], null, noopHymnLookup, tFn);
    const welcomeCard = cards[0];
    const recognizedField = welcomeCard.fields.find(
      (f) => f.label === 'agenda.recognizing'
    );
    expect(recognizedField).toBeDefined();
    expect(recognizedField!.type).toBe('bullet_list');
  });

  it('usePresentationMode: recognized_names value is raw string (no .join)', () => {
    const agenda = makeAgenda({ recognized_names: 'Alice\nBob' });
    const cards = buildPresentationCards(agenda, [], null, noopHymnLookup, tFn);
    const welcomeCard = cards[0];
    const recognizedField = welcomeCard.fields.find(
      (f) => f.label === 'agenda.recognizing'
    );
    expect(recognizedField!.value).toBe('Alice\nBob');
  });

  it('usePresentationMode: guard is truthy check (not .length)', () => {
    // null recognized_names should be omitted
    const agenda = makeAgenda({ recognized_names: null });
    const cards = buildPresentationCards(agenda, [], null, noopHymnLookup, tFn);
    const welcomeCard = cards[0];
    const recognizedField = welcomeCard.fields.find(
      (f) => f.label === 'agenda.recognizing'
    );
    expect(recognizedField).toBeUndefined();
  });
});

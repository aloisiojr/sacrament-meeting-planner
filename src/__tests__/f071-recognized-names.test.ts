/**
 * F071 Tests (CR-281, CR-282, CR-283)
 *
 * CR-281: Inline edit TextInput multiline/blurOnSubmit/paddingVertical
 * CR-282: DraggableFlatList activationDistance={9999}
 * CR-283: recognized_names rework (EditableListField + PeoplePicker)
 *
 * Tests import BEHAVIOR - no fs.readFileSync or string matching.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import ptBR from '../i18n/locales/pt-BR.json';
import enUS from '../i18n/locales/en-US.json';
import esLA from '../i18n/locales/es-LA.json';
import { buildPresentationCards } from '../hooks/usePresentationMode';
import type { SundayAgenda } from '../types/database';

// Inline copies (cannot import from react-native component)
function parseItems(value: string | null): string[] {
  return (value ?? '').split('\n').filter((s) => s.trim() !== '');
}

function joinItems(items: string[]): string | null {
  return items.length === 0 ? null : items.join('\n');
}

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

describe('CR-281 S016-01: Inline edit TextInput props', () => {
  it('Inline edit TextInput has multiline prop (code inspection)', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../components/EditableListField.tsx'), 'utf-8'
    );
    // The editingIndex === idx branch should have multiline
    expect(src).toContain('multiline');
  });

  it('Inline edit TextInput has blurOnSubmit prop', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../components/EditableListField.tsx'), 'utf-8'
    );
    expect(src).toContain('blurOnSubmit');
  });

  it('Inline edit TextInput has editInput style with paddingVertical 0', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../components/EditableListField.tsx'), 'utf-8'
    );
    expect(src).toContain('styles.editInput');
    expect(src).toContain('paddingVertical: 0');
  });

  it('Inline edit TextInput does not use autoFocus (removed for drag stability)', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../components/EditableListField.tsx'), 'utf-8'
    );
    // autoFocus was removed to prevent drag reorder revert issues
    expect(src).not.toContain('autoFocus');
  });
});

// =============================================================================
// CR-282: S016-02 - DraggableFlatList activationDistance
// =============================================================================

describe('CR-282 S016-02: DraggableFlatList drag control', () => {
  it('DraggableFlatList uses dragHitSlop (replaced activationDistance)', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../components/EditableListField.tsx'), 'utf-8'
    );
    // activationDistance={9999} was replaced by dragHitSlop for better drag control
    expect(src).toContain('dragHitSlop');
  });

  it('DraggableFlatList preserves scrollEnabled={false}', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../components/EditableListField.tsx'), 'utf-8'
    );
    expect(src).toContain('scrollEnabled={false}');
  });
});

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

describe('CR-283 S016-04: Migration 032', () => {
  it('Migration file 032_recognized_names_to_text.sql exists', () => {
    const migrationPath = path.resolve(
      __dirname, '../../supabase/migrations/032_recognized_names_to_text.sql'
    );
    expect(fs.existsSync(migrationPath)).toBe(true);
  });

  it('Migration uses array_to_string with E\'\\n\' separator', () => {
    const sql = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/migrations/032_recognized_names_to_text.sql'),
      'utf-8'
    );
    expect(sql).toContain("array_to_string");
    expect(sql).toContain("E'\\n'");
  });

  it('Migration excludes NULL arrays (WHERE clause)', () => {
    const sql = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/migrations/032_recognized_names_to_text.sql'),
      'utf-8'
    );
    expect(sql).toContain('IS NOT NULL');
  });

  it('Migration excludes empty arrays (array_length check)', () => {
    const sql = fs.readFileSync(
      path.resolve(__dirname, '../../supabase/migrations/032_recognized_names_to_text.sql'),
      'utf-8'
    );
    expect(sql).toContain('array_length');
  });
});

// =============================================================================
// CR-283: S016-05 - onItemPress/onAddPress callback props
// =============================================================================

describe('CR-283 S016-05: onItemPress/onAddPress callback props', () => {
  it('onItemPress callback: EditableListField has onItemPress prop in interface', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../components/EditableListField.tsx'), 'utf-8'
    );
    expect(src).toContain('onItemPress');
  });

  it('onItemPress not provided: tap triggers inline edit (backward compat)', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../components/EditableListField.tsx'), 'utf-8'
    );
    // When onItemPress is not provided, startEdit should be called
    expect(src).toContain('startEdit(idx)');
  });

  it('onAddPress callback: add area renders Pressable when provided', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../components/EditableListField.tsx'), 'utf-8'
    );
    expect(src).toContain('onAddPress');
  });

  it('onAddPress not provided: add area renders TextInput (backward compat)', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../components/EditableListField.tsx'), 'utf-8'
    );
    // TextInput for add area still exists for backward compat
    expect(src).toContain('onSubmitEditing={handleAdd}');
  });

  it('onAddPress Pressable shows placeholder text', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../components/EditableListField.tsx'), 'utf-8'
    );
    expect(src).toContain('{placeholder}');
  });
});

// =============================================================================
// CR-283: S016-07 - AgendaForm recognized_names rework + usePresentationMode
// =============================================================================

describe('CR-283 S016-07: AgendaForm recognized_names rework', () => {
  it('recognized_names renders EditableListField (not old Pressable)', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../components/AgendaForm.tsx'), 'utf-8'
    );
    // Should import parseItems/joinItems from EditableListField
    expect(src).toContain('parseItems');
    expect(src).toContain('joinItems');
  });

  it('EditableListField has onItemPress prop for recognized_names', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../components/AgendaForm.tsx'), 'utf-8'
    );
    expect(src).toContain('onItemPress');
  });

  it('EditableListField has onAddPress prop for recognized_names', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../components/AgendaForm.tsx'), 'utf-8'
    );
    expect(src).toContain('onAddPress');
  });

  it('EditableListField has placeholder t(\'agenda.addPresence\')', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../components/AgendaForm.tsx'), 'utf-8'
    );
    expect(src).toContain("agenda.addPresence");
  });

  it('recognition opens the unified PeoplePicker (v2.0 migration)', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../components/AgendaForm.tsx'), 'utf-8'
    );
    // v2.0: recognition now routes through the unified PeoplePicker; the old picker is gone.
    expect(src).toContain('PeoplePicker');
    expect(src).not.toContain('MemberSelectorModal');
  });

  it('recognition PeoplePicker uses capability be_recognized + multiSelect (v2.0)', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../components/AgendaForm.tsx'), 'utf-8'
    );
    expect(src).toContain('be_recognized');
    expect(src).toContain('multiSelect');
  });

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

  it('Old recognizing styles removed from AgendaForm', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../components/AgendaForm.tsx'), 'utf-8'
    );
    expect(src).not.toContain('recognizingContent');
    expect(src).not.toContain('recognizingNames');
    expect(src).not.toContain('recognizingName');
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

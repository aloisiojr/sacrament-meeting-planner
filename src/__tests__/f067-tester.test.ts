/**
 * F067/F068 Tester Tests (CR-277, CR-278)
 *
 * Behavioral tests verifying EditableListField feature:
 * - parseItems/joinItems edge cases and round-trip
 * - buildPresentationCards bullet_list integration
 * - No migration for CR-277 (AC-067-18)
 * - Reorder edge cases (EC-067-05)
 * - Whitespace handling (EC-067-06)
 * - Storage format round-trip (AC-067-17)
 * - onSave callback contract (AC-067-21)
 * - Backward compatibility (AC-067-19)
 * - i18n key values (AC-067-20)
 */

import { describe, it, expect, vi } from 'vitest';
import { buildPresentationCards } from '../hooks/usePresentationMode';
import type { PresentationField, PresentationCard } from '../hooks/usePresentationMode';
import type { SundayAgenda, Speech } from '../types/database';
import ptBR from '../i18n/locales/pt-BR.json';
import enUS from '../i18n/locales/en-US.json';
import esLA from '../i18n/locales/es-LA.json';
import fs from 'fs';
import path from 'path';

// --- Inline copies of parseItems/joinItems (component imports react-native) ---
// These replicate the exported functions from EditableListField.tsx exactly.

function parseItems(value: string | null): string[] {
  return (value ?? '').split('\n').filter((s) => s.trim() !== '');
}

function joinItems(items: string[]): string | null {
  return items.length === 0 ? null : items.join('\n');
}

// --- Agenda factory ---

function makeAgenda(overrides: Partial<SundayAgenda> = {}): SundayAgenda {
  return {
    id: 'a1',
    ward_id: 'w1',
    sunday_date: '2026-03-08',
    presiding_name: null,
    presiding_actor_id: null,
    conducting_name: null,
    conducting_actor_id: null,
    recognized_names: null,
    welcome_new_families: null,
    announcements: null,
    pianist_name: null,
    pianist_actor_id: null,
    conductor_name: null,
    conductor_actor_id: null,
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
    ...overrides,
  } as SundayAgenda;
}

const noopHymnLookup = (_id: string | null) => '';
const tFn = (key: string) => key;

// =============================================================================
// AC-067-17: Storage format is \n-joined string - round-trip verification
// =============================================================================

describe('F067 AC-067-17: Storage format round-trip', () => {
  it('parseItems -> joinItems is identity for clean data', () => {
    const original = 'Item A\nItem B\nItem C';
    const parsed = parseItems(original);
    const joined = joinItems(parsed);
    expect(joined).toBe(original);
  });

  it('round-trip strips empty lines from consecutive newlines', () => {
    const dirty = 'A\n\n\nB\nC';
    const parsed = parseItems(dirty);
    const joined = joinItems(parsed);
    expect(joined).toBe('A\nB\nC');
  });

  it('round-trip strips whitespace-only lines', () => {
    const dirty = 'A\n   \nB';
    const parsed = parseItems(dirty);
    const joined = joinItems(parsed);
    expect(joined).toBe('A\nB');
  });

  it('null -> parse -> join returns null (empty state)', () => {
    const parsed = parseItems(null);
    const joined = joinItems(parsed);
    expect(joined).toBeNull();
  });

  it('single item round-trips without newline', () => {
    const original = 'Only item';
    const parsed = parseItems(original);
    expect(parsed).toEqual(['Only item']);
    const joined = joinItems(parsed);
    expect(joined).toBe('Only item');
  });
});

// =============================================================================
// AC-067-21: onSave callback contract (updateField pattern)
// =============================================================================

describe('F067 AC-067-21: onSave callback contract', () => {
  it('add operation: onSave receives joined string with new item', () => {
    const onSave = vi.fn();
    const items = parseItems('A\nB');
    const addText = 'C';
    const trimmed = addText.trim();
    if (trimmed !== '') {
      const newItems = [...items, trimmed];
      onSave(joinItems(newItems));
    }
    expect(onSave).toHaveBeenCalledWith('A\nB\nC');
  });

  it('delete operation: onSave receives joined string without deleted item', () => {
    const onSave = vi.fn();
    const items = parseItems('A\nB\nC');
    const deleteIndex = 1;
    const newItems = items.filter((_, i) => i !== deleteIndex);
    onSave(joinItems(newItems));
    expect(onSave).toHaveBeenCalledWith('A\nC');
  });

  it('delete last item: onSave receives null', () => {
    const onSave = vi.fn();
    const items = parseItems('Only');
    const newItems = items.filter((_, i) => i !== 0);
    onSave(joinItems(newItems));
    expect(onSave).toHaveBeenCalledWith(null);
  });

  it('edit operation: onSave receives joined string with updated item', () => {
    const onSave = vi.fn();
    const items = parseItems('Old\nKeep');
    const editIndex = 0;
    const newText = 'New';
    const newItems = items.map((item, i) => (i === editIndex ? newText : item));
    onSave(joinItems(newItems));
    expect(onSave).toHaveBeenCalledWith('New\nKeep');
  });

  it('reorder operation: onSave receives joined string with new order', () => {
    const onSave = vi.fn();
    const items = parseItems('A\nB\nC');
    const idx = 0;
    const newItems = [...items];
    [newItems[idx], newItems[idx + 1]] = [newItems[idx + 1], newItems[idx]];
    onSave(joinItems(newItems));
    expect(onSave).toHaveBeenCalledWith('B\nA\nC');
  });
});

// =============================================================================
// AC-067-19: Backward compatibility - existing multi-line data
// =============================================================================

describe('F067 AC-067-19: Backward compatibility', () => {
  it('pre-CR-277 free-form text with newlines displays as separate items', () => {
    const legacy = 'Atividade dia 15\nReunião do sacerdócio às 19h\nConferência regional sábado';
    const items = parseItems(legacy);
    expect(items).toHaveLength(3);
    expect(items[0]).toBe('Atividade dia 15');
    expect(items[1]).toBe('Reunião do sacerdócio às 19h');
    expect(items[2]).toBe('Conferência regional sábado');
  });

  it('pre-CR-277 single-line text displays as single item', () => {
    const legacy = 'Atividade de jovens';
    const items = parseItems(legacy);
    expect(items).toHaveLength(1);
    expect(items[0]).toBe('Atividade de jovens');
  });

  it('pre-CR-277 text with trailing newline is handled', () => {
    const legacy = 'Item 1\nItem 2\n';
    const items = parseItems(legacy);
    expect(items).toHaveLength(2);
    expect(items).toEqual(['Item 1', 'Item 2']);
  });

  it('pre-CR-277 text with leading newline is handled', () => {
    const legacy = '\nItem 1\nItem 2';
    const items = parseItems(legacy);
    expect(items).toHaveLength(2);
    expect(items).toEqual(['Item 1', 'Item 2']);
  });
});

// =============================================================================
// EC-067-01: TextInput single-line prevents \n in items
// =============================================================================

describe('F067 EC-067-01: Single-line TextInput behavior', () => {
  it('parseItems handles value with no newlines (single item)', () => {
    const items = parseItems('No newlines here');
    expect(items).toHaveLength(1);
    expect(items[0]).toBe('No newlines here');
  });

  it('items joined with \\n then re-parsed preserves all items', () => {
    const original = ['Item 1', 'Item 2', 'Item 3'];
    const joined = joinItems(original)!;
    const reparsed = parseItems(joined);
    expect(reparsed).toEqual(original);
  });
});

// =============================================================================
// EC-067-05: Reorder with only 1 item has no effect
// =============================================================================

describe('F067 EC-067-05: Reorder with single item', () => {
  it('move up on single item (index 0) does nothing', () => {
    const onSave = vi.fn();
    const items = ['Only item'];
    const index = 0;
    // Simulates handleMoveUp guard: if (index === 0) return;
    if (index === 0) {
      // No save should be triggered
    } else {
      const newItems = [...items];
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      onSave(joinItems(newItems));
    }
    expect(onSave).not.toHaveBeenCalled();
  });

  it('move down on single item (index = length-1) does nothing', () => {
    const onSave = vi.fn();
    const items = ['Only item'];
    const index = 0;
    // Simulates handleMoveDown guard: if (index === items.length - 1) return;
    if (index === items.length - 1) {
      // No save should be triggered
    } else {
      const newItems = [...items];
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      onSave(joinItems(newItems));
    }
    expect(onSave).not.toHaveBeenCalled();
  });
});

// =============================================================================
// EC-067-06: Whitespace-only items removed on save
// =============================================================================

describe('F067 EC-067-06: Whitespace-only item handling', () => {
  it('inline edit resulting in spaces-only deletes item', () => {
    const onSave = vi.fn();
    const items = ['Keep', 'To be cleared', 'Also keep'];
    const editIndex = 1;
    const editText = '   '; // User clears text to whitespace
    const trimmed = editText.trim();
    if (trimmed === '') {
      // Delete item (same as component finishEdit logic)
      const newItems = items.filter((_, i) => i !== editIndex);
      onSave(joinItems(newItems));
    }
    expect(onSave).toHaveBeenCalledWith('Keep\nAlso keep');
  });

  it('inline edit resulting in tab-only deletes item', () => {
    const onSave = vi.fn();
    const items = ['A', 'B'];
    const editIndex = 0;
    const editText = '\t\t';
    const trimmed = editText.trim();
    if (trimmed === '') {
      const newItems = items.filter((_, i) => i !== editIndex);
      onSave(joinItems(newItems));
    }
    expect(onSave).toHaveBeenCalledWith('B');
  });

  it('add with tabs and spaces does not save', () => {
    const onSave = vi.fn();
    const addText = '  \t  ';
    const trimmed = addText.trim();
    if (trimmed !== '') {
      onSave(joinItems([...parseItems('Existing'), trimmed]));
    }
    expect(onSave).not.toHaveBeenCalled();
  });
});

// =============================================================================
// EC-067-03: Rapid add/delete - discrete operations
// =============================================================================

describe('F067 EC-067-03: Rapid add/delete discrete operations', () => {
  it('multiple sequential adds produce correct final state', () => {
    let items: string[] = [];
    const saves: (string | null)[] = [];
    const onSave = (val: string | null) => saves.push(val);

    // Simulate 3 rapid adds
    ['First', 'Second', 'Third'].forEach((text) => {
      items = [...items, text];
      onSave(joinItems(items));
    });

    expect(saves).toEqual(['First', 'First\nSecond', 'First\nSecond\nThird']);
    expect(items).toEqual(['First', 'Second', 'Third']);
  });

  it('add then immediate delete produces correct state', () => {
    let items = parseItems('A');
    const saves: (string | null)[] = [];
    const onSave = (val: string | null) => saves.push(val);

    // Add
    items = [...items, 'B'];
    onSave(joinItems(items));
    expect(saves[0]).toBe('A\nB');

    // Delete the newly added item
    items = items.filter((_, i) => i !== 1);
    onSave(joinItems(items));
    expect(saves[1]).toBe('A');
  });
});

// =============================================================================
// AC-067-18: No database migration for CR-277
// =============================================================================

describe('F067 AC-067-18: No database migration for CR-277', () => {
  it('last migration is 031 (from CR-276), no 032+ migration exists', () => {
    const migrationsDir = path.join(__dirname, '..', '..', 'supabase', 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();
    const lastMigration = files[files.length - 1];
    expect(lastMigration).toBe('031_secretary_review_notification.sql');
    // No migration 032 or higher exists
    const migration032 = files.filter((f) => f.startsWith('032'));
    expect(migration032).toHaveLength(0);
  });
});

// =============================================================================
// AC-067-15, AC-067-16: Presentation Mode bullet_list via buildPresentationCards
// =============================================================================

describe('F067 AC-067-15/16: Presentation Mode bullet_list integration', () => {
  it('announcements with multiple items produces bullet_list field (AC-067-15)', () => {
    const agenda = makeAgenda({ announcements: 'Atividade\nReunião\nConferência' });
    const cards = buildPresentationCards(agenda, [], null, noopHymnLookup, tFn);
    const welcomeCard = cards[0];
    const field = welcomeCard.fields.find((f) => f.label === 'agenda.announcements');
    expect(field).toBeDefined();
    expect(field!.type).toBe('bullet_list');
    expect(field!.value).toBe('Atividade\nReunião\nConferência');
  });

  it('announcements with null is omitted from card (AC-067-16)', () => {
    const agenda = makeAgenda({ announcements: null });
    const cards = buildPresentationCards(agenda, [], null, noopHymnLookup, tFn);
    const welcomeCard = cards[0];
    const field = welcomeCard.fields.find((f) => f.label === 'agenda.announcements');
    expect(field).toBeUndefined();
  });

  it('announcements with empty string is omitted from card (AC-067-16)', () => {
    const agenda = makeAgenda({ announcements: '' });
    const cards = buildPresentationCards(agenda, [], null, noopHymnLookup, tFn);
    const welcomeCard = cards[0];
    const field = welcomeCard.fields.find((f) => f.label === 'agenda.announcements');
    expect(field).toBeUndefined();
  });

  it('single-item announcements renders as bullet_list (EC-067-07)', () => {
    const agenda = makeAgenda({ announcements: 'Single announcement' });
    const cards = buildPresentationCards(agenda, [], null, noopHymnLookup, tFn);
    const welcomeCard = cards[0];
    const field = welcomeCard.fields.find((f) => f.label === 'agenda.announcements');
    expect(field).toBeDefined();
    expect(field!.type).toBe('bullet_list');
    expect(field!.value).toBe('Single announcement');
    // Rendering layer splits by \n - single item means 1 bullet
    const bulletItems = field!.value.split('\n').filter((s) => s.trim() !== '');
    expect(bulletItems).toHaveLength(1);
  });

  it('welcome_new_families uses bullet_list type (CR-278 supersedes EC-067-08)', () => {
    const agenda = makeAgenda({
      announcements: 'A\nB',
      welcome_new_families: 'Família Silva\nFamília Santos',
    });
    const cards = buildPresentationCards(agenda, [], null, noopHymnLookup, tFn);
    const welcomeCard = cards[0];
    const welcomeField = welcomeCard.fields.find(
      (f) => f.label === 'agenda.welcomeNewFamilies'
    );
    expect(welcomeField).toBeDefined();
    expect(welcomeField!.type).toBe('bullet_list');
    const announcementsField = welcomeCard.fields.find(
      (f) => f.label === 'agenda.announcements'
    );
    expect(announcementsField!.type).toBe('bullet_list');
  });
});

// =============================================================================
// AC-067-20: i18n key in all 3 locales (deep value verification)
// =============================================================================

describe('F067 AC-067-20: i18n addAnnouncement key values', () => {
  it('pt-BR value is correctly accented', () => {
    const value = (ptBR as any).agenda.addAnnouncement;
    expect(value).toBe('Adicionar anúncio');
    expect(value).toContain('ú'); // Accented u
  });

  it('en-US value is lowercase "announcement"', () => {
    const value = (enUS as any).agenda.addAnnouncement;
    expect(value).toBe('Add announcement');
  });

  it('es-LA value uses "Agregar" not "Añadir"', () => {
    const value = (esLA as any).agenda.addAnnouncement;
    expect(value).toBe('Agregar anuncio');
    expect(value).not.toContain('Añadir');
  });
});

// =============================================================================
// PresentationField type validation
// =============================================================================

describe('F067: PresentationField bullet_list type acceptance', () => {
  it('bullet_list is accepted by PresentationField type', () => {
    const field: PresentationField = {
      label: 'Announcements',
      value: 'A\nB',
      type: 'bullet_list',
    };
    expect(field.type).toBe('bullet_list');
  });

  it('multiline is still valid for other fields', () => {
    const field: PresentationField = {
      label: 'Welcome',
      value: 'Family A\nFamily B',
      type: 'multiline',
    };
    expect(field.type).toBe('multiline');
  });
});

// =============================================================================
// AC-067-04: Empty/whitespace add-input not saved
// =============================================================================

describe('F067 AC-067-04: Empty/whitespace add-input guard', () => {
  it('empty string add does not trigger save', () => {
    const onSave = vi.fn();
    const addText = '';
    const trimmed = addText.trim();
    if (trimmed !== '') {
      onSave(joinItems([...parseItems('Existing'), trimmed]));
    }
    expect(onSave).not.toHaveBeenCalled();
  });

  it('newline-only add does not trigger save', () => {
    const onSave = vi.fn();
    const addText = '\n\n';
    const trimmed = addText.trim();
    if (trimmed !== '') {
      onSave(joinItems([...parseItems('Existing'), trimmed]));
    }
    expect(onSave).not.toHaveBeenCalled();
  });

  it('mixed whitespace add does not trigger save', () => {
    const onSave = vi.fn();
    const addText = ' \t \n ';
    const trimmed = addText.trim();
    if (trimmed !== '') {
      onSave(joinItems([...parseItems('Existing'), trimmed]));
    }
    expect(onSave).not.toHaveBeenCalled();
  });
});

// =============================================================================
// AC-067-06: Deleting last item saves null
// =============================================================================

describe('F067 AC-067-06: Delete last item saves null', () => {
  it('deleting only remaining item results in null', () => {
    const items = ['Last item'];
    const newItems = items.filter((_, i) => i !== 0);
    expect(newItems).toEqual([]);
    expect(joinItems(newItems)).toBeNull();
  });

  it('deleting 2 items from 2-item list one by one ends at null', () => {
    let items = ['A', 'B'];
    // Delete first
    items = items.filter((_, i) => i !== 0);
    expect(joinItems(items)).toBe('B');
    // Delete remaining
    items = items.filter((_, i) => i !== 0);
    expect(joinItems(items)).toBeNull();
  });
});

// =============================================================================
// AC-067-09: Inline edit with empty text deletes item
// =============================================================================

describe('F067 AC-067-09: Inline edit empty text deletion', () => {
  it('editing item to empty string removes it from list', () => {
    const items = ['A', 'B', 'C'];
    const editIndex = 1;
    const editText = '';
    const trimmed = editText.trim();
    let newItems: string[];
    if (trimmed === '') {
      newItems = items.filter((_, i) => i !== editIndex);
    } else {
      newItems = items.map((item, i) => (i === editIndex ? trimmed : item));
    }
    expect(newItems).toEqual(['A', 'C']);
    expect(joinItems(newItems)).toBe('A\nC');
  });

  it('editing first item to empty deletes it, rest shifts', () => {
    const items = ['Delete me', 'B', 'C'];
    const editIndex = 0;
    const editText = '';
    const newItems = items.filter((_, i) => i !== editIndex);
    expect(newItems).toEqual(['B', 'C']);
    expect(joinItems(newItems)).toBe('B\nC');
  });

  it('editing last item to empty deletes it', () => {
    const items = ['A', 'B', 'Delete me'];
    const editIndex = 2;
    const newItems = items.filter((_, i) => i !== editIndex);
    expect(newItems).toEqual(['A', 'B']);
    expect(joinItems(newItems)).toBe('A\nB');
  });
});

// =============================================================================
// AC-067-01 / AC-067-14: Empty state behavior
// =============================================================================

describe('F067 AC-067-01/14: Empty state', () => {
  it('null announcements parses to empty array (shows add-input)', () => {
    const items = parseItems(null);
    expect(items).toEqual([]);
    // Component shows add-input when items.length === 0 and !disabled
  });

  it('empty string announcements parses to empty array', () => {
    const items = parseItems('');
    expect(items).toEqual([]);
  });

  it('disabled with empty items renders nothing (AC-067-14)', () => {
    const items = parseItems(null);
    expect(items.length).toBe(0);
    // Component returns <View /> when disabled && items.length === 0
  });
});

// =============================================================================
// EC-067-02: Long text truncation
// =============================================================================

describe('F067 EC-067-02: Long text handling', () => {
  it('very long item text is preserved in storage', () => {
    const longText = 'A'.repeat(500);
    const items = [`${longText}`, 'Short'];
    const joined = joinItems(items);
    const reparsed = parseItems(joined);
    expect(reparsed[0]).toBe(longText);
    expect(reparsed[0].length).toBe(500);
  });

  it('multiple long items round-trip correctly', () => {
    const items = Array.from({ length: 10 }, (_, i) => `Item ${i}: ${'X'.repeat(100)}`);
    const joined = joinItems(items)!;
    const reparsed = parseItems(joined);
    expect(reparsed).toEqual(items);
    expect(reparsed).toHaveLength(10);
  });
});

// =============================================================================
// EC-067-04: External value sync simulation
// =============================================================================

describe('F067 EC-067-04: External value sync', () => {
  it('value change while not editing re-parses correctly', () => {
    // Simulates: value prop changes from 'A\nB' to 'A\nB\nC'
    const initial = parseItems('A\nB');
    expect(initial).toEqual(['A', 'B']);

    // Another user adds 'C' via Supabase Realtime
    const updated = parseItems('A\nB\nC');
    expect(updated).toEqual(['A', 'B', 'C']);
  });

  it('value change to completely different items re-parses correctly', () => {
    const before = parseItems('Old1\nOld2');
    const after = parseItems('New1\nNew2\nNew3');
    expect(before).toEqual(['Old1', 'Old2']);
    expect(after).toEqual(['New1', 'New2', 'New3']);
  });

  it('value change to null clears items', () => {
    const before = parseItems('A\nB');
    const after = parseItems(null);
    expect(before).toEqual(['A', 'B']);
    expect(after).toEqual([]);
  });
});

// =============================================================================
// Reorder: comprehensive move-up/move-down scenarios
// =============================================================================

describe('F067: Reorder move-up/move-down comprehensive', () => {
  it('move last item up results in swap with second-to-last', () => {
    const items = ['A', 'B', 'C'];
    const idx = 2;
    const newItems = [...items];
    [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
    expect(newItems).toEqual(['A', 'C', 'B']);
  });

  it('move first item down results in swap with second', () => {
    const items = ['A', 'B', 'C'];
    const idx = 0;
    const newItems = [...items];
    [newItems[idx], newItems[idx + 1]] = [newItems[idx + 1], newItems[idx]];
    expect(newItems).toEqual(['B', 'A', 'C']);
  });

  it('move middle item down then up returns to original', () => {
    const original = ['A', 'B', 'C'];
    // Move B (idx 1) down
    let items = [...original];
    [items[1], items[2]] = [items[2], items[1]];
    expect(items).toEqual(['A', 'C', 'B']);
    // Move B (now idx 2) up
    [items[1], items[2]] = [items[2], items[1]];
    expect(items).toEqual(['A', 'B', 'C']);
  });

  it('5-item list: move item from position 2 to 0 via two up moves', () => {
    const items = ['A', 'B', 'C', 'D', 'E'];
    // Move C (idx 2) up to idx 1
    [items[1], items[2]] = [items[2], items[1]];
    expect(items).toEqual(['A', 'C', 'B', 'D', 'E']);
    // Move C (idx 1) up to idx 0
    [items[0], items[1]] = [items[1], items[0]];
    expect(items).toEqual(['C', 'A', 'B', 'D', 'E']);
  });
});

// =============================================================================
// AC-067-08: Inline edit saves on blur/submit with trim
// =============================================================================

describe('F067 AC-067-08: Inline edit saves trimmed text', () => {
  it('edit with leading/trailing spaces saves trimmed version', () => {
    const items = ['Original', 'Keep'];
    const editIndex = 0;
    const editText = '  Updated  ';
    const trimmed = editText.trim();
    const newItems = items.map((item, i) => (i === editIndex ? trimmed : item));
    expect(newItems).toEqual(['Updated', 'Keep']);
    expect(joinItems(newItems)).toBe('Updated\nKeep');
  });
});

// =============================================================================
// AC-067-02/03: Adding items - comprehensive scenarios
// =============================================================================

describe('F067 AC-067-02/03: Adding items', () => {
  it('adding first item to empty list (AC-067-02)', () => {
    const items: string[] = [];
    const addText = 'First announcement';
    const newItems = [...items, addText.trim()];
    expect(newItems).toEqual(['First announcement']);
    expect(joinItems(newItems)).toBe('First announcement');
  });

  it('adding item with leading/trailing spaces trims it', () => {
    const items = ['A'];
    const addText = '  New item  ';
    const newItems = [...items, addText.trim()];
    expect(newItems).toEqual(['A', 'New item']);
    expect(joinItems(newItems)).toBe('A\nNew item');
  });
});

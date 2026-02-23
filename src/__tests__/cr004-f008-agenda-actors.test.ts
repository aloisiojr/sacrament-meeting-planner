/**
 * QA Tests for CR-004 / F008: Agenda & Actors Enhancements
 *
 * Covers:
 * CR-71: Remove auto-preside rule (enforceActorRules, ActorSelector handleAdd)
 * CR-72: Auto-add bishopric actors (create-invitation, update-user-role)
 * CR-73: Recognizing field uses ActorSelector
 * CR-74: Custom prayer names via PrayerSelector
 * CR-75: Non-expandable cards for excluded sundays
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

function readEdgeFn(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../..', relativePath), 'utf-8');
}

function readLocale(locale: string): Record<string, unknown> {
  const filePath = path.resolve(__dirname, '..', 'i18n', 'locales', `${locale}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

describe('CR-004 F008: Agenda & Actors Enhancements', () => {
  // ---------------------------------------------------------------
  // CR-71: Remove auto-preside rule
  // ---------------------------------------------------------------
  describe('CR-71: enforceActorRules is identity function', () => {
    it('enforceActorRules should return input unchanged (identity)', () => {
      const source = readSourceFile('hooks/useActors.ts');
      expect(source).toContain('return input;');
      // Should NOT have the old auto-enforce logic
      expect(source).not.toContain("result.can_preside = true;");
    });

    it('top docstring should NOT mention business rule', () => {
      const source = readSourceFile('hooks/useActors.ts');
      expect(source).not.toContain('can_conduct=true implies can_preside=true');
    });

    it('JSDoc for useCreateActor should NOT mention enforce rule', () => {
      const source = readSourceFile('hooks/useActors.ts');
      expect(source).not.toContain('Enforces can_conduct -> can_preside rule');
    });

    it('enforceActorRules should accept both CreateActorInput and UpdateActorInput', () => {
      const source = readSourceFile('hooks/useActors.ts');
      expect(source).toContain('input: CreateActorInput | UpdateActorInput');
    });

    it('enforceActorRules docstring should say pass-through', () => {
      const source = readSourceFile('hooks/useActors.ts');
      expect(source).toContain('Actor rules pass-through');
      expect(source).toContain('can_preside and can_conduct are independent flags');
    });
  });

  describe('CR-71: ActorSelector handleAdd can_preside fix', () => {
    it('handleAdd should NOT set can_preside for can_conduct roleFilter', () => {
      const source = readSourceFile('components/ActorSelector.tsx');
      // Old: can_preside: roleFilter === 'can_preside' || roleFilter === 'can_conduct'
      expect(source).not.toContain("roleFilter === 'can_preside' || roleFilter === 'can_conduct'");
    });

    it('handleAdd should only set can_preside when roleFilter is can_preside', () => {
      const source = readSourceFile('components/ActorSelector.tsx');
      expect(source).toContain("can_preside: roleFilter === 'can_preside',");
    });

    it('handleAdd should set can_conduct only for can_conduct roleFilter', () => {
      const source = readSourceFile('components/ActorSelector.tsx');
      expect(source).toContain("can_conduct: roleFilter === 'can_conduct',");
    });

    it('handleAdd should set can_recognize only for can_recognize roleFilter', () => {
      const source = readSourceFile('components/ActorSelector.tsx');
      expect(source).toContain("can_recognize: roleFilter === 'can_recognize',");
    });

    // F117 (CR-180): can_music replaced by can_pianist and can_conductor
    it('handleAdd should set can_pianist for can_pianist roleFilter', () => {
      const source = readSourceFile('components/ActorSelector.tsx');
      expect(source).toContain("can_pianist: roleFilter === 'can_pianist',");
    });

    it('handleAdd should set can_conductor for can_conductor roleFilter', () => {
      const source = readSourceFile('components/ActorSelector.tsx');
      expect(source).toContain("can_conductor: roleFilter === 'can_conductor',");
    });
  });

  describe('CR-71: useActors hook preserves independent flags', () => {
    it('useCreateActor should call enforceActorRules', () => {
      const source = readSourceFile('hooks/useActors.ts');
      expect(source).toContain('const enforced = enforceActorRules(input)');
    });

    it('useUpdateActor should call enforceActorRules', () => {
      const source = readSourceFile('hooks/useActors.ts');
      expect(source).toContain('const enforced = enforceActorRules(input) as UpdateActorInput');
    });

    // F117 (CR-180): can_music replaced by can_pianist and can_conductor
    it('useCreateActor should spread all five capability flags', () => {
      const source = readSourceFile('hooks/useActors.ts');
      expect(source).toContain('can_preside: enforced.can_preside ?? false');
      expect(source).toContain('can_conduct: enforced.can_conduct ?? false');
      expect(source).toContain('can_recognize: enforced.can_recognize ?? false');
      expect(source).toContain('can_pianist: enforced.can_pianist ?? false');
      expect(source).toContain('can_conductor: enforced.can_conductor ?? false');
    });

    it('ActorRoleFilter type should include can_recognize', () => {
      const source = readSourceFile('hooks/useActors.ts');
      expect(source).toContain("'can_recognize'");
    });

    it('filterActorsByRole should handle can_recognize', () => {
      const source = readSourceFile('hooks/useActors.ts');
      expect(source).toContain('actors.filter((a) => a[role])');
    });
  });

  // ---------------------------------------------------------------
  // CR-72: Auto-add bishopric actors
  // ---------------------------------------------------------------
  describe('CR-72: create-invitation auto-actor', () => {
    it('should check for bishopric role before creating actor', () => {
      const source = readEdgeFn('supabase/functions/create-invitation/index.ts');
      expect(source).toContain("input.role === 'bishopric'");
    });

    it('should extract name from email local part', () => {
      const source = readEdgeFn('supabase/functions/create-invitation/index.ts');
      expect(source).toContain(".split('@')[0]");
      expect(source).toContain(".replace(/[._]/g, ' ')");
    });

    it('should create actor with can_preside=true, can_conduct=true', () => {
      const source = readEdgeFn('supabase/functions/create-invitation/index.ts');
      expect(source).toContain('can_preside: true');
      expect(source).toContain('can_conduct: true');
    });

    it('should use SELECT+conditional INSERT to avoid duplicates', () => {
      const source = readEdgeFn('supabase/functions/create-invitation/index.ts');
      expect(source).toContain('.ilike(');
      expect(source).toContain('.maybeSingle()');
    });

    it('should be best-effort (catch block)', () => {
      const source = readEdgeFn('supabase/functions/create-invitation/index.ts');
      expect(source).toContain("console.error('Auto-actor creation failed:");
    });

    it('should capitalize first letter of each word in actor name', () => {
      const source = readEdgeFn('supabase/functions/create-invitation/index.ts');
      expect(source).toContain('c.toUpperCase()');
      expect(source).toContain("\\b\\w");
    });

    it('should update existing actor flags if found (not just skip)', () => {
      const source = readEdgeFn('supabase/functions/create-invitation/index.ts');
      // If existing actor is found but missing preside/conduct, update it
      expect(source).toContain('!existing.can_preside || !existing.can_conduct');
      expect(source).toContain(".update({ can_preside: true, can_conduct: true })");
    });

    it('should set can_recognize=false and can_pianist=false, can_conductor=false for new actors', () => {
      const source = readEdgeFn('supabase/functions/create-invitation/index.ts');
      expect(source).toContain('can_recognize: false');
      expect(source).toContain('can_pianist: false');
      expect(source).toContain('can_conductor: false');
    });

    it('should only create actor when actorName is non-empty', () => {
      const source = readEdgeFn('supabase/functions/create-invitation/index.ts');
      expect(source).toContain('if (actorName)');
    });
  });

  describe('CR-72: update-user-role auto-actor on bishopric change', () => {
    it('should check for newRole bishopric', () => {
      const source = readEdgeFn('supabase/functions/update-user-role/index.ts');
      expect(source).toContain("input.newRole === 'bishopric'");
    });

    it('should extract name from target user email', () => {
      const source = readEdgeFn('supabase/functions/update-user-role/index.ts');
      expect(source).toContain("targetUser.email");
      expect(source).toContain(".split('@')[0]");
    });

    it('should use SELECT+conditional INSERT to avoid duplicates', () => {
      const source = readEdgeFn('supabase/functions/update-user-role/index.ts');
      expect(source).toContain('.ilike(');
      expect(source).toContain('.maybeSingle()');
    });

    it('should NOT delete actor when changing FROM bishopric', () => {
      const source = readEdgeFn('supabase/functions/update-user-role/index.ts');
      // No delete logic for actors when demoting from bishopric
      const fromBishopricSection = source.slice(
        source.indexOf("currentRole === 'bishopric'"),
        source.indexOf('Auto-create meeting actor')
      );
      expect(fromBishopricSection).not.toContain('meeting_actors');
    });

    it('should update existing actor if missing preside/conduct', () => {
      const source = readEdgeFn('supabase/functions/update-user-role/index.ts');
      expect(source).toContain('!existing.can_preside || !existing.can_conduct');
      expect(source).toContain(".update({ can_preside: true, can_conduct: true })");
    });

    it('should select id, can_preside, can_conduct in existing actor check', () => {
      const source = readEdgeFn('supabase/functions/update-user-role/index.ts');
      expect(source).toContain(".select('id, can_preside, can_conduct')");
    });

    it('should be best-effort with error logging', () => {
      const source = readEdgeFn('supabase/functions/update-user-role/index.ts');
      expect(source).toContain('Auto-actor creation on role change failed:');
    });
  });

  // ---------------------------------------------------------------
  // CR-73: Recognizing uses ActorSelector
  // ---------------------------------------------------------------
  describe('CR-73: Recognizing field uses ActorSelector', () => {
    it('Recognizing field should use Pressable with individual Text per name (CR-123)', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      // Find the recognizing section
      const recognizingIdx = source.indexOf("label={t('agenda.recognizing')}");
      const nextFieldIdx = source.indexOf("<FieldRow", recognizingIdx + 1);
      const section = source.slice(recognizingIdx, nextFieldIdx);
      expect(section).toContain('<Pressable');
      expect(section).not.toContain('DebouncedTextInput');
    });

    it('should open ActorSelector with roleFilter can_recognize', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      expect(source).toContain("field: 'recognizing', roleFilter: 'can_recognize'");
    });

    it('actor selection for recognizing should toggle recognized_names array', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      // Recognizing has special handling that bypasses the generic actor select pattern
      expect(source).toContain("selectorModal.field === 'recognizing'");
      // Multi-select toggle: add or remove names from the array
      expect(source).toContain("current.includes(actor.name)");
      expect(source).toContain("current.filter");
      expect(source).toContain("[...current, actor.name]");
      // The recognizing field opens actor selector with field='recognizing'
      expect(source).toContain("field: 'recognizing', roleFilter: 'can_recognize'");
    });

    it('recognizing field should display recognized_names via map (one per line, CR-123)', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      expect(source).toContain("agenda.recognized_names!.map((name, idx)");
    });

    it('recognizing Pressable should be disabled for observer', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      // The recognizing Pressable checks isObserver before opening modal
      const recognizingIdx = source.indexOf("field: 'recognizing'");
      const nearbySection = source.slice(Math.max(0, recognizingIdx - 200), recognizingIdx);
      expect(nearbySection).toContain('isObserver');
    });

    it('should render ActorSelector component when selectorModal type is actor', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      expect(source).toContain("selectorModal?.type === 'actor'");
      expect(source).toContain('<ActorSelector');
    });

    it('actor selector should derive nameField and idField from selectorModal.field', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      expect(source).toContain("const nameField = `${selectorModal.field}_name`");
      expect(source).toContain("const idField = `${selectorModal.field}_actor_id`");
    });
  });

  // ---------------------------------------------------------------
  // CR-74: Custom prayer names via PrayerSelector
  // ---------------------------------------------------------------
  describe('CR-74: Prayer fields use PrayerSelector', () => {
    it('should import PrayerSelector', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      expect(source).toContain("import { PrayerSelector");
    });

    it('should import PrayerSelection type', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      expect(source).toContain("type PrayerSelection");
    });

    it('prayer modal should use PrayerSelector (not MemberSelectorModal)', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      // The prayer section should use PrayerSelector
      const prayerSection = source.slice(
        source.indexOf('Prayer selector modal'),
        source.indexOf('Speaker selector modal')
      );
      expect(prayerSection).toContain('PrayerSelector');
      expect(prayerSection).not.toContain('MemberSelectorModal');
    });

    it('prayer selection should handle null memberId for custom names', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      // When PrayerSelector returns selection, we set memberId which can be null
      expect(source).toContain('selection?.memberId ?? null');
    });

    it('prayer selection should handle name from selection', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      expect(source).toContain('selection?.name ?? null');
    });

    it('PrayerSelector custom name hint should use i18n', () => {
      const source = readSourceFile('components/PrayerSelector.tsx');
      expect(source).toContain("t('agenda.customName')");
      expect(source).not.toContain('(custom name)');
    });

    it('opening prayer should open prayer selector', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      expect(source).toContain("type: 'prayer', field: 'opening_prayer'");
    });

    it('closing prayer should open prayer selector', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      expect(source).toContain("type: 'prayer', field: 'closing_prayer'");
    });

    it('speaker fields should use ReadOnlySpeakerRow with pencil navigation (F121)', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      // F121 replaced SpeakerField with ReadOnlySpeakerRow
      expect(source).toContain('ReadOnlySpeakerRow');
      expect(source).toContain('onNavigate');
      expect(source).toContain("getSpeech(1)?.speaker_name");
      expect(source).toContain("getSpeech(2)?.speaker_name");
      expect(source).toContain("getSpeech(3)?.speaker_name");
    });
  });

  describe('CR-74: PrayerSelector component', () => {
    it('PrayerSelector should export PrayerSelection interface', () => {
      const source = readSourceFile('components/PrayerSelector.tsx');
      expect(source).toContain('export interface PrayerSelection');
      expect(source).toContain('memberId: string | null');
      expect(source).toContain('name: string');
    });

    it('PrayerSelector should export PrayerSelectorProps', () => {
      const source = readSourceFile('components/PrayerSelector.tsx');
      expect(source).toContain('export interface PrayerSelectorProps');
      expect(source).toContain('selected: PrayerSelection | null');
      expect(source).toContain('onSelect: (selection: PrayerSelection | null) => void');
    });

    it('should handle custom name with memberId=null', () => {
      const source = readSourceFile('components/PrayerSelector.tsx');
      expect(source).toContain("onSelect({ memberId: null, name: trimmed })");
    });

    it('should handle member selection with memberId set', () => {
      const source = readSourceFile('components/PrayerSelector.tsx');
      expect(source).toContain("onSelect({ memberId: member.id, name: member.full_name })");
    });

    it('should show custom name button when search has text', () => {
      const source = readSourceFile('components/PrayerSelector.tsx');
      expect(source).toContain('customName.trim().length > 0');
    });

    it('should display custom name hint from i18n', () => {
      const source = readSourceFile('components/PrayerSelector.tsx');
      expect(source).toContain("t('agenda.customName')");
    });

    it('should have a clear button when selected and not disabled', () => {
      const source = readSourceFile('components/PrayerSelector.tsx');
      expect(source).toContain('selected && !disabled');
      expect(source).toContain('handleClear');
      expect(source).toContain('onSelect(null)');
    });

    it('should sync search and customName state', () => {
      const source = readSourceFile('components/PrayerSelector.tsx');
      expect(source).toContain('setSearch(text)');
      expect(source).toContain('setCustomName(text)');
    });

    it('should highlight selected member in list', () => {
      const source = readSourceFile('components/PrayerSelector.tsx');
      expect(source).toContain('item.id === selected?.memberId');
    });

    it('should use useMembers hook with search filter', () => {
      const source = readSourceFile('components/PrayerSelector.tsx');
      expect(source).toContain('useMembers(search)');
    });
  });

  // ---------------------------------------------------------------
  // CR-75: Non-expandable cards for excluded sundays
  // ---------------------------------------------------------------
  describe('CR-75: Non-expandable conference cards', () => {
    it('agenda.tsx should NOT filter out excluded sundays', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      // Should not have the old filter logic
      expect(source).not.toContain("if (ex && isExcludedFromAgenda(ex.reason)) return false;");
    });

    it('AgendaSundayCard should have expandable prop', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      expect(source).toContain('expandable: boolean;');
      expect(source).toContain('expandable,');
    });

    it('expandable should be false for excluded exception types', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      expect(source).toContain('expandable={!exception || !isExcludedFromAgenda(exception.reason)}');
    });

    it('chevron should only render when expandable', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      expect(source).toContain('{expandable && (');
      // Should have ChevronUp/DownIcon inside the expandable check
      const chevronSection = source.slice(
        source.indexOf('{expandable && ('),
        source.indexOf('{expandable && (') + 200
      );
      expect(chevronSection).toContain('Chevron');
    });

    it('onPress should be undefined when not expandable', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      expect(source).toContain('onPress={expandable ? onToggle : undefined}');
    });

    it('expanded content should check expandable', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      expect(source).toContain('{expandable && isExpanded && (');
    });

    it('all sundays should be in filteredSundays (no filter)', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      // The map should NOT have a .filter() call
      const mappingSection = source.slice(
        source.indexOf('Build sunday list'),
        source.indexOf('Build list items')
      );
      expect(mappingSection).not.toContain('.filter(');
    });

    it('exception label should show in warning color', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      expect(source).toContain('colors.warning');
      expect(source).toContain('exceptionText');
    });

    it('should import isExcludedFromAgenda from useAgenda', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      expect(source).toContain("isExcludedFromAgenda");
      expect(source).toContain("from '../../hooks/useAgenda'");
    });

    it('AgendaSundayCard should accept expandable in props interface', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      const propsInterface = source.slice(
        source.indexOf('interface AgendaSundayCardProps'),
        source.indexOf('}', source.indexOf('interface AgendaSundayCardProps')) + 1
      );
      expect(propsInterface).toContain('expandable: boolean');
    });

    it('card should still show AgendaForm when expanded and expandable', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      expect(source).toContain('<AgendaForm');
      expect(source).toContain('sundayDate={date}');
    });
  });

  describe('CR-75: Agenda tab uses QueryErrorView', () => {
    it('should import QueryErrorView', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      expect(source).toContain("import { QueryErrorView }");
    });

    it('should show QueryErrorView when exceptions query errors', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      expect(source).toContain('exceptionsError');
      expect(source).toContain('<QueryErrorView');
    });

    it('should pass refetch to QueryErrorView onRetry', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      expect(source).toContain('onRetry={refetchExceptions}');
    });

    it('should use ThemedErrorBoundary wrapper', () => {
      const source = readSourceFile('app/(tabs)/agenda.tsx');
      expect(source).toContain('<ThemedErrorBoundary>');
      expect(source).toContain('</ThemedErrorBoundary>');
    });
  });

  // ---------------------------------------------------------------
  // CR-71/73: ActorSelector component structure
  // ---------------------------------------------------------------
  describe('ActorSelector component structure', () => {
    it('should accept ActorRoleFilter as roleFilter prop', () => {
      const source = readSourceFile('components/ActorSelector.tsx');
      expect(source).toContain('roleFilter: ActorRoleFilter');
    });

    it('should have bottom-sheet style (2/3 screen height)', () => {
      const source = readSourceFile('components/ActorSelector.tsx');
      expect(source).toContain('SCREEN_HEIGHT * 0.67');
    });

    it('should have search input with filtering', () => {
      const source = readSourceFile('components/ActorSelector.tsx');
      expect(source).toContain('a.name.toLowerCase().includes(q)');
    });

    it('should have add button with input field', () => {
      const source = readSourceFile('components/ActorSelector.tsx');
      expect(source).toContain('showAddInput');
      expect(source).toContain('handleAdd');
    });

    it('should support inline edit of actor names', () => {
      const source = readSourceFile('components/ActorSelector.tsx');
      expect(source).toContain('editingId');
      expect(source).toContain('handleEditSave');
    });

    it('should support delete with confirmation dialog', () => {
      const source = readSourceFile('components/ActorSelector.tsx');
      expect(source).toContain('handleDelete');
      expect(source).toContain('Alert.alert');
      expect(source).toContain("style: 'destructive'");
    });

    it('should use useActors hook with roleFilter', () => {
      const source = readSourceFile('components/ActorSelector.tsx');
      expect(source).toContain('useActors(roleFilter)');
    });

    it('should use useCreateActor, useUpdateActor, useDeleteActor hooks', () => {
      const source = readSourceFile('components/ActorSelector.tsx');
      expect(source).toContain('useCreateActor()');
      expect(source).toContain('useUpdateActor()');
      expect(source).toContain('useDeleteActor()');
    });

    it('should have action icons with proper sizing (CR-70)', () => {
      const source = readSourceFile('components/ActorSelector.tsx');
      expect(source).toContain('fontSize: 24');
      expect(source).toContain('padding: 4');
      expect(source).toContain('gap: 20');
    });

    it('should have hitSlop on action buttons', () => {
      const source = readSourceFile('components/ActorSelector.tsx');
      expect(source).toContain('hitSlop={12}');
    });
  });

  // ---------------------------------------------------------------
  // AgendaForm component structure
  // ---------------------------------------------------------------
  describe('AgendaForm component structure', () => {
    it('should be wrapped in React.memo', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      expect(source).toContain('export const AgendaForm = React.memo(');
    });

    it('should have presiding field with can_preside roleFilter', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      expect(source).toContain("field: 'presiding', roleFilter: 'can_preside'");
    });

    it('should have conducting field with can_conduct roleFilter', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      expect(source).toContain("field: 'conducting', roleFilter: 'can_conduct'");
    });

    it('should have handleActorSelect function for generic actor selection', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      expect(source).toContain('const handleActorSelect = useCallback(');
      expect(source).toContain('(actor: MeetingActor, nameField: string, idField: string)');
    });

    it('FieldSelectorType should include prayer type', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      expect(source).toContain("type FieldSelectorType = 'actor' | 'hymn' | 'sacrament_hymn' | 'prayer'");
    });

    it('SelectorState should have optional roleFilter', () => {
      const source = readSourceFile('components/AgendaForm.tsx');
      expect(source).toContain('roleFilter?: string');
    });
  });

  // ---------------------------------------------------------------
  // i18n keys
  // ---------------------------------------------------------------
  describe('i18n keys for F008', () => {
    (['pt-BR', 'en', 'es'] as const).forEach((locale) => {
      it(`${locale}: agenda.customName should exist`, () => {
        const data = readLocale(locale);
        const agenda = data.agenda as Record<string, string>;
        expect(agenda.customName).toBeDefined();
        expect(agenda.customName.length).toBeGreaterThan(3);
      });

      it(`${locale}: agenda.recognizing should exist`, () => {
        const data = readLocale(locale);
        const agenda = data.agenda as Record<string, string>;
        expect(agenda.recognizing).toBeDefined();
      });

      it(`${locale}: agenda.conducting should exist`, () => {
        const data = readLocale(locale);
        const agenda = data.agenda as Record<string, string>;
        expect(agenda.conducting).toBeDefined();
      });

      it(`${locale}: agenda.presiding should exist`, () => {
        const data = readLocale(locale);
        const agenda = data.agenda as Record<string, string>;
        expect(agenda.presiding).toBeDefined();
      });

      it(`${locale}: sundayExceptions keys should exist for excluded types`, () => {
        const data = readLocale(locale);
        const sundayExceptions = data.sundayExceptions as Record<string, string>;
        expect(sundayExceptions.general_conference).toBeDefined();
        expect(sundayExceptions.stake_conference).toBeDefined();
      });
    });
  });
});

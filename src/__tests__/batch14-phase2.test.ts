/**
 * Tests for Batch 14, Phase 2: Collapsed card layouts, Pianist/Conductor,
 *                                Intermediate Hymn toggle, Agenda status lines
 *
 * F093 (CR-150): Collapsed designation card layouts with speaker names and LEDs
 * F094 (CR-151): Pianist and Conductor fields in Agenda Welcome section
 * F095 (CR-152): Toggle for Intermediate Hymn in Agenda
 * F096 (CR-153): Collapsed agenda card status lines
 *
 * Covers acceptance criteria:
 *   AC-093-01..07, AC-094-01..09, AC-095-01..07, AC-096-01..11
 * Covers edge cases:
 *   EC-093-01..03, EC-094-01..03, EC-095-01..03, EC-096-01..04
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

function readLocale(locale: string): Record<string, unknown> {
  const content = fs.readFileSync(
    path.resolve(__dirname, '..', 'i18n', 'locales', `${locale}.json`),
    'utf-8'
  );
  return JSON.parse(content);
}

// =============================================================================
// F093 (CR-150): Collapsed designation card layouts with speaker names and LEDs
// =============================================================================

describe('F093 (CR-150): Collapsed SundayCard with speaker names and vertical LEDs', () => {

  const sundayCardSource = readSourceFile('components/SundayCard.tsx');

  // --- AC-093-01: Card collapsed shows speaker name lines ---
  // F118 (CR-181): Changed from [1,2,3].map to visiblePositions.map; removed ordinal labels
  describe('AC-093-01: Collapsed header shows 3 speaker name lines', () => {
    it('renders speaker lines when isSpeechesType && !expanded', () => {
      expect(sundayCardSource).toContain('isSpeechesType && !expanded');
      expect(sundayCardSource).toContain('visiblePositions.map');
    });

    it('visiblePositions determined by hasSecondSpeech prop', () => {
      expect(sundayCardSource).toContain('const visiblePositions = hasSecondSpeech ? [1, 2, 3] : [1, 3]');
    });

    it('no ordinal labels in collapsed view (F118: AC-118-08)', () => {
      // Collapsed view shows name only, no posLabel prefix
      expect(sundayCardSource).not.toContain('posLabel: ${name}');
    });
  });

  // --- AC-093-02: Empty speaker positions show label only ---
  describe('AC-093-02: Empty speaker lines still rendered', () => {
    it('uses fallback empty string for missing speaker name', () => {
      expect(sundayCardSource).toContain("speech?.speaker_name ?? ''");
    });

    // F118 (CR-181): Changed from [1, 2, 3].map to visiblePositions.map
    it('line always renders (not conditional on name existing)', () => {
      // The map over visiblePositions always returns elements for each visible position
      expect(sundayCardSource).toContain('visiblePositions.map');
    });
  });

  // --- AC-093-03: LEDs vertical when collapsed ---
  describe('AC-093-03: LEDs use vertical layout when collapsed', () => {
    it('has ledsVertical style with flexDirection column', () => {
      expect(sundayCardSource).toContain('ledsVertical');
      expect(sundayCardSource).toContain("flexDirection: 'column'");
    });

    it('ledsVertical has gap 4', () => {
      expect(sundayCardSource).toMatch(/ledsVertical.*?gap:\s*4/s);
    });
  });

  // --- AC-093-04: Names and LEDs hidden when expanded ---
  describe('AC-093-04: Speaker names and LEDs hidden when expanded', () => {
    it('speaker names conditioned on !expanded', () => {
      expect(sundayCardSource).toContain('isSpeechesType && !expanded');
    });

    it('LEDs are inline in speechRow (redesigned by F099/CR-161)', () => {
      // LEDs are now inline with text in speechRow, not separate block
      expect(sundayCardSource).toContain('styles.speechRow');
    });
  });

  // --- AC-093-05: Non-speeches type shows exception text, no speaker names ---
  describe('AC-093-05: Non-speeches type unchanged', () => {
    it('exception text rendered when !isSpeechesType', () => {
      expect(sundayCardSource).toContain('!isSpeechesType');
      expect(sundayCardSource).toContain('exceptionText');
    });
  });

  // --- AC-093-06: SundayCard used in Home (NextSundaysSection) ---
  describe('AC-093-06: SundayCard shared with Home', () => {
    it('NextSundaysSection imports SundayCard', () => {
      const nextSundaysSource = readSourceFile('components/NextSundaysSection.tsx');
      expect(nextSundaysSource).toContain('SundayCard');
    });
  });

  // --- AC-093-07: SundayCard used in Discursos tab ---
  describe('AC-093-07: SundayCard shared with speeches tab', () => {
    it('speeches.tsx imports SundayCard', () => {
      const speechesSource = readSourceFile('app/(tabs)/speeches.tsx');
      expect(speechesSource).toContain('SundayCard');
    });
  });

  // --- EC-093-01: No discursantes designados ---
  describe('EC-093-01: No speakers assigned', () => {
    it('name defaults to empty string when speech not found', () => {
      expect(sundayCardSource).toContain("speech?.speaker_name ?? ''");
    });
  });

  // --- EC-093-02: Long speaker name truncated ---
  describe('EC-093-02: Long speaker name truncated', () => {
    it('speaker name text has numberOfLines={1}', () => {
      expect(sundayCardSource).toContain('numberOfLines={1}');
    });

    it('speaker name text has ellipsizeMode tail', () => {
      expect(sundayCardSource).toContain('ellipsizeMode="tail"');
    });
  });

  // --- EC-093-03: Past sunday card opacity ---
  describe('EC-093-03: Past sunday applies opacity', () => {
    it('card has isPast && !expanded opacity condition', () => {
      expect(sundayCardSource).toContain('isPast && !expanded && { opacity: 0.6 }');
    });
  });

  // --- speakerNameLine style exists ---
  describe('Style: speakerNameLine', () => {
    it('speakerNameLine style has fontSize 13 (updated by F099/CR-161)', () => {
      expect(sundayCardSource).toMatch(/speakerNameLine.*?fontSize:\s*13/s);
    });
  });
});

// =============================================================================
// F094 (CR-151): Pianist and Conductor fields in Agenda
// =============================================================================

describe('F094 (CR-151): Pianist and Conductor fields in Agenda', () => {

  const agendaFormSource = readSourceFile('components/AgendaForm.tsx');
  const presentationSource = readSourceFile('hooks/usePresentationMode.ts');

  // --- AC-094-01: Pianist field visible in Welcome section ---
  describe('AC-094-01: Pianist field in Welcome section', () => {
    it('AgendaForm has pianist SelectorField', () => {
      expect(agendaFormSource).toContain("agenda.pianist_name ?? ''");
    });

    it('pianist uses agenda.pianist i18n key', () => {
      expect(agendaFormSource).toContain("t('agenda.pianist')");
    });
  });

  // --- AC-094-02: Conductor field visible in Welcome section ---
  describe('AC-094-02: Conductor field in Welcome section', () => {
    it('AgendaForm has conductor SelectorField', () => {
      expect(agendaFormSource).toContain("agenda.conductor_name ?? ''");
    });

    it('conductor uses agenda.conductor i18n key', () => {
      expect(agendaFormSource).toContain("t('agenda.conductor')");
    });
  });

  // --- AC-094-03: Pianist uses roleFilter can_pianist (F117/CR-180 update) ---
  describe('AC-094-03: Pianist uses roleFilter can_pianist', () => {
    it('pianist field uses can_pianist roleFilter', () => {
      expect(agendaFormSource).toContain("field: 'pianist', roleFilter: 'can_pianist'");
    });
  });

  // --- AC-094-04: Conductor uses roleFilter can_conductor (F117/CR-180 update) ---
  describe('AC-094-04: Conductor uses roleFilter can_conductor', () => {
    it('conductor field uses can_conductor roleFilter', () => {
      expect(agendaFormSource).toContain("field: 'conductor', roleFilter: 'can_conductor'");
    });
  });

  // --- AC-094-05: Pianist saves to pianist_name/pianist_actor_id ---
  describe('AC-094-05: Pianist saves correctly', () => {
    it('pianist uses field name "pianist" for auto name/id derivation', () => {
      // handleActorSelect derives: ${field}_name and ${field}_actor_id
      // so field: 'pianist' -> pianist_name + pianist_actor_id
      expect(agendaFormSource).toContain("field: 'pianist'");
    });
  });

  // --- AC-094-06: Conductor saves to conductor_name/conductor_actor_id ---
  describe('AC-094-06: Conductor saves correctly', () => {
    it('conductor uses field name "conductor" for auto name/id derivation', () => {
      expect(agendaFormSource).toContain("field: 'conductor'");
    });
  });

  // --- AC-094-07: Both fields disabled for Observer ---
  describe('AC-094-07: Fields read-only for Observer', () => {
    it('pianist field checks isObserver before opening selector', () => {
      // Both fields have if (!isObserver) check before setSelectorModal
      const pianistBlock = agendaFormSource.match(/pianist.*?isObserver/s);
      expect(pianistBlock).not.toBeNull();
    });

    it('conductor field checks isObserver before opening selector', () => {
      const conductorBlock = agendaFormSource.match(/conductor.*?isObserver/s);
      expect(conductorBlock).not.toBeNull();
    });
  });

  // --- AC-094-08: Presentation mode includes pianist and conductor ---
  describe('AC-094-08: Pianist/Conductor in presentation mode Card 1', () => {
    it('buildPresentationCards has pianist_name field', () => {
      expect(presentationSource).toContain("agenda?.pianist_name ?? ''");
    });

    it('buildPresentationCards has conductor_name field', () => {
      expect(presentationSource).toContain("agenda?.conductor_name ?? ''");
    });

    it('uses agenda.pianist i18n key in presentation', () => {
      expect(presentationSource).toContain("t('agenda.pianist')");
    });

    it('uses agenda.conductor i18n key in presentation', () => {
      expect(presentationSource).toContain("t('agenda.conductor')");
    });
  });

  // --- AC-094-09: Field order in Welcome section ---
  describe('AC-094-09: Field order is Presiding, Conducting, Recognizing, Announcements, Pianist, Conductor, Opening Hymn, Opening Prayer', () => {
    it('pianist appears after announcements and before openingHymn', () => {
      const announcementsIdx = agendaFormSource.indexOf("t('agenda.announcements')");
      const pianistIdx = agendaFormSource.indexOf("t('agenda.pianist')");
      const openingHymnIdx = agendaFormSource.indexOf("t('agenda.openingHymn')");
      expect(announcementsIdx).toBeLessThan(pianistIdx);
      expect(pianistIdx).toBeLessThan(openingHymnIdx);
    });

    it('conductor appears after pianist and before openingHymn', () => {
      const pianistIdx = agendaFormSource.indexOf("t('agenda.pianist')");
      const conductorIdx = agendaFormSource.indexOf("t('agenda.conductor')");
      const openingHymnIdx = agendaFormSource.indexOf("t('agenda.openingHymn')");
      expect(pianistIdx).toBeLessThan(conductorIdx);
      expect(conductorIdx).toBeLessThan(openingHymnIdx);
    });
  });

  // --- EC-094-01: No actors with can_music ---
  describe('EC-094-01: No can_music actors', () => {
    it('ActorSelector handles empty list gracefully (existing behavior)', () => {
      const actorSelectorSource = readSourceFile('components/ActorSelector.tsx');
      expect(actorSelectorSource).toContain('ListEmptyComponent');
    });
  });

  // --- EC-094-02: Same actor as pianist and conductor ---
  describe('EC-094-02: Same actor for both roles', () => {
    it('pianist and conductor use separate field names allowing same actor', () => {
      expect(agendaFormSource).toContain("field: 'pianist'");
      expect(agendaFormSource).toContain("field: 'conductor'");
    });
  });

  // --- EC-094-03: Pianist/conductor empty in presentation mode ---
  describe('EC-094-03: Empty values in presentation mode', () => {
    it('pianist defaults to empty string', () => {
      expect(presentationSource).toContain("agenda?.pianist_name ?? ''");
    });

    it('conductor defaults to empty string', () => {
      expect(presentationSource).toContain("agenda?.conductor_name ?? ''");
    });
  });

  // --- i18n keys exist ---
  describe('i18n keys for pianist and conductor', () => {
    it('pt-BR has agenda.pianist = Pianista', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.pianist).toBe('Pianista');
    });

    it('pt-BR has agenda.conductor = Regente', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.conductor).toBe('Regente');
    });

    it('en has agenda.pianist = Pianist', () => {
      const locale = readLocale('en') as { agenda: Record<string, string> };
      expect(locale.agenda.pianist).toBe('Pianist');
    });

    it('en has agenda.conductor = Conductor', () => {
      const locale = readLocale('en') as { agenda: Record<string, string> };
      expect(locale.agenda.conductor).toBe('Conductor');
    });

    it('es has agenda.pianist = Pianista', () => {
      const locale = readLocale('es') as { agenda: Record<string, string> };
      expect(locale.agenda.pianist).toBe('Pianista');
    });

    it('es has agenda.conductor = Director', () => {
      const locale = readLocale('es') as { agenda: Record<string, string> };
      expect(locale.agenda.conductor).toBe('Director');
    });
  });

  // --- Presentation mode field order ---
  describe('Presentation mode field order', () => {
    it('pianist and conductor appear after announcements push in buildPresentationCards', () => {
      const announcementsIdx = presentationSource.indexOf("t('agenda.announcements')");
      const pianistIdx = presentationSource.indexOf("t('agenda.pianist')");
      const openingHymnIdx = presentationSource.indexOf("t('agenda.openingHymn')");
      expect(announcementsIdx).toBeLessThan(pianistIdx);
      expect(pianistIdx).toBeLessThan(openingHymnIdx);
    });
  });
});

// =============================================================================
// F095 (CR-152): Toggle for Intermediate Hymn in Agenda
// =============================================================================

describe('F095 (CR-152): Intermediate Hymn toggle', () => {

  const agendaFormSource = readSourceFile('components/AgendaForm.tsx');
  const presentationSource = readSourceFile('hooks/usePresentationMode.ts');
  const databaseSource = readSourceFile('types/database.ts');

  // --- AC-095-01: Migration file exists ---
  describe('AC-095-01: DB migration and type', () => {
    it('migration file 016_add_has_intermediate_hymn.sql exists', () => {
      const migrationPath = path.resolve(__dirname, '..', '..', 'supabase', 'migrations', '016_add_has_intermediate_hymn.sql');
      expect(fs.existsSync(migrationPath)).toBe(true);
    });

    it('migration contains ALTER TABLE with has_intermediate_hymn BOOLEAN NOT NULL DEFAULT true', () => {
      const migrationPath = path.resolve(__dirname, '..', '..', 'supabase', 'migrations', '016_add_has_intermediate_hymn.sql');
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      expect(sql).toContain('ALTER TABLE sunday_agendas');
      expect(sql).toContain('has_intermediate_hymn');
      expect(sql).toContain('BOOLEAN NOT NULL DEFAULT true');
    });

    it('SundayAgenda type has has_intermediate_hymn: boolean', () => {
      expect(databaseSource).toContain('has_intermediate_hymn: boolean');
    });

    it('has_intermediate_hymn is placed after has_special_presentation', () => {
      const specialIdx = databaseSource.indexOf('has_special_presentation: boolean');
      const intermediateIdx = databaseSource.indexOf('has_intermediate_hymn: boolean');
      expect(specialIdx).toBeLessThan(intermediateIdx);
    });
  });

  // --- AC-095-01 (continued): Toggle visible in normal meeting ---
  describe('AC-095-01: Toggle visible for normal meeting', () => {
    it('AgendaForm has ToggleField with intermediateHymn label', () => {
      expect(agendaFormSource).toContain("label={t('agenda.intermediateHymn')}");
    });

    it('toggle uses agenda.has_intermediate_hymn value', () => {
      expect(agendaFormSource).toContain('value={agenda.has_intermediate_hymn}');
    });
  });

  // --- AC-095-02: Hymn selector visible when toggle ON ---
  describe('AC-095-02: Hymn selector visible when toggle ON', () => {
    it('hymn selector conditional on has_intermediate_hymn', () => {
      expect(agendaFormSource).toContain('{agenda.has_intermediate_hymn && (');
    });
  });

  // --- AC-095-03: Hymn selector hidden when toggle OFF ---
  describe('AC-095-03: Hymn selector hidden when toggle OFF', () => {
    it('hymn selector wrapped in has_intermediate_hymn conditional', () => {
      expect(agendaFormSource).toContain('{agenda.has_intermediate_hymn && (');
    });
  });

  // --- AC-095-04: Toggle hidden when has_special_presentation ---
  describe('AC-095-04: Toggle hidden when has_special_presentation', () => {
    it('toggle is in the else branch of has_special_presentation', () => {
      // The toggle is inside the : ( branch after has_special_presentation ? (
      const specialPresentIdx = agendaFormSource.indexOf('{agenda.has_special_presentation ? (');
      const toggleIdx = agendaFormSource.indexOf("value={agenda.has_intermediate_hymn}");
      expect(specialPresentIdx).toBeLessThan(toggleIdx);
    });
  });

  // --- AC-095-05: Toggle hidden for testimony_meeting ---
  describe('AC-095-05: Toggle hidden for special meetings', () => {
    it('toggle is inside !isSpecial block', () => {
      // The whole speeches section is inside {!isSpecial ? ( ... )}
      const isSpecialCheck = agendaFormSource.indexOf('{!isSpecial ? (');
      const toggleIdx = agendaFormSource.indexOf("value={agenda.has_intermediate_hymn}");
      expect(isSpecialCheck).toBeLessThan(toggleIdx);
    });
  });

  // --- AC-095-06: Toggle hidden for primary_presentation ---
  describe('AC-095-06: Toggle hidden for primary_presentation', () => {
    it('isSpecialMeeting includes primary_presentation', () => {
      const agendaHookSource = readSourceFile('hooks/useAgenda.ts');
      expect(agendaHookSource).toContain("reason === 'primary_presentation'");
    });
  });

  // --- AC-095-07: Presentation mode respects has_intermediate_hymn ---
  describe('AC-095-07: Presentation mode conditional intermediate hymn', () => {
    it('buildPresentationCards checks has_intermediate_hymn !== false', () => {
      expect(presentationSource).toContain('has_intermediate_hymn !== false');
    });
  });

  // --- EC-095-01: Toggle off but hymn previously selected ---
  describe('EC-095-01: Hymn preserved when toggle off', () => {
    it('intermediate_hymn_id NOT cleared in toggle handler (only has_intermediate_hymn updated)', () => {
      expect(agendaFormSource).toContain("updateField('has_intermediate_hymn', val)");
      // No code clearing intermediate_hymn_id when toggle changes
      expect(agendaFormSource).not.toContain("updateField('intermediate_hymn_id', null)");
    });
  });

  // --- EC-095-02: Special presentation toggled with hymn toggle on ---
  describe('EC-095-02: Special presentation does not alter has_intermediate_hymn', () => {
    it('has_special_presentation toggle does not modify has_intermediate_hymn', () => {
      // The has_special_presentation onToggle only sets has_special_presentation
      expect(agendaFormSource).toContain("updateField('has_special_presentation', val)");
    });
  });

  // --- EC-095-03: Observer sees same visual ---
  describe('EC-095-03: Observer with toggle', () => {
    it('toggle disabled for observer', () => {
      // ToggleField receives disabled={isObserver}
      const toggleMatch = agendaFormSource.match(/ToggleField[\s\S]*?label=\{t\('agenda\.intermediateHymn'\)\}[\s\S]*?disabled=\{isObserver\}/);
      expect(toggleMatch).not.toBeNull();
    });
  });
});

// =============================================================================
// F096 (CR-153): Collapsed agenda card status lines
// =============================================================================

describe('F096 (CR-153): Collapsed agenda card status lines', () => {

  const agendaSource = readSourceFile('app/(tabs)/agenda.tsx');
  const agendaHookSource = readSourceFile('hooks/useAgenda.ts');

  // --- AC-096-01: Falta line with missing roles ---
  describe('AC-096-01: Falta line shows missing roles', () => {
    it('checks presiding_name for missing role', () => {
      expect(agendaSource).toContain('agenda?.presiding_name');
    });

    it('checks conducting_name for missing role', () => {
      expect(agendaSource).toContain('agenda?.conducting_name');
    });

    it('checks pianist_name for missing role', () => {
      expect(agendaSource).toContain('agenda?.pianist_name');
    });

    it('checks conductor_name for missing role', () => {
      expect(agendaSource).toContain('agenda?.conductor_name');
    });

    it('uses statusMissing i18n key', () => {
      expect(agendaSource).toContain("t('agenda.statusMissing')");
    });

    it('uses statusPresiding i18n key', () => {
      expect(agendaSource).toContain("t('agenda.statusPresiding')");
    });

    it('uses statusConducting i18n key', () => {
      expect(agendaSource).toContain("t('agenda.statusConducting')");
    });

    it('uses statusPianist i18n key', () => {
      expect(agendaSource).toContain("t('agenda.statusPianist')");
    });

    it('uses statusConductor i18n key', () => {
      expect(agendaSource).toContain("t('agenda.statusConductor')");
    });

    it('joins missing roles with pipe separator', () => {
      expect(agendaSource).toContain("missingRoles.join(' | ')");
    });
  });

  // --- AC-096-02: Falta line hidden when all filled ---
  describe('AC-096-02: Falta line hidden when all roles filled', () => {
    it('Falta line conditional on missingRoles.length > 0', () => {
      expect(agendaSource).toContain('missingRoles.length > 0');
    });
  });

  // --- AC-096-03: Speakers count displayed ---
  describe('AC-096-03: Speaker count displayed', () => {
    it('uses statusSpeakers i18n key', () => {
      expect(agendaSource).toContain("t('agenda.statusSpeakers'");
    });

    it('counts speakers filled out of 3', () => {
      expect(agendaSource).toContain('speakersFilled');
      expect(agendaSource).toContain('total: 3');
    });
  });

  // --- AC-096-04: Speaker count uses override ---
  describe('AC-096-04: Speaker count uses override', () => {
    it('checks speaker_N_override before speech speaker_name', () => {
      expect(agendaSource).toContain('speaker_${pos}_override');
      expect(agendaSource).toContain('overrideVal ?? speech?.speaker_name');
    });
  });

  // --- AC-096-05: Prayers count displayed ---
  describe('AC-096-05: Prayer count displayed', () => {
    it('uses statusPrayers i18n key', () => {
      expect(agendaSource).toContain("t('agenda.statusPrayers'");
    });

    it('counts opening and closing prayer', () => {
      expect(agendaSource).toContain('opening_prayer_name');
      expect(agendaSource).toContain('closing_prayer_name');
      expect(agendaSource).toContain('prayersFilled');
    });
  });

  // --- AC-096-06: Hymns count displayed ---
  describe('AC-096-06: Hymn count displayed', () => {
    it('uses statusHymns i18n key', () => {
      expect(agendaSource).toContain("t('agenda.statusHymns'");
    });

    it('counts opening, sacrament, closing hymns', () => {
      expect(agendaSource).toContain('opening_hymn_id');
      expect(agendaSource).toContain('sacrament_hymn_id');
      expect(agendaSource).toContain('closing_hymn_id');
    });
  });

  // --- AC-096-07: Hymn total adjusts for intermediate hymn ---
  describe('AC-096-07: Hymn total adjusts for has_intermediate_hymn', () => {
    it('base hymn total is 3', () => {
      expect(agendaSource).toContain('let hymnsTotal = 3');
    });

    it('hymn total becomes 4 when has_intermediate_hymn and no special presentation', () => {
      expect(agendaSource).toContain("has_intermediate_hymn !== false && !agenda?.has_special_presentation");
      expect(agendaSource).toContain('hymnsTotal = 4');
    });

    it('counts intermediate_hymn_id when applicable', () => {
      expect(agendaSource).toContain('intermediate_hymn_id');
    });
  });

  // --- AC-096-08: Complete line in green ---
  describe('AC-096-08: Complete lines use green color', () => {
    it('uses green color #22c55e for complete lines', () => {
      expect(agendaSource).toContain('#22c55e');
    });

    it('speakers line green when speakersFilled === 3', () => {
      expect(agendaSource).toContain('speakersFilled === 3 ? GREEN');
    });

    it('prayers line green when prayersFilled === 2', () => {
      expect(agendaSource).toContain('prayersFilled === 2 ? GREEN');
    });

    it('hymns line green when hymnsFilled === hymnsTotal', () => {
      expect(agendaSource).toContain('hymnsFilled === hymnsTotal ? GREEN');
    });
  });

  // --- AC-096-09: Exception card shows yellow text, no status lines ---
  describe('AC-096-09: Exception card has no status lines', () => {
    it('status lines conditioned on !exceptionLabel', () => {
      expect(agendaSource).toContain('!isExpanded && !exceptionLabel');
    });

    it('exception label shown in warning color', () => {
      expect(agendaSource).toContain('colors.warning');
    });
  });

  // --- AC-096-10: General conference card unchanged ---
  describe('AC-096-10: General conference non-expandable', () => {
    it('agenda.tsx uses isExcludedFromAgenda for expandable', () => {
      expect(agendaSource).toContain('isExcludedFromAgenda');
    });
  });

  // --- AC-096-11: Status lines hidden when expanded ---
  describe('AC-096-11: Status lines hidden when expanded', () => {
    it('status lines conditioned on !isExpanded', () => {
      expect(agendaSource).toContain('!isExpanded && !exceptionLabel');
    });
  });

  // --- useAgendaRange hook ---
  describe('useAgendaRange hook', () => {
    it('useAgendaRange is exported from useAgenda.ts', () => {
      expect(agendaHookSource).toContain('export function useAgendaRange');
    });

    it('useAgendaRange uses agendaKeys.byDateRange query key', () => {
      expect(agendaHookSource).toContain('agendaKeys.byDateRange(wardId, startDate, endDate)');
    });

    it('useAgendaRange has enabled guard', () => {
      expect(agendaHookSource).toContain('enabled: !!wardId && !!startDate && !!endDate');
    });

    it('useAgendaRange orders by sunday_date', () => {
      expect(agendaHookSource).toContain(".order('sunday_date')");
    });

    it('useAgendaRange returns SundayAgenda array', () => {
      expect(agendaHookSource).toContain('Promise<SundayAgenda[]>');
    });
  });

  // --- agenda.tsx integration ---
  describe('agenda.tsx integration with useAgendaRange', () => {
    it('agenda.tsx imports useAgendaRange', () => {
      expect(agendaSource).toContain('useAgendaRange');
    });

    it('agenda.tsx calls useAgendaRange', () => {
      expect(agendaSource).toContain('useAgendaRange(startDate, endDate)');
    });

    it('builds agendaMap from useAgendaRange results', () => {
      expect(agendaSource).toContain('agendaMap');
      expect(agendaSource).toContain("new Map<string, SundayAgenda>()");
    });

    it('AgendaSundayCardProps has agenda prop', () => {
      expect(agendaSource).toContain('agenda: SundayAgenda | null');
    });

    it('agenda passed to AgendaSundayCard', () => {
      expect(agendaSource).toContain('agenda={agendaMap.get(date) ?? null}');
    });
  });

  // --- EC-096-01: Agenda not yet created ---
  describe('EC-096-01: Agenda null (not yet created)', () => {
    it('agenda prop can be null', () => {
      expect(agendaSource).toContain('agenda: SundayAgenda | null');
    });

    it('uses optional chaining on agenda fields', () => {
      expect(agendaSource).toContain('agenda?.presiding_name');
      expect(agendaSource).toContain('agenda?.conducting_name');
    });
  });

  // --- EC-096-02: No speeches in bank ---
  describe('EC-096-02: No speeches lazy-created', () => {
    it('speechMap defaults to empty array', () => {
      expect(agendaSource).toContain("speechMap.get(date) ?? []");
    });
  });

  // --- EC-096-03: Past sunday card ---
  describe('EC-096-03: Past sunday with status lines', () => {
    it('isPast applies opacity to card', () => {
      expect(agendaSource).toContain('isPast && !isExpanded && { opacity: 0.6 }');
    });
  });

  // --- EC-096-04: All fields empty ---
  describe('EC-096-04: All fields empty', () => {
    it('all 4 role names checked for missing roles', () => {
      expect(agendaSource).toContain("'agenda.statusPresiding'");
      expect(agendaSource).toContain("'agenda.statusConducting'");
      expect(agendaSource).toContain("'agenda.statusPianist'");
      expect(agendaSource).toContain("'agenda.statusConductor'");
    });
  });

  // --- i18n keys for status lines ---
  describe('i18n keys for status lines', () => {
    const locales = ['pt-BR', 'en', 'es'];
    const statusKeys = [
      'statusMissing', 'statusSpeakers', 'statusPrayers', 'statusHymns',
      'statusPresiding', 'statusConducting', 'statusPianist', 'statusConductor',
    ];

    for (const loc of locales) {
      for (const key of statusKeys) {
        it(`${loc} has agenda.${key}`, () => {
          const locale = readLocale(loc) as { agenda: Record<string, string> };
          expect(locale.agenda[key]).toBeDefined();
          expect(locale.agenda[key].length).toBeGreaterThan(0);
        });
      }
    }

    it('statusSpeakers contains interpolation params in pt-BR', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.statusSpeakers).toContain('{{filled}}');
      expect(locale.agenda.statusSpeakers).toContain('{{total}}');
    });

    it('statusPrayers contains interpolation params in en', () => {
      const locale = readLocale('en') as { agenda: Record<string, string> };
      expect(locale.agenda.statusPrayers).toContain('{{filled}}');
      expect(locale.agenda.statusPrayers).toContain('{{total}}');
    });

    it('statusHymns contains interpolation params in es', () => {
      const locale = readLocale('es') as { agenda: Record<string, string> };
      expect(locale.agenda.statusHymns).toContain('{{filled}}');
      expect(locale.agenda.statusHymns).toContain('{{total}}');
    });
  });

  // --- statusLine style ---
  describe('Style: statusLine', () => {
    it('statusLine style exists', () => {
      expect(agendaSource).toContain('statusLine');
    });

    it('statusLine has fontSize 11', () => {
      expect(agendaSource).toMatch(/statusLine.*?fontSize:\s*11/s);
    });
  });
});

// =============================================================================
// ADDITIONAL TESTER TESTS - Batch 14 Phase 2
// Strengthening coverage for AC/EC gaps and cross-feature validation
// =============================================================================

describe('F093 Additional Tests: i18n keys and cross-feature', () => {

  // --- i18n keys used by collapsed card exist in all locales ---
  describe('i18n: speeches.slot and speeches.lastSpeech exist in all locales', () => {
    const locales = ['pt-BR', 'en', 'es'];
    for (const loc of locales) {
      it(`${loc} has speeches.slot key`, () => {
        const locale = readLocale(loc) as { speeches: Record<string, string> };
        expect(locale.speeches.slot).toBeDefined();
        expect(locale.speeches.slot.length).toBeGreaterThan(0);
      });

      it(`${loc} has speeches.lastSpeech key`, () => {
        const locale = readLocale(loc) as { speeches: Record<string, string> };
        expect(locale.speeches.lastSpeech).toBeDefined();
        expect(locale.speeches.lastSpeech.length).toBeGreaterThan(0);
      });
    }
  });

  // --- AC-093-01 strengthening: verify map renders exactly 3 positions ---
  describe('AC-093-01 (additional): map renders positions 1, 2, 3', () => {
    const sundayCardSource = readSourceFile('components/SundayCard.tsx');

    it('map iterates over [1, 2, 3] array', () => {
      expect(sundayCardSource).toMatch(/\[1, 2, 3\]/);
    });

    it('key={pos} ensures unique keys for 3 lines', () => {
      expect(sundayCardSource).toContain('key={pos}');
    });
  });

  // --- AC-093-03 strengthening: ledsVertical style vs old horizontal leds ---
  describe('AC-093-03 (additional): vertical LEDs distinct from old horizontal', () => {
    const sundayCardSource = readSourceFile('components/SundayCard.tsx');

    it('has both leds and ledsVertical styles defined', () => {
      expect(sundayCardSource).toContain('leds:');
      expect(sundayCardSource).toContain('ledsVertical:');
    });

    it('horizontal leds style has flexDirection row', () => {
      expect(sundayCardSource).toMatch(/leds:.*?flexDirection:\s*'row'/s);
    });
  });

  // --- AC-093-04 strengthening: LEDs inline in speechRow (redesigned by F099) ---
  describe('AC-093-04 (additional): LEDs inline in collapsed card (updated by F099)', () => {
    const sundayCardSource = readSourceFile('components/SundayCard.tsx');

    it('speechRow style used for inline LED + text layout', () => {
      expect(sundayCardSource).toContain('styles.speechRow');
    });

    it('StatusLED rendered inline in collapsed speeches', () => {
      expect(sundayCardSource).toContain('size={10}');
    });
  });

  // --- AC-093-05 strengthening: non-speeches shows exceptionText style ---
  describe('AC-093-05 (additional): exceptionText style with warning color', () => {
    const sundayCardSource = readSourceFile('components/SundayCard.tsx');

    it('exceptionText style exists', () => {
      expect(sundayCardSource).toContain('exceptionText:');
    });

    it('exception text uses colors.warning', () => {
      expect(sundayCardSource).toContain('colors.warning');
    });
  });

  // --- EC-093-02 strengthening: speakerNameLine style details ---
  describe('EC-093-02 (additional): speakerNameLine style complete', () => {
    const sundayCardSource = readSourceFile('components/SundayCard.tsx');

    it('speakerNameLine uses colors.textSecondary', () => {
      expect(sundayCardSource).toContain("styles.speakerNameLine, { color: colors.textSecondary }");
    });
  });
});

describe('F094 Additional Tests: field mapping and disabled state', () => {

  const agendaFormSource = readSourceFile('components/AgendaForm.tsx');

  // --- AC-094-05 strengthening: handleActorSelect derives field names ---
  describe('AC-094-05 (additional): handleActorSelect field name derivation', () => {
    it('handleActorSelect builds nameField as ${field}_name', () => {
      expect(agendaFormSource).toContain('`${selectorModal.field}_name`');
    });

    it('handleActorSelect builds idField as ${field}_actor_id', () => {
      expect(agendaFormSource).toContain('`${selectorModal.field}_actor_id`');
    });
  });

  // --- AC-094-07 strengthening: SelectorField disabled prop ---
  describe('AC-094-07 (additional): SelectorField disabled prop passed', () => {
    it('pianist SelectorField has disabled={isObserver}', () => {
      // Verify the pianist section specifically has disabled={isObserver}
      const pianistSection = agendaFormSource.match(/agenda\.pianist_name.*?disabled=\{isObserver\}/s);
      expect(pianistSection).not.toBeNull();
    });

    it('conductor SelectorField has disabled={isObserver}', () => {
      const conductorSection = agendaFormSource.match(/agenda\.conductor_name.*?disabled=\{isObserver\}/s);
      expect(conductorSection).not.toBeNull();
    });
  });

  // --- AC-094-09 strengthening: full field order verification ---
  describe('AC-094-09 (additional): full field order with all 8 fields', () => {
    it('presiding appears before conducting', () => {
      const presidingIdx = agendaFormSource.indexOf("t('agenda.presiding')");
      const conductingIdx = agendaFormSource.indexOf("t('agenda.conducting')");
      expect(presidingIdx).toBeLessThan(conductingIdx);
    });

    it('conducting appears before recognizing', () => {
      const conductingIdx = agendaFormSource.indexOf("t('agenda.conducting')");
      const recognizingIdx = agendaFormSource.indexOf("t('agenda.recognizing')");
      expect(conductingIdx).toBeLessThan(recognizingIdx);
    });

    it('recognizing appears before announcements', () => {
      const recognizingIdx = agendaFormSource.indexOf("t('agenda.recognizing')");
      const announcementsIdx = agendaFormSource.indexOf("t('agenda.announcements')");
      expect(recognizingIdx).toBeLessThan(announcementsIdx);
    });

    it('conductor appears before openingHymn', () => {
      const conductorIdx = agendaFormSource.indexOf("t('agenda.conductor')");
      const openingHymnIdx = agendaFormSource.indexOf("t('agenda.openingHymn')");
      expect(conductorIdx).toBeLessThan(openingHymnIdx);
    });

    it('openingHymn appears before openingPrayer', () => {
      const openingHymnIdx = agendaFormSource.indexOf("t('agenda.openingHymn')");
      const openingPrayerIdx = agendaFormSource.indexOf("t('agenda.openingPrayer')");
      expect(openingHymnIdx).toBeLessThan(openingPrayerIdx);
    });
  });

  // --- EC-094-02 strengthening: separate field names allow same actor ---
  describe('EC-094-02 (additional): fields are independent', () => {
    it('pianist and conductor use different field names', () => {
      expect(agendaFormSource).toContain("field: 'pianist'");
      expect(agendaFormSource).toContain("field: 'conductor'");
    });

    it('pianist_name and conductor_name are separate DB fields', () => {
      expect(agendaFormSource).toContain('agenda.pianist_name');
      expect(agendaFormSource).toContain('agenda.conductor_name');
    });
  });
});

describe('F095 Additional Tests: toggle behavior and special meeting types', () => {

  const agendaFormSource = readSourceFile('components/AgendaForm.tsx');
  const agendaHookSource = readSourceFile('hooks/useAgenda.ts');

  // --- AC-095-01 strengthening: toggle value from DB ---
  describe('AC-095-01 (additional): toggle value persisted in DB', () => {
    it('updateField called with has_intermediate_hymn key', () => {
      expect(agendaFormSource).toContain("updateField('has_intermediate_hymn', val)");
    });
  });

  // --- AC-095-02/03 strengthening: conditional rendering pattern ---
  describe('AC-095-02/03 (additional): hymn selector inside toggle conditional', () => {
    it('hymn selector uses intermediate_hymn_id field for hymn selection', () => {
      expect(agendaFormSource).toContain("field: 'intermediate_hymn_id'");
    });

    it('hymn selector uses getHymnDisplay for value', () => {
      expect(agendaFormSource).toContain('getHymnDisplay(agenda.intermediate_hymn_id, allHymns)');
    });
  });

  // --- AC-095-05/06 strengthening: isSpecialMeeting covers all types ---
  describe('AC-095-05/06 (additional): isSpecialMeeting covers all special types', () => {
    it('isSpecialMeeting includes testimony_meeting', () => {
      expect(agendaHookSource).toContain("reason === 'testimony_meeting'");
    });

    it('isSpecialMeeting includes ward_conference', () => {
      expect(agendaHookSource).toContain("reason === 'ward_conference'");
    });

    it('isSpecialMeeting includes primary_presentation', () => {
      expect(agendaHookSource).toContain("reason === 'primary_presentation'");
    });

    it('isSpecialMeeting includes other', () => {
      expect(agendaHookSource).toContain("reason === 'other'");
    });
  });

  // --- EC-095-01 strengthening: intermediate_hymn_id preserved ---
  describe('EC-095-01 (additional): hymn ID preserved when toggle turned off', () => {
    it('no code clears intermediate_hymn_id anywhere in AgendaForm', () => {
      // Ensure we never set intermediate_hymn_id to null when toggling
      expect(agendaFormSource).not.toMatch(/updateField\('intermediate_hymn_id',\s*null\)/);
    });
  });

  // --- EC-095-03 strengthening: Observer disabled on intermediate hymn toggle ---
  describe('EC-095-03 (additional): Observer sees disabled hymn selector too', () => {
    it('intermediate hymn SelectorField has disabled={isObserver}', () => {
      // Inside the hymn selector for intermediate hymn, check disabled prop
      const intermediateSection = agendaFormSource.match(/intermediate_hymn_id.*?disabled=\{isObserver\}/s);
      expect(intermediateSection).not.toBeNull();
    });
  });
});

describe('F096 Additional Tests: status computation and cross-feature validation', () => {

  const agendaSource = readSourceFile('app/(tabs)/agenda.tsx');
  const presentationSource = readSourceFile('hooks/usePresentationMode.ts');

  // --- AC-096-01 strengthening: IIFE pattern for status computation ---
  describe('AC-096-01 (additional): status computation uses IIFE', () => {
    it('uses immediately invoked function expression for status lines', () => {
      expect(agendaSource).toContain('{!isExpanded && !exceptionLabel && (() => {');
    });
  });

  // --- AC-096-04 strengthening: speaker override template literal ---
  describe('AC-096-04 (additional): override field uses template literal', () => {
    it('override field uses keyof SundayAgenda cast', () => {
      expect(agendaSource).toContain('as keyof SundayAgenda');
    });

    it('override field name includes speaker_${pos}_override template', () => {
      expect(agendaSource).toContain('`speaker_${pos}_override`');
    });
  });

  // --- AC-096-05 strengthening: prayers always total 2 ---
  describe('AC-096-05 (additional): prayers count details', () => {
    it('prayersFilled starts at 0', () => {
      expect(agendaSource).toContain('let prayersFilled = 0');
    });

    it('opening_prayer_name increments count', () => {
      expect(agendaSource).toContain("if (agenda?.opening_prayer_name) prayersFilled++");
    });

    it('closing_prayer_name increments count', () => {
      expect(agendaSource).toContain("if (agenda?.closing_prayer_name) prayersFilled++");
    });

    it('prayersFilled compared against 2 for green color', () => {
      expect(agendaSource).toContain('prayersFilled === 2 ? GREEN');
    });

    it('total parameter is 2 for prayers', () => {
      expect(agendaSource).toContain('total: 2');
    });
  });

  // --- AC-096-07 strengthening: intermediate hymn total across features ---
  describe('AC-096-07 (additional): cross-feature consistency for has_intermediate_hymn', () => {
    it('agenda.tsx checks has_intermediate_hymn !== false', () => {
      expect(agendaSource).toContain("has_intermediate_hymn !== false");
    });

    it('presentation mode also checks has_intermediate_hymn !== false', () => {
      expect(presentationSource).toContain('has_intermediate_hymn !== false');
    });
  });

  // --- AC-096-08 strengthening: GREEN color definition ---
  describe('AC-096-08 (additional): GREEN constant definition', () => {
    it('GREEN constant defined as #22c55e', () => {
      expect(agendaSource).toContain("const GREEN = '#22c55e'");
    });
  });

  // --- AC-096-09/10 strengthening: exception handling details ---
  describe('AC-096-09/10 (additional): exception label computation', () => {
    it('exceptionLabel derived from exception.reason', () => {
      expect(agendaSource).toContain("exception.reason !== 'speeches'");
    });

    it('exceptionLabel uses t() for translation', () => {
      expect(agendaSource).toContain("t(`sundayExceptions.${exception.reason}`");
    });
  });

  // --- AC-096-11 strengthening: status lines not rendered when expanded ---
  describe('AC-096-11 (additional): status lines pattern detail', () => {
    it('status lines inside condition that checks both !isExpanded AND !exceptionLabel', () => {
      // This ensures the IIFE only runs for non-exception, collapsed cards
      expect(agendaSource).toContain('!isExpanded && !exceptionLabel');
    });
  });

  // --- i18n interpolation params comprehensive check ---
  describe('i18n interpolation params complete check', () => {
    const locales = ['pt-BR', 'en', 'es'];
    const interpolatedKeys = ['statusSpeakers', 'statusPrayers', 'statusHymns'];

    for (const loc of locales) {
      for (const key of interpolatedKeys) {
        it(`${loc} agenda.${key} has {{filled}} param`, () => {
          const locale = readLocale(loc) as { agenda: Record<string, string> };
          expect(locale.agenda[key]).toContain('{{filled}}');
        });

        it(`${loc} agenda.${key} has {{total}} param`, () => {
          const locale = readLocale(loc) as { agenda: Record<string, string> };
          expect(locale.agenda[key]).toContain('{{total}}');
        });
      }
    }
  });

  // --- useAgendaRange strengthening: query details ---
  describe('useAgendaRange (additional): query configuration', () => {
    const agendaHookSource = readSourceFile('hooks/useAgenda.ts');

    it('useAgendaRange queries from sunday_agendas table', () => {
      expect(agendaHookSource).toContain("'sunday_agendas'");
    });

    it('useAgendaRange filters by ward_id', () => {
      expect(agendaHookSource).toContain("eq('ward_id', wardId)");
    });

    it('useAgendaRange filters by startDate (gte)', () => {
      expect(agendaHookSource).toContain("gte('sunday_date', startDate)");
    });

    it('useAgendaRange filters by endDate (lte)', () => {
      expect(agendaHookSource).toContain("lte('sunday_date', endDate)");
    });
  });

  // --- agendaMap creation in agenda.tsx ---
  describe('agendaMap (additional): creation and usage', () => {
    it('agendaMap uses useMemo for performance', () => {
      expect(agendaSource).toMatch(/const agendaMap = useMemo/);
    });

    it('agendaMap iterates over allAgendas', () => {
      expect(agendaSource).toContain('for (const agenda of allAgendas ?? [])');
    });

    it('agendaMap sets by sunday_date key', () => {
      expect(agendaSource).toContain('map.set(agenda.sunday_date, agenda)');
    });
  });

  // --- EC-096-04 strengthening: all 4 status keys used for missing roles ---
  describe('EC-096-04 (additional): all 4 roles in missingRoles construction', () => {
    it('missingRoles starts as empty array', () => {
      expect(agendaSource).toContain('const missingRoles: string[] = []');
    });

    it('each role pushes translated label', () => {
      expect(agendaSource).toContain("missingRoles.push(t('agenda.statusPresiding'))");
      expect(agendaSource).toContain("missingRoles.push(t('agenda.statusConducting'))");
      expect(agendaSource).toContain("missingRoles.push(t('agenda.statusPianist'))");
      expect(agendaSource).toContain("missingRoles.push(t('agenda.statusConductor'))");
    });
  });
});

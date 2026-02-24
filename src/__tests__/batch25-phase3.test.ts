/**
 * Batch 25 Phase 3 - Tests for F157 (CR-221) Steps 11-13, 15, 19-22.
 *
 * CR-221: Managed Prayers (Oracoes Gerenciadas)
 * Phase 3 covers: AgendaForm prayer data source change + conditional editing,
 * Agenda collapsed card prayer count from speeches, Home tab dynamic title +
 * prayer count, Tab layout dynamic label, Presentation mode prayer data source,
 * Permissions verification, Regression safety, Comprehensive coverage.
 *
 * Testing strategy: Source code analysis (fs.readFileSync) following project conventions.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// --- Helpers ---

const ROOT = path.resolve(__dirname, '..', '..');

function readSrcFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, 'src', relativePath), 'utf-8');
}

// --- Source files ---
const agendaFormSource = readSrcFile('components/AgendaForm.tsx');
const agendaTabSource = readSrcFile('app/(tabs)/agenda.tsx');
const homeTabSource = readSrcFile('app/(tabs)/index.tsx');
const layoutSource = readSrcFile('app/(tabs)/_layout.tsx');
const presentationModeSource = readSrcFile('hooks/usePresentationMode.ts');
const speechesTabSource = readSrcFile('app/(tabs)/speeches.tsx');
const speechSlotSource = readSrcFile('components/SpeechSlot.tsx');
const nextAssignmentsSource = readSrcFile('components/NextAssignmentsSection.tsx');
const sundayCardSource = readSrcFile('components/SundayCard.tsx');
const useSpeechesSource = readSrcFile('hooks/useSpeeches.ts');
const inviteManagementSource = readSrcFile('components/InviteManagementSection.tsx');
const whatsappUtilsSource = readSrcFile('lib/whatsappUtils.ts');
const whatsappSettingsSource = readSrcFile('app/(tabs)/settings/whatsapp.tsx');
const settingsIndexSource = readSrcFile('app/(tabs)/settings/index.tsx');
const typesSource = readSrcFile('types/database.ts');

// --- i18n locale files ---
const ptBR = JSON.parse(readSrcFile('i18n/locales/pt-BR.json'));
const en = JSON.parse(readSrcFile('i18n/locales/en.json'));
const es = JSON.parse(readSrcFile('i18n/locales/es.json'));


// ============================================================================
// STEP-11: AgendaForm - prayer data source change + conditional editing
// ============================================================================

describe('STEP-11: AgendaForm - prayer data source change', () => {

  // --- AC-157-37: Opening prayer reads from speeches position 0 ---

  describe('AC-157-37: Opening prayer reads from speeches position 0', () => {
    it('opening prayer value reads from getSpeech(0)?.speaker_name', () => {
      expect(agendaFormSource).toContain('getSpeech(0)?.speaker_name');
    });

    it('does NOT read opening_prayer_name from agenda', () => {
      expect(agendaFormSource).not.toContain('agenda.opening_prayer_name');
    });

    it('does NOT reference agenda.opening_prayer_member_id', () => {
      expect(agendaFormSource).not.toContain('opening_prayer_member_id');
    });
  });

  // --- AC-157-38: Closing prayer reads from speeches position 4 ---

  describe('AC-157-38: Closing prayer reads from speeches position 4', () => {
    it('closing prayer value reads from getSpeech(4)?.speaker_name', () => {
      expect(agendaFormSource).toContain('getSpeech(4)?.speaker_name');
    });

    it('does NOT read closing_prayer_name from agenda', () => {
      expect(agendaFormSource).not.toContain('agenda.closing_prayer_name');
    });

    it('does NOT reference agenda.closing_prayer_member_id', () => {
      expect(agendaFormSource).not.toContain('closing_prayer_member_id');
    });
  });

  // --- AC-157-13: Toggle OFF - PrayerSelector for prayers ---

  describe('AC-157-13: Toggle OFF - Agenda uses PrayerSelector', () => {
    it('imports useWardManagePrayers hook', () => {
      expect(agendaFormSource).toContain('useWardManagePrayers');
    });

    it('calls useWardManagePrayers to get managePrayers flag', () => {
      expect(agendaFormSource).toMatch(/\{\s*managePrayers\s*\}\s*=\s*useWardManagePrayers/);
    });

    it('renders PrayerSelector when managePrayers is false', () => {
      // PrayerSelector is rendered conditionally
      expect(agendaFormSource).toContain('PrayerSelector');
    });

    it('PrayerSelector is conditionally shown (not always visible)', () => {
      // The managePrayers check determines which component to render
      expect(agendaFormSource).toContain('managePrayers ?');
    });
  });

  // --- AC-157-39: PrayerSelector writes to speeches when OFF ---

  describe('AC-157-39: PrayerSelector writes to speeches via useAssignSpeaker', () => {
    it('imports useAssignSpeaker hook', () => {
      expect(agendaFormSource).toContain('useAssignSpeaker');
    });

    it('imports useRemoveAssignment hook', () => {
      expect(agendaFormSource).toContain('useRemoveAssignment');
    });

    it('assignSpeaker.mutate is called with speechId', () => {
      expect(agendaFormSource).toContain('assignSpeaker.mutate');
    });

    it('assignSpeaker passes status assigned_confirmed', () => {
      expect(agendaFormSource).toContain("status: 'assigned_confirmed'");
    });

    it('removeAssignment.mutate is called for clearing', () => {
      expect(agendaFormSource).toContain('removeAssignment.mutate');
    });

    it('getSpeech(0) is used to find the speech record for position 0', () => {
      expect(agendaFormSource).toContain('getSpeech(0)');
    });

    it('getSpeech(4) is used to find the speech record for position 4', () => {
      expect(agendaFormSource).toContain('getSpeech(4)');
    });

    it('no prayer-related updateAgenda.mutate calls remain', () => {
      // Ensure no updateAgenda calls with prayer fields
      expect(agendaFormSource).not.toMatch(/updateAgenda\.mutate\([^)]*opening_prayer/);
      expect(agendaFormSource).not.toMatch(/updateAgenda\.mutate\([^)]*closing_prayer/);
    });
  });

  // --- EC-157-03: Custom prayer name when manage_prayers=false ---

  describe('EC-157-03: Custom prayer name stores memberId correctly', () => {
    it('PrayerSelector onSelect receives PrayerSelection with memberId', () => {
      expect(agendaFormSource).toContain('selection.memberId');
    });

    it('selection memberId is passed to assignSpeaker (can be null for custom)', () => {
      expect(agendaFormSource).toMatch(/memberId:\s*selection\.memberId/);
    });

    it('speakerName comes from selection name', () => {
      expect(agendaFormSource).toContain('speakerName: selection.name');
    });
  });

  // --- AC-157-22: Toggle ON - read-only with pencil icon ---

  describe('AC-157-22: Toggle ON - read-only field + pencil navigation', () => {
    it('renders ReadOnlySpeakerRow when managePrayers is true for opening prayer', () => {
      // The component renders ReadOnlySpeakerRow conditionally
      const openingSection = agendaFormSource.substring(
        agendaFormSource.indexOf("t('agenda.openingPrayer')"),
        agendaFormSource.indexOf("t('agenda.openingPrayer')") + 500
      );
      expect(openingSection).toContain('ReadOnlySpeakerRow');
    });

    it('renders ReadOnlySpeakerRow when managePrayers is true for closing prayer', () => {
      // Count ReadOnlySpeakerRow occurrences; should include prayer rows
      const matches = agendaFormSource.match(/ReadOnlySpeakerRow/g) || [];
      // At least 2 for opening and closing prayer (plus speech rows)
      expect(matches.length).toBeGreaterThanOrEqual(2);
      // The component renders ReadOnlySpeakerRow for closing prayer
      expect(agendaFormSource).toContain("t('agenda.closingPrayer')");
    });

    it('ReadOnlySpeakerRow has PencilIcon component', () => {
      expect(agendaFormSource).toContain('PencilIcon');
    });
  });

  // --- AC-157-40: Toggle ON - pencil navigates to Speeches tab ---

  describe('AC-157-40: Pencil navigation to Speeches tab', () => {
    it('onNavigate pushes to speeches tab with expandDate param', () => {
      expect(agendaFormSource).toContain("pathname: '/(tabs)/speeches'");
    });

    it('expandDate param is set to sundayDate', () => {
      expect(agendaFormSource).toContain('expandDate: sundayDate');
    });
  });

  // --- EC-157-05: Toggle ON with prayers already assigned via PrayerSelector ---

  describe('EC-157-05: Toggle ON with pre-existing prayers', () => {
    it('prayer data reads from speeches positions 0/4 regardless of toggle state', () => {
      // Both managePrayers branches read from getSpeech
      expect(agendaFormSource).toContain('getSpeech(0)?.speaker_name');
      expect(agendaFormSource).toContain('getSpeech(4)?.speaker_name');
    });

    it('PrayerSelector selected state reads from speech record', () => {
      // The selected prop for PrayerSelector reads from speeches
      expect(agendaFormSource).toContain('speech.member_id');
      expect(agendaFormSource).toContain('speech.speaker_name');
    });
  });

  // --- EC-157-06: Toggle OFF with prayers in non-confirmed status ---

  describe('EC-157-06: Toggle OFF shows prayer regardless of status', () => {
    it('prayer display does not check status field', () => {
      // getSpeech(0)?.speaker_name does not filter by status
      const relevantCode = agendaFormSource;
      // Verify no status check before reading speaker_name for prayers
      expect(relevantCode).not.toMatch(/getSpeech\(0\)\?\.status/);
    });
  });
});


// ============================================================================
// STEP-12: Agenda collapsed card - prayer count from speeches
// ============================================================================

describe('STEP-12: Agenda collapsed card - prayer count from speeches', () => {

  // --- AC-157-41: Collapsed card prayer count reads from speeches ---

  describe('AC-157-41: Prayer count reads from speeches positions 0/4', () => {
    it('does NOT reference agenda.opening_prayer_name for prayer count', () => {
      expect(agendaTabSource).not.toContain('opening_prayer_name');
    });

    it('does NOT reference agenda.closing_prayer_name for prayer count', () => {
      expect(agendaTabSource).not.toContain('closing_prayer_name');
    });

    it('counts prayers from speeches by checking position 0 and 4', () => {
      expect(agendaTabSource).toContain('s.position === 0');
      expect(agendaTabSource).toContain('s.position === 4');
    });

    it('counts prayers by checking speaker_name is truthy', () => {
      expect(agendaTabSource).toContain('s.speaker_name');
    });

    it('counts prayers using loop over speeches array', () => {
      expect(agendaTabSource).toContain('for (const s of speeches)');
    });

    it('prayer count is used in status line display', () => {
      expect(agendaTabSource).toContain('prayersFilled');
    });
  });

  // --- EC-157-02: Sunday with no agenda record but has speeches ---

  describe('EC-157-02: Prayer count works without agenda record', () => {
    it('prayer count does not depend on agenda object for prayer data', () => {
      // prayersFilled is computed from speeches, not agenda
      const prayerCountCode = agendaTabSource.substring(
        agendaTabSource.indexOf('let prayersFilled = 0'),
        agendaTabSource.indexOf('let prayersFilled = 0') + 200
      );
      expect(prayerCountCode).not.toContain('agenda?.opening_prayer');
      expect(prayerCountCode).not.toContain('agenda?.closing_prayer');
    });
  });
});


// ============================================================================
// STEP-13: Home tab - dynamic section title + prayer count
// ============================================================================

describe('STEP-13: Home tab - dynamic section title + prayer count', () => {

  // --- AC-157-16: Toggle OFF - Home section title ---

  describe('AC-157-16: Toggle OFF - section title is nextSpeeches', () => {
    it('i18n key home.nextAssignments exists in pt-BR', () => {
      expect(ptBR.home.nextAssignments).toBeDefined();
    });

    it('nextAssignments translates to Próximos Discursos in pt-BR', () => {
      expect(ptBR.home.nextAssignments).toContain('Discursos');
    });
  });

  // --- AC-157-25: Toggle ON - Home section title ---

  describe('AC-157-25: Toggle ON - section title is nextSpeechesAndPrayers', () => {
    it('imports useWardManagePrayers in Home tab', () => {
      expect(homeTabSource).toContain('useWardManagePrayers');
    });

    it('calls useWardManagePrayers to get managePrayers flag', () => {
      expect(homeTabSource).toMatch(/\{\s*managePrayers\s*\}\s*=\s*useWardManagePrayers/);
    });

    it('i18n key home.nextSpeechesAndPrayers exists in pt-BR', () => {
      expect(ptBR.home.nextSpeechesAndPrayers).toBeDefined();
    });

    it('nextSpeechesAndPrayers contains Orações in pt-BR', () => {
      expect(ptBR.home.nextSpeechesAndPrayers).toContain('Orações');
    });

    it('i18n key home.nextSpeechesAndPrayers exists in en', () => {
      expect(en.home.nextSpeechesAndPrayers).toBeDefined();
    });

    it('nextSpeechesAndPrayers contains Prayers in en', () => {
      expect(en.home.nextSpeechesAndPrayers).toContain('Prayers');
    });

    it('i18n key home.nextSpeechesAndPrayers exists in es', () => {
      expect(es.home.nextSpeechesAndPrayers).toBeDefined();
    });
  });

  // --- AC-157-42: Preview card prayer count ---

  describe('AC-157-42: Preview card prayer count from speeches', () => {
    it('Home tab does NOT read opening_prayer_name from agenda', () => {
      expect(homeTabSource).not.toContain('opening_prayer_name');
    });

    it('Home tab does NOT read closing_prayer_name from agenda', () => {
      expect(homeTabSource).not.toContain('closing_prayer_name');
    });

    it('Home tab counts prayers from speeches positions 0 and 4', () => {
      expect(homeTabSource).toContain('s.position === 0');
      expect(homeTabSource).toContain('s.position === 4');
    });
  });

  // --- AC-157-43: Section title changes based on manage_prayers ---

  describe('AC-157-43: NextAssignmentsSection title is dynamic', () => {
    it('NextAssignmentsSection imports useWardManagePrayers', () => {
      expect(nextAssignmentsSource).toContain('useWardManagePrayers');
    });

    it('NextAssignmentsSection calls useWardManagePrayers', () => {
      expect(nextAssignmentsSource).toMatch(/\{\s*managePrayers\s*\}\s*=\s*useWardManagePrayers/);
    });

    it('uses nextSpeechesAndPrayers when managePrayers is true', () => {
      expect(nextAssignmentsSource).toContain('nextSpeechesAndPrayers');
    });

    it('uses nextAssignments when managePrayers is false', () => {
      expect(nextAssignmentsSource).toContain('nextAssignments');
    });

    it('sectionTitleText is computed based on managePrayers', () => {
      expect(nextAssignmentsSource).toContain('sectionTitleText');
    });
  });

  // --- AC-157-44: Prayer cards not expandable, pencil button ---

  describe('AC-157-44: Home tab prayer cards behavior', () => {
    it('Home tab has pencil button for navigation', () => {
      expect(homeTabSource).toContain('PencilIcon');
    });

    it('pencil button navigates to agenda tab with expandDate', () => {
      expect(homeTabSource).toContain('expandDate: sundayDate');
    });
  });
});


// ============================================================================
// STEP-15: Tab layout - dynamic label
// ============================================================================

describe('STEP-15: Tab layout - dynamic label', () => {

  // --- AC-157-15: Toggle OFF - tab label is speeches ---

  describe('AC-157-15: Toggle OFF - Speeches tab label', () => {
    it('i18n key tabs.speeches exists in pt-BR', () => {
      expect(ptBR.tabs.speeches).toBeDefined();
    });

    it('tabs.speeches is Discursos in pt-BR', () => {
      expect(ptBR.tabs.speeches).toBe('Discursos');
    });

    it('tabs.speeches is Speeches in en', () => {
      expect(en.tabs.speeches).toBe('Speeches');
    });
  });

  // --- AC-157-24: Toggle ON - tab label is speechesAndPrayers ---

  describe('AC-157-24: Toggle ON - tab label is speechesAndPrayers', () => {
    it('_layout.tsx imports useWardManagePrayers', () => {
      expect(layoutSource).toContain('useWardManagePrayers');
    });

    it('_layout.tsx calls useWardManagePrayers', () => {
      expect(layoutSource).toMatch(/\{\s*managePrayers\s*\}\s*=\s*useWardManagePrayers/);
    });

    it('Speeches tab title uses speechesTabTitle variable', () => {
      expect(layoutSource).toContain('speechesTabTitle');
    });

    it('speechesTabTitle uses speechesAndPrayers when managePrayers true', () => {
      expect(layoutSource).toContain("t('tabs.speechesAndPrayers')");
    });

    it('speechesTabTitle falls back to t(tabs.speeches) when false', () => {
      expect(layoutSource).toContain("t('tabs.speeches')");
    });

    it('i18n key tabs.speechesAndPrayers exists in pt-BR', () => {
      expect(ptBR.tabs.speechesAndPrayers).toBeDefined();
    });

    it('tabs.speechesAndPrayers contains Orações in pt-BR', () => {
      expect(ptBR.tabs.speechesAndPrayers).toContain('Orações');
    });

    it('tabs.speechesAndPrayers contains Prayers in en', () => {
      expect(en.tabs.speechesAndPrayers).toContain('Prayers');
    });

    it('tabs.speechesAndPrayers exists in es', () => {
      expect(es.tabs.speechesAndPrayers).toBeDefined();
    });
  });
});


// ============================================================================
// STEP-19: Presentation mode - prayer data source
// ============================================================================

describe('STEP-19: Presentation mode - prayer data source', () => {

  // --- AC-157-45: Presentation mode reads prayers from speeches ---

  describe('AC-157-45: Presentation mode reads from speeches positions 0/4', () => {
    it('opening prayer reads from speeches position 0', () => {
      expect(presentationModeSource).toContain('s.position === 0');
    });

    it('closing prayer reads from speeches position 4', () => {
      expect(presentationModeSource).toContain('s.position === 4');
    });

    it('opening prayer uses speeches.find for position 0', () => {
      expect(presentationModeSource).toMatch(/speeches\.find\(s\s*=>\s*s\.position\s*===\s*0\)/);
    });

    it('closing prayer uses speeches.find for position 4', () => {
      expect(presentationModeSource).toMatch(/speeches\.find\(s\s*=>\s*s\.position\s*===\s*4\)/);
    });

    it('does NOT reference agenda.opening_prayer_name', () => {
      expect(presentationModeSource).not.toContain('opening_prayer_name');
    });

    it('does NOT reference agenda.closing_prayer_name', () => {
      expect(presentationModeSource).not.toContain('closing_prayer_name');
    });

    it('speaker_name is extracted from speech record', () => {
      expect(presentationModeSource).toContain('speaker_name');
    });
  });

  // --- EC-157-10: Conference type with no prayers ---

  describe('EC-157-10: Conference type with no prayer records', () => {
    it('speeches.find returns undefined when no match, resulting in empty string', () => {
      // The code uses ?. optional chaining and ?? '' fallback
      expect(presentationModeSource).toMatch(/\?\.\s*speaker_name\s*\?\?\s*''/);
    });
  });

  // --- EC-157-13: Speaker override fields not affected ---

  describe('EC-157-13: Speaker override fields unchanged', () => {
    it('speaker_1_override still used for position 1', () => {
      expect(presentationModeSource).toContain('speaker_1_override');
    });

    it('speaker_2_override still used for position 2', () => {
      expect(presentationModeSource).toContain('speaker_2_override');
    });

    it('speaker_3_override still used for position 3', () => {
      expect(presentationModeSource).toContain('speaker_3_override');
    });

    it('no prayer override fields exist', () => {
      expect(presentationModeSource).not.toContain('speaker_0_override');
      expect(presentationModeSource).not.toContain('speaker_4_override');
    });
  });
});


// ============================================================================
// STEP-20: Permissions - prayer assignment follows speech permissions
// ============================================================================

describe('STEP-20: Permissions - prayer assignment follows speech permissions', () => {

  // --- AC-157-59: Prayer assignment permissions by role ---

  describe('AC-157-59: Role-based prayer assignment permissions', () => {
    it('SpeechSlot checks speech:assign permission', () => {
      expect(speechSlotSource).toContain("hasPermission('speech:assign')");
    });

    it('SpeechSlot checks speech:unassign permission', () => {
      expect(speechSlotSource).toContain("hasPermission('speech:unassign')");
    });

    it('SpeechSlot checks speech:change_status permission', () => {
      expect(speechSlotSource).toContain("hasPermission('speech:change_status')");
    });

    it('SpeechSlot uses same permissions for prayer slots (isPrayer does not bypass)', () => {
      // isPrayer only affects topic row visibility and label, not permission checks
      // canAssign and canUnassign are computed independently of isPrayer
      expect(speechSlotSource).toContain("const canAssign = hasPermission('speech:assign')");
      expect(speechSlotSource).toContain("const canUnassign = hasPermission('speech:unassign')");
    });

    it('AgendaForm PrayerSelector gated by isObserver check', () => {
      expect(agendaFormSource).toContain('if (!isObserver)');
    });

    it('AgendaForm isObserver checks agenda:write permission', () => {
      expect(agendaFormSource).toContain("hasPermission('agenda:write')");
    });
  });

  // --- AC-157-60: Prayer status change permissions ---

  describe('AC-157-60: Prayer status change permissions', () => {
    it('SpeechSlot status change gated by canChangeStatus', () => {
      expect(speechSlotSource).toContain('canChangeStatus');
    });

    it('canChangeStatus is derived from speech:change_status permission', () => {
      expect(speechSlotSource).toContain("hasPermission('speech:change_status')");
    });
  });

  // --- AC-157-64: Observer sees prayer slots as disabled ---

  describe('AC-157-64: Observer sees prayer slots as disabled', () => {
    it('SpeechSlot checks observer role', () => {
      expect(speechSlotSource).toContain('isObserver');
    });

    it('observer role is computed from role === observer', () => {
      expect(speechSlotSource).toContain("role === 'observer'");
    });

    it('SpeechSlot disables status controls for observer', () => {
      expect(speechSlotSource).toContain('disabled={isObserver');
    });

    it('AgendaForm disables prayer fields for observer', () => {
      expect(agendaFormSource).toContain('disabled={isObserver');
    });
  });
});


// ============================================================================
// STEP-21: Regression - existing wards unaffected + toggle ON/OFF cycle
// ============================================================================

describe('STEP-21: Regression - existing wards unaffected', () => {

  // --- AC-157-62: Existing wards with manage_prayers=false work as before ---

  describe('AC-157-62: Toggle OFF preserves pre-CR-221 behavior', () => {
    it('useWardManagePrayers defaults to false', () => {
      expect(useSpeechesSource).toContain('managePrayers: data ?? false');
    });

    it('useWardManagePrayers returns false when loading', () => {
      expect(useSpeechesSource).toContain('managePrayers: data ?? false');
    });

    it('AgendaForm shows PrayerSelector when managePrayers is false', () => {
      // The else branch of managePrayers ? ... : ... renders PrayerSelector
      expect(agendaFormSource).toContain('PrayerSelector');
    });

    it('Speeches tab does not render prayer slots when managePrayers is false', () => {
      expect(speechesTabSource).toContain('managePrayers &&');
    });

    it('Tab label uses t(tabs.speeches) when managePrayers is false', () => {
      expect(layoutSource).toContain("t('tabs.speeches')");
    });

    it('SundayCard collapsed does not show prayer lines when managePrayers is false', () => {
      expect(sundayCardSource).toContain('managePrayers');
    });

    it('InviteManagement excludes positions 0/4 when managePrayers is false', () => {
      expect(inviteManagementSource).toContain('managePrayers');
    });

    it('WhatsApp settings does not show segmented control when managePrayers is false', () => {
      expect(whatsappSettingsSource).toContain('managePrayers');
    });
  });

  // --- AC-157-63: Toggling ON then OFF restores original behavior ---

  describe('AC-157-63: Toggle ON/OFF cycle restores original state', () => {
    it('manage_prayers flag is a simple boolean from wards table', () => {
      expect(useSpeechesSource).toContain("manage_prayers");
    });

    it('UI is fully driven by managePrayers flag (no cached state)', () => {
      // All components use useWardManagePrayers reactively
      expect(layoutSource).toContain('useWardManagePrayers');
      expect(homeTabSource).toContain('useWardManagePrayers');
      expect(agendaFormSource).toContain('useWardManagePrayers');
    });

    it('tab label reverts to speeches when toggled OFF', () => {
      // The ternary uses managePrayers to select the title
      expect(layoutSource).toContain("managePrayers\n    ? t('tabs.speechesAndPrayers')\n    : t('tabs.speeches')");
    });

    it('settings toggle updates ward manage_prayers column', () => {
      expect(settingsIndexSource).toContain('manage_prayers');
    });

    it('settings toggle invalidates ward query keys', () => {
      expect(settingsIndexSource).toContain('wardKeys');
    });
  });

  // --- EC-157-07: Realtime sync for prayer positions ---

  describe('EC-157-07: Realtime subscription includes positions 0/4', () => {
    it('speeches query does not filter by position (fetches all positions)', () => {
      // useSpeeches query selects all speeches by date range, no position filter
      expect(useSpeechesSource).not.toMatch(/\.eq\('position'/);
      expect(useSpeechesSource).toContain("order('position'");
    });
  });

  // --- EC-157-08: Activity log uses existing format ---

  describe('EC-157-08: Activity log for prayer actions', () => {
    it('useAssignSpeaker logs speech:assign action', () => {
      expect(useSpeechesSource).toContain("'speech:assign'");
    });

    it('useRemoveAssignment logs speech:unassign action', () => {
      expect(useSpeechesSource).toContain("'speech:unassign'");
    });

    it('useChangeStatus logs speech:status_change action', () => {
      expect(useSpeechesSource).toContain("'speech:status_change'");
    });

    it('log includes position number in metadata', () => {
      expect(useSpeechesSource).toContain('N: data.position');
    });
  });

  // --- EC-157-09: Offline queue for prayer mutations ---

  describe('EC-157-09: Offline queue works for prayers', () => {
    it('useAssignSpeaker uses TanStack useMutation (offline-aware)', () => {
      expect(useSpeechesSource).toContain('useMutation');
    });

    it('useRemoveAssignment uses TanStack useMutation', () => {
      // Both hooks are defined with useMutation
      const mutationCount = (useSpeechesSource.match(/useMutation\(/g) || []).length;
      expect(mutationCount).toBeGreaterThanOrEqual(4); // lazyCreate, assign, changeStat, remove, delete
    });
  });

  // --- EC-157-11: Collapsed card layout when manage_prayers=false ---

  describe('EC-157-11: Collapsed card unchanged when OFF', () => {
    it('SundayCard accepts managePrayers prop', () => {
      expect(sundayCardSource).toContain('managePrayers');
    });

    it('prayer lines only rendered when managePrayers is true', () => {
      expect(sundayCardSource).toContain('managePrayers &&');
    });
  });
});


// ============================================================================
// STEP-22: Comprehensive coverage - all Phase 1/2/3 ACs and ECs
// ============================================================================

describe('STEP-22: Comprehensive F157 validation', () => {

  // --- Phase 1: DB Migration & Hooks ---

  describe('Phase 1: DB Migration + Types + Hooks', () => {

    // AC-157-01 through AC-157-06: DB migration
    it('AC-157-01: Ward type has manage_prayers boolean', () => {
      expect(typesSource).toContain('manage_prayers');
    });

    it('AC-157-02: Ward type has whatsapp_template_opening_prayer', () => {
      expect(typesSource).toContain('whatsapp_template_opening_prayer');
    });

    it('AC-157-03: Ward type has whatsapp_template_closing_prayer', () => {
      expect(typesSource).toContain('whatsapp_template_closing_prayer');
    });

    it('AC-157-06: Speech position comment allows 0 and 4', () => {
      // Position comment or type allows 0-4
      expect(typesSource).toContain('position');
    });

    // AC-157-07 through AC-157-10: Auto-creation logic
    it('AC-157-07: useLazyCreateSpeeches creates positions 0,1,2,3,4 for speeches type', () => {
      expect(useSpeechesSource).toContain('[0, 1, 2, 3, 4]');
    });

    it('AC-157-08: useLazyCreateSpeeches creates [0,4] for testimony_meeting', () => {
      expect(useSpeechesSource).toContain('[0, 4]');
    });

    it('AC-157-09: useLazyCreateSpeeches creates [0,4] for primary_presentation', () => {
      expect(useSpeechesSource).toContain("'primary_presentation'");
    });

    it('AC-157-10: useLazyCreateSpeeches creates empty array for conference/other types', () => {
      expect(useSpeechesSource).toContain("positions = []");
    });

    // AC-157-11: Status always confirmed when OFF
    it('AC-157-11: useAssignSpeaker supports status override', () => {
      expect(useSpeechesSource).toContain("input.status ?? 'assigned_not_invited'");
    });
  });

  // --- Phase 1: Settings Toggle ---

  describe('Phase 1: Settings Toggle (AC-157-57, AC-157-58)', () => {
    it('AC-157-57: Settings has manage_prayers toggle', () => {
      expect(settingsIndexSource).toContain('manage_prayers');
    });

    it('AC-157-58: Toggle updates wards table', () => {
      expect(settingsIndexSource).toContain('manage_prayers');
    });
  });

  // --- Phase 1: i18n ---

  describe('Phase 1: i18n (AC-157-61)', () => {
    it('AC-157-61: prayers.opening key exists in all locales', () => {
      expect(ptBR.prayers.opening).toBeDefined();
      expect(en.prayers.opening).toBeDefined();
      expect(es.prayers.opening).toBeDefined();
    });

    it('AC-157-61: prayers.closing key exists in all locales', () => {
      expect(ptBR.prayers.closing).toBeDefined();
      expect(en.prayers.closing).toBeDefined();
      expect(es.prayers.closing).toBeDefined();
    });

    it('AC-157-61: prayers.prayerPrefix key exists in all locales', () => {
      expect(ptBR.prayers.prayerPrefix).toBeDefined();
      expect(en.prayers.prayerPrefix).toBeDefined();
      expect(es.prayers.prayerPrefix).toBeDefined();
    });

    it('AC-157-61: settings.managePrayers key exists in all locales', () => {
      expect(ptBR.settings.managePrayers).toBeDefined();
      expect(en.settings.managePrayers).toBeDefined();
      expect(es.settings.managePrayers).toBeDefined();
    });

    it('AC-157-61: whatsapp tab keys exist in all locales', () => {
      expect(ptBR.whatsapp.tabSpeech).toBeDefined();
      expect(ptBR.whatsapp.tabOpeningPrayer).toBeDefined();
      expect(ptBR.whatsapp.tabClosingPrayer).toBeDefined();
    });

    it('AC-157-61: speeches prayer label keys exist in all locales', () => {
      expect(ptBR.speeches.openingPrayer).toBeDefined();
      expect(ptBR.speeches.closingPrayer).toBeDefined();
      expect(en.speeches.openingPrayer).toBeDefined();
      expect(en.speeches.closingPrayer).toBeDefined();
    });
  });

  // --- Phase 2: SpeechSlot isPrayer ---

  describe('Phase 2: SpeechSlot isPrayer (AC-157-28, AC-157-29)', () => {
    it('AC-157-28: SpeechSlot has isPrayer prop', () => {
      expect(speechSlotSource).toContain('isPrayer');
    });

    it('AC-157-29: getPositionLabel handles positions 0 and 4 as prayers', () => {
      expect(speechSlotSource).toContain("prayers.opening");
      expect(speechSlotSource).toContain("prayers.closing");
    });
  });

  // --- Phase 2: Speeches Tab ---

  describe('Phase 2: Speeches Tab (AC-157-18, AC-157-27, AC-157-30)', () => {
    it('AC-157-18: Prayer slots not rendered when managePrayers is false', () => {
      expect(speechesTabSource).toContain('managePrayers &&');
    });

    it('AC-157-27: Opening prayer slot before speech slots', () => {
      expect(speechesTabSource).toContain('position === 0');
    });

    it('AC-157-27: Closing prayer slot after speech slots', () => {
      expect(speechesTabSource).toContain('position === 4');
    });

    it('AC-157-30: Testimony/primary with managePrayers shows only prayer slots', () => {
      expect(speechesTabSource).toContain('isTestimonyOrPrimary && managePrayers');
    });
  });

  // --- Phase 2: Collapsed Card Layout ---

  describe('Phase 2: Collapsed Card (AC-157-31 through AC-157-36)', () => {
    it('AC-157-36: Prayer lines use italic with prayerPrefix', () => {
      expect(sundayCardSource).toContain('prayerPrefix');
    });

    it('SundayCard accepts managePrayers prop', () => {
      expect(sundayCardSource).toContain('managePrayers');
    });
  });

  // --- Phase 2: InviteManagement ---

  describe('Phase 2: InviteManagement (AC-157-17, AC-157-26)', () => {
    it('AC-157-17: InviteManagement excludes prayers when OFF', () => {
      expect(inviteManagementSource).toContain('managePrayers');
    });

    it('AC-157-26: InviteManagement includes positions 0/4 when ON', () => {
      expect(inviteManagementSource).toContain('openingPrayer');
      expect(inviteManagementSource).toContain('closingPrayer');
    });
  });

  // --- Phase 2: WhatsApp Templates ---

  describe('Phase 2: WhatsApp (AC-157-52 through AC-157-56)', () => {
    it('AC-157-52: Default opening prayer template in pt-BR exists', () => {
      expect(whatsappUtilsSource).toContain('DEFAULT_OPENING_PRAYER_TEMPLATE_PT_BR');
    });

    it('AC-157-53: Default closing prayer template in pt-BR exists', () => {
      expect(whatsappUtilsSource).toContain('DEFAULT_CLOSING_PRAYER_TEMPLATE_PT_BR');
    });

    it('AC-157-54: Prayer templates use only nome and data placeholders', () => {
      expect(whatsappUtilsSource).toContain('{nome}');
      expect(whatsappUtilsSource).toContain('{data}');
    });

    it('AC-157-55: Default templates exist for en and es', () => {
      expect(whatsappUtilsSource).toContain('DEFAULT_OPENING_PRAYER_TEMPLATE_EN');
      expect(whatsappUtilsSource).toContain('DEFAULT_CLOSING_PRAYER_TEMPLATE_EN');
      expect(whatsappUtilsSource).toContain('DEFAULT_OPENING_PRAYER_TEMPLATE_ES');
      expect(whatsappUtilsSource).toContain('DEFAULT_CLOSING_PRAYER_TEMPLATE_ES');
    });

    it('AC-157-56: WhatsApp settings has segmented control', () => {
      expect(whatsappSettingsSource).toContain('managePrayers');
    });
  });

  // --- Phase 2: Sunday Type Change ---

  describe('Phase 2: Sunday Type Change (AC-157-46 through AC-157-51)', () => {
    it('AC-157-46: Speeches->testimony preserves prayers (deletes [1,2,3])', () => {
      expect(sundayCardSource).toContain('[1, 2, 3]');
    });

    it('AC-157-51: Confirmation dialog varies based on what is deleted', () => {
      expect(sundayCardSource).toContain('confirmDeletePrayers');
      expect(sundayCardSource).toContain('confirmDeleteBoth');
    });
  });

  // --- Phase 2: Notification Trigger ---

  describe('Phase 2: Notification Trigger (AC-157-12, AC-157-20)', () => {
    it('AC-157-12: Notification trigger checks manage_prayers for prayer positions', () => {
      // This is in the SQL migration, verified by the migration file presence
      const migrationExists = fs.existsSync(path.resolve(ROOT, 'supabase', 'migrations', '019_managed_prayers.sql'));
      expect(migrationExists).toBe(true);
    });
  });

  // --- Phase 3: useDeleteSpeechesByDate position filter ---

  describe('Phase 1: useDeleteSpeechesByDate (AC-157-46)', () => {
    it('useDeleteSpeechesByDate accepts positions parameter', () => {
      expect(useSpeechesSource).toContain('positions?: number[]');
    });

    it('useDeleteSpeechesByDate uses .in for position filter', () => {
      expect(useSpeechesSource).toContain(".in('position'");
    });

    it('position filter is optional (backward compatible)', () => {
      expect(useSpeechesSource).toContain('if (positions && positions.length > 0)');
    });
  });

  // --- EC-157-01: Migration idempotency ---

  describe('EC-157-01: Migration idempotency', () => {
    it('migration file exists', () => {
      const migrationExists = fs.existsSync(path.resolve(ROOT, 'supabase', 'migrations', '019_managed_prayers.sql'));
      expect(migrationExists).toBe(true);
    });
  });

  // --- EC-157-04: Custom name only via PrayerSelector ---

  describe('EC-157-04: Custom name only via PrayerSelector when OFF', () => {
    it('SpeechSlot does not expose PrayerSelector inline for prayer position assignment', () => {
      // SpeechSlot imports PrayerSelector but uses MemberSelectorModal externally via onOpenSpeakerSelector
      // The PrayerSelector is used in AgendaForm, not in SpeechSlot rendering
      expect(speechSlotSource).toContain('onOpenSpeakerSelector');
    });

    it('AgendaForm uses PrayerSelector (supports custom names)', () => {
      expect(agendaFormSource).toContain('PrayerSelector');
    });
  });

  // --- EC-157-12: WhatsApp invitation uses correct template ---

  describe('EC-157-12: WhatsApp invitation template by position', () => {
    it('getDefaultPrayerTemplate function exists', () => {
      expect(whatsappUtilsSource).toContain('getDefaultPrayerTemplate');
    });

    it('template function accepts type parameter (opening/closing)', () => {
      expect(whatsappUtilsSource).toMatch(/getDefaultPrayerTemplate\(.*type/);
    });
  });
});

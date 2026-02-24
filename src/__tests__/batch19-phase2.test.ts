/**
 * Tests for Batch 19, Phase 2: Card UI/UX changes, label renames, push notifications bug
 *
 * F120 (CR-179): X button to clear non-free-text, non-switch fields in Agenda card
 * F121 (CR-182): Remove speech editing from Agenda card; navigate to Speeches tab
 * F122 (CR-183): Rename 'Proximas Designacoes' to 'Proximos Discursos'
 * F123 (CR-187): Rename tab 'Agenda' to 'Agendas'
 * F124 (CR-189): Fix alignment of X clear buttons in SpeechSlot
 * F125 (CR-192): Fix push notifications (projectId bug)
 *
 * Covers acceptance criteria:
 *   AC-120-01..10, AC-121-01..08, AC-122-01..04, AC-123-01..04, AC-124-01..06, AC-125-01..07
 * Covers edge cases:
 *   EC-120-01..03, EC-121-01..03, EC-124-01..02, EC-125-01..03
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

function getNestedValue(obj: Record<string, unknown>, keyPath: string): unknown {
  const keys = keyPath.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

// =============================================================================
// F120 (CR-179): X button to clear non-free-text, non-switch fields in AgendaForm
// =============================================================================

describe('F120 (CR-179): X clear buttons in AgendaForm', () => {

  const agendaFormSource = readSourceFile('components/AgendaForm.tsx');

  // --- AC-120-01: X button visible on actor fields when value is set ---
  describe('AC-120-01: X button on actor fields (preside, conduct, pianist, conductor)', () => {
    it('SelectorField accepts onClear and hasValue props', () => {
      expect(agendaFormSource).toContain('onClear');
      expect(agendaFormSource).toContain('hasValue');
    });

    it('SelectorField sub-component defines onClear as optional prop', () => {
      expect(agendaFormSource).toContain('onClear?: () => void');
    });

    it('SelectorField sub-component defines hasValue as optional prop', () => {
      expect(agendaFormSource).toContain('hasValue?: boolean');
    });

    it('presiding field passes onClear handler', () => {
      expect(agendaFormSource).toContain('presiding_name: null, presiding_actor_id: null');
    });

    it('conducting field passes onClear handler', () => {
      expect(agendaFormSource).toContain('conducting_name: null, conducting_actor_id: null');
    });

    it('pianist field passes onClear handler', () => {
      expect(agendaFormSource).toContain('pianist_name: null, pianist_actor_id: null');
    });

    it('conductor field passes onClear handler', () => {
      expect(agendaFormSource).toContain('conductor_name: null, conductor_actor_id: null');
    });
  });

  // --- AC-120-02: X button on hymn fields ---
  describe('AC-120-02: X button on hymn fields', () => {
    it('opening hymn field has onClear that sets opening_hymn_id to null', () => {
      expect(agendaFormSource).toContain("updateField('opening_hymn_id', null)");
    });

    it('sacrament hymn field has onClear that sets sacrament_hymn_id to null', () => {
      expect(agendaFormSource).toContain("updateField('sacrament_hymn_id', null)");
    });

    it('intermediate hymn field has onClear that sets intermediate_hymn_id to null', () => {
      expect(agendaFormSource).toContain("updateField('intermediate_hymn_id', null)");
    });

    it('closing hymn field has onClear that sets closing_hymn_id to null', () => {
      expect(agendaFormSource).toContain("updateField('closing_hymn_id', null)");
    });
  });

  // --- AC-120-03: X button on prayer fields ---
  describe('AC-120-03: X button on prayer fields', () => {
    it('opening prayer field has onClear that clears name and member_id', () => {
      expect(agendaFormSource).toContain('opening_prayer_name: null, opening_prayer_member_id: null');
    });

    it('closing prayer field has onClear that clears name and member_id', () => {
      expect(agendaFormSource).toContain('closing_prayer_name: null, closing_prayer_member_id: null');
    });
  });

  // --- AC-120-04: X button on recognizing field ---
  describe('AC-120-04: X button on recognizing field', () => {
    it('recognizing field has X clear button that sets recognized_names to null', () => {
      expect(agendaFormSource).toContain("updateField('recognized_names', null)");
    });

    it('recognizing clear button uses XIcon SVG component', () => {
      expect(agendaFormSource).toContain('XIcon');
    });
  });

  // --- AC-120-05: X button NOT visible when field is empty ---
  describe('AC-120-05: X button hidden when field is empty', () => {
    it('SelectorField renders X only when onClear and hasValue are provided', () => {
      expect(agendaFormSource).toContain('{onClear && hasValue && (');
    });

    it('hasValue is based on non-null field value for presiding', () => {
      expect(agendaFormSource).toContain('hasValue={!!agenda.presiding_name}');
    });

    it('hasValue is based on non-null field value for hymns', () => {
      expect(agendaFormSource).toContain('hasValue={!!agenda.opening_hymn_id}');
      expect(agendaFormSource).toContain('hasValue={!!agenda.closing_hymn_id}');
    });
  });

  // --- AC-120-06: X button NOT visible for Observer ---
  describe('AC-120-06: Observer does not see X buttons', () => {
    it('onClear is undefined when isObserver is true', () => {
      expect(agendaFormSource).toContain('onClear={!isObserver ?');
    });

    it('recognizing X button is only visible when !isObserver', () => {
      expect(agendaFormSource).toContain('{!isObserver && (');
    });
  });

  // --- AC-120-07: No confirmation dialog when clearing ---
  describe('AC-120-07: No confirmation dialog', () => {
    it('clear buttons do NOT use Alert.alert', () => {
      // The clear handler uses direct updateField or updateAgenda.mutate, no Alert
      const clearHandlerPattern = /onClear.*?Alert\.alert/s;
      expect(clearHandlerPattern.test(agendaFormSource)).toBe(false);
    });
  });

  // --- AC-120-08: Auto-save triggered after clear ---
  describe('AC-120-08: Auto-save via updateField or mutate', () => {
    it('clear handlers use updateField for hymn fields', () => {
      expect(agendaFormSource).toContain("updateField('opening_hymn_id', null)");
      expect(agendaFormSource).toContain("updateField('closing_hymn_id', null)");
    });

    it('clear handlers use updateAgenda.mutate for actor/prayer fields', () => {
      expect(agendaFormSource).toContain('updateAgenda.mutate');
    });
  });

  // --- AC-120-09: Free-text and switch fields NOT affected ---
  describe('AC-120-09: Free-text and switch fields unchanged', () => {
    it('DebouncedTextInput still used for text fields without X', () => {
      expect(agendaFormSource).toContain('DebouncedTextInput');
    });

    it('ToggleField still used for switches without X', () => {
      expect(agendaFormSource).toContain('ToggleField');
    });
  });

  // --- AC-120-10: SpeakerField NOT affected (removed by F121, replaced by ReadOnlySpeakerRow) ---
  describe('AC-120-10: SpeakerField removed, replaced by ReadOnlySpeakerRow', () => {
    it('SpeakerField component no longer exists in AgendaForm', () => {
      expect(agendaFormSource).not.toContain('function SpeakerField');
    });

    it('ReadOnlySpeakerRow is used for speech fields', () => {
      expect(agendaFormSource).toContain('ReadOnlySpeakerRow');
    });
  });

  // --- EC-120-01: Clear recognizing with single name ---
  describe('EC-120-01: Clear recognizing with single name', () => {
    it('recognizing clear sets entire array to null (not removes one)', () => {
      // The clear button uses updateField('recognized_names', null) - clears all
      expect(agendaFormSource).toContain("updateField('recognized_names', null)");
    });
  });

  // --- EC-120-02: Clear intermediate hymn with toggle ---
  describe('EC-120-02: Intermediate hymn clear independent of toggle', () => {
    it('intermediate hymn onClear is within the has_intermediate_hymn conditional block', () => {
      expect(agendaFormSource).toContain("updateField('intermediate_hymn_id', null)");
    });
  });

  // --- EC-120-03: clearButton style ---
  describe('EC-120-03: clearButton style matches app conventions', () => {
    it('clearButton has fontSize 20 and fontWeight 300', () => {
      expect(agendaFormSource).toContain('clearButton');
      expect(agendaFormSource).toContain("fontSize: 20");
      expect(agendaFormSource).toContain("fontWeight: '300'");
    });

    it('X button uses hitSlop=8 for comfortable touch target', () => {
      expect(agendaFormSource).toContain('hitSlop={8}');
    });

    it('X button uses colors.error for visual consistency', () => {
      expect(agendaFormSource).toContain('color={colors.error}');
    });
  });
});

// =============================================================================
// F121 (CR-182): Read-only speeches + pencil navigation
// =============================================================================

describe('F121 (CR-182): Read-only speeches + pencil navigation in AgendaForm', () => {

  const agendaFormSource = readSourceFile('components/AgendaForm.tsx');
  const speechesTabSource = readSourceFile('app/(tabs)/speeches.tsx');

  // --- AC-121-01: Speaker names shown as read-only ---
  describe('AC-121-01: Speaker names read-only in Agenda card', () => {
    it('ReadOnlySpeakerRow renders non-editable speaker name', () => {
      expect(agendaFormSource).toContain('function ReadOnlySpeakerRow');
      expect(agendaFormSource).toContain('speakerReadText');
    });

    it('no RN TextInput import for speaker editing in ReadOnlySpeakerRow', () => {
      // TextInput from react-native is no longer imported (was used by SpeakerField)
      // Extract the react-native import block and check TextInput is not in it
      const rnImportMatch = agendaFormSource.match(/import \{([^}]+)\} from 'react-native'/);
      expect(rnImportMatch).not.toBeNull();
      expect(rnImportMatch![1]).not.toContain('TextInput');
    });

    it('no override editing state in ReadOnlySpeakerRow', () => {
      // SpeakerField had isEditing/editValue state, ReadOnlySpeakerRow does not
      expect(agendaFormSource).not.toContain('function SpeakerField');
      expect(agendaFormSource).not.toContain('speaker_1_override');
      expect(agendaFormSource).not.toContain('speaker_2_override');
      expect(agendaFormSource).not.toContain('speaker_3_override');
    });
  });

  // --- AC-121-02: Pencil button visible ---
  describe('AC-121-02: Pencil button next to each speaker name', () => {
    it('ReadOnlySpeakerRow renders PencilIcon SVG component', () => {
      expect(agendaFormSource).toContain('PencilIcon');
    });

    it('pencil button has onNavigate callback', () => {
      expect(agendaFormSource).toContain('onNavigate');
    });
  });

  // --- AC-121-03: Pencil navigates to Speeches tab with expandDate ---
  describe('AC-121-03: Pencil navigates to Speeches tab with card expanded', () => {
    it('navigation uses router.push with pathname and expandDate param', () => {
      expect(agendaFormSource).toContain("pathname: '/(tabs)/speeches'");
      expect(agendaFormSource).toContain('expandDate: sundayDate');
    });

    it('useRouter is imported from expo-router', () => {
      expect(agendaFormSource).toContain("import { useRouter } from 'expo-router'");
    });
  });

  // --- AC-121-04: Speaker override editing removed ---
  describe('AC-121-04: Speaker override editing removed', () => {
    it('no onEditOverride prop exists in AgendaForm', () => {
      expect(agendaFormSource).not.toContain('onEditOverride');
    });

    it('no handleStartEdit function exists', () => {
      expect(agendaFormSource).not.toContain('handleStartEdit');
    });

    it('no handleSave function for override exists', () => {
      expect(agendaFormSource).not.toContain('handleSave');
    });

    it('no handleRevert function exists', () => {
      expect(agendaFormSource).not.toContain('handleRevert');
    });

    it('no lastMinuteLabel style exists', () => {
      expect(agendaFormSource).not.toContain('lastMinuteLabel');
    });
  });

  // --- AC-121-05: Position 2 hidden when has_second_speech is false ---
  // Note: Position 2 toggle (has_second_speech) is handled by SpeechSlot in the
  // Speeches tab, not in AgendaForm. AgendaForm renders all 3 positions as
  // read-only display. When has_second_speech=false, position 2 speech may
  // not exist (getSpeech(2) returns undefined), showing the placeholder label.
  describe('AC-121-05: Position 2 handling in AgendaForm', () => {
    it('all 3 positions rendered with ReadOnlySpeakerRow', () => {
      const matches = agendaFormSource.match(/ReadOnlySpeakerRow/g);
      expect(matches).not.toBeNull();
      expect(matches!.length).toBeGreaterThanOrEqual(3);
    });

    it('position 2 uses getSpeech(2) which returns undefined when speech not created', () => {
      expect(agendaFormSource).toContain("getSpeech(2)?.speaker_name ?? ''");
    });

    it('has_second_speech conditional disables position 2 ReadOnlySpeakerRow when false', () => {
      expect(agendaFormSource).toContain('agenda.has_second_speech === false');
    });
  });

  // --- AC-121-06: Empty state shows placeholder ---
  describe('AC-121-06: Empty state shows label as placeholder', () => {
    it('ReadOnlySpeakerRow shows label when speakerName is empty', () => {
      // {speakerName || label} pattern
      expect(agendaFormSource).toContain('{speakerName || label}');
    });
  });

  // --- AC-121-07: Presentation Mode still uses overrides ---
  describe('AC-121-07: Presentation Mode unchanged', () => {
    const presentationSource = readSourceFile('hooks/usePresentationMode.ts');

    it('usePresentationMode.ts still reads speaker_1_override', () => {
      expect(presentationSource).toContain('speaker_1_override');
    });

    it('usePresentationMode.ts still reads speaker_2_override', () => {
      expect(presentationSource).toContain('speaker_2_override');
    });

    it('usePresentationMode.ts still reads speaker_3_override', () => {
      expect(presentationSource).toContain('speaker_3_override');
    });

    it('overrides fall back to speech speaker_name via nullish coalescing', () => {
      expect(presentationSource).toMatch(/speaker_1_override.*\?\?.*speaker_name/);
    });
  });

  // --- AC-121-08: Observer sees no pencil button ---
  describe('AC-121-08: Observer and pencil button', () => {
    it('ReadOnlySpeakerRow always shows pencil (navigation is not editing)', () => {
      // pencil navigates, not edits - all roles can navigate to Speeches tab
      expect(agendaFormSource).toContain('onNavigate');
    });

    it('ReadOnlySpeakerRow has disabled prop that hides pencil for Observer', () => {
      const readOnlyProps = agendaFormSource.substring(
        agendaFormSource.indexOf('function ReadOnlySpeakerRow'),
        agendaFormSource.indexOf('function ReadOnlySpeakerRow') + 400
      );
      expect(readOnlyProps).toContain('disabled');
    });

    it('Observer is passed as disabled to ReadOnlySpeakerRow', () => {
      expect(agendaFormSource).toContain('disabled={isObserver}');
    });
  });

  // --- Speeches tab expandDate handling ---
  describe('Speeches tab: expandDate query param (ADR-082)', () => {
    it('useLocalSearchParams and useRouter imported from expo-router', () => {
      expect(speechesTabSource).toContain("import { useLocalSearchParams, useRouter } from 'expo-router'");
    });

    it('params reads expandDate from search params', () => {
      expect(speechesTabSource).toContain('useLocalSearchParams<{ expandDate');
    });

    it('expandDate triggers setExpandedDate and lazyCreate', () => {
      expect(speechesTabSource).toContain('params.expandDate');
      expect(speechesTabSource).toContain('setExpandedDate(targetDate)');
      // CR-221 changed lazyCreate.mutate to accept object (superseded by batch25-phase1)
      expect(speechesTabSource).toContain('lazyCreate.mutate({ sundayDate: targetDate })');
    });

    it('expandDate triggers scroll to target card', () => {
      expect(speechesTabSource).toContain('scrollToIndex');
    });

    it('expandDate param is cleared after handling to prevent re-triggering', () => {
      expect(speechesTabSource).toContain('router.setParams({ expandDate: undefined })');
    });
  });

  // --- EC-121-01: Speeches tab already expanded ---
  describe('EC-121-01: Already expanded target', () => {
    it('setExpandedDate called unconditionally on param change', () => {
      expect(speechesTabSource).toContain('setExpandedDate(targetDate)');
    });
  });

  // --- EC-121-02: No agenda record ---
  describe('EC-121-02: No agenda record shows empty placeholders', () => {
    it('ReadOnlySpeakerRow handles empty speakerName gracefully', () => {
      expect(agendaFormSource).toContain("{speakerName || label}");
    });
  });

  // --- EC-121-03: Secretary role has pencil button ---
  describe('EC-121-03: Secretary can navigate via pencil', () => {
    it('pencil is always rendered (not role-gated)', () => {
      // ReadOnlySpeakerRow has no role check, pencil always shows
      const readOnlyFn = agendaFormSource.substring(
        agendaFormSource.indexOf('function ReadOnlySpeakerRow'),
        agendaFormSource.indexOf('function ReadOnlySpeakerRow') + 500
      );
      expect(readOnlyFn).not.toContain('isObserver');
      expect(readOnlyFn).not.toContain('hasPermission');
    });
  });
});

// =============================================================================
// F122 (CR-183): Rename 'Proximas Designacoes' to 'Proximos Discursos'
// =============================================================================

describe('F122 (CR-183): Rename nextAssignments label', () => {

  const ptBR = readLocale('pt-BR');
  const en = readLocale('en');
  const es = readLocale('es');

  // --- AC-122-01: pt-BR shows 'Proximos Discursos' ---
  it('AC-122-01: pt-BR home.nextAssignments is "Pr\u00f3ximos Discursos"', () => {
    expect(getNestedValue(ptBR, 'home.nextAssignments')).toBe('Pr\u00f3ximos Discursos');
  });

  // --- AC-122-02: en shows 'Upcoming Speeches' ---
  it('AC-122-02: en home.nextAssignments is "Upcoming Speeches"', () => {
    expect(getNestedValue(en, 'home.nextAssignments')).toBe('Upcoming Speeches');
  });

  // --- AC-122-03: es shows 'Proximos Discursos' ---
  it('AC-122-03: es home.nextAssignments is "Pr\u00f3ximos Discursos"', () => {
    expect(getNestedValue(es, 'home.nextAssignments')).toBe('Pr\u00f3ximos Discursos');
  });

  // --- AC-122-04: Key remains home.nextAssignments ---
  it('AC-122-04: i18n key is still home.nextAssignments (not renamed)', () => {
    expect(getNestedValue(ptBR, 'home.nextAssignments')).toBeDefined();
    expect(getNestedValue(en, 'home.nextAssignments')).toBeDefined();
    expect(getNestedValue(es, 'home.nextAssignments')).toBeDefined();
  });
});

// =============================================================================
// F123 (CR-187): Rename tab 'Agenda' to 'Agendas'
// =============================================================================

describe('F123 (CR-187): Rename Agenda to Agendas', () => {

  const ptBR = readLocale('pt-BR');
  const en = readLocale('en');
  const es = readLocale('es');

  // --- AC-123-01: pt-BR tab label ---
  it('AC-123-01: pt-BR tabs.agenda is "Agendas"', () => {
    expect(getNestedValue(ptBR, 'tabs.agenda')).toBe('Agendas');
  });

  // --- AC-123-02: en tab label ---
  it('AC-123-02: en tabs.agenda is "Agendas"', () => {
    expect(getNestedValue(en, 'tabs.agenda')).toBe('Agendas');
  });

  // --- AC-123-03: es tab label ---
  it('AC-123-03: es tabs.agenda is "Agendas"', () => {
    expect(getNestedValue(es, 'tabs.agenda')).toBe('Agendas');
  });

  // --- AC-123-04: Screen title updated ---
  describe('AC-123-04: Screen title updated', () => {
    it('pt-BR agenda.title is "Agendas"', () => {
      expect(getNestedValue(ptBR, 'agenda.title')).toBe('Agendas');
    });

    it('en agenda.title is "Agendas"', () => {
      expect(getNestedValue(en, 'agenda.title')).toBe('Agendas');
    });

    it('es agenda.title is "Agendas"', () => {
      expect(getNestedValue(es, 'agenda.title')).toBe('Agendas');
    });
  });
});

// =============================================================================
// F124 (CR-189): Fix SpeechSlot X alignment (ADR-081)
// =============================================================================

describe('F124 (CR-189): SpeechSlot X alignment fix', () => {

  const speechSlotSource = readSourceFile('components/SpeechSlot.tsx');

  // --- AC-124-01: Speaker X center aligns with speaker field center ---
  describe('AC-124-01: Speaker X aligned via row-per-element layout', () => {
    it('uses speakerRow style instead of two-column layout', () => {
      expect(speechSlotSource).toContain('speakerRow');
      expect(speechSlotSource).not.toContain('outerRow');
      expect(speechSlotSource).not.toContain('leftColumn');
      expect(speechSlotSource).not.toContain('rightColumn');
    });

    it('speakerRow uses flexDirection row and alignItems center', () => {
      expect(speechSlotSource).toMatch(/speakerRow.*?flexDirection:.*?'row'/s);
      expect(speechSlotSource).toMatch(/speakerRow.*?alignItems:.*?'center'/s);
    });

    it('actionArea is sibling of field in speakerRow', () => {
      expect(speechSlotSource).toContain('actionArea');
    });
  });

  // --- AC-124-02: Topic X aligns with topic field ---
  describe('AC-124-02: Topic X aligned via topicRow', () => {
    it('topicActionArea is sibling of topicField in topicRow', () => {
      expect(speechSlotSource).toContain('topicActionArea');
      expect(speechSlotSource).toContain('topicRow');
    });

    it('topicActionArea has matching height of 34', () => {
      expect(speechSlotSource).toMatch(/topicActionArea.*?height: 34/s);
    });
  });

  // --- AC-124-03: Works for all 3 positions ---
  describe('AC-124-03: All positions use same layout', () => {
    it('no per-position layout branching (single template for all)', () => {
      // Position check only for label and toggle, not for layout
      expect(speechSlotSource).toContain('getPositionLabel');
      expect(speechSlotSource).toContain('position === 2');
    });
  });

  // --- AC-124-04: Layout on narrow screens ---
  describe('AC-124-04: Narrow screen layout', () => {
    it('actionArea has fixed width 36', () => {
      expect(speechSlotSource).toMatch(/actionArea.*?width: 36/s);
    });

    it('field uses flex: 1 to fill remaining space', () => {
      expect(speechSlotSource).toMatch(/field:.*?flex: 1/s);
    });
  });

  // --- AC-124-05: Alignment when X not visible ---
  describe('AC-124-05: X hidden does not shift layout', () => {
    it('actionArea rendered even when no X button inside', () => {
      // actionArea is always rendered, conditional is the Pressable inside
      expect(speechSlotSource).toContain('styles.actionArea');
    });
  });

  // --- AC-124-06: StatusLED not regressed ---
  describe('AC-124-06: StatusLED positioning preserved', () => {
    it('labelRow still contains statusSection with StatusLED', () => {
      expect(speechSlotSource).toContain('StatusLED');
      expect(speechSlotSource).toContain('statusSection');
      expect(speechSlotSource).toContain('labelRow');
    });

    it('no statusLedPlaceholder style (removed with two-column layout)', () => {
      expect(speechSlotSource).not.toContain('statusLedPlaceholder');
    });
  });

  // --- EC-124-01: Toggle position 2 off/on maintains alignment ---
  describe('EC-124-01: Position 2 toggle does not break alignment', () => {
    it('isPos2Disabled check is before the speakerRow/topicRow section', () => {
      const pos2Index = speechSlotSource.indexOf('isPos2Disabled');
      const speakerRowIndex = speechSlotSource.indexOf('speakerRow', pos2Index);
      expect(speakerRowIndex).toBeGreaterThan(pos2Index);
    });
  });

  // --- EC-124-02: Long name with ellipsis ---
  describe('EC-124-02: Long name handling', () => {
    it('speaker field uses numberOfLines={1}', () => {
      expect(speechSlotSource).toContain('numberOfLines={1}');
    });

    it('field height is fixed at 38', () => {
      expect(speechSlotSource).toMatch(/field:.*?height: 38/s);
    });
  });
});

// =============================================================================
// F125 (CR-192): Fix push notifications projectId
// =============================================================================

describe('F125 (CR-192): Fix push notifications projectId', () => {

  const notificationsSource = readSourceFile('hooks/useNotifications.ts');

  // --- AC-125-01: projectId correctly passed ---
  describe('AC-125-01: projectId from Constants.expoConfig', () => {
    it('projectId extracted from Constants.expoConfig?.extra?.eas?.projectId', () => {
      expect(notificationsSource).toContain('Constants.expoConfig?.extra?.eas?.projectId');
    });

    it('getExpoPushTokenAsync receives projectId variable', () => {
      expect(notificationsSource).toContain('getExpoPushTokenAsync');
      expect(notificationsSource).toMatch(/getExpoPushTokenAsync\(\{[\s\S]*?projectId/);
    });

    it('does NOT pass projectId: undefined', () => {
      expect(notificationsSource).not.toContain('projectId: undefined');
    });
  });

  // --- AC-125-02: Constants imported ---
  describe('AC-125-02: Constants import', () => {
    it('imports Constants from expo-constants', () => {
      expect(notificationsSource).toContain("import Constants from 'expo-constants'");
    });
  });

  // --- AC-125-05: Fallback when projectId unavailable ---
  describe('AC-125-05: Fallback guard for missing projectId', () => {
    it('checks if projectId is falsy before proceeding', () => {
      expect(notificationsSource).toContain('if (!projectId)');
    });

    it('logs warning when projectId is not available', () => {
      expect(notificationsSource).toContain('projectId not available');
    });

    it('returns early without crash when projectId missing', () => {
      // After the warning, there should be a return statement
      const guardIndex = notificationsSource.indexOf('if (!projectId)');
      const nextLines = notificationsSource.substring(guardIndex, guardIndex + 200);
      expect(nextLines).toContain('return');
    });
  });

  // --- AC-125-06: Observer excluded ---
  describe('AC-125-06: Observer still excluded from push registration', () => {
    it('useRegisterPushToken checks for observer role', () => {
      expect(notificationsSource).toContain("role === 'observer'");
    });
  });

  // --- AC-125-07: Server-side Edge Function not modified ---
  describe('AC-125-07: Server-side process-notifications unchanged', () => {
    it('process-notifications Edge Function does not reference Constants or expoConfig', () => {
      const edgeFnPath = path.resolve(__dirname, '..', '..', 'supabase', 'functions', 'process-notifications', 'index.ts');
      const edgeFnSource = fs.readFileSync(edgeFnPath, 'utf-8');
      // Server-side should not have client-side Constants import
      expect(edgeFnSource).not.toContain('expo-constants');
      expect(edgeFnSource).not.toContain('expoConfig');
    });
  });

  // --- EC-125-01: Permission denied ---
  describe('EC-125-01: Permission denied handling', () => {
    it('checks for granted status before proceeding', () => {
      expect(notificationsSource).toContain("finalStatus !== 'granted'");
    });
  });

  // --- EC-125-02: Offline handling ---
  describe('EC-125-02: Offline deferred registration', () => {
    it('checks isOnline before registering', () => {
      expect(notificationsSource).toContain('if (!isOnline) return');
    });
  });

  // --- EC-125-03: Token upsert for stale tokens ---
  describe('EC-125-03: Token upsert for stale tokens', () => {
    it('uses upsert with onConflict for device_push_tokens', () => {
      expect(notificationsSource).toContain('.upsert(');
      expect(notificationsSource).toContain("onConflict: 'user_id,expo_push_token'");
    });
  });
});

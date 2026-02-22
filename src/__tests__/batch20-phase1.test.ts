/**
 * Tests for Batch 20, Phase 1: Navigation & Home redesign (F126-F129)
 *
 * F126 (CR-184): Pencil icon in Presentation screen to navigate to Agenda tab
 * F127 (CR-185): Play button in expanded Agenda card to navigate to Presentation
 * F128 (CR-186): Home - Agenda section redesign with preview card and play icon
 * F129 (CR-188): Home - NextSundaysSection: non-expandable cards with pencil navigation
 *
 * Covers acceptance criteria:
 *   AC-126-01..07, AC-127-01..07, AC-128-01..10, AC-129-01..11
 * Covers edge cases:
 *   EC-126-01..03, EC-127-01..03, EC-128-01..03, EC-129-01..03
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

// =============================================================================
// F126 (CR-184): Pencil button in Presentation screen + expandDate in Agenda tab
// =============================================================================

describe('F126 (CR-184): Pencil icon in Presentation screen to Agenda tab', () => {

  const presentationSource = readSourceFile('app/presentation.tsx');
  const agendaSource = readSourceFile('app/(tabs)/agenda.tsx');

  // --- AC-126-01: Pencil button visible in Presentation header ---
  describe('AC-126-01: Pencil button in Presentation header', () => {
    it('renders pencil icon U+270F in Presentation header', () => {
      expect(presentationSource).toContain("{'\\u270F'}");
    });

    it('pencil button uses pencilButton style', () => {
      expect(presentationSource).toContain('styles.pencilButton');
    });

    it('pencil button has Edit agenda accessibility label', () => {
      expect(presentationSource).toContain('accessibilityLabel="Edit agenda"');
    });
  });

  // --- AC-126-02: Pencil navigates to Agenda tab with expandDate ---
  describe('AC-126-02: Pencil navigates to Agenda with expandDate', () => {
    it('pencil onPress navigates to /(tabs)/agenda with expandDate param', () => {
      expect(presentationSource).toContain("pathname: '/(tabs)/agenda'");
      expect(presentationSource).toContain('expandDate: sundayDate');
    });
  });

  // --- AC-126-03: Agenda tab auto-expands card when expandDate provided ---
  describe('AC-126-03: Agenda tab expandDate support', () => {
    it('agenda.tsx imports useLocalSearchParams from expo-router', () => {
      expect(agendaSource).toContain('useLocalSearchParams');
      expect(agendaSource).toContain('expo-router');
    });

    it('agenda.tsx reads expandDate query param', () => {
      expect(agendaSource).toContain("useLocalSearchParams<{ expandDate?: string }>");
    });

    it('agenda.tsx sets expandedDate when expandDate provided', () => {
      expect(agendaSource).toContain('setExpandedDate(targetDate)');
    });

    it('agenda.tsx scrolls to target date with scrollToIndex', () => {
      expect(agendaSource).toContain('scrollToIndex');
      expect(agendaSource).toContain('viewPosition: 0');
    });
  });

  // --- AC-126-04: expandDate param cleared after handling ---
  describe('AC-126-04: expandDate param cleared after handling', () => {
    it('agenda.tsx clears expandDate param via router.setParams', () => {
      expect(agendaSource).toContain('router.setParams({ expandDate: undefined })');
    });
  });

  // --- AC-126-05: lazyCreate called for expandDate ---
  describe('AC-126-05: lazyCreate called when expandDate provided', () => {
    it('agenda.tsx calls lazyCreate.mutate with targetDate', () => {
      expect(agendaSource).toContain('lazyCreate.mutate(targetDate)');
    });
  });

  // --- AC-126-06: Pencil visible for all roles ---
  describe('AC-126-06: Pencil visible for all roles', () => {
    it('pencil button has no role-gating condition in presentation.tsx', () => {
      // Pencil button is rendered unconditionally in the header
      expect(presentationSource).toContain('pencilButton');
      // No hasPermission check around the pencil button
      const pencilIndex = presentationSource.indexOf('pencilButton');
      const nearbyCode = presentationSource.substring(Math.max(0, pencilIndex - 200), pencilIndex);
      expect(nearbyCode).not.toContain('hasPermission');
    });
  });

  // --- AC-126-07: Pencil button style matches header buttons ---
  describe('AC-126-07: Pencil button style', () => {
    it('pencil button is 36x36 circle with borderRadius 18', () => {
      const pencilStyle = presentationSource.match(/pencilButton:\s*\{[^}]+\}/s);
      expect(pencilStyle).not.toBeNull();
      expect(pencilStyle![0]).toContain('width: 36');
      expect(pencilStyle![0]).toContain('height: 36');
      expect(pencilStyle![0]).toContain('borderRadius: 18');
    });

    it('pencil button has surfaceVariant background', () => {
      expect(presentationSource).toContain('styles.pencilButton, { backgroundColor: colors.surfaceVariant }');
    });

    it('pencil button has marginRight: 8', () => {
      const pencilStyle = presentationSource.match(/pencilButton:\s*\{[^}]+\}/s);
      expect(pencilStyle).not.toBeNull();
      expect(pencilStyle![0]).toContain('marginRight: 8');
    });
  });

  // --- EC-126-01: expandDate targets already expanded card ---
  describe('EC-126-01: expandDate targets already expanded card', () => {
    it('useEffect guards with listItems.length > 0', () => {
      expect(agendaSource).toContain('if (!params.expandDate || listItems.length === 0) return');
    });
  });

  // --- EC-126-02: expandDate targets date not in FlatList range ---
  describe('EC-126-02: expandDate targets date not in FlatList range', () => {
    it('onScrollToIndexFailed is handled in agenda.tsx', () => {
      expect(agendaSource).toContain('onScrollToIndexFailed');
    });
  });

  // --- EC-126-03: expandDate targets non-expandable Sunday ---
  describe('EC-126-03: expandDate targets non-expandable Sunday', () => {
    it('expandDate sets expandedDate but expandable condition controls rendering', () => {
      // The expandedDate is set but AgendaSundayCard expandable prop controls rendering
      expect(agendaSource).toContain('expandable={!exception || !isExcludedFromAgenda(exception.reason)}');
    });
  });
});

// =============================================================================
// F127 (CR-185): Play button in Agenda card + Presentation date param
// =============================================================================

describe('F127 (CR-185): Play button in Agenda card to Presentation', () => {

  const agendaSource = readSourceFile('app/(tabs)/agenda.tsx');
  const presentationSource = readSourceFile('app/presentation.tsx');

  // --- AC-127-01: Play button visible when expanded ---
  describe('AC-127-01: Play button visible when expanded', () => {
    it('play button U+25B6 rendered in AgendaSundayCard header', () => {
      expect(agendaSource).toContain("{'\\u25B6'}");
    });

    it('play button only visible when expandable && isExpanded', () => {
      expect(agendaSource).toContain('{expandable && isExpanded && (');
    });
  });

  // --- AC-127-02: Play button NOT visible when collapsed ---
  describe('AC-127-02: Play button hidden when collapsed', () => {
    it('play button is gated by isExpanded condition', () => {
      // The play button is inside {expandable && isExpanded && (...)} block
      const playIndex = agendaSource.indexOf("'\\u25B6'");
      const nearbyCode = agendaSource.substring(Math.max(0, playIndex - 500), playIndex);
      expect(nearbyCode).toContain('isExpanded');
    });
  });

  // --- AC-127-03: Play navigates to Presentation with date ---
  describe('AC-127-03: Play navigates to Presentation with date', () => {
    it('play button navigates to /presentation with date param', () => {
      expect(agendaSource).toContain("pathname: '/presentation'");
      expect(agendaSource).toContain('params: { date }');
    });
  });

  // --- AC-127-04: Presentation accepts date parameter ---
  describe('AC-127-04: Presentation accepts date parameter', () => {
    it('presentation.tsx imports useLocalSearchParams', () => {
      expect(presentationSource).toContain('useLocalSearchParams');
    });

    it('presentation.tsx reads date param', () => {
      expect(presentationSource).toContain("useLocalSearchParams<{ date?: string }>");
    });

    it('presentation.tsx uses params.date when provided', () => {
      expect(presentationSource).toContain('params.date ?? getTodaySundayDate()');
    });
  });

  // --- AC-127-05: Falls back to getTodaySundayDate when no param ---
  describe('AC-127-05: Fallback to getTodaySundayDate', () => {
    it('sundayDate uses nullish coalescing with getTodaySundayDate fallback', () => {
      expect(presentationSource).toContain('const sundayDate = params.date ?? getTodaySundayDate()');
    });
  });

  // --- AC-127-06: Play not shown for non-expandable cards ---
  describe('AC-127-06: Play not shown for non-expandable cards', () => {
    it('play button gated by expandable condition', () => {
      expect(agendaSource).toContain('{expandable && isExpanded && (');
    });
  });

  // --- AC-127-07: Play accessible for all roles ---
  describe('AC-127-07: Play accessible for all roles', () => {
    it('play button has accessibility label', () => {
      expect(agendaSource).toContain('accessibilityLabel="Open presentation"');
    });
  });

  // --- EC-127-01: Navigate to Presentation for past Sunday with incomplete agenda ---
  describe('EC-127-01: Past Sunday with incomplete agenda', () => {
    it('Presentation shows placeholder for missing fields', () => {
      // PresentationFieldRow shows "---" when value is empty
      expect(presentationSource).toContain("field.value || '---'");
    });
  });

  // --- EC-127-02: Navigate to Presentation for Sunday with no agenda ---
  describe('EC-127-02: Sunday with no agenda record', () => {
    it('usePresentationData handles null agenda', () => {
      expect(presentationSource).toContain('agenda ?? null');
    });
  });

  // --- EC-127-03: Press play then immediately back ---
  describe('EC-127-03: Press play then back', () => {
    it('close button calls router.back', () => {
      expect(presentationSource).toContain('router.back()');
    });
  });
});

// =============================================================================
// F128 (CR-186): Home - Play icon + preview card + pencil
// =============================================================================

describe('F128 (CR-186): Home preview card and play icon', () => {

  const homeSource = readSourceFile('app/(tabs)/index.tsx');

  // --- AC-128-01: Play icon before Iniciar text ---
  describe('AC-128-01: Play icon in Iniciar button', () => {
    it('play icon U+25B6 rendered before button text', () => {
      expect(homeSource).toContain("{'\\u25B6'}");
    });

    it('play icon uses onPrimary color', () => {
      expect(homeSource).toContain('styles.playIcon, { color: colors.onPrimary }');
    });

    it('play icon uses fontSize >= 17 (F137 increased to 20)', () => {
      const playStyle = homeSource.match(/playIcon:\s*\{[^}]+\}/s);
      expect(playStyle).not.toBeNull();
      const fontSizeMatch = playStyle![0].match(/fontSize:\s*(\d+)/);
      expect(fontSizeMatch).not.toBeNull();
      expect(parseInt(fontSizeMatch![1], 10)).toBeGreaterThanOrEqual(17);
    });
  });

  // --- AC-128-02: Preview card visible below Iniciar ---
  describe('AC-128-02: Preview card below Iniciar button', () => {
    it('preview card rendered with previewCard style', () => {
      expect(homeSource).toContain('styles.previewCard');
    });

    it('preview card has dateBlock', () => {
      expect(homeSource).toContain('styles.dateBlock');
      expect(homeSource).toContain('styles.dateDay');
      expect(homeSource).toContain('styles.dateMonth');
    });
  });

  // --- AC-128-03: Preview card shows correct date (next Sunday Mon-Sat) ---
  describe('AC-128-03: Preview card shows correct date', () => {
    it('uses getTodaySundayDate for date computation', () => {
      expect(homeSource).toContain('getTodaySundayDate');
    });

    it('imports getTodaySundayDate from usePresentationMode', () => {
      expect(homeSource).toContain("import { getTodaySundayDate } from '../../hooks/usePresentationMode'");
    });
  });

  // --- AC-128-04: Preview card shows today date on Sunday ---
  describe('AC-128-04: Preview card shows today on Sunday', () => {
    it('getTodaySundayDate returns today on Sunday (tested via import presence)', () => {
      expect(homeSource).toContain('getTodaySundayDate');
    });
  });

  // --- AC-128-05: Status lines match Agenda tab ---
  describe('AC-128-05: Status lines match Agenda tab collapsed card', () => {
    it('shows speakers status line', () => {
      expect(homeSource).toContain("t('agenda.statusSpeakers'");
    });

    it('shows prayers status line', () => {
      expect(homeSource).toContain("t('agenda.statusPrayers'");
    });

    it('shows hymns status line', () => {
      expect(homeSource).toContain("t('agenda.statusHymns'");
    });

    it('shows missing roles line', () => {
      expect(homeSource).toContain("t('agenda.statusMissing')");
    });

    it('uses green color for complete counts', () => {
      expect(homeSource).toContain("#22c55e");
    });
  });

  // --- AC-128-06: Pencil on preview card navigates to Agenda ---
  describe('AC-128-06: Pencil navigates to Agenda tab', () => {
    it('pencil button navigates to /(tabs)/agenda with expandDate', () => {
      expect(homeSource).toContain("pathname: '/(tabs)/agenda'");
      expect(homeSource).toContain('expandDate: sundayDate');
    });
  });

  // --- AC-128-07: Preview card not expandable ---
  describe('AC-128-07: Preview card not expandable', () => {
    it('preview card has no onToggle or onPress expand handler', () => {
      // The preview card is a plain View, not a Pressable with expand logic
      expect(homeSource).toContain('styles.previewCard');
      // No expandedDate state in Home tab
      expect(homeSource).not.toContain('expandedDate');
    });

    it('preview card has no chevron', () => {
      // No chevron character in the preview card
      expect(homeSource).not.toContain("'\\u25B2'");
      expect(homeSource).not.toContain("'\\u25BC'");
    });
  });

  // --- AC-128-08: Exception label for special meetings ---
  describe('AC-128-08: Exception label for special meetings', () => {
    it('shows exception label in warning color', () => {
      expect(homeSource).toContain('exceptionLabel');
      expect(homeSource).toContain('colors.warning');
    });

    it('handles testimony_meeting and primary_presentation as special with status', () => {
      expect(homeSource).toContain("'testimony_meeting'");
      expect(homeSource).toContain("'primary_presentation'");
    });
  });

  // --- AC-128-09: Preview card visible for all roles ---
  describe('AC-128-09: Preview card visible for all roles', () => {
    it('no role-gating around preview card rendering', () => {
      // Preview card is rendered unconditionally
      expect(homeSource).toContain('Agenda Preview Card');
      // No hasPermission check around the preview card
      expect(homeSource).not.toContain('hasPermission');
    });
  });

  // --- AC-128-10: Pencil button style ---
  describe('AC-128-10: Pencil button style', () => {
    it('pencil button is 36x36 square with borderRadius 8', () => {
      const pencilStyle = homeSource.match(/pencilButton:\s*\{[^}]+\}/s);
      expect(pencilStyle).not.toBeNull();
      expect(pencilStyle![0]).toContain('width: 36');
      expect(pencilStyle![0]).toContain('height: 36');
      expect(pencilStyle![0]).toContain('borderRadius: 8');
    });

    it('pencil icon is U+270F', () => {
      expect(homeSource).toContain("{'\\u270F'}");
    });
  });

  // --- EC-128-01: No agenda record exists ---
  describe('EC-128-01: No agenda record', () => {
    it('status lines handle null agenda with optional chaining', () => {
      expect(homeSource).toContain('agenda?.presiding_name');
      expect(homeSource).toContain('agenda?.opening_prayer_name');
    });
  });

  // --- EC-128-02: Target Sunday is General Conference ---
  describe('EC-128-02: Gen Conf as target Sunday', () => {
    it('exception label shown for non-speech exceptions', () => {
      expect(homeSource).toContain("exception.reason !== 'speeches'");
    });

    it('pencil button still rendered for all exception types', () => {
      // Pencil button is outside the status lines conditional
      expect(homeSource).toContain('pencilButton');
    });
  });

  // --- EC-128-03: Network error ---
  describe('EC-128-03: Network error fetching data', () => {
    it('data hooks return undefined on error (optional chaining handles it)', () => {
      expect(homeSource).toContain('const { data: agenda } = useAgenda');
      expect(homeSource).toContain('const { data: speeches } = useSpeeches');
    });
  });
});

// =============================================================================
// F129 (CR-188): NextSundaysSection simplification + pencil navigation
// =============================================================================

describe('F129 (CR-188): NextSundaysSection non-expandable cards with pencil', () => {

  const nextSundaysSource = readSourceFile('components/NextSundaysSection.tsx');
  const sundayCardSource = readSourceFile('components/SundayCard.tsx');

  // --- AC-129-01: Cards not expandable ---
  describe('AC-129-01: Cards are not expandable', () => {
    it('no expandedDate state in NextSundaysSection', () => {
      expect(nextSundaysSource).not.toContain('expandedDate');
    });

    it('no handleToggle function', () => {
      expect(nextSundaysSource).not.toContain('handleToggle');
    });

    it('SundayCard is rendered without onToggle prop', () => {
      // No onToggle prop passed to SundayCard
      expect(nextSundaysSource).not.toContain('onToggle');
    });
  });

  // --- AC-129-02: No chevron shown ---
  describe('AC-129-02: No chevron on cards', () => {
    it('SundayCard shows renderHeaderRight when onToggle is undefined', () => {
      expect(sundayCardSource).toContain('!onToggle && renderHeaderRight');
    });
  });

  // --- AC-129-03: Pencil button on each card ---
  describe('AC-129-03: Pencil button on each card', () => {
    it('pencil icon U+270F rendered in NextSundaysSection', () => {
      expect(nextSundaysSource).toContain("{'\\u270F'}");
    });

    it('pencil uses renderHeaderRight prop', () => {
      expect(nextSundaysSource).toContain('renderHeaderRight');
    });
  });

  // --- AC-129-04: Pencil navigates to Speeches tab with expandDate ---
  describe('AC-129-04: Pencil navigates to Speeches tab', () => {
    it('pencil onPress navigates to /(tabs)/speeches with expandDate', () => {
      expect(nextSundaysSource).toContain("pathname: '/(tabs)/speeches'");
      expect(nextSundaysSource).toContain('expandDate: entry.date');
    });
  });

  // --- AC-129-05: Speaker names and LEDs visible ---
  describe('AC-129-05: Speaker names and LEDs visible', () => {
    it('SundayCard still renders speaker names and LEDs in collapsed view', () => {
      expect(sundayCardSource).toContain('StatusLED');
      expect(sundayCardSource).toContain('speakerNameLine');
    });
  });

  // --- AC-129-06: No SpeechSlot/Modal rendered ---
  describe('AC-129-06: No inline editing modals', () => {
    it('no SpeechSlot import in NextSundaysSection', () => {
      expect(nextSundaysSource).not.toContain('SpeechSlot');
    });

    it('no MemberSelectorModal in NextSundaysSection', () => {
      expect(nextSundaysSource).not.toContain('MemberSelectorModal');
    });

    it('no TopicSelectorModal in NextSundaysSection', () => {
      expect(nextSundaysSource).not.toContain('TopicSelectorModal');
    });
  });

  // --- AC-129-07: Exception labels shown ---
  describe('AC-129-07: Exception labels for special Sundays', () => {
    it('SundayCard still renders exception text', () => {
      expect(sundayCardSource).toContain('exceptionText');
    });

    it('exceptions are passed to SundayCard', () => {
      expect(nextSundaysSource).toContain('exception={entry.exception}');
    });
  });

  // --- AC-129-08: isNext highlighting preserved ---
  describe('AC-129-08: isNext highlighting preserved', () => {
    it('isNext prop passed to SundayCard', () => {
      expect(nextSundaysSource).toContain('isNext={entry.date === nextSunday}');
    });

    it('SundayCard applies primary border when isNext', () => {
      expect(sundayCardSource).toContain('isNext && { borderColor: colors.primary');
    });
  });

  // --- AC-129-09: has_second_speech respected ---
  describe('AC-129-09: has_second_speech respected', () => {
    it('hasSecondSpeech prop passed to SundayCard', () => {
      expect(nextSundaysSource).toContain('hasSecondSpeech={hasSecondSpeech}');
    });

    it('agendaRange fetched for has_second_speech data', () => {
      expect(nextSundaysSource).toContain('useAgendaRange');
      expect(nextSundaysSource).toContain('has_second_speech');
    });
  });

  // --- AC-129-10: Pencil button style ---
  describe('AC-129-10: Pencil button style', () => {
    it('pencil button is 36x36 square with borderRadius 8', () => {
      const pencilStyle = nextSundaysSource.match(/pencilButton:\s*\{[^}]+\}/s);
      expect(pencilStyle).not.toBeNull();
      expect(pencilStyle![0]).toContain('width: 36');
      expect(pencilStyle![0]).toContain('height: 36');
      expect(pencilStyle![0]).toContain('borderRadius: 8');
    });

    it('pencil button uses surfaceVariant background', () => {
      expect(nextSundaysSource).toContain('backgroundColor: colors.surfaceVariant');
    });
  });

  // --- AC-129-11: Observer can see cards and pencil ---
  describe('AC-129-11: Observer can see cards and pencil', () => {
    it('no role-gating around pencil button or card rendering', () => {
      expect(nextSundaysSource).not.toContain('hasPermission');
    });
  });

  // --- EC-129-01: All Sundays have no speeches ---
  describe('EC-129-01: No speeches created', () => {
    it('speeches data is optional and defaults to empty via hook', () => {
      expect(nextSundaysSource).toContain("speeches ?? []");
    });
  });

  // --- EC-129-02: Cards were previously expandable ---
  describe('EC-129-02: Cards no longer expandable', () => {
    it('no expanded prop set to true on any SundayCard', () => {
      expect(nextSundaysSource).not.toContain('expanded={');
    });
  });

  // --- EC-129-03: SundayCard onToggle=undefined behavior ---
  describe('EC-129-03: SundayCard without onToggle', () => {
    it('SundayCard onToggle is optional', () => {
      expect(sundayCardSource).toContain('onToggle?:');
    });

    it('header onPress uses onToggle (undefined = no action)', () => {
      expect(sundayCardSource).toContain('onPress={onToggle}');
    });

    it('SundayCard has renderHeaderRight optional prop', () => {
      expect(sundayCardSource).toContain('renderHeaderRight?:');
    });

    it('renderHeaderRight renders when onToggle is undefined', () => {
      expect(sundayCardSource).toContain('!onToggle && renderHeaderRight && renderHeaderRight()');
    });
  });

  // Removed hooks verification
  describe('Removed mutation hooks from NextSundaysSection', () => {
    it('no useAssignSpeaker import', () => {
      expect(nextSundaysSource).not.toContain('useAssignSpeaker');
    });

    it('no useAssignTopic import', () => {
      expect(nextSundaysSource).not.toContain('useAssignTopic');
    });

    it('no useChangeStatus import', () => {
      expect(nextSundaysSource).not.toContain('useChangeStatus');
    });

    it('no useRemoveAssignment import', () => {
      expect(nextSundaysSource).not.toContain('useRemoveAssignment');
    });

    it('no useLazyCreateSpeeches import', () => {
      expect(nextSundaysSource).not.toContain('useLazyCreateSpeeches');
    });

    it('no useSetSundayType import', () => {
      expect(nextSundaysSource).not.toContain('useSetSundayType');
    });

    it('no useRemoveSundayException import', () => {
      expect(nextSundaysSource).not.toContain('useRemoveSundayException');
    });

    it('no useUpdateAgendaByDate import', () => {
      expect(nextSundaysSource).not.toContain('useUpdateAgendaByDate');
    });

    it('no speakerModalSpeechId state', () => {
      expect(nextSundaysSource).not.toContain('speakerModalSpeechId');
    });

    it('no topicModalSpeechId state', () => {
      expect(nextSundaysSource).not.toContain('topicModalSpeechId');
    });
  });
});

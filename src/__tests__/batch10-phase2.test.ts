/**
 * Tests for Batch 10, Phase 2: Topic X Button Positioning, Hymn Search Width,
 *   Auto-scroll Fix, Custom Prayer Name UX
 *
 * F073 (CR-128): Topic X button positioning - outside dropdown field
 * F074 (CR-131): Hymn search field width - match other selector search widths
 * F075 (CR-132): Auto-scroll fix on card expand - remove getItemLayout
 * F076 (CR-133): Custom prayer name UX - hint text and pre-populate
 *
 * Covers acceptance criteria:
 *   AC-073-01..05, AC-074-01..04, AC-075-01..05, AC-076-01..07
 * Covers edge cases:
 *   EC-073-01..03, EC-074-01..02, EC-075-01..05, EC-076-01..04
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
// F073 (CR-128): Topic X button positioning
// =============================================================================

describe('F073 (CR-128): Topic X button positioning - outside dropdown field', () => {
  const getSpeechSlot = () => readSourceFile('components/SpeechSlot.tsx');

  // --- AC-073-01: X button rendered outside topicField Pressable ---
  describe('AC-073-01: X button rendered outside topicField as sibling', () => {
    it('clearTopic Pressable is NOT inside topicField Pressable', () => {
      const content = getSpeechSlot();
      // The topicField Pressable should close before the clearTopic Pressable
      const topicFieldIdx = content.indexOf("accessibilityLabel={t('speeches.selectTopic')}");
      const topicFieldClose = content.indexOf('</Pressable>', topicFieldIdx);
      const clearTopicIdx = content.indexOf('handleClearTopic', topicFieldIdx);
      // clearTopic should appear AFTER the topicField </Pressable> close
      expect(clearTopicIdx).toBeGreaterThan(topicFieldClose);
    });

    it('clearTopic Pressable is inside topicRow View', () => {
      const content = getSpeechSlot();
      // In JSX, styles.topicRow View wraps both topicField and the clearTopic button
      const jsxStart = content.indexOf('return (');
      const jsxContent = content.substring(jsxStart);
      const topicRowIdx = jsxContent.indexOf('styles.topicRow');
      const clearTopicInJsx = jsxContent.indexOf('handleClearTopic');
      const topicRowViewClose = jsxContent.indexOf('</View>', clearTopicInJsx);
      expect(topicRowIdx).toBeGreaterThan(-1);
      // handleClearTopic is between topicRow and its closing View
      expect(clearTopicInJsx).toBeGreaterThan(topicRowIdx);
      expect(clearTopicInJsx).toBeLessThan(topicRowViewClose);
    });
  });

  // --- AC-073-02: Layout uses row container ---
  describe('AC-073-02: Layout uses row container with field and X as siblings', () => {
    it('styles.topicRow has flexDirection row', () => {
      const content = getSpeechSlot();
      const topicRowIdx = content.indexOf('topicRow:');
      const topicRowEnd = content.indexOf('},', topicRowIdx);
      const topicRowStyle = content.substring(topicRowIdx, topicRowEnd);
      expect(topicRowStyle).toContain("flexDirection: 'row'");
    });

    it('styles.topicRow has alignItems center', () => {
      const content = getSpeechSlot();
      const topicRowIdx = content.indexOf('topicRow:');
      const topicRowEnd = content.indexOf('},', topicRowIdx);
      const topicRowStyle = content.substring(topicRowIdx, topicRowEnd);
      expect(topicRowStyle).toContain("alignItems: 'center'");
    });

    it('styles.topicRow has gap 12', () => {
      const content = getSpeechSlot();
      const topicRowIdx = content.indexOf('topicRow:');
      const topicRowEnd = content.indexOf('},', topicRowIdx);
      const topicRowStyle = content.substring(topicRowIdx, topicRowEnd);
      expect(topicRowStyle).toContain('gap: 12');
    });
  });

  // --- AC-073-03: Dropdown arrow stays inside topicField ---
  describe('AC-073-03: Dropdown arrow (U+25BC) remains inside topicField', () => {
    it('arrow U+25BC is inside topicField Pressable (before its close)', () => {
      const content = getSpeechSlot();
      const topicFieldIdx = content.indexOf("accessibilityLabel={t('speeches.selectTopic')}");
      const topicFieldClose = content.indexOf('</Pressable>', topicFieldIdx);
      const arrowInTopic = content.indexOf("'\\u25BC'", topicFieldIdx);
      // Arrow should be before topicField closes
      expect(arrowInTopic).toBeGreaterThan(topicFieldIdx);
      expect(arrowInTopic).toBeLessThan(topicFieldClose);
    });
  });

  // --- AC-073-04: Functionality of clear topic preserved ---
  describe('AC-073-04: handleClearTopic called on X press', () => {
    it('clearTopic Pressable has onPress={handleClearTopic}', () => {
      const content = getSpeechSlot();
      expect(content).toContain('onPress={handleClearTopic}');
    });

    it('handleClearTopic calls onClearTopic with speech.id', () => {
      const content = getSpeechSlot();
      const handlerIdx = content.indexOf('const handleClearTopic');
      const handlerSection = content.substring(handlerIdx, handlerIdx + 150);
      expect(handlerSection).toContain('onClearTopic?.(speech.id)');
    });
  });

  // --- AC-073-05: X visible only when topicDisplay and canAssign ---
  describe('AC-073-05: X visible only when topicDisplay exists AND canAssign', () => {
    it('clearTopic conditional checks topicDisplay && canAssign', () => {
      const content = getSpeechSlot();
      expect(content).toContain('{topicDisplay && canAssign && (');
    });
  });

  // --- EC-073-01: No topic assigned ---
  describe('EC-073-01: No topic - X not rendered', () => {
    it('topicDisplay is null when no topic_title', () => {
      const content = getSpeechSlot();
      expect(content).toContain('const topicDisplay = speech?.topic_title');
      expect(content).toContain(': null');
    });
  });

  // --- EC-073-02: canAssign=false ---
  describe('EC-073-02: canAssign=false - X not rendered', () => {
    it('X button guard includes canAssign check', () => {
      const content = getSpeechSlot();
      // The guard is: topicDisplay && canAssign
      const clearSection = content.substring(
        content.indexOf('{topicDisplay && canAssign'),
        content.indexOf('{topicDisplay && canAssign') + 100
      );
      expect(clearSection).toContain('canAssign');
    });
  });

  // --- EC-073-03: Long topic name truncated ---
  describe('EC-073-03: Long topic name truncated', () => {
    it('topic Text has numberOfLines={1}', () => {
      const content = getSpeechSlot();
      const topicTextIdx = content.indexOf('styles.topicText');
      const topicTextSection = content.substring(topicTextIdx, topicTextIdx + 200);
      expect(topicTextSection).toContain('numberOfLines={1}');
    });
  });

  // --- Styles moved from topicField to topicRow ---
  describe('Internal: Styles moved from topicField to topicRow', () => {
    it('styles.topicField has flex: 1', () => {
      const content = getSpeechSlot();
      const topicFieldIdx = content.indexOf('topicField:');
      const topicFieldEnd = content.indexOf('},', topicFieldIdx);
      const topicFieldStyle = content.substring(topicFieldIdx, topicFieldEnd);
      expect(topicFieldStyle).toContain('flex: 1');
    });

    it('styles.topicField does NOT have marginTop', () => {
      const content = getSpeechSlot();
      const topicFieldIdx = content.indexOf('topicField:');
      const topicFieldEnd = content.indexOf('},', topicFieldIdx);
      const topicFieldStyle = content.substring(topicFieldIdx, topicFieldEnd);
      expect(topicFieldStyle).not.toContain('marginTop');
    });

    it('styles.topicField does NOT have marginLeft', () => {
      const content = getSpeechSlot();
      const topicFieldIdx = content.indexOf('topicField:');
      const topicFieldEnd = content.indexOf('},', topicFieldIdx);
      const topicFieldStyle = content.substring(topicFieldIdx, topicFieldEnd);
      expect(topicFieldStyle).not.toContain('marginLeft');
    });

    it('styles.topicRow has marginTop: 6', () => {
      const content = getSpeechSlot();
      const topicRowIdx = content.indexOf('topicRow:');
      const topicRowEnd = content.indexOf('},', topicRowIdx);
      const topicRowStyle = content.substring(topicRowIdx, topicRowEnd);
      expect(topicRowStyle).toContain('marginTop: 6');
    });

    it('styles.topicRow has marginLeft: 28', () => {
      const content = getSpeechSlot();
      const topicRowIdx = content.indexOf('topicRow:');
      const topicRowEnd = content.indexOf('},', topicRowIdx);
      const topicRowStyle = content.substring(topicRowIdx, topicRowEnd);
      expect(topicRowStyle).toContain('marginLeft: 28');
    });
  });
});

// =============================================================================
// F074 (CR-131): Hymn search field width
// =============================================================================

describe('F074 (CR-131): Hymn search field width - match other selector widths', () => {
  const getAgendaForm = () => readSourceFile('components/AgendaForm.tsx');

  // --- AC-074-01/02/03: searchInput only has flex:1 ---
  describe('AC-074-01/02/03: searchInput contains only flex:1', () => {
    it('styles.searchInput contains flex: 1', () => {
      const content = getAgendaForm();
      const searchInputIdx = content.lastIndexOf('searchInput:');
      const searchInputEnd = content.indexOf('},', searchInputIdx);
      const searchInputStyle = content.substring(searchInputIdx, searchInputEnd);
      expect(searchInputStyle).toContain('flex: 1');
    });

    it('styles.searchInput does NOT contain borderWidth', () => {
      const content = getAgendaForm();
      const searchInputIdx = content.lastIndexOf('searchInput:');
      const searchInputEnd = content.indexOf('},', searchInputIdx);
      const searchInputStyle = content.substring(searchInputIdx, searchInputEnd);
      expect(searchInputStyle).not.toContain('borderWidth');
    });

    it('styles.searchInput does NOT contain borderRadius', () => {
      const content = getAgendaForm();
      const searchInputIdx = content.lastIndexOf('searchInput:');
      const searchInputEnd = content.indexOf('},', searchInputIdx);
      const searchInputStyle = content.substring(searchInputIdx, searchInputEnd);
      expect(searchInputStyle).not.toContain('borderRadius');
    });

    it('styles.searchInput does NOT contain paddingHorizontal', () => {
      const content = getAgendaForm();
      const searchInputIdx = content.lastIndexOf('searchInput:');
      const searchInputEnd = content.indexOf('},', searchInputIdx);
      const searchInputStyle = content.substring(searchInputIdx, searchInputEnd);
      expect(searchInputStyle).not.toContain('paddingHorizontal');
    });

    it('styles.searchInput does NOT contain paddingVertical', () => {
      const content = getAgendaForm();
      const searchInputIdx = content.lastIndexOf('searchInput:');
      const searchInputEnd = content.indexOf('},', searchInputIdx);
      const searchInputStyle = content.substring(searchInputIdx, searchInputEnd);
      expect(searchInputStyle).not.toContain('paddingVertical');
    });

    it('styles.searchInput does NOT contain fontSize', () => {
      const content = getAgendaForm();
      const searchInputIdx = content.lastIndexOf('searchInput:');
      const searchInputEnd = content.indexOf('},', searchInputIdx);
      const searchInputStyle = content.substring(searchInputIdx, searchInputEnd);
      expect(searchInputStyle).not.toContain('fontSize');
    });

    it('styles.searchInput does NOT contain marginBottom', () => {
      const content = getAgendaForm();
      const searchInputIdx = content.lastIndexOf('searchInput:');
      const searchInputEnd = content.indexOf('},', searchInputIdx);
      const searchInputStyle = content.substring(searchInputIdx, searchInputEnd);
      expect(searchInputStyle).not.toContain('marginBottom');
    });
  });

  // --- AC-074-04: Hymn search functionality preserved ---
  describe('AC-074-04: Hymn search functionality preserved', () => {
    it('HymnSelectorModal uses SearchInput component', () => {
      const content = getAgendaForm();
      expect(content).toContain('<SearchInput');
      expect(content).toContain('style={styles.searchInput}');
    });

    it('HymnSelectorModal uses filterHymns for search', () => {
      const content = getAgendaForm();
      expect(content).toContain('filterHymns(hymns, search)');
    });
  });

  // --- EC-074-01: SearchInput base already defines placeholder styles ---
  describe('EC-074-01: SearchInput base defines placeholder handling', () => {
    it('SearchInput.tsx has placeholder prop', () => {
      const content = readSourceFile('components/SearchInput.tsx');
      expect(content).toContain('placeholder');
    });
  });

  // --- EC-074-02: Text truncation handled by SearchInput ---
  describe('EC-074-02: Text input handles long text via SearchInput', () => {
    it('SearchInput uses TextInput internally', () => {
      const content = readSourceFile('components/SearchInput.tsx');
      expect(content).toContain('TextInput');
    });
  });
});

// =============================================================================
// F075 (CR-132): Auto-scroll fix - speeches.tsx
// =============================================================================

describe('F075 (CR-132): Auto-scroll fix in speeches.tsx', () => {
  const getSpeeches = () => readSourceFile('app/(tabs)/speeches.tsx');

  // --- AC-075-02: getItemLayout removed ---
  describe('AC-075-02: getItemLayout removed from speeches.tsx', () => {
    it('speeches.tsx does NOT define getItemLayout callback', () => {
      const content = getSpeeches();
      expect(content).not.toContain('const getItemLayout');
    });

    it('FlatList does NOT receive getItemLayout prop', () => {
      const content = getSpeeches();
      expect(content).not.toContain('getItemLayout={');
    });
  });

  // --- AC-075-03: Scroll with variable height cards ---
  describe('AC-075-03: FlatList measures real heights', () => {
    it('FlatList uses scrollToIndex (works with measured heights)', () => {
      const content = getSpeeches();
      expect(content).toContain('scrollToIndex');
    });
  });

  // --- AC-075-04: Collapse does not auto-scroll ---
  describe('AC-075-04: Collapse does not auto-scroll', () => {
    it('scrollToIndex only called in expand branch (expandedDate !== date)', () => {
      const content = getSpeeches();
      const handleToggle = content.substring(
        content.indexOf('const handleToggle'),
        content.indexOf('[expandedDate, lazyCreate')
      );
      // scrollToIndex should be in the else branch (expand), not in the if branch (collapse)
      const collapseIdx = handleToggle.indexOf('setExpandedDate(null)');
      const scrollIdx = handleToggle.indexOf('scrollToIndex');
      expect(scrollIdx).toBeGreaterThan(collapseIdx);
    });
  });

  // --- AC-075-05: Initial scroll preserved ---
  describe('AC-075-05: Initial scroll via useEffect preserved', () => {
    it('speeches.tsx has useEffect for initial scroll', () => {
      const content = getSpeeches();
      expect(content).toContain('setInitialScrollDone(true)');
    });

    it('initial scroll uses animated: false', () => {
      const content = getSpeeches();
      const initialScrollIdx = content.indexOf('setInitialScrollDone(true)');
      const scrollSection = content.substring(initialScrollIdx - 200, initialScrollIdx);
      expect(scrollSection).toContain('animated: false');
    });
  });

  // --- Timeout 400ms ---
  describe('Internal: setTimeout uses 400ms', () => {
    it('handleToggle uses 400ms timeout', () => {
      const content = getSpeeches();
      const handleToggle = content.substring(
        content.indexOf('const handleToggle'),
        content.indexOf('[expandedDate, lazyCreate')
      );
      expect(handleToggle).toContain('}, 400)');
    });
  });

  // --- EC-075-04: onScrollToIndexFailed preserved ---
  describe('EC-075-04: onScrollToIndexFailed fallback preserved', () => {
    it('FlatList has onScrollToIndexFailed callback', () => {
      const content = getSpeeches();
      expect(content).toContain('onScrollToIndexFailed');
    });
  });
});

// =============================================================================
// F075 (CR-132): Auto-scroll fix - agenda.tsx
// =============================================================================

describe('F075 (CR-132): Auto-scroll fix in agenda.tsx', () => {
  const getAgenda = () => readSourceFile('app/(tabs)/agenda.tsx');

  // --- AC-075-01: getItemLayout and ESTIMATED_ITEM_HEIGHT removed ---
  describe('AC-075-01: getItemLayout and ESTIMATED_ITEM_HEIGHT removed', () => {
    it('agenda.tsx does NOT define ESTIMATED_ITEM_HEIGHT', () => {
      const content = getAgenda();
      expect(content).not.toContain('ESTIMATED_ITEM_HEIGHT');
    });

    it('agenda.tsx does NOT define getItemLayout callback', () => {
      const content = getAgenda();
      expect(content).not.toContain('const getItemLayout');
    });

    it('FlatList does NOT receive getItemLayout prop', () => {
      const content = getAgenda();
      expect(content).not.toContain('getItemLayout={');
    });
  });

  // --- initialScrollIndex removed ---
  describe('Internal: initialScrollIndex removed from FlatList', () => {
    it('FlatList does NOT receive initialScrollIndex prop', () => {
      const content = getAgenda();
      expect(content).not.toContain('initialScrollIndex={');
    });
  });

  // --- AC-075-05: Initial scroll via useEffect preserved ---
  describe('AC-075-05: Initial scroll via useEffect preserved', () => {
    it('agenda.tsx has useEffect for initial scroll', () => {
      const content = getAgenda();
      expect(content).toContain('hasScrolled.current = true');
    });

    it('initial scroll uses animated: false', () => {
      const content = getAgenda();
      const initialScrollIdx = content.indexOf('hasScrolled.current = true');
      const scrollSection = content.substring(initialScrollIdx, initialScrollIdx + 200);
      expect(scrollSection).toContain('animated: false');
    });
  });

  // --- Timeout 400ms ---
  describe('Internal: setTimeout uses 400ms', () => {
    it('handleToggle uses 400ms timeout', () => {
      const content = getAgenda();
      const handleToggle = content.substring(
        content.indexOf('const handleToggle'),
        content.indexOf('[expandedDate, lazyCreate, listItems]')
      );
      expect(handleToggle).toContain('}, 400)');
    });
  });

  // --- EC-075-04: onScrollToIndexFailed preserved ---
  describe('EC-075-04: onScrollToIndexFailed fallback preserved', () => {
    it('agenda.tsx has onScrollToIndexFailed callback', () => {
      const content = getAgenda();
      expect(content).toContain('onScrollToIndexFailed');
    });
  });

  // --- AC-075-04: Collapse does not auto-scroll ---
  describe('AC-075-04: Collapse does not auto-scroll', () => {
    it('scrollToIndex only called in else branch (expand)', () => {
      const content = getAgenda();
      const handleToggle = content.substring(
        content.indexOf('const handleToggle'),
        content.indexOf('[expandedDate, lazyCreate, listItems]')
      );
      const collapseIdx = handleToggle.indexOf('setExpandedDate(null)');
      const scrollIdx = handleToggle.indexOf('scrollToIndex');
      expect(scrollIdx).toBeGreaterThan(collapseIdx);
    });
  });
});

// =============================================================================
// F076 (CR-133): Custom prayer name UX - hint text
// =============================================================================

describe('F076 (CR-133): Custom prayer name hint text', () => {
  const getPrayerSelector = () => readSourceFile('components/PrayerSelector.tsx');

  // --- AC-076-01: Hint visible on open ---
  describe('AC-076-01: Hint visible when PrayerSelector opens', () => {
    it('PrayerSelector renders customNameHintText', () => {
      const content = getPrayerSelector();
      expect(content).toContain('styles.customNameHintText');
    });

    it('hint uses t(agenda.customNameHint) for text', () => {
      const content = getPrayerSelector();
      expect(content).toContain("t('agenda.customNameHint')");
    });

    it('hint uses colors.textSecondary', () => {
      const content = getPrayerSelector();
      const hintIdx = content.indexOf('customNameHintText');
      const hintSection = content.substring(hintIdx, hintIdx + 100);
      expect(hintSection).toContain('colors.textSecondary');
    });
  });

  // --- AC-076-02: Hint visible after typing ---
  describe('AC-076-02: Hint remains visible after typing text', () => {
    it('hint is NOT inside a conditional block (always visible)', () => {
      const content = getPrayerSelector();
      // The hint should appear between modalHeader and the conditional customNameButton
      const hintIdx = content.indexOf('customNameHintText');
      const conditionalIdx = content.indexOf("{customName.trim().length > 0 &&");
      // hint appears before the conditional customNameButton
      expect(hintIdx).toBeLessThan(conditionalIdx);
      // Verify it's not wrapped in a condition itself
      const preHint = content.substring(hintIdx - 50, hintIdx);
      expect(preHint).not.toContain('search.length');
      expect(preHint).not.toContain('customName.length');
    });
  });

  // --- AC-076-07: Translations in 3 locales ---
  // NOTE: F078 (CR-135) changed the hint text
  describe('AC-076-07: Hint translated in 3 locales', () => {
    it('pt-BR has agenda.customNameHint key', () => {
      const locale = readLocale('pt-BR') as { agenda: Record<string, string> };
      expect(locale.agenda.customNameHint).toBe('Para escolher um não membro, digite o nome da pessoa e adicione como nome personalizado');
    });

    it('en has agenda.customNameHint key', () => {
      const locale = readLocale('en') as { agenda: Record<string, string> };
      expect(locale.agenda.customNameHint).toBe("To choose a non-member, type the person's name and add as a custom name");
    });

    it('es has agenda.customNameHint key', () => {
      const locale = readLocale('es') as { agenda: Record<string, string> };
      expect(locale.agenda.customNameHint).toBe('Para elegir un no miembro, escriba el nombre de la persona y agregue como nombre personalizado');
    });
  });

  // --- Hint style ---
  describe('Internal: customNameHintText style', () => {
    it('customNameHintText has fontSize 13', () => {
      const content = getPrayerSelector();
      const styleIdx = content.indexOf('customNameHintText:');
      const styleEnd = content.indexOf('},', styleIdx);
      const style = content.substring(styleIdx, styleEnd);
      expect(style).toContain('fontSize: 13');
    });

    it('customNameHintText has paddingHorizontal 16', () => {
      const content = getPrayerSelector();
      const styleIdx = content.indexOf('customNameHintText:');
      const styleEnd = content.indexOf('},', styleIdx);
      const style = content.substring(styleIdx, styleEnd);
      expect(style).toContain('paddingHorizontal: 16');
    });

    it('customNameHintText has paddingBottom 8', () => {
      const content = getPrayerSelector();
      const styleIdx = content.indexOf('customNameHintText:');
      const styleEnd = content.indexOf('},', styleIdx);
      const style = content.substring(styleIdx, styleEnd);
      expect(style).toContain('paddingBottom: 8');
    });
  });
});

// =============================================================================
// F076 (CR-133): Custom prayer name UX - pre-populate
// =============================================================================

describe('F076 (CR-133): Custom prayer name pre-populate on re-edit', () => {
  const getPrayerSelector = () => readSourceFile('components/PrayerSelector.tsx');

  // --- AC-076-03: Pre-populate when selected.memberId === null ---
  describe('AC-076-03: Pre-populate when re-editing custom name', () => {
    it('useEffect checks selected?.memberId === null', () => {
      const content = getPrayerSelector();
      expect(content).toContain('selected?.memberId === null');
    });

    it('useEffect calls setSearch(selected.name)', () => {
      const content = getPrayerSelector();
      const effectIdx = content.indexOf('selected?.memberId === null');
      const effectSection = content.substring(effectIdx, effectIdx + 200);
      expect(effectSection).toContain('setSearch(selected.name)');
    });

    it('useEffect calls setCustomName(selected.name)', () => {
      const content = getPrayerSelector();
      const effectIdx = content.indexOf('selected?.memberId === null');
      const effectSection = content.substring(effectIdx, effectIdx + 200);
      expect(effectSection).toContain('setCustomName(selected.name)');
    });
  });

  // --- AC-076-04: customNameButton visible immediately ---
  describe('AC-076-04: customNameButton visible when pre-populated', () => {
    it('customNameButton shown when customName.trim().length > 0', () => {
      const content = getPrayerSelector();
      expect(content).toContain('{customName.trim().length > 0 &&');
    });
  });

  // --- AC-076-05: Member selection still works ---
  describe('AC-076-05: Member selection from list still works', () => {
    it('handleSelectMember calls onSelect with memberId', () => {
      const content = getPrayerSelector();
      expect(content).toContain('onSelect({ memberId: member.id, name: member.full_name })');
    });

    it('handleSelectMember resets search and customName', () => {
      const content = getPrayerSelector();
      const handler = content.substring(
        content.indexOf('const handleSelectMember'),
        content.indexOf('[onSelect, onClose]')
      );
      expect(handler).toContain("setSearch('')");
      expect(handler).toContain("setCustomName('')");
    });
  });

  // --- AC-076-06: Custom name saved with memberId null ---
  describe('AC-076-06: Custom name saved with memberId null', () => {
    it('handleCustomName calls onSelect with memberId: null', () => {
      const content = getPrayerSelector();
      expect(content).toContain('onSelect({ memberId: null, name: trimmed })');
    });

    it('handleCustomName trims the name', () => {
      const content = getPrayerSelector();
      const handler = content.substring(
        content.indexOf('const handleCustomName'),
        content.indexOf(', [customName, onSelect')
      );
      expect(handler).toContain('const trimmed = customName.trim()');
    });
  });

  // --- EC-076-01: Spaces trimmed ---
  describe('EC-076-01: Custom name with spaces trimmed', () => {
    it('handleCustomName uses trim() before saving', () => {
      const content = getPrayerSelector();
      expect(content).toContain('customName.trim()');
    });
  });

  // --- EC-076-02: Empty custom name not saved ---
  describe('EC-076-02: Empty custom name (only spaces) not saved', () => {
    it('handleCustomName returns early if trimmed is empty', () => {
      const content = getPrayerSelector();
      const handler = content.substring(
        content.indexOf('const handleCustomName'),
        content.indexOf('memberId: null')
      );
      expect(handler).toContain('if (!trimmed) return');
    });
  });

  // --- EC-076-03: Switch from custom to member ---
  describe('EC-076-03: Switch from custom name to member selection', () => {
    it('handleSelectMember sets memberId to member.id (not null)', () => {
      const content = getPrayerSelector();
      expect(content).toContain('memberId: member.id');
    });
  });

  // --- EC-076-04: Open with member (not custom) -> empty field ---
  describe('EC-076-04: Open with member selected -> field starts empty', () => {
    it('useEffect only pre-populates when memberId === null', () => {
      const content = getPrayerSelector();
      // Find the useEffect that handles visible
      const effectIdx = content.indexOf('if (visible) {');
      const effectEnd = content.indexOf('}, [visible])');
      const effect = content.substring(effectIdx, effectEnd);
      // Pre-populate only when memberId === null
      expect(effect).toContain('selected?.memberId === null');
      // No else branch that sets search for non-null memberId
      expect(effect).not.toContain('else');
    });
  });

  // --- useEffect dependency array ---
  describe('Internal: useEffect reacts only to visible', () => {
    it('useEffect dependency array is [visible]', () => {
      const content = getPrayerSelector();
      const effectIdx = content.indexOf('selected?.memberId === null');
      const afterEffect = content.substring(effectIdx, effectIdx + 400);
      expect(afterEffect).toContain('}, [visible])');
    });

    it('useEffect has eslint-disable for exhaustive-deps', () => {
      const content = getPrayerSelector();
      expect(content).toContain('eslint-disable-next-line react-hooks/exhaustive-deps');
    });
  });
});

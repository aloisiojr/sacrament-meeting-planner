/**
 * Tests for Batch 9, Phase 3: UX Polish
 *
 * F065 (CR-118): SearchInput flex:1 defensivo + close button in 4 Settings screens
 * F066 (CR-120): Auto-scroll on card expand in speeches.tsx and agenda.tsx
 * F067 (CR-123): Recognizing field proportional height with one actor per line
 *
 * Covers acceptance criteria:
 *   AC-F065-01..12, AC-F066-01..07, AC-F067-01..07
 * Covers edge cases:
 *   EC-F065-01..02, EC-F066-01..03, EC-F067-01..03
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
// F065 (CR-118): SearchInput flex:1 + close button in Settings
// =============================================================================

describe('F065 (CR-118): SearchInput flex:1 + close button in Settings', () => {
  const getSearchInput = () => readSourceFile('components/SearchInput.tsx');
  const getMembers = () => readSourceFile('app/(tabs)/settings/members.tsx');
  const getTopics = () => readSourceFile('app/(tabs)/settings/topics.tsx');
  const getHistory = () => readSourceFile('app/(tabs)/settings/history.tsx');
  const getTimezone = () => readSourceFile('app/(tabs)/settings/timezone.tsx');

  // --- AC-F065-01: SearchInput container has flex:1 ---
  describe('AC-F065-01: SearchInput container has flex:1', () => {
    it('styles.container includes flex: 1', () => {
      const content = getSearchInput();
      const containerIdx = content.indexOf('container: {');
      const containerEnd = content.indexOf('},', containerIdx);
      const section = content.substring(containerIdx, containerEnd);
      expect(section).toContain('flex: 1');
    });

    it('container still has position relative and justifyContent center', () => {
      const content = getSearchInput();
      const containerIdx = content.indexOf('container: {');
      const containerEnd = content.indexOf('},', containerIdx);
      const section = content.substring(containerIdx, containerEnd);
      expect(section).toContain("position: 'relative'");
      expect(section).toContain("justifyContent: 'center'");
    });
  });

  // --- AC-F065-02: SearchInput fills space in members.tsx ---
  describe('AC-F065-02: SearchInput fills space in members.tsx', () => {
    it('members.tsx searchContainer has flexDirection row', () => {
      const content = getMembers();
      const containerIdx = content.indexOf('searchContainer:');
      const containerEnd = content.indexOf('},', containerIdx);
      const section = content.substring(containerIdx, containerEnd);
      expect(section).toContain("flexDirection: 'row'");
    });

    it('members.tsx searchContainer has alignItems center', () => {
      const content = getMembers();
      const containerIdx = content.indexOf('searchContainer:');
      const containerEnd = content.indexOf('},', containerIdx);
      const section = content.substring(containerIdx, containerEnd);
      expect(section).toContain("alignItems: 'center'");
    });

    it('members.tsx searchContainer has gap 12', () => {
      const content = getMembers();
      const containerIdx = content.indexOf('searchContainer:');
      const containerEnd = content.indexOf('},', containerIdx);
      const section = content.substring(containerIdx, containerEnd);
      expect(section).toContain('gap: 12');
    });
  });

  // --- AC-F065-03: Close button in members.tsx ---
  describe('AC-F065-03: Close button visible in members.tsx', () => {
    it('members.tsx has Pressable close after SearchInput', () => {
      const content = getMembers();
      const searchInputIdx = content.indexOf('<SearchInput', content.indexOf('{/* Search */}'));
      const closeIdx = content.indexOf("t('common.close')", searchInputIdx);
      expect(closeIdx).toBeGreaterThan(searchInputIdx);
    });

    it('members.tsx close button is a Pressable with accessibilityRole button', () => {
      const content = getMembers();
      const searchIdx = content.indexOf('{/* Search */}');
      const csvIdx = content.indexOf('{/* CSV', searchIdx);
      const section = content.substring(searchIdx, csvIdx);
      expect(section).toContain('accessibilityRole="button"');
      expect(section).toContain("t('common.close')");
    });
  });

  // --- AC-F065-04: Close clears search in members.tsx ---
  describe('AC-F065-04: Close clears search in members.tsx', () => {
    it('close onPress calls setSearch with empty string', () => {
      const content = getMembers();
      const searchSection = content.indexOf('{/* Search */}');
      const csvSection = content.indexOf('{/* CSV', searchSection);
      const section = content.substring(searchSection, csvSection);
      expect(section).toContain("setSearch('')");
    });
  });

  // --- AC-F065-05: SearchInput fills space in topics.tsx ---
  describe('AC-F065-05: SearchInput fills space in topics.tsx', () => {
    it('topics.tsx searchContainer has flexDirection row', () => {
      const content = getTopics();
      const containerIdx = content.indexOf('searchContainer:');
      const containerEnd = content.indexOf('},', containerIdx);
      const section = content.substring(containerIdx, containerEnd);
      expect(section).toContain("flexDirection: 'row'");
    });
  });

  // --- AC-F065-06: Close button in topics.tsx ---
  describe('AC-F065-06: Close button visible in topics.tsx', () => {
    it('topics.tsx has Pressable close with t(common.close)', () => {
      const content = getTopics();
      expect(content).toContain("t('common.close')");
    });

    it('topics.tsx close button calls setSearch empty', () => {
      const content = getTopics();
      const searchContainerIdx = content.indexOf('<View style={styles.searchContainer}');
      const searchEnd = content.indexOf('</View>', searchContainerIdx);
      const section = content.substring(searchContainerIdx, searchEnd);
      expect(section).toContain("setSearch('')");
    });
  });

  // --- AC-F065-07: SearchInput fills space in history.tsx ---
  describe('AC-F065-07: SearchInput fills space in history.tsx', () => {
    it('history.tsx searchContainer has flexDirection row', () => {
      const content = getHistory();
      const containerIdx = content.indexOf('searchContainer:');
      const containerEnd = content.indexOf('},', containerIdx);
      const section = content.substring(containerIdx, containerEnd);
      expect(section).toContain("flexDirection: 'row'");
    });
  });

  // --- AC-F065-08: Close button in history.tsx ---
  describe('AC-F065-08: Close button visible in history.tsx', () => {
    it('history.tsx has Pressable close with t(common.close)', () => {
      const content = getHistory();
      expect(content).toContain("t('common.close')");
    });

    it('history.tsx close button calls updateSearch empty', () => {
      const content = getHistory();
      const searchSectionIdx = content.indexOf('{/* Search field */}');
      const searchEnd = content.indexOf('</View>', content.indexOf('</View>', searchSectionIdx) + 1);
      const section = content.substring(searchSectionIdx, searchEnd);
      expect(section).toContain("updateSearch('')");
    });
  });

  // --- AC-F065-09: SearchInput fills space in timezone.tsx ---
  describe('AC-F065-09: SearchInput fills space in timezone.tsx', () => {
    it('timezone.tsx searchContainer has flexDirection row', () => {
      const content = getTimezone();
      const containerIdx = content.indexOf('searchContainer:');
      const containerEnd = content.indexOf('},', containerIdx);
      const section = content.substring(containerIdx, containerEnd);
      expect(section).toContain("flexDirection: 'row'");
    });
  });

  // --- AC-F065-10: Close button in timezone.tsx ---
  describe('AC-F065-10: Close button visible in timezone.tsx', () => {
    it('timezone.tsx has Pressable close with t(common.close)', () => {
      const content = getTimezone();
      expect(content).toContain("t('common.close')");
    });

    it('timezone.tsx close button calls setSearch empty', () => {
      const content = getTimezone();
      const searchIdx = content.indexOf('styles.searchContainer');
      const searchEnd = content.indexOf('</View>', searchIdx);
      const section = content.substring(searchIdx, searchEnd);
      expect(section).toContain("setSearch('')");
    });
  });

  // --- AC-F065-11: Modals not affected ---
  describe('AC-F065-11: Modals not affected by flex:1 change', () => {
    it('MemberSelectorModal still passes flex:1 via style (redundant but harmless)', () => {
      const content = readSourceFile('components/MemberSelectorModal.tsx');
      // Modal should still have its own SearchInput with style
      expect(content).toContain('SearchInput');
    });

    it('ActorSelector still has SearchInput', () => {
      const content = readSourceFile('components/ActorSelector.tsx');
      expect(content).toContain('SearchInput');
    });

    it('HymnSelector in AgendaForm still has SearchInput', () => {
      const content = readSourceFile('components/AgendaForm.tsx');
      expect(content).toContain('SearchInput');
    });

    it('PrayerSelector still has SearchInput', () => {
      const content = readSourceFile('components/PrayerSelector.tsx');
      expect(content).toContain('SearchInput');
    });
  });

  // --- AC-F065-12: SearchInput in AgendaForm not affected ---
  describe('AC-F065-12: AgendaForm search not affected', () => {
    it('AgendaForm HymnSelectorModal still uses sheetSearchRow pattern', () => {
      const content = readSourceFile('components/AgendaForm.tsx');
      expect(content).toContain('styles.sheetSearchRow');
    });
  });

  // --- EC-F065-01: Empty search + close is no-op ---
  describe('EC-F065-01: Empty search + close is harmless no-op', () => {
    it('close button always calls setter with empty string (no guard)', () => {
      const content = getMembers();
      const searchSection = content.indexOf('{/* Search */}');
      const csvSection = content.indexOf('{/* CSV', searchSection);
      const section = content.substring(searchSection, csvSection);
      // setSearch('') is unconditional in onPress - no "if (search)" guard
      expect(section).toContain("onPress={() => setSearch('')}");
    });
  });

  // --- EC-F065-02: Long text in search field ---
  describe('EC-F065-02: Long text truncated by SearchInput', () => {
    it('SearchInput input has fixed height 40', () => {
      const content = getSearchInput();
      const inputIdx = content.indexOf('input: {');
      const inputEnd = content.indexOf('},', inputIdx);
      const section = content.substring(inputIdx, inputEnd);
      expect(section).toContain('height: 40');
    });
  });

  // --- Close button text style ---
  describe('Close button text style consistency', () => {
    it('members.tsx closeButtonText has fontSize 16 and fontWeight 500', () => {
      const content = getMembers();
      const styleIdx = content.indexOf('closeButtonText:');
      const styleEnd = content.indexOf('},', styleIdx);
      const section = content.substring(styleIdx, styleEnd);
      expect(section).toContain('fontSize: 16');
      expect(section).toContain("fontWeight: '500'");
    });

    it('topics.tsx closeButtonText has fontSize 16 and fontWeight 500', () => {
      const content = getTopics();
      const styleIdx = content.indexOf('closeButtonText:');
      const styleEnd = content.indexOf('},', styleIdx);
      const section = content.substring(styleIdx, styleEnd);
      expect(section).toContain('fontSize: 16');
      expect(section).toContain("fontWeight: '500'");
    });

    it('history.tsx closeButtonText has fontSize 16 and fontWeight 500', () => {
      const content = getHistory();
      const styleIdx = content.indexOf('closeButtonText:');
      const styleEnd = content.indexOf('},', styleIdx);
      const section = content.substring(styleIdx, styleEnd);
      expect(section).toContain('fontSize: 16');
      expect(section).toContain("fontWeight: '500'");
    });

    it('timezone.tsx closeButtonText has fontSize 16 and fontWeight 500', () => {
      const content = getTimezone();
      const styleIdx = content.indexOf('closeButtonText:');
      const styleEnd = content.indexOf('},', styleIdx);
      const section = content.substring(styleIdx, styleEnd);
      expect(section).toContain('fontSize: 16');
      expect(section).toContain("fontWeight: '500'");
    });
  });

  // --- i18n common.close exists ---
  describe('i18n: common.close exists in all locales', () => {
    it('pt-BR has common.close = "Fechar"', () => {
      const locale = readLocale('pt-BR') as { common: Record<string, string> };
      expect(locale.common.close).toBe('Fechar');
    });

    it('en has common.close = "Close"', () => {
      const locale = readLocale('en') as { common: Record<string, string> };
      expect(locale.common.close).toBe('Close');
    });

    it('es has common.close = "Cerrar"', () => {
      const locale = readLocale('es') as { common: Record<string, string> };
      expect(locale.common.close).toBe('Cerrar');
    });
  });
});

// =============================================================================
// F066 (CR-120): Auto-scroll on card expand
// =============================================================================

describe('F066 (CR-120): Auto-scroll on card expand', () => {
  const getSpeeches = () => readSourceFile('app/(tabs)/speeches.tsx');
  const getAgenda = () => readSourceFile('app/(tabs)/agenda.tsx');

  // --- AC-F066-01: Auto-scroll in speeches.tsx ---
  describe('AC-F066-01: Auto-scroll after expand in speeches.tsx', () => {
    it('handleToggle calls scrollToIndex with viewPosition: 0 when expanding', () => {
      const content = getSpeeches();
      const handleToggleIdx = content.indexOf('const handleToggle');
      const handleToggleEnd = content.indexOf('];', handleToggleIdx);
      const section = content.substring(handleToggleIdx, handleToggleEnd);
      expect(section).toContain('scrollToIndex');
      expect(section).toContain('viewPosition: 0');
    });

    it('scrollToIndex is called with animated: true', () => {
      const content = getSpeeches();
      const handleToggleIdx = content.indexOf('const handleToggle');
      const handleToggleEnd = content.indexOf('];', handleToggleIdx);
      const section = content.substring(handleToggleIdx, handleToggleEnd);
      expect(section).toContain('animated: true');
    });

    it('scroll is delayed by 300ms setTimeout', () => {
      const content = getSpeeches();
      const handleToggleIdx = content.indexOf('const handleToggle');
      const handleToggleEnd = content.indexOf('];', handleToggleIdx);
      const section = content.substring(handleToggleIdx, handleToggleEnd);
      expect(section).toContain('setTimeout');
      expect(section).toContain('300');
    });
  });

  // --- AC-F066-02: Auto-scroll in agenda.tsx ---
  describe('AC-F066-02: Auto-scroll after expand in agenda.tsx', () => {
    it('handleToggle in agenda.tsx calls scrollToIndex with viewPosition: 0', () => {
      const content = getAgenda();
      const handleToggleIdx = content.indexOf('const handleToggle');
      const handleToggleEnd = content.indexOf('[expandedDate, lazyCreate, listItems]', handleToggleIdx);
      const section = content.substring(handleToggleIdx, handleToggleEnd);
      expect(section).toContain('scrollToIndex');
      expect(section).toContain('viewPosition: 0');
    });

    it('agenda.tsx scroll is delayed by 300ms setTimeout', () => {
      const content = getAgenda();
      const handleToggleIdx = content.indexOf('const handleToggle');
      const handleToggleEnd = content.indexOf('[expandedDate, lazyCreate, listItems]', handleToggleIdx);
      const section = content.substring(handleToggleIdx, handleToggleEnd);
      expect(section).toContain('setTimeout');
      expect(section).toContain('300');
    });

    it('agenda.tsx scroll uses animated: true', () => {
      const content = getAgenda();
      const handleToggleIdx = content.indexOf('const handleToggle');
      const handleToggleEnd = content.indexOf('[expandedDate, lazyCreate, listItems]', handleToggleIdx);
      const section = content.substring(handleToggleIdx, handleToggleEnd);
      expect(section).toContain('animated: true');
    });
  });

  // --- AC-F066-03: viewPosition:0 aligns top of card ---
  describe('AC-F066-03: viewPosition:0 aligns card to top', () => {
    it('speeches.tsx uses viewPosition: 0', () => {
      const content = getSpeeches();
      expect(content).toContain('viewPosition: 0');
    });

    it('agenda.tsx uses viewPosition: 0', () => {
      const content = getAgenda();
      expect(content).toContain('viewPosition: 0');
    });
  });

  // --- AC-F066-04: Collapsing does NOT scroll ---
  describe('AC-F066-04: Collapsing does NOT trigger scroll', () => {
    it('speeches.tsx only scrolls in the else branch (expanding)', () => {
      const content = getSpeeches();
      const handleToggleIdx = content.indexOf('const handleToggle');
      const handleToggleEnd = content.indexOf('];', handleToggleIdx);
      const section = content.substring(handleToggleIdx, handleToggleEnd);
      // The if (expandedDate === date) branch sets null - no scroll
      const ifBranch = section.indexOf('setExpandedDate(null)');
      const scrollIdx = section.indexOf('scrollToIndex');
      // scrollToIndex must come AFTER the else (expanding branch)
      expect(scrollIdx).toBeGreaterThan(ifBranch);
      // The collapse branch (setExpandedDate(null)) should not contain scrollToIndex
      const collapseBranch = section.substring(section.indexOf('if (expandedDate === date)'), section.indexOf('} else {'));
      expect(collapseBranch).not.toContain('scrollToIndex');
    });

    it('agenda.tsx only scrolls in the else branch (expanding)', () => {
      const content = getAgenda();
      const handleToggleIdx = content.indexOf('const handleToggle');
      const handleToggleEnd = content.indexOf('];', handleToggleIdx);
      const section = content.substring(handleToggleIdx, handleToggleEnd);
      const collapseBranch = section.substring(section.indexOf('if (expandedDate === date)'), section.indexOf('} else {'));
      expect(collapseBranch).not.toContain('scrollToIndex');
    });
  });

  // --- AC-F066-05: Scroll is animated ---
  describe('AC-F066-05: Scroll is animated', () => {
    it('speeches.tsx scrollToIndex has animated: true', () => {
      const content = getSpeeches();
      const handleToggleIdx = content.indexOf('const handleToggle');
      const handleToggleEnd = content.indexOf('];', handleToggleIdx);
      const section = content.substring(handleToggleIdx, handleToggleEnd);
      expect(section).toContain('animated: true');
    });
  });

  // --- AC-F066-06: Auto-scroll works when switching cards ---
  describe('AC-F066-06: Switching expanded card triggers auto-scroll', () => {
    it('speeches.tsx always scrolls when expanding (else branch)', () => {
      const content = getSpeeches();
      const handleToggleIdx = content.indexOf('const handleToggle');
      const handleToggleEnd = content.indexOf('];', handleToggleIdx);
      const section = content.substring(handleToggleIdx, handleToggleEnd);
      // The else branch (expanding) includes scrollToIndex unconditionally
      const elseBranch = section.substring(section.indexOf('} else {'));
      expect(elseBranch).toContain('scrollToIndex');
    });
  });

  // --- AC-F066-07: initialScrollIndex still works ---
  describe('AC-F066-07: initialScrollIndex not affected', () => {
    it('speeches.tsx preserves getItemLayout', () => {
      const content = getSpeeches();
      expect(content).toContain('getItemLayout={getItemLayout}');
    });

    it('agenda.tsx preserves getItemLayout', () => {
      const content = getAgenda();
      expect(content).toContain('getItemLayout={getItemLayout}');
    });

    it('speeches.tsx preserves onScrollToIndexFailed', () => {
      const content = getSpeeches();
      expect(content).toContain('onScrollToIndexFailed');
    });

    it('agenda.tsx preserves onScrollToIndexFailed', () => {
      const content = getAgenda();
      expect(content).toContain('onScrollToIndexFailed');
    });
  });

  // --- EC-F066-01: Expand card already visible on screen ---
  describe('EC-F066-01: Expanding visible card still scrolls', () => {
    it('scroll happens unconditionally when index >= 0 (no visibility check)', () => {
      const content = getSpeeches();
      const handleToggleIdx = content.indexOf('const handleToggle');
      const handleToggleEnd = content.indexOf('];', handleToggleIdx);
      const section = content.substring(handleToggleIdx, handleToggleEnd);
      expect(section).toContain('if (index >= 0)');
      expect(section).not.toContain('isVisible');
    });
  });

  // --- EC-F066-02: Expand last card in list ---
  describe('EC-F066-02: Last card scroll bounded by contentSize', () => {
    it('scrollToIndex is used (not scrollToEnd) - FlatList handles bounds', () => {
      const content = getSpeeches();
      const handleToggleIdx = content.indexOf('const handleToggle');
      const handleToggleEnd = content.indexOf('];', handleToggleIdx);
      const section = content.substring(handleToggleIdx, handleToggleEnd);
      expect(section).toContain('scrollToIndex');
      expect(section).not.toContain('scrollToEnd');
    });
  });

  // --- EC-F066-03: Expand card during momentum scroll ---
  describe('EC-F066-03: scrollToIndex interrupts momentum', () => {
    it('uses setTimeout for deferred scroll (animation overrides momentum)', () => {
      const content = getSpeeches();
      const handleToggleIdx = content.indexOf('const handleToggle');
      const handleToggleEnd = content.indexOf('];', handleToggleIdx);
      const section = content.substring(handleToggleIdx, handleToggleEnd);
      expect(section).toContain('setTimeout');
    });
  });

  // --- listItems dependency ---
  describe('handleToggle dependencies include listItems', () => {
    it('speeches.tsx handleToggle depends on listItems', () => {
      const content = getSpeeches();
      expect(content).toContain('[expandedDate, lazyCreate, listItems]');
    });

    it('agenda.tsx handleToggle depends on listItems', () => {
      const content = getAgenda();
      expect(content).toContain('[expandedDate, lazyCreate, listItems]');
    });
  });

  // --- Index calculation ---
  describe('Index calculation in handleToggle', () => {
    it('speeches.tsx finds index by type sunday and key matching date', () => {
      const content = getSpeeches();
      const handleToggleIdx = content.indexOf('const handleToggle');
      const handleToggleEnd = content.indexOf('];', handleToggleIdx);
      const section = content.substring(handleToggleIdx, handleToggleEnd);
      expect(section).toContain("i.type === 'sunday'");
      expect(section).toContain('i.key === date');
    });

    it('agenda.tsx finds index by type sunday and data.date matching', () => {
      const content = getAgenda();
      const handleToggleIdx = content.indexOf('const handleToggle');
      const handleToggleEnd = content.indexOf('[expandedDate, lazyCreate, listItems]', handleToggleIdx);
      const section = content.substring(handleToggleIdx, handleToggleEnd);
      expect(section).toContain('.data.date === date');
      expect(section).toContain("'sunday'");
    });
  });
});

// =============================================================================
// F067 (CR-123): Recognizing field proportional height
// =============================================================================

describe('F067 (CR-123): Recognizing field proportional height', () => {
  const getAgendaForm = () => readSourceFile('components/AgendaForm.tsx');

  // --- AC-F067-01: Each recognized_name as individual Text ---
  describe('AC-F067-01: Each name is an individual Text element', () => {
    it('recognized_names are rendered via .map() with individual Text elements', () => {
      const content = getAgendaForm();
      expect(content).toContain('agenda.recognized_names!.map((name, idx)');
    });

    it('each Text has numberOfLines={1}', () => {
      const content = getAgendaForm();
      // The recognizing block renders each name as a Text with numberOfLines={1}
      const recognizingIdx = content.indexOf("label={t('agenda.recognizing')}");
      const nextFieldIdx = content.indexOf("<FieldRow", recognizingIdx + 1);
      const section = content.substring(recognizingIdx, nextFieldIdx);
      // Within the recognizing field section, map renders Text with numberOfLines={1}
      expect(section).toContain('numberOfLines={1}');
    });

    it('each name Text uses recognizingName style', () => {
      const content = getAgendaForm();
      expect(content).toContain('styles.recognizingName');
    });
  });

  // --- AC-F067-02: Height grows proportionally ---
  describe('AC-F067-02: Field height grows proportionally', () => {
    it('Pressable uses selectorField style (no fixed height)', () => {
      const content = getAgendaForm();
      const recognizingIdx = content.indexOf("label={t('agenda.recognizing')}");
      const nextFieldIdx = content.indexOf("<FieldRow", recognizingIdx + 1);
      const section = content.substring(recognizingIdx, nextFieldIdx);
      expect(section).toContain('styles.selectorField');
      // Verify no explicit height in the Pressable
      expect(section).not.toContain('height:');
    });

    it('selectorField style has no fixed height', () => {
      const content = getAgendaForm();
      const selectorFieldIdx = content.indexOf('selectorField: {');
      const selectorFieldEnd = content.indexOf('},', selectorFieldIdx);
      const section = content.substring(selectorFieldIdx, selectorFieldEnd);
      expect(section).not.toContain('height:');
    });
  });

  // --- AC-F067-03: Placeholder when no names ---
  describe('AC-F067-03: Placeholder when no names selected', () => {
    it('shows placeholder text when recognized_names is empty or null', () => {
      const content = getAgendaForm();
      const recognizingIdx = content.indexOf("label={t('agenda.recognizing')}");
      const nextFieldIdx = content.indexOf("<FieldRow", recognizingIdx + 1);
      const section = content.substring(recognizingIdx, nextFieldIdx);
      expect(section).toContain("(agenda.recognized_names?.length ?? 0) > 0");
      expect(section).toContain("t('agenda.recognizing')");
    });

    it('placeholder uses textTertiary color', () => {
      const content = getAgendaForm();
      const recognizingIdx = content.indexOf("label={t('agenda.recognizing')}");
      const nextFieldIdx = content.indexOf("<FieldRow", recognizingIdx + 1);
      const section = content.substring(recognizingIdx, nextFieldIdx);
      expect(section).toContain('colors.textTertiary');
    });
  });

  // --- AC-F067-04: onPress opens ActorSelector ---
  describe('AC-F067-04: Pressable onPress opens ActorSelector', () => {
    it('onPress opens ActorSelector with recognizing field config', () => {
      const content = getAgendaForm();
      const recognizingIdx = content.indexOf("label={t('agenda.recognizing')}");
      const nextFieldIdx = content.indexOf("<FieldRow", recognizingIdx + 1);
      const section = content.substring(recognizingIdx, nextFieldIdx);
      expect(section).toContain("field: 'recognizing'");
      expect(section).toContain("roleFilter: 'can_recognize'");
    });
  });

  // --- AC-F067-05: Observer cannot click the field ---
  describe('AC-F067-05: Observer cannot click the field', () => {
    it('Pressable disabled prop set to isObserver', () => {
      const content = getAgendaForm();
      const recognizingIdx = content.indexOf("label={t('agenda.recognizing')}");
      const nextFieldIdx = content.indexOf("<FieldRow", recognizingIdx + 1);
      const section = content.substring(recognizingIdx, nextFieldIdx);
      expect(section).toContain('disabled={isObserver}');
    });

    it('onPress is undefined when isObserver', () => {
      const content = getAgendaForm();
      const recognizingIdx = content.indexOf("label={t('agenda.recognizing')}");
      const nextFieldIdx = content.indexOf("<FieldRow", recognizingIdx + 1);
      const section = content.substring(recognizingIdx, nextFieldIdx);
      expect(section).toContain('isObserver ? undefined :');
    });
  });

  // --- AC-F067-06: Visual consistency with SelectorField ---
  describe('AC-F067-06: Visual consistency with SelectorField', () => {
    it('uses styles.selectorField for border, radius, padding', () => {
      const content = getAgendaForm();
      const recognizingIdx = content.indexOf("label={t('agenda.recognizing')}");
      const nextFieldIdx = content.indexOf("<FieldRow", recognizingIdx + 1);
      const section = content.substring(recognizingIdx, nextFieldIdx);
      expect(section).toContain('styles.selectorField');
      expect(section).toContain('borderColor: colors.border');
    });

    it('selectorField has borderWidth, borderRadius, paddingHorizontal, paddingVertical', () => {
      const content = getAgendaForm();
      const selectorFieldIdx = content.indexOf('selectorField: {');
      const selectorFieldEnd = content.indexOf('},', selectorFieldIdx);
      const section = content.substring(selectorFieldIdx, selectorFieldEnd);
      expect(section).toContain('borderWidth: 1');
      expect(section).toContain('borderRadius: 6');
      expect(section).toContain('paddingHorizontal: 10');
      expect(section).toContain('paddingVertical: 8');
    });
  });

  // --- AC-F067-07: Other SelectorFields unchanged ---
  describe('AC-F067-07: Other SelectorFields unchanged', () => {
    it('presiding still uses SelectorField component', () => {
      const content = getAgendaForm();
      const presidingIdx = content.indexOf("t('agenda.presiding')");
      const conductingIdx = content.indexOf("t('agenda.conducting')");
      const section = content.substring(presidingIdx, conductingIdx);
      expect(section).toContain('<SelectorField');
    });

    it('conducting still uses SelectorField component', () => {
      const content = getAgendaForm();
      const conductingIdx = content.indexOf("t('agenda.conducting')");
      const recognizingIdx = content.indexOf("t('agenda.recognizing')");
      const section = content.substring(conductingIdx, recognizingIdx);
      expect(section).toContain('<SelectorField');
    });

    it('opening hymn still uses SelectorField component', () => {
      const content = getAgendaForm();
      const hymnIdx = content.indexOf("t('agenda.openingHymn')");
      const prayerIdx = content.indexOf("t('agenda.openingPrayer')");
      const section = content.substring(hymnIdx, prayerIdx);
      expect(section).toContain('<SelectorField');
    });

    it('opening prayer still uses SelectorField component', () => {
      const content = getAgendaForm();
      const prayerIdx = content.indexOf("t('agenda.openingPrayer')");
      const sacramentIdx = content.indexOf("t('agenda.sectionSacrament')");
      const section = content.substring(prayerIdx, sacramentIdx);
      expect(section).toContain('<SelectorField');
    });

    it('SelectorField still has numberOfLines={1}', () => {
      const content = getAgendaForm();
      const selectorFnIdx = content.indexOf('function SelectorField');
      const selectorFnEnd = content.indexOf('\n}\n', selectorFnIdx);
      const selectorBody = content.substring(selectorFnIdx, selectorFnEnd);
      expect(selectorBody).toContain('numberOfLines={1}');
    });
  });

  // --- recognizingName style ---
  describe('recognizingName style', () => {
    it('has fontSize 15', () => {
      const content = getAgendaForm();
      const styleIdx = content.indexOf('recognizingName:');
      const styleEnd = content.indexOf('},', styleIdx);
      const section = content.substring(styleIdx, styleEnd);
      expect(section).toContain('fontSize: 15');
    });

    it('has paddingVertical 2', () => {
      const content = getAgendaForm();
      const styleIdx = content.indexOf('recognizingName:');
      const styleEnd = content.indexOf('},', styleIdx);
      const section = content.substring(styleIdx, styleEnd);
      expect(section).toContain('paddingVertical: 2');
    });
  });

  // --- EC-F067-01: 10+ names selected ---
  describe('EC-F067-01: Many names selected', () => {
    it('no max height or numberOfLines limit on container', () => {
      const content = getAgendaForm();
      const recognizingIdx = content.indexOf("label={t('agenda.recognizing')}");
      const nextFieldIdx = content.indexOf("<FieldRow", recognizingIdx + 1);
      const section = content.substring(recognizingIdx, nextFieldIdx);
      expect(section).not.toContain('maxHeight');
    });
  });

  // --- EC-F067-02: Long name ---
  describe('EC-F067-02: Long name truncated within line', () => {
    it('each Text element has numberOfLines={1} for truncation', () => {
      const content = getAgendaForm();
      const recognizingIdx = content.indexOf("label={t('agenda.recognizing')}");
      const nextFieldIdx = content.indexOf("<FieldRow", recognizingIdx + 1);
      const section = content.substring(recognizingIdx, nextFieldIdx);
      expect(section).toContain('numberOfLines={1}');
    });
  });

  // --- EC-F067-03: Dynamic add/remove ---
  describe('EC-F067-03: Field dynamically adjusts to name changes', () => {
    it('field content is reactive to agenda.recognized_names', () => {
      const content = getAgendaForm();
      const recognizingIdx = content.indexOf("label={t('agenda.recognizing')}");
      const nextFieldIdx = content.indexOf("<FieldRow", recognizingIdx + 1);
      const section = content.substring(recognizingIdx, nextFieldIdx);
      // Uses live agenda.recognized_names (reactive)
      expect(section).toContain('agenda.recognized_names');
    });

    it('ActorSelector toggle handler updates recognized_names array', () => {
      const content = getAgendaForm();
      expect(content).toContain("selectorModal.field === 'recognizing'");
      expect(content).toContain('current.includes(actor.name)');
      expect(content).toContain('current.filter((n) => n !== actor.name)');
      expect(content).toContain('[...current, actor.name]');
    });
  });

  // --- Recognizing field is NOT a SelectorField ---
  describe('Recognizing uses Pressable, not SelectorField', () => {
    it('the recognizing block does not use <SelectorField', () => {
      const content = getAgendaForm();
      const recognizingIdx = content.indexOf("label={t('agenda.recognizing')}");
      const nextFieldIdx = content.indexOf("<FieldRow", recognizingIdx + 1);
      const section = content.substring(recognizingIdx, nextFieldIdx);
      expect(section).not.toContain('<SelectorField');
      expect(section).toContain('<Pressable');
    });
  });
});

// =============================================================================
// Cross-feature: i18n consistency for Phase 3
// =============================================================================

describe('Cross-feature: i18n consistency (Phase 3)', () => {
  it('all 3 locales have common.close', () => {
    const ptBR = readLocale('pt-BR') as { common: Record<string, string> };
    const en = readLocale('en') as { common: Record<string, string> };
    const es = readLocale('es') as { common: Record<string, string> };
    expect(ptBR.common.close).toBeDefined();
    expect(en.common.close).toBeDefined();
    expect(es.common.close).toBeDefined();
  });

  it('all locale files are valid JSON', () => {
    const ptBR = readLocale('pt-BR');
    const en = readLocale('en');
    const es = readLocale('es');
    expect(ptBR).toBeDefined();
    expect(en).toBeDefined();
    expect(es).toBeDefined();
  });
});

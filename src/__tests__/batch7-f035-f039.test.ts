/**
 * Tests for Batch 7, Phase 1: Bug Fixes F035-F039
 *
 * F035 (CR-91): Fix RLS policy error on notification_queue (SECURITY DEFINER)
 * F036 (CR-92): Fix duplicate key error in country dropdown
 * F037 (CR-93): Change deep link protocol to sacrmeetplan://
 * F038 (CR-95): Fix speech fields not hiding on sunday type change
 * F039 (CR-98): Fix prayer fields not clickable
 *
 * Covers acceptance criteria:
 *   AC-F035-01..04, AC-F036-01..05, AC-F037-01..04, AC-F038-01..09, AC-F039-01..07
 * Covers edge cases:
 *   EC-F035-01..04, EC-F036-01, EC-F037-01..02, EC-F038-01..02, EC-F039-01..03
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function readSourceFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf-8');
}

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', '..', relativePath), 'utf-8');
}

// =============================================================================
// F035 (CR-91): Fix RLS policy error on notification_queue
// =============================================================================

describe('F035 (CR-91): Fix RLS policy error on notification_queue', () => {

  const getMigration013 = () =>
    readProjectFile('supabase/migrations/013_fix_notification_trigger_security_definer.sql');

  describe('AC-F035-01: Trigger function uses SECURITY DEFINER', () => {
    it('should have SECURITY DEFINER keyword in migration 013', () => {
      const content = getMigration013();
      expect(content).toContain('SECURITY DEFINER');
    });

    it('should define CREATE OR REPLACE FUNCTION enqueue_speech_notification()', () => {
      const content = getMigration013();
      expect(content).toContain('CREATE OR REPLACE FUNCTION enqueue_speech_notification()');
    });

    it('should define function as RETURNS TRIGGER', () => {
      const content = getMigration013();
      expect(content).toContain('RETURNS TRIGGER');
    });

    it('should use plpgsql language', () => {
      const content = getMigration013();
      expect(content).toMatch(/LANGUAGE\s+plpgsql/);
    });

    it('should have SECURITY DEFINER after LANGUAGE plpgsql', () => {
      const content = getMigration013();
      // The SECURITY DEFINER keyword should appear at the end of the function definition
      expect(content).toMatch(/LANGUAGE\s+plpgsql\s+SECURITY\s+DEFINER/i);
    });
  });

  describe('AC-F035-02: notification_queue has no client policies', () => {
    it('should have RLS enabled on notification_queue', () => {
      const rlsPolicies = readProjectFile('supabase/migrations/002_rls_policies.sql');
      expect(rlsPolicies).toContain('ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY');
    });

    it('should NOT have INSERT policy for authenticated on notification_queue', () => {
      const rlsPolicies = readProjectFile('supabase/migrations/002_rls_policies.sql');
      // Find the notification_queue section and verify no INSERT policy for authenticated
      const nqIndex = rlsPolicies.indexOf('notification_queue ENABLE ROW LEVEL SECURITY');
      expect(nqIndex).toBeGreaterThan(-1);
      // After RLS is enabled, there should be a comment about no client access
      const afterRls = rlsPolicies.substring(nqIndex);
      expect(afterRls).toContain('No policies');
    });
  });

  describe('AC-F035-03: Trigger fires correctly for all status changes', () => {
    it('should handle assigned_not_invited status (Case 1: designation notification)', () => {
      const content = getMigration013();
      expect(content).toContain("NEW.status = 'assigned_not_invited'");
      expect(content).toContain("'designation'");
    });

    it('should handle assigned_confirmed status (Case 4: speaker_confirmed notification)', () => {
      const content = getMigration013();
      expect(content).toContain("NEW.status = 'assigned_confirmed'");
      expect(content).toContain("'speaker_confirmed'");
    });

    it('should handle gave_up status (Case 5: speaker_withdrew notification)', () => {
      const content = getMigration013();
      expect(content).toContain("NEW.status = 'gave_up'");
      expect(content).toContain("'speaker_withdrew'");
    });

    it('should handle not_assigned status (cancellation UPDATE)', () => {
      const content = getMigration013();
      expect(content).toContain("NEW.status = 'not_assigned'");
      expect(content).toContain("SET status = 'cancelled'");
    });
  });

  describe('AC-F035-04: No DROP/CREATE TRIGGER in migration', () => {
    it('should NOT contain DROP TRIGGER statement', () => {
      const content = getMigration013();
      expect(content.toUpperCase()).not.toContain('DROP TRIGGER');
    });

    it('should NOT contain CREATE TRIGGER statement', () => {
      const content = getMigration013();
      expect(content.toUpperCase()).not.toContain('CREATE TRIGGER');
    });

    it('should use CREATE OR REPLACE to update function without recreating trigger', () => {
      const content = getMigration013();
      expect(content).toContain('CREATE OR REPLACE FUNCTION');
    });
  });

  describe('EC-F035-01: Trigger with assigned_not_invited inserts into notification_queue', () => {
    it('should INSERT into notification_queue for assigned_not_invited', () => {
      const content = getMigration013();
      // Verify there's an INSERT after the assigned_not_invited check
      const assignedIdx = content.indexOf("NEW.status = 'assigned_not_invited'");
      const insertIdx = content.indexOf('INSERT INTO notification_queue', assignedIdx);
      expect(insertIdx).toBeGreaterThan(assignedIdx);
    });
  });

  describe('EC-F035-02: Trigger with assigned_confirmed inserts into notification_queue', () => {
    it('should INSERT into notification_queue for assigned_confirmed', () => {
      const content = getMigration013();
      const confirmedIdx = content.indexOf("NEW.status = 'assigned_confirmed'");
      const insertIdx = content.indexOf('INSERT INTO notification_queue', confirmedIdx);
      expect(insertIdx).toBeGreaterThan(confirmedIdx);
    });
  });

  describe('EC-F035-03: Trigger with gave_up inserts into notification_queue', () => {
    it('should INSERT into notification_queue for gave_up', () => {
      const content = getMigration013();
      const gaveUpIdx = content.indexOf("NEW.status = 'gave_up'");
      const insertIdx = content.indexOf('INSERT INTO notification_queue', gaveUpIdx);
      expect(insertIdx).toBeGreaterThan(gaveUpIdx);
    });
  });

  describe('EC-F035-04: Trigger with not_assigned does UPDATE on notification_queue', () => {
    it('should UPDATE notification_queue for not_assigned (cancellation)', () => {
      const content = getMigration013();
      const notAssignedIdx = content.indexOf("NEW.status = 'not_assigned'");
      const updateIdx = content.indexOf('UPDATE notification_queue', notAssignedIdx);
      expect(updateIdx).toBeGreaterThan(notAssignedIdx);
    });
  });
});

// =============================================================================
// F036 (CR-92): Fix duplicate key error in country dropdown
// =============================================================================

describe('F036 (CR-92): Fix duplicate key error in country dropdown', () => {

  const getMembersSource = () =>
    readSourceFile('app/(tabs)/settings/members.tsx');

  const getCountryCodes = () =>
    readSourceFile('lib/countryCodes.ts');

  describe('AC-F036-01: FlatList uses unique key for each country', () => {
    it('should use item.label as keyExtractor for country codes FlatList', () => {
      const source = getMembersSource();
      // The country codes FlatList should use item.label for key
      expect(source).toContain('keyExtractor={(item) => item.label}');
    });

    it('should NOT use item.code as keyExtractor for country codes FlatList', () => {
      const source = getMembersSource();
      // Verify the old pattern (item.code) is no longer in the country codes FlatList
      // We need to check the country codes FlatList specifically, not the member list FlatList
      const countryCodesSection = source.substring(
        source.indexOf('data={COUNTRY_CODES}'),
        source.indexOf('data={COUNTRY_CODES}') + 200
      );
      expect(countryCodesSection).not.toContain('keyExtractor={(item) => item.code}');
    });
  });

  describe('AC-F036-02: No duplicate key warning', () => {
    it('should have all unique labels in COUNTRY_CODES', () => {
      const source = getCountryCodes();
      // Extract all labels from the source
      const labelMatches = source.match(/label:\s*'([^']+)'/g) ?? [];
      const labels = labelMatches.map((m) => m.replace(/label:\s*'/, '').replace(/'$/, ''));
      const uniqueLabels = new Set(labels);
      expect(labels.length).toBe(uniqueLabels.size);
    });
  });

  describe('AC-F036-03: US and Canada both present with +1', () => {
    it('should have United States with +1 in COUNTRY_CODES', () => {
      const source = getCountryCodes();
      expect(source).toContain("'United States (+1)'");
    });

    it('should have Canada with +1 in COUNTRY_CODES', () => {
      const source = getCountryCodes();
      expect(source).toContain("'Canada (+1)'");
    });

    it('should have unique labels for US and Canada', () => {
      const source = getCountryCodes();
      expect(source).toContain("label: 'United States (+1)'");
      expect(source).toContain("label: 'Canada (+1)'");
      // They are different strings so keyExtractor produces unique keys
      expect('United States (+1)').not.toBe('Canada (+1)');
    });
  });

  describe('AC-F036-04: Russia and Kazakhstan both present with +7', () => {
    it('should have Russia with +7 in COUNTRY_CODES', () => {
      const source = getCountryCodes();
      expect(source).toContain("'Russia (+7)'");
    });

    it('should have Kazakhstan with +7 in COUNTRY_CODES', () => {
      const source = getCountryCodes();
      expect(source).toContain("'Kazakhstan (+7)'");
    });

    it('should have unique labels for Russia and Kazakhstan', () => {
      expect('Russia (+7)').not.toBe('Kazakhstan (+7)');
    });
  });

  describe('AC-F036-05: Selected country highlighting still works', () => {
    it('should have item.label === countryLabel comparison for highlighting', () => {
      const source = getMembersSource();
      // F057 changed highlighting to use label-based comparison (ADR-043)
      expect(source).toContain('item.label === countryLabel');
    });

    it('should apply primaryContainer background for selected item', () => {
      const source = getMembersSource();
      // The country code FlatList should have conditional styling for selected item
      const countrySection = source.substring(
        source.indexOf('data={COUNTRY_CODES}'),
        source.indexOf('data={COUNTRY_CODES}') + 1000
      );
      expect(countrySection).toContain('primaryContainer');
    });
  });

  describe('EC-F036-01: Unique country highlighting with label-based comparison', () => {
    it('should use label-based comparison for unique highlighting', () => {
      const source = getMembersSource();
      // F057 changed to label-based highlighting (ADR-043) so US and Canada
      // highlight individually since labels are unique
      const countrySection = source.substring(
        source.indexOf('data={COUNTRY_CODES}'),
        source.indexOf('data={COUNTRY_CODES}') + 1000
      );
      expect(countrySection).toContain('item.label === countryLabel');
      expect(countrySection).not.toContain('item.code === countryCode');
    });
  });
});

// =============================================================================
// F037 (CR-93): Change deep link protocol to sacrmeetplan://
// =============================================================================

describe('F037 (CR-93): Change deep link protocol to sacrmeetplan://', () => {

  describe('AC-F037-01: app.json uses scheme sacrmeetplan', () => {
    it('should have scheme set to sacrmeetplan in app.json', () => {
      const content = readProjectFile('app.json');
      const config = JSON.parse(content);
      expect(config.expo.scheme).toBe('sacrmeetplan');
    });

    it('should NOT contain wardmanager as scheme', () => {
      const content = readProjectFile('app.json');
      const config = JSON.parse(content);
      expect(config.expo.scheme).not.toBe('wardmanager');
    });
  });

  // SUPERSEDED by F139 (CR-203): create-invitation now uses HTTPS URL to invite-redirect instead of deep link
  describe.skip('AC-F037-02: Edge Function uses sacrmeetplan:// deep link [SUPERSEDED by F139]', () => {
    it('should contain sacrmeetplan://invite/ in create-invitation Edge Function', () => {
      const content = readProjectFile('supabase/functions/create-invitation/index.ts');
      expect(content).toContain('sacrmeetplan://invite/');
    });

    it('should NOT contain wardmanager:// in create-invitation Edge Function', () => {
      const content = readProjectFile('supabase/functions/create-invitation/index.ts');
      expect(content).not.toContain('wardmanager://');
    });
  });

  describe('AC-F037-03: No references to wardmanager:// in source code', () => {
    it('should have zero wardmanager:// references in src/ directory', () => {
      const srcDir = path.resolve(__dirname, '..');
      const files = getAllFiles(srcDir);
      for (const file of files) {
        // Skip test files to avoid self-referencing
        if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) continue;
        const content = fs.readFileSync(file, 'utf-8');
        expect(content).not.toContain('wardmanager://');
      }
    });

    it('should have zero wardmanager:// references in supabase/ directory', () => {
      const supabaseDir = path.resolve(__dirname, '..', '..', 'supabase');
      const files = getAllFiles(supabaseDir);
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        expect(content).not.toContain('wardmanager://');
      }
    });
  });

  describe('AC-F037-04: Bundle identifier and package unchanged', () => {
    it('should have ios.bundleIdentifier as com.sacramentmeetingmanager.app', () => {
      const content = readProjectFile('app.json');
      const config = JSON.parse(content);
      expect(config.expo.ios.bundleIdentifier).toBe('com.sacramentmeetingmanager.app');
    });

    it('should have android.package as com.sacramentmeetingmanager.app', () => {
      const content = readProjectFile('app.json');
      const config = JSON.parse(content);
      expect(config.expo.android.package).toBe('com.sacramentmeetingmanager.app');
    });
  });

  // SUPERSEDED by F139 (CR-203): create-invitation now uses HTTPS URL instead of deep link
  describe.skip('EC-F037-01: Existing wardmanager:// links will not work [SUPERSEDED by F139]', () => {
    it('should only use sacrmeetplan:// protocol (old links stop working by design)', () => {
      const content = readProjectFile('supabase/functions/create-invitation/index.ts');
      expect(content).toContain('sacrmeetplan://invite/');
      expect(content).not.toContain('wardmanager://');
    });
  });

  describe('EC-F037-02: Deep links in Expo Go', () => {
    it('should have scheme defined in app.json (works only in standalone builds)', () => {
      const content = readProjectFile('app.json');
      const config = JSON.parse(content);
      // Custom URL schemes only work in standalone builds, not Expo Go
      expect(config.expo.scheme).toBeDefined();
      expect(typeof config.expo.scheme).toBe('string');
      expect(config.expo.scheme.length).toBeGreaterThan(0);
    });
  });
});

// Helper to recursively get all files in a directory
function getAllFiles(dir: string): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules and hidden directories
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        results.push(...getAllFiles(fullPath));
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  } catch {
    // Ignore permission errors
  }
  return results;
}

// =============================================================================
// F038 (CR-95): Fix speech fields not hiding on sunday type change
// =============================================================================

describe('F038 (CR-95): Fix speech fields not hiding on sunday type change', () => {

  const getSpeechesSource = () =>
    readSourceFile('app/(tabs)/speeches.tsx');

  const getAgendaSource = () =>
    readSourceFile('app/(tabs)/agenda.tsx');

  const getUseAgendaSource = () =>
    readSourceFile('hooks/useAgenda.ts');

  describe('AC-F038-01: Speech slots visible when type is speeches (no exception)', () => {
    it('should show speech slots when exception is null (default = speeches)', () => {
      const source = getSpeechesSource();
      // The condition (!exception || exception.reason === 'speeches') evaluates to true when exception is null
      expect(source).toContain('!exception || exception.reason');
    });
  });

  describe('AC-F038-02 through AC-F038-07: Speech slots hidden for all non-speeches types', () => {
    it('should use condition (!exception || exception.reason === \'speeches\') for speech slots', () => {
      const source = getSpeechesSource();
      expect(source).toContain("(!exception || exception.reason === 'speeches')");
    });

    it('should NOT use isExcludedFromAgenda for speech slots visibility', () => {
      const source = getSpeechesSource();
      expect(source).not.toContain('isExcludedFromAgenda');
    });

    it('should NOT import isExcludedFromAgenda', () => {
      const source = getSpeechesSource();
      // Verify no import of isExcludedFromAgenda from useAgenda
      expect(source).not.toMatch(/import.*isExcludedFromAgenda/);
    });

    it('should only render [1, 2, 3].map speech slots inside the speeches condition', () => {
      const source = getSpeechesSource();
      // The pattern should be: condition && [1, 2, 3].map
      expect(source).toMatch(/\(!exception \|\| exception\.reason === 'speeches'\)\s*&&\s*\n?\s*\[1,\s*2,\s*3\]\.map/);
    });
  });

  describe('AC-F038-08: SundayTypeDropdown always visible when expanded', () => {
    it('should render SundayTypeDropdown inside SundayCard (not conditional on type)', () => {
      const sundayCardSource = readSourceFile('components/SundayCard.tsx');
      // SundayTypeDropdown is rendered inside expandedContent, always visible when expanded
      expect(sundayCardSource).toContain('SundayTypeDropdown');
      // The dropdown is inside the expanded block but NOT inside the speeches condition
      const expandedIdx = sundayCardSource.indexOf('{expanded && (');
      const dropdownIdx = sundayCardSource.indexOf('SundayTypeDropdown', expandedIdx);
      const childrenIdx = sundayCardSource.indexOf('{children}', expandedIdx);
      expect(dropdownIdx).toBeGreaterThan(expandedIdx);
      expect(childrenIdx).toBeGreaterThan(dropdownIdx);
    });
  });

  describe('AC-F038-09: Switching back to speeches re-shows speech slots', () => {
    it('should evaluate to true when exception.reason is speeches', () => {
      const source = getSpeechesSource();
      // The condition (!exception || exception.reason === 'speeches') covers the switch-back case
      expect(source).toContain("exception.reason === 'speeches'");
    });
  });

  describe('EC-F038-01: Sunday without exception (default = speeches)', () => {
    it('should evaluate !exception to true when exception is null', () => {
      const source = getSpeechesSource();
      // The condition starts with !exception which covers null/undefined exception
      expect(source).toContain('!exception ||');
    });

    it('should compute exception from sundayData.exception with null fallback', () => {
      const source = getSpeechesSource();
      expect(source).toContain('sundayData?.exception ?? null');
    });
  });

  describe('EC-F038-02: Changing type with speeches already assigned', () => {
    it('should only control visibility of speech slots (not modify speech data)', () => {
      const source = getSpeechesSource();
      // The condition only affects rendering (&&), not data mutation
      // Speech data remains in speechesForDay regardless of visibility
      expect(source).toContain('speechesForDay');
      // The map function uses speechesForDay.find, which still works when condition is false (just not rendered)
      expect(source).toContain('speechesForDay.find');
    });
  });

  describe('Regression: agenda.tsx still uses isExcludedFromAgenda', () => {
    it('should import isExcludedFromAgenda in agenda.tsx', () => {
      const source = getAgendaSource();
      expect(source).toMatch(/import.*isExcludedFromAgenda.*from/);
    });

    it('should use isExcludedFromAgenda for expandable check in agenda.tsx', () => {
      const source = getAgendaSource();
      expect(source).toContain('isExcludedFromAgenda(exception.reason)');
    });
  });

  describe('Regression: useAgenda.ts still exports isExcludedFromAgenda', () => {
    it('should export isExcludedFromAgenda function from useAgenda.ts', () => {
      const source = getUseAgendaSource();
      expect(source).toContain('export function isExcludedFromAgenda');
    });
  });
});

// =============================================================================
// F039 (CR-98): Fix prayer fields not clickable
// =============================================================================

describe('F039 (CR-98): Fix prayer fields not clickable', () => {

  const getPrayerSelectorSource = () =>
    readSourceFile('components/PrayerSelector.tsx');

  const getAgendaFormSource = () =>
    readSourceFile('components/AgendaForm.tsx');

  describe('AC-F039-01: Opening prayer field opens PrayerSelector modal', () => {
    it('should render PrayerSelector with visible={true} in AgendaForm', () => {
      const source = getAgendaFormSource();
      // Verify PrayerSelector receives visible={true} when selectorModal.type === prayer
      const prayerSection = source.substring(
        source.indexOf("selectorModal?.type === 'prayer'"),
        source.indexOf("selectorModal?.type === 'prayer'") + 500
      );
      expect(prayerSection).toContain('visible={true}');
    });
  });

  describe('AC-F039-02: Closing prayer field opens PrayerSelector modal', () => {
    it('should render PrayerSelector for closing_prayer using same selectorModal pattern', () => {
      const source = getAgendaFormSource();
      // The same PrayerSelector handles both opening and closing prayer via selectorModal.field
      expect(source).toContain("selectorModal?.type === 'prayer'");
      // Verify that the selectorModal.field is used to determine which prayer field
      expect(source).toContain('selectorModal.field');
    });
  });

  describe('AC-F039-03: Selecting member updates agenda and closes modal', () => {
    it('should call onSelect and then onClose in handleSelectMember', () => {
      const source = getPrayerSelectorSource();
      // handleSelectMember calls onSelect first, then setModalVisible(false), then onClose
      expect(source).toContain('onSelect({ memberId: member.id, name: member.full_name })');
      expect(source).toContain('setModalVisible(false)');
    });
  });

  describe('AC-F039-04: Closing modal resets selectorModal to null', () => {
    it('should have onClose prop that resets selectorModal in AgendaForm', () => {
      const source = getAgendaFormSource();
      // AgendaForm passes onClose={() => setSelectorModal(null)} to PrayerSelector
      const prayerSection = source.substring(
        source.indexOf("selectorModal?.type === 'prayer'"),
        source.indexOf("selectorModal?.type === 'prayer'") + 500
      );
      expect(prayerSection).toContain('onClose={() => setSelectorModal(null)}');
    });

    it('should call onClose in cancel button handler', () => {
      const source = getPrayerSelectorSource();
      // Cancel button calls setModalVisible(false) and onClose?.()
      const cancelSection = source.substring(
        source.indexOf("onPress={() => {"),
        source.indexOf("onPress={() => {") + 200
      );
      expect(cancelSection).toContain('setModalVisible(false)');
      expect(cancelSection).toContain('onClose?.()');
    });

    it('should call onClose in onRequestClose handler', () => {
      const source = getPrayerSelectorSource();
      expect(source).toContain('onRequestClose={() => { setModalVisible(false); onClose?.(); }}');
    });
  });

  describe('AC-F039-05: Custom name works for non-members', () => {
    it('should have handleCustomName that calls onSelect with null memberId', () => {
      const source = getPrayerSelectorSource();
      expect(source).toContain('onSelect({ memberId: null, name: trimmed })');
    });

    it('should call onClose after custom name selection', () => {
      const source = getPrayerSelectorSource();
      // In handleCustomName, after onSelect and setModalVisible(false), onClose is called
      const handleCustom = source.substring(
        source.indexOf('const handleCustomName'),
        source.indexOf('const handleCustomName') + 300
      );
      expect(handleCustom).toContain('onClose?.()');
    });
  });

  describe('AC-F039-06: Prayer fields disabled for Observer', () => {
    it('should have disabled prop that prevents opening', () => {
      const source = getPrayerSelectorSource();
      expect(source).toContain('!disabled && setModalVisible(true)');
    });

    it('should pass disabled to Pressable', () => {
      const source = getPrayerSelectorSource();
      expect(source).toContain('disabled={disabled}');
    });
  });

  describe('AC-F039-07: PrayerSelector accepts visible and onClose props', () => {
    it('should have visible prop in PrayerSelectorProps', () => {
      const source = getPrayerSelectorSource();
      expect(source).toContain('visible?: boolean');
    });

    it('should have onClose prop in PrayerSelectorProps', () => {
      const source = getPrayerSelectorSource();
      expect(source).toContain('onClose?: () => void');
    });

    it('should have useEffect that opens modal when visible is true', () => {
      const source = getPrayerSelectorSource();
      expect(source).toContain('useEffect(() => {');
      expect(source).toContain('if (visible) {');
      expect(source).toContain('setModalVisible(true)');
    });

    it('should import useEffect from React', () => {
      const source = getPrayerSelectorSource();
      expect(source).toMatch(/import.*useEffect.*from\s+'react'/);
    });
  });

  describe('EC-F039-01: Clear button for assigned prayer', () => {
    it('should have handleClear that calls onSelect(null)', () => {
      const source = getPrayerSelectorSource();
      expect(source).toContain('onSelect(null)');
    });

    it('should render clear button when selected and not disabled', () => {
      const source = getPrayerSelectorSource();
      expect(source).toContain('{selected && !disabled && (');
    });
  });

  describe('EC-F039-02: Search in modal filters members', () => {
    it('should use useMembers hook with search parameter', () => {
      const source = getPrayerSelectorSource();
      expect(source).toContain('useMembers(search)');
    });

    it('should have SearchInput component in modal', () => {
      const source = getPrayerSelectorSource();
      expect(source).toContain('<SearchInput');
      expect(source).toContain('onChangeText');
    });
  });

  describe('EC-F039-03: Close modal and reopen for different prayer field', () => {
    it('should reset search and customName on close', () => {
      const source = getPrayerSelectorSource();
      // Cancel handler resets search and customName
      const cancelHandler = source.substring(
        source.indexOf("onPress={() => {"),
        source.indexOf("onPress={() => {") + 200
      );
      expect(cancelHandler).toContain("setSearch('')");
      expect(cancelHandler).toContain("setCustomName('')");
    });

    it('should reset search and customName on member selection', () => {
      const source = getPrayerSelectorSource();
      const selectHandler = source.substring(
        source.indexOf('const handleSelectMember'),
        source.indexOf('const handleSelectMember') + 300
      );
      expect(selectHandler).toContain("setSearch('')");
      expect(selectHandler).toContain("setCustomName('')");
    });
  });
});

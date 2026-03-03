/**
 * Batch 31 Phase 2: Tests for F172, F173 (CRs 246, 247)
 *
 * F172 (CR-246): Cascade member phone/name update to future speeches
 * F173 (CR-247): Add informal_name field to members used in WhatsApp invites
 *
 * Testing strategy:
 * - F172: Source code analysis of useMembers.ts cascade logic in onSuccess
 *         + verification of cascade query structure (AC-172-01 through AC-172-10)
 * - F173: Unit tests for CSV (parseCsv, generateCsv), source code analysis for
 *         TypeScript types, hooks, UI, WhatsApp, and i18n
 *         (AC-173-01 through AC-173-20)
 *
 * Note: AC-172-10 and AC-173-20 (full test suite passes) are verified by running
 * the complete test suite (npx vitest run).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseCsv, generateCsv, CSV_DEFAULT_HEADERS } from '../lib/csvUtils';

// --- Helpers ---

const ROOT = path.resolve(__dirname, '..', '..');

function readSrcFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, 'src', relativePath), 'utf-8');
}

function readRootFile(relativePath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relativePath), 'utf-8');
}

// --- Source files ---
const useMembersSource = readSrcFile('hooks/useMembers.ts');
const useSpeechesSource = readSrcFile('hooks/useSpeeches.ts');
const databaseTypesSource = readSrcFile('types/database.ts');
const csvUtilsSource = readSrcFile('lib/csvUtils.ts');
const membersUiSource = readSrcFile('app/(tabs)/settings/members.tsx');
const inviteManagementSource = readSrcFile('components/InviteManagementSection.tsx');
const speechesTabSource = readSrcFile('app/(tabs)/speeches.tsx');
const nextAssignmentsSource = readSrcFile('components/NextAssignmentsSection.tsx');
const agendaFormSource = readSrcFile('components/AgendaForm.tsx');
const migrationSource = readRootFile('supabase/migrations/023_add_informal_name.sql');
const ptBrSource = readSrcFile('i18n/locales/pt-BR.json');
const enSource = readSrcFile('i18n/locales/en.json');
const esSource = readSrcFile('i18n/locales/es.json');

// =============================================================================
// F172: Cascade member data update to future speeches (CR-246)
// =============================================================================

describe('F172: Cascade member data update to future speeches (CR-246)', () => {
  // ---------------------------------------------------------------------------
  // AC-172-01: Future speeches updated when member phone changes
  // ---------------------------------------------------------------------------

  describe('AC-172-01: Future speeches updated when member phone changes', () => {
    it('useUpdateMember onSuccess constructs fullPhone from country_code + phone', () => {
      expect(useMembersSource).toContain(
        "const fullPhone = data.phone ? `${data.country_code}${data.phone}` : null;"
      );
    });

    it('cascade updates speaker_phone in speeches table', () => {
      expect(useMembersSource).toContain('speaker_phone: fullPhone');
    });

    it('cascade filters by member_id matching updated member', () => {
      expect(useMembersSource).toContain(".eq('member_id', data.id)");
    });
  });

  // ---------------------------------------------------------------------------
  // AC-172-02: Future speeches updated when member name changes
  // ---------------------------------------------------------------------------

  describe('AC-172-02: Future speeches updated when member name changes', () => {
    it('cascade updates speaker_name to data.full_name', () => {
      expect(useMembersSource).toContain('speaker_name: data.full_name');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-172-03: Multiple future speeches updated in one operation
  // ---------------------------------------------------------------------------

  describe('AC-172-03: Multiple future speeches updated in one operation', () => {
    it('cascade uses .gte for sunday_date (no LIMIT, updates all matching rows)', () => {
      expect(useMembersSource).toContain(".gte('sunday_date', today)");
    });

    it('cascade does NOT use .limit() or .single() (updates multiple)', () => {
      // Extract the cascade update block
      const cascadeBlock = useMembersSource.match(
        /await supabase\s*\.from\('speeches'\)\s*\.update\(\{[\s\S]*?\}\)\s*\.eq\('member_id',[\s\S]*?\.gte\('sunday_date',[\s\S]*?\)/
      );
      expect(cascadeBlock).not.toBeNull();
      expect(cascadeBlock![0]).not.toContain('.limit(');
      expect(cascadeBlock![0]).not.toContain('.single(');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-172-04: Past speeches are NOT updated
  // ---------------------------------------------------------------------------

  describe('AC-172-04: Past speeches are NOT updated', () => {
    it('cascade uses .gte (>=) for sunday_date, excluding past dates', () => {
      expect(useMembersSource).toContain(".gte('sunday_date', today)");
    });

    it('today is computed as ISO date string (YYYY-MM-DD)', () => {
      expect(useMembersSource).toContain(
        "const today = new Date().toISOString().split('T')[0];"
      );
    });

    it('does NOT use .gt (strictly greater), which would exclude today', () => {
      // The cascade should NOT use .gt('sunday_date', today)
      const cascadeBlock = useMembersSource.match(
        /await supabase\s*\.from\('speeches'\)\s*\.update\(\{[\s\S]*?\}\)\s*\.eq\('member_id',[\s\S]*?\.g[te]+\('sunday_date'/
      );
      expect(cascadeBlock).not.toBeNull();
      // It uses .gte not .gt
      expect(cascadeBlock![0]).toContain('.gte(');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-172-05: WhatsApp uses updated phone after member edit
  // ---------------------------------------------------------------------------

  describe('AC-172-05: WhatsApp uses updated phone after member edit', () => {
    it('InviteManagementSection reads speech.speaker_phone for WhatsApp', () => {
      expect(inviteManagementSource).toContain('speech.speaker_phone');
    });

    it('cascade updates speaker_phone, so InviteManagementSection gets new value', () => {
      expect(useMembersSource).toContain('speaker_phone: fullPhone');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-172-06: Prayer slots (positions 0 and 4) also updated
  // ---------------------------------------------------------------------------

  describe('AC-172-06: Prayer slots (positions 0 and 4) also updated', () => {
    it('cascade does NOT filter by position (all positions updated)', () => {
      const cascadeBlock = useMembersSource.match(
        /await supabase\s*\.from\('speeches'\)\s*\.update\(\{[\s\S]*?\}\)\s*\.eq\('member_id',[\s\S]*?\.gte\('sunday_date',[\s\S]*?\)/
      );
      expect(cascadeBlock).not.toBeNull();
      expect(cascadeBlock![0]).not.toContain('.eq(\'position\'');
      expect(cascadeBlock![0]).not.toContain('.in(\'position\'');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-172-07: Speeches query cache invalidated after cascade
  // ---------------------------------------------------------------------------

  describe('AC-172-07: Speeches query cache invalidated after cascade', () => {
    it('imports speechKeys from useSpeeches', () => {
      expect(useMembersSource).toContain(
        "import { speechKeys } from './useSpeeches';"
      );
    });

    it('invalidates speechKeys.all after cascade', () => {
      expect(useMembersSource).toContain(
        'queryClient.invalidateQueries({ queryKey: speechKeys.all })'
      );
    });
  });

  // ---------------------------------------------------------------------------
  // AC-172-08: Cascade runs when country_code changes
  // ---------------------------------------------------------------------------

  describe('AC-172-08: Cascade runs when country_code changes', () => {
    it('fullPhone is constructed from data.country_code + data.phone', () => {
      expect(useMembersSource).toContain(
        "const fullPhone = data.phone ? `${data.country_code}${data.phone}` : null;"
      );
    });

    it('cascade always runs in onSuccess (no condition on what field changed)', () => {
      // The cascade runs unconditionally in onSuccess - no check for which field changed
      const onSuccessBlock = useMembersSource.match(
        /onSuccess:\s*async\s*\(data\)\s*=>\s*\{[\s\S]*?\n\s{4}\},/
      );
      expect(onSuccessBlock).not.toBeNull();
      // No conditional like "if (data.phone !== oldPhone)" before cascade
      expect(onSuccessBlock![0]).not.toContain('if (data.phone');
      expect(onSuccessBlock![0]).not.toContain('if (data.country_code');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-172-09: Member with no future speeches - cascade is a no-op
  // ---------------------------------------------------------------------------

  describe('AC-172-09: Member with no future speeches - cascade is a no-op', () => {
    it('cascade runs via supabase update (returns 0 rows if no match)', () => {
      expect(useMembersSource).toContain(
        "await supabase\n          .from('speeches')\n          .update({"
      );
    });

    it('no error is thrown when 0 rows are affected', () => {
      // The cascade is in a try/catch, so even if 0 rows are updated, it succeeds silently
      expect(useMembersSource).toContain('} catch {');
      expect(useMembersSource).toContain(
        '// Best-effort: member update already succeeded'
      );
    });
  });

  // ---------------------------------------------------------------------------
  // EC-172-01: Member phone set to empty/null
  // ---------------------------------------------------------------------------

  describe('EC-172-01: Member phone set to empty/null', () => {
    it('fullPhone is null when data.phone is falsy', () => {
      expect(useMembersSource).toContain(
        "const fullPhone = data.phone ? `${data.country_code}${data.phone}` : null;"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // EC-172-02: Member assigned to speech on today's date
  // ---------------------------------------------------------------------------

  describe("EC-172-02: Member assigned to speech on today's date", () => {
    it('cascade uses .gte (>=), so today is included', () => {
      expect(useMembersSource).toContain(".gte('sunday_date', today)");
    });
  });

  // ---------------------------------------------------------------------------
  // EC-172-03: Concurrent edits (last-write-wins)
  // ---------------------------------------------------------------------------

  describe('EC-172-03: Concurrent edits', () => {
    it('cascade uses data from mutation response (latest state)', () => {
      // The onSuccess receives `data` which is the mutation response
      // containing the latest member data
      expect(useMembersSource).toContain('onSuccess: async (data)');
      expect(useMembersSource).toContain('speaker_name: data.full_name');
    });
  });

  // ---------------------------------------------------------------------------
  // EC-172-04: Member deleted after update
  // ---------------------------------------------------------------------------

  describe('EC-172-04: Member deleted after update', () => {
    it('useDeleteMember does NOT have cascade logic (only update does)', () => {
      const deleteBlock = useMembersSource.match(
        /export function useDeleteMember\(\)[\s\S]*?^}/m
      );
      expect(deleteBlock).not.toBeNull();
      expect(deleteBlock![0]).not.toContain("from('speeches')");
    });
  });

  // ---------------------------------------------------------------------------
  // EC-172-05: Network error during cascade update
  // ---------------------------------------------------------------------------

  describe('EC-172-05: Network error during cascade update', () => {
    it('cascade is wrapped in try/catch (best-effort)', () => {
      expect(useMembersSource).toContain('try {');
      expect(useMembersSource).toContain('} catch {');
      expect(useMembersSource).toContain(
        '// Best-effort: member update already succeeded'
      );
    });

    it('member update (mutationFn) is separate from cascade (onSuccess)', () => {
      // mutationFn does the member update; cascade is in onSuccess
      // If cascade fails, mutationFn has already succeeded
      expect(useMembersSource).toContain('mutationFn: async (input: UpdateMemberInput)');
      expect(useMembersSource).toContain('onSuccess: async (data)');
    });
  });

  // ---------------------------------------------------------------------------
  // useUpdateMember onSuccess is async
  // ---------------------------------------------------------------------------

  describe('useUpdateMember onSuccess is async', () => {
    it('onSuccess callback is declared as async', () => {
      expect(useMembersSource).toContain('onSuccess: async (data)');
    });
  });
});

// =============================================================================
// F173: Informal name for members used in WhatsApp invites (CR-247)
// =============================================================================

describe('F173: Informal name field for members (CR-247)', () => {
  // ---------------------------------------------------------------------------
  // AC-173-01: members table has informal_name column
  // ---------------------------------------------------------------------------

  describe('AC-173-01: members table has informal_name column', () => {
    it('migration adds informal_name TEXT column to members', () => {
      expect(migrationSource).toContain(
        'ALTER TABLE public.members ADD COLUMN informal_name TEXT;'
      );
    });

    it('migration backfills existing members with first word of full_name', () => {
      expect(migrationSource).toContain(
        "SET informal_name = SPLIT_PART(TRIM(full_name), ' ', 1)"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // AC-173-02: speeches table has speaker_informal_name column
  // ---------------------------------------------------------------------------

  describe('AC-173-02: speeches table has speaker_informal_name column', () => {
    it('migration adds speaker_informal_name TEXT column to speeches', () => {
      expect(migrationSource).toContain(
        'ALTER TABLE public.speeches ADD COLUMN speaker_informal_name TEXT;'
      );
    });

    it('migration backfills existing speeches with first word of speaker_name', () => {
      expect(migrationSource).toContain(
        "SET speaker_informal_name = SPLIT_PART(TRIM(speaker_name), ' ', 1)"
      );
      expect(migrationSource).toContain(
        'WHERE speaker_name IS NOT NULL AND speaker_informal_name IS NULL'
      );
    });
  });

  // ---------------------------------------------------------------------------
  // AC-173-03: import_members RPC accepts informal_name
  // ---------------------------------------------------------------------------

  describe('AC-173-03: import_members RPC accepts informal_name', () => {
    it('RPC inserts informal_name column', () => {
      expect(migrationSource).toContain(
        'INSERT INTO members (ward_id, full_name, informal_name, country_code, phone)'
      );
    });

    it('RPC uses COALESCE for informal_name fallback', () => {
      expect(migrationSource).toContain('COALESCE(');
      expect(migrationSource).toContain("NULLIF(TRIM((m->>'informal_name')::text), '')");
      expect(migrationSource).toContain(
        "SPLIT_PART(TRIM((m->>'full_name')::text), ' ', 1)"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // AC-173-04: Member type includes informal_name
  // ---------------------------------------------------------------------------

  describe('AC-173-04: Member type includes informal_name', () => {
    it('Member interface has informal_name: string | null', () => {
      const memberInterface = databaseTypesSource.match(
        /export interface Member \{[\s\S]*?\}/
      );
      expect(memberInterface).not.toBeNull();
      expect(memberInterface![0]).toContain('informal_name: string | null;');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-173-05: Speech type includes speaker_informal_name
  // ---------------------------------------------------------------------------

  describe('AC-173-05: Speech type includes speaker_informal_name', () => {
    it('Speech interface has speaker_informal_name: string | null', () => {
      const speechInterface = databaseTypesSource.match(
        /export interface Speech \{[\s\S]*?\}/
      );
      expect(speechInterface).not.toBeNull();
      expect(speechInterface![0]).toContain(
        'speaker_informal_name: string | null;'
      );
    });
  });

  // ---------------------------------------------------------------------------
  // AC-173-06: CreateMemberInput includes informal_name
  // ---------------------------------------------------------------------------

  describe('AC-173-06: CreateMemberInput includes informal_name', () => {
    it('CreateMemberInput has informal_name?: string | null', () => {
      const createInput = databaseTypesSource.match(
        /export interface CreateMemberInput \{[\s\S]*?\}/
      );
      expect(createInput).not.toBeNull();
      expect(createInput![0]).toContain('informal_name?: string | null;');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-173-07: UpdateMemberInput includes informal_name
  // ---------------------------------------------------------------------------

  describe('AC-173-07: UpdateMemberInput includes informal_name', () => {
    it('UpdateMemberInput has informal_name?: string | null', () => {
      const updateInput = databaseTypesSource.match(
        /export interface UpdateMemberInput \{[\s\S]*?\}/
      );
      expect(updateInput).not.toBeNull();
      expect(updateInput![0]).toContain('informal_name?: string | null;');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-173-08: useAssignSpeaker snapshots speaker_informal_name
  // ---------------------------------------------------------------------------

  describe('AC-173-08: useAssignSpeaker snapshots speaker_informal_name', () => {
    it('AssignSpeakerInput has speakerInformalName: string | null', () => {
      const assignInput = useSpeechesSource.match(
        /export interface AssignSpeakerInput \{[\s\S]*?\}/
      );
      expect(assignInput).not.toBeNull();
      expect(assignInput![0]).toContain(
        'speakerInformalName: string | null;'
      );
    });

    it('useAssignSpeaker update includes speaker_informal_name', () => {
      expect(useSpeechesSource).toContain(
        'speaker_informal_name: input.speakerInformalName'
      );
    });

    it('useRemoveAssignment clears speaker_informal_name to null', () => {
      const removeBlock = useSpeechesSource.match(
        /export function useRemoveAssignment\(\)[\s\S]*?^}/m
      );
      expect(removeBlock).not.toBeNull();
      expect(removeBlock![0]).toContain('speaker_informal_name: null');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-173-09: useCreateMember auto-generates informal_name from first name
  // ---------------------------------------------------------------------------

  describe('AC-173-09: useCreateMember auto-generates informal_name', () => {
    it('useCreateMember inserts informal_name with fallback to first word', () => {
      expect(useMembersSource).toContain(
        "informal_name: input.informal_name || input.full_name.split(' ')[0]"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // AC-173-10: useUpdateMember cascade includes speaker_informal_name
  // ---------------------------------------------------------------------------

  describe('AC-173-10: useUpdateMember cascade includes speaker_informal_name', () => {
    it('cascade updates speaker_informal_name directly from member data', () => {
      expect(useMembersSource).toContain(
        "speaker_informal_name: data.informal_name,"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // AC-173-11: MemberEditor shows informal_name field
  // ---------------------------------------------------------------------------

  describe('AC-173-11: MemberEditor shows informal_name field', () => {
    it('MemberEditor has useState for informalName', () => {
      expect(membersUiSource).toContain(
        "const [informalName, setInformalName] = useState(member?.informal_name ?? '')"
      );
    });

    it('MemberEditor has TextInput with informalNamePlaceholder', () => {
      expect(membersUiSource).toContain("t('members.informalNamePlaceholder')");
    });

    it('i18n pt-BR has informalNamePlaceholder key', () => {
      const ptBr = JSON.parse(ptBrSource);
      expect(ptBr.members.informalNamePlaceholder).toBeDefined();
      expect(typeof ptBr.members.informalNamePlaceholder).toBe('string');
    });

    it('i18n en has informalNamePlaceholder key', () => {
      const en = JSON.parse(enSource);
      expect(en.members.informalNamePlaceholder).toBeDefined();
    });

    it('i18n es has informalNamePlaceholder key', () => {
      const es = JSON.parse(esSource);
      expect(es.members.informalNamePlaceholder).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // AC-173-12: MemberEditor auto-fills informal_name on blur
  // ---------------------------------------------------------------------------

  describe('AC-173-12: MemberEditor auto-fills informal_name on blur', () => {
    it('full_name TextInput has onBlur handler', () => {
      expect(membersUiSource).toContain('onBlur={() => {');
    });

    it('onBlur auto-fills informalName with first word of fullName when empty', () => {
      expect(membersUiSource).toContain(
        "setInformalName(fullName.trim().split(' ')[0])"
      );
    });

    it('onBlur only auto-fills when informalName is empty', () => {
      expect(membersUiSource).toContain(
        "if (!informalName.trim() && fullName.trim())"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // AC-173-13: MemberEditor saves informal_name
  // ---------------------------------------------------------------------------

  describe('AC-173-13: MemberEditor saves informal_name', () => {
    it('handleSave includes informal_name in onSave data', () => {
      expect(membersUiSource).toContain(
        "informal_name: informalName.trim() || ''"
      );
    });

    it('MemberEditorProps.onSave signature includes informal_name', () => {
      const propsMatch = membersUiSource.match(
        /onSave:\s*\(data:\s*\{[^}]*\}\)\s*=>\s*void/
      );
      expect(propsMatch).not.toBeNull();
      expect(propsMatch![0]).toContain('informal_name: string');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-173-14: MemberRow displays informal_name
  // ---------------------------------------------------------------------------

  describe('AC-173-14: MemberRow displays informal_name', () => {
    it('MemberRow conditionally renders informal_name', () => {
      expect(membersUiSource).toContain('member.informal_name');
    });

    it('MemberRow shows informal_name only when it exists', () => {
      expect(membersUiSource).toContain('{member.informal_name && (');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-173-15: CSV export includes informal_name column
  // ---------------------------------------------------------------------------

  describe('AC-173-15: CSV export includes informal_name column', () => {
    it('generateCsv outputs 3-column header: Nome,Nome Informal,Telefone Completo', () => {
      const members = [
        { full_name: 'Maria Silva', informal_name: 'Maria', country_code: '+55', phone: '11999999999' },
      ];
      const csv = generateCsv(members);
      const lines = csv.split('\n');
      expect(lines[0]).toBe('\uFEFFNome,Nome Informal,Telefone Completo');
    });

    it('generateCsv includes informal_name in data rows', () => {
      const members = [
        { full_name: 'Maria Silva', informal_name: 'Mari', country_code: '+55', phone: '11999999999' },
      ];
      const csv = generateCsv(members);
      const lines = csv.split('\n');
      expect(lines[1]).toBe('Maria Silva,Mari,+5511999999999');
    });

    it('generateCsv exports informal_name as-is, empty when null', () => {
      const members = [
        { full_name: 'Maria Silva', informal_name: null, country_code: '+55', phone: '11999999999' },
      ];
      const csv = generateCsv(members);
      const lines = csv.split('\n');
      expect(lines[1]).toBe('Maria Silva,,+5511999999999');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-173-16: CSV import accepts 3-column format with informal_name
  // ---------------------------------------------------------------------------

  describe('AC-173-16: CSV import accepts 3-column format with informal_name', () => {
    it('parseCsv correctly parses 3-column CSV', () => {
      const csv = 'Nome,Nome Informal,Telefone Completo\nMaria Silva,Mari,+5511999999999';
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
      expect(result.members).toHaveLength(1);
      expect(result.members[0].full_name).toBe('Maria Silva');
      expect(result.members[0].informal_name).toBe('Mari');
      expect(result.members[0].phone).toBe('+5511999999999');
    });

    it('parseCsv handles multiple rows in 3-column format', () => {
      const csv = 'Nome,Nome Informal,Telefone Completo\nMaria Silva,Mari,+5511999999999\nJoao Santos,Joao,+5521888888888';
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
      expect(result.members).toHaveLength(2);
      expect(result.members[0].informal_name).toBe('Mari');
      expect(result.members[1].informal_name).toBe('Joao');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-173-17: CSV import backwards-compatible with 2-column format
  // ---------------------------------------------------------------------------

  describe('AC-173-17: CSV import backwards-compatible with 2-column format', () => {
    it('parseCsv parses 2-column legacy CSV and auto-generates informal_name', () => {
      const csv = 'Nome,Telefone Completo\nMaria Silva,+5511999999999';
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
      expect(result.members).toHaveLength(1);
      expect(result.members[0].full_name).toBe('Maria Silva');
      expect(result.members[0].informal_name).toBe('Maria');
      expect(result.members[0].phone).toBe('+5511999999999');
    });

    it('parseCsv legacy format auto-generates informal_name from first word', () => {
      const csv = 'Nome,Telefone Completo\nJoao Pedro Santos,+5511999999999';
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
      expect(result.members[0].informal_name).toBe('Joao');
    });
  });

  // ---------------------------------------------------------------------------
  // AC-173-18: {nome} placeholder uses informal_name when available
  // ---------------------------------------------------------------------------

  describe('AC-173-18: {nome} placeholder uses informal_name when available', () => {
    it('InviteManagementSection prayer template uses speaker_informal_name || speaker_name', () => {
      expect(inviteManagementSource).toContain(
        "speakerName: speech.speaker_informal_name || speech.speaker_name || ''"
      );
    });

    it('InviteManagementSection speech template uses speaker_informal_name || speaker_name', () => {
      // Find both occurrences (prayer and speech templates)
      const matches = inviteManagementSource.match(
        /speakerName:\s*speech\.speaker_informal_name\s*\|\|\s*speech\.speaker_name\s*\|\|\s*''/g
      );
      expect(matches).not.toBeNull();
      expect(matches!.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ---------------------------------------------------------------------------
  // AC-173-19: {nome} placeholder falls back to full_name when informal_name is empty
  // ---------------------------------------------------------------------------

  describe('AC-173-19: {nome} falls back to speaker_name when informal_name is empty', () => {
    it('uses || operator for fallback (falsy check includes null and empty string)', () => {
      // The pattern: speech.speaker_informal_name || speech.speaker_name || ''
      // JS || treats null, undefined, and empty string as falsy, so fallback works
      expect(inviteManagementSource).toContain(
        "speech.speaker_informal_name || speech.speaker_name || ''"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // AC-173-08 (callers): Callers pass speakerInformalName
  // ---------------------------------------------------------------------------

  describe('Callers pass speakerInformalName to assignSpeaker', () => {
    it('speeches.tsx passes member.informal_name as speakerInformalName', () => {
      expect(speechesTabSource).toContain(
        'speakerInformalName: member.informal_name'
      );
    });

    it('NextAssignmentsSection passes member.informal_name as speakerInformalName', () => {
      expect(nextAssignmentsSource).toContain(
        'speakerInformalName: member.informal_name'
      );
    });

    it('AgendaForm passes null as speakerInformalName for prayers', () => {
      expect(agendaFormSource).toContain('speakerInformalName: null');
    });
  });

  // ---------------------------------------------------------------------------
  // CSV Headers
  // ---------------------------------------------------------------------------

  describe('CSV headers include informal_name', () => {
    it('CsvHeaders interface has informalName field', () => {
      const headersInterface = csvUtilsSource.match(
        /export interface CsvHeaders \{[\s\S]*?\}/
      );
      expect(headersInterface).not.toBeNull();
      expect(headersInterface![0]).toContain('informalName: string;');
    });

    it('CSV_DEFAULT_HEADERS includes informalName = "Nome Informal"', () => {
      expect(CSV_DEFAULT_HEADERS.informalName).toBe('Nome Informal');
    });

    it('CsvMember interface has informal_name field', () => {
      const csvMember = csvUtilsSource.match(
        /export interface CsvMember \{[\s\S]*?\}/
      );
      expect(csvMember).not.toBeNull();
      expect(csvMember![0]).toContain('informal_name: string;');
    });
  });

  // ---------------------------------------------------------------------------
  // EC-173-01: Member with single-word name
  // ---------------------------------------------------------------------------

  describe('EC-173-01: Member with single-word name', () => {
    it('parseCsv auto-generates informal_name = full_name for single-word name', () => {
      const csv = 'Nome,Telefone Completo\nMadonna,+5511999999999';
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
      expect(result.members[0].informal_name).toBe('Madonna');
    });

    it('generateCsv handles single-word name with null informal_name', () => {
      const members = [
        { full_name: 'Madonna', informal_name: null, country_code: '+55', phone: '11999999999' },
      ];
      const csv = generateCsv(members);
      const lines = csv.split('\n');
      expect(lines[1]).toBe('Madonna,,+5511999999999');
    });
  });

  // ---------------------------------------------------------------------------
  // EC-173-02: Member with name starting with spaces
  // ---------------------------------------------------------------------------

  describe('EC-173-02: Member with name starting with spaces', () => {
    it('parseCsv trims full_name before extracting first word', () => {
      const csv = 'Nome,Telefone Completo\n  Maria Silva  ,+5511999999999';
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
      expect(result.members[0].full_name).toBe('Maria Silva');
      // parseCsv trims full_name, then splits to get first word
      expect(result.members[0].informal_name).toBe('Maria');
    });
  });

  // ---------------------------------------------------------------------------
  // EC-173-03: User clears informal_name field (sets to empty string)
  // ---------------------------------------------------------------------------

  describe('EC-173-03: User clears informal_name field', () => {
    it('handleSave in MemberEditor sends empty string when informal_name is cleared', () => {
      // informalName.trim() || '' means empty string when cleared
      expect(membersUiSource).toContain(
        "informal_name: informalName.trim() || ''"
      );
    });

    it('useCreateMember falls back to first word of full_name when informal_name is empty', () => {
      expect(useMembersSource).toContain(
        "informal_name: input.informal_name || input.full_name.split(' ')[0]"
      );
    });

    it('useUpdateMember cascade propagates informal_name directly', () => {
      expect(useMembersSource).toContain(
        "speaker_informal_name: data.informal_name,"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // EC-173-04: CSV with informal_name column but empty values
  // ---------------------------------------------------------------------------

  describe('EC-173-04: CSV with informal_name column but empty values', () => {
    it('parseCsv auto-generates informal_name when 3-column CSV has empty informal_name', () => {
      const csv = 'Nome,Nome Informal,Telefone Completo\nMaria Silva,,+5511999999999';
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
      expect(result.members[0].informal_name).toBe('Maria');
    });

    it('parseCsv handles whitespace-only informal_name', () => {
      const csv = 'Nome,Nome Informal,Telefone Completo\nMaria Silva,   ,+5511999999999';
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
      // After trim, the informal_name is empty, so it falls back to first word
      expect(result.members[0].informal_name).toBe('Maria');
    });
  });

  // ---------------------------------------------------------------------------
  // EC-173-05: Existing members in database have no informal_name
  // ---------------------------------------------------------------------------

  describe('EC-173-05: Existing members have no informal_name (migration backfill)', () => {
    it('migration backfills members with SPLIT_PART of full_name', () => {
      expect(migrationSource).toContain(
        "SET informal_name = SPLIT_PART(TRIM(full_name), ' ', 1)"
      );
      expect(migrationSource).toContain('WHERE informal_name IS NULL');
    });

    it('migration backfills speeches with SPLIT_PART of speaker_name', () => {
      expect(migrationSource).toContain(
        "SET speaker_informal_name = SPLIT_PART(TRIM(speaker_name), ' ', 1)"
      );
      expect(migrationSource).toContain(
        'WHERE speaker_name IS NOT NULL AND speaker_informal_name IS NULL'
      );
    });
  });

  // ---------------------------------------------------------------------------
  // EC-173-06: F172 cascade and F173 interaction
  // ---------------------------------------------------------------------------

  describe('EC-173-06: F172 cascade and F173 interaction', () => {
    it('cascade updates all 3 snapshot fields together', () => {
      const cascadeUpdate = useMembersSource.match(
        /\.update\(\{\s*speaker_name:[\s\S]*?speaker_phone:[\s\S]*?speaker_informal_name:[\s\S]*?\}\)/
      );
      expect(cascadeUpdate).not.toBeNull();
    });

    it('cascade speaker_name uses data.full_name', () => {
      expect(useMembersSource).toContain('speaker_name: data.full_name');
    });

    it('cascade speaker_phone uses fullPhone', () => {
      expect(useMembersSource).toContain('speaker_phone: fullPhone');
    });

    it('cascade speaker_informal_name uses data.informal_name directly', () => {
      expect(useMembersSource).toContain(
        "speaker_informal_name: data.informal_name,"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // i18n: All 3 locales have the new keys
  // ---------------------------------------------------------------------------

  describe('i18n: All 3 locales have informal_name keys', () => {
    it('pt-BR has csvHeaderInformalName', () => {
      const ptBr = JSON.parse(ptBrSource);
      expect(ptBr.members.csvHeaderInformalName).toBe('Nome Informal');
    });

    it('en has csvHeaderInformalName', () => {
      const en = JSON.parse(enSource);
      expect(en.members.csvHeaderInformalName).toBe('Informal Name');
    });

    it('es has csvHeaderInformalName', () => {
      const es = JSON.parse(esSource);
      expect(es.members.csvHeaderInformalName).toBe('Nombre Informal');
    });

    it('pt-BR has informalNamePlaceholder', () => {
      const ptBr = JSON.parse(ptBrSource);
      expect(ptBr.members.informalNamePlaceholder).toBeDefined();
      expect(typeof ptBr.members.informalNamePlaceholder).toBe('string');
      expect(ptBr.members.informalNamePlaceholder.length).toBeGreaterThan(0);
    });

    it('en has informalNamePlaceholder', () => {
      const en = JSON.parse(enSource);
      expect(en.members.informalNamePlaceholder).toBeDefined();
      expect(typeof en.members.informalNamePlaceholder).toBe('string');
    });

    it('es has informalNamePlaceholder', () => {
      const es = JSON.parse(esSource);
      expect(es.members.informalNamePlaceholder).toBeDefined();
      expect(typeof es.members.informalNamePlaceholder).toBe('string');
    });
  });

  // ---------------------------------------------------------------------------
  // CSV round-trip test
  // ---------------------------------------------------------------------------

  describe('CSV round-trip: export then import', () => {
    it('generateCsv -> parseCsv produces same data', () => {
      const members = [
        { full_name: 'Maria Silva', informal_name: 'Mari', country_code: '+55', phone: '11999999999' },
        { full_name: 'Joao Santos', informal_name: 'Joao', country_code: '+55', phone: '21888888888' },
        { full_name: 'Ana', informal_name: 'Ana', country_code: '+1', phone: '2025551234' },
      ];
      const csv = generateCsv(members);
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
      expect(result.members).toHaveLength(3);
      expect(result.members[0].full_name).toBe('Maria Silva');
      expect(result.members[0].informal_name).toBe('Mari');
      expect(result.members[0].phone).toBe('+5511999999999');
      expect(result.members[1].full_name).toBe('Joao Santos');
      expect(result.members[1].informal_name).toBe('Joao');
      expect(result.members[2].full_name).toBe('Ana');
      expect(result.members[2].informal_name).toBe('Ana');
      expect(result.members[2].phone).toBe('+12025551234');
    });
  });

  // ---------------------------------------------------------------------------
  // CSV with names containing commas (quoted fields)
  // ---------------------------------------------------------------------------

  describe('CSV with special characters in informal_name', () => {
    it('generateCsv escapes informal_name with commas', () => {
      const members = [
        { full_name: 'Silva, Maria', informal_name: 'Mari, dear', country_code: '+55', phone: '11999999999' },
      ];
      const csv = generateCsv(members);
      const lines = csv.split('\n');
      expect(lines[1]).toContain('"Silva, Maria"');
      expect(lines[1]).toContain('"Mari, dear"');
    });

    it('parseCsv handles quoted informal_name with commas', () => {
      const csv = 'Nome,Nome Informal,Telefone Completo\n"Silva, Maria","Mari, dear",+5511999999999';
      const result = parseCsv(csv);
      expect(result.success).toBe(true);
      expect(result.members[0].full_name).toBe('Silva, Maria');
      expect(result.members[0].informal_name).toBe('Mari, dear');
    });
  });

  // ---------------------------------------------------------------------------
  // MemberEditor: callers pass informal_name to create and update mutations
  // ---------------------------------------------------------------------------

  describe('MemberEditor passes informal_name to mutations', () => {
    it('handleAddMember passes informal_name with auto-default', () => {
      expect(membersUiSource).toContain(
        "informal_name: data.informal_name || data.full_name.split(' ')[0]"
      );
    });

    it('handleEditMember passes informal_name with auto-default', () => {
      // Both create and update paths use the same pattern
      const matches = membersUiSource.match(
        /informal_name:\s*data\.informal_name\s*\|\|\s*data\.full_name\.split\(' '\)\[0\]/g
      );
      expect(matches).not.toBeNull();
      expect(matches!.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ---------------------------------------------------------------------------
  // CSV export uses i18n header for informalName
  // ---------------------------------------------------------------------------

  describe('CSV export uses i18n header for informalName', () => {
    it('members.tsx uses t("members.csvHeaderInformalName") for CSV export', () => {
      expect(membersUiSource).toContain("t('members.csvHeaderInformalName')");
    });

    it('members.tsx passes informalName header to generateCsv', () => {
      expect(membersUiSource).toContain(
        "informalName: t('members.csvHeaderInformalName')"
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Import flow passes informal_name to import_members RPC
  // ---------------------------------------------------------------------------

  describe('Import flow passes informal_name', () => {
    it('members.tsx maps parsed CSV informal_name to import data', () => {
      expect(membersUiSource).toContain('informal_name: m.informal_name');
    });
  });
});

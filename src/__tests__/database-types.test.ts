import type {
  Role,
  Permission,
  SpeechStatus,
  NotificationType,
  NotificationTargetRole,
  NotificationStatus,
  Ward,
  Member,
  Speech,
  Hymn,
  SundayAgenda,
  Invitation,
  NotificationQueue,
  TopicWithCollection,
  SpeechBySunday,
  DateRange,
  CreateMemberInput,
  UpdateMemberInput,
  ImportResult,
} from '../types/database';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Tests that database type definitions match the expected schema from
 * 001_initial_schema.sql and are structurally sound.
 */

describe('Database Types', () => {
  describe('Role type', () => {
    it('should allow all 3 valid roles', () => {
      const roles: Role[] = ['bishopric', 'secretary', 'observer'];
      expect(roles).toHaveLength(3);
      expect(roles).toContain('bishopric');
      expect(roles).toContain('secretary');
      expect(roles).toContain('observer');
    });
  });

  describe('Permission type', () => {
    it('should define exactly 26 permissions', () => {
      const permissions: Permission[] = [
        'speech:assign',
        'speech:unassign',
        'speech:change_status',
        'prayer:assign',
        'prayer:unassign',
        'member:read',
        'member:write',
        'member:import',
        'topic:write',
        'sunday_type:write',
        'settings:access',
        'settings:language',
        'settings:whatsapp',
        'settings:designations',
        'settings:timezone',
        'settings:users',
        'invite:manage',
        'home:next_assignments',
        'home:invite_mgmt',
        'agenda:read',
        'agenda:write',
        'agenda:assign_speaker',
        'presentation:start',
        'push:receive',
        'invitation:create',
        'history:read',
      ];
      expect(permissions).toHaveLength(26);
    });
  });

  describe('SpeechStatus type', () => {
    it('should define all 5 speech statuses', () => {
      const statuses: SpeechStatus[] = [
        'not_assigned',
        'assigned_not_invited',
        'assigned_invited',
        'assigned_confirmed',
        'gave_up',
      ];
      expect(statuses).toHaveLength(5);
    });
  });

  describe('migrations x types concordance (ARQ-01/ARQ-07)', () => {
    // The previous version of this block asserted SIX SundayExceptionReason values
    // while the type has SEVEN — and passed, because it compared a literal list
    // against itself. This version parses BOTH sides from their sources of truth:
    // the CHECK constraints in supabase/migrations (latest definition wins) and
    // the union members in src/types/database.ts.
    const repoRoot = join(__dirname, '..', '..');

    function latestCheckValues(table: string, column: string): string[] {
      const dir = join(repoRoot, 'supabase', 'migrations');
      const files = readdirSync(dir).filter((f: string) => f.endsWith('.sql')).sort();
      let values: string[] | null = null;
      for (const file of files) {
        const sql = readFileSync(join(dir, file), 'utf8');
        const sectionRe = /(?:CREATE TABLE|ALTER TABLE)\s+(?:public\.)?(\w+)/g;
        const starts: { table: string; index: number }[] = [];
        let sm: RegExpExecArray | null;
        while ((sm = sectionRe.exec(sql)) !== null) starts.push({ table: sm[1], index: sm.index });
        for (let i = 0; i < starts.length; i++) {
          if (starts[i].table !== table) continue;
          const section = sql.slice(starts[i].index, i + 1 < starts.length ? starts[i + 1].index : undefined);
          const checkRe = new RegExp(`CHECK \\(\\s*${column} IN \\(([^)]*)\\)`, 'g');
          let cm: RegExpExecArray | null;
          while ((cm = checkRe.exec(section)) !== null) {
            values = cm[1].split(',').map((v) => v.trim().replace(/^'|'$/g, ''));
          }
        }
      }
      if (values === null) throw new Error(`no CHECK found for ${table}.${column}`);
      return values;
    }

    function unionMembers(typeName: string): string[] {
      const ts = readFileSync(join(repoRoot, 'src', 'types', 'database.ts'), 'utf8');
      const m = new RegExp(`export type ${typeName} =([^;]+);`).exec(ts);
      if (!m) throw new Error(`type ${typeName} not found`);
      return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
    }

    const pairs: [string, string, string][] = [
      ['sunday_exceptions', 'reason', 'SundayExceptionReason'],
      ['speeches', 'status', 'SpeechStatus'],
      ['invitations', 'role', 'Role'],
      ['notification_queue', 'type', 'NotificationType'],
      ['notification_queue', 'target_role', 'NotificationTargetRole'],
      ['notification_queue', 'status', 'NotificationStatus'],
    ];

    for (const [table, column, typeName] of pairs) {
      it(`${typeName} matches the latest ${table}.${column} CHECK`, () => {
        expect(unionMembers(typeName).sort()).toEqual(latestCheckValues(table, column).sort());
      });
    }
  });

  describe('NotificationType type', () => {
    it('should define all 6 notification types matching migration CHECK constraint', () => {
      const types: NotificationType[] = [
        'designation',
        'weekly_assignment',
        'weekly_confirmation',
        'speaker_confirmed',
        'speaker_withdrew',
        'secretary_review',
      ];
      expect(types).toHaveLength(6);
    });
  });

  describe('NotificationTargetRole type', () => {
    it('should define all 3 target roles matching migration CHECK constraint', () => {
      const roles: NotificationTargetRole[] = [
        'secretary',
        'bishopric',
        'secretary_and_bishopric',
      ];
      expect(roles).toHaveLength(3);
    });
  });

  describe('NotificationStatus type', () => {
    it('should define all 3 statuses matching migration CHECK constraint', () => {
      const statuses: NotificationStatus[] = ['pending', 'sent', 'cancelled'];
      expect(statuses).toHaveLength(3);
    });
  });

  describe('Table type shapes', () => {
    it('should construct a valid Ward object', () => {
      const ward: Ward = {
        id: 'uuid-1',
        name: 'Ala Central',
        stake_name: 'Estaca Sao Paulo',
        language: 'pt-BR',
        timezone: 'America/Sao_Paulo',
        whatsapp_template_speech_1: null,
        whatsapp_template_speech_2: null,
        whatsapp_template_speech_3: null,
        manage_prayers: false,
        whatsapp_template_opening_prayer: null,
        whatsapp_template_closing_prayer: null,
        whatsapp_template_delegation_wrapper: null,
        designation_template_sustain: null,
        designation_template_release: null,
        designation_template_priesthood: null,
        designation_template_new_member: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(ward.id).toBeDefined();
      expect(ward.name).toBe('Ala Central');
      expect(ward.whatsapp_template_speech_1).toBeNull();
    });

    it('should construct a valid Member object', () => {
      const member: Member = {
        id: 'uuid-2',
        ward_id: 'uuid-1',
        full_name: 'Joao da Silva',
        informal_name: null,
        country_code: '+55',
        phone: '11999990000',
        can_preside: false,
        can_conduct: false,
        can_lead_music: false,
        can_play_piano: false,
        can_be_recognized: false,
        contact_via_responsible: false,
        responsible_id: null,
        calling: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(member.ward_id).toBe('uuid-1');
      expect(member.phone).toBe('11999990000');
    });

    it('should allow null phone on Member', () => {
      const member: Member = {
        id: 'uuid-2',
        ward_id: 'uuid-1',
        full_name: 'Maria Santos',
        informal_name: null,
        country_code: '+55',
        phone: null,
        can_preside: false,
        can_conduct: false,
        can_lead_music: false,
        can_play_piano: false,
        can_be_recognized: false,
        contact_via_responsible: false,
        responsible_id: null,
        calling: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(member.phone).toBeNull();
    });

    it('should construct a valid Speech object with all statuses', () => {
      const statuses: SpeechStatus[] = [
        'not_assigned',
        'assigned_not_invited',
        'assigned_invited',
        'assigned_confirmed',
        'gave_up',
      ];

      for (const status of statuses) {
        const speech: Speech = {
          id: 'uuid-3',
          ward_id: 'uuid-1',
          sunday_date: '2026-02-15',
          position: 1,
          member_id: null,
          speaker_name: null,
          speaker_informal_name: null,
          speaker_phone: null,
          topic_title: null,
          topic_link: null,
          topic_collection: null,
          assigned_by_role: null,
          status,
          contact_phone: null,
          is_delegated: false,
          delegate_for_name: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        };
        expect(speech.status).toBe(status);
      }
    });

    it('should construct a valid SundayAgenda with all nullable fields', () => {
      const agenda: SundayAgenda = {
        id: 'uuid-4',
        ward_id: 'uuid-1',
        sunday_date: '2026-02-15',
        presiding_name: null,
        conducting_name: null,
        recognized_names: null,
        welcome_new_families: null,
        announcements: null,
        pianist_name: null,
        conductor_name: null,
        opening_hymn_id: null,
        opening_prayer_member_id: null,
        opening_prayer_name: null,
        designations: [],
        has_baby_blessing: false,
        baby_blessing_names: null,
        has_baptism_confirmation: false,
        baptism_confirmation_names: null,
        has_stake_announcements: false,
        sacrament_hymn_id: null,
        has_special_presentation: false,
        special_presentation_description: null,
        intermediate_hymn_id: null,
        closing_hymn_id: null,
        closing_prayer_member_id: null,
        closing_prayer_name: null,
        attendance: null,
        has_second_speech: true,
        has_intermediate_hymn: true,
        speaker_1_override: null,
        speaker_2_override: null,
        speaker_3_override: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(agenda.has_baby_blessing).toBe(false);
      expect(agenda.presiding_name).toBeNull();
    });

    it('should construct a valid Invitation object', () => {
      const invitation: Invitation = {
        id: 'uuid-5',
        ward_id: 'uuid-1',
        email: 'test@example.com',
        role: 'secretary',
        token: 'abc-token-123',
        expires_at: '2026-03-01T00:00:00Z',
        used_at: null,
        created_by: 'uuid-user',
        created_at: '2026-01-01T00:00:00Z',
      };
      expect(invitation.role).toBe('secretary');
      expect(invitation.used_at).toBeNull();
    });

    it('should construct a valid Hymn object', () => {
      const hymn: Hymn = {
        id: 'uuid-6',
        language: 'pt-BR',
        number: 123,
        title: 'Hino Exemplo',
        is_sacramental: true,
      };
      expect(hymn.is_sacramental).toBe(true);
      expect(hymn.number).toBe(123);
    });

    it('should construct a valid NotificationQueue object', () => {
      const notif: NotificationQueue = {
        id: 'uuid-8',
        ward_id: 'uuid-1',
        type: 'designation',
        sunday_date: '2026-02-15',
        speech_position: 1,
        speaker_name: 'Joao',
        target_role: 'secretary',
        status: 'pending',
        send_after: '2026-02-10T00:00:00Z',
        topic_title: null,
        created_at: '2026-01-01T00:00:00Z',
      };
      expect(notif.type).toBe('designation');
      expect(notif.status).toBe('pending');
    });
  });

  describe('Composite / View types', () => {
    it('should construct a valid TopicWithCollection', () => {
      const topic: TopicWithCollection = {
        id: 'uuid-9',
        title: 'My Topic',
        link: 'https://example.com',
        collection: 'Temas da Ala',
        type: 'ward',
      };
      expect(topic.type).toBe('ward');

      const generalTopic: TopicWithCollection = {
        id: 'uuid-10',
        title: 'General Topic',
        link: null,
        collection: 'General Conference 2024',
        type: 'general',
      };
      expect(generalTopic.type).toBe('general');
      expect(generalTopic.link).toBeNull();
    });

    it('should construct a valid SpeechBySunday', () => {
      const sbs: SpeechBySunday = {
        date: '2026-02-15',
        exception: null,
        speeches: [],
      };
      expect(sbs.exception).toBeNull();
      expect(sbs.speeches).toHaveLength(0);
    });

    it('should construct a valid DateRange', () => {
      const range: DateRange = {
        start: '2026-02-01',
        end: '2026-02-28',
      };
      expect(range.start).toBe('2026-02-01');
    });
  });

  describe('Input types', () => {
    it('should construct a valid CreateMemberInput with optional phone', () => {
      const input1: CreateMemberInput = {
        full_name: 'Test User',
        country_code: '+55',
        phone: '11999990000',
      };
      expect(input1.phone).toBe('11999990000');

      const input2: CreateMemberInput = {
        full_name: 'Test User 2',
        country_code: '+55',
      };
      expect(input2.phone).toBeUndefined();
    });

    it('should construct a valid UpdateMemberInput with partial fields', () => {
      const input: UpdateMemberInput = {
        id: 'uuid-1',
        full_name: 'Updated Name',
      };
      expect(input.id).toBe('uuid-1');
      expect(input.country_code).toBeUndefined();
    });

    it('should construct a valid ImportResult', () => {
      const result: ImportResult = {
        imported: 10,
        deleted: 3,
      };
      expect(result.imported).toBe(10);
      expect(result.deleted).toBe(3);
    });
  });
});

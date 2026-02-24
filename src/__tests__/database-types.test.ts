import { describe, it, expect } from 'vitest';
import type {
  Role,
  Permission,
  SpeechStatus,
  SundayExceptionReason,
  NotificationType,
  NotificationTargetRole,
  NotificationStatus,
  Ward,
  Member,
  WardTopic,
  GeneralCollection,
  GeneralTopic,
  WardCollectionConfig,
  SundayException,
  Speech,
  MeetingActor,
  Hymn,
  SundayAgenda,
  ActivityLog,
  Invitation,
  DevicePushToken,
  NotificationQueue,
  TopicWithCollection,
  SpeechBySunday,
  DateRange,
  CreateMemberInput,
  UpdateMemberInput,
  CreateTopicInput,
  CreateActorInput,
  UpdateActorInput,
  ImportResult,
} from '../types/database';

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
    it('should define exactly 23 permissions', () => {
      const permissions: Permission[] = [
        'speech:assign',
        'speech:unassign',
        'speech:change_status',
        'member:read',
        'member:write',
        'member:import',
        'topic:write',
        'collection:toggle',
        'sunday_type:write',
        'settings:access',
        'settings:language',
        'settings:whatsapp',
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
      expect(permissions).toHaveLength(23);
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

  describe('SundayExceptionReason type', () => {
    it('should define all 6 exception reasons matching migration CHECK constraint', () => {
      const reasons: SundayExceptionReason[] = [
        'testimony_meeting',
        'general_conference',
        'stake_conference',
        'ward_conference',
        'primary_presentation',
        'other',
      ];
      expect(reasons).toHaveLength(6);
    });
  });

  describe('NotificationType type', () => {
    it('should define all 5 notification types matching migration CHECK constraint', () => {
      const types: NotificationType[] = [
        'designation',
        'weekly_assignment',
        'weekly_confirmation',
        'speaker_confirmed',
        'speaker_withdrew',
      ];
      expect(types).toHaveLength(5);
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
        country_code: '+55',
        phone: '11999990000',
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
        country_code: '+55',
        phone: null,
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
          speaker_phone: null,
          topic_title: null,
          topic_link: null,
          topic_collection: null,
          status,
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
        presiding_actor_id: null,
        conducting_name: null,
        conducting_actor_id: null,
        recognized_names: null,
        announcements: null,
        pianist_name: null,
        pianist_actor_id: null,
        conductor_name: null,
        conductor_actor_id: null,
        opening_hymn_id: null,
        opening_prayer_member_id: null,
        opening_prayer_name: null,
        sustaining_releasing: null,
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

    it('should construct a valid MeetingActor object', () => {
      const actor: MeetingActor = {
        id: 'uuid-7',
        ward_id: 'uuid-1',
        name: 'Bispo Fulano',
        can_preside: true,
        can_conduct: true,
        can_recognize: false,
        can_pianist: false,
        can_conductor: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(actor.can_preside).toBe(true);
      expect(actor.can_pianist).toBe(false);
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

    it('should construct a valid CreateActorInput with optional booleans', () => {
      const input1: CreateActorInput = {
        name: 'New Actor',
        can_preside: true,
      };
      expect(input1.can_preside).toBe(true);
      expect(input1.can_conduct).toBeUndefined();

      const input2: CreateActorInput = {
        name: 'Minimal Actor',
      };
      expect(input2.can_preside).toBeUndefined();
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

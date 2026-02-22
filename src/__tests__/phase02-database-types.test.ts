import { describe, it, expect } from 'vitest';
import type {
  WardTopic,
  GeneralCollection,
  GeneralTopic,
  WardCollectionConfig,
  SundayException,
  MeetingActor,
  Hymn,
  SundayAgenda,
  TopicWithCollection,
  CreateTopicInput,
  CreateActorInput,
  UpdateActorInput,
  SundayExceptionReason,
} from '../types/database';

/**
 * PHASE-02 specific type validation tests.
 * Verifies that TypeScript types match the database schema for all PHASE-02 entities.
 */

describe('PHASE-02: Database type validation', () => {
  describe('WardTopic type', () => {
    it('should have all required fields', () => {
      const topic: WardTopic = {
        id: 'uuid-1',
        ward_id: 'ward-1',
        title: 'Faith in Jesus Christ',
        link: 'https://example.com',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(topic.id).toBeDefined();
      expect(topic.ward_id).toBeDefined();
      expect(topic.title).toBeDefined();
      expect(topic.created_at).toBeDefined();
    });

    it('should allow null link', () => {
      const topic: WardTopic = {
        id: 'uuid-1',
        ward_id: 'ward-1',
        title: 'Topic without link',
        link: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(topic.link).toBeNull();
    });
  });

  describe('GeneralCollection type', () => {
    it('should have id, name, and language', () => {
      const collection: GeneralCollection = {
        id: 'uuid-1',
        name: 'General Conference Oct 2025',
        language: 'pt-BR',
      };
      expect(collection.id).toBeDefined();
      expect(collection.name).toBeDefined();
      expect(collection.language).toBe('pt-BR');
    });
  });

  describe('GeneralTopic type', () => {
    it('should reference a collection via collection_id', () => {
      const topic: GeneralTopic = {
        id: 'uuid-1',
        collection_id: 'collection-1',
        title: 'A talk from conference',
        link: 'https://churchofjesuschrist.org/talk/123',
      };
      expect(topic.collection_id).toBeDefined();
      expect(topic.link).not.toBeNull();
    });

    it('should allow null link', () => {
      const topic: GeneralTopic = {
        id: 'uuid-1',
        collection_id: 'collection-1',
        title: 'Topic without link',
        link: null,
      };
      expect(topic.link).toBeNull();
    });
  });

  describe('WardCollectionConfig type', () => {
    it('should track ward-collection activation status', () => {
      const config: WardCollectionConfig = {
        id: 'uuid-1',
        ward_id: 'ward-1',
        collection_id: 'collection-1',
        active: true,
      };
      expect(config.active).toBe(true);
      expect(config.ward_id).toBeDefined();
      expect(config.collection_id).toBeDefined();
    });
  });

  describe('SundayException type', () => {
    it('should have ward_id, date, and reason', () => {
      const exception: SundayException = {
        id: 'uuid-1',
        ward_id: 'ward-1',
        date: '2026-04-05',
        reason: 'general_conference',
      };
      expect(exception.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(exception.reason).toBe('general_conference');
    });

    it('should accept all 6 valid SundayExceptionReason values', () => {
      const reasons: SundayExceptionReason[] = [
        'testimony_meeting',
        'general_conference',
        'stake_conference',
        'ward_conference',
        'primary_presentation',
        'other',
      ];
      expect(reasons).toHaveLength(6);
      reasons.forEach((reason) => {
        const exception: SundayException = {
          id: 'uuid',
          ward_id: 'ward',
          date: '2026-01-04',
          reason,
        };
        expect(exception.reason).toBe(reason);
      });
    });
  });

  describe('MeetingActor type', () => {
    it('should have name and five role boolean flags', () => {
      const actor: MeetingActor = {
        id: 'uuid-1',
        ward_id: 'ward-1',
        name: 'Bishop Name',
        can_preside: true,
        can_conduct: true,
        can_recognize: false,
        can_pianist: false,
        can_conductor: false,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      expect(actor.can_preside).toBe(true);
      expect(actor.can_conduct).toBe(true);
      expect(actor.can_recognize).toBe(false);
      expect(actor.can_pianist).toBe(false);
    });
  });

  describe('Hymn type', () => {
    it('should have language, number, title, and is_sacramental', () => {
      const hymn: Hymn = {
        id: 'uuid-1',
        language: 'pt-BR',
        number: 123,
        title: 'Conta as Bencaos',
        is_sacramental: false,
      };
      expect(hymn.number).toBe(123);
      expect(typeof hymn.is_sacramental).toBe('boolean');
    });

    it('should mark sacramental hymns correctly', () => {
      const sacramental: Hymn = {
        id: 'uuid-1',
        language: 'pt-BR',
        number: 196,
        title: 'Ao Findar o Dia',
        is_sacramental: true,
      };
      expect(sacramental.is_sacramental).toBe(true);
    });
  });

  describe('SundayAgenda type', () => {
    it('should have all actor reference fields (id + name snapshot)', () => {
      const agenda: SundayAgenda = {
        id: 'uuid-1',
        ward_id: 'ward-1',
        sunday_date: '2026-02-15',
        presiding_name: 'Bishop Smith',
        presiding_actor_id: 'actor-1',
        conducting_name: 'Counselor Jones',
        conducting_actor_id: 'actor-2',
        recognized_names: ['Visitor A', 'Visitor B'],
        announcements: 'Ward picnic next Saturday',
        pianist_name: 'Sister Piano',
        pianist_actor_id: 'actor-3',
        conductor_name: 'Brother Music',
        conductor_actor_id: 'actor-4',
        opening_hymn_id: 'hymn-1',
        opening_prayer_member_id: 'member-1',
        opening_prayer_name: 'Brother Prayer',
        sustaining_releasing: null,
        has_baby_blessing: false,
        baby_blessing_names: null,
        has_baptism_confirmation: false,
        baptism_confirmation_names: null,
        has_stake_announcements: false,
        sacrament_hymn_id: 'hymn-2',
        has_special_presentation: false,
        special_presentation_description: null,
        intermediate_hymn_id: null,
        closing_hymn_id: 'hymn-3',
        closing_prayer_member_id: 'member-2',
        closing_prayer_name: 'Sister Closing',
        has_second_speech: true,
        has_intermediate_hymn: true,
        speaker_1_override: null,
        speaker_2_override: null,
        speaker_3_override: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };
      // Actor references: both ID (FK) and name (snapshot)
      expect(agenda.presiding_actor_id).toBeDefined();
      expect(agenda.presiding_name).toBeDefined();
      expect(agenda.conducting_actor_id).toBeDefined();
      expect(agenda.conducting_name).toBeDefined();
      // Prayer references: member_id (FK) + name (snapshot)
      expect(agenda.opening_prayer_member_id).toBeDefined();
      expect(agenda.opening_prayer_name).toBeDefined();
      // Hymn references: FK only (not snapshot)
      expect(agenda.opening_hymn_id).toBeDefined();
      expect(agenda.sacrament_hymn_id).toBeDefined();
    });

    it('should allow all optional fields to be null', () => {
      const emptyAgenda: SundayAgenda = {
        id: 'uuid-1',
        ward_id: 'ward-1',
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
      expect(emptyAgenda.presiding_name).toBeNull();
      expect(emptyAgenda.opening_hymn_id).toBeNull();
    });
  });

  describe('TopicWithCollection composite type', () => {
    it('should include collection name and type discriminator', () => {
      const wardTopic: TopicWithCollection = {
        id: 'uuid-1',
        title: 'My Topic',
        link: null,
        collection: 'Temas da Ala',
        type: 'ward',
      };
      expect(wardTopic.type).toBe('ward');
      expect(wardTopic.collection).toBe('Temas da Ala');

      const generalTopic: TopicWithCollection = {
        id: 'uuid-2',
        title: 'Conference Talk',
        link: 'https://example.com',
        collection: 'General Conference Oct 2025',
        type: 'general',
      };
      expect(generalTopic.type).toBe('general');
    });
  });

  describe('Input types for mutations', () => {
    it('CreateTopicInput requires title, optional link', () => {
      const input: CreateTopicInput = { title: 'New Topic' };
      expect(input.title).toBe('New Topic');
      expect(input.link).toBeUndefined();

      const withLink: CreateTopicInput = { title: 'Topic', link: 'https://example.com' };
      expect(withLink.link).toBe('https://example.com');
    });

    it('CreateActorInput requires name, optional role flags', () => {
      const minimal: CreateActorInput = { name: 'Actor' };
      expect(minimal.name).toBe('Actor');
      expect(minimal.can_preside).toBeUndefined();

      const full: CreateActorInput = {
        name: 'Bishop',
        can_preside: true,
        can_conduct: true,
        can_recognize: false,
        can_pianist: false,
        can_conductor: false,
      };
      expect(full.can_preside).toBe(true);
    });

    it('UpdateActorInput requires id, all other fields optional', () => {
      const minimal: UpdateActorInput = { id: 'actor-1' };
      expect(minimal.id).toBe('actor-1');

      const partial: UpdateActorInput = { id: 'actor-1', name: 'New Name' };
      expect(partial.name).toBe('New Name');
      expect(partial.can_preside).toBeUndefined();
    });
  });
});

-- 001_initial_schema.sql
-- Creates all tables for the Sacrament Meeting Planner

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- WARDS
-- =============================================================================
CREATE TABLE wards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  stake_name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'pt-BR',
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  whatsapp_template TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stake_name, name)
);

-- =============================================================================
-- MEMBERS
-- =============================================================================
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT '+55',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ward_id, country_code, phone)
);

CREATE INDEX idx_members_ward_id ON members(ward_id);

-- =============================================================================
-- WARD TOPICS
-- =============================================================================
CREATE TABLE ward_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ward_topics_ward_id ON ward_topics(ward_id);

-- =============================================================================
-- GENERAL COLLECTIONS (global, per language)
-- =============================================================================
CREATE TABLE general_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  language TEXT NOT NULL
);

-- =============================================================================
-- GENERAL TOPICS (global, linked to collection)
-- =============================================================================
CREATE TABLE general_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES general_collections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  link TEXT
);

CREATE INDEX idx_general_topics_collection_id ON general_topics(collection_id);

-- =============================================================================
-- WARD COLLECTION CONFIG (ward-level activation of global collections)
-- =============================================================================
CREATE TABLE ward_collection_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES general_collections(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (ward_id, collection_id)
);

CREATE INDEX idx_ward_collection_config_ward_id ON ward_collection_config(ward_id);

-- =============================================================================
-- SUNDAY EXCEPTIONS
-- =============================================================================
CREATE TABLE sunday_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'testimony_meeting',
    'general_conference',
    'stake_conference',
    'ward_conference',
    'fast_sunday',
    'special_program',
    'no_meeting'
  )),
  UNIQUE (ward_id, date),
  CHECK (EXTRACT(DOW FROM date) = 0) -- Must be a Sunday (0 = Sunday in PostgreSQL)
);

CREATE INDEX idx_sunday_exceptions_ward_id ON sunday_exceptions(ward_id);
CREATE INDEX idx_sunday_exceptions_date ON sunday_exceptions(ward_id, date);

-- =============================================================================
-- SPEECHES
-- =============================================================================
CREATE TABLE speeches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  sunday_date DATE NOT NULL,
  position SMALLINT NOT NULL CHECK (position IN (1, 2, 3)),
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  speaker_name TEXT,
  speaker_phone TEXT,
  topic_title TEXT,
  topic_link TEXT,
  topic_collection TEXT,
  status TEXT NOT NULL DEFAULT 'not_assigned' CHECK (status IN (
    'not_assigned',
    'assigned_not_invited',
    'assigned_invited',
    'assigned_confirmed',
    'gave_up'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ward_id, sunday_date, position)
);

CREATE INDEX idx_speeches_ward_id ON speeches(ward_id);
CREATE INDEX idx_speeches_sunday_date ON speeches(ward_id, sunday_date);

-- =============================================================================
-- MEETING ACTORS
-- =============================================================================
CREATE TABLE meeting_actors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  can_preside BOOLEAN NOT NULL DEFAULT false,
  can_conduct BOOLEAN NOT NULL DEFAULT false,
  can_recognize BOOLEAN NOT NULL DEFAULT false,
  can_music BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meeting_actors_ward_id ON meeting_actors(ward_id);

-- =============================================================================
-- HYMNS (global, per language)
-- =============================================================================
CREATE TABLE hymns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  language TEXT NOT NULL,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  is_sacramental BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (language, number)
);

-- =============================================================================
-- SUNDAY AGENDAS
-- =============================================================================
CREATE TABLE sunday_agendas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  sunday_date DATE NOT NULL,
  -- Welcome & Announcements
  presiding_name TEXT,
  presiding_actor_id UUID REFERENCES meeting_actors(id) ON DELETE SET NULL,
  conducting_name TEXT,
  conducting_actor_id UUID REFERENCES meeting_actors(id) ON DELETE SET NULL,
  recognized_names TEXT[],
  announcements TEXT,
  pianist_name TEXT,
  pianist_actor_id UUID REFERENCES meeting_actors(id) ON DELETE SET NULL,
  conductor_name TEXT,
  conductor_actor_id UUID REFERENCES meeting_actors(id) ON DELETE SET NULL,
  opening_hymn_id UUID REFERENCES hymns(id) ON DELETE SET NULL,
  opening_prayer_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  opening_prayer_name TEXT,
  -- Designations & Sacrament
  sustaining_releasing TEXT,
  has_baby_blessing BOOLEAN NOT NULL DEFAULT false,
  baby_blessing_names TEXT,
  has_baptism_confirmation BOOLEAN NOT NULL DEFAULT false,
  baptism_confirmation_names TEXT,
  has_stake_announcements BOOLEAN NOT NULL DEFAULT false,
  sacrament_hymn_id UUID REFERENCES hymns(id) ON DELETE SET NULL,
  -- Speeches
  has_special_presentation BOOLEAN NOT NULL DEFAULT false,
  special_presentation_description TEXT,
  intermediate_hymn_id UUID REFERENCES hymns(id) ON DELETE SET NULL,
  -- Closing
  closing_hymn_id UUID REFERENCES hymns(id) ON DELETE SET NULL,
  closing_prayer_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  closing_prayer_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ward_id, sunday_date)
);

CREATE INDEX idx_sunday_agendas_ward_id ON sunday_agendas(ward_id);

-- =============================================================================
-- ACTIVITY LOG
-- =============================================================================
CREATE TABLE activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_ward_id ON activity_log(ward_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(ward_id, created_at DESC);

-- =============================================================================
-- INVITATIONS
-- =============================================================================
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('bishopric', 'secretary', 'observer')),
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_ward_id ON invitations(ward_id);

-- =============================================================================
-- DEVICE PUSH TOKENS
-- =============================================================================
CREATE TABLE device_push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, expo_push_token)
);

CREATE INDEX idx_device_push_tokens_user_id ON device_push_tokens(user_id);
CREATE INDEX idx_device_push_tokens_ward_id ON device_push_tokens(ward_id);

-- =============================================================================
-- NOTIFICATION QUEUE
-- =============================================================================
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ward_id UUID NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'designation',
    'weekly_assignment',
    'weekly_confirmation',
    'speaker_confirmed',
    'speaker_withdrew'
  )),
  sunday_date DATE NOT NULL,
  speech_position SMALLINT,
  speaker_name TEXT,
  target_role TEXT NOT NULL CHECK (target_role IN (
    'secretary',
    'bishopric',
    'secretary_and_bishopric'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'sent',
    'cancelled'
  )),
  send_after TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_queue_ward_id ON notification_queue(ward_id);
CREATE INDEX idx_notification_queue_pending ON notification_queue(status, send_after)
  WHERE status = 'pending';

-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at column
CREATE TRIGGER set_updated_at BEFORE UPDATE ON wards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON ward_topics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON speeches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON meeting_actors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON sunday_agendas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON device_push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

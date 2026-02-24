/**
 * Database type definitions for all Supabase tables.
 * These types mirror the PostgreSQL schema defined in migrations.
 */

// --- Roles & Permissions ---

export type Role = 'bishopric' | 'secretary' | 'observer';

export type Permission =
  | 'speech:assign'
  | 'speech:unassign'
  | 'speech:change_status'
  | 'member:read'
  | 'member:write'
  | 'member:import'
  | 'topic:write'
  | 'collection:toggle'
  | 'sunday_type:write'
  | 'settings:access'
  | 'settings:language'
  | 'settings:whatsapp'
  | 'settings:timezone'
  | 'settings:users'
  | 'invite:manage'
  | 'home:next_assignments'
  | 'home:invite_mgmt'
  | 'agenda:read'
  | 'agenda:write'
  | 'agenda:assign_speaker'
  | 'presentation:start'
  | 'push:receive'
  | 'invitation:create'
  | 'history:read';

// --- Speech Status ---

export type SpeechStatus =
  | 'not_assigned'
  | 'assigned_not_invited'
  | 'assigned_invited'
  | 'assigned_confirmed'
  | 'gave_up';

// --- Sunday Exception Reasons ---

export type SundayExceptionReason =
  | 'speeches'
  | 'testimony_meeting'
  | 'general_conference'
  | 'stake_conference'
  | 'ward_conference'
  | 'primary_presentation'
  | 'other';

// --- Notification Types ---

export type NotificationType =
  | 'designation'
  | 'weekly_assignment'
  | 'weekly_confirmation'
  | 'speaker_confirmed'
  | 'speaker_withdrew';

export type NotificationTargetRole =
  | 'secretary'
  | 'bishopric'
  | 'secretary_and_bishopric';

export type NotificationStatus = 'pending' | 'sent' | 'cancelled';

// --- Table Types ---

export interface Ward {
  id: string;
  name: string;
  stake_name: string;
  language: string;
  timezone: string;
  whatsapp_template: string | null;
  manage_prayers: boolean;
  whatsapp_template_opening_prayer: string | null;
  whatsapp_template_closing_prayer: string | null;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  ward_id: string;
  full_name: string;
  country_code: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface WardTopic {
  id: string;
  ward_id: string;
  title: string;
  link: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneralCollection {
  id: string;
  name: string;
  language: string;
}

export interface GeneralTopic {
  id: string;
  collection_id: string;
  title: string;
  link: string | null;
}

export interface WardCollectionConfig {
  id: string;
  ward_id: string;
  collection_id: string;
  active: boolean;
}

export interface SundayException {
  id: string;
  ward_id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  reason: SundayExceptionReason;
  custom_reason?: string | null;
}

export interface Speech {
  id: string;
  ward_id: string;
  sunday_date: string; // ISO date string (YYYY-MM-DD)
  position: number; // 0, 1, 2, 3, or 4
  member_id: string | null;
  speaker_name: string | null;
  speaker_phone: string | null;
  topic_title: string | null;
  topic_link: string | null;
  topic_collection: string | null;
  status: SpeechStatus;
  created_at: string;
  updated_at: string;
}

export interface MeetingActor {
  id: string;
  ward_id: string;
  name: string;
  can_preside: boolean;
  can_conduct: boolean;
  can_recognize: boolean;
  can_pianist: boolean;
  can_conductor: boolean;
  created_at: string;
  updated_at: string;
}

export interface Hymn {
  id: string;
  language: string;
  number: number;
  title: string;
  is_sacramental: boolean;
}

export interface SundayAgenda {
  id: string;
  ward_id: string;
  sunday_date: string; // ISO date string (YYYY-MM-DD)
  // Welcome
  presiding_name: string | null;
  presiding_actor_id: string | null;
  conducting_name: string | null;
  conducting_actor_id: string | null;
  recognized_names: string[] | null;
  announcements: string | null;
  pianist_name: string | null;
  pianist_actor_id: string | null;
  conductor_name: string | null;
  conductor_actor_id: string | null;
  opening_hymn_id: string | null;
  opening_prayer_member_id: string | null;
  opening_prayer_name: string | null;
  // Designations & Sacrament
  sustaining_releasing: string | null;
  has_baby_blessing: boolean;
  baby_blessing_names: string | null;
  has_baptism_confirmation: boolean;
  baptism_confirmation_names: string | null;
  has_stake_announcements: boolean;
  sacrament_hymn_id: string | null;
  // Speeches
  has_special_presentation: boolean;
  has_intermediate_hymn: boolean;
  special_presentation_description: string | null;
  intermediate_hymn_id: string | null;
  // Speaker overrides (last-minute swap)
  speaker_1_override: string | null;
  speaker_2_override: string | null;
  speaker_3_override: string | null;
  // Optional 2nd speech toggle
  has_second_speech: boolean;
  // Closing
  closing_hymn_id: string | null;
  closing_prayer_member_id: string | null;
  closing_prayer_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  ward_id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  action_type: string;
  description: string;
  created_at: string;
}

export interface Invitation {
  id: string;
  ward_id: string;
  email: string;
  role: Role;
  token: string;
  expires_at: string;
  used_at: string | null;
  created_by: string;
  created_at: string;
}

export interface DevicePushToken {
  id: string;
  user_id: string;
  ward_id: string;
  expo_push_token: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationQueue {
  id: string;
  ward_id: string;
  type: NotificationType;
  sunday_date: string; // ISO date string (YYYY-MM-DD)
  speech_position: number | null;
  speaker_name: string | null;
  target_role: NotificationTargetRole;
  status: NotificationStatus;
  send_after: string;
  created_at: string;
}

// --- Composite / View Types ---

/**
 * A topic that includes its source collection name.
 * Used in topic selector dropdowns.
 */
export interface TopicWithCollection {
  id: string;
  title: string;
  link: string | null;
  collection: string; // e.g., "Temas da Ala", "General Conference 2024"
  type: 'ward' | 'general';
}

/**
 * Speeches grouped by sunday date.
 */
export interface SpeechBySunday {
  date: string;
  exception: SundayException | null;
  speeches: Speech[];
}

/**
 * A date range for queries.
 */
export interface DateRange {
  start: string; // ISO date string
  end: string; // ISO date string
}

// --- Input Types (for mutations) ---

export interface CreateMemberInput {
  full_name: string;
  country_code: string;
  phone?: string | null;
}

export interface UpdateMemberInput {
  id: string;
  full_name?: string;
  country_code?: string;
  phone?: string | null;
}

export interface CreateTopicInput {
  title: string;
  link?: string | null;
}

export interface CreateActorInput {
  name: string;
  can_preside?: boolean;
  can_conduct?: boolean;
  can_recognize?: boolean;
  can_pianist?: boolean;
  can_conductor?: boolean;
}

export interface UpdateActorInput {
  id: string;
  name?: string;
  can_preside?: boolean;
  can_conduct?: boolean;
  can_recognize?: boolean;
  can_pianist?: boolean;
  can_conductor?: boolean;
}

export interface ImportResult {
  imported: number;
  deleted: number;
}

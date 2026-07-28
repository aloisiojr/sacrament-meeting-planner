-- Migration 037: unify actors + speakers into the members model (v2.0). DESTRUCTIVE.
-- Apply ONLY at the v2 cutover, after a DB backup + a short write-block window (docs/decisions/001).
-- Not auto-reversible (drops meeting_actors) → rollback = restore the pre-migration backup.

-- 1) Member capability flags + contact delegation.
ALTER TABLE members ADD COLUMN IF NOT EXISTS can_preside BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS can_conduct BOOLEAN NOT NULL DEFAULT false;       -- dirigir a reunião
ALTER TABLE members ADD COLUMN IF NOT EXISTS can_lead_music BOOLEAN NOT NULL DEFAULT false;    -- reger (was "conductor")
ALTER TABLE members ADD COLUMN IF NOT EXISTS can_play_piano BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS can_be_recognized BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS contact_via_responsible BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE members ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_responsible_not_self;
ALTER TABLE members ADD CONSTRAINT members_responsible_not_self
  CHECK (responsible_id IS NULL OR responsible_id <> id);

-- 2) Speech delegation snapshot (resolved contact captured at assignment time).
ALTER TABLE speeches ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE speeches ADD COLUMN IF NOT EXISTS is_delegated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE speeches ADD COLUMN IF NOT EXISTS delegate_for_name TEXT;

-- 3) Ward-level WhatsApp delegation wrapper template (NULL => locale default).
ALTER TABLE wards ADD COLUMN IF NOT EXISTS whatsapp_template_delegation_wrapper TEXT;

-- 4) Migrate meeting_actors (single `role`) into member capability flags.
--    Match existing members by normalized full_name within the ward (accents not normalized —
--    accent-only mismatches create a duplicate member, resolved by the user later, per spec).
UPDATE members m SET can_preside      = true FROM meeting_actors a WHERE a.role = 'preside'   AND a.ward_id = m.ward_id AND lower(trim(a.name)) = lower(trim(m.full_name));
UPDATE members m SET can_conduct      = true FROM meeting_actors a WHERE a.role = 'conduct'   AND a.ward_id = m.ward_id AND lower(trim(a.name)) = lower(trim(m.full_name));
UPDATE members m SET can_lead_music   = true FROM meeting_actors a WHERE a.role = 'conductor' AND a.ward_id = m.ward_id AND lower(trim(a.name)) = lower(trim(m.full_name));
UPDATE members m SET can_play_piano   = true FROM meeting_actors a WHERE a.role = 'pianist'   AND a.ward_id = m.ward_id AND lower(trim(a.name)) = lower(trim(m.full_name));
UPDATE members m SET can_be_recognized = true FROM meeting_actors a WHERE a.role = 'recognize' AND a.ward_id = m.ward_id AND lower(trim(a.name)) = lower(trim(m.full_name));

--    Create members for actors with no name match (union roles per name).
INSERT INTO members (ward_id, full_name, can_preside, can_conduct, can_lead_music, can_play_piano, can_be_recognized)
SELECT a.ward_id, a.name,
  bool_or(a.role = 'preside'),
  bool_or(a.role = 'conduct'),
  bool_or(a.role = 'conductor'),
  bool_or(a.role = 'pianist'),
  bool_or(a.role = 'recognize')
FROM meeting_actors a
WHERE NOT EXISTS (
  SELECT 1 FROM members m
  WHERE m.ward_id = a.ward_id AND lower(trim(m.full_name)) = lower(trim(a.name))
)
GROUP BY a.ward_id, a.name;

-- 5) Agenda actor assignments become snapshot-only: drop the FK columns, keep the *_name snapshots.
ALTER TABLE sunday_agendas
  DROP COLUMN IF EXISTS presiding_actor_id,
  DROP COLUMN IF EXISTS conducting_actor_id,
  DROP COLUMN IF EXISTS pianist_actor_id,
  DROP COLUMN IF EXISTS conductor_actor_id;

-- 6) Drop the meeting_actors table (its RLS policies drop with it).
DROP TABLE IF EXISTS meeting_actors;

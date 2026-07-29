-- Migration 039: add the member `calling` (chamado) field (v2.0).
-- ADDITIVE ONLY — safe for live v1.0 clients: adds a nullable TEXT column that older
-- clients simply ignore. No data is dropped and no existing column changes.
--
-- Also redefines the `import_members` RPC (from migration 038) to accept and persist an
-- optional `calling` per imported row, so the CSV full-dump import round-trips the field.
-- Stays DESTRUCTIVE (DELETE-ALL + INSERT) and SECURITY DEFINER, matching 038 exactly.
-- Apply at the v2 cutover (alongside migrations 037/038, with a DB backup).

ALTER TABLE members ADD COLUMN IF NOT EXISTS calling TEXT;

CREATE OR REPLACE FUNCTION import_members(
  target_ward_id uuid,
  new_members jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  member_count integer := 0;
  elem jsonb;
  new_id uuid;
  map_rec RECORD;
  resp_id uuid;
  match_count integer;
BEGIN
  -- Destructive replace: drop all current members for this ward.
  DELETE FROM members WHERE ward_id = target_ward_id;

  -- Temp map of inserted member -> the responsible full_name requested for it (pass 2 input).
  CREATE TEMP TABLE _import_resp_map (member_id uuid, responsible_name text) ON COMMIT DROP;

  -- Pass 1: insert every member with capabilities; responsible_id resolved in pass 2.
  FOR elem IN SELECT * FROM jsonb_array_elements(new_members)
  LOOP
    INSERT INTO members (
      ward_id, full_name, informal_name, country_code, phone,
      can_preside, can_conduct, can_lead_music, can_play_piano, can_be_recognized,
      calling
    )
    VALUES (
      target_ward_id,
      (elem->>'full_name')::text,
      COALESCE(
        NULLIF(TRIM((elem->>'informal_name')::text), ''),
        SPLIT_PART(TRIM((elem->>'full_name')::text), ' ', 1)
      ),
      (elem->>'country_code')::text,
      NULLIF((elem->>'phone')::text, ''),
      COALESCE((elem->>'can_preside')::boolean, false),
      COALESCE((elem->>'can_conduct')::boolean, false),
      COALESCE((elem->>'can_lead_music')::boolean, false),
      COALESCE((elem->>'can_play_piano')::boolean, false),
      COALESCE((elem->>'can_be_recognized')::boolean, false),
      NULLIF(TRIM((elem->>'calling')::text), '')
    )
    RETURNING id INTO new_id;

    member_count := member_count + 1;

    IF NULLIF(TRIM((elem->>'responsible_name')::text), '') IS NOT NULL THEN
      INSERT INTO _import_resp_map (member_id, responsible_name)
      VALUES (new_id, TRIM((elem->>'responsible_name')::text));
    END IF;
  END LOOP;

  -- Pass 2: resolve responsible names (case-insensitive, trimmed) within the ward.
  -- Only a UNIQUE, non-self match sets the delegation; ambiguous/unresolved are left NULL/false.
  FOR map_rec IN SELECT member_id, responsible_name FROM _import_resp_map
  LOOP
    SELECT count(*) INTO match_count
    FROM members r
    WHERE r.ward_id = target_ward_id
      AND r.id <> map_rec.member_id
      AND lower(trim(r.full_name)) = lower(trim(map_rec.responsible_name));

    IF match_count = 1 THEN
      SELECT r.id INTO resp_id
      FROM members r
      WHERE r.ward_id = target_ward_id
        AND r.id <> map_rec.member_id
        AND lower(trim(r.full_name)) = lower(trim(map_rec.responsible_name))
      LIMIT 1;

      UPDATE members
      SET responsible_id = resp_id,
          contact_via_responsible = true
      WHERE id = map_rec.member_id;
    END IF;
  END LOOP;

  RETURN member_count;
END;
$$;

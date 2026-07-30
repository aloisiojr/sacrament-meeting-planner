-- Migration 044: enforce role-based WRITE authorization at the database (P0-1 / ADR-005).
--
-- Before this, RLS write policies gated on ward_id only (no role), so an `observer` could
-- INSERT/UPDATE/DELETE all ward data via a direct client call, and `import_members` accepted a
-- caller-supplied target_ward_id with no ward/role check (cross-ward member wipe). This adds an
-- `public.can_write()` helper and requires it on every ward-scoped write policy, and hardens
-- import_members. SELECT policies are untouched (observers still read).
--
-- Backward-compatible: every user is created with app_metadata.role; `observer` is the only
-- read-only role, and both v1.x and v2 UIs already treat observers as read-only — so only explicit
-- observers lose direct writes (the intended fix). Apply to STAGING first (Phase B verification);
-- import_members guard is Phase A (prod-safe) but is included here as one migration.

-- =============================================================================
-- HELPER: writer? (role is present for every user; only 'observer' is read-only)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.can_write()
RETURNS boolean AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'observer') <> 'observer';
$$ LANGUAGE SQL STABLE;

-- Ward id from the caller's JWT. Kept in the PUBLIC schema (not auth): custom functions in the
-- `auth` schema can be wiped by Supabase auth-service upgrades — which is why public.current_ward_id() may be
-- missing. Mirrors public.current_ward_id() but returns NULL (not all-zeros) when absent, so a missing claim
-- denies writes rather than matching a sentinel ward.
CREATE OR REPLACE FUNCTION public.current_ward_id()
RETURNS uuid AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'ward_id')::uuid;
$$ LANGUAGE SQL STABLE;

-- =============================================================================
-- WARDS (UPDATE)
-- =============================================================================
DROP POLICY IF EXISTS "Users can update their own ward" ON wards;
CREATE POLICY "Users can update their own ward"
  ON wards FOR UPDATE TO authenticated
  USING (id = public.current_ward_id() AND public.can_write())
  WITH CHECK (id = public.current_ward_id() AND public.can_write());

-- =============================================================================
-- MEMBERS
-- =============================================================================
DROP POLICY IF EXISTS "Users can insert ward members" ON members;
CREATE POLICY "Users can insert ward members"
  ON members FOR INSERT TO authenticated
  WITH CHECK (ward_id = public.current_ward_id() AND public.can_write());

DROP POLICY IF EXISTS "Users can update ward members" ON members;
CREATE POLICY "Users can update ward members"
  ON members FOR UPDATE TO authenticated
  USING (ward_id = public.current_ward_id() AND public.can_write())
  WITH CHECK (ward_id = public.current_ward_id() AND public.can_write());

DROP POLICY IF EXISTS "Users can delete ward members" ON members;
CREATE POLICY "Users can delete ward members"
  ON members FOR DELETE TO authenticated
  USING (ward_id = public.current_ward_id() AND public.can_write());

-- =============================================================================
-- WARD TOPICS
-- =============================================================================
DROP POLICY IF EXISTS "Users can insert ward topics" ON ward_topics;
CREATE POLICY "Users can insert ward topics"
  ON ward_topics FOR INSERT TO authenticated
  WITH CHECK (ward_id = public.current_ward_id() AND public.can_write());

DROP POLICY IF EXISTS "Users can update ward topics" ON ward_topics;
CREATE POLICY "Users can update ward topics"
  ON ward_topics FOR UPDATE TO authenticated
  USING (ward_id = public.current_ward_id() AND public.can_write())
  WITH CHECK (ward_id = public.current_ward_id() AND public.can_write());

DROP POLICY IF EXISTS "Users can delete ward topics" ON ward_topics;
CREATE POLICY "Users can delete ward topics"
  ON ward_topics FOR DELETE TO authenticated
  USING (ward_id = public.current_ward_id() AND public.can_write());

-- =============================================================================
-- SUNDAY EXCEPTIONS
-- =============================================================================
DROP POLICY IF EXISTS "Users can insert sunday exceptions" ON sunday_exceptions;
CREATE POLICY "Users can insert sunday exceptions"
  ON sunday_exceptions FOR INSERT TO authenticated
  WITH CHECK (ward_id = public.current_ward_id() AND public.can_write());

DROP POLICY IF EXISTS "Users can update sunday exceptions" ON sunday_exceptions;
CREATE POLICY "Users can update sunday exceptions"
  ON sunday_exceptions FOR UPDATE TO authenticated
  USING (ward_id = public.current_ward_id() AND public.can_write())
  WITH CHECK (ward_id = public.current_ward_id() AND public.can_write());

DROP POLICY IF EXISTS "Users can delete sunday exceptions" ON sunday_exceptions;
CREATE POLICY "Users can delete sunday exceptions"
  ON sunday_exceptions FOR DELETE TO authenticated
  USING (ward_id = public.current_ward_id() AND public.can_write());

-- =============================================================================
-- SPEECHES
-- =============================================================================
DROP POLICY IF EXISTS "Users can insert ward speeches" ON speeches;
CREATE POLICY "Users can insert ward speeches"
  ON speeches FOR INSERT TO authenticated
  WITH CHECK (ward_id = public.current_ward_id() AND public.can_write());

DROP POLICY IF EXISTS "Users can update ward speeches" ON speeches;
CREATE POLICY "Users can update ward speeches"
  ON speeches FOR UPDATE TO authenticated
  USING (ward_id = public.current_ward_id() AND public.can_write())
  WITH CHECK (ward_id = public.current_ward_id() AND public.can_write());

DROP POLICY IF EXISTS "Users can delete ward speeches" ON speeches;
CREATE POLICY "Users can delete ward speeches"
  ON speeches FOR DELETE TO authenticated
  USING (ward_id = public.current_ward_id() AND public.can_write());

-- =============================================================================
-- SUNDAY AGENDAS (agenda + designations JSONB live here)
-- =============================================================================
DROP POLICY IF EXISTS "Users can insert ward agendas" ON sunday_agendas;
CREATE POLICY "Users can insert ward agendas"
  ON sunday_agendas FOR INSERT TO authenticated
  WITH CHECK (ward_id = public.current_ward_id() AND public.can_write());

DROP POLICY IF EXISTS "Users can update ward agendas" ON sunday_agendas;
CREATE POLICY "Users can update ward agendas"
  ON sunday_agendas FOR UPDATE TO authenticated
  USING (ward_id = public.current_ward_id() AND public.can_write())
  WITH CHECK (ward_id = public.current_ward_id() AND public.can_write());

DROP POLICY IF EXISTS "Users can delete ward agendas" ON sunday_agendas;
CREATE POLICY "Users can delete ward agendas"
  ON sunday_agendas FOR DELETE TO authenticated
  USING (ward_id = public.current_ward_id() AND public.can_write());

-- =============================================================================
-- INVITATIONS (create-invitation edge fn already enforces role; this is defense-in-depth)
-- =============================================================================
DROP POLICY IF EXISTS "Users can insert ward invitations" ON invitations;
CREATE POLICY "Users can insert ward invitations"
  ON invitations FOR INSERT TO authenticated
  WITH CHECK (ward_id = public.current_ward_id() AND public.can_write());

DROP POLICY IF EXISTS "Users can update ward invitations" ON invitations;
CREATE POLICY "Users can update ward invitations"
  ON invitations FOR UPDATE TO authenticated
  USING (ward_id = public.current_ward_id() AND public.can_write())
  WITH CHECK (ward_id = public.current_ward_id() AND public.can_write());

-- NOTE: activity_log INSERT stays open to all authenticated roles (any role may log its actions);
-- device_push_tokens stays user-scoped; SELECT policies everywhere are unchanged (observers read).

-- =============================================================================
-- import_members: reject cross-ward + non-writer callers (SECURITY DEFINER bypasses RLS)
-- =============================================================================
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
  -- Authorization: only a writer importing into their OWN ward. auth.jwt() reads the caller's
  -- request claims even though this function is SECURITY DEFINER.
  IF target_ward_id IS DISTINCT FROM public.current_ward_id() OR NOT public.can_write() THEN
    RAISE EXCEPTION 'not authorized to import members for this ward' USING ERRCODE = '42501';
  END IF;

  -- Destructive replace: drop all current members for this ward.
  DELETE FROM members WHERE ward_id = target_ward_id;

  -- Temp map of inserted member -> the responsible full_name requested for it (pass 2 input).
  CREATE TEMP TABLE _import_resp_map (member_id uuid, responsible_name text) ON COMMIT DROP;

  -- Pass 1: insert every member with capabilities; responsible_id resolved in pass 2.
  FOR elem IN SELECT * FROM jsonb_array_elements(new_members)
  LOOP
    INSERT INTO members (
      ward_id, full_name, informal_name, country_code, phone,
      can_preside, can_conduct, can_lead_music, can_play_piano, can_be_recognized
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
      COALESCE((elem->>'can_be_recognized')::boolean, false)
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

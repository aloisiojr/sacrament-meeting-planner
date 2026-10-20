-- Migration 060: CONF-07 — multi-table client transactions, server side.
-- NOT applied anywhere by this change (repo rule: verify against the DB, owner applies).
--
-- 1) apply_member_import: the incremental PDF-import merge (inserts + phone updates +
--    explicit removals) as ONE transaction. Idempotent by natural key: re-running the
--    same import never duplicates a member.
-- 2) Speech-snapshot cascade as a trigger on members, so a queued offline UPDATE replayed
--    by the offline queue cascades on the server in the same transaction — never a lone
--    UPDATE that skips it, and never a swallowed client-side "best-effort".
-- 3) delete_ward_if_no_auth_users: atomic "ward is empty" decision (row lock + recount in
--    one transaction) for delete-user, called AFTER the auth user is gone.

-- =============================================================================
-- 1) apply_member_import
-- =============================================================================

CREATE OR REPLACE FUNCTION public.apply_member_import(
  p_ward_id uuid,
  p_inserts jsonb DEFAULT '[]'::jsonb,
  p_phone_updates jsonb DEFAULT '[]'::jsonb,
  p_remove_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
  v_updated integer := 0;
  v_removed integer := 0;
  v_requested integer := 0;
BEGIN
  -- Same authorization as import_members (044): a writer importing into their OWN ward.
  IF p_ward_id IS DISTINCT FROM public.current_ward_id() OR NOT public.can_write() THEN
    RAISE EXCEPTION 'not authorized to import members for this ward' USING ERRCODE = '42501';
  END IF;

  -- Serialize concurrent imports of the same ward for the rest of this transaction.
  PERFORM pg_advisory_xact_lock(hashtextextended('apply_member_import:' || p_ward_id::text, 0));

  -- Removals first (explicitly marked ids, own ward only), so a remove+reinsert of the
  -- same name in one payload ends with the member present.
  IF p_remove_ids IS NOT NULL AND array_length(p_remove_ids, 1) IS NOT NULL THEN
    DELETE FROM members WHERE ward_id = p_ward_id AND id = ANY (p_remove_ids);
    GET DIAGNOSTICS v_removed = ROW_COUNT;
  END IF;

  -- Phone updates in ONE set-based statement (was: one client round-trip per member).
  IF p_phone_updates IS NOT NULL AND jsonb_array_length(p_phone_updates) > 0 THEN
    UPDATE members m
    SET country_code = u.country_code,
        phone = NULLIF(u.phone, '')
    FROM (
      SELECT DISTINCT ON ((e->>'id')::uuid)
        (e->>'id')::uuid AS id,
        COALESCE(NULLIF(e->>'country_code', ''), '+55') AS country_code,
        (e->>'phone')::text AS phone
      FROM jsonb_array_elements(p_phone_updates) AS e
    ) u
    WHERE m.id = u.id AND m.ward_id = p_ward_id;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
  END IF;

  -- Inserts, deduplicated by natural key (ward + normalized full_name): an insert is
  -- skipped when the member already exists in the ward — including a duplicate inside
  -- the payload itself — so re-running the same import inserts nobody twice.
  IF p_inserts IS NOT NULL AND jsonb_array_length(p_inserts) > 0 THEN
    SELECT count(*) INTO v_requested
    FROM (
      SELECT DISTINCT lower(btrim(e->>'full_name'))
      FROM jsonb_array_elements(p_inserts) AS e
      WHERE NULLIF(btrim(e->>'full_name'), '') IS NOT NULL
    ) d;

    INSERT INTO members (
      ward_id, full_name, informal_name, country_code, phone,
      can_preside, can_conduct, can_lead_music, can_play_piano, can_be_recognized,
      contact_via_responsible, responsible_id, calling
    )
    SELECT DISTINCT ON (lower(btrim(e->>'full_name')))
      p_ward_id,
      btrim(e->>'full_name'),
      COALESCE(
        NULLIF(btrim(e->>'informal_name'), ''),
        split_part(btrim(e->>'full_name'), ' ', 1)
      ),
      COALESCE(NULLIF(e->>'country_code', ''), '+55'),
      NULLIF(e->>'phone', ''),
      false, false, false, false, false,
      false, NULL, NULL
    FROM jsonb_array_elements(p_inserts) AS e
    WHERE NULLIF(btrim(e->>'full_name'), '') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM members m
        WHERE m.ward_id = p_ward_id
          AND lower(btrim(m.full_name)) = lower(btrim(e->>'full_name'))
      );
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'updated', v_updated,
    'removed', v_removed,
    'skipped', GREATEST(v_requested - v_inserted, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_member_import(uuid, jsonb, jsonb, uuid[]) TO authenticated;

-- =============================================================================
-- 2) Speech-snapshot cascade trigger
-- =============================================================================

-- Full international phone, mirroring buildFullPhone (lib/phone): strips spaces,
-- dashes and parentheses; keeps a leading '+'; otherwise prefixes the country code.
CREATE OR REPLACE FUNCTION public.full_phone(p_country_code text, p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN NULLIF(regexp_replace(COALESCE(p_phone, ''), '[\s\-()]', '', 'g'), '') IS NULL THEN NULL
    WHEN regexp_replace(p_phone, '[\s\-()]', '', 'g') LIKE '+%' THEN regexp_replace(p_phone, '[\s\-()]', '', 'g')
    WHEN NULLIF(regexp_replace(COALESCE(p_country_code, ''), '[\s\-()]', '', 'g'), '') IS NULL
      THEN regexp_replace(p_phone, '[\s\-()]', '', 'g')
    ELSE
      (CASE WHEN regexp_replace(p_country_code, '[\s\-()]', '', 'g') LIKE '+%'
            THEN regexp_replace(p_country_code, '[\s\-()]', '', 'g')
            ELSE '+' || regexp_replace(p_country_code, '[\s\-()]', '', 'g') END)
      || regexp_replace(p_phone, '[\s\-()]', '', 'g')
  END;
$$;

CREATE OR REPLACE FUNCTION public.sync_speech_snapshots_from_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resp members%ROWTYPE;
  v_own_phone text;
  v_contact_phone text;
  v_delegated boolean;
BEGIN
  v_own_phone := public.full_phone(NEW.country_code, NEW.phone);

  SELECT * INTO v_resp FROM members WHERE id = NEW.responsible_id;
  -- Delegated only when the responsible exists AND has a usable phone (resolveContactSnapshot).
  v_delegated := NEW.contact_via_responsible AND v_resp.id IS NOT NULL
    AND public.full_phone(v_resp.country_code, v_resp.phone) IS NOT NULL;
  v_contact_phone := CASE WHEN v_delegated
    THEN public.full_phone(v_resp.country_code, v_resp.phone)
    ELSE v_own_phone END;

  -- The member's own not-yet-past speeches.
  UPDATE speeches
  SET speaker_name = NEW.full_name,
      speaker_phone = v_own_phone,
      speaker_informal_name = NEW.informal_name,
      contact_phone = v_contact_phone,
      is_delegated = v_delegated,
      delegate_for_name = CASE WHEN v_delegated
        THEN COALESCE(NULLIF(NEW.informal_name, ''), NEW.full_name) ELSE NULL END
  WHERE member_id = NEW.id AND sunday_date >= CURRENT_DATE;

  -- Dependents delegating contact to THIS member: their contact snapshot follows the
  -- responsible's phone (falling back to their own phone when his is unusable).
  UPDATE speeches s
  SET contact_phone = CASE
        WHEN public.full_phone(NEW.country_code, NEW.phone) IS NOT NULL
          THEN public.full_phone(NEW.country_code, NEW.phone)
        ELSE public.full_phone(dep.country_code, dep.phone) END,
      is_delegated = public.full_phone(NEW.country_code, NEW.phone) IS NOT NULL,
      delegate_for_name = CASE
        WHEN public.full_phone(NEW.country_code, NEW.phone) IS NOT NULL
          THEN COALESCE(NULLIF(dep.informal_name, ''), dep.full_name) ELSE NULL END
  FROM members dep
  WHERE dep.id = s.member_id
    AND dep.responsible_id = NEW.id
    AND dep.contact_via_responsible
    AND s.sunday_date >= CURRENT_DATE;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS members_sync_speech_snapshots ON members;
CREATE TRIGGER members_sync_speech_snapshots
  AFTER UPDATE OF full_name, informal_name, country_code, phone, contact_via_responsible, responsible_id
  ON members
  FOR EACH ROW
  WHEN (
    OLD.full_name IS DISTINCT FROM NEW.full_name
    OR OLD.informal_name IS DISTINCT FROM NEW.informal_name
    OR OLD.country_code IS DISTINCT FROM NEW.country_code
    OR OLD.phone IS DISTINCT FROM NEW.phone
    OR OLD.contact_via_responsible IS DISTINCT FROM NEW.contact_via_responsible
    OR OLD.responsible_id IS DISTINCT FROM NEW.responsible_id
  )
  EXECUTE FUNCTION public.sync_speech_snapshots_from_member();

-- =============================================================================
-- 3) delete_ward_if_no_auth_users
-- =============================================================================

-- Atomic last-member decision for delete-user: locks the ward row, recounts the ward's
-- auth users and deletes the ward (CASCADE) only when none remain — all in one
-- transaction, so concurrent deletes serialize on the lock and the ward can never be
-- deleted while a member remains. Called AFTER the auth user has been removed; a ward
-- left behind by a failed call is an orphan with zero users (repairable: register-first-
-- user reuses it, or this RPC can simply be called again). Service-role only.
CREATE OR REPLACE FUNCTION public.delete_ward_if_no_auth_users(p_ward_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ward uuid;
BEGIN
  SELECT id INTO v_ward FROM wards WHERE id = p_ward_id FOR UPDATE;
  IF v_ward IS NULL THEN
    RETURN false; -- already gone: idempotent
  END IF;

  IF EXISTS (
    SELECT 1 FROM auth.users
    WHERE app_metadata ->> 'ward_id' = p_ward_id::text
  ) THEN
    RETURN false; -- a member remains: the ward stays
  END IF;

  DELETE FROM wards WHERE id = p_ward_id;
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_ward_if_no_auth_users(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_ward_if_no_auth_users(uuid) TO service_role;

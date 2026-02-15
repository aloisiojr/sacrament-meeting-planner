-- 007_import_members_rpc.sql
-- Atomic member import: DELETE all + INSERT new in a single transaction.
-- Prevents partial state if insert fails after delete.

CREATE OR REPLACE FUNCTION import_members(
  target_ward_id uuid,
  new_members jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  member_count integer;
BEGIN
  -- Delete all existing members for this ward
  DELETE FROM members WHERE ward_id = target_ward_id;

  -- Insert new members from JSONB array
  INSERT INTO members (ward_id, full_name, country_code, phone)
  SELECT
    target_ward_id,
    (m->>'full_name')::text,
    (m->>'country_code')::text,
    NULLIF((m->>'phone')::text, '')
  FROM jsonb_array_elements(new_members) AS m;

  GET DIAGNOSTICS member_count = ROW_COUNT;
  RETURN member_count;
END;
$$;

-- 023_add_informal_name.sql
-- CR-247: Add informal_name to members, speaker_informal_name to speeches

-- Step 1: Add informal_name to members
ALTER TABLE public.members ADD COLUMN informal_name TEXT;

-- Step 2: Backfill existing members with first word of full_name
UPDATE public.members
SET informal_name = SPLIT_PART(TRIM(full_name), ' ', 1)
WHERE informal_name IS NULL;

-- Step 3: Add speaker_informal_name to speeches
ALTER TABLE public.speeches ADD COLUMN speaker_informal_name TEXT;

-- Step 4: Backfill existing speeches with first word of speaker_name
UPDATE public.speeches
SET speaker_informal_name = SPLIT_PART(TRIM(speaker_name), ' ', 1)
WHERE speaker_name IS NOT NULL AND speaker_informal_name IS NULL;

-- Step 5: Update import_members RPC to include informal_name
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
  member_count integer;
BEGIN
  DELETE FROM members WHERE ward_id = target_ward_id;

  INSERT INTO members (ward_id, full_name, informal_name, country_code, phone)
  SELECT
    target_ward_id,
    (m->>'full_name')::text,
    COALESCE(
      NULLIF(TRIM((m->>'informal_name')::text), ''),
      SPLIT_PART(TRIM((m->>'full_name')::text), ' ', 1)
    ),
    (m->>'country_code')::text,
    NULLIF((m->>'phone')::text, '')
  FROM jsonb_array_elements(new_members) AS m;

  GET DIAGNOSTICS member_count = ROW_COUNT;
  RETURN member_count;
END;
$$;

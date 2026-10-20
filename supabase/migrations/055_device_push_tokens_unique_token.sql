-- Migration 055: a push token has exactly one owner (CONF-13).
-- NOT APPLIED anywhere by this change — apply only via the normal release process.
--
-- device_push_tokens was UNIQUE (user_id, expo_push_token): the same physical device
-- signing in as another user created a second row, so the device received both wards'
-- pushes and invalid-token cleanup deleted both rows. Migration 035's trigger already
-- tried to clean stale rows on write; a UNIQUE on the token itself makes duplication
-- impossible instead of cleaned-up-after-the-fact.
--
-- Dedup keeps the most recent row per token (updated_at, then created_at, then id).
-- The 035 cleanup trigger becomes redundant but harmless (no second row can exist for
-- it to delete) and is kept so this migration stays data-only plus the constraint swap.
-- Local type note (DEC-03 formal is wave 6): no new DB type; plain columns/constraints.

DELETE FROM public.device_push_tokens t
USING public.device_push_tokens d
WHERE t.expo_push_token = d.expo_push_token
  AND (t.updated_at, t.created_at, t.id) < (d.updated_at, d.created_at, d.id);

ALTER TABLE public.device_push_tokens
  DROP CONSTRAINT IF EXISTS device_push_tokens_user_id_expo_push_token_key;
ALTER TABLE public.device_push_tokens
  ADD CONSTRAINT device_push_tokens_expo_push_token_key UNIQUE (expo_push_token);

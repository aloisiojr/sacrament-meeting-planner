# Edge Functions — operational notes

## Cron secret (`CRON_SECRET`) — CONF-03

`process-notifications` and `push-update-nudge` are invoked by a scheduler, have no user
JWT, and run with the `service_role` key. They therefore require a dedicated secret:

- **Env (per environment, never committed):** `CRON_SECRET`
  - Set/rotate: `supabase secrets set CRON_SECRET=<new-value> --project-ref <ref>`
  - Generate: `openssl rand -hex 32`
- **Header the scheduler must send:** `x-cron-secret: <CRON_SECRET>`
- Missing/wrong header (or unset env) → **401**, before any database access. The comparison
  is constant-time (SHA-256 digests, XOR over every byte).

Deploy order matters: set the secret and update the scheduled jobs to send the header
**before** deploying a version that enforces it, or the cron runs will 401 until you do.
The other functions keep their existing design (public endpoints, or JWT verified in code);
see the comment block in `../config.toml`.

## Role lists

`ALLOWED_ROLES` / `VALID_ROLES` literals in these functions mirror `WRITER_ROLES` /
`ALL_ROLES` in `src/lib/permissions.ts` (Deno cannot import from `src/`). Do not hand-edit
one side without the other — `src/__tests__/security-perms-concordance.test.ts` fails when
they drift.

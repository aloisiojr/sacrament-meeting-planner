# ADR-005 — Enforce role-based write authorization at the database (RLS + import_members)

Status: **Proposed** (mobile-release-advisor recommendation) · Date: 2026-07-30 · Relates to: P0-1 in
`docs/analysis/RELEASE_READINESS_v2.0.md`, ADR-001 (v2 cutover)

## Context
Table write authorization is **client-side only**. RLS write policies
(`supabase/migrations/002_rls_policies.sql:41-277`) gate every INSERT/UPDATE/DELETE on `ward_id =
auth.ward_id()` with **no role check**, so any authenticated ward member — including an `observer` — can
mutate all ward data via a direct Supabase call. Separately, `import_members`
(`supabase/migrations/038_import_members_full.sql:15-32`) is `SECURITY DEFINER`, accepts a caller-supplied
`target_ward_id`, and `DELETE`s+replaces that ward's members with **no ward or role check** → any
authenticated user can wipe **any** ward's roster (cross-ward). This backend is **shared with the live
v1.x app**, so any change must not break shipped clients.

Established facts that shape the decision:
- All users are created with `app_metadata.role` ∈ {`bishopric`,`secretary`,`observer`}
  (register-first-user, register-invited-user). `observer` is the **only** read-only role.
- `app_metadata` (incl. `role`) is present in the JWT — the existing `auth.ward_id()` helper already reads
  `app_metadata.ward_id` from `auth.jwt()`, so a `role` helper works the same way.
- Both v1.x and v2.0 UIs already treat observers as read-only, so **no legitimate client flow writes as an
  observer today**.

## Compatibility classification
- `import_members` ward+role check: **backward-compatible.** Legit clients always pass their own
  `target_ward_id` and are bishopric/secretary → unaffected. Only the exploit path is blocked.
- RLS role enforcement: **backward-compatible IF** framed as "block writes only for explicit `observer`."
  Every write-capable user has role bishopric/secretary → unaffected; only observers (already read-only in
  UI) lose direct write. This is the intended security outcome with zero legitimate breakage.

## Decision
Enforce write authorization server-side, designed for zero v1.x breakage:

1. **Add a role helper** (mirrors `auth.ward_id()`):
   `auth.can_write()` → `COALESCE(auth.jwt()->'app_metadata'->>'role','observer') <> 'observer'`.
   (Default-deny for a missing role is safe: no write-capable user has a missing role; a null role can only
   be a broken/observer-equivalent account.)
2. **RLS write policies** on the ward-scoped tables (members, ward_topics, sunday_exceptions, speeches,
   meeting_actors, sunday_agendas, invitations; wards UPDATE) → `USING/WITH CHECK (ward_id = auth.ward_id()
   AND auth.can_write())`. Keep SELECT as-is (observers still read). `activity_log` INSERT stays open (all
   roles log). `device_push_tokens` unchanged (user-scoped).
3. **`import_members`**: reject `target_ward_id <> auth.ward_id()` and require `auth.can_write()`; raise on
   violation. (Also fixes the cross-ward vector regardless of RLS.)

## Expand → migrate → contract (rollout)
There is no dual-write for authz, but the change is additive-restrictive and can be staged by risk:
- **Phase A (ship to prod now — security, no legitimate breakage):** `import_members` ward+role guard.
  Closes the worst vector (cross-ward wipe) immediately; legit imports are unaffected.
- **Phase B (staging → verify → prod):** the `auth.can_write()` helper + RLS write policies. Verify on
  staging with a real v1.x client build and a v2 build: bishopric/secretary can still write; observer is
  now blocked (expect RLS "permission denied" — client should degrade gracefully, which it does since it
  never issues observer writes). Then apply to prod.
- **Contract trigger:** none needed — no old shape is being removed; SELECT is untouched.

## Consequences
- **Old clients (v1.x):** unaffected for bishopric/secretary; observers can no longer write directly (they
  couldn't via the UI anyway). No local-cache/schema change (RLS is server-side); no forced update required.
- **Offline:** unrelated to P0-2; a blocked write returns an RLS error the (read-only) observer never
  triggers. No offline-data migration.
- **Risk if a legacy account has a role we don't expect:** default-deny → it loses write. Mitigation: the
  open questions below; the design blocks only explicit observers, so a null/unknown role is the only edge.

## Open questions for the user
1. Confirm prod has **no write-capable account with a missing/non-standard `app_metadata.role`** (all
   should be bishopric/secretary). If unsure, we can query staging + spot-check prod before Phase B.
2. OK to ship **Phase A to prod now** (security fix, backward-compatible) rather than waiting for the v2
   cutover? Recommendation: **yes**.
3. Any other client/integration (scripts, admin tools) that writes to these tables under a different role?
4. Should observer writes that now fail surface a user-facing "read-only" message anywhere, or is silent
   (they can't reach write UI) acceptable?

## Constraints fed back to build
- Migrations are additive SQL; apply per rollout above (Phase A prod; Phase B staging→prod). Do not modify
  037/038 in place — add a new migration (e.g. `044_rls_write_authz.sql`) that also `CREATE OR REPLACE`s
  `import_members`.
- Client "gate by permission not role" cleanups (P1) become defense-in-depth once this lands.

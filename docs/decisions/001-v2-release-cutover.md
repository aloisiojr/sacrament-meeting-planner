# ADR 001 — v2.0 release cutover (breaking DB change, forced update)

Status: proposed · Date: 2026-07-28 · Advisor: mobile-release-advisor

## Context
v2.0 makes a **breaking** DB change (drops `meeting_actors`, changes agenda references, adds member
columns). The shipped v1.0 talks to the same Supabase and has **no min-version / kill-switch gate**.
The product owner wants everyone off v1 quickly (no long coexistence), and does NOT want the
complexity of expand→contract dual-support.

## Decision
Clean cutover with a **backend-driven forced update**, preceded by a gate-capable interim release:

1. **v1.x (interim, backward-compatible, no schema change):** add a min-version gate — on launch the
   app reads `min_supported_build` from Supabase (config table/edge function); if the client build is
   lower, show a blocking "please update" screen. Ship to stores.
2. **Adoption window:** wait until most active users are on v1.x (monitor); optionally push a
   notification to update.
3. **Ship v2.0** to stores; wait for store approval.
4. **Cutover:** raise `min_supported_build` to the v2.0 build (gate-capable clients now prompt to
   update) → **then** run the v2 migrations 037 + 038. (036 is the v1.x app_config migration,
   already applied.)
5. v2.0 clients operate on the new schema.

**Offline cache:** v2.0 bumps a react-query persist cache-version key → stale v1 cache is purged and
rehydrated on first launch.

**Migration safety:** take a Supabase backup/snapshot immediately before 037/038; run them in a
transaction during a short maintenance window (block writes) to avoid a half-migrated state;
rollback = restore the snapshot.

## Consequences
- **Old-client impact:** users on the interim v1.x get a graceful "please update". Users still on
  **pre-gate v1.0** cannot be gated (no gate code) and will hit hard errors once 037 runs — accepted
  because the owner wants no v1 lingering; the adoption window minimizes how many remain.
- No dual-write / no expand-contract → simpler, faster to build; the cost is the interim release +
  an adoption wait, and the hard break for pre-gate holdouts.
- Store review latency applies to both v1.x and v2.0; the cutover flip (min_supported_build) is
  backend-only and instant.

## Prerequisite / constraint fed back to the spec
- The **v1.x release is its own change** (`specs/v1x-version-gate.md`, on `main`) and MUST be
  released and adopted before v2.0 is merged/deployed. v2.0 must not be deployed before then.
- **v1.x scope:** (1) backend-driven min-version gate (`min_supported_build`); (2) record
  `app_version` (+platform) on `device_push_tokens` so `process-notifications` can target v1 users
  for "please update" nudges at any cadence; (3) fix the WhatsApp `country_code` phone bug (benefits
  current users now). v1.x is backward-compatible (additive only — no schema break).

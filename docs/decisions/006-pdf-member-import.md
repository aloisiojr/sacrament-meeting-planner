# ADR-006 — On-device PDF member import (LGPD / release considerations)

Status: proposed · Date: 2026-07-31 · Advisor: mobile-release-advisor
Related: `specs/pdf-member-import.md`, `specs/pdf-member-import.reference.md`. Supersedes the removed
third-party-AI import guide.

## Context
Leaders import the ward member list from the LCR PDF. The prior approach steered users to a
third-party AI to merge PDF+CSV — removed for LGPD (member PII, incl. minors, sent to a third party).
New approach: parse the PDF **on-device** and merge into the members table directly, after review.

## Compatibility classification
**Backward- AND forward-compatible; NOT a breaking change.**
- No DB schema change (uses existing `members` columns).
- No backend contract change. v1/old clients are unaffected: they don't have the feature and keep
  reading/writing members normally; rows this feature creates are ordinary member rows old clients
  read fine.
- Writes go through the existing RLS-gated member path (migration 044). No coexistence problem.
⇒ No expand→migrate→contract sequence, no data migration, no min-version gate, no cache-version bump
  (feature is online-only; adds no new persisted local shape).

## PII / LGPD analysis (the driving concern)
- **On-device parsing:** the PDF is parsed in the app; PII does NOT go to any third party. Writes go
  only to our own Supabase, which already stores members. This is the core LGPD improvement.
- **Raw PDF must NOT be persisted or uploaded** — parse in memory and discard. (Constraint C1.)
- **Minors:** the list includes children. The under-12 phone rule (name kept, phone blank) is a
  safeguard — keep. We still store minors' NAMES (same as today's CSV import and existing member
  records). This matches current processing for the ward-administration purpose; flag for legal
  review whether minors should be imported at all vs 12+/18+. (Open item O1.)
- **Transparency:** verify the privacy policy covers importing/processing member contact data
  (including minors' names). Likely already covered since the app already stores members. (Open item O2.)
- **Retention:** removals are user-controlled (opt-in in review). No new retention concern.

## Correctness / rollout risk
Main risk is DATA CORRECTNESS (parser misreads → wrong names/phones/removals written), not
compatibility. Mitigations (already in the spec):
- Mandatory review before any write; non-destructive default; removals opt-in only.
- Phone conflicts never auto-overwritten (default keep app's).
- Under-12 phones blanked; unrepaired phones left blank + listed.
- Count validation against the PDF's Count/Contagem line.
- Optional: feature-flag the first release for staged rollout / instant kill (low priority).

## Decision
Proceed as specified. It is a safe, additive, LGPD-improving client feature. No release-gating or
migration required. Enforce the constraints and resolve the open items below.

## Constraints fed back into the spec
- **C1** Parse the PDF in memory only; never persist or upload the raw file.
- **C2** Keep the review-before-write flow, non-destructive default, under-12 phone rule, and
  phone-conflict resolution (no silent overwrite).
- **C3** Online-only; disable offline (no local queue for this bulk write).

## Open items (product/legal)
- **O1** Import minors at all? (Proposed: yes, name-only, no phone — consistent with existing CSV
  import. Confirm with the ward/legal.)
- **O2** Confirm the privacy policy covers member-data import (incl. minors' names).

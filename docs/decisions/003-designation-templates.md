# ADR 003 — Per-ward designation read-text templates (additive)

Status: proposed · Date: 2026-07-29 · Advisor: mobile-release-advisor · Related: [ADR 001](001-v2-release-cutover.md), [ADR 002](002-designations-schema.md)

## Context
Spec 3 lets a ward customize the four designation read-texts (Apoio/Desobrigação/Avanço/Novo
Membro) surfaced in the Play interstitial (Spec 2). Follows the existing `whatsapp_template_*`
pattern on the `wards` table (per-ward override column, NULL ⇒ built-in localized default).

## Decision
- **Add 4 nullable TEXT columns** to `wards`: `designation_template_sustain`,
  `designation_template_release`, `designation_template_priesthood`,
  `designation_template_new_member`. NULL (or blank) ⇒ use the built-in per-locale default.
- **Single set per ward** (not per-language), matching WhatsApp templates: an override, when set,
  is used regardless of the reader's display language; when absent, the current display language's
  default is used.
- Compatibility class: **backward- & forward-compatible / additive**. Old (v1) clients simply
  ignore the new columns — no breakage. Distinct from ADR 002's breaking column drop.

## Consequences
- Safe to apply any time (additive, nullable); in practice ships with the v2 migration set / cutover
  (ADR 001) and can go to staging immediately.
- No offline-cache concern beyond the v2 cache-version bump already in place (ADR 001).
- A ward that customizes gets its exact wording everywhere; others keep localized defaults.

## Constraint fed back to the spec
- Migration is ADDITIVE ONLY (nullable columns); no existing column is changed or dropped.
- The read-text resolver MUST treat NULL/blank override as "use the localized default".

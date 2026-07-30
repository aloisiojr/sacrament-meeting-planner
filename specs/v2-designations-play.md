# Supports & Releases — Play interstitial with read-texts (Spec 2 of 3)

## Problem / intent
Help whoever conducts the meeting by giving them the exact words to say for each support/release.
In Play (presentation), the designations already show as compact lines (Spec 1). This spec adds a
"text to read" icon — analogous to the sacrament-prayer icon — that opens an interstitial with the
full verbatim text for each designation, placeholders substituted. The texts are the built-in
locale defaults here; making them editable in Settings is **Spec 3**.

## In scope / Out of scope
- **In:**
  - A single "text to read" icon on the Play "Apoios e Desobrigações" (designations) field, shown
    only when the Sunday has ≥1 designation.
  - An interstitial (same visual scheme/size as `SacramentPrayerModal`) listing each designation's
    full read-text, in order, in the current app display language.
  - A pure token-substitution helper: `{name}`, `{calling}`, `{office}`, `{ward}`.
  - Built-in per-locale default templates (Appendix A), VERBATIM.
  - Canonical meeting order — **release → sustain → priesthood → new_member**, stable within each
    type — applied to both the Play bullet list and the interstitial.
- **Out:**
  - **Grouping** several same-type items into one combined sentence (e.g. "Foram desobrigados: …").
    Too custom for now (each sustain/release carries its own calling; conductors don't always want
    to group). Possible future enhancement; not built here.
  - Editing the templates in Settings / per-ward overrides → **Spec 3** (the helper will accept an
    override template so Spec 3 only wires the source).
  - Any change to entry/editing or the expanded card (Spec 1).
  - Gender-aware pronoun substitution (the templates keep "(a)" / "[his or her]" / "him/her"
    literal for the reader to voice).

## Baseline (evidence)
- Play: `src/app/presentation.tsx` renders `PresentationField`s; the sacrament-hymn field carries
  `sacramentPrayer: true` (`src/hooks/usePresentationMode.ts:187-192`) and renders a `ScrollTextIcon`
  button (`presentation.tsx:212-242`) that opens `SacramentPrayerModal` (`prayerModalVisible` state,
  `:45-48,152`). The modal reads current-language text via i18n `t()` and takes `fontSizes`.
- Designations already render as a `bullet_list` field labelled `agenda.wardBusiness`
  (`usePresentationMode.ts:158-165`), value = `formatDesignationSummary` joined by `\n`.
- Ward name: no hook exposes `Ward.name` yet (only `manage_prayers` via `useWardManagePrayers`,
  and `language` in `AuthContext`). A small fetch of `wards.name` by `wardId` is needed.
- `src/lib/designations.ts` holds the pure helpers; `Designation` type in `src/types/database.ts`.

## Acceptance criteria (EARS)
- **AC1:** WHILE the Play designations field is shown (Sunday has ≥1 designation), the system SHALL
  render a "text to read" icon on that field, analogous to the sacrament-prayer icon.
- **AC2:** WHEN the user taps that icon, the system SHALL open an interstitial using the same visual
  scheme as the sacrament-prayer interstitial: blurred backdrop, scrollable panel, an X button and
  tap-outside-to-dismiss, honoring the Play font-size mode.
- **AC3:** The interstitial SHALL list the full read-text for EACH designation of that Sunday, in
  the stored order.
- **AC4:** The system SHALL render each read-text in the current app display language (i18n),
  matching the sacrament-prayer interstitial and the rest of Play.
- **AC5:** For each designation the system SHALL substitute `{name}` → person_name, `{calling}` →
  the calling snapshot (sustain/release), `{office}` → the localized office label (priesthood), and
  `{ward}` → the ward name; tokens not used by a type do not appear in that type's template.
- **AC6:** The system SHALL preserve every other character of the template verbatim, including
  literal bracketed stage directions (e.g. `[Pausa breve.]`) — only the four tokens are replaced.
- **AC7:** WHERE no per-ward override exists, the system SHALL use the built-in per-locale default
  templates in Appendix A. (Overrides are Spec 3; the helper accepts an optional template argument.)
- **AC8:** IF the Sunday has no designations, THEN the system SHALL show neither the icon nor the
  interstitial (the field is absent).
- **AC9:** The system SHALL present designations — in both the Play bullet list and the interstitial
  — ordered release → sustain → priesthood → new_member, preserving entry order within each type.

## Open questions
- None. Verbatim confirmations resolved (see ## Notes → Text corrections): pt uses `[Pausa Breve]`
  consistently; pt new_member "desejam"; en priesthood "ordained a"; es priesthood drops "de".

## Notes
- **Placeholders:** shown/typed in the app language (refinement): pt `{nome}/{chamado}/{oficio}/{ala}`,
  es `{nombre}/{llamamiento}/{oficio}/{barrio}`, en `{name}/{calling}/{office}/{ward}`. The default
  templates + Settings hint use the display-language tokens; the substitution helper accepts every
  locale's aliases so a ward override stays substitutable across languages. All other brackets
  (stage directions, "[his or her]") stay literal.
- **Permissions:** Play is view-only; no new permission.
- **i18n:** add the read-text templates to pt-BR, en-US, es-LA (Appendix A).
- **Offline:** pure client render from the already-loaded agenda + ward name; no new network on tap.
- **Release:** client-only; no schema change in this spec.
- **Text corrections (per gate answers):** pt pause direction is `[Pausa Breve]` everywhere; pt
  new_member uses "desejam"; en priesthood "ordained a {office}"; es priesthood "Sacerdocio
  Aarónico" (no "de"). en/es pause directions kept as originally provided.

## Appendix A — default templates (FINAL; tokens applied, otherwise verbatim)

**pt-BR**
- release: `{name} foi desobrigado(a) de {calling}. Aqueles que desejarem expressar gratidão pelo seu serviço podem manifestá-lo levantando a mão.`
- sustain: `{name} foi chamado(a) como {calling}. Os que forem a favor, manifestem-se levantando a mão. [Pausa Breve] Se alguém se opuser, manifeste-se. [Pausa Breve]`
- priesthood: `É proposto que o irmão {name} receba o Sacerdócio Aarônico e seja ordenado {office}. Os que forem a favor, manifestem-se levantando a mão. [Pausa Breve] Se alguém se opuser, manifeste-se. [Pausa Breve]`
- new_member: `É com alegria que apresentamos {name} como novo membro da Ala {ward}. A todos que o(a) recebem e lhe desejam as boas-vindas, peço que manifestem-se levantando a mão direita. [Pausa Breve]`

**en-US**
- release: `{name} has been released as {calling}. Those who would like to express thanks for [his or her] service may show it by the uplifted hand.`
- sustain: `{name} has been called as {calling}. Those in favor of sustaining [him or her] may show it by the uplifted hand. [Pause briefly.] Those opposed, if any, may also show it. [Pause briefly.]`
- priesthood: `We propose that {name} receive the Aaronic Priesthood and be ordained a {office}. Those in favor may show it by the uplifted hand. [Pause briefly.] Those opposed, if any, may also show it. [Pause briefly.]`
- new_member: `It is with joy that we present {name} as a new member of the {ward} Ward. All who receive him/her and wish to extend a warm welcome, please show it by the uplifted hand. [Brief pause]`

**es-LA**
- release: `{name} ha sido relevado como {calling}. Quienes deseen expresar agradecimiento por su servicio, sírvanse hacerlo levantando la mano.`
- sustain: `{name} ha sido llamado como {calling}. Los que estén a favor de sostenerlo, sírvanse hacerlo levantando la mano. [Breve pausa]. Opuestos, si los hay, también pueden manifestarlo. [Breve pausa].`
- priesthood: `Proponemos que {name} reciba el Sacerdocio Aarónico y que sea ordenado {office}. Los que estén a favor, sírvanse indicarlo levantando la mano. [Breve pausa]. Opuestos, si los hay, también pueden manifestarlo. [Breve pausa].`
- new_member: `Con alegría presentamos a {name} como nuevo(a) miembro del Barrio {ward}. A todos los que lo(a) reciben y le desean la bienvenida, les pedimos que lo manifiesten levantando la mano derecha. [Breve pausa]`

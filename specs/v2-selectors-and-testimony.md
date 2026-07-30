# Spec — Selector headers, testimony upcoming card, full-screen hymn picker + scrubber fix

**Slug:** `v2-selectors-and-testimony` · **Type:** feature/bugfix (UI) · **Branch:** UX-2.0
**Compatibility:** client-local UI only — no DB/API/persisted-data change. No release-advisor gate.

Three independent changes.

## Item 1 — Topic selector header consistent with the people selector

`TopicSelectorModal` today has one header row (search + icon-add + "Close"). Make it mirror
`PeoplePicker`:

- **AC1.1** — A top bar with **Cancel** (left) + **centered title** ("Selecionar Tema").
- **AC1.2** — Below it, a search row: the search field + a **"+ Adicionar"** button (PlusIcon +
  label) on the right, shown only with `topic:write`.
- **AC1.3** — The old "Close" text button and the icon-only add are removed (Cancel replaces Close).
- **AC1.4** — Select / add / inline-edit / delete behavior is otherwise unchanged.

## Item 2 — Testimony layout on the "próximos domingos" (upcoming) cards

Only affects the Home upcoming cards (`hideStatusBlock === true`) for testimony Sundays. Today the
testimony label sits *between* the two prayer rows. New rules:

- **AC2.1** — WHEN managePrayers is ON and **no** prayer is assigned: show **"Reunião de
  testemunho"** first, then a single gray (`not_assigned`) dot row labeled **"Nenhuma pessoa
  convidada para as orações"** (`agenda.noPrayersInvited`, new i18n key).
- **AC2.2** — WHEN managePrayers is ON and **≥1** prayer is assigned: show **"Reunião de
  testemunho"** first, then the two prayer rows (with dots).
- **AC2.3** — WHEN managePrayers is OFF: show only the "Reunião de testemunho" label (unchanged).
- **AC2.4** — Non-upcoming (Meetings-tab) testimony cards keep their current layout untouched
  (prayer rows in Block 2; testimony label in Block 1 line 2).

## Item 3 — Full-screen hymn picker + fix the scrubber rail

`HymnSelectorModal` (inline in `AgendaForm.tsx`) is a bottom sheet; the rail is broken.

- **AC3.1** — Present the hymn picker **full screen** (not a 0.67 bottom sheet), with a Cancel +
  centered title ("Selecionar Hino") top bar and a search row below — consistent with the other
  selectors.
- **AC3.2** — Rail anchors are **data-driven**: one anchor per **populated decade**
  (`floor(number/10)*10`, decade 0 rendered as `1`), skipping empty decades. So hymns 1–204 +
  1001–1204 yield `[1,10,…,200,1000,1010,…,1200]` — the 210–990 gap is skipped. (Fixes "numbers
  that don't make sense".)
- **AC3.3** — **Tapping** an anchor scrolls to the first hymn with `number ≥ anchor`, exactly (no
  more "tap 100 → 10"). Implemented as one `Pressable` per anchor (no Y-math for taps).
- **AC3.4** — **Press-drag** on the rail scrubs live: a preview bubble shows the anchor under the
  finger and the list scrolls; releasing hides the bubble. Uses a `PanResponder` that claims only on
  *move* (so per-anchor taps still fire), mapping `pageY − railTop` (measured) → anchor index.
- **AC3.5** — Rail hides while searching and when there are < 3 anchors.
- **AC3.6 (no regression)** — Row tap still selects + closes; search still filters; empty state shows.

## Implementation notes

- **hymnScrubber.ts**: replace `buildHymnAnchors(min,max)` + `min/maxHymnNumber` with
  `buildHymnAnchors(numbers: number[])` (unique populated decades, decade 0 → 1, `[]` when < 3).
  Keep `firstIndexAtOrAbove` and `anchorForFraction`.
- **HymnScrubberRail.tsx**: anchors as `Pressable`s (tap → `onScrubToAnchor(n)`); wrap in a
  `PanResponder` with `onStartShouldSetPanResponder:false`, `onMoveShouldSetPanResponder: dy>threshold`;
  on grant `measureInWindow` → store railTop/height; on move map `pageY` → fraction → anchor, scrub +
  bubble; release/terminate hide bubble. This fixes both the child-relative `locationY` bug and drag.
- **AgendaForm HymnSelectorModal**: full-screen container (Cancel+title top bar, search row, list+rail);
  `anchors = search.trim() ? [] : buildHymnAnchors(hymns.map(h => h.number))`.

## Test plan (behavioral, vitest)

- Item 1: TopicSelectorModal renders Cancel + title + "Adicionar"; Cancel calls onClose; add opens editor.
- Item 2: upcoming testimony card — managePrayers ON + no prayers → label-first + `noPrayersInvited`
  row; ON + ≥1 prayer → label-first + two rows; OFF → label only; non-upcoming unchanged.
- Item 3: `buildHymnAnchors` (gap → skipped decades, decade 0→1, <3 → []); rail tap Pressable →
  onScrubToAnchor(n) exact; drag maps pageY→anchor + bubble; integration: full-screen render, rail
  hidden on search, scrollToOffset on anchor.

## i18n keys (all three locales)
- `topics.pickerTitle` — "Selecionar Tema" / "Select Topic" / "Seleccionar Tema"
- `topics.add` (or reuse existing "Adicionar") for the button label
- `agenda.noPrayersInvited` — "Nenhuma pessoa convidada para as orações" / "No one invited for the prayers" / "Nadie invitado para las oraciones"
- `hymns.pickerTitle` — "Selecionar Hino" / "Select Hymn" / "Seleccionar Himno"

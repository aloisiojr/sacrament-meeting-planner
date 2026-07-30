# Spec — Hymn number scrubber (fast-scroll rail)

**Slug:** `v2-hymn-scrubber` · **Type:** feature (UI) · **Branch:** UX-2.0
**Baseline:** main = 67 test files / 1832 tests; working tree green (item 4 committed `0414dca`).
**Compatibility:** client-local UI only — no DB / API / persisted-data change. No release-advisor gate needed.

## Context

The hymn picker (`HymnSelectorModal`, defined inline in `src/components/AgendaForm.tsx:878`,
rendered at line 712) is a bottom-sheet with a search box + a `FlatList` of the whole hymnal
(~200+ hymns, ordered by `number` asc). Scrolling to hymn 174 means a long drag. We add a
vertical **number rail** on the right edge for fast navigation, per the user's screenshots:
tap a number to jump; press-and-drag to scrub with a live preview bubble.

Used by all four hymn fields (opening / sacrament / intermediate / closing) — they all share
this one modal, so the rail is implemented once.

## Acceptance criteria (EARS)

- **AC1** — WHEN the hymn modal is open with the full (unfiltered) list, THE SYSTEM SHALL render
  a vertical rail of anchor numbers on the right edge spanning the list's actual range: decade
  anchors from `floor(minNumber/10)*10` up to `ceil(maxNumber/10)*10`, with a leading `1` when
  `minNumber < 10`. So the full hymnal → `[1,10,…,180]`; the sacramental subset (~169–196) →
  `[160,170,180,190,200]` (range-aware, per D1 = Both — avoids a dead zone in the sacrament picker).
- **AC2** — WHEN the user taps anchor `N`, THE SYSTEM SHALL scroll the list so the first hymn with
  `number ≥ N` is at the top.
- **AC3** — WHILE the user presses and drags vertically on the rail, THE SYSTEM SHALL (a) show a
  dark-grey preview bubble to the LEFT of the rail displaying the anchor number nearest the finger
  (snapped to the 10s anchors), and (b) scroll the list live to that anchor's target hymn.
- **AC4** — WHEN the drag is released, THE SYSTEM SHALL hide the preview bubble; the list stays at
  the last scrubbed position.
- **AC5** — WHEN a search filter is active (search box non-empty), THE SYSTEM SHALL hide the rail
  (list positions no longer map to hymn numbers).
- **AC6** — WHEN the list is too short to warrant a rail (`maxNumber < 20`, i.e. fewer than 3
  anchors), THE SYSTEM SHALL NOT render the rail.
- **AC7** — Interacting with the rail SHALL NOT dismiss the modal.
- **AC8** — The rail SHALL NOT render on top of hymn text unreadably: rail width ~30px, list rows
  get right padding to clear it.
- **AC9 (no regression)** — Tapping a hymn row still selects it and closes the modal; search still
  filters; the "no results" empty state still shows.

## Design decisions / defaults (confirm at GATE 1)

- **D1 — Rail also in the sacrament-hymn selector. [LOCKED: Both]** The sacrament list is a curated
  *subset* (~30 hymns), still ordered by number. Show the rail there too (AC6 still gates it by
  range); anchor `N` maps to the first *sacramental* hymn with `number ≥ N`.
- **D2 — First anchor is `1`, then multiples of 10** (`1, 10, 20, …`), per the screenshots.
- **D3 — Live scroll during drag** (not only on release), per "aperta, segura e corre o dedo… corre a lista".
- **D4 — Anchor→target mapping = "first hymn with number ≥ anchor"** (handles gaps/renumbering).

## Implementation notes

- **Fixed row height for `getItemLayout`.** Change `styles.modalItem` from `paddingVertical:12` to a
  fixed `height: 44, justifyContent:'center'` so `getItemLayout` is exact. Add `ref` to the FlatList;
  scroll via `scrollToOffset({ offset: targetIndex * ITEM_HEIGHT, animated })`.
- **Gesture inside a Modal (critical).** `GestureHandlerRootView` is only at the app root
  (`_layout.tsx:142`); a RN `Modal` renders outside it, so react-native-gesture-handler Pan gestures
  won't fire inside the sheet unless the sheet content is wrapped in its own
  `GestureHandlerRootView`. Plan: wrap the sheet content in a local `GestureHandlerRootView`
  (`flex:1`) and use `Gesture.Pan()` + `Gesture.Tap()` on the rail (consistent with `SwipeableCard`).
  Rail taps can also be plain per-anchor `Pressable`s (simpler, avoids gesture for the tap path).
- **Web.** The app runs on web (react-native-web) and the user tests there. Verify the rail works
  with mouse press-drag; gesture-handler supports web, but if it proves flaky the fallback is core
  `PanResponder` (self-contained, no root-view wrapping). Note in verify.
- **Rail layout.** Absolute-positioned column, right edge, vertically centered; anchors distributed
  evenly over the available list height. Map finger `Y` → fraction → nearest anchor index.
- **Preview bubble.** Absolute dark-grey circle left of the rail, tracking finger Y, showing the
  snapped anchor number; visible only during drag.
- **New component.** Extract a `HymnScrubberRail` (new file `src/components/HymnScrubberRail.tsx`)
  taking `{ anchors, listHeight, onScrubToAnchor(n), colors }` so it's unit-testable and keeps
  AgendaForm lean. `HymnSelectorModal` owns the FlatList ref and the anchor→index scroll.

## Test plan (behavioral, vitest)

- Anchor generation: `buildHymnAnchors(maxNumber)` → `[1,10,20,…]`; edge cases (max 7 → `[1]` only
  → rail hidden; max 174 → up to 180).
- Anchor→index mapping: `firstIndexAtOrAbove(hymns, N)` returns correct index incl. gaps.
- Rail hidden when search active (AC5) and when `maxNumber < 20` (AC6).
- Tap anchor → `scrollToOffset` called with `index*ITEM_HEIGHT` (mock FlatList ref).
- Drag → bubble shows snapped anchor; live `onScrubToAnchor` fires (simulate Pan callbacks).
- Row select + search still work (AC9).
- (FlatList row tests require the partial `react-native` mock that renders `renderItem`.)

## Out of scope

- No change to hymn data, ordering, or `formatHymnDisplay`.
- The orphan `src/components/HymnSelectorModal.tsx` / `HymnSelector.tsx` (dead code) are untouched.

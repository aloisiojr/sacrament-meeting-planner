# Spec — Unified Sunday cards, speeches-as-screen, Home & Play refinements

Status: **draft (GATE 1 — awaiting approval)** · Branch: `v2.0` · Date: 2026-07-29

Big UI/navigation refactor of the Agendas + "Discursos e Orações" area. UI-only (no schema/RPC/
persistence change → no mobile-release-advisor needed; the sacrament-prayer texts are static i18n).

## Current architecture (from exploration)
- Tabs (`src/app/(tabs)/_layout.tsx`): Home(`index`) · Agendas(`agenda`) · **Discursos e Orações(`speeches`)** · Settings.
- Agendas: inline-accordion `AgendaSundayCard` (local in `agenda.tsx`); expanded body = SundayTypeDropdown + `AgendaForm`.
- Speeches: inline-accordion `SundayCard` (`src/components/SundayCard.tsx`); expanded body = `SpeechSlot` rows + `PeoplePicker` + `TopicSelectorModal`.
- Shared bits: `StatusLED` (the status dot); `DateBlock` is duplicated 3× (SundayCard-local, agenda.tsx, index.tsx).
- Home (`index.tsx`): inline hero agenda-preview card + `NextSundaysSection` (3× `SundayCard`) + NextAssignments + InviteManagement.
- Play (`presentation.tsx` + `usePresentationMode.ts`): `AccordionCard` (one open at a time, `LayoutAnimation`); Sacrament Hymn field built at `usePresentationMode.ts:185`.
- Flags: `manage_prayers` (ward) → prayers shown + row count; `has_second_speech` (per-agenda) → 2 vs 3 speakers.

## Decisions locked by the user
- Merge the two collapsed cards into ONE unified collapsed card (agenda block on top, speakers block below).
- Keep only the AGENDA expanded view (inline accordion). The SPEECHES expanded view becomes a full SCREEN.
- Remove the "Discursos e Orações" tab (only Agendas remains).
- Unified card has two tap zones: speakers area → speeches edit screen; the status area → expanded agenda.

## Acceptance criteria (EARS)

### Navigation & structure
- **N1** The tab bar SHALL be Home · Agendas · Settings (the `speeches` tab removed; `(tabs)/speeches.tsx` deleted, `MicIcon`/speeches-title plumbing removed).
- **N2** A new full-screen route (e.g. `src/app/speeches/[date].tsx`, pushed over the tabs like
  `presentation.tsx`) SHALL host the speeches/prayers editor (the former expanded speeches content:
  SpeechSlot rows + PeoplePicker + TopicSelectorModal). All entry points navigate here with the date.
- **N3** The Agendas tab SHALL keep the inline-accordion expanded agenda (SundayTypeDropdown + AgendaForm).

### Unified collapsed card (new shared component reused by Agendas + Home)
- **U1** One collapsed card per Sunday = Block 1 (agenda) stacked above Block 2 (speakers), as if the
  old speeches collapsed card were concatenated under the old agenda collapsed card.
- **U2** Block 1: `DateBlock` on the left; to its right, 4 status lines: (1) a roles line rendering
  "Presidir | Dirigir | Pianista | Regente" where each word is **green** when that role is filled and
  **SecondaryText** when not (NO "Falta:" prefix); (2) speakers count; (3) prayers count; (4) hymns
  count — counts colored as today (green when complete).
- **U3** Block 2: the speaker/prayer name rows (prayers pos 0/4 only when `manage_prayers`; speeches
  pos 1..3 honoring `has_second_speech` → 3 or 5 rows), each = a `StatusLED` dot + name, LEFT-aligned
  with Block 1's text column (NOT under the DateBlock). No DateBlock in Block 2.
- **U4** WHEN no name is assigned in Block 2, show a SINGLE grey dot + "(Não há pessoas designadas)"
  instead of N empty grey dots.
- **U5** For a no-sacrament Sunday (e.g. general/stake conference), show only the yellow reason text
  (as today); the card SHALL NOT keep a fixed height.
- **U6** For a testimony meeting: Block 1's speakers-count line SHALL become a yellow "Reunião de
  Testemunho"; Block 2 SHALL be omitted when `manage_prayers` is OFF, or show ONLY the opening/closing
  prayer rows when `manage_prayers` is ON.
- **U7** Remove pencil icons; show a right-pointing chevron indicating tap-to-edit. Tap zones: tapping
  the DateBlock → nothing; tapping the Block-1 status area → open the expanded agenda (inline accordion
  on the Agendas tab; on Home → navigate to Agendas expanded on that date); tapping the Block-2
  speakers area → push the speeches edit screen (N2).
- **U8** The unified card height SHALL be dynamic (no fixed collapsed height).

### Speeches edit screen (former expanded speeches card)
- **S1** Speaker/prayer rows SHALL show the assigned name as plain TEXT (not an editable-looking field)
  with an edit button on the right. Speaker rows SHALL use 2 lines: name (line 1) + the person's topic
  (line 2).

### Home
- **H1** The unified collapsed card is the ONLY collapsed-card type in the app. Home SHALL show one
  highlighted (destaque) unified card at top + a "Próximos domingos" section with **2** unified cards
  (down from 3). No separate hero/preview card design remains.

### Presentation / Play
- **P1** Advancing cards (one collapses, the next expands) SHALL animate with a **vertical slide**
  (opening card's content slides down in; closing card slides up out).
- **P2** To the right of the Sacrament Hymn row, a "text to read" icon (may use 2 lines: label + hymn,
  right-aligned) SHALL open the sacrament-prayer interstitial: a **near-full-screen** modal (leaving a
  margin) over a **blurred** backdrop of the screen behind; dismissed by the **X** button OR by
  tapping **outside** the panel.
- **P3** The sacrament prayers SHALL be stored as i18n (`presentation.sacramentPrayerBread` /
  `sacramentPrayerWater`) in pt-BR / en-US / es-LA (texts in the appendix).

## Suggested build phasing (each a green commit)
1. Extract shared `DateBlock` (+ optional shared status helpers) to `src/components/`.
2. New `UnifiedSundayCard` (Blocks 1+2, tap zones, testimony/no-sacrament, empty state).
3. Speeches edit screen route (N2, S1) + delete speeches tab (N1); repoint entry points.
4. Wire Agendas tab to the unified card (inline agenda expand; names→screen).
5. Home (H1) uses the unified card.
6. Play: animation (P1) + sacrament-prayer icon/interstitial (P2/P3, i18n).

## Open questions (GATE 1) — RESOLVED 2026-07-29
1. Home hero → the single unified card (highlighted). (See H1.)
2. Play animation → vertical slide. (See P1.)
3. Interstitial → near-full-screen over a blurred backdrop; dismiss via X or tap-outside. (See P2.)

## Appendix — sacrament prayer texts (for i18n P3)
(pt-BR / en-US / es-LA — bread then water — as provided by the user; stored verbatim.)

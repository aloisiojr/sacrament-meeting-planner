# Export the sacrament-meeting agenda as PDF

Branch: `export-pdf` (from `chore/test-strategy-jest-expo`).

## Why

A printed agenda is what sits on the stand during the meeting. Today the only way to get one is
Presentation Mode on a device.

## Trigger

A button in the **expanded agenda card**, beside "Iniciar" (`agenda-play-<date>`). Produces a PDF
and opens the system share sheet (save to Files, AirDrop, print, WhatsApp — all reachable from
there).

## Content rules

The single most important decision: **reuse `buildPresentationCards()`** rather than write a second
agenda renderer. It is already the source of truth for what an agenda contains, and its
include/omit logic already matches the requirement below. Two renderers would drift, and the PDF
would eventually disagree with what the conductor sees on screen.

Consequently the PDF rule is simply: **render every field the builder emits.** The builder only
pushes an optional field when it has data, so anything that reaches the PDF belongs there.

An emitted field with an EMPTY value renders as a **fill-in line** (label + rule), not as blank
space — a printed agenda is partly a form.

### Always present (printed even when empty)

| Field | Source |
|---|---|
| Presiding | `presiding_name` |
| Conducting | `conducting_name` |
| Pianist | `pianist_name` |
| Music leader | `conductor_name` |
| Opening hymn | `opening_hymn_id` |
| Sacrament hymn | `sacrament_hymn_id` |
| Closing hymn | `closing_hymn_id` |
| Intermediate hymn | `intermediate_hymn_id` — speech Sundays only, and only when there is no special presentation. This is what makes it **4 hymns on a speech Sunday and 3 on a testimony Sunday**. |
| Opening prayer | speech position 0 |
| Closing prayer | speech position 4 |
| 1st speaker | position 1 (or `speaker_1_override`) — speech Sundays only |
| Last speaker | position 3 (or `speaker_3_override`) — speech Sundays only |
| 2nd speaker | position 2 (or `speaker_2_override`) — **only when `has_second_speech` is true** |

### Omitted when empty

Recognitions, welcome to new families, announcements, ward business (designations), baby blessing,
baptism/confirmation, stake announcements, special presentation.

A toggle that is ON with an empty description (e.g. `has_special_presentation` with no text) still
prints its label as a fill-in line: the event is happening, the wording just is not decided.

## Page geometry

**A4, explicitly.** expo-print defaults to US Letter (612x792pt) and ignores the CSS
`@page { size: A4 }`, so the size is passed to `printToFileAsync` as points: 595x842.

The white border is **CSS padding on the body**, not a `@page` margin and not the native
`margins` option: `@page` margins are unreliable across the two print paths and `margins` is
iOS-only. Native margins are pinned to zero so the two cannot stack. 10mm — thin, but not inside
the ~5mm a desktop printer physically cannot reach.

## Branding

Header: app icon (a 192px print copy — the 1024px original is 1.7 MB and would be base64-inlined
into every document) + ward name + the Sunday's date.

Footer: up to two QR codes side by side, one per store, each labelled. **Only stores with a
configured URL are rendered** — today that is iOS only, so one QR prints. Filling in the Play Store
URL in `src/lib/storeLinks.ts` makes the second appear with no layout change.

QR images are **pre-generated as assets at build time** (`scripts/generate-pdf-assets.mjs`, `qrcode`
as a devDependency). No runtime QR dependency: the URLs are fixed, and a build-time asset cannot
misbehave under Hermes.

## Implementation shape

- `src/lib/storeLinks.ts` — the store URLs, in one place.
- `src/lib/agendaPdf.ts` — **pure**: cards + branding + labels → HTML string. All the logic lives
  here so it is testable without native modules.
- `src/lib/exportAgendaPdf.ts` — thin wrapper: `expo-print` → `expo-sharing`. Native, minimal.
- Button + i18n keys in all three locales.

New runtime dependency: `expo-print` (`expo-sharing` is already installed).

## Acceptance

Behavioural tests over the pure builder, asserting the field matrix above under: a speech Sunday
with everything filled, an empty speech Sunday, `has_second_speech` off, a testimony Sunday, a
special presentation replacing the intermediate hymn. Plus: empty mandatory fields render a
fill-in line, optional empties do not appear at all, and the footer renders one QR today and two
when both URLs are set.

Verification that matters most is not a test: **the PDF has to be looked at.** Tests can prove the
right fields are present; they cannot tell you it is legible on paper.

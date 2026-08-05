/**
 * A4 page geometry for the generated PDF.
 *
 * expo-print does NOT default to A4 — `printToFileAsync` defaults to US Letter (612x792pt at
 * 72 PPI), and the CSS `@page { size: A4 }` is ignored by the native print formatter. Asking for
 * A4 means passing the point dimensions explicitly.
 *
 * The white border is CSS padding on the page body, not a `@page` margin and not the native
 * `margins` option: `@page` margins are unreliable across the iOS/Android print paths, and
 * `margins` is iOS-only. Padding is ordinary layout, so it renders identically everywhere. The
 * native margins are pinned to zero so the two cannot stack into a fat, uneven border.
 */

/** A4 at 72 PPI: 210mm x 297mm. */
export const A4_WIDTH_PT = 595;
export const A4_HEIGHT_PT = 842;

/** Zero, deliberately — the border comes from CSS. iOS-only option; harmless elsewhere. */
export const NATIVE_MARGINS = { top: 0, right: 0, bottom: 0, left: 0 } as const;

/**
 * The white border, in millimetres.
 *
 * Thin, but not thinner than a typical desktop printer's unprintable edge (~5mm) — a smaller value
 * would put content in the region the printer physically cannot reach, and it would be clipped.
 */
export const PAGE_PADDING_MM = 10;

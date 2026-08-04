/**
 * Builds the printable agenda as an HTML string.
 *
 * Pure on purpose: everything that decides what the PDF SAYS lives here, so it can be tested
 * without expo-print, a device, or a rendering engine. The native side (exportAgendaPdf.ts) only
 * turns this string into a file and hands it to the share sheet.
 *
 * The content comes from `buildPresentationCards()`, the same builder Presentation Mode uses. That
 * is deliberate: a second agenda renderer would drift, and the printed sheet would eventually
 * disagree with what the conductor sees on screen. It also means the include/omit rules are
 * already correct — the builder pushes an optional field only when it has data — so the rule here
 * is simply "render everything you are given".
 *
 * An emitted field with an empty value renders as a FILL-IN LINE rather than being dropped: a
 * printed agenda is partly a form, and "Pianist ______" is the point.
 */

import type { PresentationCard, PresentationField } from '../hooks/usePresentationMode';

export interface AgendaPdfStore {
  /** Printed under the QR code, e.g. "App Store". */
  label: string;
  /** `data:image/png;base64,...` */
  dataUri: string;
}

export interface AgendaPdfBranding {
  appName: string;
  /** Ward name; omitted from the header when empty. */
  wardName: string;
  /** Already-formatted, already-localised date. */
  dateLabel: string;
  /** App icon as a data URI, or null to print the header without it. */
  iconDataUri: string | null;
  /** One entry per PUBLISHED store. Zero entries renders no footer QR block. */
  stores: AgendaPdfStore[];
}

export interface AgendaPdfLabels {
  /** e.g. "Agenda da Reunião Sacramental" */
  documentTitle: string;
  /** e.g. "Baixe o app" */
  downloadPrompt: string;
}

/** Escape text for HTML. Names carry apostrophes and ampersands; both break unescaped markup. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Split a \n-joined value into its non-blank lines. */
function lines(value: string): string[] {
  return value.split('\n').filter((l) => l.trim() !== '');
}

function renderFieldValue(field: PresentationField): string {
  const value = field.value ?? '';

  // Empty -> a rule to write on. This is what makes the sheet usable as a form.
  if (value.trim() === '') {
    return '<span class="blank"></span>';
  }

  if (field.type === 'bullet_list') {
    const items = lines(value);
    if (items.length === 0) return '<span class="blank"></span>';
    if (items.length === 1) return `<span class="v">${escapeHtml(items[0])}</span>`;
    return `<ul class="list">${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
  }

  if (field.type === 'multiline') {
    return `<span class="v">${lines(value).map(escapeHtml).join('<br/>')}</span>`;
  }

  return `<span class="v">${escapeHtml(value)}</span>`;
}

function renderField(field: PresentationField): string {
  const stacked = field.type === 'bullet_list' && lines(field.value ?? '').length > 1;
  return (
    `<div class="row${stacked ? ' stacked' : ''}">` +
    `<div class="l">${escapeHtml(field.label)}</div>` +
    `<div class="f">${renderFieldValue(field)}</div>` +
    `</div>`
  );
}

function renderCard(card: PresentationCard): string {
  return (
    `<section class="card">` +
    `<h2>${escapeHtml(card.title)}</h2>` +
    card.fields.map(renderField).join('') +
    `</section>`
  );
}

function renderFooter(branding: AgendaPdfBranding, labels: AgendaPdfLabels): string {
  if (branding.stores.length === 0) return '';
  const codes = branding.stores
    .map(
      (s) =>
        `<div class="qr"><img src="${s.dataUri}" alt="${escapeHtml(s.label)}"/>` +
        `<div class="qrlabel">${escapeHtml(s.label)}</div></div>`
    )
    .join('');
  return (
    `<footer>` +
    `<div class="prompt">${escapeHtml(labels.downloadPrompt)}</div>` +
    `<div class="qrs">${codes}</div>` +
    `</footer>`
  );
}

/**
 * The whole document. Styling is inline (no external stylesheet) because the HTML is handed
 * straight to the platform print engine, which fetches nothing.
 */
export function buildAgendaPdfHtml(
  cards: PresentationCard[],
  branding: AgendaPdfBranding,
  labels: AgendaPdfLabels
): string {
  const icon = branding.iconDataUri
    ? `<img class="icon" src="${branding.iconDataUri}" alt=""/>`
    : '';
  const ward = branding.wardName.trim()
    ? `<div class="ward">${escapeHtml(branding.wardName)}</div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(labels.documentTitle)}</title>
<style>
  @page { size: A4; margin: 14mm 14mm 12mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: #1a1a1a; font-size: 11pt; line-height: 1.35; margin: 0;
  }
  header { display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #1a1a1a;
           padding-bottom: 8px; margin-bottom: 14px; }
  .icon { width: 46px; height: 46px; border-radius: 9px; }
  .titles { flex: 1; }
  .doctitle { font-size: 15pt; font-weight: 700; }
  .ward { font-size: 11pt; color: #444; }
  .date { font-size: 11pt; font-weight: 600; white-space: nowrap; }
  .card { margin-bottom: 13px; break-inside: avoid; }
  h2 { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: .07em;
       color: #555; margin: 0 0 5px; padding-bottom: 3px; border-bottom: 1px solid #ccc; }
  .row { display: flex; align-items: baseline; gap: 10px; padding: 3px 0; }
  .row.stacked { display: block; }
  .l { width: 38%; color: #555; }
  .row.stacked .l { width: auto; margin-bottom: 2px; }
  .f { flex: 1; min-width: 0; }
  .v { font-weight: 600; }
  /* Empty mandatory field: a line to write on. */
  .blank { display: block; border-bottom: 1px solid #999; height: 0; margin-top: 9px; }
  .list { margin: 0; padding-left: 17px; font-weight: 600; }
  .list li { padding: 1px 0; }
  footer { margin-top: 16px; padding-top: 9px; border-top: 1px solid #ccc;
           display: flex; align-items: center; gap: 14px; break-inside: avoid; }
  .prompt { font-size: 9pt; color: #555; }
  .qrs { display: flex; gap: 14px; }
  .qr { text-align: center; }
  .qr img { width: 62px; height: 62px; display: block; }
  .qrlabel { font-size: 7pt; color: #555; margin-top: 2px; }
</style>
</head>
<body>
<header>
  ${icon}
  <div class="titles">
    <div class="doctitle">${escapeHtml(labels.documentTitle)}</div>
    ${ward}
  </div>
  <div class="date">${escapeHtml(branding.dateLabel)}</div>
</header>
${cards.map(renderCard).join('')}
${renderFooter(branding, labels)}
</body>
</html>`;
}

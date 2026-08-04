/**
 * Where the app can be downloaded. One place, so the PDF footer, any future share text and the
 * QR-generation script cannot drift apart.
 *
 * A store with a `null` url is treated as unpublished: it produces no QR code and no footer entry.
 * To add Android, fill in `url` here and re-run `node scripts/generate-store-qr.mjs`.
 */

export interface StoreLink {
  /** Stable key; also the QR asset filename (`store-qr-<id>.png`). */
  id: 'ios' | 'android';
  /** Shown under the QR code in the PDF footer. */
  label: string;
  /** null = not published yet. */
  url: string | null;
}

export const STORE_LINKS: StoreLink[] = [
  {
    id: 'ios',
    label: 'App Store',
    url: 'https://apps.apple.com/br/app/planejador-reunião-sacramental/id6759450448',
  },
  {
    id: 'android',
    label: 'Google Play',
    // TODO: not published yet. When it is, the URL is derivable from the package id:
    // https://play.google.com/store/apps/details?id=com.sacramentmeetingmanager.app
    url: null,
  },
];

/** Only the stores that are actually published. */
export function publishedStoreLinks(links: StoreLink[] = STORE_LINKS): StoreLink[] {
  return links.filter((s): s is StoreLink & { url: string } => !!s.url);
}

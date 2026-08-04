/**
 * Turns the agenda HTML into a PDF file and hands it to the system share sheet.
 *
 * Deliberately thin. Everything that decides what the document SAYS lives in agendaPdf.ts, which is
 * pure and tested; this file only touches the native APIs, which cannot be exercised in jest.
 *
 * The share sheet — rather than a silent save — is what makes the feature useful: from there the
 * user can print, AirDrop, save to Files, or send it to the ward group.
 */

import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { buildAgendaPdfHtml, type AgendaPdfBranding, type AgendaPdfLabels } from './agendaPdf';
import { publishedStoreLinks } from './storeLinks';
import type { PresentationCard } from '../hooks/usePresentationMode';

/**
 * Store QR assets, keyed by store id. `require` cannot take a computed path, so published stores
 * are looked up here. A store with no asset simply does not appear in the footer.
 */
const QR_ASSETS: Partial<Record<string, number>> = {
  ios: require('../../assets/store-qr-ios.png'),
  // android: require('../../assets/store-qr-android.png'), // add when the Play Store URL is set
};

// Print-sized copy, not assets/icon.png: that is 1024x1024 / 1.7 MB and gets base64-inlined into
// every generated document. Regenerate with scripts/generate-pdf-assets.mjs.
const ICON_ASSET = require('../../assets/pdf-icon.png');

/** Read a bundled asset as a data URI, or null if it cannot be read. */
async function assetToDataUri(mod: number): Promise<string | null> {
  try {
    const asset = Asset.fromModule(mod);
    await asset.downloadAsync();
    const base64 = await new File(asset.localUri ?? asset.uri).base64();
    return `data:image/png;base64,${base64}`;
  } catch {
    // Branding is decoration: a missing image must not cost the user their agenda.
    return null;
  }
}

export interface ExportAgendaPdfInput {
  cards: PresentationCard[];
  /** Ward name for the header; may be empty. */
  wardName: string;
  /** Already-formatted, already-localised date. */
  dateLabel: string;
  labels: AgendaPdfLabels;
  /** Suggested filename without extension, e.g. `agenda-2026-08-09`. */
  fileName: string;
}

export interface ExportAgendaPdfResult {
  uri: string;
  /** False when the platform offers no share sheet; the file still exists at `uri`. */
  shared: boolean;
}

/**
 * Build the PDF and open the share sheet. Throws if the PDF itself cannot be produced — the caller
 * surfaces that; a silent failure would leave the user tapping a button that appears to do nothing.
 */
export async function exportAgendaPdf(input: ExportAgendaPdfInput): Promise<ExportAgendaPdfResult> {
  const [iconDataUri, ...storeUris] = await Promise.all([
    assetToDataUri(ICON_ASSET),
    ...publishedStoreLinks().map((s) => {
      const mod = QR_ASSETS[s.id];
      return mod ? assetToDataUri(mod) : Promise.resolve(null);
    }),
  ]);

  const stores = publishedStoreLinks()
    .map((s, i) => ({ label: s.label, dataUri: storeUris[i] }))
    .filter((s): s is { label: string; dataUri: string } => !!s.dataUri);

  const branding: AgendaPdfBranding = {
    appName: 'Sacrament Meeting Planner',
    wardName: input.wardName,
    dateLabel: input.dateLabel,
    iconDataUri,
    stores,
  };

  const html = buildAgendaPdfHtml(input.cards, branding, input.labels);
  const { uri } = await Print.printToFileAsync({ html });

  // printToFileAsync names the file with a random uuid; rename so the share sheet and the user's
  // Files app show something meaningful.
  let finalUri = uri;
  try {
    const src = new File(uri);
    const dest = new File(src.parentDirectory, `${input.fileName}.pdf`);
    if (dest.exists) dest.delete();
    src.move(dest);
    finalUri = dest.uri;
  } catch {
    // Keep the generated name rather than failing the export over a cosmetic rename.
  }

  if (!(await Sharing.isAvailableAsync())) {
    return { uri: finalUri, shared: false };
  }

  await Sharing.shareAsync(finalUri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: input.labels.documentTitle,
  });
  return { uri: finalUri, shared: true };
}

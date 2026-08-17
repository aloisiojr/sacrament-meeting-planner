/**
 * S6 — on-device PDF text extractor (WebView + pdf.js). Renders a hidden WebView that loads pdf.js
 * from the app's BUNDLED assets (assets/pdfjs/*.txt — offline, no CDN, LGPD-safe), decodes the given
 * PDF base64 IN MEMORY, extracts each page's text grouped into visual lines (by Y then X), and
 * returns the joined text. The raw PDF is never persisted or uploaded (AC1, AC15).
 *
 * ⚠️ The WebView/pdf.js path cannot run under vitest — validate on-device. The heavy, correctness-
 * critical logic (parse/repair/merge) is in the unit-tested pure modules; this bridge is thin.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

import { ROW_GAP_THRESHOLD_JS } from '../lib/lcrPdfLayout';

export interface PdfTextExtractorProps {
  /** Base64 of the picked PDF. */
  base64: string;
  onResult: (text: string) => void;
  onError: (message: string) => void;
}

// In-WebView bootstrap: rebuild pdf.js from embedded base64, extract text grouped into lines.
/** Exported so a test can evaluate the injected script and prove the threshold works in there. */
export const BOOTSTRAP = `
  // Literal source from src/lib/lcrPdfLayout.ts. NOT the function itself: minification makes it
  // anonymous (a SyntaxError once injected) and Hermes drops function source entirely — both
  // invisible in the dev client, which serves unminified JS. See the note in that module.
  ${ROW_GAP_THRESHOLD_JS}
  const b64ToText = (b64) => decodeURIComponent(escape(atob(b64)));
  const runReady = () => window.ReactNativeWebView.postMessage(JSON.stringify({ ready: true }));
  window.__runPdf = async (pdfB64) => {
    try {
      const libUrl = URL.createObjectURL(new Blob([b64ToText(window.__lib)], { type: 'text/javascript' }));
      const workerUrl = URL.createObjectURL(new Blob([b64ToText(window.__worker)], { type: 'text/javascript' }));
      const pdfjsLib = await import(libUrl);
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      const raw = atob(pdfB64);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      const doc = await pdfjsLib.getDocument({ data: bytes }).promise;
      // Pass 1: per page, collect text items grouped into visual lines (by Y). Keep raw items
      // (x, advance width, glyph size) so we can split the name column from the data columns and
      // glue accented glyphs (pdf.js emits accents like ç/ã/é as separate adjacent items).
      const pages = [];
      const genderXs = [];
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const tc = await page.getTextContent();
        const lines = new Map();
        for (const it of tc.items) {
          if (typeof it.str !== 'string' || !it.str.trim()) continue;
          const y = Math.round(it.transform[5]);
          const o = {
            x: it.transform[4],
            w: it.width || 0,
            size: Math.hypot(it.transform[2], it.transform[3]) || it.height || 8,
            s: it.str,
          };
          if (!lines.has(y)) lines.set(y, []);
          lines.get(y).push(o);
          if (/^[VMF]$/.test(o.s.trim())) genderXs.push(o.x); // Gender (Sexo) column marker
        }
        const ys = Array.from(lines.keys()).sort((a, b) => b - a); // top → bottom
        pages.push({ ys, lines });
      }
      // Name/data boundary = just left of the Gender column (the first data column after the name).
      // Names always sit left of it; gender/age/date/phone/email sit at or after it. Splitting by
      // this X keeps an email that wrapped ABOVE the name from being mis-read as the name, and keeps
      // phone/email out of the name entirely.
      let boundary = Infinity;
      if (genderXs.length) {
        genderXs.sort((a, b) => a - b);
        boundary = genderXs[Math.floor(genderXs.length / 2)] - 4;
      }
      // A member's name can wrap across visual lines within one table ROW. Rows are separated by a
      // larger vertical gap than lines within a row. Threshold = midpoint of the two MOST FREQUENT
      // line-gaps (within-row spacing vs between-row spacing).
      const freq = new Map();
      for (const pg of pages) {
        for (let k = 1; k < pg.ys.length; k++) {
          const g = Math.round(Math.abs(pg.ys[k - 1] - pg.ys[k]));
          if (g > 0) freq.set(g, (freq.get(g) || 0) + 1);
        }
      }
      // See src/lib/lcrPdfLayout.ts — the threshold has to SEPARATE the record gap from the
      // inside-record ones, not average the two most frequent (which split three-line names).
      const thr = rowGapThreshold(freq);
      // Join items into text: group by line (Y, top→bottom), order each line left→right by X and
      // insert a space only for a real gap (word/column boundary, NOT between accent glyphs), then
      // join lines with a space. So "Gon" "ç" "alves" → "Gonçalves", "Jos" "é" → "José".
      const joinCol = (items) => {
        const byY = new Map();
        for (const o of items) { if (!byY.has(o.y)) byY.set(o.y, []); byY.get(o.y).push(o); }
        const yy = Array.from(byY.keys()).sort((a, b) => b - a);
        const parts = [];
        for (const y of yy) {
          const arr = byY.get(y).map((o, i) => ({ ...o, i }));
          arr.sort((a, b) => (a.x - b.x) || (a.i - b.i));
          let text = '';
          let prevEnd = null;
          for (const o of arr) {
            if (prevEnd !== null && o.x - prevEnd > o.size * 0.2 && !text.endsWith(' ') && !o.s.startsWith(' ')) text += ' ';
            text += o.s;
            prevEnd = o.x + o.w;
          }
          parts.push(text.trim());
        }
        return parts.join(' ').replace(/\\s+/g, ' ').trim();
      };
      // Emit one line per table row: "<name column> <data columns>".
      const out = [];
      for (const pg of pages) {
        let cur = [];
        const flush = () => {
          if (!cur.length) return;
          const items = [];
          for (const y of cur) for (const o of pg.lines.get(y)) items.push({ ...o, y });
          const line = (joinCol(items.filter((o) => o.x < boundary)) + ' ' + joinCol(items.filter((o) => o.x >= boundary)))
            .replace(/\\s+/g, ' ')
            .trim();
          if (line) out.push(line);
          cur = [];
        };
        for (let k = 0; k < pg.ys.length; k++) {
          if (k > 0 && Math.abs(pg.ys[k - 1] - pg.ys[k]) >= thr) flush();
          cur.push(pg.ys[k]);
        }
        flush();
      }
      window.ReactNativeWebView.postMessage(JSON.stringify({ ok: true, text: out.join('\\n') }));
    } catch (e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ ok: false, error: String((e && e.message) || e) }));
    }
  };
  runReady();
  true;
`;

async function loadPdfJsBase64(): Promise<{ lib: string; worker: string }> {
  const [libAsset, workerAsset] = await Promise.all([
    Asset.fromModule(require('../../assets/pdfjs/pdf.min.mjs.txt')).downloadAsync(),
    Asset.fromModule(require('../../assets/pdfjs/pdf.worker.min.mjs.txt')).downloadAsync(),
  ]);
  const [lib, worker] = await Promise.all([
    new File(libAsset.localUri ?? libAsset.uri).base64(),
    new File(workerAsset.localUri ?? workerAsset.uri).base64(),
  ]);
  return { lib, worker };
}

export function PdfTextExtractor({ base64, onResult, onError }: PdfTextExtractorProps) {
  const ref = useRef<WebView>(null);
  const [assets, setAssets] = useState<{ lib: string; worker: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPdfJsBase64()
      .then((a) => !cancelled && setAssets(a))
      .catch((e) => !cancelled && onError(String(e?.message ?? e)));
    return () => {
      cancelled = true;
    };
  }, [onError]);

  const html = useMemo(() => {
    if (!assets) return null;
    return `<!doctype html><html><head><meta charset="utf-8"></head><body><script type="module">
      window.__lib = ${JSON.stringify(assets.lib)};
      window.__worker = ${JSON.stringify(assets.worker)};
      ${BOOTSTRAP}
    </script></body></html>`;
  }, [assets]);

  const handleMessage = (event: WebViewMessageEvent) => {
    let msg: { ready?: boolean; ok?: boolean; text?: string; error?: string };
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.ready) {
      // Inject the (in-memory) PDF and run extraction. JSON.stringify escapes the base64 safely.
      ref.current?.injectJavaScript(`window.__runPdf(${JSON.stringify(base64)}); true;`);
    } else if (msg.ok) {
      onResult(msg.text ?? '');
    } else if (msg.ok === false) {
      onError(msg.error ?? 'PDF extraction failed');
    }
  };

  if (!html) return null;
  return (
    <WebView
      ref={ref}
      source={{ html }}
      originWhitelist={['*']}
      javaScriptEnabled
      onMessage={handleMessage}
      onError={() => onError('WebView failed to load')}
      // Hidden, off-screen: it only runs the extraction, never shown.
      style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}
    />
  );
}

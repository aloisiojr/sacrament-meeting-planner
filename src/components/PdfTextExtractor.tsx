/**
 * S6 — on-device PDF reader (WebView + pdf.js). Renders a hidden WebView that loads pdf.js from the
 * app's BUNDLED assets (assets/pdfjs/*.txt — offline, no CDN, LGPD-safe), decodes the given PDF
 * base64 IN MEMORY and returns each page's RAW contents: text fragments with their coordinates, the
 * page's drawn segments and filled rectangles, and its viewport transform. The raw PDF is never
 * persisted or uploaded (AC1, AC15).
 *
 * ⚠️ Nothing in this file can run under jest — it only executes inside a WebView, on a device. That
 * is exactly why it holds no logic: it reads and forwards. Everything that decides anything lives in
 * `src/lib/lcrPdfPage.ts` and its neighbours, as plain TS with tests.
 *
 * It used to build the record text in here, which cost a copy of `rowGapThreshold` as a literal
 * string — `${fn}` cannot be injected, because minification makes the function anonymous and Hermes
 * drops function source. Moving the logic out removed that duplication instead of guarding it.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';

import type { LcrRawPage } from '../lib/lcrPdfPage';
import {
  EXTRACTION_TIMEOUT_MS,
  PDF_TIMEOUT,
  PDF_TOO_LARGE,
  isBase64TooLarge,
} from '../lib/pdfExtraction';

export interface PdfTextExtractorProps {
  /** Base64 of the picked PDF. */
  base64: string;
  onResult: (pages: LcrRawPage[]) => void;
  onError: (message: string) => void;
}

// In-WebView bootstrap: rebuild pdf.js from embedded base64 and forward each page's raw contents.
/** Exported so a test can at least prove the script parses and defines its entry point. */
export const BOOTSTRAP = `
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
      const OPS = pdfjsLib.OPS;
      const round = (n) => Math.round(n * 100) / 100;
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        // Text fragments. Keep the advance width and glyph size: pdf.js emits accents (ç/ã/é) as
        // separate adjacent items, and telling "same word" from "next column" needs both.
        const items = [];
        for (const it of (await page.getTextContent()).items) {
          if (typeof it.str !== 'string' || !it.str.trim()) continue;
          items.push({
            x: round(it.transform[4]),
            y: round(it.transform[5]),
            w: round(it.width || 0),
            size: round(Math.hypot(it.transform[2], it.transform[3]) || it.height || 8),
            s: it.str,
          });
        }
        // Drawn geometry. The generator draws the table's row and column rules, which say where a
        // record ends far more reliably than any spacing we could infer. Colour is forwarded as-is
        // and never interpreted here — deciding is not this file's job.
        //
        // Path coordinates live in whatever coordinate system the content stream installed with a
        // cm operator, NOT in the text's space, so the current CTM travels with each shape and the
        // conversion happens in TS where it can be tested. Tracking save/restore/transform is
        // bookkeeping, not a decision.
        const segments = [];
        const rects = [];
        const ol = await page.getOperatorList();
        let fill = null;
        let ctm = [1, 0, 0, 1, 0, 0];
        const stack = [];
        const mul = (m, n) => [
          m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
          m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
          m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
        ];
        for (let i = 0; i < ol.fnArray.length; i++) {
          const fn = ol.fnArray[i];
          if (fn === OPS.save) { stack.push(ctm.slice()); continue; }
          if (fn === OPS.restore) { ctm = stack.pop() || ctm; continue; }
          if (fn === OPS.transform) { ctm = mul(ctm, ol.argsArray[i]); continue; }
          if (fn === OPS.setFillRGBColor) {
            fill = ol.argsArray[i].join(',');
            continue;
          }
          if (fn !== OPS.constructPath) continue;
          const m = ctm.map(round);
          const pathOps = ol.argsArray[i][0];
          const args = ol.argsArray[i][1];
          let k = 0;
          let prev = null;
          for (const op of pathOps) {
            if (op === OPS.rectangle) {
              rects.push({
                x: round(args[k]), y: round(args[k + 1]),
                w: round(args[k + 2]), h: round(args[k + 3]), color: fill, m: m,
              });
              k += 4;
              prev = null;
            } else if (op === OPS.moveTo || op === OPS.lineTo) {
              const pt = [args[k], args[k + 1]];
              if (prev && op === OPS.lineTo) {
                segments.push({
                  x1: round(prev[0]), y1: round(prev[1]),
                  x2: round(pt[0]), y2: round(pt[1]), m: m,
                });
              }
              prev = pt;
              k += 2;
            } else if (op === OPS.curveTo) {
              k += 6;
              prev = null;
            }
          }
        }
        const view = page.getViewport({ scale: 1 });
        // One message per page, not one giant postMessage at the end: a ward-sized PDF
        // would otherwise cross the bridge as a single multi-hundred-KB string.
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'page', index: p - 1,
          page: { width: view.width, height: view.height, items, segments, rects },
        }));
      }
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'done', ok: true, numPages: doc.numPages }));
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

// Module-level cache: lib+worker (≈2,4 MB em base64) are read ONCE per process, not per mount.
// A failure clears the cache so a retry can try reading again.
let assetsPromise: Promise<{ lib: string; worker: string }> | null = null;
function loadPdfJsAssets(): Promise<{ lib: string; worker: string }> {
  if (!assetsPromise) {
    assetsPromise = loadPdfJsBase64().catch((e) => {
      assetsPromise = null;
      throw e;
    });
  }
  return assetsPromise;
}

export function PdfTextExtractor({ base64, onResult, onError }: PdfTextExtractorProps) {
  const ref = useRef<WebView>(null);
  const [assets, setAssets] = useState<{ lib: string; worker: string } | null>(null);
  // Stable callbacks: parents pass inline closures, so the latest callback lives in a ref and
  // the extraction effect depends only on `base64` — a parent re-render never restarts it.
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  }, [onResult, onError]);
  const settledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pagesRef = useRef<(LcrRawPage | undefined)[]>([]);

  const tooLarge = isBase64TooLarge(base64);

  useEffect(() => {
    settledRef.current = false;
    pagesRef.current = [];
    if (tooLarge) {
      settledRef.current = true;
      onErrorRef.current(PDF_TOO_LARGE);
      return;
    }
    timerRef.current = setTimeout(() => {
      if (settledRef.current) return;
      settledRef.current = true;
      onErrorRef.current(PDF_TIMEOUT);
    }, EXTRACTION_TIMEOUT_MS);
    let cancelled = false;
    loadPdfJsAssets()
      .then((a) => !cancelled && setAssets(a))
      .catch((e) => {
        if (cancelled || settledRef.current) return;
        settledRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        onErrorRef.current(String(e?.message ?? e));
      });
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [base64, tooLarge]);

  const html = useMemo(() => {
    if (!assets) return null;
    return `<!doctype html><html><head><meta charset="utf-8"></head><body><script type="module">
      window.__lib = ${JSON.stringify(assets.lib)};
      window.__worker = ${JSON.stringify(assets.worker)};
      ${BOOTSTRAP}
    </script></body></html>`;
  }, [assets]);

  const settleError = (message: string) => {
    if (settledRef.current) return;
    settledRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    onErrorRef.current(message);
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    if (settledRef.current) return; // late message after timeout/error: ignore
    let msg: {
      ready?: boolean;
      ok?: boolean;
      type?: string;
      index?: number;
      page?: LcrRawPage;
      numPages?: number;
      error?: string;
    };
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.ready) {
      // Inject the (in-memory) PDF and run extraction. JSON.stringify escapes the base64 safely.
      ref.current?.injectJavaScript(`window.__runPdf(${JSON.stringify(base64)}); true;`);
    } else if (msg.type === 'page' && typeof msg.index === 'number' && msg.page) {
      pagesRef.current[msg.index] = msg.page;
    } else if (msg.type === 'done') {
      const expected = msg.numPages ?? pagesRef.current.length;
      const pages = pagesRef.current.slice(0, expected);
      if (pages.length < expected || pages.some((p) => !p)) {
        settleError('PDF extraction failed');
        return;
      }
      settledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      onResultRef.current(pages as LcrRawPage[]);
    } else if (msg.ok === false) {
      settleError(msg.error ?? 'PDF extraction failed');
    }
  };

  if (tooLarge || !html) return null;
  return (
    <WebView
      ref={ref}
      source={{ html }}
      originWhitelist={['*']}
      javaScriptEnabled
      onMessage={handleMessage}
      onError={() => settleError('WebView failed to load')}
      // Hidden, off-screen: it only runs the extraction, never shown.
      style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}
    />
  );
}

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

export interface PdfTextExtractorProps {
  /** Base64 of the picked PDF. */
  base64: string;
  onResult: (text: string) => void;
  onError: (message: string) => void;
}

// In-WebView bootstrap: rebuild pdf.js from embedded base64, extract text grouped into lines.
const BOOTSTRAP = `
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
      const out = [];
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const tc = await page.getTextContent();
        const lines = new Map();
        for (const it of tc.items) {
          if (typeof it.str !== 'string' || !it.str.trim()) continue;
          const y = Math.round(it.transform[5]);
          const x = it.transform[4];
          if (!lines.has(y)) lines.set(y, []);
          lines.get(y).push({ x, s: it.str });
        }
        const ys = Array.from(lines.keys()).sort((a, b) => b - a); // top → bottom
        for (const y of ys) {
          const parts = lines.get(y).sort((a, b) => a.x - b.x).map((o) => o.s);
          out.push(parts.join(' ').replace(/\\s+/g, ' ').trim());
        }
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

/**
 * RAP-01 — PdfTextExtractor behavioral tests with the WebView and asset I/O mocked out.
 * The WebView internals cannot run under jest (device-only), so these pin the host-side
 * contract: ceiling before any read, timeout with late-result discard, per-page assembly,
 * module-level asset cache, and stable callbacks across parent re-renders.
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { PdfTextExtractor } from '../components/PdfTextExtractor';
import { EXTRACTION_TIMEOUT_MS, PDF_TIMEOUT, PDF_TOO_LARGE } from '../lib/pdfExtraction';
import type { LcrRawPage } from '../lib/lcrPdfPage';

const { act } = TestRenderer;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockState = {
  fileBase64Calls: 0,
  webViewMounts: 0,
  injectCalls: [] as string[],
  props: null as null | {
    onMessage: (e: { nativeEvent: { data: string } }) => void;
    onError: () => void;
  },
};

// Never load the real pdf.js bundles under jest (they use import.meta); the asset ids are stubs.
jest.mock('../../assets/pdfjs/pdf.min.mjs.txt', () => ({ default: 1 }));
jest.mock('../../assets/pdfjs/pdf.worker.min.mjs.txt', () => ({ default: 2 }));

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: () => ({
      downloadAsync: async () => ({ localUri: 'file:///pdfjs-asset', uri: 'file:///pdfjs-asset' }),
    }),
  },
}));

jest.mock('expo-file-system', () => ({
  File: class MockFile {
    constructor(..._args: unknown[]) {}
    async base64(): Promise<string> {
      mockState.fileBase64Calls += 1;
      return 'b64-asset-content';
    }
  },
}));

jest.mock('react-native-webview', () => {
  const ReactLocal = require('react') as typeof React;
  const WebView = ReactLocal.forwardRef(
    (
      props: {
        onMessage: (e: { nativeEvent: { data: string } }) => void;
        onError: () => void;
      },
      ref: React.Ref<{ injectJavaScript: (js: string) => void }>
    ) => {
      ReactLocal.useEffect(() => {
        mockState.webViewMounts += 1;
      }, []);
      ReactLocal.useImperativeHandle(ref, () => ({
        injectJavaScript: (js: string) => {
          mockState.injectCalls.push(js);
        },
      }));
      mockState.props = props;
      return null;
    }
  );
  return { WebView };
});

const page = (width: number): LcrRawPage => ({ width, height: 100, items: [], segments: [], rects: [] });
const send = (data: unknown) => {
  act(() => {
    mockState.props?.onMessage({ nativeEvent: { data: JSON.stringify(data) } });
  });
};

async function renderExtractor(base64: string, onResult = jest.fn(), onError = jest.fn()) {
  let r!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    r = TestRenderer.create(React.createElement(PdfTextExtractor, { base64, onResult, onError }));
  });
  return { r, onResult, onError };
}

describe('PdfTextExtractor (RAP-01)', () => {
  beforeEach(() => {
    mockState.injectCalls = [];
    mockState.props = null;
  });

  it('fails fast above the ceiling: no WebView mounted and no asset read', async () => {
    const onError = jest.fn();
    const onResult = jest.fn();
    let r!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      r = TestRenderer.create(
        React.createElement(PdfTextExtractor, { base64: 'A'.repeat(14_000_004), onResult, onError })
      );
    });
    expect(onError).toHaveBeenCalledWith(PDF_TOO_LARGE);
    expect(onResult).not.toHaveBeenCalled();
    expect(mockState.webViewMounts).toBe(0);
    expect(mockState.fileBase64Calls).toBe(0);
    act(() => r.unmount());
  });

  it('times out with a visible error code and ignores a late result', async () => {
    jest.useFakeTimers();
    try {
      const { r, onResult, onError } = await renderExtractor('QUJD');
      expect(mockState.props).not.toBeNull();
      act(() => {
        jest.advanceTimersByTime(EXTRACTION_TIMEOUT_MS);
      });
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(PDF_TIMEOUT);
      // Late WebView answer after the timeout must not resurrect the import.
      send({ type: 'page', index: 0, page: page(1) });
      send({ type: 'done', ok: true, numPages: 1 });
      expect(onResult).not.toHaveBeenCalled();
      act(() => r.unmount());
    } finally {
      jest.useRealTimers();
    }
  });

  it('assembles per-page messages in order and only completes on done', async () => {
    const { r, onResult } = await renderExtractor('QUJDRA==');
    send({ ready: true });
    expect(mockState.injectCalls.some((js) => js.includes('__runPdf'))).toBe(true);
    send({ type: 'page', index: 1, page: page(2) });
    expect(onResult).not.toHaveBeenCalled();
    send({ type: 'page', index: 0, page: page(1) });
    expect(onResult).not.toHaveBeenCalled();
    send({ type: 'done', ok: true, numPages: 2 });
    expect(onResult).toHaveBeenCalledTimes(1);
    expect((onResult.mock.calls[0][0] as LcrRawPage[]).map((p) => p.width)).toEqual([1, 2]);
    act(() => r.unmount());
  });

  it('reads the pdf.js assets once per process across mounts', async () => {
    const first = await renderExtractor('QUJD');
    act(() => first.r.unmount());
    const second = await renderExtractor('QUJD');
    act(() => second.r.unmount());
    // lib + worker, exactly once, however many times the extractor mounted above.
    expect(mockState.fileBase64Calls).toBe(2);
  });

  it('parent re-render with new inline callbacks does not restart extraction', async () => {
    const oldResult = jest.fn();
    const newResult = jest.fn();
    let r!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      r = TestRenderer.create(
        React.createElement(PdfTextExtractor, { base64: 'QUJD', onResult: oldResult, onError: jest.fn() })
      );
    });
    const mountsBefore = mockState.webViewMounts;
    const readsBefore = mockState.fileBase64Calls;
    await act(async () => {
      r.update(
        React.createElement(PdfTextExtractor, { base64: 'QUJD', onResult: newResult, onError: jest.fn() })
      );
    });
    expect(mockState.webViewMounts).toBe(mountsBefore);
    expect(mockState.fileBase64Calls).toBe(readsBefore);
    // The latest callback receives the result (refs track the parent).
    send({ type: 'page', index: 0, page: page(7) });
    send({ type: 'done', ok: true, numPages: 1 });
    expect(newResult).toHaveBeenCalledTimes(1);
    expect(oldResult).not.toHaveBeenCalled();
    act(() => r.unmount());
  });
});

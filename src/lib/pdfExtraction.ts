/**
 * RAP-01 — limites puros da extração de PDF (sem WebView, sem I/O): o teto de tamanho e o
 * timeout que picker, extrator e testes compartilham. Fica em `lib/` porque a decisão
 * "este arquivo é grande demais para ler" precisa ser testável sem montar WebView.
 */

/** Teto do PDF aceito (10 MB). Acima disso nem o picker lê em base64 nem o extrator monta. */
export const MAX_PDF_BYTES = 10 * 1024 * 1024;

/** Timeout da extração na WebView: passou disso, erro visível com retry — nunca spinner eterno. */
export const EXTRACTION_TIMEOUT_MS = 75_000;

/** Códigos estáveis que o extrator passa a `onError` para o modal mapear para i18n. */
export const PDF_TOO_LARGE = 'pdf-too-large';
export const PDF_TIMEOUT = 'pdf-timeout';

/** Bytes decodificados estimados de um base64 (3 bytes a cada 4 chars, menos o padding). */
export function decodedBase64Bytes(base64: string): number {
  const len = base64.length;
  if (len === 0) return 0;
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor(len / 4) * 3 - padding);
}

export function isBase64TooLarge(base64: string, maxBytes: number = MAX_PDF_BYTES): boolean {
  return decodedBase64Bytes(base64) > maxBytes;
}

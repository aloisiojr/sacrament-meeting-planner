/**
 * O app reporta os próprios erros (EST-07) — sem SDK novo.
 *
 * Spec: `specs/fix-visibility-time.md`. Antes disto, um crash de render morria num
 * `console.error` do ErrorBoundary e nenhum handler global existia: em produção o app
 * quebrava invisível. Aqui o erro vira um `app_error` em `app_health_events`, reusando
 * `reportHealthEvent` (`lib/appHealth`) no padrão de `offline_dead_letter` (wave 1).
 *
 * Formato do evento (só números/booleanos — o sanitizador de `appHealth` recusa texto
 * por privacidade, então mensagem e stack NUNCA saem do aparelho):
 * `{ fromBoundary, fromGlobalHandler, isFatal, messageLength, stackLines, suppressed }`.
 *
 * Anti-flood: no máximo 1 evento por assinatura (nome + tamanho da mensagem) a cada
 * 60 s e teto global de 5 eventos/min por processo; o excedente é apenas contado e vai
 * como `suppressed` no próximo evento emitido — um loop determinístico de render não
 * pode inundar a tabela nem prender o aparelho.
 */
import { reportHealthEvent } from './appHealth';

export type AppErrorSource = 'boundary' | 'global';

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

let currentWardId: string | null = null;
const lastSentBySignature = new Map<string, number>();
let windowStart = 0;
let sentInWindow = 0;
let suppressedCount = 0;
let globalHandlerInstalled = false;

/**
 * Registra a ala corrente para os eventos (chamado pelo AuthProvider). Sem ala
 * (pré-login/sign-out) os eventos são descartados: a tabela é escopada por ala e
 * inventar uma poluiria o diagnóstico alheio.
 */
export function setErrorReporterWardId(wardId: string | null | undefined): void {
  currentWardId = wardId ? wardId : null;
}

/**
 * Registra um erro do app. Nunca lança e nunca bloqueia: um reporter que quebra
 * o caminho de erro é pior do que reporter nenhum.
 */
export function reportAppError(error: unknown, source: AppErrorSource, isFatal = false): void {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const now = Date.now();
    if (now - windowStart >= WINDOW_MS) {
      windowStart = now;
      sentInWindow = 0;
    }
    const signature = `${err.name}:${err.message.length}`;
    const lastSent = lastSentBySignature.get(signature);
    if ((lastSent !== undefined && now - lastSent < WINDOW_MS) || sentInWindow >= MAX_PER_WINDOW) {
      suppressedCount += 1;
      return;
    }
    lastSentBySignature.set(signature, now);
    sentInWindow += 1;
    const details = {
      fromBoundary: source === 'boundary',
      fromGlobalHandler: source === 'global',
      isFatal,
      messageLength: err.message.length,
      stackLines: err.stack ? err.stack.split('\n').length : 0,
      suppressed: suppressedCount,
    };
    suppressedCount = 0;
    void reportHealthEvent(currentWardId, 'app_error', details);
  } catch {
    // Reporter mudo é aceitável; reporter que lança, não.
  }
}

interface ErrorUtilsLike {
  getGlobalHandler?: () => ((error: unknown, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
}

/**
 * Instala o handler global de erros JS delegando ao handler anterior — reportar
 * nunca muda o comportamento de crash (redbox em dev, relatório do RN em produção).
 * Idempotente: instalar duas vezes não empilha handlers.
 */
export function installGlobalErrorHandler(): void {
  if (globalHandlerInstalled) return;
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!errorUtils?.setGlobalHandler) return;
  const previous = errorUtils.getGlobalHandler?.();
  errorUtils.setGlobalHandler((error, isFatal) => {
    reportAppError(error, 'global', isFatal ?? false);
    previous?.(error, isFatal);
  });
  globalHandlerInstalled = true;
}

/** Test-only: zera throttle/ala entre casos (estado é module-level por desenho). */
export function resetErrorReporterForTests(): void {
  currentWardId = null;
  lastSentBySignature.clear();
  windowStart = 0;
  sentInWindow = 0;
  suppressedCount = 0;
  globalHandlerInstalled = false;
}

/**
 * EST-07 — errorReporter: payload sem texto/PII, throttle por assinatura, teto 5/min.
 */
const mockReportHealthEvent = jest.fn(() => Promise.resolve());
jest.mock('../lib/appHealth', () => ({
  reportHealthEvent: (...a: unknown[]) => mockReportHealthEvent(...(a as [])),
}));

import {
  reportAppError,
  setErrorReporterWardId,
  resetErrorReporterForTests,
} from '../lib/errorReporter';

let now = 1_000_000;
const realNow = Date.now;

beforeEach(() => {
  jest.clearAllMocks();
  resetErrorReporterForTests();
  now = 1_000_000;
  Date.now = () => now;
  setErrorReporterWardId('ward-1');
});

afterEach(() => {
  Date.now = realNow;
});

describe('errorReporter — payload', () => {
  it('envia só números/booleanos, sem mensagem nem stack', () => {
    const err = new Error('SEGREDO nome do membro');
    err.stack = 'Error: SEGREDO\n at linha secreta';
    reportAppError(err, 'boundary');
    expect(mockReportHealthEvent).toHaveBeenCalledTimes(1);
    const [wardId, type, details] = mockReportHealthEvent.mock.calls[0] as unknown as [
      string, string, Record<string, unknown>,
    ];
    expect(wardId).toBe('ward-1');
    expect(type).toBe('app_error');
    expect(details).toEqual({
      fromBoundary: true,
      fromGlobalHandler: false,
      isFatal: false,
      messageLength: err.message.length,
      stackLines: 2,
      suppressed: 0,
    });
    expect(JSON.stringify(details)).not.toContain('SEGREDO');
    for (const v of Object.values(details)) {
      expect(['number', 'boolean']).toContain(typeof v);
    }
  });

  it('sem ala registrada, descarta o evento', () => {
    setErrorReporterWardId(null);
    // reportHealthEvent também descarta sem ward, mas o reporter passa null adiante;
    // o que importa: nenhum texto sai e a chamada carrega ward nula.
    reportAppError(new Error('x'), 'global', true);
    expect(mockReportHealthEvent).toHaveBeenCalledWith(
      null, 'app_error', expect.objectContaining({ fromGlobalHandler: true, isFatal: true })
    );
  });

  it('nunca lança com erro não-Error', () => {
    expect(() => reportAppError('falha crua', 'global')).not.toThrow();
    expect(mockReportHealthEvent).toHaveBeenCalledTimes(1);
  });
});

describe('errorReporter — throttle', () => {
  it('1 por assinatura (nome+tamanho) a cada 60s; excedente conta como suppressed', () => {
    reportAppError(new Error('aaaa'), 'boundary');
    reportAppError(new Error('bbbb'), 'boundary'); // mesmo nome+tamanho = mesma assinatura
    expect(mockReportHealthEvent).toHaveBeenCalledTimes(1);
    now += 61_000;
    reportAppError(new Error('cccc'), 'boundary');
    expect(mockReportHealthEvent).toHaveBeenCalledTimes(2);
    const details = (mockReportHealthEvent.mock.calls[1] as unknown[])[2] as { suppressed: number };
    expect(details.suppressed).toBe(1);
  });

  it('assinaturas distintas não se bloqueiam', () => {
    reportAppError(new Error('a'), 'boundary');
    reportAppError(new Error('aa'), 'boundary');
    expect(mockReportHealthEvent).toHaveBeenCalledTimes(2);
  });

  it('teto global de 5 eventos por janela de 60s', () => {
    for (let i = 0; i < 7; i++) {
      reportAppError(new Error('x'.repeat(i + 1)), 'global');
    }
    expect(mockReportHealthEvent).toHaveBeenCalledTimes(5);
    now += 61_000;
    reportAppError(new Error('depois da janela'), 'global');
    expect(mockReportHealthEvent).toHaveBeenCalledTimes(6);
    const details = (mockReportHealthEvent.mock.calls[5] as unknown[])[2] as { suppressed: number };
    expect(details.suppressed).toBe(2);
  });
});

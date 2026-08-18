/**
 * Passo 4 de `specs/app-health-events.plan.md` — AC6, AC8, AC9: o que o import de PDF registra.
 *
 * A decisão de emitir vive numa função pura de propósito. A alternativa seria testá-la renderizando
 * o `PdfImportModal`, que arrastaria WebView, react-query, tema e i18n — muito aparato para afirmar
 * "chamou duas vezes". Assim o que sobra no componente é uma linha, e o que decide tem teste.
 */
import { reportPdfImportHealth } from '../lib/appHealth';
import { supabase } from '../lib/supabase';

// jest-expo não popula expoConfig.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '2.0.0' } },
}));

const mockInsert = jest.fn();
jest.mock('../lib/supabase', () => ({
  supabase: { from: jest.fn(() => ({ insert: (...a: unknown[]) => mockInsert(...a) })) },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockInsert.mockResolvedValue({ error: null });
});

/** Um import que deu certo: grade usada, contagem batendo. */
const OK = { usedGrid: true, fallbackReason: null, records: 364, expectedCount: 364, pages: 14 };

const eventos = () => mockInsert.mock.calls.map((c) => c[0]);

describe('o import limpo não registra nada (AC9)', () => {
  it('grade usada e contagem batendo', async () => {
    await reportPdfImportHealth('ward-1', OK);

    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('nem quando o PDF não declara contagem', async () => {
    await reportPdfImportHealth('ward-1', { ...OK, expectedCount: null });

    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('fallback da grade (AC6, AC7)', () => {
  it('registra o evento com o motivo distinguível', async () => {
    await reportPdfImportHealth('ward-1', {
      ...OK, usedGrid: false, fallbackReason: 'no-valid-source',
    });

    expect(eventos()).toHaveLength(1);
    expect(eventos()[0]).toMatchObject({
      event_type: 'pdf_import_fallback',
      details: expect.objectContaining({ reasonNoValidSource: true, pages: 14, records: 364 }),
    });
  });

  it('distingue os três motivos', async () => {
    for (const [reason, flag] of [
      ['no-valid-source', 'reasonNoValidSource'],
      ['columns', 'reasonColumns'],
      ['unexplained', 'reasonUnexplained'],
    ] as const) {
      mockInsert.mockClear();
      await reportPdfImportHealth('ward-1', { ...OK, usedGrid: false, fallbackReason: reason });

      expect(eventos()[0].details[flag]).toBe(true);
    }
  });

  it('o payload não carrega texto nenhum — só números e booleanos', async () => {
    await reportPdfImportHealth('ward-1', { ...OK, usedGrid: false, fallbackReason: 'columns' });

    for (const v of Object.values(eventos()[0].details)) {
      expect(typeof v === 'number' || typeof v === 'boolean').toBe(true);
    }
  });
});

describe('divergência de contagem (AC8)', () => {
  it('registra quando lê menos que o PDF declara, mesmo tendo usado a grade', async () => {
    await reportPdfImportHealth('ward-1', { ...OK, records: 360 });

    expect(eventos()).toHaveLength(1);
    expect(eventos()[0]).toMatchObject({
      event_type: 'pdf_import_count_mismatch',
      details: expect.objectContaining({ records: 360, expected: 364, usedGrid: true }),
    });
  });

  it('registra os DOIS eventos quando houve fallback e a contagem também não bate', async () => {
    await reportPdfImportHealth('ward-1', {
      ...OK, usedGrid: false, fallbackReason: 'unexplained', records: 360,
    });

    expect(eventos().map((e) => e.event_type)).toEqual([
      'pdf_import_fallback',
      'pdf_import_count_mismatch',
    ]);
  });
});

describe('nunca atrapalha o import (AC11)', () => {
  it('não rejeita quando a escrita falha', async () => {
    mockInsert.mockRejectedValue(new Error('network down'));

    await expect(
      reportPdfImportHealth('ward-1', { ...OK, usedGrid: false, fallbackReason: 'columns' })
    ).resolves.toBeUndefined();
  });

  it('não tenta nada sem ala', async () => {
    await reportPdfImportHealth(null, { ...OK, usedGrid: false, fallbackReason: 'columns' });

    expect(supabase.from).not.toHaveBeenCalled();
  });
});

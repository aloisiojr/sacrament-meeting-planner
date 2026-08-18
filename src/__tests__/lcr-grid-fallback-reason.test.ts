/**
 * Passo 2 de `specs/app-health-events.plan.md` — AC7: quando a grade é recusada, o motivo precisa
 * sobreviver até quem registra o diagnóstico.
 *
 * Hoje `readGrid` devolve `null` em três situações diferentes e a informação de qual delas foi se
 * perde. Para o canal de saúde do app, "a grade falhou" sem o motivo obriga a reproduzir o PDF para
 * descobrir qualquer coisa — e o PDF é justamente o que não pode sair do aparelho.
 *
 * Nenhum comportamento muda aqui: só passa a viajar uma informação que era descartada.
 */
import { bandsOf, readGrid } from '../lib/lcrPdfGrid';
import { countAnchors } from '../lib/lcrPdfParser';
import { readLcrPages } from '../lib/lcrPdfPage';
import type { LcrRawPage, LcrTextItem } from '../lib/lcrPdfPage';

const CTM = [1, 0, 0, 1, 0, 0];
const frag = (x: number, y: number, s: string): LcrTextItem => ({ x, y, w: s.length * 4, size: 8, s });

const cellRules = (y: number) =>
  [[42, 100], [150, 62], [220, 42], [268, 62], [337, 74], [419, 100]].map(([x, w]) => ({
    x1: x, y1: y, x2: x + w, y2: y, m: CTM,
  }));

/** `n` registros de uma linha, igualmente espaçados. */
const registros = (n: number): LcrTextItem[] =>
  Array.from({ length: n }, (_, k) => {
    const y = 700 - k * 19;
    return [
      frag(42, y, `Exemplo, Nome${k}`), frag(150, y, 'F'), frag(220, y, String(30 + k)),
      frag(268, y, '1 jan 1996'), frag(337, y, `(11) 90000-00${10 + k}`),
    ];
  }).flat();

const fronteiras = (n: number) => [704, ...Array.from({ length: n }, (_, k) => 700 - k * 19 - 10)];

const page = (over: Partial<LcrRawPage> = {}): LcrRawPage => ({
  width: 595, height: 842, items: registros(6), segments: [], rects: [], ...over,
});

describe('readGrid — informa por que recusou (AC7)', () => {
  it('entrega os registros quando a grade se aplica', () => {
    const r = readGrid([page({ segments: fronteiras(6).flatMap(cellRules) })]);

    expect(r.ok).toBe(true);
    expect(r.ok && r.records).toHaveLength(6);
  });

  it('sem desenho reconhecível: nenhuma fonte válida', () => {
    const r = readGrid([page()]);

    expect(r).toEqual({ ok: false, reason: 'no-valid-source' });
  });

  it('fronteiras boas mas sem traços: não há de onde tirar as colunas', () => {
    // Um PDF desenhado só com faixas de fundo dá as linhas e nenhuma coluna. Cai no caminho antigo,
    // e o motivo é diferente de "não entendi o desenho" — vale distinguir no diagnóstico.
    const ys = fronteiras(6);
    const rects = ys.slice(0, -1).map((y, i) => ({
      x: 42, y: ys[i + 1], w: 480, h: y - ys[i + 1], color: 'qualquer', m: CTM,
    }));
    const r = readGrid([page({ rects })]);

    expect(r).toEqual({ ok: false, reason: 'columns' });
  });

  it('fronteiras boas mas a leitura por célula não fecha a conta', () => {
    // Um traço solto num X que não é coluna desloca todos os campos.
    const solto = { x1: 60, y1: 400, x2: 90, y2: 400, m: CTM };
    const r = readGrid([page({ segments: [...fronteiras(6).flatMap(cellRules), solto] })]);

    expect(r).toEqual({ ok: false, reason: 'unexplained' });
  });
});

describe('readLcrPages — repassa o motivo para quem registra', () => {
  it('sem motivo quando a grade foi usada', () => {
    const r = readLcrPages([page({ segments: fronteiras(6).flatMap(cellRules) })]);

    expect(r.usedGrid).toBe(true);
    expect(r.fallbackReason).toBeNull();
  });

  it('com motivo quando caiu no caminho antigo', () => {
    const r = readLcrPages([page()]);

    expect(r.usedGrid).toBe(false);
    expect(r.fallbackReason).toBe('no-valid-source');
  });
});

describe('o rótulo no-valid-source é exato, não aproximado', () => {
  it('a contagem de âncoras do documento não depende de onde caem as fronteiras', () => {
    // É esta invariante que sustenta o rótulo: se toda fonte válida explica o mesmo total, elas
    // empatam, o desempate entrega ao desenho, e o limiar só vence quando nenhum desenho serve.
    const p = page({ items: registros(6), segments: fronteiras(6).flatMap(cellRules) });
    const total = (fronteirasUsadas: number[]) => {
      const b = bandsOf(p, fronteirasUsadas);
      return b.reduce((n, x) => n + countAnchors(x.text), 0) + countAnchors(b.above) + countAnchors(b.below);
    };

    expect(total(fronteiras(6))).toBe(6);
    expect(total(fronteiras(6).slice(0, -2))).toBe(6); // fronteiras a menos
    expect(total([])).toBe(6); // nenhuma fronteira
  });
});

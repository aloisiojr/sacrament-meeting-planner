/**
 * Passo 6 de `specs/pdf-import-table-grid.plan.md` — a decisão de documento: grade quando ela
 * valida, comportamento de hoje quando não (AC8), e a divergência de contagem continuando visível
 * (AC18).
 *
 * `readLcrPages` é o que o import chama. Ele é a única porta: se a grade falhar em silêncio, é aqui
 * que o registro some, então é aqui que a rede tem de estar.
 */
import { readLcrPages } from '../lib/lcrPdfPage';
import type { LcrRawPage, LcrTextItem } from '../lib/lcrPdfPage';

const CTM = [1, 0, 0, 1, 0, 0];
const frag = (x: number, y: number, s: string): LcrTextItem => ({ x, y, w: s.length * 4, size: 8, s });
/** Traços nas 6 colunas, como o LCR desenha — só juntos atravessam a tabela. */
const cellRules = (y: number) =>
  [[0, 108], [108, 70], [178, 48], [226, 70], [296, 82], [378, 222]].map(([x, w]) => ({
    x1: x, y1: y, x2: x + w, y2: y, m: CTM,
  }));

/**
 * Quatro registros nas colunas reais. Quatro e não dois porque o caminho antigo INFERE o limiar da
 * distribuição de gaps: com uma amostra pequena demais ele devolve Infinity e não agrupa nada —
 * comportamento correto e documentado, mas que tornaria a comparação entre os dois caminhos
 * inválida.
 */
const NOMES = ['Fulana', 'Beltrano', 'Ciclana', 'Sicrano'];
const ITEMS: LcrTextItem[] = NOMES.flatMap((nome, i) => {
  const y = 700 - i * 19;
  return [
    frag(0, y, `Exemplo, ${nome}`),
    frag(108, y - 6, i % 2 ? 'M' : 'F'),
    frag(178, y - 6, String(26 + i)),
    frag(226, y - 6, '3 mar 2000'),
    frag(296, y - 6, `(11) 90000-000${i + 1}`),
  ];
});
/** Fronteiras entre os registros, como o LCR desenha. */
const FRONTEIRAS = [704, ...NOMES.map((_, i) => 700 - i * 19 - 10)];

const page = (over: Partial<LcrRawPage> = {}): LcrRawPage => ({
  width: 595, height: 842, items: ITEMS, segments: [], rects: [], ...over,
});

describe('readLcrPages — grade quando ela vale', () => {
  const comGrade = page({ segments: FRONTEIRAS.flatMap(cellRules) });

  it('lê os registros pela grade', () => {
    const r = readLcrPages([comGrade]);

    expect(r.records.map((x) => x.name)).toEqual(NOMES.map((n) => `Exemplo, ${n}`));
    expect(r.records[0].rawPhone).toBe('(11) 90000-0001');
  });

  it('informa que usou a grade, para o diagnóstico não virar adivinhação', () => {
    expect(readLcrPages([comGrade]).usedGrid).toBe(true);
  });
});

describe('readLcrPages — fallback (AC8)', () => {
  it('cai no comportamento de hoje quando não há desenho reconhecível', () => {
    const r = readLcrPages([page()]);

    expect(r.usedGrid).toBe(false);
    expect(r.records.map((x) => x.name)).toEqual(NOMES.map((n) => `Exemplo, ${n}`));
  });

  it('cai no fallback quando o desenho existe mas particiona mal', () => {
    // Uma fronteira só no meio de tudo: os dois registros ficariam na mesma banda.
    const r = readLcrPages([page({ segments: cellRules(760) })]);

    expect(r.usedGrid).toBe(false);
    expect(r.records).toHaveLength(4);
  });

  it('produz os mesmos registros pelos dois caminhos, no caso simples', () => {
    const comGrade = readLcrPages([page({ segments: FRONTEIRAS.flatMap(cellRules) })]);
    const semGrade = readLcrPages([page()]);

    expect(comGrade.records).toEqual(semGrade.records);
  });
});

describe('readLcrPages — contagem declarada (AC18)', () => {
  const comContagem = (segments: ReturnType<typeof cellRules>) =>
    page({ items: [...ITEMS, frag(0, 560, 'Contagem: 4')], segments });

  it('expõe a contagem do PDF pela grade', () => {
    expect(readLcrPages([comContagem(FRONTEIRAS.flatMap(cellRules))]).expectedCount).toBe(4);
  });

  it('expõe a contagem do PDF pelo fallback', () => {
    expect(readLcrPages([comContagem([])]).expectedCount).toBe(4);
  });

  it('deixa a divergência visível quando lê menos que o declarado', () => {
    const p = page({ items: [...ITEMS, frag(0, 560, 'Contagem: 9')] });
    const r = readLcrPages([p]);

    expect(r.expectedCount).toBe(9);
    expect(r.records.length).toBe(4);
  });
});

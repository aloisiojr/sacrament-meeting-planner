/**
 * Passo 2 de `specs/pdf-import-table-grid.plan.md` — AC1 a AC4: colher fronteiras candidatas a
 * partir de evidência visual genérica.
 *
 * O que estes testes prendem são os três erros que eu cometi investigando os PDFs reais, cada um
 * dos quais teria virado constante mágica no código:
 *   - filtrar por cor (`239,240,240`) — nada garante essa cor num PDF de outra ala;
 *   - exigir comprimento absoluto (`> 300pt`) — foi o que escondeu as bordas de célula, que medem
 *     48 a 148pt cada e só atravessam a tabela em conjunto;
 *   - assumir escala 4/3 — ela vem do CTM do content stream, não do formato.
 *
 * Geometria sintética: página real carrega nome e telefone de membros.
 */
import {
  columnStarts,
  fillBoundaries,
  ruleBoundaries,
  textExtent,
} from '../lib/lcrPdfGrid';
import type { LcrRawPage, LcrTextItem } from '../lib/lcrPdfPage';

/** CTM dos PDFs do LCR: 0,75 e eixo Y invertido a partir do topo da página. */
const CTM = [0.75, 0, 0, -0.75, 0, 842];
/** Identidade, para provar que a conversão sai do CTM e não de um fator embutido. */
const ID = [1, 0, 0, 1, 0, 0];

const frag = (x: number, y: number, s: string): LcrTextItem => ({ x, y, w: s.length * 4, size: 8, s });

const page = (over: Partial<LcrRawPage>): LcrRawPage => ({
  width: 595,
  height: 842,
  items: [frag(42, 700, 'Exemplo, Fulana'), frag(500, 700, 'a@b.co')], // texto de 42 a 524
  segments: [],
  rects: [],
  ...over,
});

/** Um traço horizontal em coordenadas de path, sob o CTM dado. */
const rule = (yPath: number, xPath: number, wPath: number, m = CTM) => ({
  x1: xPath,
  y1: yPath,
  x2: xPath + wPath,
  y2: yPath,
  m,
});

describe('ruleBoundaries — fronteiras vindas de traços', () => {
  it('aceita seis bordas de célula que só juntas atravessam a tabela (AC2)', () => {
    // Larguras reais das 6 colunas do LCR, em coordenadas de path (÷0,75 do espaço de texto).
    const larguras = [146.8, 92.1, 64, 92.1, 109.6, 197.5];
    let x = 45.8;
    const segments = larguras.map((w) => {
      const s = rule(37.8, x, w);
      x += w;
      return s;
    });

    // Nenhuma delas sozinha chega perto da largura da tabela; juntas, cobrem tudo.
    expect(ruleBoundaries(page({ segments }))).toHaveLength(1);
  });

  it('rejeita traços que juntos cobrem só um pedaço da tabela', () => {
    const segments = [rule(37.8, 45.8, 60), rule(37.8, 120, 60)];

    expect(ruleBoundaries(page({ segments }))).toEqual([]);
  });

  it('julga a cobertura pela largura do texto DAQUELA página, não por um limite fixo (AC2)', () => {
    const curto = rule(37.8, 45.8, 200); // 150pt em espaço de texto

    // Numa página larga (texto de 42 a 524) esse traço cobre pouco…
    expect(ruleBoundaries(page({ segments: [curto] }))).toEqual([]);
    // …e na mesma medida absoluta, numa página estreita, ele atravessa a tabela.
    const estreita = page({
      items: [frag(35, 700, 'Exemplo'), frag(150, 700, 'M')],
      segments: [curto],
    });
    expect(ruleBoundaries(estreita)).toHaveLength(1);
  });

  it('converte pelo CTM que veio junto, sem escala embutida (AC3)', () => {
    const [y] = ruleBoundaries(page({ segments: [rule(37.8, 45.8, 700)] }));

    // 842 - 0,75 × 37,8 = 813,65. Com escala 1 daria 804,2 — e as bandas não conteriam registro.
    expect(y).toBeCloseTo(813.65, 1);
  });

  it('respeita um CTM diferente no mesmo formato de dado (AC3)', () => {
    const [y] = ruleBoundaries(page({ segments: [rule(300, 0, 700, ID)] }));

    expect(y).toBeCloseTo(300, 1);
  });

  it('agrupa traços quase colineares numa fronteira só', () => {
    // Meio ponto de diferença é ruído de arredondamento, não duas fronteiras.
    const segments = [rule(37.8, 45.8, 350), rule(38.1, 400, 350)];

    expect(ruleBoundaries(page({ segments }))).toHaveLength(1);
  });

  it('ignora traços verticais', () => {
    const segments = [{ x1: 45.8, y1: 37.8, x2: 45.8, y2: 500, m: CTM }];

    expect(ruleBoundaries(page({ segments }))).toEqual([]);
  });
});

describe('fillBoundaries — fronteiras vindas de faixas de fundo', () => {
  it('usa as duas arestas da faixa, seja qual for a cor (AC1)', () => {
    // Cinza do LCR e um roxo inventado precisam funcionar igual.
    for (const color of ['239,240,240', '0.4,0.1,0.7']) {
      const rects = [{ x: 45.8, y: 37.8, w: 700, h: 25.8, color, m: CTM }];
      const ys = fillBoundaries(page({ rects }));

      expect(ys).toHaveLength(2);
      expect(Math.abs(ys[0] - ys[1])).toBeCloseTo(19.35, 1); // 25,8 × 0,75
    }
  });

  it('descarta retângulos estreitos demais para serem faixa de linha', () => {
    const rects = [{ x: 45.8, y: 37.8, w: 40, h: 25.8, color: '239,240,240', m: CTM }];

    expect(fillBoundaries(page({ rects }))).toEqual([]);
  });
});

describe('columnStarts — colunas por agrupamento com tolerância (AC4)', () => {
  it('funde posições a menos de ~2pt numa coluna só', () => {
    // Na página 1 dos PDFs reais a mesma coluna aparece como 34.3 e 35.1.
    expect(columnStarts([34.3, 35.1, 144.4, 144.4, 213.5])).toEqual([34.3, 144.4, 213.5]);
  });

  it('não funde colunas de verdade', () => {
    expect(columnStarts([34.3, 144.4, 213.5, 261.5, 330.6, 412.9])).toHaveLength(6);
  });
});

describe('textExtent', () => {
  it('mede a faixa horizontal ocupada por texto, incluindo a largura do último item', () => {
    const e = textExtent(page({}));

    expect(e?.min).toBe(42);
    expect(e?.max).toBe(524); // 500 + 6 caracteres × 4
  });

  it('devolve null quando não há texto', () => {
    expect(textExtent(page({ items: [] }))).toBeNull();
  });
});

/**
 * Passo 3 de `specs/pdf-import-table-grid.plan.md` — AC5 a AC8: validar o particionamento contra o
 * próprio dado e escolher a fonte, com o algoritmo atual como rede.
 *
 * O veto de banda com 2+ registros é o coração disto. Foi exatamente esse o defeito que passou
 * despercebido antes: uma versão do limiar fundia vizinhos e **passava em todos os testes**, porque
 * nada olhava para o resultado do agrupamento. Aqui o algoritmo é obrigado a se auto-conferir.
 */
import { bandsOf, chooseBoundaries, scorePartition } from '../lib/lcrPdfGrid';
import type { LcrRawPage, LcrTextItem } from '../lib/lcrPdfPage';

const frag = (x: number, y: number, s: string): LcrTextItem => ({ x, y, w: s.length * 4, size: 8, s });

/** Dois registros de duas linhas cada, nas medidas reais (gap 6 dentro, 19 entre). */
const ITEMS: LcrTextItem[] = [
  frag(42, 700, 'Exemplo, Fulana'),
  frag(150, 694, 'F'), frag(220, 694, '26'), frag(268, 694, '3 mar 2000'),
  frag(42, 675, 'Exemplo, Beltrano'),
  frag(150, 669, 'M'), frag(220, 669, '33'), frag(268, 669, '5 abr 1993'),
];

const page = (over: Partial<LcrRawPage> = {}): LcrRawPage => ({
  width: 595, height: 842, items: ITEMS, segments: [], rects: [], ...over,
});

describe('bandsOf — parte as linhas de texto nas fronteiras dadas', () => {
  it('põe cada registro na sua banda', () => {
    const bands = bandsOf(page(), [710, 685, 660]);

    expect(bands).toHaveLength(2);
    expect(bands[0].text).toContain('Exemplo, Fulana');
    expect(bands[1].text).toContain('Exemplo, Beltrano');
  });

  it('mantém junto o nome que ocupa mais de uma linha dentro da banda', () => {
    const tresLinhas = [
      frag(42, 700, 'Exemplo, Fulana'),
      frag(150, 694, 'F'), frag(220, 694, '26'), frag(268, 694, '3 mar 2000'),
      frag(42, 682, 'de Souza'),
    ];
    const [band] = bandsOf(page({ items: tresLinhas }), [710, 675]);

    expect(band.text).toContain('Exemplo, Fulana');
    expect(band.text).toContain('de Souza');
  });

  it('devolve o texto que sobra fora das fronteiras, separado por borda', () => {
    const bands = bandsOf(page(), [690, 660]);

    // 700 e 694 ficam acima da primeira fronteira; nada abaixo da última.
    expect(bands.above).toContain('Exemplo, Fulana');
    expect(bands.below).toBe('');
  });
});

describe('scorePartition — o dado julga o desenho (AC5, AC6)', () => {
  it('conta bandas com exatamente um registro', () => {
    expect(scorePartition(bandsOf(page(), [710, 685, 660])).exactlyOne).toBe(2);
  });

  it('marca como inválido quando alguma banda tem dois registros (AC6)', () => {
    // Uma fronteira a menos: os dois registros caem na mesma banda.
    const score = scorePartition(bandsOf(page(), [710, 660]));

    expect(score.twoOrMore).toBe(1);
    expect(score.valid).toBe(false);
  });

  it('rejeita mesmo quando quase tudo está certo', () => {
    // 20 bandas boas e uma fundida: continua inválido. Fundir some com uma pessoa em silêncio, e
    // é o único erro que nenhuma revisão manual pega — o registro simplesmente não aparece.
    const muitos: LcrTextItem[] = [];
    const fronteiras: number[] = [];
    for (let i = 0; i < 21; i++) {
      const y = 700 - i * 19;
      muitos.push(frag(42, y, `Exemplo, Nome${i}`), frag(150, y - 6, 'F'), frag(220, y - 6, '30'), frag(268, y - 6, '1 jan 1996'));
      if (i !== 5) fronteiras.push(y + 4); // sem a fronteira 5, os registros 4 e 5 se fundem
    }
    fronteiras.push(700 - 21 * 19);
    const score = scorePartition(bandsOf(page({ items: muitos }), fronteiras));

    expect(score.exactlyOne).toBe(19);
    expect(score.valid).toBe(false);
  });

  it('não conta banda vazia como erro', () => {
    // O cabeçalho de coluna ocupa uma banda sem registro nenhum; isso é normal, não defeito.
    const score = scorePartition(bandsOf(page(), [730, 710, 685, 660]));

    expect(score.empty).toBe(1);
    expect(score.valid).toBe(true);
  });
});

describe('chooseBoundaries — escolhe a fonte por documento (AC7, AC8)', () => {
  const CTM = [1, 0, 0, 1, 0, 0];
  const rule = (y: number) => ({ x1: 0, y1: y, x2: 600, y2: y, m: CTM });

  it('usa os traços quando eles particionam bem', () => {
    const p = page({ segments: [710, 685, 660].map(rule) });

    expect(chooseBoundaries([p]).source).toBe('rules');
  });

  it('cai nas faixas quando os traços particionam mal', () => {
    const p = page({
      segments: [rule(710), rule(660)], // funde os dois registros
      rects: [
        { x: 0, y: 685, w: 600, h: 25, color: 'qualquer', m: CTM },
        { x: 0, y: 660, w: 600, h: 25, color: 'qualquer', m: CTM },
      ],
    });

    expect(chooseBoundaries([p]).source).toBe('fills');
  });

  it('cai no algoritmo antigo quando nenhuma fonte desenhada serve (AC8)', () => {
    expect(chooseBoundaries([page()]).source).toBe('gap');
  });

  it('decide para o documento inteiro, não por página (AC7)', () => {
    // A última página tem um registro só e nenhuma fronteira desenhada; ainda assim o documento
    // usa os traços, porque a decisão é do conjunto.
    const boa = page({ segments: [710, 685, 660].map(rule) });
    const ultima = page({ items: [frag(42, 700, 'Exemplo, Único'), frag(150, 694, 'M'), frag(220, 694, '50'), frag(268, 694, '1 jan 1976')] });

    expect(chooseBoundaries([boa, ultima]).source).toBe('rules');
  });
});

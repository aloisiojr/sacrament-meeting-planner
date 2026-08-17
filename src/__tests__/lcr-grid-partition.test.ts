/**
 * Passo 3 de `specs/pdf-import-table-grid.plan.md` — AC5 a AC8: a grade se auto-confere contra o
 * próprio dado antes de ser usada.
 *
 * A conferência é de CONSERVAÇÃO: toda âncora do documento — dentro de banda, acima da grade ou
 * abaixo dela — tem de virar exatamente um registro. Contar bandas boas não bastava. A verificação
 * adversarial mostrou três formas de perder gente em silêncio que passavam por esse critério mais
 * fraco, e cada uma delas tem um teste aqui.
 *
 * Estes testes exercitam `chooseBoundaries`, que é o que a produção chama — não um contador
 * auxiliar. Uma versão anterior testava uma função de pontuação que o caminho real não usava, o que
 * parecia cobertura e não era.
 */
import { bandsOf, chooseBoundaries } from '../lib/lcrPdfGrid';
import { readLcrPages } from '../lib/lcrPdfPage';
import type { LcrRawPage, LcrTextItem } from '../lib/lcrPdfPage';

const CTM = [1, 0, 0, 1, 0, 0];
const frag = (x: number, y: number, s: string): LcrTextItem => ({ x, y, w: s.length * 4, size: 8, s });

/** Traços nas 6 colunas, como o LCR desenha: só juntos atravessam a tabela. */
const cellRules = (y: number) =>
  [[42, 100], [150, 62], [220, 42], [268, 62], [337, 74], [419, 100]].map(([x, w]) => ({
    x1: x, y1: y, x2: x + w, y2: y, m: CTM,
  }));

/** `n` registros de duas linhas a partir de y=700, no passo real de 19pt. */
const registros = (n: number, desde = 0): LcrTextItem[] =>
  Array.from({ length: n }, (_, k) => {
    const y = 700 - k * 19;
    return [
      frag(42, y, `Exemplo, Nome${desde + k}`),
      frag(150, y - 6, 'F'), frag(220, y - 6, '30'),
      frag(268, y - 6, '1 jan 1996'), frag(337, y - 6, `(11) 90000-00${10 + desde + k}`),
    ];
  }).flat();

/** As fronteiras corretas para `n` registros. */
const fronteiras = (n: number) => [704, ...Array.from({ length: n }, (_, k) => 700 - k * 19 - 10)];

const page = (over: Partial<LcrRawPage> = {}): LcrRawPage => ({
  width: 595, height: 842, items: registros(4), segments: [], rects: [], ...over,
});

describe('bandsOf — parte as linhas de texto nas fronteiras dadas', () => {
  it('põe cada registro na sua banda', () => {
    const bands = bandsOf(page(), fronteiras(4));

    expect(bands).toHaveLength(4);
    expect(bands[0].text).toContain('Exemplo, Nome0');
    expect(bands[3].text).toContain('Exemplo, Nome3');
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

  it('sem fronteira nenhuma, o texto sobra FORA da grade em vez de sumir', () => {
    // Se a página desaparecesse aqui, a auditoria não teria como notar que ela existia.
    const bands = bandsOf(page(), []);

    expect(bands).toHaveLength(0);
    expect(bands.above).toContain('Exemplo, Nome0');
  });
});

describe('chooseBoundaries — o dado julga o desenho (AC5, AC6)', () => {
  it('usa os traços quando eles explicam todo o documento', () => {
    const escolha = chooseBoundaries([page({ segments: fronteiras(4).flatMap(cellRules) })]);

    expect(escolha.source).toBe('rules');
    expect(escolha.explained).toBe(4);
  });

  it('recusa uma fonte que funde dois registros numa banda, mesmo acertando o resto (AC6)', () => {
    // 20 fronteiras certas e uma faltando: 19 bandas boas e uma com dois registros. Contar acertos
    // aprovaria; a fusão some com um membro sem aviso, e é o único erro que a revisão não mostra,
    // porque o registro não chega lá.
    const semUma = fronteiras(21).filter((_, i) => i !== 5);
    const escolha = chooseBoundaries([page({ items: registros(21), segments: semUma.flatMap(cellRules) })]);

    expect(escolha.source).not.toBe('rules');
  });

  it('recusa quando uma página inteira fica sem fronteira, em vez de descartá-la', () => {
    // Foi assim que a versão anterior perdia uma página: ela não contribuía com banda alguma, então
    // não tinha como reprovar a fonte, e seus registros simplesmente não eram emitidos.
    const comGrade = page({ segments: fronteiras(4).flatMap(cellRules) });
    const semGrade = page({ items: registros(1, 4) });

    expect(chooseBoundaries([comGrade, semGrade]).source).not.toBe('rules');
  });

  it('não perde o registro dessa página: o documento inteiro cai no caminho antigo (AC8)', () => {
    const comGrade = page({ segments: fronteiras(4).flatMap(cellRules) });
    const semGrade = page({ items: registros(1, 4) });
    const r = readLcrPages([comGrade, semGrade]);

    expect(r.usedGrid).toBe(false);
    expect(r.records).toHaveLength(5);
  });

  it('cai nas faixas quando os traços não explicam tudo', () => {
    const semUma = fronteiras(4).filter((_, i) => i !== 2);
    const p = page({
      segments: semUma.flatMap(cellRules),
      rects: fronteiras(4).slice(0, -1).map((y, i) => ({
        x: 42, y: fronteiras(4)[i + 1], w: 480, h: y - fronteiras(4)[i + 1], color: 'qualquer', m: CTM,
      })),
    });

    expect(chooseBoundaries([p]).source).toBe('fills');
  });

  it('cai no limiar de gap quando nenhum desenho serve (AC7, AC8)', () => {
    expect(chooseBoundaries([page()]).source).toBe('gap');
  });

  it('decide para o documento inteiro: uma última página de um registro só não muda o critério', () => {
    const cheia = page({ segments: fronteiras(4).flatMap(cellRules) });
    const ultima = page({ items: registros(1, 4), segments: fronteiras(1).flatMap(cellRules) });

    expect(chooseBoundaries([cheia, ultima]).source).toBe('rules');
  });

  /**
   * Estes dois casos existem porque as versões anteriores dos testes passavam com a proteção
   * DESLIGADA: eles chegavam ao resultado certo por outro caminho (o limiar explicava mais e vencia
   * o desempate), então não prendiam nada. Aqui o limiar é incapaz de inferir — registros de uma
   * linha só, todos igualmente espaçados — e por isso a grade é a única candidata. Se ela aceitar
   * um documento que não consegue explicar, ninguém a corrige.
   */
  const umaLinha = (n: number): LcrTextItem[] =>
    Array.from({ length: n }, (_, k) => {
      const y = 700 - k * 19;
      return [
        frag(42, y, `Exemplo, Nome${k}`), frag(150, y, 'F'), frag(220, y, String(30 + k)),
        frag(268, y, '1 jan 1996'), frag(337, y, `(11) 90000-00${10 + k}`),
      ];
    }).flat();

  it('não usa a grade quando ela não explica todos os registros, nem tendo o melhor resultado', () => {
    // Uma fronteira faltando funde dois registros. O limiar não consegue inferir nada deste layout,
    // então a grade venceria por ausência de concorrente — e entregaria 6 de 8 membros, calada.
    const semUma = fronteiras(8).filter((_, i) => i !== 3);
    const r = readLcrPages([page({ items: umaLinha(8), segments: semUma.flatMap(cellRules) })]);

    expect(r.usedGrid).toBe(false);
  });

  it('não usa a grade quando a leitura por célula falha, mesmo com as fronteiras boas', () => {
    // Um traço solto num X que não é coluna faz detectColumns achar uma coluna a mais, e aí todo
    // campo desliza de posição: nenhuma banda é lida. Sem conferência final isso vira um import
    // vazio que se declara bem-sucedido.
    const solto = { x1: 60, y1: 400, x2: 90, y2: 400, m: CTM };
    const r = readLcrPages([
      page({ items: umaLinha(8), segments: [...fronteiras(8).flatMap(cellRules), solto] }),
    ]);

    expect(r.usedGrid).toBe(false);
    expect(r.records).not.toHaveLength(0);
  });
});

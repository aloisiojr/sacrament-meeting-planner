/**
 * Passo 4 de `specs/pdf-import-table-grid.plan.md` — AC9 a AC11: registros partidos entre páginas.
 *
 * A regra é do usuário — gênero é obrigatório, então banda sem gênero é fragmento — corrigida pela
 * medição num ponto que muda a implementação: **o outro pedaço não é uma banda**. Ele fica fora da
 * grade, abaixo da última fronteira da página anterior, misturado ao rodapé. Quem procurar "banda
 * sem gênero ↔ banda sem gênero" não acha o par.
 *
 * Nos 39 pontos de quebra dos 8 PDFs a forma é uma só, sem exceção: dados órfãos embaixo, nome sem
 * gênero abrindo a página seguinte.
 *
 * Os testes atacam `readGrid`/`readLcrPages`, que é o que a produção executa. Uma versão anterior
 * exercitava uma função de fusão que o caminho real não chamava — parecia cobertura de AC9 e não era.
 */
import { readGrid } from '../lib/lcrPdfGrid';
import { readLcrPages } from '../lib/lcrPdfPage';
import type { LcrRawPage, LcrTextItem } from '../lib/lcrPdfPage';

/** Os registros quando a grade se aplica, ou null quando ela foi recusada. */
const recs = (r: ReturnType<typeof readGrid>) => (r.ok ? r.records : null);

const CTM = [1, 0, 0, 1, 0, 0];
const frag = (x: number, y: number, s: string): LcrTextItem => ({ x, y, w: s.length * 4, size: 8, s });

/** Traços nas 6 colunas: só juntos atravessam a tabela, como no LCR. */
const cellRules = (y: number) =>
  [[42, 100], [150, 62], [220, 42], [268, 62], [337, 74], [419, 100]].map(([x, w]) => ({
    x1: x, y1: y, x2: x + w, y2: y, m: CTM,
  }));

/** Uma linha da tabela: nome sempre; dados só quando `idade` é dada (senão é fragmento de nome). */
type Linha = { nome: string; idade?: number; tel?: string };

/**
 * Monta uma página com as fronteiras desenhadas nos lugares certos e, opcionalmente, um trecho
 * solto ABAIXO da grade — que é onde o LCR deixa a metade de um registro partido.
 */
function pagina(linhas: Linha[], abaixo: LcrTextItem[] = []): LcrRawPage {
  const items: LcrTextItem[] = [];
  linhas.forEach((l, k) => {
    const y = 700 - k * 19;
    items.push(frag(42, y, l.nome));
    if (l.idade !== undefined) {
      items.push(
        frag(150, y - 6, 'F'), frag(220, y - 6, String(l.idade)),
        frag(268, y - 6, '10 out 1978'), frag(337, y - 6, l.tel ?? '(11) 90000-0001')
      );
    }
  });
  const ys = [704, ...linhas.map((_, k) => 700 - k * 19 - 10)];
  return { width: 595, height: 842, items: [...items, ...abaixo], segments: ys.flatMap(cellRules), rects: [] };
}

/** Dados órfãos abaixo da grade, na posição em que o LCR os deixa. */
const orfao = (y: number, extra: LcrTextItem[] = []) => [
  frag(150, y, 'M'), frag(220, y, '34'), frag(268, y, '14 mai 1992'), frag(337, y, '(11) 90000-0099'),
  ...extra,
];

describe('registro partido entre páginas (AC9, AC10)', () => {
  it('funde os dados órfãos com o nome que abre a página seguinte', () => {
    const p1 = pagina([{ nome: 'Exemplo, Fulana', idade: 47 }], orfao(650));
    const p2 = pagina([{ nome: 'Exemplo, Beltrano' }, { nome: 'Exemplo, Ciclana', idade: 65 }]);
    const records = recs(readGrid([p1, p2]));

    expect(records?.map((r) => r.name)).toEqual([
      'Exemplo, Fulana',
      'Exemplo, Beltrano',
      'Exemplo, Ciclana',
    ]);
  });

  it('o registro fundido fica com os dados do órfão', () => {
    const p1 = pagina([{ nome: 'Exemplo, Fulana', idade: 47 }], orfao(650));
    const p2 = pagina([{ nome: 'Exemplo, Beltrano' }, { nome: 'Exemplo, Ciclana', idade: 65 }]);

    expect(recs(readGrid([p1, p2]))?.[1]).toMatchObject({ age: 34, rawPhone: '(11) 90000-0099' });
  });

  it('descarta o rodapé antes de parear (AC10)', () => {
    // No PDF real o órfão vem grudado no rodapé; sem limpar, o par nunca casa.
    const rodape = [frag(42, 620, '15 Aug 2026 For Church Use Only © 2026 by Intellectual Reserve, Inc. 2')];
    const p1 = pagina([{ nome: 'Exemplo, Fulana', idade: 47 }], orfao(650, rodape));
    const p2 = pagina([{ nome: 'Exemplo, Beltrano' }, { nome: 'Exemplo, Ciclana', idade: 65 }]);

    expect(recs(readGrid([p1, p2]))?.map((r) => r.name)).toEqual([
      'Exemplo, Fulana',
      'Exemplo, Beltrano',
      'Exemplo, Ciclana',
    ]);
  });

  it('o nome do registro fundido vem da COLUNA, não do texto remontado', () => {
    // A cauda "m" do e-mail de outra pessoa está na coluna de e-mail desta faixa. Remontar os dois
    // pedaços como texto e mandar ao parser antigo devolveria a contaminação que a grade elimina.
    const p1 = pagina([{ nome: 'Exemplo, Fulana', idade: 47 }], orfao(650));
    const p2 = pagina([{ nome: 'Exemplo, Beltrano' }, { nome: 'Exemplo, Ciclana', idade: 65 }]);
    p2.items.push(frag(419, 706, 'vizinho@gmail.co'), frag(419, 694, 'm'));

    expect(recs(readGrid([p1, p2]))?.[1].name).toBe('Exemplo, Beltrano');
  });
});

describe('formas que não casam: não funde E cai no fallback (AC11)', () => {
  it('órfão ancorado sem par — o documento inteiro usa o caminho antigo', () => {
    // A página seguinte abre com um registro completo, então não há nome órfão para casar. Antes
    // desta correção a grade seguia em frente e o registro do órfão simplesmente sumia.
    const p1 = pagina([{ nome: 'Exemplo, Fulana', idade: 47 }], orfao(650));
    const p2 = pagina([{ nome: 'Exemplo, Beltrano', idade: 30 }, { nome: 'Exemplo, Ciclana', idade: 65 }]);

    expect(readGrid([p1, p2]).ok).toBe(false);
  });

  it('e nesse caso nenhum registro é perdido', () => {
    // Páginas grandes de propósito: o caminho antigo INFERE o limiar da distribuição de gaps e, com
    // amostra pequena, devolve Infinity e não agrupa nada. Comportamento correto e já documentado,
    // mas que tornaria esta contagem sem sentido.
    const muitos = (n: number, desde: number): Linha[] =>
      Array.from({ length: n }, (_, k) => ({ nome: `Exemplo, Nome${desde + k}`, idade: 30 + k }));
    const p1 = pagina(muitos(6, 0), orfao(580));
    const p2 = pagina(muitos(4, 6));
    const r = readLcrPages([p1, p2]);

    expect(r.usedGrid).toBe(false);
    // 6 + 4 registros nas bandas, mais o órfão que a grade recusou a fundir.
    expect(r.records).toHaveLength(11);
  });

  it('sobra sem âncora abaixo da grade também recusa a grade', () => {
    // Não custaria um registro, mas custaria um nome truncado sem ninguém perceber.
    const p1 = pagina([{ nome: 'Exemplo, Fulana', idade: 47 }], [frag(42, 650, 'de Souza')]);
    const p2 = pagina([{ nome: 'Exemplo, Beltrano', idade: 30 }]);

    expect(readGrid([p1, p2]).ok).toBe(false);
  });

  it('a última página não tenta fundir, porque não há seguinte', () => {
    const so = pagina([{ nome: 'Exemplo, Fulana', idade: 47 }], orfao(650));

    expect(readGrid([so]).ok).toBe(false);
  });

  it('página sem nada fora da grade é lida normalmente', () => {
    const p1 = pagina([{ nome: 'Exemplo, Fulana', idade: 47 }]);
    const p2 = pagina([{ nome: 'Exemplo, Beltrano', idade: 30 }]);

    expect(recs(readGrid([p1, p2]))?.map((r) => r.name)).toEqual(['Exemplo, Fulana', 'Exemplo, Beltrano']);
  });
});

/**
 * Passo 5 de `specs/pdf-import-table-grid.plan.md` — AC12 a AC14: cada campo lido da sua coluna.
 *
 * O ponto destes testes é que a classe inteira de defeito de hoje deixa de ser possível, em vez de
 * ser tratada. Com as colunas conhecidas, a cauda de um e-mail que quebrou de linha simplesmente
 * está na coluna de e-mail; ela não tem por onde chegar ao nome. Os dois casos reais que chegaram à
 * tela de revisão — a cauda `l.com` e o `m` solto de um `@gmail.co` do vizinho — estão reproduzidos
 * aqui pela geometria, não pelo texto.
 */
import { readCells, readGrid } from '../lib/lcrPdfGrid';
import type { LcrTextItem } from '../lib/lcrPdfPage';

/** Os registros quando a grade se aplica, ou null quando ela foi recusada. */
const recs = (r: ReturnType<typeof readGrid>) => (r.ok ? r.records : null);

/** Colunas dos PDFs reais, em espaço de texto. */
const COLS = [42, 150, 220, 268, 337, 419];

const frag = (x: number, y: number, s: string): LcrTextItem => ({ x, y, w: s.length * 4, size: 8, s });

describe('readCells — cada campo vem da sua própria coluna (AC12)', () => {
  it('lê nome, idade e telefone de um registro de duas linhas', () => {
    const items = [
      frag(42, 700, 'Exemplo, Fulana'),
      frag(150, 694, 'F'), frag(220, 694, '26'), frag(268, 694, '3 mar 2000'),
      frag(337, 694, '(11) 90000-0001'), frag(419, 694, 'a.pessoa@exemplo.com'),
    ];

    expect(readCells(items, COLS)).toEqual({
      name: 'Exemplo, Fulana',
      rawPhone: '(11) 90000-0001',
      age: 26,
    });
  });

  it('mantém íntegro o registro cujo nome ocupa três linhas (AC14)', () => {
    // Os dados ficam na linha do MEIO; o nome continua embaixo.
    const items = [
      frag(42, 700, 'Exemplo Junior, Beltrano'),
      frag(150, 694, 'M'), frag(220, 694, '33'), frag(268, 694, '5 abr 1993'), frag(337, 694, '(11) 90000-0002'),
      frag(42, 682, 'de Souza'),
    ];

    expect(readCells(items, COLS)?.name).toBe('Exemplo Junior, Beltrano de Souza');
  });

  it('devolve null quando a faixa não contém registro', () => {
    expect(readCells([frag(42, 700, 'Exemplo, Fulana')], COLS)).toBeNull();
  });

  it('aceita registro sem telefone e sem e-mail', () => {
    const items = [
      frag(42, 700, 'Exemplo, Ciclana'),
      frag(150, 694, 'F'), frag(220, 694, '41'), frag(268, 694, '1 dez 1984'),
    ];

    expect(readCells(items, COLS)).toMatchObject({ name: 'Exemplo, Ciclana', rawPhone: null, age: 41 });
  });
});

describe('readCells — a coluna impede a contaminação que existia (AC13)', () => {
  it('a cauda de um e-mail quebrado não entra no nome', () => {
    // Caso real: "…@gmai" na primeira linha do registro, "l.com" na terceira — ambos na coluna de
    // e-mail. Achatado numa string, o "l.com" virava sobrenome.
    const items = [
      frag(42, 700, 'Exemplo, Fulana'), frag(419, 700, 'a.pessoa@gmai'),
      frag(150, 694, 'F'), frag(220, 694, '26'), frag(268, 694, '3 mar 2000'), frag(337, 694, '(11) 90000-0001'),
      frag(419, 688, 'l.com'),
    ];

    expect(readCells(items, COLS)?.name).toBe('Exemplo, Fulana');
  });

  it('o e-mail do registro VIZINHO atravessando a faixa não entra no nome', () => {
    // Caso real: "…@gmail.co" do vizinho de cima e o "m" dele embaixo, envolvendo esta linha. A
    // cabeça termina em TLD válido, então nenhuma inspeção do texto identificaria o fragmento.
    const items = [
      frag(419, 706, 'vizinho@gmail.co'),
      frag(42, 700, 'Exemplo, Fulana'),
      frag(150, 694, 'F'), frag(220, 694, '68'), frag(268, 694, '17 out 1957'), frag(337, 694, '(11) 90000-0003'),
      frag(419, 688, 'm'),
    ];
    const rec = readCells(items, COLS);

    expect(rec?.name).toBe('Exemplo, Fulana');
    expect(rec?.rawPhone).toBe('(11) 90000-0003');
  });

  it('um telefone não entra no nome mesmo se a coluna estiver vazia', () => {
    const items = [
      frag(42, 700, 'Exemplo, Beltrano'),
      frag(150, 694, 'M'), frag(220, 694, '30'), frag(268, 694, '1 jan 1996'), frag(337, 694, '(11) 90000-0004'),
    ];

    expect(readCells(items, COLS)?.name).not.toContain('90000');
  });

  it('atribui à coluna do nome o que está à esquerda da coluna seguinte', () => {
    // Nome longo chegando perto da coluna de gênero: continua nome, e não vira dado.
    const items = [
      frag(42, 700, 'Exemplo dos Santos Pereira, Beltrano'), // termina em 42 + 36×4 = 186 > 150
      frag(150, 694, 'M'), frag(220, 694, '25'), frag(268, 694, '19 fev 2001'),
    ];

    expect(readCells(items, COLS)?.name).toBe('Exemplo dos Santos Pereira, Beltrano');
  });
});

describe('readGrid — o registro partido também tira o nome da coluna', () => {
  it('não deixa a cauda de e-mail do vizinho virar sobrenome no registro fundido', () => {
    const CTM = [1, 0, 0, 1, 0, 0];
    const cellRules = (y: number) =>
      [[42, 100], [150, 62], [220, 42], [268, 62], [337, 74], [419, 100]].map(([x, w]) => ({
        x1: x, y1: y, x2: x + w, y2: y, m: CTM,
      }));
    // Página 1 termina com dados órfãos abaixo da grade; página 2 abre com o nome — e com a cauda
    // "m" do e-mail de OUTRA pessoa na coluna de e-mail, que foi o que contaminou o PDF real.
    const p1 = {
      width: 595, height: 842,
      items: [
        frag(42, 700, 'Exemplo, Fulana'), frag(150, 694, 'F'), frag(220, 694, '68'),
        frag(268, 694, '17 out 1957'), frag(337, 694, '(11) 90000-0001'),
        frag(150, 620, 'M'), frag(220, 620, '34'), frag(268, 620, '14 mai 1992'), frag(337, 620, '(11) 90000-0002'),
      ],
      segments: [710, 685].flatMap(cellRules), rects: [],
    };
    const p2 = {
      width: 595, height: 842,
      items: [
        frag(419, 706, 'vizinho@gmail.co'),
        frag(42, 700, 'Exemplo, Beltrano'), frag(419, 694, 'm'),
        frag(42, 675, 'Exemplo, Ciclana'), frag(150, 669, 'F'), frag(220, 669, '30'), frag(268, 669, '1 jan 1996'),
      ],
      segments: [710, 685, 660].flatMap(cellRules), rects: [],
    };
    const records = recs(readGrid([p1, p2]));

    expect(records?.map((r) => r.name)).toEqual(['Exemplo, Fulana', 'Exemplo, Beltrano', 'Exemplo, Ciclana']);
    expect(records?.[1]).toMatchObject({ age: 34, rawPhone: '(11) 90000-0002' });
  });
});

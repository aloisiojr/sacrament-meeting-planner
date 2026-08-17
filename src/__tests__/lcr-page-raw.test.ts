/**
 * Passo 1 de `specs/pdf-import-table-grid.plan.md`: a WebView passa a devolver dados BRUTOS e a
 * montagem do texto vira TS puro. Este passo não entrega nenhum critério do spec — ele só troca o
 * contrato mantendo a saída idêntica, e é justamente isso que estes testes prendem.
 *
 * A geometria é sintética, com as MEDIDAS dos PDFs reais (colunas em 42/150/220/268/337/419, gap 6
 * dentro do registro, 19 entre registros, 12 na terceira linha de um nome). Página real não pode
 * virar fixture: ela carrega nome, telefone e e-mail de membros.
 */
import { buildLcrText, joinTextRun, type LcrRawPage, type LcrTextItem } from '../lib/lcrPdfPage';

/** Um item de texto com largura proporcional ao texto, como o pdf.js entrega. */
const frag = (x: number, y: number, s: string, size = 8): LcrTextItem => ({
  x,
  y,
  w: s.length * 4,
  size,
  s,
});

const page = (items: LcrTextItem[]): LcrRawPage => ({
  width: 595,
  height: 842,
  items,
  segments: [],
  rects: [],
});

describe('buildLcrText — reconstrói o texto que o extrator montava dentro da WebView', () => {
  // Dois registros de 2 linhas e um de 3, com os gaps reais: 6 dentro, 19 entre, 12 na 3ª linha.
  const ITEMS: LcrTextItem[] = [
    frag(42, 700, 'Exemplo, Fulana'),
    frag(150, 694, 'F'), frag(220, 694, '26'), frag(268, 694, '3 mar 2000'), frag(337, 694, '(11) 90000-0001'),

    frag(42, 675, 'Exemplo Junior, Beltrano'),
    frag(150, 669, 'M'), frag(220, 669, '33'), frag(268, 669, '5 abr 1993'), frag(337, 669, '(11) 90000-0002'),
    frag(42, 657, 'de Souza'),

    frag(42, 638, 'Exemplo Neto, Ciclana'),
    frag(150, 632, 'F'), frag(220, 632, '40'), frag(268, 632, '9 jun 1986'),
  ];

  it('emite uma linha por registro, com o nome antes dos dados', () => {
    const out = buildLcrText([page(ITEMS)]).split('\n');

    expect(out).toEqual([
      'Exemplo, Fulana F 26 3 mar 2000 (11) 90000-0001',
      'Exemplo Junior, Beltrano de Souza M 33 5 abr 1993 (11) 90000-0002',
      'Exemplo Neto, Ciclana F 40 9 jun 1986',
    ]);
  });

  it('mantém íntegro o registro cujo nome ocupa três linhas', () => {
    // O gap de 12 é interno; só o de 19 separa. Era exatamente aqui que o limiar antigo partia.
    expect(buildLcrText([page(ITEMS)]).split('\n')[1]).toContain('Exemplo Junior, Beltrano de Souza');
  });

  it('conta os gaps de TODAS as páginas para inferir o limiar, não de cada uma', () => {
    // Uma página com um registro só não tem gaps suficientes para inferir nada sozinha; junto com a
    // outra, ela é agrupada corretamente. O extrator sempre calculou a frequência global.
    const sozinha = page([
      frag(42, 700, 'Exemplo Único, Alfa'),
      frag(150, 694, 'M'), frag(220, 694, '50'), frag(268, 694, '1 jan 1976'),
    ]);

    expect(buildLcrText([page(ITEMS), sozinha]).split('\n')).toHaveLength(4);
  });
});

describe('joinTextRun — junta os fragmentos que o pdf.js quebra', () => {
  it('cola glifos acentuados na mesma palavra', () => {
    // O pdf.js emite "Gon" "ç" "alves" como itens adjacentes, sem espaço entre eles.
    const run = [frag(42, 700, 'Gon'), frag(54, 700, 'ç'), frag(58, 700, 'alves')];

    expect(joinTextRun(run)).toBe('Gonçalves');
  });

  it('insere espaço quando há um vão de verdade entre os itens', () => {
    const run = [frag(42, 700, 'Alfa'), frag(80, 700, 'Beta')];

    expect(joinTextRun(run)).toBe('Alfa Beta');
  });

  it('ordena por Y de cima para baixo e por X da esquerda para a direita', () => {
    const run = [frag(80, 690, 'Beta'), frag(42, 700, 'Alfa'), frag(42, 690, 'Gama')];

    expect(joinTextRun(run)).toBe('Alfa Gama Beta');
  });
});

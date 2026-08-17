/**
 * Passo 4 de `specs/pdf-import-table-grid.plan.md` — AC9 a AC11: registros partidos entre páginas.
 *
 * A regra é do usuário — gênero é obrigatório, então banda sem gênero é fragmento — corrigida pela
 * medição num ponto que muda a implementação: **o outro pedaço não é uma banda**. Ele fica fora da
 * grade, abaixo da última fronteira da página anterior, misturado ao rodapé. Quem procurar "banda
 * sem gênero ↔ banda sem gênero" não acha o par.
 *
 * Nos 39 pontos de quebra dos 8 PDFs a forma é uma só, sem exceção: dados órfãos embaixo, nome sem
 * gênero na primeira banda da página seguinte.
 */
import { mergePageBreaks } from '../lib/lcrPdfGrid';

const RODAPE = '15 Aug 2026 For Church Use Only © 2026 by Intellectual Reserve, Inc. All rights reserved. 2';

describe('mergePageBreaks — junta o registro partido na virada de página (AC9, AC10)', () => {
  it('funde os dados órfãos com o nome da página seguinte', () => {
    const paginas = [
      { bands: ['Exemplo, Fulana F 47 10 out 1978 (11) 90000-0001'], above: '', below: 'M 34 14 mai 1992 (11) 90000-0002' },
      { bands: ['Exemplo, Beltrano de Souza', 'Exemplo, Ciclana F 65 25 jan 1961'], above: '', below: '' },
    ];

    expect(mergePageBreaks(paginas)).toEqual([
      'Exemplo, Fulana F 47 10 out 1978 (11) 90000-0001',
      'Exemplo, Beltrano de Souza M 34 14 mai 1992 (11) 90000-0002',
      'Exemplo, Ciclana F 65 25 jan 1961',
    ]);
  });

  it('descarta rodapé, título, cabeçalho e contagem antes de parear (AC10)', () => {
    // No PDF real o órfão vem grudado no rodapé, e a página seguinte abre com o cabeçalho de coluna.
    const paginas = [
      { bands: ['Exemplo, Fulana F 47 10 out 1978'], above: '', below: `M 34 14 mai 1992 (11) 90000-0002 ${RODAPE}` },
      { bands: ['Exemplo, Beltrano'], above: 'Name Gender Age Birth Date Phone Number Email', below: 'Count: 2' },
    ];

    expect(mergePageBreaks(paginas)[1]).toBe('Exemplo, Beltrano M 34 14 mai 1992 (11) 90000-0002');
  });

  it('não perde o telefone do registro fundido', () => {
    const paginas = [
      { bands: ['Exemplo, Fulana F 47 10 out 1978'], below: 'M 16 8 set 2009 (11) 98634-0000', above: '' },
      { bands: ['Exemplo, Beltrano'], above: '', below: '' },
    ];

    expect(mergePageBreaks(paginas)[1]).toContain('(11) 98634-0000');
  });
});

describe('mergePageBreaks — recusa fundir quando as formas não casam (AC11)', () => {
  it('não funde se o órfão não tem âncora', () => {
    // Só sobra de nome embaixo: fundir inventaria um registro.
    const paginas = [
      { bands: ['Exemplo, Fulana F 47 10 out 1978'], above: '', below: 'de Souza' },
      { bands: ['Exemplo, Beltrano M 30 1 jan 1996'], above: '', below: '' },
    ];

    expect(mergePageBreaks(paginas)).toEqual([
      'Exemplo, Fulana F 47 10 out 1978',
      'Exemplo, Beltrano M 30 1 jan 1996',
    ]);
  });

  it('não funde se a primeira banda da página seguinte já tem âncora', () => {
    const paginas = [
      { bands: ['Exemplo, Fulana F 47 10 out 1978'], above: '', below: 'M 34 14 mai 1992' },
      { bands: ['Exemplo, Beltrano M 30 1 jan 1996'], above: '', below: '' },
    ];
    const out = mergePageBreaks(paginas);

    expect(out).toContain('Exemplo, Beltrano M 30 1 jan 1996');
    expect(out.some((l) => l.includes('Beltrano') && l.includes('14 mai 1992'))).toBe(false);
  });

  it('não funde na última página, que não tem seguinte', () => {
    const paginas = [{ bands: ['Exemplo, Fulana F 47 10 out 1978'], above: '', below: 'M 34 14 mai 1992' }];

    expect(mergePageBreaks(paginas)).toHaveLength(1);
  });

  it('ignora páginas sem nada fora da grade', () => {
    const paginas = [
      { bands: ['Exemplo, Fulana F 47 10 out 1978'], above: '', below: RODAPE },
      { bands: ['Exemplo, Beltrano M 30 1 jan 1996'], above: '', below: '' },
    ];

    expect(mergePageBreaks(paginas)).toHaveLength(2);
  });
});

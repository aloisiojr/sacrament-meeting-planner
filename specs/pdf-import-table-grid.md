# Ler o PDF do LCR como tabela, não como texto solto

## Problem / intent

O import da lista de membros reconstrói a tabela a partir de coordenadas de texto e *infere
estatisticamente* onde um registro termina. O PDF **declara** isso: o gerador desenha as fronteiras
de linha e de coluna. Esta mudança troca a fonte de verdade — passar a ler a grade que existe no
arquivo — e, com as colunas conhecidas, ler cada campo da sua própria célula em vez de reencontrá-lo
por regex numa linha achatada.

O objetivo é eliminar por construção a classe de defeito que apareceu três vezes em uma semana:
registro partido ao meio, registros vizinhos fundidos, e resíduo de uma coluna colado em outra.

## In scope / Out of scope

- **In:** detecção de fronteiras de registro a partir de evidência visual genérica (traços
  horizontais e arestas de retângulos preenchidos), com validação contra o próprio dado.
- **In:** detecção das colunas e leitura campo a campo por célula.
- **In:** fusão de registros partidos entre páginas.
- **In:** manter o algoritmo atual como fallback do documento inteiro.
- **Out:** mudar o que o app faz com os registros depois de lidos (revisão, merge, telefones).
- **Out:** OCR ou PDFs de imagem — segue fora, como hoje.
- **Out:** versionar os PDFs de referência ou qualquer dado deles (ver Notes).

## Baseline (evidence)

Medido com o mesmo `pdfjs-dist@4.10.38` que o app usa, sobre os 8 PDFs de referência
(3 alas, pt-BR / en-US / es-LA; 2196 a 3539 itens de texto cada).

**Hoje** (`src/components/PdfTextExtractor.tsx` + `src/lib/lcrPdfLayout.ts` + `src/lib/lcrPdfParser.ts`):

1. agrupa itens em linhas visuais por Y;
2. corta nome × dados por **uma** fronteira X (mediana da coluna de gênero);
3. agrupa linhas em registros por um **limiar de gap inferido** (`rowGapThreshold`);
4. concatena `nome + dados` numa string e reencontra os campos por regex (`parseLcrText`).

O passo 3 errou três vezes: `12,5` partia registros de 3 linhas; a correção seguinte deu `21` e
**fundia vizinhos** passando nos testes; a terceira escondia um gap único de 13. O passo 4 produziu
`"<sobrenome>, <nome> l.com"` e `"<nome> m <sobrenome>"` — cauda de e-mail lida como sobrenome.

**O que o PDF declara** (exemplo: `pdf-sample.pdf`, página 10):

- 186 traços horizontais = **6 colunas × 31 linhas** — bordas de célula.
  X de início: `34.3, 144.4, 213.5, 261.5, 330.6, 412.9`.
  Passo em Y: `19.0, 19.1, 31.2, 19.0, 31.3` — a fronteira de **todo** registro, com 31,3 marcando
  exatamente os de três linhas.
- retângulos preenchidos alternando `239,240,240` e branco; as arestas de duas faixas consecutivas
  delimitam também a linha branca entre elas.
- os PDFs **não** são *tagged* (sem `StructTreeRoot`): não há estrutura lógica, só geometria.
- no binário cada linha visual é um comando de texto próprio, e acentos quebram o item ao meio
  (`"Exemplo J" + "ú" + "nior, Jos" + "é" + " Fulano"`). Não existe "nome inteiro" no arquivo.

**Particionamento pela grade, nos 8 arquivos:** zero bandas com 2+ registros. ~98,6% dos registros
caem em exatamente uma banda. O resto são os partidos entre páginas (abaixo).

**Registros partidos entre páginas — 39 ocorrências, 100% no mesmo formato, zero exceções:**

| Página N, abaixo da última borda | Página N+1, primeira banda |
|---|---|
| `M 34 <data> (11) 90000-0001` — dados, com âncora | `<sobrenome>, <nome> ⏎ <nome cont.>` — só nome |

O pedaço órfão fica **fora da grade** e vem misturado ao rodapé. O código atual acerta esses 39 por
outro caminho (o mecanismo de *held* do `parseLcrText`), e é por isso que os 8 arquivos batem a
contagem declarada hoje. **A grade sozinha os perde.**

**Armadilhas medidas, que viraram AC:** a escala entre coordenadas gráficas e de texto não pode ser
constante (usei 4/3 na investigação, por acaso); "atravessa a tabela" não pode ser um comprimento
absoluto (o filtro `> 300pt` escondeu justamente as bordas de célula, que têm 48 a 148pt); e as
colunas precisam de tolerância (a página 1 tem `34.3` e `35.1` na mesma coluna).

## Acceptance criteria (EARS)

**Detecção genérica de fronteiras**

- AC1: WHEN uma página é processada, the system SHALL coletar fronteiras candidatas a partir de
  traços horizontais E de arestas de retângulos preenchidos, sem depender de cor, espessura de
  traço ou comprimento absoluto específicos.
- AC2: WHEN avalia um traço como fronteira candidata, the system SHALL exigir que ele cubra uma
  fração mínima da extensão horizontal ocupada por texto **naquela página**, e não um comprimento
  fixo em pontos.
- AC3: WHEN converte coordenadas de operadores gráficos para o espaço do texto, the system SHALL
  derivar a transformação da própria página (viewport), e não de um fator constante.
- AC4: WHEN agrupa posições X em colunas, the system SHALL usar agrupamento com tolerância, de modo
  que valores a menos de ~2pt de distância contem como a mesma coluna.

**Validação e escolha da fonte**

- AC5: WHEN um conjunto de fronteiras produz um particionamento, the system SHALL medir quantas
  bandas contêm exatamente um registro e quantas contêm dois ou mais.
- AC6: IF alguma banda contém dois ou mais registros, THEN the system SHALL rejeitar aquele
  particionamento.
- AC7: WHEN mais de uma fonte de fronteiras produz particionamento válido, the system SHALL escolher,
  **para o documento inteiro**, a de melhor pontuação entre: separadores desenhados, faixas de fundo
  e o limiar de gap atual.
- AC8: IF nenhuma fonte produz particionamento válido, THEN the system SHALL usar o comportamento
  atual, com saída idêntica à de hoje.

**Quebra de página**

- AC9: WHEN uma página termina com texto de registro abaixo da sua última fronteira e a primeira
  banda da página seguinte não contém âncora, the system SHALL fundir os dois num único registro.
- AC10: WHEN identifica o texto órfão de uma página, the system SHALL descartar rodapé, cabeçalho de
  coluna, título e linha de contagem antes de tentar a fusão.
- AC11: IF o órfão não tem âncora, ou a primeira banda da página seguinte tem âncora, THEN the
  system SHALL NOT fundir, e SHALL tratar o documento pelo fallback do AC8.

**Leitura por célula**

- AC12: WHILE a grade está em uso, the system SHALL atribuir cada item de texto a uma célula pela
  sua coluna, e ler nome, gênero, idade, nascimento, telefone e e-mail cada um da sua própria coluna.
- AC13: WHILE a grade está em uso, the system SHALL compor o nome exclusivamente com o conteúdo da
  coluna de nome, de modo que resíduo de e-mail ou telefone não possa integrar um nome.
- AC14: WHEN um registro ocupa três linhas visuais, the system SHALL mantê-lo íntegro, com o nome
  completo e os dados da linha do meio.

**Não-regressão, medida ponta a ponta**

- AC15: WHEN qualquer um dos 8 PDFs de referência é processado, the system SHALL produzir exatamente
  o número de registros que o próprio arquivo declara na linha Count/Contagem/Recuento.
- AC16: WHEN qualquer um dos 8 PDFs de referência é processado, the system SHALL produzir zero nomes
  contendo `@`, fragmento de TLD ou token de gênero solto.
- AC17: WHEN os 8 PDFs de referência são processados, the system SHALL reproduzir os 39 registros
  partidos entre páginas com nome completo e dados corretos, sem perda em relação ao comportamento
  de hoje.
- AC18: WHILE o número de registros lidos diverge do declarado no PDF, the system SHALL continuar
  exibindo o aviso de divergência na tela de revisão (`pdfImport.countMismatch`).

## Open questions

Nenhuma.

## Notes

**O fallback mantém o caminho antigo vivo.** Como o AC8 exige saída idêntica à de hoje quando a
grade não se aplica, `rowGapThreshold`, `isEmailTail` e `cleanName` **não podem ser removidos** —
eles são o fallback. A leitura por célula não os usa; eles deixam de estar no caminho principal, o
que é diferente de deixarem de existir. Uma versão anterior deste spec dizia que a grade "apagaria"
essas heurísticas; está errado e fica registrado aqui.

**Escopo:** foi proposto dividir em dois specs (fronteiras primeiro, células depois) e o usuário
optou por um só, com a grade completa (2026-08-17). O risco assumido é uma mudança grande num
caminho cuja verificação real só acontece no aparelho; o AC17 e a validação por documento existem
para compensar.

**Desempenho não é critério** (decisão do usuário, 2026-08-17): `getOperatorList` processa os
operadores gráficos além do texto e é mais caro que o `getTextContent` de hoje, mas o import é raro
e já mostra progresso. Não há AC de tempo.

**Privacidade — vale para o spec, o código, os testes e as mensagens de commit.** Os PDFs de
referência trazem nomes, telefones, datas de nascimento e e-mails de membros reais e não entram no
repositório, e **os dados deles também não**. Os exemplos aqui são anonimizados; coordenadas,
histogramas e formas de token são números e podem ficar. Quem precisar dos nomes reais roda
`scripts/check-lcr-pdfs.mjs` localmente, que os imprime sem gravá-los.

**Sem migração, sem deploy, sem mudança de permissão ou de i18n.** Cliente apenas; a única chave de
tradução envolvida (`pdfImport.countMismatch`) já existe nos três locales.

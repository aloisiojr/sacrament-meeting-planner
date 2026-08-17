# Plan: Ler o PDF do LCR como tabela, não como texto solto
(spec: `specs/pdf-import-table-grid.md`)

## A decisão que organiza o plano

O extrator hoje devolve **uma string achatada** (`out.join('\n')` em `PdfTextExtractor.tsx:132`) e o
`parseLcrText` reencontra os campos nela. A grade precisa de estrutura, então o contrato entre a
WebView e o app tem de mudar de qualquer forma. Há duas maneiras, e elas não se equivalem:

- **(a) montar a grade dentro da WebView** — mais lógica em JS injetado. Cada função nova viraria
  outra string literal duplicada, como o `ROW_GAP_THRESHOLD_JS` de hoje, porque `${fn}` morre em
  build minificado/Hermes. Nada disso roda no jest.
- **(b) a WebView devolve dados BRUTOS e toda a grade vive em módulos puros de TS** — itens de texto
  com coordenadas, segmentos horizontais, retângulos preenchidos e a transformação da página.

O plano adota **(b)**, e isso é o que torna o resto testável. Como consequência o
`ROW_GAP_THRESHOLD_JS` e sua duplicação **desaparecem** (a lógica de gap volta a ser TS puro), e a
regra "a bridge é fina, a lógica crítica é pura e testada" — que o docblock do extrator já declara —
passa a valer de fato.

## Reuse (extend these, don't recreate)

- `src/lib/lcrPdfParser.ts` — `isAnchorAt`/`findAnchor` viram o **juiz** da validação (AC5/AC6), e o
  `parseLcrText` inteiro continua sendo o **fallback** (AC8). Não reescrever nem apagar.
- `src/lib/lcrPdfLayout.ts` — `rowGapThreshold` vira uma das três fontes concorrentes (AC7).
- `src/components/PdfTextExtractor.tsx` — o `joinCol` (junção de glifos acentuados por avanço de X)
  é a peça que reconstrói palavras; move para TS puro e é reusada na leitura por célula.
- `src/components/PdfImportModal.tsx:59` — **único** consumidor do contrato. Toda a mudança de
  interface passa por esta linha.
- `scripts/check-lcr-pdfs.mjs` — o arnês que roda o pipeline real sobre os 8 PDFs locais. É onde
  AC15/AC16/AC17 são verificados (ver Riscos: não podem virar teste commitado).
- `src/__tests__/lcrPdfParser.test.ts`, `lcr-row-threshold.test.ts` — padrão de teste a seguir:
  fixtures sintéticas, `it.each`, asserção comportamental.

## Steps (1 step = 1 commit)

1. **`refactor(pdf): a WebView devolve dados brutos, não texto montado`**
   A WebView passa a postar, por página: itens de texto (`x, y, w, size, str`), segmentos
   horizontais, retângulos preenchidos com cor, e a transformação do viewport. Novo módulo puro
   `src/lib/lcrPdfPage.ts` reconstrói **exatamente** o texto de hoje a partir desses dados, e o
   `PdfImportModal` continua chamando `parseLcrText`. **Comportamento idêntico, zero AC entregue** —
   é a fundação. Remove `ROW_GAP_THRESHOLD_JS` e sua duplicação.
   — covers: nenhum (habilita todos)
   — tests: `lcr-page-raw.test.ts` — de uma página sintética, a reconstrução produz o mesmo texto que
   o algoritmo de hoje produziria; um teste de que a grade de glifos acentuados ainda vira palavra.

2. **`feat(pdf): coletar fronteiras candidatas de traços e de faixas`**
   `src/lib/lcrPdfGrid.ts`: coleta genérica de candidatos (sem cor, sem espessura, sem comprimento
   absoluto), largura relativa à extensão de texto da página, coordenadas mapeadas pelo viewport,
   colunas por agrupamento com tolerância.
   — covers: AC1, AC2, AC3, AC4
   — tests: `lcr-grid-candidates.test.ts` — cor arbitrária ainda é detectada; traço curto é rejeitado
   e o mesmo traço numa página estreita é aceito (prova que o critério é relativo); `34.3` e `35.1`
   colapsam numa coluna; escala diferente de 4/3 é respeitada.

3. **`feat(pdf): validar o particionamento e escolher a fonte`**
   Pontuação por banda (exatamente um registro × duas ou mais), veto de banda com 2+, escolha por
   documento entre traços, faixas e limiar de gap.
   — covers: AC5, AC6, AC7, AC8
   — tests: `lcr-grid-partition.test.ts` — um particionamento com uma banda de 2 registros é
   rejeitado mesmo sendo o de melhor pontuação nos demais critérios; sem nenhuma fonte válida, a
   saída é byte a byte a de hoje.

4. **`feat(pdf): fundir registros partidos entre páginas`**
   Órfão abaixo da última fronteira + primeira banda sem âncora da página seguinte, com rodapé,
   título, cabeçalho e linha de contagem descartados antes do pareamento.
   — covers: AC9, AC10, AC11
   — tests: `lcr-grid-pagebreak.test.ts` — o par funde e produz nome completo com telefone; com o
   rodapé presente o pareamento ainda funciona; **formas trocadas (órfão sem âncora, ou primeira
   banda COM âncora) não fundem e caem no fallback**.

5. **`feat(pdf): ler cada campo da sua própria célula`**
   Atribuição de item → célula por coluna; nome vem só da coluna de nome.
   — covers: AC12, AC13, AC14
   — tests: `lcr-grid-cells.test.ts` — cauda de e-mail posicionada na coluna de e-mail **não** entra
   no nome (o caso `l.com` e o caso `m`, com geometria sintética); registro de 3 linhas sai íntegro.

6. **`feat(pdf): ligar a grade ao import, com fallback por documento`**
   `PdfImportModal` passa a receber registros estruturados; quando a grade não valida, cai no
   `parseLcrText` sobre o texto reconstruído do passo 1.
   — covers: AC8 (ponta a ponta), AC18
   — tests: `pdf-import-modal` — com dados que a grade valida, usa a grade; com dados que ela rejeita,
   usa o caminho antigo; o aviso de divergência de contagem continua aparecendo.

7. **`test(pdf): estender o arnês dos 8 PDFs para o caminho novo`**
   `scripts/check-lcr-pdfs.mjs` roda os dois caminhos e mostra o diff por registro, mais a contagem
   de nomes contaminados e a conferência dos 39 partidos entre páginas.
   — covers: AC15, AC16, AC17 (verificados **localmente**, não em teste commitado)
   — tests: o próprio script; a saída vai no relatório de `verify-change`.

## AC → coverage matrix

| AC | Step(s) | Test(s) |
|----|---------|---------|
| AC1–AC4 | 2 | `lcr-grid-candidates.test.ts` |
| AC5–AC7 | 3 | `lcr-grid-partition.test.ts` |
| AC8 | 3, 6 | `lcr-grid-partition.test.ts` + `pdf-import-modal` |
| AC9–AC11 | 4 | `lcr-grid-pagebreak.test.ts` |
| AC12–AC14 | 5 | `lcr-grid-cells.test.ts` |
| AC15–AC17 | 7 | `scripts/check-lcr-pdfs.mjs` (local, contra os PDFs reais) |
| AC18 | 6 | `pdf-import-modal` |

## Risks / deploys

- **Sem migração, sem deploy, sem i18n nova, sem permissão.** Cliente apenas.
- **AC15–AC17 não podem virar teste commitado.** Fixture de página real contém nomes e telefones de
  membros. Testes usam **geometria sintética**; a verificação contra os 8 PDFs fica no script local.
  Isso é uma perda real de cobertura em CI, assumida conscientemente por privacidade.
- **O passo 1 é o de maior risco e o de menor recompensa** — muda o contrato inteiro sem entregar
  nenhum AC. É deliberado: falha nele aparece como texto diferente, comparável byte a byte com o de
  hoje, antes de qualquer lógica nova existir.
- **Payload do `postMessage` cresce** de ~50KB (texto) para dados brutos de ~2500–3500 itens. Sem AC
  de desempenho (decisão do usuário), mas se a WebView engasgar é aqui.
- **A WebView não roda no jest.** Os passos 1 e 6 só se provam no aparelho. Isso não mudou.
- **Dois caminhos vivos.** O fallback obriga a manter `parseLcrText`, `rowGapThreshold`,
  `isEmailTail` e `cleanName` funcionando. Uma correção futura no domínio pode precisar ser feita
  duas vezes — é o preço do AC8.

## Rollback

Sete commits independentes. Reverter 2–7 devolve ao comportamento de hoje mantendo a fundação do
passo 1 (que é comportamentalmente neutra). Reverter também o 1 devolve o extrator ao contrato de
string achatada. Nada persiste estado, então não há dado a desfazer.

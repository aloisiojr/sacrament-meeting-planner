# Nomes que ocupam três linhas quebram o import de PDF

## Problem / intent

No import da lista de membros, alguns registros saem errados: o nome fica truncado e a pessoa fica
sem telefone, enquanto aparece um registro fantasma com o resto do nome e os dados dela. Acontece
com registros cujo nome ocupa **três** linhas visuais no PDF.

## Baseline (evidence)

Medido no PDF real da ala (`pdf-sample.pdf`, 14 páginas, ~361 registros), extraído com o mesmo
`pdfjs-dist@4.10.38` que o app usa.

O registro problemático, com as coordenadas verticais como o app as vê:

```
y=291  "<sobrenome>, <nome>"                              (nome, parte 1)
y=278  "<nome cont.>"  F  39  <data>  <telefone>  <email>  (nome parte 2 + DADOS)
y=266  "<nome cont.>"                                     (nome, parte 3)
```

Os dados ficam na linha do MEIO. Os gaps internos são 13 e 12.

`src/components/PdfTextExtractor.tsx` agrupa linhas visuais em registros por um limiar de gap
vertical, calculado como a média dos **dois gaps mais frequentes** — assumindo que existem apenas
dois espaçamentos (dentro do registro × entre registros). A distribuição real deste PDF:

| gap | ocorrências | significado |
|-----|-------------|-------------|
| 6   | 374 | dentro do registro (nome → dados) |
| 19  | 359 | **entre registros** |
| 7   | 54  | dentro do registro |
| 12  | 10  | dentro do registro (nomes de 3 linhas) |
| 13  | 3   | dentro do registro (nomes de 3 linhas) |

Limiar resultante: `(6 + 19) / 2 = 12,5` — que cai **dentro** do grupo "mesmo registro". O gap 13 da
de um registro de três linhas é lido como separador e parte o registro em dois:

```
"<sobrenome>, <nome>"                 → sem dados
"<resto do nome>"  F 39 … <telefone>  → nome errado, dados órfãos
```

**Impacto medido:** 3 registros dos ~361 (páginas 1, 7 e 8). Poucos, mas falham em silêncio: uma
pessoa entra sem telefone e outra com nome inventado, sem aviso na revisão.

## In scope / Out of scope

- **In:** o cálculo do limiar de agrupamento de linhas em registros.
- **In:** extrair esse cálculo para uma função pura em `src/lib/`, para que seja testável — hoje ele
  vive embutido no componente e não tem teste.
- **Out:** o `lcrPdfParser`, que recebe o texto já agrupado; ele não é a causa.
- **Out:** a separação de colunas por X (nome × dados), que funciona corretamente.
- **Out:** versionar o PDF real — contém nomes, telefones e e-mails de membros. O caso de teste usa
  só a distribuição de gaps e as coordenadas verticais, que são números.

## Acceptance criteria (EARS)

- AC1: WHEN os gaps verticais de um PDF formam mais de dois agrupamentos, the system SHALL escolher
  um limiar que separe o gap entre registros de TODOS os gaps internos.
- AC2: WHEN um registro ocupa três linhas visuais, the system SHALL mantê-lo como um único registro,
  com o nome completo e os dados da linha do meio.
- AC3: WHILE processando o PDF de referência da ala, the system SHALL produzir um limiar acima de 13
  e abaixo de 19.
- AC4: WHEN o PDF tem apenas dois espaçamentos (o caso simples, já suportado), the system SHALL
  continuar produzindo o mesmo agrupamento de hoje.
- AC5: IF não houver gaps suficientes para inferir dois agrupamentos, THEN the system SHALL manter o
  comportamento atual de não agrupar (limiar infinito), em vez de adivinhar.
- AC6: WHEN qualquer um dos 8 PDFs já compartilhados é processado, the system SHALL produzir um
  limiar acima do maior gap interno daquele arquivo e abaixo do seu separador de registros.
- AC7: WHEN qualquer um desses PDFs é processado de ponta a ponta, the system SHALL produzir
  exatamente o número de registros que o próprio PDF declara na linha "Count/Contagem/Recuento".

## Open questions

Nenhuma.

## Notes

**Por que o limiar atual erra:** ele mede *frequência*, não *separação*. Os dois gaps mais
frequentes aqui (6 e 19) são ambos legítimos, mas o ponto médio entre eles não separa os grupos —
existem gaps internos maiores que ele (12 e 13). O limiar precisa ficar entre o **maior gap interno**
e o **gap entre registros**, não entre os dois mais comuns.

**Privacidade:** os PDFs de referência não entram no repositório, e **nem os dados deles neste
documento** — a primeira versão deste spec trazia nome completo, data de nascimento e telefone de
uma pessoa real, exatamente o que ele argumenta que deve ficar de fora. Os exemplos aqui são
anonimizados; quem precisar dos nomes reais roda `scripts/check-lcr-pdfs.mjs` localmente.
O `.gitignore` exclui `/*.pdf` na raiz.

**Validado nos 8 PDFs compartilhados** (pt-BR, en, es; três alas), de ponta a ponta pelo parser
real: 6 melhoram, 2 ficam idênticos, nenhum regride, e os 8 batem a contagem declarada no próprio
arquivo. As correções são todas da mesma forma — um pedaço de nome volta para o dono:

| Antes | Depois |
|---|---|
| `<parte do sobrenome>` (sem telefone) | `<sobrenome completo>, <nome>` (sem telefone) |
| `<sobrenome>, <nome> <fragmento do vizinho>` | `<sobrenome>, <nome>` |
| `<sobrenome>, <nome>` | `<fragmento devolvido> <sobrenome>, <nome>` |

A terceira linha parece regressão e não é: em `Membros Ala Panamby.pdf` um trecho de sobrenome
composto muda de pessoa, porque ele ABRE o sobrenome de quem vem depois — era o limiar antigo que o
entregava para a pessoa anterior. Conferido contra o layout da página; `scripts/check-lcr-pdfs.mjs`
mostra o par completo, com os nomes reais, sem gravá-los em lugar nenhum.

**`scripts/check-lcr-pdfs.mjs`** roda esse mesmo pipeline sobre uma pasta de PDFs e mostra o diff
por registro. É como conferir um arquivo NOVO — o limiar é inferido do espaçamento de cada PDF, e
uma ala nova pode se comportar diferente de tudo que já vimos.

**Sem migração, sem deploy.** Cliente apenas.

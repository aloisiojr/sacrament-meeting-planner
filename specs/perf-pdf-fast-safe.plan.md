# Plan: caminho do PDF rápido e seguro (Wave 3A)
(spec: `specs/perf-pdf-fast-safe.md`)

## Reuse (extend these, don't recreate)

- `src/lib/pdfExtraction.ts` (novo) — só constantes puras + estimativa de bytes
  do base64; consumido por picker, extrator e testes sem mock de WebView.
- `src/components/PdfTextExtractor.tsx` — mesmo WebView/BOOTSTRAP; muda o
  protocolo (por página), o cache de assets, os refs de callback e o timeout.
- `src/__tests__/pdf-import-review.test.tsx` — payload/defaults atuais são o
  contrato do RAP-07; não mudam. Teste de render vai em arquivo novo.
- `assets/pdfjs/*.txt` — já são o `legacy/build` do pdfjs-dist 4.10.38
  (medido por sha256); o script só formaliza a proveniência.

## Steps (1 step = 1 commit)

1. **`fix(pdf): RAP-01 — extrator com teto, timeout, lotes, cache e refs`**
   `pdfExtraction.ts` (teto 10 MB, timeout 75 s, códigos de erro), extrator
   (cache de módulo, refs, mensagens por página, timeout com descarte tardio),
   picker com teto antes do `base64()`, modal com erro visível + retry, chaves
   i18n `pdfImport.tooLarge`/`pdfImport.extractTimeout` nos 3 locales.
   — covers: AC1–AC5
   — tests: `pdf-text-extractor.test.tsx` (novo, WebView/Asset/File mockados):
   acima do teto falha sem montar WebView nem ler assets; timeout dispara
   `pdf-timeout` e ignora resultado tardio; páginas fora de ordem são
   remontadas e `onResult` só no `done`; 2 mounts leem assets 1 vez; re-render
   com callbacks inline novos não remonta a WebView nem relê assets.
   `pdfExtraction.test.ts`: estimativa de bytes do base64.

2. **`build(pdfjs): DEC-07/ARQ-11 — copy-pdfjs com VERSION e teste de checksum`**
   `scripts/copy-pdfjs.mjs` (copia `legacy/build/*.min.mjs` → `assets/pdfjs/*.txt`,
   escreve `VERSION`), rodar o script e commitar `VERSION` (+ `.txt` se mudarem).
   — covers: AC6
   — tests: `pdfjs-provenance.test.ts`: sha256 dos `.txt` == VERSION; com
   `node_modules` presente, bytes e versão == pacote instalado.

3. **`perf(pdf-review): RAP-07 — FlatList com linha memo na revisão`**
   3 listas → `FlatList`; linhas `BlankRow`/`ConflictRow`/`RemovalRow` em
   `React.memo` com props primitivas e callbacks `useCallback`.
   — covers: AC7, AC8
   — tests: `pdf-import-review-memo.test.tsx` (novo): lista longa de remoções,
   alternar um item não re-renderiza as outras linhas (contador via AppSwitch
   mockado); `pdf-import-review.test.tsx` atual segue verde intacto.

## AC → coverage matrix

| AC  | Step(s) | Test(s) |
|-----|---------|---------|
| AC1 | 1 | pdf-text-extractor: teto sem WebView/assets; picker por inspeção do `size` antes de `base64()` |
| AC2 | 1 | pdf-text-extractor: fake timers → `pdf-timeout`; mensagem tardia ignorada |
| AC3 | 1 | pdf-text-extractor: páginas 2,1 + done → `onResult` ordenado 1 vez |
| AC4 | 1 | pdf-text-extractor: 2 mounts, `File.base64` chamado 2× (lib+worker) |
| AC5 | 1 | pdf-text-extractor: rerender com callbacks novos, WebView/assets 1× |
| AC6 | 2 | pdfjs-provenance: VERSION × arquivos × pacote instalado |
| AC7 | 3 | pdf-import-review-memo: contador de render por linha |
| AC8 | 3 | pdf-import-review.test.tsx (existente, inalterado) |

## Decisões registradas

- DEC-07: manter base64 inline com cache de módulo; `localUri` gated pela
  prova em aparelho CLN-05 (ver spec).
- Fonte do pdf.js é `legacy/build`, não `build/` — medido por sha256 nesta
  branch; o script e o teste fixam o caminho legacy.

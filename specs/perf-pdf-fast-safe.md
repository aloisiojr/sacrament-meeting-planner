# Perf — caminho do PDF rápido e seguro (Wave 3A)

Pacote 3A da auditoria v2.0 (`AUDIT-INPUT.md`, insumo não commitado). Achados:
RAP-01, DEC-07/ARQ-11, RAP-07. Fora de escopo: cache de queries/agenda/hinos,
ícones e deps (pacote 3B); `useSundayList`, `_layout`, `queryConfig`. Sem migration.

## RAP-01 — `PdfTextExtractor` não trava nunca

Hoje (`src/components/PdfTextExtractor.tsx`, `PdfImportModal.tsx`, picker em
`src/app/(tabs)/settings/members.tsx:131-145`): sem teto (picker lê `base64()` de
qualquer arquivo), sem timeout (WebView travada = spinner eterno), retorno num
único `postMessage` gigante, assets lidos a cada mount e dep `[onError]` com
callback inline do pai reiniciando a extração a cada re-render.

Correção:
- Teto de 10 MB (`MAX_PDF_BYTES` em `src/lib/pdfExtraction.ts`) checado no picker
  ANTES de `base64()` (via `size` do asset/`File`) e de novo no extrator pelo
  tamanho decodificado estimado do base64 — acima disso, erro visível localizado
  (`pdfImport.tooLarge`), sem ler nem extrair.
- Timeout de 75 s (`EXTRACTION_TIMEOUT_MS`): dispara `onError` com código
  `pdf-timeout`, resultado tardio é ignorado; o modal mostra erro com **retry**
  (remonta o extrator) e cancelar — nada de spinner eterno nem Alert que fecha.
- WebView devolve uma mensagem por página (`{type:'page', index, page}`) e uma
  final (`{type:'done', numPages}`); o host acumula por índice e só chama
  `onResult` com todas as páginas, em ordem.
- Assets (lib+worker) lidos UMA vez: promise cacheada em nível de módulo;
  falha limpa o cache para o retry poder tentar de novo.
- `onResult`/`onError` via ref: re-render do pai com callbacks inline novos NÃO
  reinicia a extração; só muda quando `base64` muda.

Códigos de erro do extrator (string em `onError`): `pdf-too-large`,
`pdf-timeout`; demais mensagens passam como falha genérica. O modal mapeia os
códigos para as chaves i18n `pdfImport.tooLarge` / `pdfImport.extractTimeout`
(3 locales) e mostra retry.

## DEC-07 + ARQ-11 — pdf.js com proveniência

Hoje: `assets/pdfjs/*.txt` (1,8 MB) sem script nem amarração de versão.
Medição nesta branch: os `.txt` commitados são byte-idênticos a
`node_modules/pdfjs-dist/legacy/build/pdf.min.mjs` e `pdf.worker.min.mjs`
(sha256 `44ec6f01…` / `bd888051…`, pdfjs-dist 4.10.38 do lock) — é o build
**legacy**, não o `build/` moderno. O script copia do `legacy/build` de propósito
(WebView antiga) e o teste fixa isso.

- `scripts/copy-pdfjs.mjs`: copia lib+worker de `node_modules/pdfjs-dist`
  (versão lida do `package.json` instalado) para `assets/pdfjs/*.txt` e escreve
  `assets/pdfjs/VERSION` com versão + sha256 + bytes de cada arquivo gerado.
- Teste de proveniência (`pdfjs-provenance.test.ts`): os `.txt` batem com o
  sha256/VERSION e, quando `node_modules/pdfjs-dist` está presente, com o pacote
  instalado (versão e bytes). Binário divergente falha o CI.

### Decisão DEC-07: manter base64 inline (não migrar para `localUri` agora)

Manter o inline com o cache de módulo do RAP-01. Trocar o caminho de carga da
WebView (`localUri`/`allowFileAccess`/origem `file://`) muda a superfície de
segurança de um WebView que processa PII de membros e só pode ser validada em
aparelho — validação que é exatamente a CLN-05, estacionada. Forçar a troca sem
essa prova arrisca quebrar a única via de importação que funciona hoje. A troca
fica registrada como passo posterior, gated pela prova em aparelho da CLN-05.

## RAP-07 — revisão do import não re-renderiza a ala inteira

Hoje (`src/components/PdfImportReview.tsx:211`): ScrollView+`map` nas 3 listas
(`absentInDb` pode ser a ala inteira); cada toggle re-renderiza tudo.
Correção: as 3 listas viram `FlatList` com linha `React.memo` (props primitivas
+ callbacks estáveis via `useCallback`); toggle numa linha não re-renderiza as
demais. Teste com contador de render por linha.

## ACs

- AC1: PDF >10 MB falha rápido no picker (sem `base64()`) e no extrator (sem
  WebView/assets), com erro localizado visível.
- AC2: Sem resposta da WebView em 75 s → erro visível com retry; resposta
  tardia após timeout/erro é ignorada.
- AC3: Mensagens por página são acumuladas em ordem; `onResult` só com o
  documento completo.
- AC4: Assets lidos uma vez por processo, mesmo com remount do extrator.
- AC5: Re-render do pai com callbacks inline novos não reinicia a extração.
- AC6: `node scripts/copy-pdfjs.mjs` regenera `.txt`+`VERSION` determinísticos;
  teste de proveniência verde e falhando com binário divergente.
- AC7: Toggle numa linha da revisão não re-renderiza as outras linhas.
- AC8: Comportamento existente da revisão (defaults, masters, payload de
  `onApply`) preservado — testes atuais verdes sem alteração de expectativa.

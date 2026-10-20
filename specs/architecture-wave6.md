# Wave 6 — Arquitetura (ARQ-01..17 + DEC-03): registro de desfechos

Executada em 2026-10-20, à mão pelo Groing (exceção de patches diretos autorizada
pelo Aloisio após o estouro do limite semanal do Muse Code), branch
`groing/smp-architecture`, na disciplina das waves anteriores: conferência do estado
atual de cada achado contra o código ANTES de tocar (o relatório é anterior às
waves 1–5), commits por lote, gates completos no fechamento.

## Desfecho por achado

| Achado | Desfecho |
|---|---|
| ARQ-01 | **Corrigido.** `createClient<Database>` em `src/lib/supabase.ts`; mapa `Database` em `src/types/database.ts` sobre os Row types existentes (Insert/Update = `Partial<Row>` — limitação interina documentada no código). Dois detalhes que fizeram funcionar: (1) interfaces não recebem index signature implícita, então cada slot é `Row & Record<string, unknown>` — sem isso o schema colapsa para `never` em todos os call sites; (2) a tabela `general_collections` (viva; `useTopics` a consulta) entrou no mapa com seu Row. A única costura dinâmica é o replay da fila offline (nome de tabela vem da fila persistida): exporta-se `supabaseDynamic` de `supabase.ts`, usada só por `useOfflineQueueProcessor`, com o motivo escrito no código. |
| ARQ-02 | **Corrigido.** Predicados reais extraídos para produção e importados pelos testes: `isSundayExpandable`/`resolveExpandedDate` (useAgenda, usados por agenda.tsx) e `shouldRegisterPushToken` (useNotifications — gate por **permissão** `push:receive`, DEC-04). f050 reescrito sobre eles; blocos tautológicos apagados. Achado dentro do achado: o bloco "Excluded dates" do f050 afirmava comportamento que a produção não tem mais (todos os domingos expandem, para permitir trocar o tipo) — removido com o motivo registrado no cabeçalho do teste. |
| ARQ-03 | **Corrigido.** A suíte existente `pdf-text-extractor.test.tsx` (que já mocka o WebView) ganhou as asserções do BOOTSTRAP: parseia como JS válido e define `window.__runPdf`. |
| ARQ-04 | **Corrigido.** `react-test-renderer@19.2.3` (versão do lockfile) declarado em devDependencies. |
| ARQ-05 | **Corrigido.** Mortos apagados: `SwipeableCard.tsx`, `HymnSelector.tsx` (AgendaForm usa `HymnSelectorModal`), `MicIcon` (icons/index.tsx) — zero referências confirmado por grep + suíte integral verde após a remoção. |
| ARQ-06 | **Já resolvido (wave 1).** Fonte única `WRITER_PERMISSIONS`/`WRITER_ROLES` em `src/lib/permissions.ts` + `permissions.test.ts` de concordância. Sem ação. |
| ARQ-07 | **Corrigido.** `database-types.test.ts` ganhou concordância executável migrations×tipos: parseia os CHECKs das migrations (última definição vence) e as uniões de `database.ts`, comparando os 6 pares (SundayExceptionReason, SpeechStatus, Role, NotificationType, NotificationTargetRole, NotificationStatus). O bloco antigo ("6 reasons") mentia — afirmava 6 onde o tipo tem 7 — e foi removido. A concordância pegou uma divergência real na estreia: `NotificationStatus` não tinha `processing`/`failed` da migration 053 (wave 4A) — tipo corrigido. |
| ARQ-08 | **Corrigido.** Cabeçalho do `PdfTextExtractor` e comentário do `groupIntoRows` reescritos para a realidade: o BOOTSTRAP mede e encaminha (CTM), quem decide é `lcrPdfLayout/lcrPdfPage`; o `>=` é a convenção canônica do parser (o extractor nem divide mais linhas). |
| ARQ-09 | **Corrigido.** Cobertura medida em 2026-10-20: statements 76,8 / branches 68,5 / functions 72,0 / lines 78,4 (ambos os projetos). Ratchet em `jest.config.js`: piso global 75/66/70/76, verificado passando com `npm run test:coverage`. |
| ARQ-10 | **Parcial.** `authErrors.ts` e `appStore.ts` ganharam testes puros. `exportAgendaPdf.ts` **estacionado**: sem costura barata sem refactor (gera PDF no dispositivo); segue exercitado indiretamente pelas suítes de tela da agenda. |
| ARQ-11 | **Já resolvido (wave 3A).** pdf.js pinado via `scripts/copy-pdfjs.mjs` + `assets/pdfjs/VERSION` (4.10.38, sha256) conferindo com o lock. Sem ação. |
| ARQ-12 | **Só documento (decisão).** Nenhum refactor de god component antes do cutover. Plano incremental pós-lançamento: (1) extrair `HymnSelectorModal` do AgendaForm; (2) extrair o editor de designações; (3) PdfImportReview: separar a lista de telefones em branco. Um por vez, com a suíte como rede. |
| ARQ-13 | **Corrigido, com reviravolta registrada.** Removidos `GeneralCollection`, `DevicePushToken` (de `database.ts`) e `getCountryByLabel` (nunca chamado). No lote seguinte (ARQ-01), `GeneralCollection` e `DevicePushToken` **voltaram como Row types do cliente tipado** — agora com consumidor real (o mapa `Database`); a remoção original estava certa contra o código da época. `getCountryByLabel` segue removido. |
| ARQ-14 | **Auditado.** 11 disables de `exhaustive-deps` (relatório dizia 7), lidos um a um: todos padrões intencionais (mutações estáveis do React Query omitidas, listener de auth de montagem única, callbacks "latest" de retry/refetch, efeitos chaveados por parâmetro) e 10 já tinham justificativa escrita; o único sem (`settings/whatsapp.tsx`) ganhou a sua. Nenhuma dependência adicionada mecanicamente — isso mudaria comportamento (re-subscrições/re-renders). |
| ARQ-15 | **Só documento.** Transitivas deprecadas rastreadas com `npm ls`: `glob@7`+`inflight` vêm de babel-jest/test-exclude e `abab` do jsdom — **só cadeia de testes**; o runtime usa glob 13 via Expo. Sem ação; some quando o jest/babel-jest atualizar a montante. |
| ARQ-16 | **Corrigido.** `package.json` version 1.0.0 → 2.0.0 (alinhado ao `app.json`). |
| ARQ-17 | **Corrigido.** ADR-008 (`docs/decisions/008-anon-key-exposure-model.md`): anon keys públicas por desenho; proteção = RLS + autorização + barreira; `service_role` nunca no cliente; rotação via EAS env (exige build); sourcemaps no default até haver reporter de crashes. |
| DEC-03 | **Parte local feita; geração estacionada.** Feito: cliente tipado (ARQ-01) + concordância executável (ARQ-07). Estacionado por credencial de staging: gerar os tipos oficiais com `npx supabase gen types typescript --project-id nfraidzguordqmbpqkcf` e substituir o mapa manual pelo arquivo gerado quando o acesso ao staging for liberado. |

## Gates no fechamento

tsc 0 erros · jest 368 suítes / 5.930 testes · lint 0 erros / 5 warnings (baseline) ·
coverage acima do piso novo.

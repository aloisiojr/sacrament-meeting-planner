# Wave 7 — Cleanup e verdade documental (CLN-01..24): registro de desfechos

Executada em 2026-10-20, à mão pelo Groing (mesma exceção autorizada das waves 5–6),
branch `groing/smp-cleanup`. Padrão da wave: o documento diz a verdade **verificável
por comando** — cada desfecho abaixo foi conferido contra o estado atual do repo,
não contra o relatório (anterior às waves 1–6).

| Achado | Desfecho |
|---|---|
| CLN-01 | **Corrigido.** Seção `Now` do `PROGRESS.md` reescrita (o arquivo caiu de 369 para ~184 linhas): estado real pós-waves 1–7, gates, e a lista viva do que falta (push/deploy key, staging+CRON_SECRET+provas, aparelho, branches remotas, fases seguintes). As entradas "NÃO mergeada"/"IN FLIGHT" das waves — todas falsas hoje — viraram histórico apontado, não estado. |
| CLN-02 | **Aposentado.** A página do guia de import (`import-members.html`) **nunca foi construída**; o spec ganhou nota de aposentadoria (branch UX-2.0 deletada; o import vigente é o PDF do LCR no app, ADR-006). |
| CLN-03 | **Corrigido.** `.gitignore`: `.env` → `.env*` (com `!.env.example`) — variantes como `.env.production` passavam; `/*.pdf` → `*.pdf` — PDFs fora da raiz passavam (nenhum PDF é versionado hoje, conferido por `git ls-files`). Verificado com `git check-ignore`. |
| CLN-04 | **Corrigido.** A política de privacidade não divulgava o canal de diagnóstico (`app_health_events`, ADR-007): bullet adicionado em EN/PT/ES sob "Device Information" (versão do app, plataforma, descrição higienizada de erros; sem conteúdo de mensagens, sem dados de membros além do id da ala) e a data de vigência atualizada para 2026-10-20. O texto descreve a prática real — nenhuma política nova foi inventada. |
| CLN-05 | **Registrado; prova estacionada (aparelho).** O roteiro de QA ganhou a seção **4.7** com o passo-a-passo do import de PDF do LCR em aparelho (revisão, idempotência, offline). A execução depende do build SMP Dev. |
| CLN-06 | **Corrigido.** `CLAUDE.md`: tabela de versões datada de 2026-10-20 (1.1.0 live desde 05/08; 2.0.0 code-complete, migrations 049–060 não aplicadas), parágrafo da UX-2.0 corrigido (deletada, não "arquivo"), contagem de migrations 46 → 60 (001–060, conferido por `ls`). |
| CLN-07 | **Corrigido.** ADRs 001–007: `proposed` → **Accepted**, com nota da wave (as decisões vigoraram e foram implementadas; o status era resíduo). |
| CLN-08 | **Aposentado com ponteiro.** `RELEASE_READINESS_v2.0.md` (retrato de 2026-07-30, pré-auditoria) ganhou cabeçalho de aposentadoria apontando para PROGRESS/runbook/specs das waves. Um retrato só. |
| CLN-09 | **Arquivados.** `SUPABASE_QUERY_PERF.md` e `SUPABASE_SECURITY.md` são dumps brutos de **2026-02-20** (`git log`): ganharam cabeçalho de arquivo histórico; o de segurança registra que 049–060 reescreveram os pontos listados (050, 049, 051) e que o modelo vigente é ADR-005+008. |
| CLN-10 | **Corrigido.** O roteiro pedia Expo Go, que desde o SDK 53 não recebe push — e a seção 7 é push. Pré-requisitos agora exigem o build **SMP Dev** (TestFlight). |
| CLN-11 | **Corrigido.** Os 3 specs em `draft (GATE 1)`: `v2-members-update-screen`, `v2-people-refinements`, `v2-unified-cards` — todos construídos e contidos na main; status → **built** com nota. |
| CLN-12 | **Corrigido.** `specs/README.md`: a regra "um par por mudança" agora convive com o padrão real das waves de remediação (registro único `<slug>.md`, plano no brief) e a exigência de status real no cabeçalho. |
| CLN-13 | **Corrigido.** `v2-hymn-scrubber.md` dizia branch UX-2.0 e baseline de julho; a feature está construída na main (`HymnScrubberRail.tsx` + `lib/hymnScrubber.ts`). Cabeçalho corrigido para a verdade única. |
| CLN-14 | **Corrigido.** `storeLinks.ts` mandava rodar `scripts/generate-store-qr.mjs`, que **não existe**; o comentário agora descreve o procedimento real (asset externo em `assets/store-qr-<id>.png`). |
| CLN-15 | **Corrigido.** `.claude/settings.json` versionado tinha um hook com caminho absoluto do Mac (`/Users/aloisiojr/.claude/...`), quebrado em qualquer outra máquina: hook removido, arquivo mantido vazio. |
| CLN-16 | **Corrigido.** `scripts/.mutation-report.json` (artefato gerado) desversionado (`git rm --cached`) e ignorado. |
| CLN-17 | **Corrigido.** Não existia `README.md` na raiz: criado (setup, testes/gates, estrutura, documentos vivos, ambientes e o aviso do cutover). |
| CLN-18 | **Corrigido.** `docs/DEBITOS-RESTANTES.md` criado: todos os estacionamentos das waves 1–7 num lugar só, com origem, motivo e dono. |
| CLN-19 | **Corrigido.** As pendências operacionais (CRON_SECRET, staging, deploy key, provas) vivem agora na lista numerada da seção `Now` reescrita — sem duplicar o runbook de cutover. |
| CLN-20 | **Corrigido.** Glossário do `CLAUDE.md` sem "actors" (modelo aposentado na migration 037; contagem de ocorrências = 0). |
| CLN-21 | **Corrigido.** Fóssil de vitest em `PdfImportModal.tsx` → jest. (As menções históricas em jest.config/PROGRESS são verdadeiras como história da troca de runner.) |
| CLN-22 | **Corrigido.** O "open issue" de teste já feito vivia dentro da antiga seção Now (a passagem do stub do vitest) — removido na reescrita; o que restava de aberto de verdade migrou para `docs/DEBITOS-RESTANTES.md`. |
| CLN-23 | **Estacionado (credencial), com o estado verificado.** `feature/pdf-member-import`, `v1.x` e `v2.0`: **todas contidas na main** por `git merge-base --is-ancestor` (refs locais, sem fetch). Recomendação registrada no PROGRESS e nos débitos: deletar no GitHub. |
| CLN-24 | **Registrado.** `google-services.json` segue versionado **de propósito** — configuração de cliente Firebase, pública por desenho (modelo da ADR-008); a decisão está escrita nas notas de deploy do `CLAUDE.md`. Arquivo não movido (quebraria o build Android). |

## Gates no fechamento

tsc 0 erros · jest 368 suítes / 5.930 testes · lint 0 erros / 5 warnings (baseline).

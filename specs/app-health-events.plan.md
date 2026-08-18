# Plan: Canal de diagnóstico do app
(spec: `specs/app-health-events.md` · ADR: `docs/decisions/007-app-health-events.md`)

## Reuse (extend these, don't recreate)

- `src/hooks/useNotifications.ts:90-110` — **o precedente exato**: insert no Supabase carregando
  `app_version: Constants.expoConfig?.version` e `platform: Platform.OS`, com o erro engolido num
  `console.warn` em vez de propagar. É o padrão de fire-and-forget do projeto; copiar, não inventar.
- `supabase/migrations/045_auto_revoke_expired_invitations.sql` — função `SECURITY DEFINER` +
  agendamento condicional a `pg_cron` existir, com o dashboard como alternativa. A poda de 180 dias
  segue este arquivo linha a linha.
- `supabase/migrations/044_rls_write_authz.sql:44-57` — estilo das policies com
  `public.current_ward_id()`.
- `src/lib/supabase.ts` — cliente. `src/contexts/AuthContext` — de onde sai o `wardId`.
- `src/lib/lcrPdfPage.ts` / `lcrPdfGrid.ts` — `readLcrPages` já devolve `usedGrid`; falta o motivo.

## Steps (1 step = 1 commit)

1. **`feat(db): migration 048 — app_health_events`**
   Tabela, RLS (INSERT com `ward_id = current_ward_id()` e **sem** `can_write()`; nenhuma policy de
   SELECT/UPDATE/DELETE), e a poda de 180 dias no padrão do 045. Anotação no cabeçalho: **aditiva,
   não quebra clientes 1.x; aplicada só em staging por escolha de rollout — aplicar em produção é
   item do cutover v2**, e não pelo motivo do `043`.
   — covers: AC1, AC2, AC3, AC4, AC5
   — verificação: **contra o banco de staging**, não em CI (ver Riscos). Aplicar via Management API
   e conferir: a tabela existe; um insert com `ward_id` de outra ala é recusado; um SELECT como
   `authenticated` devolve zero linhas; a função de poda existe e está agendada.

2. **`feat(pdf): readGrid informa por que recusou a grade`**
   `readGrid` deixa de devolver `null` cru e passa a devolver o motivo — sem fonte válida, colunas
   insuficientes, ou leitura divergente da auditoria. `readLcrPages` repassa em `fallbackReason`.
   Sem mudança de comportamento: só informação que hoje é descartada.
   — covers: AC7
   — tests: `lcr-grid-fallback-reason.test.ts` — os três motivos, cada um provocado pela geometria
   que o causa; e `fallbackReason` ausente quando a grade é usada.

3. **`feat(diagnostics): reportar evento de saúde do app`**
   `src/lib/appHealth.ts` — `reportHealthEvent(wardId, eventType, details)`. Fire-and-forget, fora
   da fila offline, com o `details` filtrado para números e valores de conjunto fechado.
   — covers: AC10, AC11, AC12
   — tests: `app-health-events.test.ts` — string no `details` é descartada e número passa; erro do
   Supabase não propaga e não rejeita a promise; a chamada não toca `offlineQueue`.

4. **`feat(pdf): o import registra fallback e divergência de contagem`**
   `PdfImportModal.onExtracted` emite o evento. Nada muda para o usuário.
   — covers: AC6, AC8, AC9
   — tests: `pdf-import-health-events.test.tsx` — com fallback, emite com o motivo; com divergência
   de contagem, emite (com e sem grade); import limpo **não** emite; e uma falha do report não
   impede a tela de revisão de aparecer.

## AC → coverage matrix

| AC | Step | Test / verificação |
|----|------|--------------------|
| AC1–AC5 | 1 | **Banco de staging** (Management API), não CI — ver Riscos |
| AC6 | 4 | `pdf-import-health-events.test.tsx` |
| AC7 | 2 | `lcr-grid-fallback-reason.test.ts` |
| AC8 | 4 | `pdf-import-health-events.test.tsx` |
| AC9 | 4 | `pdf-import-health-events.test.tsx` (import limpo não emite) |
| AC10 | 3 | `app-health-events.test.ts` |
| AC11 | 3, 4 | `app-health-events.test.ts` + a tela aparece mesmo com report falhando |
| AC12 | 3 | `app-health-events.test.ts` |

## Risks / deploys

- **AC1–AC5 não têm teste em CI.** Não há harness de RLS ou de migration no projeto — conferido: o
  único artefato SQL em `src/__tests__` é um README. A verificação é contra o banco de staging. É a
  mesma limitação da grade (AC15–AC17), e vale dizer de novo: o que garante essas ACs é uma execução
  minha contra o banco, registrada no relatório, não a suíte verde.
- **AC3 (observer consegue inserir) só se prova no banco** — e é a AC mais fácil de quebrar sem
  ninguém notar, porque contraria o padrão de todas as outras policies do projeto. Alguém que
  "corrija" a ausência de `can_write()` no futuro mata o canal em silêncio. O comentário na migration
  precisa explicar o porquê, não só o quê.
- **Deploy:** migration `048` aplicada **só em staging**. Produção fica para o cutover v2 e vira item
  do passo 4 daquela lista. Sem isso, o canal nunca registra nada útil.
- **Privacidade (AC10)** é a restrição mais forte do spec. O filtro é no cliente; um emissor futuro
  que passe texto do PDF tem de ser barrado pelo próprio `reportHealthEvent`, não por disciplina de
  quem chama.
- Sem i18n, sem permissão nova no cliente, sem mudança de cache local (a tabela nunca é lida).

## Rollback

Quatro commits independentes. Reverter 2–4 devolve o app ao estado atual sem tocar no banco. A
tabela pode ficar: sem emissor, ela apenas não recebe linhas. Se precisar sumir, um `DROP TABLE` é
seguro — nada mais a referencia, e nenhum cliente a lê.

# Progress

## How to drive dev-flow (entry commands)
- **New change:** describe it — e.g. *"New change on SMP: <description>. Use dev-flow."* → runs `spec-first`.
- **Resume after a context clear:** *"Read PROGRESS.md and continue the change in flight."* → picks up from the stage in **Now**.
- **Force a stage by name:** `spec-first` · `plan-change` · `build-change` · `verify-change` · `mobile-release-advisor`.
- Engine docs: `~/.claude/dev-flow/README.md`. Per-change docs: `specs/<slug>.md` (+ `.plan.md`).

## Now
- **ESTADO (2026-10-20): remediação da auditoria v2.0 COMPLETA em código — waves 1–7
  mergeadas na `main`.** Os 121 achados foram tratados (código, documento ou
  estacionados com motivo registrado). Gates: tsc 0 erros, jest 368 suítes / 5.930
  testes, lint 0 erros / 5 warnings, cobertura acima do piso (75/66/70/76).
  Registro por wave: `specs/fix-security-perms.md`, `specs/fix-silent-writes.md`,
  `specs/fix-visibility-time.md`, `specs/fix-state-integrity.md`,
  `specs/fix-perf-*.md`, `specs/reliability-rest.md`, `specs/cutover-gate.md`,
  `specs/import-tx.md`, `specs/beauty-a11y-wave5.md`, `specs/architecture-wave6.md`,
  `specs/cleanup-wave7.md`. Migrations **049–060 criadas; NENHUMA aplicada** a
  banco algum.
- **Falta — operacional (credencial / aparelho / decisão do dono):**
  1. **Push ao GitHub:** cadastrar a deploy key do LXC 104 no repo; sem isso o
     GitHub segue na `main` de agosto (`178bac4`).
  2. **Staging:** aplicar as migrations 049–060; configurar o `CRON_SECRET` nas
     functions e nos chamadores (pg_cron com o header); provas vivas — CONF-01/02
     com JWT de observer, barreira da 057, rate-limit da 058, ensaio de restore do
     `docs/CUTOVER_RUNBOOK.md`.
  3. **Aparelho:** build SMP Dev (TestFlight) e o roteiro
     `docs/qa/ROTEIRO_TESTES_v2.md` — incluindo a prova do import de PDF em
     aparelho (CLN-05; o passo-a-passo está no roteiro).
  4. **Branches remotas** `feature/pdf-member-import`, `v1.x` e `v2.0`: todas
     **contidas na main** (verificado por merge-base; refs locais, sem fetch) —
     recomendação: deletar no GitHub quando houver acesso (CLN-23).
  5. **No Mac do dono:** deletar as refs locais da UX-2.0
     (`git branch -D UX-2.0`; `git tag -d archive/UX-2.0-2026-06-07`).
  6. **Fases seguintes do lançamento:** features novas (a definir pelo dono),
     mídia/metadados da loja, release + cutover na ordem do `CLAUDE.md`/ADR-001.
- **Débitos de código/documento restantes:** `docs/DEBITOS-RESTANTES.md` (lista única).
- As seções abaixo (branches `v2.0`/`v1.x`, decisões, grade do PDF, canal de
  diagnóstico) são **histórico** de trabalho já contido na main — registro, não estado.

## v2.0 (branch `v2.0`) — BUILD COMPLETE & VERIFIED (deploy gated by v1.x adoption)
Unified people model: actors+speakers → `members` with capability flags + contact-delegation;
people management moved into the unified `PeoplePicker`; settings CSV-only. Built in 6 phases (fresh
subagent per phase, expand→migrate→contract, verify each handoff) per
`~/.claude/dev-flow/build-orchestration.md`. Spec `specs/v2-member-management.md`; migrations **037**
(destructive model change) + **038** (import RPC) — apply at cutover with backup (ADR 001). v1.x
foundation merged in (`4eee51e`). Final adversarial verify-change: **APPROVED**, all AC1–AC14, no
P0/P1. **tsc 0 / lint 0 / 1843 tests / 77 files.** `app.json` → 2.0.0. Deploy/merge to main gated by
v1.x store adoption.
Open P2 (non-blocking): (1) member-edit cascades `speaker_*` to future speeches but NOT the frozen
delegation snapshot (`contact_*`) — product decision: freeze vs. cascade; (2) orphan
responsible-with-no-phone wraps as delegated with empty `{responsavel}`; (3) migrated actor-only
members get `informal_name` NULL; (4) PersonEditor empty country code stores `''` vs the `+55` default.

## v1.x (branch `v1.x`, off main) — BUILD COMPLETE, awaiting deploy (GATE 3)
Prerequisite release before v2.0 (see `docs/decisions/001-v2-release-cutover.md`). Spec:
`specs/v1x-version-gate.md`. All steps built + adversarially verified (APPROVED, no P0/P1);
tsc 0, lint 0, 71 files / 1850 tests. `app.json` → 1.1.0.
- Migration 036 (additive: `app_config` + push `app_version`/`platform`/`last_update_nudge_at`).
- `app-config` edge function (fail-open) + launch version gate + `UpdateRequiredScreen` (iOS store
  link; Android pre-launch shows message). `semver.ts`.
- `app_version`/`platform` on push token upsert; `push-update-nudge` scheduled edge function.
- WhatsApp `buildFullPhone` fix (new snapshots carry country code).
**Deploy status (GATE 3):** ✅ functions deployed (`app-config`, `push-update-nudge`); ✅ migration
036 applied (via `migration repair` for 001–035 then `db push`) — VERIFIED: `app-config` returns
seeded `min_supported_version=1.0.0`; ✅ branch `v1.x` pushed. **Remaining (user):** Supabase cron
for the nudge (SQL provided in chat); EAS build + App Store submit (v1.1.0). 5 P2 findings left as-is.
Two independent levers:
- **Gate** (in-app update screen) exists ONLY in 1.1.0+; `min_supported_version` gates clients that
  HAVE the gate. It can NEVER affect 1.0.0 (no gate code there).
- **Nudge** (push) reaches 1.0.0 too (they receive push). 1.0.0 tokens have `app_version=NULL`,
  which the nudge treats as outdated → they get nudged once the cron runs, regardless of `min`.
Rollout: to move 1.0.0 users to 1.1.0, publish 1.1.0 then SCHEDULE THE CRON (keep `min=1.0.0`; do
NOT schedule before 1.1.0 exists). At v2 cutover, raise `min` to the v2 build → 1.1.0 is
force-gated; 1.0.0 can't be gated (breaks at the v2 schema migration — accepted per ADR). iOS store
URL wired; Android not published yet.

## v2.0 (branch `v2.0`) — plan-change (GATE 2)
Merged the v1.x foundation into `v2.0` (`4eee51e`). Spec + ADR approved (GATE 1). Atomic plan:
`specs/v2-member-management.plan.md` — 5 phases: (1) model + migration 037 (destructive; applied at
cutover), (2) hooks/sync (retire actors), (3) unified People picker + editor, (4) settings CSV-only
+ full-dump import, (5) i18n/version/verify. Awaiting GATE 2. Deploy/merge waits for v1.x adoption
(ADR 001). Base green: tsc 0 / 71 files / 1850 tests.

## v2.0 People Refinements (branch `v2.0`) — BUILD COMPLETE & VERIFIED (2026-07-28)
Spec `specs/v2-people-refinements.md` (+`.plan.md`). Follow-up polish on the unified people model.
Built in 6 atomic commits (`27c01e3`..`aa68757`), fresh subagent per step, kept green:
- **Schema:** `members.calling` (chamado) — additive migration `039_add_member_calling.sql` (+ `calling`
  in `import_members` RPC + CSV full dump). Applied to STAGING via Management API; sample callings set.
- **PeoplePicker:** fixed title "Selecionar Pessoa" + per-context subtitle; per-context 2nd line
  (speaker/prayer = 6mo speech + responsável; preside/conduct/lead_music/play_piano = name only;
  be_recognized = calling + functions); "Ver todos" = subtitle+Switch (capability contexts); no trash
  icon (delete moved to editor); informal in parens; keep-selected under filter. New `context` prop
  wired from AgendaForm + speeches.
- **PersonEditor:** informal label, country picker (reuses `countryCodes.ts`), "Permissões" section
  (icon + Switch rows), `calling` field, read-only "Responsável por" list, destructive "Excluir
  pessoa".
- **Presentation:** recognized people show "Nome — Chamado" (unique name match with calling).
- Adversarial verify-change: **APPROVED**, all ACs (S1/S2, P1–P7, E1–E5, PR1), no P0/P1. Suite
  **79 files / 1879 tests**, tsc 0, lint 0. Not pushed. Deploy to prod gated by v1.x adoption (ADR 001);
  `039` ships to prod at the v2 cutover with 037/038.

## Decisions
- 2026-07-27: Discarded UX-2.0 (463 commits) and returned to the main baseline.
  Atualização (19/10/2026, decisão do dono): branch `UX-2.0` e tag
  `archive/UX-2.0-2026-06-07` **deletadas** na cópia de trabalho — não são mais
  recuperáveis aqui; refs locais podem restar apenas no Mac do dono.
- 2026-07-27: Replaced devteam with dev-flow. Deleted `.devteam/` and
  `docs/{specs,arch,plans,qa,tests,reviews,code}` + `docs/CHANGE_REQUESTS.yaml` (recoverable via git history).

## Resolved
- `RESEND_*` secrets removed from Supabase (unused after Gmail SMTP switch).
- Gmail App Password rotation: **user declined** (deliberate) — current password stays in use.
- Lint + tsc baselines clean. (Push a `origin/main`: pendente desde ago/2026 — ver Now.)

## Open issues
- ~~The archived `UX-2.0` snapshot committed `.claude/settings.local.json` with Supabase
  keys locally (never pushed)~~ — o snapshot foi deletado nesta cópia (19/10/2026); se a
  cópia do Mac ainda existir, rotacionar as chaves segue disponível como higiene.
- `f021-topic-library-overhaul.test.ts` asserts source text (`function normalizeForSearch`) via
  fs/string-matching — against the "behavioral tests only" rule; keeps dead code alive in
  `useTopics.ts`. Worth revisiting (test + dead code) as a future cleanup.

## Grade da tabela no import de PDF (`specs/pdf-import-table-grid.md`)

Spec e plano aprovados 2026-08-17. **Os 7 passos estão concluídos e commitados.**

O import deixou de inferir estatisticamente onde um registro termina e passou a ler as fronteiras
que o gerador do PDF desenha; com as colunas conhecidas, cada campo vem da sua célula.

1. A WebView devolve dados brutos (itens de texto, segmentos, retângulos, CTM). Neutro e verificado
   byte a byte. Removeu a duplicação literal do `ROW_GAP_THRESHOLD_JS`.
2. Fronteiras candidatas de traços e faixas, sem cor/espessura/comprimento fixos: a cobertura é da
   UNIÃO dos traços de uma altura, relativa à largura de texto daquela página.
3. Validação pelo próprio dado (banda com 2+ registros é veto) e escolha da fonte por documento.
4. Fusão dos registros partidos entre páginas (órfão abaixo da grade + primeira banda da seguinte).
5. Leitura por célula — a contaminação de coluna deixa de ser possível, em vez de ser tratada.
6. `readLcrPages` como porta única, com fallback e `usedGrid`.
7. `scripts/check-lcr-pdfs.mjs` roda os dois caminhos sobre os PDFs locais.

**Medido nos 8 PDFs:** grade usada em todos, 8/8 batem a contagem declarada, zero nomes com resíduo
de outra coluna, 39 registros partidos recuperados. As 12 diferenças em relação ao caminho antigo
são todas melhorias (6 ganharam telefone, 2 nomes ficaram completos, 2 perderam resíduo do vizinho).

### O que ainda NÃO foi provado
- ⚠️ **Nada disso foi testado em aparelho.** `PdfTextExtractor.tsx` não roda no jest, e o contrato
  da WebView mudou por completo. A validação nos 8 PDFs usa `scripts/lcr-raw.mjs`, que **replica**
  o bootstrap em Node — se os dois divergirem, a verificação mente. Risco aberto nº 1.
- O payload do `postMessage` cresceu de ~50KB de texto para ~2500–3500 itens mais a geometria.
  Sem AC de desempenho (decisão do usuário), mas se a WebView engasgar é aqui.
- `verify-change` (estágio 4) ainda não rodou.
- Dois caminhos vivos: o fallback mantém `parseLcrText`, `rowGapThreshold`, `isEmailTail` e
  `cleanName` em uso. Correção de domínio pode precisar ser feita duas vezes.

## Canal de diagnóstico (`specs/app-health-events.md`)

Spec, ADR-007 e plano aprovados 2026-08-17. **Os 4 passos estão concluídos e commitados.**

O fallback do import de PDF era silencioso; agora ele deixa rastro numa tabela que só o
desenvolvedor lê.

1. Migration `048_app_health_events.sql` — tabela aditiva, INSERT sem `can_write()` (deliberado, ver
   ADR-007), sem policy de SELECT/UPDATE/DELETE, poda de 180 dias no padrão do 045.
2. `readGrid` passa a dizer POR QUE recusou: `no-valid-source`, `columns` ou `unexplained`.
3. `src/lib/appHealth.ts` — `reportHealthEvent`, fire-and-forget, fora da fila offline, com filtro
   de privacidade que só deixa passar número finito e booleano.
4. `reportPdfImportHealth` decide o que emitir; `PdfImportModal` só chama.

**Verificado contra o banco de STAGING** (não em CI — não existe harness de RLS no projeto):
observer insere na própria ala; insert para outra ala é recusado; como `authenticated` a tabela
mostra 0 linhas e apaga 0; função de poda existe e é `SECURITY DEFINER`.

**Nos 8 PDFs de referência o canal fica calado** — grade usada em todos, contagens batendo.

### Pendências e armadilhas
- ⚠️ **`pg_cron` não está instalado no staging**: a poda existe mas NÃO está agendada. Agendar pelo
  dashboard, como já acontece com `process-notifications` e o job do 045.
- ⚠️ **Aplicar a `048` em produção é item do cutover v2.** Até lá o canal fica INERTE, porque em
  staging não se importa PDF real. Se isso escapar da lista do passo 4, o canal nunca liga.
- ⚠️ **Nunca usar `.select()` na escrita.** Sem policy de SELECT, o Postgres recusa o RETURNING e
  toda escrita falha — em silêncio, porque o erro é engolido por desenho. Há teste prendendo isso.
- Não registramos imports bem-sucedidos (decisão do usuário): sem denominador, distinguir "um PDF
  esquisito" de "o layout mudou" depende de contar `ward_id` distintos.
- `verify-change` desta mudança ainda não rodou.

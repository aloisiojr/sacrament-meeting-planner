# Progress

## How to drive dev-flow (entry commands)
- **New change:** describe it — e.g. *"New change on SMP: <description>. Use dev-flow."* → runs `spec-first`.
- **Resume after a context clear:** *"Read PROGRESS.md and continue the change in flight."* → picks up from the stage in **Now**.
- **Force a stage by name:** `spec-first` · `plan-change` · `build-change` · `verify-change` · `mobile-release-advisor`.
- Engine docs: `~/.claude/dev-flow/README.md`. Per-change docs: `specs/<slug>.md` (+ `.plan.md`).

## Now
- **BRANCH `fix/keyboard-safe-forms` — 16 commits, verificada, NÃO mergeada.**
  Teclado + ajustes no seletor de pessoas/temas. Suíte 290 suites / 5342 tests, tsc 0, lint no
  baseline (2 warnings pré-existentes em PdfTextExtractor).
  - **EXIGE BUILD NATIVO** antes de testar no Android: `softwareKeyboardLayoutMode: 'resize'`.
  - Tela de apoios usa mecanismo DIFERENTE das outras 7: `automaticallyAdjustKeyboardInsets` +
    `scrollToEnd` no foco, porque `KeyboardAvoidingView` não move campo em formulário curto
    alinhado ao topo (a folga não depende do offset). Os dois nunca podem coexistir.
  - **CORREÇÃO DE REGISTRO — a mensagem do commit `6dde262` está errada.** Ela afirma que o
    primeiro toque engolido no seletor de pessoas foi causado pelo autofocus e corrigido ali.
    Falso: `keyboardShouldPersistTaps="handled"` já existia no `main` no PeoplePicker,
    TopicSelectorModal e HymnSelector. Minha varredura deu falso positivo porque parava no
    primeiro `>`, que aparece dentro de `renderItem={({ item }) =>`. O commit ADICIONOU a prop em
    10 outras listas (correto e útil), mas **se o toque engolido foi visto no seletor de pessoas,
    não está corrigido e a causa é desconhecida.**
  - Lacuna conhecida: a aba de agenda é a única das 8 telas sem teste que afirme o wrapper —
    nenhum teste a renderiza.
- **IN FLIGHT — `specs/whatsapp-informal-name-placeholder.md`: placeholder "Nome Informal".**
  Branch `feat/whatsapp-informal-name` (a partir de `main`, após o merge de `export-pdf`).
  Stage: **build COMPLETE, aguardando verify-change**. Plan: `.plan.md` (4 passos, todos ✅).
  - Step 1 ✅ `whatsappUtils`: campo `speakerInformalName` + alias `informalName` (resolvido ANTES
    de `name`). `{nome}` passa a ser o nome COMPLETO; `{nome informal}` cai no completo se vazio.
  - Step 2 ✅ `InviteManagementSection`: passa os dois nomes separados (antes colapsava em um).
  - Step 3 ✅ chip nas 5 abas (orações: `slice(0,2)` → `slice(0,3)`) + chave i18n nos 3 locales +
    teste novo `settings-whatsapp-templates.test.tsx` (a tela não tinha teste).
  - Step 4 ✅ 15 textos padrão reescritos (3 discursos + 2 orações × 3 línguas).
  - Suíte **284 suites / 5202 tests** verde (base `main`: 282/5170). tsc 0, lint 0 erros.
  - Sem migração, sem deploy. **Decisão aceita pelo usuário:** alas que já personalizaram com
    `{nome}` passam a enviar o nome completo — sem migração de texto nem aviso in-app.
  - Step 5 ✅ (após verify-change reprovar) `register-first-user` semeia `{nome informal}`.
    **REQUER REDEPLOY** de `register-first-user` — sem ele, alas novas saúdam pelo nome completo.
  - Achado registrado e FORA do escopo: `whatsapp_template_delegation_wrapper` é usado em
    `InviteManagementSection` mas não tem aba na tela de configurações — ninguém consegue editá-lo.
  - Débito RESOLVIDO pela mudança seguinte (era: textos semeados divergiam dos defaults do código).
- **IN FLIGHT — `specs/whatsapp-unify-default-templates.md`: texto padrão num lugar só.**
  Mesma branch, empilhado. Stage: **build COMPLETE, verify APPROVED, i18n audit APPROVED**;
  re-verificação pendente porque a redação mudou depois do verdict.
  - A edge function `register-first-user` NÃO tem mais strings próprias: importa
    `getDefaultSpeechTemplate`/`getDefaultPrayerTemplate` de `../../../src/lib/whatsappUtils.ts`.
    Funciona porque esse arquivo tem ZERO imports e `supabase/functions` está fora do tsc.
  - Redação nova escrita pelo usuário + auditoria de terminologia da Igreja (zero P1).
  - **RESOLVIDO 2026-08-06:** o deploy rodou e passou — o bundler aceita o import para fora de
    `supabase/`. O plano B (semear NULL) fica só como alternativa se uma CLI futura recusar.
  - **P2 aberto:** o invariante "whatsappUtils não pode ganhar imports" só existe em comentário.
    Se alguém importar algo ali, tsc/lint/jest seguem verdes e só quebra no Deno. Guarda possível
    sem violar a regra de não assertar texto-fonte: inspecionar `require.cache[...].children`.
  - Deploy de `register-first-user` **já feito** (2026-08-06).
- **IN FLIGHT — `specs/whatsapp-stop-seeding-templates.md` (plano B): ala nova nasce com NULL.**
  Branch `feat/stop-seeding-templates`, a partir de `main` em `3558d59`.
  - REVERTE o mecanismo dos dois specs anteriores: a edge function não importa mais o
    `whatsappUtils` nem semeia as 5 colunas. Motivo: o deploy empacotava uma CÓPIA CONGELADA do
    texto, que envelhecia em silêncio com o teste de contrato verde.
  - Removida a guarda `whatsapp-utils-dependency-free.test.ts` (existia só pelo import;
    recuperável em `3558d59`). `whatsapp-informal-name-placeholder.md` AC14 marcado como superado.
  - Verify reprovou com 2 P1 de cobertura, ambos corrigidos e provados por mutação: o fallback da
    ORAÇÃO não tinha teste nenhum (trocá-lo por '' deixava 2606 testes verdes) e o AC4 do editor
    idem. Também coberto o fallback de idioma desconhecido nas posições 2 e 3.
  - **REQUER DEPLOY** de `register-first-user` — a última vez; depois disso mudar redação nunca
    mais exige deploy.
- **IN FLIGHT — `specs/v2-supports-releases.md` (Spec 1 of 3): structured Apoios e Desobrigações.**
  Branch `v2.0`. Stage: **build-change**. Plan: `specs/v2-supports-releases.plan.md` (5 steps).
  - Step 1 ✅ types + `src/lib/designations.ts` (formatDesignationLines/Summary).
  - Step 2 ✅ edit screen `src/app/designations/[date].tsx` (type→person→fields, calling prompt) + i18n.
  - Step 3 ✅ `DesignationListField` display component.
  - Step 4 ✅ wired into AgendaForm (replaces free-text wardBusiness field).
  - Step 5 ✅ removed `sustaining_releasing` (type + Play builder + fixtures); migration
    `041_designations.sql` (add `designations jsonb`, drop old column). Obsolete f067/f068/f071
    free-text tests converted to `designations` (3 vacuous f067 tests removed). 1984 tests green.
  - **Spec 1 COMPLETE + verified (APPROVED).** Migration 041 applied to STAGING (designations jsonb
    added, sustaining_releasing dropped). Prod only at v2 cutover (ADR 001/002).
  - **Spec 2 (`specs/v2-designations-play.md`) build COMPLETE** — Play interstitial:
    - Step 1 ✅ `buildDesignationReadText` + verbatim templates (3 locales) + `orderDesignations`.
    - Step 2 ✅ `DesignationReadModal` (clone of SacramentPrayerModal) + canonical ordering.
    - Step 3 ✅ `useWardName`; flagged/ordered Play bullet list; icon + modal wiring in presentation.tsx.
    - Order: release→sustain→priesthood→new_member. Grouping deferred (too custom). 2002 tests green.
    - **Next: verify-change (Spec 2), then GATE 3.**
  - **Spec 2 verified (APPROVED)** — client-only, no deploy.
  - Post-Spec-2 polish (committed): dim non-selected type/office options; highlight person/calling
    fields when filled; interstitial title → "Assuntos de Ala".
  - **Spec 3 (`specs/v2-designations-templates.md`) build COMPLETE** — configurable templates:
    - Step 1 ✅ migration 042 (4 nullable `wards.designation_template_*`, additive/ADR 003) + Ward
      type + `settings:designations` perm (bishopric+secretary); perm-count tests 26→27.
    - Step 2 ✅ `useWardDesignationTemplates` + override applied in the Play interstitial.
    - Step 3 ✅ Settings "Ward Business Templates" editor (prefill override/default, auto-save,
      restore-default, token hint) + index entry gated by the perm. 2013 tests green.
    - **Spec 3 verified (APPROVED)** after a fix round (P1 prefill race + P2 blur-overwrite fixed;
      AC8 hint test added). Migration 042 APPLIED to STAGING (4 designation_template_* columns).
  - **v2 Supports & Releases feature COMPLETE across all 3 specs** (entry + Play interstitial +
    Settings templates). Nothing merged to main; prod at v2 cutover (ADR 001).
  - **Post-refinements (committed, verified APPROVED):** localized placeholder tokens
    ({nome}/{chamado}/…) with all-locale-alias substitution; Settings "Modelos de Textos"
    expandable group; **unified WhatsApp + Ward Business screens onto a shared
    `TemplateEditorScreen`** (tabs + chips + preview + restore-default + autosave; saveMode
    raw|collapse). Fixed verify P1 (raw restore persists NULL, not default text). 2023 tests green;
    client-only (no migration).
- **Card layout + Topics overhaul (both verified APPROVED, on `v2.0`):**
  - `specs/v2-card-layout.md` — Home upcoming cards hide the status block; expanded agenda header
    restructured (DateBlock+attendance | Play "Iniciar" | collapse chevron) + "Tipo de Domingo"
    section for all Sundays. Client-only.
  - `specs/v2-topics-overhaul.md` (+ADR 004) — removed Settings "Temas" + collection-visibility;
    all libraries always available, ordered by parsed month/year (custom→evergreen→conferences desc);
    rebuilt TopicSelectorModal (PeoplePicker-style: search title+library, add, inline edit title+link,
    delete-on-clear dialog); removed `collection:toggle` (perms 27→26); migration **043** drops
    `ward_collection_config` (APPLIED to staging). Verify caught + fixed dangling table refs in
    settings ward-language mutation + realtime sync. ~1933 tests green.
- Branch: `main` (baseline restored 2026-07-27 from the 2026-03-29 state).
- Adopted the **dev-flow** engine; removed the old devteam metadata. Thin layer installed
  (CLAUDE.md, .claude/settings.json hooks, CI, specs/, this file).
- Password reset bug (root cause = Resend had no verified domain):
  1. `specs/reset-email-gmail-smtp.md` — **DONE & VERIFIED IN PROD.** Switched transport
     Resend → Gmail SMTP (denomailer). Code committed (f09bbe6); secrets set
     (`GMAIL_USER=sacr.meet.plan@gmail.com`, `GMAIL_APP_PASSWORD`); function deployed. Live test:
     external user igor 500 → 200, email delivered. Server-side only, shipped apps unaffected.
  2. `specs/reset-email-error-visibility.md` — client error hardening (APPROVED, actionable
     wording). **Queued** — blocked until the tsc baseline is clean (it edits `src/`).
- **`specs/fix-test-typecheck-baseline.md` — DONE & COMMITTED (`544138a`).** All 51 tsc errors
  fixed (incl. the `src/app/(tabs)/_layout.tsx` `tabBarTestID`→`tabBarButtonTestID` prod bug,
  accepted by user); `tsc --noEmit` = 0, 1832 tests green. Per-edit typecheck gate now GREEN.
- **`specs/reset-email-error-visibility.md` — DONE & COMMITTED (`18dc9cf`).** Client logs the real
  error in the `catch` (was swallowed) + shows an actionable, enumeration-safe message; success
  path unchanged. `auth.resetFailed` reworded in all 3 locales. Built the project's first
  component render-test infra: `react-native` aliased to a local stub
  (`src/__tests__/stubs/react-native.tsx`) in `vitest.config.ts` → screens render via
  react-test-renderer in `node` (no jsdom, no new deps); added a behavioral test for
  ForgotPasswordScreen (failure logs+message, success). Adversarially verified (APPROVED; AC1
  assertion tightened per the P2). Suite now **68 files / 1834 tests green**, tsc 0.

- **`specs/fix-lint-baseline.md` — DONE & COMMITTED (`31b3ed1`).** All 166 ESLint problems fixed
  (3 errors + 163 warnings) → `npm run lint` = 0 problems. exhaustive-deps: 11 real deps added (all
  stable refs) + 8 justified disables; no behavior change. tsc 0; 68 files / 1834 tests green.

Password-reset bug resolved (Gmail SMTP live) + tsc/lint baselines clean, on `origin/main`.

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
- 2026-07-27: Discarded UX-2.0 (463 commits) and returned to the main baseline. Recoverable via
  branch `UX-2.0` and tag `archive/UX-2.0-2026-06-07` (tip `9b652db`).
- 2026-07-27: Replaced devteam with dev-flow. Deleted `.devteam/` and
  `docs/{specs,arch,plans,qa,tests,reviews,code}` + `docs/CHANGE_REQUESTS.yaml` (recoverable via git history).

## Resolved
- `RESEND_*` secrets removed from Supabase (unused after Gmail SMTP switch).
- Gmail App Password rotation: **user declined** (deliberate) — current password stays in use.
- Lint + tsc baselines clean; all work pushed to `origin/main`.

## Open issues
- The archived `UX-2.0` snapshot (`9b652db`) committed `.claude/settings.local.json` with Supabase
  keys locally (never pushed). Rotate if desired — low priority, local-only.
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

# Pacote B — segurança de dados e permissões (CONF-01/02/03/05 + DEC-04/05)

## Problem / intent

A auditoria adversarial da v2.0 encontrou a matriz cliente×servidor divergindo onde dói:
um `observer` pode ler `invitations.token` da própria ala e se registrar com papel maior
(CONF-01), `list_ward_users` enumera qualquer ala sem conferir a do chamador (CONF-02),
`can_write()` é denylist fail-open e `device_push_tokens` aceita `role`/`ward_id` forjados
pelo cliente (CONF-05), e as duas funções de cron rodam com `service_role` sem segredo
nenhum (CONF-03). Por baixo de tudo, a autorização está escrita três vezes — cliente
(`src/lib/permissions.ts`), SQL (`044`) e listas literais por Edge Function — sem nada que
execute a concordância (ARQ-06/DEC-04).

Decisões do dono (não renegociar): `bishopric` e `secretary` continuam papéis **distintos**
com **as mesmas permissões**; o defeito é a triplicação manual. `can_write()` vira allowlist
`('bishopric','secretary')`.

## In scope / Out of scope

- **In:** SELECT de `invitations` e `activity_log` só para escritores da própria ala (CONF-01).
- **In:** `list_ward_users` sem EXECUTE para `public`/`anon` e com guarda de ala interna (CONF-02).
- **In:** `can_write()` allowlist (DEC-05); SELECTs de ala saem de `auth.ward_id()` para
  `public.current_ward_id()`; `device_push_tokens.role/ward_id` derivados no servidor (CONF-05).
- **In:** segredo dedicado de cron (`CRON_SECRET`, header `x-cron-secret`, comparação em tempo
  constante, 401 sem ele) em `process-notifications` e `push-update-nudge` (CONF-03).
- **In:** fonte única de permissões no cliente + teste de concordância **completo**
  (todas as permissões × papéis; cliente × SQL × edge) (DEC-04/ARQ-06).
- **Out:** fila offline e telas de escrita (pacote A); `src/lib/offline*`, `src/app/designations`,
  `src/app/speeches`.
- **Out:** regenerar `src/types/database.ts` (DEC-03 é pacote futuro).
- **Out:** aplicar migration em produção. Migrations 049+ são endurecimento de RLS/funções —
  não pertencem ao conjunto quebra-1.x do cutover (nenhum cliente legítimo, 1.x ou 2.0, usa os
  caminhos fechados; ver Baseline), mas a aplicação segue o rito normal (staging primeiro).

## Baseline (evidence)

- `002_rls_policies.sql:264` — SELECT de `invitations` só exige mesma ala; `044` endureceu só
  escrita ("SELECT policies are untouched"). Mesmo padrão em `activity_log` (`002:249`),
  apesar de `useActivityLog` já gatear por `history:read` no cliente (bishopric+secretary).
- Nenhum caminho de cliente lê a tabela `invitations`: `grep -rn "from('invitations')"` em
  `src/` (fora testes) = 0 ocorrências. Criar convite passa por `create-invitation` e o aceite
  por `register-invited-user` (ambas `service_role`); a tela de usuários usa `list-users`.
  Logo, restringir o SELECT a escritores não quebra fluxo legítimo — e nenhum observer
  precisa dele.
- `015_fix_function_search_path.sql:35` — `list_ward_users` SECURITY DEFINER filtra pelo
  `target_ward_id` **do argumento**, sem conferir a ala do chamador; nenhuma migration faz
  REVOKE dela. Chamadores legítimos: `list-users`, `update-user-role`, `delete-user` — todos
  via `service_role` já tendo verificado papel+ala do chamador.
- `044_rls_write_authz.sql:19` — `can_write()` = `role <> 'observer'`: papel vazio/lixo/futuro
  escreve. SELECTs de ala ainda em `auth.ward_id()` (002), que a própria 044 admite poder
  sumir num upgrade do serviço de auth; `public.current_ward_id()` já existe (044).
- `device_push_tokens` (002:285-310): policies só amarram `user_id = auth.uid()`; `role` (029)
  e `ward_id` vêm do payload do cliente (`useNotifications.ts:92-110`) e é por `role` que
  `process-notifications` filtra destinatários — observer forja `bishopric` e recebe push.
- `supabase/config.toml` — todas as funções com `verify_jwt=false`; `process-notifications`
  (263) e `push-update-nudge` não checam segredo nenhum e usam `service_role`.
- `src/lib/permissions.ts:15-72` — 26 permissões listadas duas vezes (bishopric ≡ secretary);
  edge: `ALLOWED_ROLES=['bishopric','secretary']` repetido em `create-invitation`,
  `delete-user`, `update-user-role`, literal inline em `list-users:56` e
  `register-first-user:50`. Concordam hoje; nada prova.

## Acceptance criteria (EARS)

**CONF-01 — leitura sensível só para escritores**
- AC1: WHEN um `observer` autenticado fizer SELECT em `invitations` ou `activity_log`,
  THE SYSTEM SHALL retornar zero linhas (RLS), inclusive a coluna `token`.
- AC2: WHEN `bishopric`/`secretary` fizer SELECT nessas tabelas, THE SYSTEM SHALL retornar
  apenas linhas da própria ala (`public.current_ward_id()`).

**CONF-02 — `list_ward_users`**
- AC3: THE SYSTEM SHALL negar EXECUTE de `list_ward_users(uuid)` a `public` e `anon`
  (grant só a `authenticated` e `service_role`).
- AC4: WHEN um chamador `authenticated` passar `target_ward_id` diferente da própria ala,
  THE SYSTEM SHALL retornar zero linhas. Chamadores `service_role` (edge, que já verificaram
  o chamador) continuam funcionando — a tela de gestão da própria ala não quebra.

**CONF-05 + DEC-05 — escrita fail-closed e push sem forja**
- AC5: THE SYSTEM SHALL considerar escritor apenas `bishopric` e `secretary`; papel ausente,
  vazio, `observer` ou qualquer outro valor SHALL ser somente-leitura.
- AC6: WHEN o cliente inserir/atualizar `device_push_tokens` com `role`/`ward_id` arbitrários,
  THE SYSTEM SHALL gravar o papel e a ala derivados do JWT do usuário autenticado.
- AC7: As policies de SELECT por ala SHALL usar `public.current_ward_id()` (não `auth.ward_id()`).

**CONF-03 — cron autenticado**
- AC8: WHEN `process-notifications` ou `push-update-nudge` receber requisição sem o header
  `x-cron-secret` correto, THE SYSTEM SHALL responder 401 sem tocar no banco.
- AC9: A comparação do segredo SHALL ser em tempo constante; sem `CRON_SECRET` configurado,
  THE SYSTEM SHALL falhar fechado (401). O nome do segredo SHALL estar documentado sem valor.

**DEC-04 — fonte única**
- AC10: O conjunto canônico de permissões de escritor SHALL ser definido uma única vez em
  `src/lib/permissions.ts`; `bishopric` e `secretary` derivam dele e continuam distintos
  em tipos e em `app_metadata.role`.
- AC11: Um teste de concordância SHALL afirmar igualdade de conjuntos entre cliente, SQL
  (`can_write()` e o CHECK de papéis) e **todas** as listas de papéis das Edge Functions —
  cobrindo todas as 26 permissões × 3 papéis, não uma amostra.

## Notes

- Prova viva em staging (`nfraidzguordqmbpqkcf`): sem credencial neste ambiente — registrada
  como pendência. As migrations são defensivas e corretas sob qualquer resultado da prova.
- `push:receive` já nega registro de token a observer no cliente; AC6 fecha o caminho direto
  via PostgREST, que é o modelo de ameaça da 044/047.

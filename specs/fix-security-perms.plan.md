# Plan: Pacote B — segurança de dados e permissões
(spec: `specs/fix-security-perms.md` · achados: CONF-01/02/03/05, DEC-04/05, ARQ-06)

## Reuse (extend these, don't recreate)

- `supabase/migrations/044_rls_write_authz.sql` — estilo das migrations de endurecimento:
  cabeçalho com o porquê, `DROP POLICY IF EXISTS` + `CREATE POLICY`,
  `public.current_ward_id()` / `public.can_write()`. A 049 segue linha a linha.
- `supabase/migrations/047_activity_log_write_authz.sql` — precedente de fechar a policy que a
  044 esqueceu; a 049 faz o mesmo com os SELECTs.
- `supabase/migrations/035_cleanup_stale_push_tokens.sql` — trigger `BEFORE INSERT OR UPDATE`
  em `device_push_tokens` já existe; a derivação de `role/ward_id` entra no mesmo padrão.
- `src/lib/permissions.ts` — `PERMISSIONS_MAP`, `ALL_PERMISSIONS`, `ALL_ROLES` já são o ponto
  canônico do cliente; a mudança é definir o conjunto de escritor **uma vez** e derivar.
- `src/__tests__/helpers/edgeFunctionHarness.ts` — executa Edge Functions de verdade no jest
  (`Deno.env.get(k)` → `test-${k}`, logo `CRON_SECRET` de teste = `test-CRON_SECRET`).
- `src/__tests__/permissions.test.ts` — matriz exaustiva existente; a concordância nova morre
  de pé ao lado dela, não a substitui.

## Steps (1 step = 1 commit)

1. **`docs(spec): pacote B — segurança de dados e permissões`**
   Este par spec/plan. — covers: —

2. **`fix(db): migration 049 — can_write allowlist + SELECTs sensíveis só para escritores`**
   `public.current_role()` (claim de papel, espelho de `current_ward_id()`);
   `can_write()` = `current_role() IN ('bishopric','secretary')` (DEC-05);
   SELECT de `invitations` e `activity_log` ganham `AND public.can_write()` (CONF-01);
   SELECTs por ala restantes (`wards`, `members`, `ward_topics`, `sunday_exceptions`,
   `speeches`, `sunday_agendas`) trocam `auth.ward_id()` → `public.current_ward_id()` (CONF-05).
   Tabelas dropadas (037/043) não são tocadas. Idempotente (`DROP POLICY IF EXISTS`).
   — covers: AC1, AC2, AC5, AC7
   — verificação: revisão SQL + teste de concordância (passo 6); prova viva = pendência staging.

3. **`fix(db): migration 050 — list_ward_users só da própria ala`**
   Recria a função (mesma assinatura/retorno de 015) com guarda:
   `service_role` passa (edge já verificou o chamador); `authenticated` só com
   `target_ward_id = public.current_ward_id()`, senão zero linhas.
   `REVOKE EXECUTE … FROM public, anon`; `GRANT EXECUTE … TO authenticated, service_role`.
   — covers: AC3, AC4

4. **`fix(db): migration 051 — device_push_tokens com papel/ala derivados no servidor`**
   Trigger `BEFORE INSERT OR UPDATE`: se `auth.uid()` não é nulo (cliente autenticado),
   força `NEW.user_id/ward_id/role` do JWT; `service_role` (uid nulo) passa intacto.
   Policies ganham `ward_id = public.current_ward_id()` como defesa em profundidade.
   Backfill das linhas existentes a partir de `auth.users.raw_app_meta_data`.
   — covers: AC6

5. **`refactor(perms): fonte única de permissões de escritor (DEC-04)`**
   `permissions.ts`: `WRITER_PERMISSIONS` definido uma vez; bishopric/secretary derivam;
   `WRITER_ROLES` exportado; `ALL_PERMISSIONS`/`ALL_ROLES` derivados. Edge: listas ganham nome
   uniforme (`ALLOWED_ROLES`/`VALID_ROLES`) onde hoje são literais inline (`list-users`,
   `register-first-user`) — sem mudar comportamento.
   — covers: AC10

6. **`test(perms): concordância completa cliente × SQL × edge`**
   `src/__tests__/security-perms-concordance.test.ts`: (a) bishopric ≡ secretary ≡
   `ALL_PERMISSIONS` via `getPermissions`; papel-lixo não tem permissão nenhuma (26×);
   (b) lê a migration mais recente que define `can_write()` e afirma que a lista `IN (…)` é
   igual a `WRITER_ROLES`; CHECK de papéis de `invitations` (001) ≡ `ALL_ROLES`;
   (c) varre **todas** as Edge Functions: todo array literal de papéis é ≡ `WRITER_ROLES`
   ou ≡ `ALL_ROLES` — nenhuma terceira lista pode nascer sem o teste gritar.
   — covers: AC11 (e trava AC5/AC10)

7. **`fix(edge): segredo de cron em process-notifications e push-update-nudge (CONF-03)`**
   Helper local por função (Deno não importa de `src/`; padrão do `isBelowMinimum` copiado):
   header `x-cron-secret` × env `CRON_SECRET`, SHA-256 dos dois lados + XOR (tempo constante),
   401 sem tocar no banco, fail-closed sem env. `OPTIONS` do nudge continua livre (CORS).
   Documenta o segredo em `supabase/config.toml` e `supabase/functions/README.md` (sem valor).
   Testes das duas funções passam a enviar o header e ganham casos 401 (sem header, errado).
   — covers: AC8, AC9

## Risks

- **Cron quebra até configurar o segredo** — por desenho (fail-closed). Deploy das funções
  exige: `supabase secrets set CRON_SECRET=…` + atualizar os jobs agendados para enviar o
  header, **antes** do deploy. Registrado como pendência operacional.
- **Prova em staging não executada** (sem credencial neste ambiente): `\df+ list_ward_users`,
  JWT de observer lendo `invitations.token` e chamando `list_ward_users` de outra ala,
  antes/depois das migrations. As migrations valem sob qualquer resultado.
- **`can_write()` allowlist** tira escrita de qualquer conta com papel fora do padrão —
  auditar papéis reais antes de aplicar fora de staging (DEC-05).
- Trigger da 051 não pode quebrar o toggle de opt-out (`useNotifications` UPDATE só de
  `notifications_enabled`): a derivação reescreve `role/ward_id` com os valores do próprio
  JWT — idempotente para o dono legítimo.

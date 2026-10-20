# Plan: Wave 4C — transações multi-tabela (spec: specs/import-tx.md)

## Steps (1 step = 1 commit)
1. **Spec + plano:** `specs/import-tx.md` + este arquivo.
2. **Import transacional:** migration `060_member_import_tx.sql` (RPC
   `apply_member_import` idempotente por chave natural + trigger de cascata +
   RPC `delete_ward_if_no_auth_users`) + `useApplyMemberImport` em UMA chamada
   `rpc` + reescrever `useApplyMemberImport.test.ts` (payload da RPC, erro
   propaga, 1 chamada, sem escritas diretas). — AC1, AC2
3. **Cascata:** `useMembers.useUpdateMember` sem cascata best-effort no cliente
   (trigger da 060 é a fonte única; invalida members+speeches) + reescrever
   `useMembers-mutations.test.ts` (sem update em speeches no cliente; erro do
   UPDATE propaga). — AC3
4. **register-first-user reparável:** reuso de ward órfã / resume por e-mail +
   testes novos em `edge-register-first-user.test.ts`. — AC4
5. **delete-user ordenado:** auth primeiro + RPC atômica depois (sem
   listUsers, sem delete direto de `wards`) + atualizar
   `edge-delete-user.test.ts` (mock ganha `rpc`; ordem e "membro restante"). — AC5
6. **Fechamento:** PROGRESS.md + gates uma rodada (tsc, lint, jest
   `--ci --maxWorkers=2`). — AC6

## AC → coverage
| AC | Step | Test |
|----|------|------|
| AC1 | 2 | useApplyMemberImport: payload único p/ RPC; repetir = mesma chamada (dedupe é da RPC, lida na 060) |
| AC2 | 2 | useApplyMemberImport: rpc com erro ⇒ mutateAsync rejeita, `from('members')` nunca chamado |
| AC3 | 3 | useMembers-mutations: update rejeitado ⇒ mutation rejeita; nenhum `from('speeches')` |
| AC4 | 4 | edge-register-first-user: órfã reutilizada (sem 2º insert de ward); mesmo e-mail resume c/ session |
| AC5 | 5 | edge-delete-user: rpc `false` (membro restante) ⇒ sem delete de ward; ordem auth→rpc gravada |
| AC6 | 6 | rodada única de gates no fechamento |

## Reuse
- Autorização SQL: `public.current_ward_id()`/`can_write()` (044/049), mesmo
  guard da `import_members` reescrita na 044.
- Split de telefone no cliente: `splitPhoneNumber` (lib/countryCodes), como hoje.
- Regra de snapshot: `resolveContactSnapshot` (lib/contact) espelhada em SQL.
- Testes edge: mock próprio de delete-user / harness de register-first-user.

## Risks
- Migration 060 NÃO aplicada: trigger/RPC só provados por leitura + testes de
  cliente/edge com mock; prova SQL em staging é pendência estacionada.
- `auth.users` dentro da RPC de ward: SECURITY DEFINER (dono postgres) lê
  `app_metadata`; grant de EXECUTE só p/ `service_role`.
- CURRENT_DATE do trigger usa a data do banco (UTC), não a local do aparelho —
  divergência de borda de 1 dia na virada, aceita e registrada.

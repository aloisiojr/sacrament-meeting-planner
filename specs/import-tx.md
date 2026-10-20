# Wave 4C — Transações multi-tabela do cliente (CONF-07)

## Problem / intent
Quatro fluxos faziam escritas multi-tabela em N chamadas do cliente sem transação
(AUDIT-INPUT CONF-07): (1) o import incremental de membros (inserts + updates de
telefone 1-a-1 + deletes) deixava parcial visível em falha e **duplicava** ao
repetir, sem chave natural; (2) a cascata de snapshot de `useUpdateMember`
ignorava `{error}`, engolia no `catch` "best-effort" e, offline, era pulada para
sempre (o replay da fila só reaplica o UPDATE em `members`); (3)
`register-first-user` podia deixar ward órfã bloqueando nova tentativa;
(4) `delete-user` apagava a ward (CASCADE) **antes** do auth user, com a
contagem "sou o último?" sujeita a corrida entre deletes concorrentes.

## In scope / Out of scope
- **In:** migration **060** (NÃO aplicada em banco nenhum) com a RPC
  transacional/idempotente do import incremental, o trigger de cascata de
  snapshot e a RPC atômica de remoção de ward vazia; cliente do import em UMA
  chamada de RPC; `useMembers` sem cascata best-effort no cliente;
  `register-first-user` reparável; `delete-user` ordenado (auth primeiro).
- **Out:** aplicar migrations; mudar o import destrutivo de CSV
  (`import_members`, migration 038 — DELETE-ALL continua como está); qualquer
  compatibilidade com clientes 1.x.

## Design

### 1. Import incremental — `apply_member_import` (060)
Nova RPC `apply_member_import(p_ward_id, p_inserts jsonb, p_phone_updates jsonb,
p_remove_ids uuid[]) → jsonb {inserted, updated, removed, skipped}`, SECURITY
DEFINER com a mesma autorização da 044 (`current_ward_id()` + `can_write()`).
Tudo numa transação implícita da função:
- `pg_advisory_xact_lock` por ward serializa imports concorrentes da mesma ala.
- Remoções primeiro (só ids da própria ward), depois updates de telefone em
  **lote** (um UPDATE set-based a partir do jsonb), depois inserts.
- **Idempotência por chave natural:** um insert é pulado (`skipped`) se já
  existir membro na ward com `lower(btrim(full_name))` igual — inclusive
  duplicado dentro do próprio payload (`DISTINCT ON`). Reexecutar o mesmo
  import não duplica ninguém.
O cliente (`useApplyMemberImport`, já `blocked-offline`) prepara o payload
(split de telefone como hoje) e faz **UMA** chamada `supabase.rpc(...)`; erro
propaga — nada de parcial silencioso.

### 2. Cascata de snapshot — trigger (060)
`sync_speech_snapshots_from_member()` + trigger AFTER UPDATE OF
`full_name, informal_name, country_code, phone, contact_via_responsible,
responsible_id` em `members`, com WHEN de mudança real. Recalcula, na mesma
transação do UPDATE, os snapshots (`speaker_*` + delegação, mesma regra de
`resolveContactSnapshot`: telefone do responsável só delega se utilizável;
senão telefone próprio) das speeches não-passadas do membro — e também das
speeches de dependentes quando quem muda é o responsável.
Consequências: erro da cascata **aborta o UPDATE** e propaga (sem best-effort);
o replay offline da fila reaplica o UPDATE em `members` e o trigger executa a
cascata no servidor — nunca um UPDATE solto que a pule. O cliente remove a
cascata própria e só invalida `members`/`speeches`.

### 3. register-first-user reparável
Sem tabela nova: a chave natural é o par (stake, ward) + o dono.
- Ward existente **sem nenhum auth user** vinculado (`app_metadata.ward_id`):
  é um parcial órfão de uma tentativa anterior → a tentativa **reusa** essa
  ward (não insere segunda), semeia tópicos só se ainda não houver, e cria o
  usuário nela. Retry completa o parcial em vez de travar no 409.
- Ward existente cujo usuário vinculado tem **o mesmo e-mail**: retry do mesmo
  cadastro → tenta sign-in com a senha fornecida e devolve ward+session
  (201, `resumed: true`), sem criar ward nem usuário novos. Senha que não
  confere → 409 `email_exists`.
- Ward existente com usuário de **outro e-mail** → 409 `stake_ward_exists`
  (bloqueio genuíno, como hoje).
- Falha ao criar o usuário continua apagando a ward recém-criada; se essa
  limpeza falhar, o retry acima repara reutilizando a órfã.

### 4. delete-user ordenado e sem race
Ordem nova no auto-delete: tokens de push → **auth user primeiro** → RPC
`delete_ward_if_no_auth_users(p_ward_id)` (060, SECURITY DEFINER, só
`service_role`). A RPC trava a linha da ward (`FOR UPDATE`), reconta os auth
users da ward em `auth.users` **na mesma transação** e só apaga a ward se a
contagem for zero — deletes concorrentes se serializam na trava e a ward nunca
some com membro restante; a última saída apaga. Sem `listUsers` paginado no
caminho quente. Estado intermediário reparável e documentado: se a RPC falhar
depois do auth user removido, a resposta é 200 com `wardCleanup: 'pending'`
(a ward órfã sem usuários é reutilizável pelo reparo do item 3 ou por nova
chamada da RPC) — nunca ward apagada com o auth user ainda vivo, que era o
estado destrutivo anterior.

## Acceptance criteria
- AC1: import repetido não duplica — cliente chama a RPC 1× por tentativa e a
  RPC deduplica por chave natural (teste comportamental do cliente + leitura
  da 060; prova SQL com banco fica estacionada, migration não aplicada).
- AC2: falha simulada no import ⇒ erro propaga, RPC chamada exatamente 1× e
  nenhuma escrita direta em `members` acontece no cliente.
- AC3: cascata com erro propaga — o UPDATE em `members` que o banco rejeita
  (trigger) rejeita a mutation; o hook não emite update próprio em `speeches`
  nem engole erro.
- AC4: `register-first-user` repetido (órfã ou mesmo e-mail) não cria 2ª ward
  nem trava; par genuinamente ocupado segue 409.
- AC5: `delete-user` concorrente não apaga ward com membro restante — a
  decisão é da RPC atômica chamada **depois** do auth delete; `wards` nunca é
  apagada direto pelo edge.
- AC6: gates finais verdes 1× (tsc, lint, jest completo `--maxWorkers=2`).

# ADR-007 — Canal de diagnóstico do app (`app_health_events`)

Status: **Proposed** (mobile-release-advisor recommendation) · Date: 2026-08-17 · Relates to:
ADR-001 (cutover v2), ADR-005 (RLS write authz), `specs/pdf-import-table-grid.md`

## Context

O import de PDF passou a ler a tabela do LCR pela grade que o gerador desenha, com o algoritmo
anterior como fallback (`specs/pdf-import-table-grid.md`). O fallback é robusto por desenho — um PDF
com layout desconhecido não quebra o import, ele volta ao comportamento antigo — mas é **invisível**:
não há erro, não há aviso, e o único sinal é a divergência de contagem na tela de revisão, que
depende de alguém reparar e avisar o desenvolvedor.

O efeito prático é o pior tipo de silêncio: se a Igreja mudar o layout do relatório do LCR, o app
degrada sozinho e ninguém fica sabendo até um secretário estranhar um nome.

O projeto **não tem** Sentry, Bugsnag ou qualquer reporter — verificado no `package.json`. A única
trilha existente é `activity_log`, que é auditoria de ala: a tela de histórico lista todas as linhas
sem filtrar por tipo de ação, então diagnóstico técnico ali vira ruído para o bispado.

O usuário pediu um canal **genérico** — "todos os logs relevantes que têm que ser feitos para me
avisar que o app precisa de uma atenção minha" — com o import de PDF como primeiro emissor.

Fatos que restringem a decisão:
- O backend é **compartilhado com o app 1.x que está na loja** (1.0.0 sem gate, 1.1.0 em review).
- O app é offline-first (React Query + AsyncStorage), com fila de operações offline.
- Os PDFs de origem carregam PII de membros; ver [[lcr-pdf-pii]] e o histórico reescrito em
  2026-08-17. Qualquer coisa que saia do aparelho tem de ser auditável quanto a isso.

## Options considered

1. **Reusar `activity_log`.** Zero migration, escrita já autorizada. Rejeitado: polui uma trilha de
   auditoria de ala, visível ao usuário, com dado que só interessa ao desenvolvedor.
2. **Edge function + logs do Supabase.** Sem schema. Rejeitado: retenção dos logs de function é
   curta e import é evento raro — o registro expira antes de ser visto, que é exatamente o caso de
   uso.
3. **Tabela dedicada e genérica** (`app_health_events`). Escolhida.

## Decision

Criar `app_health_events`: uma tabela aditiva, append-only, escrita pelo cliente e **não lida** por
ele. Colunas de identificação (`ward_id`, `app_version`, `platform`, `event_type`) mais um `details`
`jsonb` para o payload específico do emissor.

**Classe de compatibilidade: aditiva / retrocompatível.** Nada é renomeado, removido ou tem tipo
alterado. Clientes 1.0.0 e 1.1.0 nunca referenciam a tabela e não são afetados de forma alguma.

**Consequência de ordem de release — e este é o ponto que precisa ficar escrito:** ao contrário de
`043_drop_collection_config.sql`, esta migration **pode ser aplicada antes do cutover v2**. A regra
do `CLAUDE.md` de não aplicar migrations cedo existe para mudanças que quebram clientes em campo;
uma tabela nova não quebra ninguém. Deve ser anotada explicitamente como "segura antes do cutover"
para não ser confundida com o lote do passo 4.

Não há fase *contract*: nada está sendo substituído.

### RLS

- `INSERT`: `ward_id = public.current_ward_id()`, **sem** `public.can_write()`.
  Deliberado, e contraria o padrão de ADR-005. A justificativa: um canal de diagnóstico precisa
  funcionar para *qualquer* papel, inclusive `observer` — um emissor futuro pode disparar numa tela
  que observadores usam, e exigir `can_write()` faria justamente os relatos mais raros sumirem. O
  risco aceito é um usuário autenticado poder inserir lixo na sua própria ala; para uma tabela de
  diagnóstico, isso é ruído, não dano.
- **Nenhuma policy de `SELECT`, `UPDATE` ou `DELETE`.** Com RLS ativo e sem policy, o PostgREST não
  devolve nada a cliente nenhum. A leitura é exclusiva do `service_role`, via Management API — que é
  como o usuário já consulta o banco.

### Regras de cliente (entram como AC no spec)

1. **Fire-and-forget.** A escrita nunca pode bloquear nem falhar o import. Erro de rede, RLS ou
   timeout são engolidos. Diagnóstico que quebra a funcionalidade que ele observa é pior que
   nenhum diagnóstico.
2. **Fora da fila offline.** Não entra em `offlineQueue`. Um diagnóstico repetido três dias depois,
   fora de contexto, é ruído — e o import já é online-only.
3. **Sem cache local.** A tabela nunca é lida pelo cliente, então não há chave de versão de cache a
   incrementar nem dado local a migrar.
4. **`details` carrega apenas números e enums.** Nunca texto extraído do PDF. Esta é a restrição
   mais forte do documento: o mesmo relatório que motiva o diagnóstico é o que carrega nome,
   telefone e data de nascimento de membros reais.

## Consequences

- Ganha-se um sinal que hoje não existe, sem tocar em nada que o app 1.x usa.
- Perde-se o denominador: o usuário decidiu registrar **só** os eventos que pedem atenção, não os
  imports bem-sucedidos. Distinguir "um PDF esquisito de uma ala" de "o formato mudou" passa a
  depender de contar `ward_id` distintos entre os eventos, o que funciona, mas exige mais de uma
  ala afetada antes de a conclusão ficar sólida. Reversível: basta passar a registrar sucesso.
- A tabela cresce sem limite. Com import raro isso é irrelevante hoje; com emissores futuros mais
  falantes, deixa de ser. Ver a questão em aberto sobre retenção.
- Uma nova migration entra na fila. O conjunto aplicado **não é rastreado no repositório** — conferir
  contra o banco antes de assumir (staging `nfraidzguordqmbpqkcf`).

## Decisões do usuário (2026-08-17) — as duas questões em aberto estão fechadas

**Retenção: podar em 180 dias, desde já.** Uma função `SECURITY DEFINER` com varredura agendada,
seguindo o padrão já estabelecido em `045_auto_revoke_expired_invitations.sql`: agenda via `pg_cron`
quando a extensão existe, e a função fica disponível para o dashboard agendar quando não existe.
Evita uma segunda migration.

**Aplicar apenas em STAGING por enquanto.** O usuário optou por manter o congelamento de produção sem
exceção, mesmo sendo a migration aditiva.

A consequência precisa ficar dita, porque ela é o oposto do objetivo do canal: **em staging não se
importa PDF real**. O canal fica inerte até o cutover, e uma mudança de layout do LCR nesse intervalo
passa despercebida exatamente como hoje. O ganho até lá é ter o mecanismo pronto e testado; o sinal
em si só começa a existir quando a migration chegar em produção.

Isso cria um item de release que não pode se perder: **aplicar `048` em produção faz parte do
cutover v2**, e o canal deve ser verificado logo depois — é justamente no cutover, quando muita coisa
muda de uma vez, que um diagnóstico silencioso vale mais.

## Open questions

Nenhuma.

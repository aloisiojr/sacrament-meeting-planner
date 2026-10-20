# ADR-008 — Modelo de exposição das chaves públicas (anon key no binário)

Status: **Accepted** · Date: 2026-10-20 · Relates to: ADR-005 (RLS write authz),
auditoria v2.0 (ARQ-17, DEC-03)

## Context

A auditoria da v2.0 registrou como achado (ARQ-17) a ausência de uma decisão escrita
sobre as chaves do Supabase embutidas no aplicativo. O binário do app carrega a
**anon key** (hoje via variáveis do EAS), e qualquer pessoa com o app pode extraí-la
— isso parece vazamento de segredo, mas é o desenho público do Supabase: a anon key
identifica o projeto, não concede acesso. Quem concede ou nega acesso é o Postgres,
via Row Level Security. A decisão abaixo formaliza esse modelo para ele não ser
rediscutido como "falha" a cada revisão.

## Decision

1. **Anon/publishable keys são públicas por desenho.** Podem residir no binário, no
   `app.json`/EAS env e em repositórios, sem tratamento de segredo. Nenhuma proteção
   do sistema pode depender de elas serem desconhecidas.
2. **A proteção real é, nesta ordem:**
   - RLS habilitada em **todas** as tabelas do schema `public`, com policies por ala
     e por papel;
   - autorização de escrita centralizada (`can_write()` por allowlist — ADR-005,
     migration 049), nunca checks de papel espalhados;
   - a barreira de cutover (`app_config.writes_blocked_below`, migration 057), que
     rejeita escrita de clientes abaixo da versão mínima;
   - rate-limit nas Edge Functions públicas (migration 058) e segredo de cron
     fail-closed nas functions de notificação (wave 1).
3. **`service_role` nunca entra no cliente.** Nada de `service_role` em EAS env,
   `app.json`, `google-services.json`, `GoogleService-Info.plist` ou no repositório
   do app. Ela vive só nos secrets das Edge Functions e em scripts administrativos
   locais. Um vazamento dela é incidente de segurança; um "vazamento" da anon key,
   não.
4. **Rotação:** a anon key rota pelo dashboard do Supabase + republicação das
   variáveis no EAS, e exige **build novo** para valer nos aparelhos — por isso
   rotação é evento planejado, não resposta a incidente. A `service_role`, se
   comprometida, rota imediatamente (não depende de build).
5. **Sourcemaps/Hermes:** o bundle Hermes não publica sourcemaps e hoje não há
   consumidor (sem Sentry/Bugsnag — ver ADR-007). Decisão: manter o default até
   existir um reporter de crashes; quando existir, os sourcemaps sobem para o
   serviço do reporter (privado), nunca dentro do bundle distribuído.

## Consequences

- Revisões futuras não devem reabrir "a anon key está no binário" como achado; o
  achado válido seria: tabela sem RLS, policy permissiva demais, ou `service_role`
  fora do servidor.
- A auditoria de segurança do projeto se concentra onde o modelo manda: diff de
  policies a cada migration nova (a concordância migrations×tipos da ARQ-07 cobre
  os enums; policies seguem revisão manual no PR da migration).

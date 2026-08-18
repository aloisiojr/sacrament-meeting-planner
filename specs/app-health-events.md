# Canal de diagnóstico: avisar que o app precisa de atenção

## Problem / intent

O import de PDF agora cai num fallback quando a grade desenhada não explica o documento. Isso é bom
para robustez — um layout desconhecido não quebra o import — e péssimo para diagnóstico: não há erro,
não há aviso, e o desenvolvedor só descobre se alguém estranhar um nome e contar.

Queremos um canal onde o app registra "isto precisa da sua atenção", consultado pelo desenvolvedor
direto no banco. O import de PDF é o primeiro emissor; o canal nasce genérico para receber outros.

## In scope / Out of scope

- **In:** tabela `app_health_events`, aditiva e append-only, escrita pelo cliente e não lida por ele.
- **In:** o import de PDF passa a registrar os eventos que pedem atenção.
- **In:** poda automática em 180 dias.
- **Out:** qualquer aviso na interface. O usuário decidiu que consulta o banco (2026-08-17).
- **Out:** push, e-mail ou alerta imediato.
- **Out:** registrar imports bem-sucedidos — só o que pede atenção (decisão do usuário; ver Notes).
- **Out:** aplicar em produção agora. Só staging (ADR-007).

## Baseline (evidence)

- Não existe Sentry, Bugsnag ou reporter equivalente — conferido no `package.json`.
- `activity_log` existe e aceita escrita de quem tem `can_write()`, mas `useActivityLog`
  (`src/hooks/useActivityLog.ts:36-44`) lista **todas** as linhas da ala sem filtrar tipo de ação:
  diagnóstico ali aparece na tela de histórico do bispado.
- O fallback do import é silencioso hoje. `readLcrPages` (`src/lib/lcrPdfPage.ts`) já calcula
  `usedGrid`, e **nada** consome esse campo.
- A tela de revisão já avisa divergência de contagem (`PdfImportReview.tsx:156`), mas depende de o
  PDF declarar a linha `Count`, e de alguém reparar e avisar.
- Padrão de varredura agendada do projeto: `045_auto_revoke_expired_invitations.sql` — função
  `SECURITY DEFINER`, `pg_cron` quando disponível, dashboard quando não.
- Helpers de RLS disponíveis: `public.current_ward_id()`, `public.can_write()`.

## Acceptance criteria (EARS)

**Tabela e acesso**

- AC1: The system SHALL manter `app_health_events` com, no mínimo: identificador, instante de
  criação, `ward_id`, versão do app, plataforma, tipo de evento e um `details` estruturado.
- AC2: WHEN um cliente autenticado insere um evento, the system SHALL aceitar apenas se o `ward_id`
  for o da própria ala do usuário.
- AC3: WHILE o usuário é um cliente autenticado de qualquer papel, incluindo `observer`, the system
  SHALL permitir a inserção — o canal não pode depender de permissão de escrita.
- AC4: WHEN um cliente tenta ler, atualizar ou apagar linhas da tabela, the system SHALL não
  devolver nem alterar nada, em qualquer papel.
- AC5: WHEN um evento completa 180 dias, the system SHALL removê-lo por varredura agendada.

**O que o import registra**

- AC6: IF a grade é recusada e o import cai no algoritmo anterior, THEN the system SHALL registrar um
  evento identificando que houve fallback.
- AC7: WHEN registra um fallback, the system SHALL incluir por que a grade foi recusada de forma
  distinguível — sem fonte válida, colunas insuficientes, ou leitura por célula divergente da
  auditoria.
- AC8: IF o número de registros lidos diverge do declarado pelo PDF, THEN the system SHALL registrar
  um evento, tenha a grade sido usada ou não.
- AC9: WHEN o import termina sem fallback e sem divergência, the system SHALL NOT registrar evento.

**Privacidade — a restrição mais forte**

- AC10: WHEN monta o `details` de qualquer evento, the system SHALL incluir somente números e
  valores de um conjunto fechado, e SHALL NOT incluir texto extraído do PDF.

**Não pode atrapalhar o que observa**

- AC11: IF a escrita do evento falha por qualquer motivo — rede, permissão, timeout — THEN the system
  SHALL concluir o import normalmente, sem erro visível ao usuário.
- AC12: The system SHALL enviar o evento fora da fila offline, de modo que ele não seja reenviado
  posteriormente fora de contexto.

## Open questions

Nenhuma.

## Notes

**Só erros, sem denominador.** O usuário optou por registrar apenas o que pede atenção, não os
imports bem-sucedidos (2026-08-17). A consequência: distinguir "um PDF esquisito de uma ala" de "o
layout do LCR mudou" passa a depender de contar `ward_id` distintos entre os eventos, o que funciona
mas exige mais de uma ala afetada antes de a conclusão ficar sólida. Reversível a qualquer momento.

**Staging apenas, e o canal fica inerte até o cutover.** Decisão registrada em ADR-007. Em staging
não se importa PDF real, então o sinal só passa a existir quando a migration chegar em produção.
**Aplicar `048` em produção é item do cutover v2** e precisa entrar na lista do passo 4 — é
justamente no cutover, quando muita coisa muda de uma vez, que um diagnóstico silencioso vale mais.

**A migration é aditiva e não quebra clientes 1.x.** Diferente de `043_drop_collection_config.sql`,
ela não pertence ao lote do cutover por risco — pertence por escolha de rollout. A anotação no
arquivo deve deixar isso claro para quem for aplicar depois.

**INSERT sem `can_write()` contraria ADR-005 de propósito.** Um canal de diagnóstico que exige
permissão de escrita perde exatamente os relatos de telas que observadores usam. O risco aceito é
lixo na própria ala, que para uma tabela de diagnóstico é ruído e não dano. Ver ADR-007.

**Sem i18n.** Nada disto é exibido ao usuário.

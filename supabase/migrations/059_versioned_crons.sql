-- Migration 059: crons versionados e guardados (CONF-06, spec specs/cutover-gate.md).
--
-- Problema (CONF-06): o agendamento vivia fora do repo — `create_weekly_reminders`
-- comentado na 004, poda da 048 dependente de dashboard, `process-notifications`
-- agendado à mão. Um rebuild de ambiente nascia sem lembretes/push, em silêncio.
--
-- Esta migration agenda o que dá para agendar A PARTIR DO BANCO, e onde falta uma
-- peça ela NÃO FALHA: registra RAISE NOTICE nomeando exatamente o que falta, para o
-- operador completar (dashboard ou settings). Rebuild nasce com os crons OU com o
-- aviso explícito — nunca em silêncio. Idempotente (unschedule + schedule), no
-- padrão guardado de 045/048.
--
-- Fora daqui, de propósito: `push-update-nudge` (Edge Function) segue como job de
-- dashboard — é item do checklist de pré-condições do CUTOVER_RUNBOOK, junto do
-- header `x-cron-secret` que ele e o `process-notifications` exigem (CONF-03).

DO $$
DECLARE
  has_pg_cron boolean := EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron');
  has_pg_net boolean := EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net');
  edge_base_url text := current_setting('app.settings.edge_base_url', true);
  cron_secret text := current_setting('app.settings.cron_secret', true);
BEGIN
  IF NOT has_pg_cron THEN
    RAISE NOTICE 'CONF-06/059: pg_cron NAO instalado — nada foi agendado. Agende pelo dashboard do Supabase: create_weekly_reminders (0 12 * * 0), prune_app_health_events (30 4 * * *), process-notifications (*/5 * * * *, Edge Function com header x-cron-secret).';
    RETURN;
  END IF;

  -- Lembretes semanais (função da 004; o horário é o do comentário original dela).
  PERFORM cron.unschedule('weekly-reminders')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'weekly-reminders');
  PERFORM cron.schedule(
    'weekly-reminders',
    '0 12 * * 0',
    $cron$SELECT public.create_weekly_reminders();$cron$
  );

  -- Poda de app_health_events (função da 048; reafirmada aqui para rebuild nascer com ela).
  PERFORM cron.unschedule('prune-app-health-events')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'prune-app-health-events');
  PERFORM cron.schedule(
    'prune-app-health-events',
    '30 4 * * *',
    $cron$SELECT public.prune_app_health_events();$cron$
  );

  -- process-notifications é Edge Function: pg_cron sozinho não chama HTTP. Só agenda
  -- com pg_net + as duas settings presentes (URL do projeto e o CRON_SECRET que a
  -- função exige no header x-cron-secret). Sem qualquer peça, aviso nomeado.
  IF has_pg_net AND NULLIF(edge_base_url, '') IS NOT NULL AND NULLIF(cron_secret, '') IS NOT NULL THEN
    PERFORM cron.unschedule('process-notifications')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-notifications');
    PERFORM cron.schedule(
      'process-notifications',
      '*/5 * * * *',
      format(
        $cron$SELECT net.http_post(
          url := %L || '/functions/v1/process-notifications',
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', %L),
          body := '{}'::jsonb
        );$cron$,
        edge_base_url, cron_secret
      )
    );
  ELSE
    RAISE NOTICE 'CONF-06/059: process-notifications NAO agendado (pg_net=%, app.settings.edge_base_url=%, app.settings.cron_secret=%). Agende pelo dashboard do Supabase a cada 5 min com o header x-cron-secret, ou configure as settings e reaplique esta migration.',
      has_pg_net,
      CASE WHEN NULLIF(edge_base_url, '') IS NULL THEN 'ausente' ELSE 'presente' END,
      CASE WHEN NULLIF(cron_secret, '') IS NULL THEN 'ausente' ELSE 'presente' END;
  END IF;
END $$;

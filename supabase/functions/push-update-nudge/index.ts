// Edge Function: push-update-nudge
// Scheduled job (Supabase cron). Sends a localized "please update" push to devices whose app is
// below `app_config.min_supported_version` (or has an unknown version), respecting
// `nudge_interval_days` via `device_push_tokens.last_update_nudge_at` so nobody is nudged more than
// once per interval. Uses the service role. Verified live on staging (Deno; not covered by vitest).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Inline (Deno can't import from src/). Mirrors src/lib/semver.ts.
function isBelowMinimum(version: string | null, minimum: string): boolean {
  if (!version) return true; // unknown version (pre-gate v1.0) → treat as outdated
  const parse = (v: string): number[] =>
    (v.trim().split(/[+-]/)[0].split('.').map((p) => parseInt(p, 10) || 0));
  const a = parse(version);
  const b = parse(minimum);
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) < (b[i] ?? 0)) return true;
    if ((a[i] ?? 0) > (b[i] ?? 0)) return false;
  }
  return false;
}

const MESSAGES: Record<string, { title: string; body: string }> = {
  'pt-BR': {
    title: 'Atualização disponível',
    body: 'Atualize o Planejador de Reunião Sacramental para continuar usando o app.',
  },
  'en-US': {
    title: 'Update available',
    body: 'Please update Sacrament Meeting Planner to keep using the app.',
  },
  'es-LA': {
    title: 'Actualización disponible',
    body: 'Actualiza el Planificador de la Reunión Sacramental para seguir usando la app.',
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: config } = await admin
      .from('app_config')
      .select('min_supported_version, nudge_interval_days')
      .eq('id', 1)
      .single();
    if (!config) return json({ error: 'no app_config' }, 500);

    const minVersion: string = config.min_supported_version;
    const intervalDays: number = config.nudge_interval_days ?? 7;
    const cutoffIso = new Date(Date.now() - intervalDays * 86400_000).toISOString();

    // Candidates: not nudged within the interval. Version filter (semver) applied below.
    const { data: tokens, error } = await admin
      .from('device_push_tokens')
      .select('id, expo_push_token, app_version, ward_id, wards(language)')
      .or(`last_update_nudge_at.is.null,last_update_nudge_at.lt.${cutoffIso}`);
    if (error) return json({ error: error.message }, 500);

    const outdated = (tokens ?? []).filter((t) =>
      isBelowMinimum(t.app_version as string | null, minVersion)
    );
    if (outdated.length === 0) return json({ sent: 0 });

    const pushMessages = outdated.map((t) => {
      const lang =
        (t.wards as { language?: string } | null)?.language && MESSAGES[(t.wards as { language: string }).language]
          ? (t.wards as { language: string }).language
          : 'en-US';
      const msg = MESSAGES[lang];
      return { to: t.expo_push_token, title: msg.title, body: msg.body, sound: 'default' };
    });

    // Expo push API (chunk by 100).
    for (let i = 0; i < pushMessages.length; i += 100) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(pushMessages.slice(i, i + 100)),
      });
    }

    const nowIso = new Date().toISOString();
    await admin
      .from('device_push_tokens')
      .update({ last_update_nudge_at: nowIso })
      .in('id', outdated.map((t) => t.id));

    return json({ sent: outdated.length });
  } catch (err) {
    console.error('push-update-nudge error:', err);
    return json({ error: String(err) }, 500);
  }
});

// Edge Function: app-config
// Returns the global version-gate config for the launch gate + nudge job.
// Public (verify_jwt=false) so the launch gate works before the user logs in.
// Reads the app_config singleton via the service role. FAIL-OPEN: on any error it returns
// permissive defaults (min '0.0.0') so a config problem never hard-blocks clients.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const FAIL_OPEN = {
  min_supported_version: '0.0.0',
  latest_version: '0.0.0',
  nudge_interval_days: 7,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown) =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await admin
      .from('app_config')
      .select('min_supported_version, latest_version, nudge_interval_days')
      .eq('id', 1)
      .single();

    if (error || !data) {
      console.error('app-config read failed:', error);
      return json(FAIL_OPEN);
    }
    return json(data);
  } catch (err) {
    console.error('app-config unexpected error:', err);
    return json(FAIL_OPEN);
  }
});

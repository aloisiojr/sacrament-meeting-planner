// Edge Function: reset-redirect
// Validates token format and redirects to external password reset page.
// The external page is hosted on GitHub Pages with correct Content-Type: text/html.
// No JWT required (public endpoint).
//
// F144 (CR-204): Convert from inline HTML to 302 redirect to bypass Supabase
// Content-Type text/plain override.
// ADR-095: External hosting via GitHub Pages for HTML pages.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const type = url.searchParams.get('type');

  if (!token || !type) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters: token and type' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Validate input formats to prevent redirecting with invalid tokens.
  // token is a hex hash from Supabase Auth.
  if (!/^[a-zA-Z0-9_-]+$/.test(token)) {
    return new Response(
      JSON.stringify({ error: 'Invalid token format' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const ALLOWED_TYPES = ['recovery'];
  if (!ALLOWED_TYPES.includes(type)) {
    return new Response(
      JSON.stringify({ error: 'Invalid type format' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const externalPagesUrl = Deno.env.get('EXTERNAL_PAGES_URL')
    || 'https://aloisiojr.github.io/sacrament-meeting-planner';

  if (!Deno.env.get('EXTERNAL_PAGES_URL')) {
    console.warn('[reset-redirect] EXTERNAL_PAGES_URL not set, using default');
  }

  const redirectUrl = `${externalPagesUrl}/reset-password.html?token=${token}&type=${type}`;
  console.log('[reset-redirect] Redirecting to external page');

  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, 'Location': redirectUrl },
  });
});

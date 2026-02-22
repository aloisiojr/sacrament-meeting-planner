// Edge Function: invite-redirect
// Validates token format and redirects to external invitation acceptance page.
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

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameter: token' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Validate token is a UUID to prevent redirecting with invalid tokens.
  if (!/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(token)) {
    return new Response(
      JSON.stringify({ error: 'Invalid token format' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const externalPagesUrl = Deno.env.get('EXTERNAL_PAGES_URL')
    || 'https://aloisiojr.github.io/sacrament-meeting-planner/public';

  if (!Deno.env.get('EXTERNAL_PAGES_URL')) {
    console.warn('[invite-redirect] EXTERNAL_PAGES_URL not set, using default');
  }

  const redirectUrl = `${externalPagesUrl}/accept-invite.html?token=${token}`;
  console.log('[invite-redirect] Redirecting to external page');

  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, 'Location': redirectUrl },
  });
});

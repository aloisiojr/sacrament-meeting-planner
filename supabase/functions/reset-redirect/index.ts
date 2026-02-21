// Edge Function: reset-redirect
// HTTPS intermediary that redirects to sacrmeetplan://reset-password deep link.
// Used in password reset emails so that the CTA button is clickable in all email
// clients (custom URL schemes are blocked by email clients for security).
// No JWT required (public endpoint). No token validation (pass-through only).

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

  const deepLink = `sacrmeetplan://reset-password?token=${token}&type=${type}`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="0;url=${deepLink}">
  <title>Planejador de Reuniao Sacramental</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background-color: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 24px;
    }
    h1 {
      color: #333;
      font-size: 20px;
      margin-bottom: 16px;
    }
    p {
      color: #555;
      margin-bottom: 24px;
    }
    .button {
      display: inline-block;
      background-color: #4F46E5;
      color: #fff;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Planejador de Reuniao Sacramental</h1>
    <p>Redirecionando para o aplicativo...</p>
    <a href="${deepLink}" class="button">Abrir no aplicativo</a>
  </div>
  <script>window.location.href = '${deepLink}';</script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'text/html' },
  });
});

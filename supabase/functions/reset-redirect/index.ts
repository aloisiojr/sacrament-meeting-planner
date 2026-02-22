// Edge Function: reset-redirect
// Serves a self-contained HTML page with password reset form.
// Uses Supabase JS loaded from CDN to call verifyOtp and updateUser directly
// in the browser. No deep link redirect. No app interaction required.
// No JWT required (public endpoint).
//
// Flow:
//   1. User clicks reset link in email -> browser opens this Edge Function URL
//   2. Page loads Supabase JS from CDN, calls verifyOtp with token from URL
//   3. On success: shows password form (new password + confirm)
//   4. On submit: validates (>= 6 chars, match), calls updateUser
//   5. On success: shows success message
//
// F138 (CR-202): Complete rewrite replacing deep link redirect with web form.
// ADR-089: Replace deep link redirect with self-contained password reset web page.

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

  // Validate input formats to prevent XSS injection via template interpolation.
  // token is a hex hash from Supabase Auth; type is a known recovery type string.
  if (!/^[a-fA-F0-9]+$/.test(token)) {
    return new Response(
      JSON.stringify({ error: 'Invalid token format' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  if (!/^[a-z_]+$/.test(type)) {
    return new Response(
      JSON.stringify({ error: 'Invalid type format' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Planejador de Reuniao Sacramental</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #f5f5f5;
    }
    .card {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 32px 24px;
      max-width: 400px;
      width: 100%;
      margin: 16px;
    }
    h1 {
      color: #333;
      font-size: 20px;
      text-align: center;
      margin-bottom: 8px;
    }
    h2 {
      color: #555;
      font-size: 16px;
      text-align: center;
      margin-bottom: 24px;
      font-weight: normal;
    }
    label {
      display: block;
      color: #333;
      font-size: 14px;
      margin-bottom: 4px;
      margin-top: 16px;
    }
    input[type="password"] {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ccc;
      border-radius: 6px;
      font-size: 14px;
      outline: none;
    }
    input[type="password"]:focus {
      border-color: #4F46E5;
    }
    button {
      width: 100%;
      padding: 12px;
      background-color: #4F46E5;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 24px;
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .spinner {
      border: 3px solid #eee;
      border-top: 3px solid #4F46E5;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      animation: spin 0.8s linear infinite;
      margin: 24px auto;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .error-msg {
      color: #dc2626;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
      margin-top: 16px;
      font-size: 14px;
    }
    .success-msg {
      color: #16a34a;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 6px;
      padding: 16px;
      text-align: center;
      margin-top: 16px;
      font-size: 14px;
    }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Planejador de Reuniao Sacramental</h1>
    <h2 id="subtitle"></h2>

    <div id="loading">
      <div class="spinner"></div>
      <p style="text-align:center;color:#555;" id="loading-text"></p>
    </div>

    <div id="error-container" class="hidden">
      <div class="error-msg" id="error-msg"></div>
    </div>

    <div id="form-container" class="hidden">
      <form id="reset-form">
        <label id="label-password" for="password"></label>
        <input type="password" id="password" required>

        <label id="label-confirm" for="confirm-password"></label>
        <input type="password" id="confirm-password" required>

        <div id="validation-error" class="error-msg hidden"></div>

        <button type="submit" id="submit-btn"></button>
      </form>
    </div>

    <div id="success-container" class="hidden">
      <div class="success-msg" id="success-msg"></div>
    </div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" onerror="handleCdnError()"></script>
  <script>
    // --- i18n ---
    var lang = navigator.language || 'pt-BR';
    var t;
    if (lang.startsWith('en')) {
      t = {
        subtitle: 'Reset Password',
        loading: 'Verifying link...',
        labelPassword: 'New password',
        labelConfirm: 'Confirm new password',
        submit: 'Reset Password',
        submitting: 'Resetting...',
        success: 'Password updated successfully! You can now close this page and log in to the app.',
        errorExpired: 'Link expired or invalid. Please request a new password reset link.',
        errorShortPassword: 'Password must be at least 6 characters.',
        errorMismatch: 'Passwords do not match.',
        errorGeneric: 'An error occurred. Please try again.',
        errorCdn: 'Failed to load page. Please try again.'
      };
    } else if (lang.startsWith('es')) {
      t = {
        subtitle: 'Restablecer contrasena',
        loading: 'Verificando enlace...',
        labelPassword: 'Nueva contrasena',
        labelConfirm: 'Confirmar nueva contrasena',
        submit: 'Restablecer contrasena',
        submitting: 'Restableciendo...',
        success: 'Contrasena actualizada con exito! Ya puede cerrar esta pagina e iniciar sesion en la aplicacion.',
        errorExpired: 'Enlace expirado o invalido. Solicite un nuevo enlace de restablecimiento.',
        errorShortPassword: 'La contrasena debe tener al menos 6 caracteres.',
        errorMismatch: 'Las contrasenas no coinciden.',
        errorGeneric: 'Ocurrio un error. Intentelo de nuevo.',
        errorCdn: 'Error al cargar la pagina. Intentelo de nuevo.'
      };
    } else {
      t = {
        subtitle: 'Redefinir Senha',
        loading: 'Verificando link...',
        labelPassword: 'Nova senha',
        labelConfirm: 'Confirmar nova senha',
        submit: 'Redefinir Senha',
        submitting: 'Redefinindo...',
        success: 'Senha atualizada com sucesso! Voce ja pode fechar esta pagina e fazer login no aplicativo.',
        errorExpired: 'Link expirado ou invalido. Solicite um novo link de redefinicao de senha.',
        errorShortPassword: 'A senha deve ter pelo menos 6 caracteres.',
        errorMismatch: 'As senhas nao coincidem.',
        errorGeneric: 'Ocorreu um erro. Tente novamente.',
        errorCdn: 'Erro ao carregar a pagina. Tente novamente.'
      };
    }

    // --- Apply i18n ---
    document.getElementById('subtitle').textContent = t.subtitle;
    document.getElementById('loading-text').textContent = t.loading;
    document.getElementById('label-password').textContent = t.labelPassword;
    document.getElementById('label-confirm').textContent = t.labelConfirm;
    document.getElementById('submit-btn').textContent = t.submit;

    // --- CDN error handler ---
    function handleCdnError() {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('error-container').classList.remove('hidden');
      document.getElementById('error-msg').textContent = t.errorCdn;
    }

    // --- State helpers ---
    function showError(msg) {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('form-container').classList.add('hidden');
      document.getElementById('error-container').classList.remove('hidden');
      document.getElementById('error-msg').textContent = msg;
    }

    function showForm() {
      document.getElementById('loading').classList.add('hidden');
      document.getElementById('form-container').classList.remove('hidden');
    }

    function showSuccess() {
      document.getElementById('form-container').classList.add('hidden');
      document.getElementById('success-container').classList.remove('hidden');
      document.getElementById('success-msg').textContent = t.success;
    }

    // --- Main ---
    (async function() {
      // Check if Supabase JS loaded
      if (typeof window.supabase === 'undefined') {
        handleCdnError();
        return;
      }

      var supabaseClient = window.supabase.createClient(
        '${supabaseUrl}',
        '${supabaseAnonKey}'
      );

      // Verify OTP token
      var tokenHash = '${token}';
      var tokenType = '${type}';

      try {
        var result = await supabaseClient.auth.verifyOtp({
          token_hash: tokenHash,
          type: tokenType
        });
        if (result.error) {
          showError(t.errorExpired);
          return;
        }
        showForm();
      } catch (e) {
        showError(t.errorExpired);
        return;
      }

      // --- Form submit ---
      document.getElementById('reset-form').addEventListener('submit', async function(e) {
        e.preventDefault();

        var validationError = document.getElementById('validation-error');
        validationError.classList.add('hidden');

        var password = document.getElementById('password').value;
        var confirmPassword = document.getElementById('confirm-password').value;

        // Validate password length
        if (password.length < 6) {
          validationError.textContent = t.errorShortPassword;
          validationError.classList.remove('hidden');
          return;
        }

        // Validate password match
        if (password !== confirmPassword) {
          validationError.textContent = t.errorMismatch;
          validationError.classList.remove('hidden');
          return;
        }

        var submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = t.submitting;

        try {
          var updateResult = await supabaseClient.auth.updateUser({ password: password });
          if (updateResult.error) {
            validationError.textContent = t.errorGeneric;
            validationError.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.textContent = t.submit;
            return;
          }
          showSuccess();
        } catch (err) {
          validationError.textContent = t.errorGeneric;
          validationError.classList.remove('hidden');
          submitBtn.disabled = false;
          submitBtn.textContent = t.submit;
        }
      });
    })();
  </script>
</body>
</html>`;

  console.log(`[reset-redirect] Serving password reset page for type=${type}`);

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
});

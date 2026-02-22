// Edge Function: invite-redirect
// Serves a self-contained HTML page with invitation acceptance form.
// Uses fetch to call register-invited-user Edge Function for token validation
// and user registration. No Supabase JS CDN needed (plain fetch).
// No JWT required (public endpoint).
//
// Flow:
//   1. User clicks invitation link -> browser opens this Edge Function URL
//   2. Page fetches register-invited-user with { token } (validate-only)
//   3. On success: shows read-only fields (stake, ward, role, email) + registration form
//   4. On submit: validates (fullName, password >= 6, match), fetches register-invited-user
//   5. On 201: shows success message
//
// F139 (CR-203): New Edge Function for invitation acceptance web page.
// ADR-090: New invite-redirect EF replaces deep link for invitation acceptance.

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
    input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ccc;
      border-radius: 6px;
      font-size: 14px;
      outline: none;
    }
    input:focus {
      border-color: #4F46E5;
    }
    input:disabled {
      background-color: #f3f4f6;
      color: #6b7280;
      cursor: not-allowed;
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
    .readonly-section {
      margin-bottom: 8px;
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
      <form id="invite-form">
        <div class="readonly-section">
          <label id="label-stake" for="stake"></label>
          <input type="text" id="stake" disabled>

          <label id="label-ward" for="ward"></label>
          <input type="text" id="ward" disabled>

          <label id="label-role" for="role"></label>
          <input type="text" id="role" disabled>

          <label id="label-email" for="email"></label>
          <input type="text" id="email" disabled>
        </div>

        <label id="label-fullname" for="fullname"></label>
        <input type="text" id="fullname" required>

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

  <script>
    // --- i18n ---
    var lang = navigator.language || 'pt-BR';
    var t;
    var roleLabels;
    if (lang.startsWith('en')) {
      t = {
        subtitle: 'Accept Invitation',
        loading: 'Validating invitation...',
        labelStake: 'Stake',
        labelWard: 'Ward',
        labelRole: 'Role',
        labelEmail: 'Email',
        labelFullName: 'Full Name',
        labelPassword: 'Password',
        labelConfirm: 'Confirm password',
        submit: 'Create Account',
        submitting: 'Creating...',
        success: 'Account created successfully! You can now open the app and log in with your email and password.',
        errorTokenInvalid: 'Invalid invitation. Please request a new invite from your ward leader.',
        errorTokenUsed: 'This invitation has already been used.',
        errorTokenExpired: 'This invitation has expired. Please request a new invite.',
        errorCreateFailed: 'Could not create account. This email may already be registered.',
        errorEmptyName: 'Full name is required.',
        errorShortPassword: 'Password must be at least 6 characters.',
        errorMismatch: 'Passwords do not match.',
        errorGeneric: 'An error occurred. Please try again.'
      };
      roleLabels = { bishopric: 'Bishopric', secretary: 'Secretary', observer: 'Observer' };
    } else if (lang.startsWith('es')) {
      t = {
        subtitle: 'Aceptar invitacion',
        loading: 'Validando invitacion...',
        labelStake: 'Estaca',
        labelWard: 'Barrio',
        labelRole: 'Funcion',
        labelEmail: 'Correo electronico',
        labelFullName: 'Nombre completo',
        labelPassword: 'Contrasena',
        labelConfirm: 'Confirmar contrasena',
        submit: 'Crear cuenta',
        submitting: 'Creando...',
        success: 'Cuenta creada con exito! Ya puede abrir la aplicacion e iniciar sesion con su correo y contrasena.',
        errorTokenInvalid: 'Invitacion invalida. Solicite una nueva invitacion a su lider de barrio.',
        errorTokenUsed: 'Esta invitacion ya fue utilizada.',
        errorTokenExpired: 'Esta invitacion ha expirado. Solicite una nueva invitacion.',
        errorCreateFailed: 'No se pudo crear la cuenta. Este correo puede ya estar registrado.',
        errorEmptyName: 'El nombre completo es obligatorio.',
        errorShortPassword: 'La contrasena debe tener al menos 6 caracteres.',
        errorMismatch: 'Las contrasenas no coinciden.',
        errorGeneric: 'Ocurrio un error. Intentelo de nuevo.'
      };
      roleLabels = { bishopric: 'Obispado', secretary: 'Secretario', observer: 'Observador' };
    } else {
      t = {
        subtitle: 'Aceitar Convite',
        loading: 'Validando convite...',
        labelStake: 'Estaca',
        labelWard: 'Ala',
        labelRole: 'Funcao',
        labelEmail: 'Email',
        labelFullName: 'Nome Completo',
        labelPassword: 'Senha',
        labelConfirm: 'Confirmar senha',
        submit: 'Criar Conta',
        submitting: 'Criando...',
        success: 'Conta criada com sucesso! Voce ja pode abrir o aplicativo e fazer login com seu email e senha.',
        errorTokenInvalid: 'Convite invalido. Solicite um novo convite ao lider da ala.',
        errorTokenUsed: 'Este convite ja foi utilizado.',
        errorTokenExpired: 'Este convite expirou. Solicite um novo convite.',
        errorCreateFailed: 'Nao foi possivel criar a conta. Este email pode ja estar registrado.',
        errorEmptyName: 'Nome completo e obrigatorio.',
        errorShortPassword: 'A senha deve ter pelo menos 6 caracteres.',
        errorMismatch: 'As senhas nao coincidem.',
        errorGeneric: 'Ocorreu um erro. Tente novamente.'
      };
      roleLabels = { bishopric: 'Bispado', secretary: 'Secretario', observer: 'Observador' };
    }

    // --- Apply i18n ---
    document.getElementById('subtitle').textContent = t.subtitle;
    document.getElementById('loading-text').textContent = t.loading;
    document.getElementById('label-stake').textContent = t.labelStake;
    document.getElementById('label-ward').textContent = t.labelWard;
    document.getElementById('label-role').textContent = t.labelRole;
    document.getElementById('label-email').textContent = t.labelEmail;
    document.getElementById('label-fullname').textContent = t.labelFullName;
    document.getElementById('label-password').textContent = t.labelPassword;
    document.getElementById('label-confirm').textContent = t.labelConfirm;
    document.getElementById('submit-btn').textContent = t.submit;

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

    function getErrorMessage(errorCode) {
      if (errorCode === 'token_invalid') return t.errorTokenInvalid;
      if (errorCode === 'token_used') return t.errorTokenUsed;
      if (errorCode === 'token_expired') return t.errorTokenExpired;
      if (errorCode === 'Failed to create user') return t.errorCreateFailed;
      return t.errorGeneric;
    }

    function translateRole(role) {
      return roleLabels[role] || role;
    }

    // --- Main ---
    var inviteToken = '${token}';
    var apiBase = '${supabaseUrl}/functions/v1';
    var apiKey = '${supabaseAnonKey}';

    (async function() {
      try {
        // Validate token (validate-only mode: token only, no password)
        var response = await fetch(apiBase + '/register-invited-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': apiKey
          },
          body: JSON.stringify({ token: inviteToken })
        });

        var data = await response.json();

        if (!response.ok) {
          showError(getErrorMessage(data.error));
          return;
        }

        // Populate read-only fields
        var inv = data.invitation;
        document.getElementById('stake').value = inv.stakeName || '';
        document.getElementById('ward').value = inv.wardName || '';
        document.getElementById('role').value = translateRole(inv.role);
        document.getElementById('email').value = inv.email || '';

        showForm();
      } catch (e) {
        showError(t.errorGeneric);
        return;
      }

      // --- Form submit ---
      document.getElementById('invite-form').addEventListener('submit', async function(e) {
        e.preventDefault();

        var validationError = document.getElementById('validation-error');
        validationError.classList.add('hidden');

        var fullName = document.getElementById('fullname').value.trim();
        var password = document.getElementById('password').value;
        var confirmPassword = document.getElementById('confirm-password').value;

        // Validate full name
        if (!fullName) {
          validationError.textContent = t.errorEmptyName;
          validationError.classList.remove('hidden');
          return;
        }

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
          var regResponse = await fetch(apiBase + '/register-invited-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': apiKey
            },
            body: JSON.stringify({ token: inviteToken, password: password, fullName: fullName })
          });

          var regData = await regResponse.json();

          if (regResponse.status === 201) {
            showSuccess();
            return;
          }

          validationError.textContent = getErrorMessage(regData.error);
          validationError.classList.remove('hidden');
          submitBtn.disabled = false;
          submitBtn.textContent = t.submit;
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

  console.log(`[invite-redirect] Serving invitation acceptance page for token`);

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
});

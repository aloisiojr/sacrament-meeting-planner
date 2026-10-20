// Edge Function: send-reset-email
// Sends multilingual password reset email via Gmail SMTP.
// Unauthenticated endpoint (no JWT required) - user has no session during forgot-password flow.
// Looks up ward language, generates recovery token, sends translated email with deep link.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// CORS `*` is kept by decision (CONF-12, specs/cutover-gate.md): the mobile app sends no
// Origin, so CORS is not the protection on this public endpoint — the rate limit below and
// the anti-enumeration identical response are. The helpers here are duplicated in
// register-first-user / create-invitation: the repo has no supabase/functions/_shared/
// and its pattern is minimal, consistent duplication per function (cf. cronSecretOk).
const RATE_LIMIT_MAX_HITS = 20;
const RATE_LIMIT_WINDOW_SECONDS = 3600;

/** Name of the first missing env var, or null. Checked at the top so a misconfigured
 *  deploy fails with the variable NAMED instead of an opaque runtime 500 (CONF-12). */
function missingEnv(names: string[]): string | null {
  for (const name of names) {
    if (!Deno.env.get(name)) return name;
  }
  return null;
}

function envErrorResponse(name: string): Response {
  console.error(`Missing required environment variable: ${name}`);
  return new Response(
    JSON.stringify({
      error: `Missing required environment variable: ${name}`,
      code: 'config/missing-env',
    }),
    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

/** 429 Response when (function, IP, email) exceeds the limit, else null. A broken
 *  limiter fails OPEN (logged): the brake must never take down the legitimate flow. */
async function rateLimitResponse(
  admin: { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> },
  req: Request,
  functionName: string,
  email: string
): Promise<Response | null> {
  try {
    const ip = (req.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim() || 'unknown';
    const { data, error } = await admin.rpc('check_rate_limit', {
      p_function: functionName,
      p_ip: ip,
      p_email: email.trim().toLowerCase(),
      p_max_hits: RATE_LIMIT_MAX_HITS,
      p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    });
    if (error) {
      console.error('Rate limit check failed (failing open):', error);
      return null;
    }
    if (data === false) {
      return new Response(
        JSON.stringify({ error: 'Too many requests', code: 'rate-limit/exceeded' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    return null;
  } catch (err) {
    console.error('Rate limit check failed (failing open):', err);
    return null;
  }
}

function getEmailTemplate(
  language: string,
  deepLink: string
): { subject: string; html: string } {
  const templates: Record<string, { subject: string; html: string }> = {
    'pt-BR': {
      subject: 'Redefinir senha - Gerenciador da Reuniao Sacramental',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #333; margin-bottom: 16px;">Redefinir senha</h2>
          <p style="color: #555; line-height: 1.6;">
            Voce solicitou a redefinicao da sua senha no Gerenciador da Reuniao Sacramental.
            Clique no botao abaixo para definir uma nova senha.
          </p>
          <a href="${deepLink}"
             style="display: inline-block; background-color: #4F46E5; color: #fff; padding: 12px 24px;
                    border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0;">
            Redefinir senha
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            Se voce nao solicitou esta alteracao, ignore este email.
          </p>
        </div>
      `,
    },
    'en-US': {
      subject: 'Reset password - Sacrament Meeting Planner',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #333; margin-bottom: 16px;">Reset password</h2>
          <p style="color: #555; line-height: 1.6;">
            You requested a password reset for Sacrament Meeting Planner.
            Click the button below to set a new password.
          </p>
          <a href="${deepLink}"
             style="display: inline-block; background-color: #4F46E5; color: #fff; padding: 12px 24px;
                    border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0;">
            Reset password
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            If you did not request this change, please ignore this email.
          </p>
        </div>
      `,
    },
    'es-LA': {
      subject:
        'Restablecer contrasena - Planificador de la Reunion Sacramental',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #333; margin-bottom: 16px;">Restablecer contrasena</h2>
          <p style="color: #555; line-height: 1.6;">
            Has solicitado restablecer tu contrasena en el Planificador de la Reunion Sacramental.
            Haz clic en el boton de abajo para establecer una nueva contrasena.
          </p>
          <a href="${deepLink}"
             style="display: inline-block; background-color: #4F46E5; color: #fff; padding: 12px 24px;
                    border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0;">
            Restablecer contrasena
          </a>
          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            Si no solicitaste este cambio, ignora este correo.
          </p>
        </div>
      `,
    },
  };

  return templates[language] ?? templates['en-US'];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const missing = missingEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'GMAIL_USER', 'GMAIL_APP_PASSWORD']);
    if (missing) return envErrorResponse(missing);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { email } = await req.json();

    // Validate email
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid email' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const limited = await rateLimitResponse(supabaseAdmin, req, 'send-reset-email', trimmedEmail);
    if (limited) return limited;

    // Direct lookup by email via the Admin API (CONF-12): generateLink resolves the
    // account server-side by its indexed email — no paginated listUsers scan. The
    // returned `user` carries the metadata for the template language and the canonical
    // address. A "user not found" error is the anti-enumeration path below; any other
    // error is a real failure and stays a 500.
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: trimmedEmail,
      });

    const linkErrorStatus = (linkError as { status?: number } | null)?.status;
    const userNotFound =
      !!linkError &&
      (linkErrorStatus === 404 || /not found/i.test(linkError.message ?? ''));
    if (userNotFound) {
      // Anti-enumeration: return success even if user not found
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (linkError || !linkData?.user) {
      console.error('Error generating recovery link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    const user = linkData.user;

    // Get language for email template
    // Priority: user_metadata.language > ward.language > 'en-US'
    let language = 'en-US';
    const userMetaLanguage = user.user_metadata?.language;
    if (userMetaLanguage && typeof userMetaLanguage === 'string') {
      language = userMetaLanguage;
    } else {
      const wardId = user.app_metadata?.ward_id;
      if (wardId) {
        const { data: ward } = await supabaseAdmin
          .from('wards')
          .select('language')
          .eq('id', wardId)
          .single();
        language = ward?.language ?? 'en-US';
      }
    }

    const hashed_token = linkData.properties?.hashed_token;
    if (!hashed_token) {
      console.error('No hashed_token in generateLink response');
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build deep link against THIS project (env-injected), not a hardcoded project — otherwise a
    // token minted here gets validated against a different project and reads as "expired/invalid".
    const deepLink = `${Deno.env.get('SUPABASE_URL')}/functions/v1/reset-redirect?token=${hashed_token}&type=recovery`;

    // Get email template
    const template = getEmailTemplate(language, deepLink);

    // Gmail env was already validated (named) at the top of the handler (CONF-12).
    const GMAIL_USER = Deno.env.get('GMAIL_USER');
    const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD');

    // Send email via Gmail SMTP (authenticated with an App Password)
    const smtp = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 465,
        tls: true,
        auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
      },
    });

    try {
      await smtp.send({
        from: `Sacrament Meeting Planner <${GMAIL_USER}>`,
        to: user.email!,
        subject: template.subject,
        content: `Reset your password: ${deepLink}`,
        html: template.html,
      });
      await smtp.close();
    } catch (smtpError) {
      console.error('Gmail SMTP error:', smtpError);
      try {
        await smtp.close();
      } catch {
        // ignore close error after a failed send
      }
      return new Response(
        JSON.stringify({ error: 'Failed to send email' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Edge Function: send-reset-email
// Sends multilingual password reset email via Resend API.
// Unauthenticated endpoint (no JWT required) - user has no session during forgot-password flow.
// Looks up ward language, generates recovery token, sends translated email with deep link.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

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
    en: {
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
    es: {
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

  return templates[language] ?? templates['pt-BR'];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    // Lookup user by email
    const {
      data: { users },
      error: listError,
    } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const user = users.find(
      (u: { email?: string }) =>
        u.email?.toLowerCase() === trimmedEmail
    );

    // Anti-enumeration: return success even if user not found
    if (!user) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get ward language
    let language = 'pt-BR';
    const wardId = user.app_metadata?.ward_id;
    if (wardId) {
      const { data: ward } = await supabaseAdmin
        .from('wards')
        .select('language')
        .eq('id', wardId)
        .single();
      language = ward?.language ?? 'pt-BR';
    }

    // Generate recovery token
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: user.email!,
      });

    if (linkError || !linkData) {
      console.error('Error generating recovery link:', linkError);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
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

    // Build deep link
    const deepLink = `https://poizgglzdjqwrhsnhkke.supabase.co/functions/v1/reset-redirect?token=${hashed_token}&type=recovery`;

    // Get email template
    const template = getEmailTemplate(language, deepLink);

    // Check Resend env vars
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL');

    if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
      console.error('Missing RESEND_API_KEY or RESEND_FROM_EMAIL');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [user.email],
        subject: template.subject,
        html: template.html,
      }),
    });

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text();
      console.error('Resend API error:', resendError);
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

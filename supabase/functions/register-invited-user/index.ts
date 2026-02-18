// Edge Function: register-invited-user
// Validates an invitation token and creates the invited user.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface RegisterInvitedInput {
  token: string;
  password: string;
  fullName: string;
}

interface ValidateTokenInput {
  token: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    const body = await req.json();

    // If only token is provided (no password), this is a validation request
    if (body.token && !body.password) {
      return await handleValidateToken(supabaseAdmin, body as ValidateTokenInput);
    }

    // Full registration request
    return await handleRegister(supabaseAdmin, body as RegisterInvitedInput);
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleValidateToken(supabaseAdmin: any, input: ValidateTokenInput) {
  const { token } = input;

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'token_invalid' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Look up invitation
  const { data: invitation, error: lookupError } = await supabaseAdmin
    .from('invitations')
    .select('*, wards(name, stake_name)')
    .eq('token', token)
    .maybeSingle();

  if (lookupError || !invitation) {
    return new Response(
      JSON.stringify({ error: 'token_invalid' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if already used
  if (invitation.used_at) {
    return new Response(
      JSON.stringify({ error: 'token_used' }),
      { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if expired (30 days)
  if (new Date(invitation.expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ error: 'token_expired' }),
      { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        stakeName: invitation.wards?.stake_name,
        wardName: invitation.wards?.name,
      },
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleRegister(supabaseAdmin: any, input: RegisterInvitedInput) {
  const { token, password } = input;

  if (!token || !password) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate fullName
  if (!input.fullName?.trim()) {
    return new Response(
      JSON.stringify({ error: 'Name is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (password.length < 6) {
    return new Response(
      JSON.stringify({ error: 'Password must be at least 6 characters' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Look up invitation
  const { data: invitation, error: lookupError } = await supabaseAdmin
    .from('invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (lookupError || !invitation) {
    return new Response(
      JSON.stringify({ error: 'token_invalid' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if already used
  if (invitation.used_at) {
    return new Response(
      JSON.stringify({ error: 'token_used' }),
      { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if expired
  if (new Date(invitation.expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ error: 'token_expired' }),
      { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create user with app_metadata
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
    app_metadata: {
      ward_id: invitation.ward_id,
      role: invitation.role,
      full_name: input.fullName.trim(),
    },
  });

  if (authError) {
    console.error('User creation error:', authError);
    return new Response(
      JSON.stringify({ error: 'Failed to create user' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Mark invitation as used
  await supabaseAdmin
    .from('invitations')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invitation.id);

  // Sign in the new user to get a session
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  );

  const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
    email: invitation.email,
    password,
  });

  if (signInError) {
    console.error('Auto sign-in error:', signInError);
    return new Response(
      JSON.stringify({
        user: authData.user,
        session: null,
        message: 'User created but auto-login failed. Please log in manually.',
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      user: authData.user,
      session: signInData.session,
    }),
    { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

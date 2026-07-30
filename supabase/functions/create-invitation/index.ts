// Edge Function: create-invitation
// Creates an invitation with token + deep link for a new user.
// Requires JWT with Bishopric or Secretary role (invitation:create permission).
//
// F143 (CR-208): Structured error logging and error codes.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface CreateInvitationInput {
  email: string;
  role: 'bishopric' | 'secretary' | 'observer';
}

const VALID_ROLES = ['bishopric', 'secretary', 'observer'];
const INVITATION_EXPIRY_DAYS = 30;
const ALLOWED_ROLES = ['bishopric', 'secretary']; // Roles that can create invitations

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[create-invitation] auth_header failed: no Authorization header present');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header', code: 'auth/missing-header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error(`[create-invitation] jwt_validation failed: ${userError?.message ?? 'user is null'}`);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token', code: 'auth/invalid-token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const wardId = user.app_metadata?.ward_id;
    const userRole = user.app_metadata?.role;

    if (!wardId || !userRole) {
      console.error(`[create-invitation] metadata_check failed: ward_id=${wardId}, role=${userRole}, user_id=${user.id}`);
      return new Response(
        JSON.stringify({ error: 'User missing ward or role metadata', code: 'auth/missing-metadata' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check permission: only Bishopric and Secretary can create invitations
    if (!ALLOWED_ROLES.includes(userRole)) {
      console.error(`[create-invitation] role_permission failed: userRole=${userRole}, user_id=${user.id}`);
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions', code: 'auth/insufficient-permission' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let input: CreateInvitationInput;
    try {
      input = await req.json();
    } catch {
      console.error('[create-invitation] payload_validation failed: malformed JSON body');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email and role', code: 'validation/missing-fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!input.email || !input.role) {
      console.error(`[create-invitation] payload_validation failed: missing email=${!!input.email} role=${!!input.role}`);
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email and role', code: 'validation/missing-fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    if (!VALID_ROLES.includes(input.role)) {
      console.error(`[create-invitation] payload_validation failed: invalid role=${input.role}`);
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be bishopric, secretary, or observer.', code: 'validation/invalid-role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format (basic)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      console.error(`[create-invitation] payload_validation failed: invalid email format`);
      return new Response(
        JSON.stringify({ error: 'Invalid email format', code: 'validation/invalid-email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a unique token
    const invitationToken = crypto.randomUUID();

    // Auto-revoke this ward's expired, unused invitations (best-effort DB hygiene). There is no
    // invite-management UI, so this lazy sweep on each new invite keeps dead tokens from lingering.
    // A scheduled sweep (migration 045 revoke_expired_invitations) covers wards with no new invites.
    const { error: revokeError } = await supabaseAdmin
      .from('invitations')
      .delete()
      .eq('ward_id', wardId)
      .is('used_at', null)
      .lt('expires_at', new Date().toISOString());
    if (revokeError) {
      console.warn(`[create-invitation] auto-revoke sweep failed: ${revokeError.message}`);
    }

    // Calculate expiry (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    // Create invitation (resend = new token for same email, previous remains valid)
    const { data: invitation, error: insertError } = await supabaseAdmin
      .from('invitations')
      .insert({
        ward_id: wardId,
        email: input.email,
        role: input.role,
        token: invitationToken,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error(`[create-invitation] db_insert failed: ${insertError.message}`);
      return new Response(
        JSON.stringify({ error: 'Failed to create invitation', code: 'invitation/insert-failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // v2: the old "auto-create bishopric presider actor" step was removed with meeting_actors.
    // Presiders now come from members with can_preside (managed in the People picker).

    // Build invitation URL (HTTPS link to invite-redirect Edge Function)
    const deepLink = `${Deno.env.get('SUPABASE_URL')}/functions/v1/invite-redirect?token=${invitationToken}`;

    return new Response(
      JSON.stringify({
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          token: invitationToken,
          deepLink,
          expiresAt: invitation.expires_at,
        },
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

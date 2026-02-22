// Edge Function: create-invitation
// Creates an invitation with token + deep link for a new user.
// Requires JWT with Bishopric or Secretary role (invitation:create permission).
//
// F143 (CR-208): Structured error logging, error codes, and diagnostic mode.
// ADR-094: Structured error codes + diagnostic mode for production debugging.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface CreateInvitationInput {
  email: string;
  role: 'bishopric' | 'secretary' | 'observer';
  diagnose?: boolean;
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

    // Diagnostic mode: run all checks but skip DB insert
    if (input.diagnose === true) {
      return new Response(
        JSON.stringify({
          diagnostic: true,
          checks: {
            auth_header: 'pass',
            jwt_validation: 'pass',
            metadata_check: 'pass',
            role_permission: 'pass',
            payload_validation: 'pass',
          },
          user_id: user.id,
          ward_id: wardId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a unique token
    const invitationToken = crypto.randomUUID();

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

    // Auto-create meeting actor for bishopric invitations (best-effort)
    if (input.role === 'bishopric') {
      try {
        const actorName = input.email
          .split('@')[0]
          .replace(/[._]/g, ' ')
          .replace(/\b\w/g, (c: string) => c.toUpperCase());

        if (actorName) {
          const { data: existing } = await supabaseAdmin
            .from('meeting_actors')
            .select('id, can_preside, can_conduct')
            .eq('ward_id', wardId)
            .ilike('name', actorName)
            .maybeSingle();

          if (existing) {
            if (!existing.can_preside || !existing.can_conduct) {
              await supabaseAdmin
                .from('meeting_actors')
                .update({ can_preside: true, can_conduct: true })
                .eq('id', existing.id);
            }
          } else {
            await supabaseAdmin
              .from('meeting_actors')
              .insert({
                ward_id: wardId,
                name: actorName,
                can_preside: true,
                can_conduct: true,
                can_recognize: false,
                can_pianist: false,
                can_conductor: false,
              });
          }
        }
      } catch (actorErr) {
        // Best-effort: don't block invitation creation
        console.error('Auto-actor creation failed:', actorErr);
      }
    }

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

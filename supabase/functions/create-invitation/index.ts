// Edge Function: create-invitation
// Creates an invitation with token + deep link for a new user.
// Requires JWT with Bishopric or Secretary role (invitation:create permission).

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
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
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
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const wardId = user.app_metadata?.ward_id;
    const userRole = user.app_metadata?.role;

    if (!wardId || !userRole) {
      return new Response(
        JSON.stringify({ error: 'User missing ward or role metadata' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check permission: only Bishopric and Secretary can create invitations
    if (!ALLOWED_ROLES.includes(userRole)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const input: CreateInvitationInput = await req.json();

    // Validate required fields
    if (!input.email || !input.role) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email and role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    if (!VALID_ROLES.includes(input.role)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be bishopric, secretary, or observer.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format (basic)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
      console.error('Invitation creation error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create invitation' }),
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
                can_music: false,
              });
          }
        }
      } catch (actorErr) {
        // Best-effort: don't block invitation creation
        console.error('Auto-actor creation failed:', actorErr);
      }
    }

    // Build deep link
    const deepLink = `sacrmeetplan://invite/${invitationToken}`;

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

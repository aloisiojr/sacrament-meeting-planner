// Edge Function: update-user-role
// Changes a user's role. Cannot change own role.
// Warns on last Bishopric user in the ward.
// Requires JWT with Bishopric or Secretary role (settings:users permission).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface UpdateRoleInput {
  targetUserId: string;
  newRole: 'bishopric' | 'secretary' | 'observer';
}

const VALID_ROLES = ['bishopric', 'secretary', 'observer'];

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

    // Get caller from JWT
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token);

    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const wardId = caller.app_metadata?.ward_id;
    const callerRole = caller.app_metadata?.role;

    if (!wardId || !callerRole) {
      return new Response(
        JSON.stringify({ error: 'User missing ward or role metadata' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check permission: Bishopric and Secretary can change roles
    const ALLOWED_ROLES = ['bishopric', 'secretary'];
    if (!ALLOWED_ROLES.includes(callerRole)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const input: UpdateRoleInput = await req.json();

    // Validate required fields
    if (!input.targetUserId || !input.newRole) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: targetUserId and newRole' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    if (!VALID_ROLES.includes(input.newRole)) {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Must be bishopric, secretary, or observer.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cannot change own role
    if (input.targetUserId === caller.id) {
      return new Response(
        JSON.stringify({ error: 'cannot_change_own_role' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user to verify they belong to the same ward
    const { data: { user: targetUser }, error: targetError } =
      await supabaseAdmin.auth.admin.getUserById(input.targetUserId);

    if (targetError || !targetUser) {
      return new Response(
        JSON.stringify({ error: 'Target user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (targetUser.app_metadata?.ward_id !== wardId) {
      return new Response(
        JSON.stringify({ error: 'Target user not in your ward' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentRole = targetUser.app_metadata?.role;

    // If changing FROM bishopric, check if this is the last Bishopric user
    if (currentRole === 'bishopric' && input.newRole !== 'bishopric') {
      // Count Bishopric users in ward via RPC (avoids full-scan of auth.users)
      const { data: wardUsers, error: rpcError } = await supabaseAdmin
        .rpc('list_ward_users', { target_ward_id: wardId });

      if (rpcError) {
        console.error('list_ward_users RPC error:', rpcError);
        return new Response(
          JSON.stringify({ error: 'Failed to check ward users' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const bishopricCount = (wardUsers || []).filter(
        (u: { role: string }) => u.role === 'bishopric'
      ).length;

      if (bishopricCount <= 1) {
        return new Response(
          JSON.stringify({ error: 'cannot_demote_last_bishopric' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update user's role in app_metadata
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      input.targetUserId,
      {
        app_metadata: {
          ...targetUser.app_metadata,
          role: input.newRole,
        },
      }
    );

    if (updateError) {
      console.error('Role update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update user role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auto-create meeting actor when changing TO bishopric (best-effort)
    if (input.newRole === 'bishopric') {
      try {
        // Use full_name from app_metadata when available, fall back to email prefix
        const fullName = targetUser.app_metadata?.full_name;
        const actorName = fullName
          ? fullName.trim()
          : (targetUser.email ?? '')
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
        console.error('Auto-actor creation on role change failed:', actorErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        previousRole: currentRole,
        newRole: input.newRole,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

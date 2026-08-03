// Edge Function: delete-user
// Hard deletes a user from Supabase Auth.
// Self-deletion: any role allowed (ADR-061). Last-member detection via paginated listUsers (ADR-062).
// Non-self deletion: requires Bishopric role (settings:users permission).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface DeleteUserInput {
  targetUserId: string;
}

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

    // Parse body before role check (ADR-061)
    const input: DeleteUserInput = await req.json();

    // Validate required fields
    if (!input.targetUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: targetUserId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (input.targetUserId === caller.id) {
      // Self-deletion: any role allowed (ADR-061)
      // Count ward members using paginated listUsers (ADR-062)
      let wardMemberCount = 0;
      let page = 1;
      while (true) {
        const { data: { users: pageUsers }, error } =
          await supabaseAdmin.auth.admin.listUsers({ page, perPage: 50 });
        if (error) throw error;
        wardMemberCount += pageUsers.filter(
          (u: any) => u.app_metadata?.ward_id === wardId
        ).length;
        if (pageUsers.length < 50) break;
        page++;
      }

      if (wardMemberCount === 1) {
        // Last member: delete ward (CASCADE clears all data)
        await supabaseAdmin.from('wards').delete().eq('id', wardId);
      } else {
        // Not last member: delete push tokens only
        await supabaseAdmin.from('device_push_tokens').delete()
          .eq('user_id', caller.id);
      }

      // Delete auth user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(caller.id);
      if (deleteError) {
        console.error('Self-deletion error:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to delete user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, deletedUserId: caller.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Non-self deletion: requires the settings:users permission, which the client's
      // PERMISSIONS_MAP grants to bishopric AND secretary. This list must stay in step with that
      // map and with the other user-management functions (update-user-role, create-invitation,
      // list-users), which already allow both: a role that can grant and revoke roles, and can
      // invite, but cannot remove, produced a "Delete user" button that always failed.
      const ALLOWED_ROLES = ['bishopric', 'secretary'];
      if (!ALLOWED_ROLES.includes(callerRole)) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions' }),
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

      // Clean up: remove push tokens for the user
      await supabaseAdmin
        .from('device_push_tokens')
        .delete()
        .eq('user_id', input.targetUserId);

      // Hard delete from Supabase Auth
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
        input.targetUserId
      );

      if (deleteError) {
        console.error('User deletion error:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to delete user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          deletedUserId: input.targetUserId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

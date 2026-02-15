// Edge Function: list-users
// Lists all users in the caller's ward with email and role.
// Requires JWT with Bishopric role (settings:users permission).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface WardUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
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

    // Check permission: only Bishopric can list users
    if (userRole !== 'bishopric') {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // List all auth users, filter by ward_id in app_metadata
    // Supabase Admin API returns paginated users; fetch all pages
    const wardUsers: WardUser[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (listError) {
        console.error('List users error:', listError);
        return new Response(
          JSON.stringify({ error: 'Failed to list users' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Filter users belonging to this ward
      for (const u of users) {
        if (u.app_metadata?.ward_id === wardId) {
          wardUsers.push({
            id: u.id,
            email: u.email ?? '',
            role: u.app_metadata?.role ?? 'observer',
            created_at: u.created_at,
          });
        }
      }

      // If we got fewer than perPage, we've reached the end
      if (users.length < perPage) {
        break;
      }
      page++;
    }

    // Sort by creation date (oldest first)
    wardUsers.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return new Response(
      JSON.stringify({ users: wardUsers }),
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

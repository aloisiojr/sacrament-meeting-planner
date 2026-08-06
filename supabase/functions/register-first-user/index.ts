// Edge Function: register-first-user
// Creates a ward and its first user (Bishopric or Secretary).
// Also creates the default "Temas da Ala" collection config.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface RegisterInput {
  email: string;
  password: string;
  stakeName: string;
  wardName: string;
  role: 'bishopric' | 'secretary';
  language: string;
  timezone: string;
  fullName: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const input: RegisterInput = await req.json();

    // Validate required fields
    if (!input.email || !input.password || !input.stakeName || !input.wardName || !input.role) {
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

    // Validate role (only Bishopric and Secretary allowed for self-registration)
    if (input.role !== 'bishopric' && input.role !== 'secretary') {
      return new Response(
        JSON.stringify({ error: 'Invalid role. Only bishopric and secretary allowed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate password length
    if (input.password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if stake+ward combination already exists
    const { data: existingWard } = await supabaseAdmin
      .from('wards')
      .select('id')
      .eq('stake_name', input.stakeName)
      .eq('name', input.wardName)
      .maybeSingle();

    if (existingWard) {
      return new Response(
        JSON.stringify({ error: 'stake_ward_exists' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the ward
    const wardLanguage = input.language || 'en-US';

    const { data: ward, error: wardError } = await supabaseAdmin
      .from('wards')
      .insert({
        name: input.wardName,
        stake_name: input.stakeName,
        language: wardLanguage,
        timezone: input.timezone || 'America/Sao_Paulo',
        // The whatsapp_template_* columns are deliberately left NULL. Seeding them would bake a
        // copy of the wording into the deployed function, and that copy silently goes stale the
        // first time the app's text changes without a redeploy. NULL means the app's own default
        // is the single source; whatsapp_template_delegation_wrapper has worked this way all along.
      })
      .select()
      .single();

    if (wardError) {
      console.error('Ward creation error:', wardError);
      return new Response(
        JSON.stringify({ error: 'Failed to create ward' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert default ward topics
    const defaultTopicTitles: Record<string, string[]> = {
      'pt-BR': ['Tema livre', 'Seu testemunho'],
      'en-US': ['Open Topic', 'Your Testimony'],
      'es-LA': ['Tema libre', 'Tu testimonio'],
    };
    const topicTitles = defaultTopicTitles[wardLanguage] ?? defaultTopicTitles['en-US'];
    await supabaseAdmin
      .from('ward_topics')
      .insert(topicTitles.map(title => ({
        ward_id: ward.id,
        title,
        is_default: true,
      })));

    // Create the user with app_metadata
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      app_metadata: {
        ward_id: ward.id,
        role: input.role,
        full_name: input.fullName.trim(),
      },
      user_metadata: {
        language: wardLanguage,
      },
    });

    if (authError) {
      // Clean up ward if user creation fails
      await supabaseAdmin.from('wards').delete().eq('id', ward.id);

      if (authError.message.includes('already been registered') ||
          authError.message.includes('already exists')) {
        return new Response(
          JSON.stringify({ error: 'email_exists' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.error('User creation error:', authError);
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // v2: no per-ward collection seeding. Migration 043 dropped ward_collection_config — every
    // general collection is always available and the topic list simply refetches for the ward's
    // locale. The seeding block that used to be here queried general_collections and inserted into
    // a table that no longer exists, so on every ward creation it logged an error and did nothing.

    // v2: the old "auto-create bishopric presider actor" step was removed with meeting_actors.
    // Presiders now come from members with can_preside (managed in the People picker).

    // Sign in the new user to get a session
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (signInError) {
      console.error('Auto sign-in error:', signInError);
      return new Response(
        JSON.stringify({
          user: authData.user,
          ward,
          session: null,
          message: 'User created but auto-login failed. Please log in manually.',
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        user: authData.user,
        ward,
        session: signInData.session,
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

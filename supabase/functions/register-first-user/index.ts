// Edge Function: register-first-user
// Creates a ward and its first user (Bishopric or Secretary).
// Also creates the default "Temas da Ala" collection config.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// CORS `*` is kept by decision (CONF-12, specs/cutover-gate.md): the mobile app sends no
// Origin, so CORS is not the protection on this endpoint — auth (where present), the rate
// limit below, and validation are. The helpers here are duplicated in the other public
// functions: the repo has no supabase/functions/_shared/ and its pattern is minimal,
// consistent duplication per function (cf. cronSecretOk).
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

// Writer roles allowed to self-register. Deno cannot import src/lib/permissions.ts
// (WRITER_ROLES), so this literal is pinned by security-perms-concordance.test.ts.
const ALLOWED_ROLES = ['bishopric', 'secretary'];

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
    const missing = missingEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
    if (missing) return envErrorResponse(missing);

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
    if (!ALLOWED_ROLES.includes(input.role)) {
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

    const limited = await rateLimitResponse(supabaseAdmin, req, 'register-first-user', input.email);
    if (limited) return limited;

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

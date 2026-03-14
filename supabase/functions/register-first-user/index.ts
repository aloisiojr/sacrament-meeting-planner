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
    const wardLanguage = input.language || 'pt-BR';

    // CR-231: Per-position default speech templates (3 per language)
    // CR-248: Add {nome} placeholder, update text, add prayer templates
    let defaultSpeech1Template: string;
    let defaultSpeech2Template: string;
    let defaultSpeech3Template: string;
    let defaultOpeningPrayerTemplate: string;
    let defaultClosingPrayerTemplate: string;

    switch (wardLanguage) {
      case 'en-US':
        defaultSpeech1Template = 'Hi {nome}, how are you? The Bishopric would like to invite you to give the 1st speech on Sunday {data}! You will speak for 5 minutes about "{titulo}" {link}.\n\nCan we confirm your speech?';
        defaultSpeech2Template = 'Hi {nome}, how are you? The Bishopric would like to invite you to give the 2nd speech on Sunday {data}! You will speak for 7-10 minutes about "{titulo}" {link}.\n\nCan we confirm your speech?';
        defaultSpeech3Template = 'Hi {nome}, how are you? The Bishopric would like to invite you to give the 3rd speech on Sunday {data}! You will speak for 15-20 minutes about "{titulo}" {link}.\n\nCan we confirm your speech?';
        defaultOpeningPrayerTemplate = 'Hi {nome}, you have been assigned to give the opening prayer at Sacrament Meeting on {data}.\n\nCan we count on you?';
        defaultClosingPrayerTemplate = 'Hi {nome}, you have been assigned to give the closing prayer at Sacrament Meeting on {data}.\n\nCan we count on you?';
        break;
      case 'es-LA':
        defaultSpeech1Template = 'Hola {nome}, ¿cómo estás? El Obispado te quiere invitar a dar el 1er discurso el domingo {data}! Hablarás por 5 minutos sobre "{titulo}" {link}.\n\n¿Podemos confirmar tu discurso?';
        defaultSpeech2Template = 'Hola {nome}, ¿cómo estás? El Obispado te quiere invitar a dar el 2do discurso el domingo {data}! Hablarás por 7-10 minutos sobre "{titulo}" {link}.\n\n¿Podemos confirmar tu discurso?';
        defaultSpeech3Template = 'Hola {nome}, ¿cómo estás? El Obispado te quiere invitar a dar el 3er discurso el domingo {data}! Hablarás por 15-20 minutos sobre "{titulo}" {link}.\n\n¿Podemos confirmar tu discurso?';
        defaultOpeningPrayerTemplate = 'Hola {nome}, has sido asignado(a) para hacer la oración de apertura de la Reunión Sacramental del día {data}.\n\n¿Podemos contar contigo?';
        defaultClosingPrayerTemplate = 'Hola {nome}, has sido asignado(a) para hacer la oración de clausura de la Reunión Sacramental del día {data}.\n\n¿Podemos contar contigo?';
        break;
      case 'pt-BR':
      default:
        defaultSpeech1Template = 'Oi {nome}, tudo bom? O Bispado gostaria de te convidar para fazer o 1º discurso no domingo dia {data}! Você falará por 5 minutos sobre "{titulo}" {link}.\n\nPodemos confirmar o seu discurso?';
        defaultSpeech2Template = 'Oi {nome}, tudo bom? O Bispado gostaria de te convidar para fazer o 2º discurso no domingo dia {data}! Você falará por 7-10 minutos sobre "{titulo}" {link}.\n\nPodemos confirmar o seu discurso?';
        defaultSpeech3Template = 'Oi {nome}, tudo bom? O Bispado gostaria de te convidar para fazer o 3º discurso no domingo dia {data}! Você falará por 15-20 minutos sobre "{titulo}" {link}.\n\nPodemos confirmar o seu discurso?';
        defaultOpeningPrayerTemplate = 'Oi {nome}, você foi designado(a) para fazer a oração de abertura da Reunião Sacramental do dia {data}.\n\nPodemos contar com você?';
        defaultClosingPrayerTemplate = 'Oi {nome}, você foi designado(a) para fazer a oração de encerramento da Reunião Sacramental do dia {data}.\n\nPodemos contar com você?';
        break;
    }

    const { data: ward, error: wardError } = await supabaseAdmin
      .from('wards')
      .insert({
        name: input.wardName,
        stake_name: input.stakeName,
        language: wardLanguage,
        timezone: input.timezone || 'America/Sao_Paulo',
        whatsapp_template_speech_1: defaultSpeech1Template,
        whatsapp_template_speech_2: defaultSpeech2Template,
        whatsapp_template_speech_3: defaultSpeech3Template,
        whatsapp_template_opening_prayer: defaultOpeningPrayerTemplate,
        whatsapp_template_closing_prayer: defaultClosingPrayerTemplate,
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

    // Create ward_collection_config entries for all general collections
    // matching the ward's language.
    // "For the Strength of Youth", "Gospel Principles", and the latest
    // general conference collection are active by default.
    const { data: generalCollections } = await supabaseAdmin
      .from('general_collections')
      .select('id, name')
      .eq('language', input.language || 'pt-BR');

    if (generalCollections && generalCollections.length > 0) {
      // Collections that should be active by default (per language)
      const defaultActiveNames: Record<string, Set<string>> = {
        'pt-BR': new Set(['Para a Forca da Juventude', 'Principios do Evangelho']),
        'en-US': new Set(['For the Strength of Youth', 'Gospel Principles']),
        'es-LA': new Set(['Para la Fortaleza de la Juventud', 'Principios del Evangelio']),
      };
      const knownNames = new Set([
        'Temas Especiais', 'Para a Forca da Juventude', 'Principios do Evangelho',
        'Special Topics', 'For the Strength of Youth', 'Gospel Principles',
        'Temas Especiales', 'Para la Fortaleza de la Juventud', 'Principios del Evangelio',
      ]);
      const activeNames = defaultActiveNames[wardLanguage] ?? defaultActiveNames['pt-BR'];

      // Find the latest conference collection (not in knownNames, highest name = newest)
      const conferenceCollections = generalCollections
        .filter((col: { id: string; name: string }) => !knownNames.has(col.name))
        .sort((a: { name: string }, b: { name: string }) => b.name.localeCompare(a.name));
      const latestConferenceId = conferenceCollections.length > 0 ? conferenceCollections[0].id : null;

      const configEntries = generalCollections.map((col: { id: string; name: string }) => ({
        ward_id: ward.id,
        collection_id: col.id,
        active: activeNames.has(col.name) || col.id === latestConferenceId,
      }));

      const { error: configError } = await supabaseAdmin
        .from('ward_collection_config')
        .insert(configEntries);

      if (configError) {
        console.error('ward_collection_config creation error:', configError);
        // Non-fatal: ward and user are created, collections can be configured later
      }
    }

    // Auto-create meeting actor for bishopric role (best-effort)
    if (input.role === 'bishopric') {
      try {
        const actorName = input.fullName.trim();

        // Check if actor with same name already exists
        const { data: existing } = await supabaseAdmin
          .from('meeting_actors')
          .select('id, role')
          .eq('ward_id', ward.id)
          .ilike('name', actorName)
          .maybeSingle();

        if (!existing) {
          await supabaseAdmin
            .from('meeting_actors')
            .insert({
              ward_id: ward.id,
              name: actorName,
              role: 'preside',
            });
        }
      } catch (actorErr) {
        console.error('Auto-actor creation failed:', actorErr);
        // Best-effort: do not fail registration
      }
    }

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

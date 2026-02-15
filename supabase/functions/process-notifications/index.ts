/**
 * process-notifications: Supabase Edge Function (cron every 1 minute).
 * Processes pending notification_queue entries where send_after <= now().
 * Groups designation entries by (ward_id, sunday_date).
 * Sends via Expo Push API. Handles invalid tokens.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface NotificationQueueEntry {
  id: string;
  ward_id: string;
  type: string;
  sunday_date: string;
  speech_position: number | null;
  speaker_name: string | null;
  target_role: string;
  status: string;
  send_after: string;
}

interface WardInfo {
  language: string;
  timezone: string;
}

interface PushToken {
  expo_push_token: string;
  user_id: string;
}

// --- Ordinals ---

const ORDINALS: Record<string, Record<number, string>> = {
  'pt-BR': { 1: '1\u00BA', 2: '2\u00BA', 3: '3\u00BA' },
  en: { 1: '1st', 2: '2nd', 3: '3rd' },
  es: { 1: '1er', 2: '2do', 3: '3er' },
};

function getOrdinal(position: number, language: string): string {
  return ORDINALS[language]?.[position] ?? `${position}`;
}

function formatNameList(names: string[], language: string): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  const conjunction = language === 'en' ? ' and ' : language === 'es' ? ' y ' : ' e ';
  if (names.length === 2) return names.join(conjunction);
  const allButLast = names.slice(0, -1).join(', ');
  return `${allButLast}${conjunction}${names[names.length - 1]}`;
}

// --- Notification Text Builders ---

function buildDesignationText(
  language: string,
  names: string[],
  date: string
): { title: string; body: string } {
  const nameList = formatNameList(names, language);
  const texts: Record<string, { title: string; body: string }> = {
    'pt-BR': {
      title: 'Designação de Discurso',
      body: `${nameList} ${names.length > 1 ? 'foram designados' : 'foi designado(a)'} para discursar em ${date}. Hora de enviar o convite!`,
    },
    en: {
      title: 'Speech Assignment',
      body: `${nameList} ${names.length > 1 ? 'were assigned' : 'was assigned'} to speak on ${date}. Time to send the invitation!`,
    },
    es: {
      title: 'Asignación de Discurso',
      body: `${nameList} ${names.length > 1 ? 'fueron asignados' : 'fue asignado(a)'} para hablar el ${date}. ¡Es hora de enviar la invitación!`,
    },
  };
  return texts[language] ?? texts['pt-BR'];
}

function buildWeeklyText(language: string): { title: string; body: string } {
  const texts: Record<string, { title: string; body: string }> = {
    'pt-BR': {
      title: 'Lembrete de Discurso',
      body: 'Ainda há oradores para serem designados para o próximo domingo!',
    },
    en: {
      title: 'Speech Reminder',
      body: 'There are still speakers to be assigned for next Sunday!',
    },
    es: {
      title: 'Recordatorio de Discurso',
      body: '¡Aún hay oradores por asignar para el próximo domingo!',
    },
  };
  return texts[language] ?? texts['pt-BR'];
}

function buildConfirmedText(
  language: string,
  name: string,
  position: number,
  date: string
): { title: string; body: string } {
  const ordinal = getOrdinal(position, language);
  const texts: Record<string, { title: string; body: string }> = {
    'pt-BR': {
      title: 'Orador Confirmado',
      body: `${name} foi confirmado(a) para o ${ordinal} discurso em ${date}.`,
    },
    en: {
      title: 'Speaker Confirmed',
      body: `${name} has been confirmed to give the ${ordinal} speech on ${date}.`,
    },
    es: {
      title: 'Orador Confirmado',
      body: `${name} fue confirmado(a) para el ${ordinal} discurso el ${date}.`,
    },
  };
  return texts[language] ?? texts['pt-BR'];
}

function buildWithdrewText(
  language: string,
  name: string,
  position: number,
  date: string
): { title: string; body: string } {
  const ordinal = getOrdinal(position, language);
  const texts: Record<string, { title: string; body: string }> = {
    'pt-BR': {
      title: 'ATENÇÃO! Desistência',
      body: `ATENÇÃO! ${name} NÃO poderá proferir o ${ordinal} discurso em ${date}. Designe outro orador!`,
    },
    en: {
      title: 'ATTENTION! Speaker Withdrew',
      body: `ATTENTION! ${name} will NOT be able to give the ${ordinal} speech on ${date}. Assign another speaker!`,
    },
    es: {
      title: '¡ATENCIÓN! Desistimiento',
      body: `¡ATENCIÓN! ${name} NO podrá dar el ${ordinal} discurso el ${date}. ¡Asigne otro orador!`,
    },
  };
  return texts[language] ?? texts['pt-BR'];
}

// --- Main Handler ---

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch pending notifications where send_after <= now
    const { data: pending, error: fetchError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('send_after', new Date().toISOString())
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;
    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const entries = pending as NotificationQueueEntry[];

    // 2. Group designation entries by (ward_id, sunday_date)
    const designationGroups = new Map<string, NotificationQueueEntry[]>();
    const immediateEntries: NotificationQueueEntry[] = [];

    for (const entry of entries) {
      if (entry.type === 'designation') {
        const key = `${entry.ward_id}:${entry.sunday_date}`;
        const group = designationGroups.get(key) ?? [];
        group.push(entry);
        designationGroups.set(key, group);
      } else {
        immediateEntries.push(entry);
      }
    }

    // 3. Process each group/entry
    const processedIds: string[] = [];
    const invalidTokens: string[] = [];

    // Process grouped designations
    for (const [, group] of designationGroups) {
      const wardId = group[0].ward_id;
      const sundayDate = group[0].sunday_date;
      const targetRole = group[0].target_role;
      const names = group
        .map((e) => e.speaker_name)
        .filter((n): n is string => !!n);

      // Get ward language
      const { data: ward } = await supabase
        .from('wards')
        .select('language, timezone')
        .eq('id', wardId)
        .single();

      const language = (ward as WardInfo | null)?.language ?? 'pt-BR';

      // Build notification text
      const { title, body } = buildDesignationText(language, names, sundayDate);

      // Get target tokens
      const tokens = await getTargetTokens(supabase, wardId, targetRole);

      // Send push
      const failed = await sendPush(tokens, title, body);
      invalidTokens.push(...failed);

      processedIds.push(...group.map((e) => e.id));
    }

    // Process immediate entries
    for (const entry of immediateEntries) {
      const { data: ward } = await supabase
        .from('wards')
        .select('language, timezone')
        .eq('id', entry.ward_id)
        .single();

      const language = (ward as WardInfo | null)?.language ?? 'pt-BR';

      let title = '';
      let body = '';

      switch (entry.type) {
        case 'weekly_assignment':
        case 'weekly_confirmation': {
          const text = buildWeeklyText(language);
          title = text.title;
          body = text.body;
          break;
        }
        case 'speaker_confirmed': {
          const text = buildConfirmedText(
            language,
            entry.speaker_name ?? '',
            entry.speech_position ?? 1,
            entry.sunday_date
          );
          title = text.title;
          body = text.body;
          break;
        }
        case 'speaker_withdrew': {
          const text = buildWithdrewText(
            language,
            entry.speaker_name ?? '',
            entry.speech_position ?? 1,
            entry.sunday_date
          );
          title = text.title;
          body = text.body;
          break;
        }
      }

      const tokens = await getTargetTokens(supabase, entry.ward_id, entry.target_role);
      const failed = await sendPush(tokens, title, body);
      invalidTokens.push(...failed);

      processedIds.push(entry.id);
    }

    // 4. Mark processed entries as sent
    if (processedIds.length > 0) {
      await supabase
        .from('notification_queue')
        .update({ status: 'sent' })
        .in('id', processedIds);
    }

    // 5. Remove invalid tokens
    if (invalidTokens.length > 0) {
      await supabase
        .from('device_push_tokens')
        .delete()
        .in('expo_push_token', invalidTokens);
    }

    return new Response(
      JSON.stringify({
        processed: processedIds.length,
        invalidTokensRemoved: invalidTokens.length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// --- Helper Functions ---

async function getTargetTokens(
  supabase: ReturnType<typeof createClient>,
  wardId: string,
  targetRole: string
): Promise<PushToken[]> {
  // Get users with the target role in this ward
  // target_role can be: 'secretary', 'bishopric', 'secretary_and_bishopric'
  const roles: string[] = [];
  if (targetRole === 'secretary' || targetRole === 'secretary_and_bishopric') {
    roles.push('secretary');
  }
  if (targetRole === 'bishopric' || targetRole === 'secretary_and_bishopric') {
    roles.push('bishopric');
  }

  // Get all tokens for the ward
  const { data: tokens } = await supabase
    .from('device_push_tokens')
    .select('expo_push_token, user_id')
    .eq('ward_id', wardId);

  if (!tokens || tokens.length === 0) return [];

  // Filter by user role (check auth.users app_metadata)
  // In Supabase, we can use the admin API to check user roles
  const userIds = [...new Set(tokens.map((t) => t.user_id))];
  const validTokens: PushToken[] = [];

  for (const userId of userIds) {
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    const userRole = userData?.user?.app_metadata?.role;
    if (userRole && roles.includes(userRole)) {
      const userTokens = tokens.filter((t) => t.user_id === userId);
      validTokens.push(...userTokens);
    }
  }

  return validTokens;
}

async function sendPush(
  tokens: PushToken[],
  title: string,
  body: string
): Promise<string[]> {
  if (tokens.length === 0 || !title || !body) return [];

  const invalidTokens: string[] = [];

  const messages = tokens.map((t) => ({
    to: t.expo_push_token,
    title,
    body,
    sound: 'default' as const,
    data: { navigateTo: 'home' },
  }));

  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();

    // Check for invalid tokens in the response
    if (result.data && Array.isArray(result.data)) {
      for (let i = 0; i < result.data.length; i++) {
        const ticket = result.data[i];
        if (ticket.status === 'error') {
          if (
            ticket.details?.error === 'DeviceNotRegistered' ||
            ticket.details?.error === 'InvalidCredentials'
          ) {
            invalidTokens.push(tokens[i].expo_push_token);
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to send push notifications:', err);
  }

  return invalidTokens;
}

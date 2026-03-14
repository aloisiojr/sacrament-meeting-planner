/**
 * process-notifications: Supabase Edge Function (cron every 5 minutes).
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
  topic_title: string | null;
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
  'en-US': { 1: '1st', 2: '2nd', 3: '3rd' },
  'es-LA': { 1: '1er', 2: '2do', 3: '3er' },
};

function getOrdinal(position: number, language: string): string {
  return ORDINALS[language]?.[position] ?? `${position}`;
}

function getPrayerLabel(position: number, language: string): string | null {
  const labels: Record<string, Record<number, string>> = {
    'pt-BR': { 0: 'oração de abertura', 4: 'oração de encerramento' },
    'en-US': { 0: 'opening prayer', 4: 'closing prayer' },
    'es-LA': { 0: 'oración de apertura', 4: 'oración de clausura' },
  };
  return labels[language]?.[position] ?? null;
}

function formatNameList(names: string[], language: string): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  const conjunction = language === 'en-US' ? ' and ' : language === 'es-LA' ? ' y ' : ' e ';
  if (names.length === 2) return names.join(conjunction);
  const allButLast = names.slice(0, -1).join(', ');
  return `${allButLast}${conjunction}${names[names.length - 1]}`;
}

// --- Notification Text Builders ---

function buildDesignationText(
  language: string,
  names: string[],
  date: string,
  position?: number | null
): { title: string; body: string } {
  // Prayer-specific text for position 0 (opening) or 4 (closing)
  const prayerLabel = position != null ? getPrayerLabel(position, language) : null;
  if (prayerLabel) {
    const name = names[0] ?? '';
    const texts: Record<string, { title: string; body: string }> = {
      'pt-BR': {
        title: 'Designação de Oração',
        body: `${name} foi designado(a) para a ${prayerLabel} em ${date}. Hora de enviar o convite!`,
      },
      'en-US': {
        title: 'Prayer Assignment',
        body: `${name} was assigned to give the ${prayerLabel} on ${date}. Time to send the invitation!`,
      },
      'es-LA': {
        title: 'Asignación de Oración',
        body: `${name} fue asignado(a) para la ${prayerLabel} el ${date}. ¡Es hora de enviar la invitación!`,
      },
    };
    return texts[language] ?? texts['en-US'];
  }

  // Existing speech text (unchanged)
  const nameList = formatNameList(names, language);
  const texts: Record<string, { title: string; body: string }> = {
    'pt-BR': {
      title: 'Designação de Discurso',
      body: `${nameList} ${names.length > 1 ? 'foram designados' : 'foi designado(a)'} para discursar em ${date}. Hora de enviar o convite!`,
    },
    'en-US': {
      title: 'Speech Assignment',
      body: `${nameList} ${names.length > 1 ? 'were assigned' : 'was assigned'} to speak on ${date}. Time to send the invitation!`,
    },
    'es-LA': {
      title: 'Asignación de Discurso',
      body: `${nameList} ${names.length > 1 ? 'fueron asignados' : 'fue asignado(a)'} para hablar el ${date}. ¡Es hora de enviar la invitación!`,
    },
  };
  return texts[language] ?? texts['en-US'];
}

function buildWeeklyText(language: string): { title: string; body: string } {
  const texts: Record<string, { title: string; body: string }> = {
    'pt-BR': {
      title: 'Lembrete de Discurso',
      body: 'Ainda há oradores para serem designados para o próximo domingo!',
    },
    'en-US': {
      title: 'Speech Reminder',
      body: 'There are still speakers to be assigned for next Sunday!',
    },
    'es-LA': {
      title: 'Recordatorio de Discurso',
      body: '¡Aún hay oradores por asignar para el próximo domingo!',
    },
  };
  return texts[language] ?? texts['en-US'];
}

function buildConfirmedText(
  language: string,
  name: string,
  position: number,
  date: string
): { title: string; body: string } {
  const prayerLabel = getPrayerLabel(position, language);
  if (prayerLabel) {
    const texts: Record<string, { title: string; body: string }> = {
      'pt-BR': {
        title: 'Oração Confirmada',
        body: `${name} foi confirmado(a) para a ${prayerLabel} em ${date}.`,
      },
      'en-US': {
        title: 'Prayer Confirmed',
        body: `${name} has been confirmed to give the ${prayerLabel} on ${date}.`,
      },
      'es-LA': {
        title: 'Oración Confirmada',
        body: `${name} fue confirmado(a) para la ${prayerLabel} el ${date}.`,
      },
    };
    return texts[language] ?? texts['en-US'];
  }
  const ordinal = getOrdinal(position, language);
  const texts: Record<string, { title: string; body: string }> = {
    'pt-BR': {
      title: 'Orador Confirmado',
      body: `${name} foi confirmado(a) para o ${ordinal} discurso em ${date}.`,
    },
    'en-US': {
      title: 'Speaker Confirmed',
      body: `${name} has been confirmed to give the ${ordinal} speech on ${date}.`,
    },
    'es-LA': {
      title: 'Orador Confirmado',
      body: `${name} fue confirmado(a) para el ${ordinal} discurso el ${date}.`,
    },
  };
  return texts[language] ?? texts['en-US'];
}

function buildWithdrewText(
  language: string,
  name: string,
  position: number,
  date: string
): { title: string; body: string } {
  const prayerLabel = getPrayerLabel(position, language);
  if (prayerLabel) {
    const texts: Record<string, { title: string; body: string }> = {
      'pt-BR': {
        title: 'ATENÇÃO! Desistência de Oração',
        body: `ATENÇÃO! ${name} NÃO poderá fazer a ${prayerLabel} em ${date}. Designe outra pessoa!`,
      },
      'en-US': {
        title: 'ATTENTION! Prayer Withdrew',
        body: `ATTENTION! ${name} will NOT be able to give the ${prayerLabel} on ${date}. Assign someone else!`,
      },
      'es-LA': {
        title: '¡ATENCIÓN! Desistimiento de Oración',
        body: `¡ATENCIÓN! ${name} NO podrá hacer la ${prayerLabel} el ${date}. ¡Asigne a otra persona!`,
      },
    };
    return texts[language] ?? texts['en-US'];
  }
  const ordinal = getOrdinal(position, language);
  const texts: Record<string, { title: string; body: string }> = {
    'pt-BR': {
      title: 'ATENÇÃO! Desistência',
      body: `ATENÇÃO! ${name} NÃO poderá proferir o ${ordinal} discurso em ${date}. Designe outro orador!`,
    },
    'en-US': {
      title: 'ATTENTION! Speaker Withdrew',
      body: `ATTENTION! ${name} will NOT be able to give the ${ordinal} speech on ${date}. Assign another speaker!`,
    },
    'es-LA': {
      title: '¡ATENCIÓN! Desistimiento',
      body: `¡ATENCIÓN! ${name} NO podrá dar el ${ordinal} discurso el ${date}. ¡Asigne otro orador!`,
    },
  };
  return texts[language] ?? texts['en-US'];
}

function buildSecretaryReviewText(
  language: string,
  speakerName: string,
  position: number,
  date: string,
  topicTitle?: string
): { title: string; body: string } {
  const ordinal = getOrdinal(position, language);

  if (topicTitle) {
    // Topic review variant
    const texts: Record<string, { title: string; body: string }> = {
      'pt-BR': {
        title: 'Revis\u00e3o de Designa\u00e7\u00e3o',
        body: `Aten\u00e7\u00e3o: o secret\u00e1rio designou o tema ${topicTitle} para ${speakerName} no dia ${date}. Revise a designa\u00e7\u00e3o.`,
      },
      'en-US': {
        title: 'Assignment Review',
        body: `Attention: the secretary assigned the topic ${topicTitle} to ${speakerName} on ${date}. Review the assignment.`,
      },
      'es-LA': {
        title: 'Revisi\u00f3n de Asignaci\u00f3n',
        body: `Atenci\u00f3n: el secretario asign\u00f3 el tema ${topicTitle} a ${speakerName} el ${date}. Revise la asignaci\u00f3n.`,
      },
    };
    return texts[language] ?? texts['en-US'];
  }

  // Speaker review variant
  const texts: Record<string, { title: string; body: string }> = {
    'pt-BR': {
      title: 'Revis\u00e3o de Designa\u00e7\u00e3o',
      body: `Aten\u00e7\u00e3o: o secret\u00e1rio designou ${speakerName} para o ${ordinal} discurso do dia ${date}. Revise a designa\u00e7\u00e3o.`,
    },
    'en-US': {
      title: 'Assignment Review',
      body: `Attention: the secretary assigned ${speakerName} to the ${ordinal} speech on ${date}. Review the assignment.`,
    },
    'es-LA': {
      title: 'Revisi\u00f3n de Asignaci\u00f3n',
      body: `Atenci\u00f3n: el secretario asign\u00f3 a ${speakerName} para el ${ordinal} discurso del ${date}. Revise la asignaci\u00f3n.`,
    },
  };
  return texts[language] ?? texts['en-US'];
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

    // Ward cache: batch fetch all unique wards (ADR-031)
    const wardIds = [...new Set(entries.map((e) => e.ward_id))];
    const { data: wards } = await supabase
      .from('wards')
      .select('id, language, timezone')
      .in('id', wardIds);

    const wardCache = new Map<string, WardInfo>();
    (wards ?? []).forEach((w: { id: string; language: string; timezone: string }) =>
      wardCache.set(w.id, { language: w.language, timezone: w.timezone })
    );

    // 2. Group designation entries by (ward_id, sunday_date)
    const designationGroups = new Map<string, NotificationQueueEntry[]>();
    const immediateEntries: NotificationQueueEntry[] = [];

    for (const entry of entries) {
      if (entry.type === 'designation') {
        if (entry.speech_position === 0 || entry.speech_position === 4) {
          // Prayer: process individually (like confirmed/withdrew)
          immediateEntries.push(entry);
        } else {
          // Speech: group by (ward_id, sunday_date)
          const key = `${entry.ward_id}:${entry.sunday_date}`;
          const group = designationGroups.get(key) ?? [];
          group.push(entry);
          designationGroups.set(key, group);
        }
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

      // Get ward language from cache
      const ward = wardCache.get(wardId);
      const language = ward?.language ?? 'en-US';

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
      const ward = wardCache.get(entry.ward_id);
      const language = ward?.language ?? 'en-US';

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
        case 'designation': {
          const text = buildDesignationText(
            language,
            [entry.speaker_name ?? ''],
            entry.sunday_date,
            entry.speech_position
          );
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
        case 'secretary_review': {
          const text = buildSecretaryReviewText(
            language,
            entry.speaker_name ?? '',
            entry.speech_position ?? 1,
            entry.sunday_date,
            entry.topic_title ?? undefined
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

    // 6. Cleanup: delete processed entries older than 7 days
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      await supabase
        .from('notification_queue')
        .delete()
        .in('status', ['sent', 'cancelled'])
        .lt('created_at', sevenDaysAgo);
    } catch (cleanupErr) {
      console.error('Notification queue cleanup error:', cleanupErr);
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
  // Build roles array from targetRole
  // target_role can be: 'secretary', 'bishopric', 'secretary_and_bishopric'
  const roles: string[] = [];
  if (targetRole === 'secretary' || targetRole === 'secretary_and_bishopric') {
    roles.push('secretary');
  }
  if (targetRole === 'bishopric' || targetRole === 'secretary_and_bishopric') {
    roles.push('bishopric');
  }

  // Single query filtering by role in SQL (ADR-030: no getUserById loop)
  const { data: tokens } = await supabase
    .from('device_push_tokens')
    .select('expo_push_token, user_id')
    .eq('ward_id', wardId)
    .in('role', roles);

  return (tokens as PushToken[] | null) ?? [];
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

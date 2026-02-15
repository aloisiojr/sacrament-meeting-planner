/**
 * Pure utility functions for push notification text building.
 * Separated from hooks for testability (no react-native dependencies).
 */

// --- Types ---

export type OrdinalLanguage = 'pt-BR' | 'en' | 'es';

// --- Ordinals ---

const ORDINALS: Record<OrdinalLanguage, Record<number, string>> = {
  'pt-BR': { 1: '1\u00BA', 2: '2\u00BA', 3: '3\u00BA' },
  en: { 1: '1st', 2: '2nd', 3: '3rd' },
  es: { 1: '1er', 2: '2do', 3: '3er' },
};

/**
 * Get ordinal string for speech position in given language.
 */
export function getOrdinal(position: number, language: OrdinalLanguage): string {
  return ORDINALS[language]?.[position] ?? `${position}`;
}

/**
 * Format a list of names for display: "A", "A and B", "A, B and C".
 */
export function formatNameList(names: string[], language: OrdinalLanguage): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];

  const conjunction = language === 'en' ? ' and ' : language === 'es' ? ' y ' : ' e ';
  if (names.length === 2) return names.join(conjunction);

  const allButLast = names.slice(0, -1).join(', ');
  return `${allButLast}${conjunction}${names[names.length - 1]}`;
}

/**
 * Build notification text for the 5 notification cases.
 */
export function buildNotificationText(
  type: string,
  language: OrdinalLanguage,
  data: {
    names?: string[];
    date?: string;
    position?: number;
    name?: string;
  }
): { title: string; body: string } {
  const texts: Record<OrdinalLanguage, Record<string, (d: typeof data) => { title: string; body: string }>> = {
    'pt-BR': {
      designation: (d) => {
        const nameList = formatNameList(d.names ?? [], language);
        const verb = (d.names?.length ?? 0) > 1 ? 'foram designados' : 'foi designado(a)';
        return {
          title: 'Designação de Discurso',
          body: `${nameList} ${verb} para discursar em ${d.date}. Hora de enviar o convite!`,
        };
      },
      weekly_assignment: () => ({
        title: 'Lembrete de Discurso',
        body: 'Ainda há oradores para serem designados para o próximo domingo!',
      }),
      weekly_confirmation: () => ({
        title: 'Lembrete de Discurso',
        body: 'Ainda há oradores para serem designados para o próximo domingo!',
      }),
      speaker_confirmed: (d) => ({
        title: 'Orador Confirmado',
        body: `${d.name} foi confirmado(a) para o ${getOrdinal(d.position ?? 1, language)} discurso em ${d.date}.`,
      }),
      speaker_withdrew: (d) => ({
        title: 'ATENÇÃO! Desistência',
        body: `ATENÇÃO! ${d.name} NÃO poderá proferir o ${getOrdinal(d.position ?? 1, language)} discurso em ${d.date}. Designe outro orador!`,
      }),
    },
    en: {
      designation: (d) => {
        const nameList = formatNameList(d.names ?? [], language);
        const verb = (d.names?.length ?? 0) > 1 ? 'were assigned' : 'was assigned';
        return {
          title: 'Speech Assignment',
          body: `${nameList} ${verb} to speak on ${d.date}. Time to send the invitation!`,
        };
      },
      weekly_assignment: () => ({
        title: 'Speech Reminder',
        body: 'There are still speakers to be assigned for next Sunday!',
      }),
      weekly_confirmation: () => ({
        title: 'Speech Reminder',
        body: 'There are still speakers to be assigned for next Sunday!',
      }),
      speaker_confirmed: (d) => ({
        title: 'Speaker Confirmed',
        body: `${d.name} has been confirmed to give the ${getOrdinal(d.position ?? 1, language)} speech on ${d.date}.`,
      }),
      speaker_withdrew: (d) => ({
        title: 'ATTENTION! Speaker Withdrew',
        body: `ATTENTION! ${d.name} will NOT be able to give the ${getOrdinal(d.position ?? 1, language)} speech on ${d.date}. Assign another speaker!`,
      }),
    },
    es: {
      designation: (d) => {
        const nameList = formatNameList(d.names ?? [], language);
        const verb = (d.names?.length ?? 0) > 1 ? 'fueron asignados' : 'fue asignado(a)';
        return {
          title: 'Asignación de Discurso',
          body: `${nameList} ${verb} para hablar el ${d.date}. ¡Es hora de enviar la invitación!`,
        };
      },
      weekly_assignment: () => ({
        title: 'Recordatorio de Discurso',
        body: '¡Aún hay oradores por asignar para el próximo domingo!',
      }),
      weekly_confirmation: () => ({
        title: 'Recordatorio de Discurso',
        body: '¡Aún hay oradores por asignar para el próximo domingo!',
      }),
      speaker_confirmed: (d) => ({
        title: 'Orador Confirmado',
        body: `${d.name} fue confirmado(a) para el ${getOrdinal(d.position ?? 1, language)} discurso el ${d.date}.`,
      }),
      speaker_withdrew: (d) => ({
        title: '¡ATENCIÓN! Desistimiento',
        body: `¡ATENCIÓN! ${d.name} NO podrá dar el ${getOrdinal(d.position ?? 1, language)} discurso el ${d.date}. ¡Asigne otro orador!`,
      }),
    },
  };

  const langTexts = texts[language] ?? texts['pt-BR'];
  const builder = langTexts[type];
  if (!builder) {
    return { title: '', body: '' };
  }
  return builder(data);
}

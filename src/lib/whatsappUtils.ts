/**
 * WhatsApp URL building utilities (pure functions, no React Native deps).
 * Template placeholders: {nome} (full name), {nome informal}, {data}, {colecao}, {titulo}, {link}
 */

// --- Default Speech Templates (3 positions x 3 languages) ---

export const DEFAULT_TEMPLATE_SPEECH_1_PT_BR =
  'Olá {nome informal}, tudo bom! O Bispado gostaria de te convidar para fazer o primeiro discurso no domingo dia {data}! Você falará sobre um tema da {colecao} com o título "{titulo}" {link}. Podemos confirmar o seu discurso?';

export const DEFAULT_TEMPLATE_SPEECH_2_PT_BR =
  'Olá {nome informal}, tudo bom! O Bispado gostaria de te convidar para fazer o segundo discurso no domingo dia {data}! Você falará sobre um tema da {colecao} com o título "{titulo}" {link}. Podemos confirmar o seu discurso?';

export const DEFAULT_TEMPLATE_SPEECH_3_PT_BR =
  'Olá {nome informal}, tudo bom! O Bispado gostaria de te convidar para fazer o terceiro discurso no domingo dia {data}! Você falará sobre um tema da {colecao} com o título "{titulo}" {link}. Podemos confirmar o seu discurso?';

export const DEFAULT_TEMPLATE_SPEECH_1_EN =
  'Hi {nome informal}! The Bishopric would like to invite you to give the first speech on Sunday {data}! You will speak about a topic from {colecao} titled "{titulo}" {link}. Can we confirm your speech?';

export const DEFAULT_TEMPLATE_SPEECH_2_EN =
  'Hi {nome informal}! The Bishopric would like to invite you to give the second speech on Sunday {data}! You will speak about a topic from {colecao} titled "{titulo}" {link}. Can we confirm your speech?';

export const DEFAULT_TEMPLATE_SPEECH_3_EN =
  'Hi {nome informal}! The Bishopric would like to invite you to give the third speech on Sunday {data}! You will speak about a topic from {colecao} titled "{titulo}" {link}. Can we confirm your speech?';

export const DEFAULT_TEMPLATE_SPEECH_1_ES =
  'Hola {nome informal}, como estas? El Obispado te quiere invitar a dar el primer discurso el domingo {data}! Hablaras sobre un tema de {colecao} con el titulo "{titulo}" {link}. Podemos confirmar tu discurso?';

export const DEFAULT_TEMPLATE_SPEECH_2_ES =
  'Hola {nome informal}, como estas? El Obispado te quiere invitar a dar el segundo discurso el domingo {data}! Hablaras sobre un tema de {colecao} con el titulo "{titulo}" {link}. Podemos confirmar tu discurso?';

export const DEFAULT_TEMPLATE_SPEECH_3_ES =
  'Hola {nome informal}, como estas? El Obispado te quiere invitar a dar el tercer discurso el domingo {data}! Hablaras sobre un tema de {colecao} con el titulo "{titulo}" {link}. Podemos confirmar tu discurso?';

// --- Default Prayer Templates ---

export const DEFAULT_OPENING_PRAYER_TEMPLATE_PT_BR =
  'Olá {nome informal}, você foi designado(a) para fazer a oração de abertura na Reunião Sacramental do dia {data}. Para ajudar na reverência, pedimos que você chegue 15min antes do início da reunião e se sente junto com o bispado ao púlpito. Podemos contar com você?';

export const DEFAULT_OPENING_PRAYER_TEMPLATE_EN =
  'Hello {nome informal}, you have been assigned to give the opening prayer at the Sacrament Meeting on {data}. To help with reverence, we kindly ask you to arrive 15 minutes early and sit with the bishopric at the pulpit. Can we count on you?';

export const DEFAULT_OPENING_PRAYER_TEMPLATE_ES =
  'Hola {nome informal}, has sido designado(a) para hacer la oración de apertura en la Reunión Sacramental del día {data}. Para ayudar con la reverencia, te pedimos que llegues 15 minutos antes del inicio de la reunión y te sientes junto con el obispado en el púlpito. ¿Podemos contar contigo?';

export const DEFAULT_CLOSING_PRAYER_TEMPLATE_PT_BR =
  'Olá {nome informal}, você foi designado(a) para fazer a oração de encerramento da Reunião Sacramental do dia {data}. Gostaríamos de pedir para que se junte ao bispado no púlpito durante o hino intermediário. Podemos contar com você?';

export const DEFAULT_CLOSING_PRAYER_TEMPLATE_EN =
  'Hello {nome informal}, you have been assigned to give the closing prayer at the Sacrament Meeting on {data}. We would like to ask you to join the bishopric at the pulpit during the intermediate hymn. Can we count on you?';

export const DEFAULT_CLOSING_PRAYER_TEMPLATE_ES =
  'Hola {nome informal}, has sido designado(a) para hacer la oración de cierre de la Reunión Sacramental del día {data}. Nos gustaría pedirte que te unas al obispado en el púlpito durante el himno intermedio. ¿Podemos contar contigo?';

// --- Default Delegation Wrapper Templates (v2.0) ---

export const DEFAULT_DELEGATION_WRAPPER_PT_BR =
  'Olá {responsavel}, tudo bom? Temos um convite para {nome}:\n\n{mensagem}';

export const DEFAULT_DELEGATION_WRAPPER_EN =
  'Hi {responsavel}, how are you? We have an invitation for {nome}:\n\n{mensagem}';

export const DEFAULT_DELEGATION_WRAPPER_ES =
  'Hola {responsavel}, ¿qué tal? Tenemos una invitación para {nome}:\n\n{mensagem}';

/**
 * Get the default delegation-wrapper template for a language.
 * Falls back to en-US if the language is not supported.
 */
export function getDefaultDelegationWrapper(language: string): string {
  switch (language) {
    case 'pt-BR':
      return DEFAULT_DELEGATION_WRAPPER_PT_BR;
    case 'es-LA':
      return DEFAULT_DELEGATION_WRAPPER_ES;
    case 'en-US':
    default:
      return DEFAULT_DELEGATION_WRAPPER_EN;
  }
}

/**
 * Get the default speech template for a given language and position.
 * Falls back to en-US if the language is not supported.
 */
export function getDefaultSpeechTemplate(language: string, position: 1 | 2 | 3): string {
  if (position === 1) {
    switch (language) {
      case 'pt-BR':
        return DEFAULT_TEMPLATE_SPEECH_1_PT_BR;
      case 'es-LA':
        return DEFAULT_TEMPLATE_SPEECH_1_ES;
      case 'en-US':
      default:
        return DEFAULT_TEMPLATE_SPEECH_1_EN;
    }
  }
  if (position === 2) {
    switch (language) {
      case 'pt-BR':
        return DEFAULT_TEMPLATE_SPEECH_2_PT_BR;
      case 'es-LA':
        return DEFAULT_TEMPLATE_SPEECH_2_ES;
      case 'en-US':
      default:
        return DEFAULT_TEMPLATE_SPEECH_2_EN;
    }
  }
  // position === 3
  switch (language) {
    case 'pt-BR':
      return DEFAULT_TEMPLATE_SPEECH_3_PT_BR;
    case 'es-LA':
      return DEFAULT_TEMPLATE_SPEECH_3_ES;
    case 'en-US':
    default:
      return DEFAULT_TEMPLATE_SPEECH_3_EN;
  }
}

/**
 * Get the default prayer template for a given language and prayer type.
 * Falls back to en-US if the language is not supported.
 */
export function getDefaultPrayerTemplate(language: string, type: 'opening' | 'closing'): string {
  if (type === 'opening') {
    switch (language) {
      case 'pt-BR':
        return DEFAULT_OPENING_PRAYER_TEMPLATE_PT_BR;
      case 'es-LA':
        return DEFAULT_OPENING_PRAYER_TEMPLATE_ES;
      case 'en-US':
      default:
        return DEFAULT_OPENING_PRAYER_TEMPLATE_EN;
    }
  }
  switch (language) {
    case 'pt-BR':
      return DEFAULT_CLOSING_PRAYER_TEMPLATE_PT_BR;
    case 'es-LA':
      return DEFAULT_CLOSING_PRAYER_TEMPLATE_ES;
    case 'en-US':
    default:
      return DEFAULT_CLOSING_PRAYER_TEMPLATE_EN;
  }
}

// --- Types ---

export interface WhatsAppVariables {
  /** Full name — what `{nome}` resolves to. */
  speakerName: string;
  /** Informal name — what `{nome informal}` resolves to; falls back to `speakerName` when absent. */
  speakerInformalName?: string;
  date: string;
  topic: string;
  collection?: string;
  link?: string;
}

// --- Functions ---

// Placeholder tokens are shown/typed in the app language, so each field accepts its localized
// aliases across the 3 supported locales (incl. accented forms shown by the template editor chips).
// Substitution replaces any of them — mirrors designations.ts TOKEN_ALIASES.
type WaTokenField = 'informalName' | 'name' | 'date' | 'collection' | 'title' | 'link';

const WA_TOKEN_ALIASES: Record<WaTokenField, readonly string[]> = {
  informalName: ['nome informal', 'informal name', 'nombre informal'],
  name: ['nome', 'name', 'nombre'],
  date: ['data', 'date', 'fecha'],
  collection: ['colecao', 'coleção', 'collection', 'colección'],
  title: ['titulo', 'título', 'title'],
  link: ['link', 'enlace'],
};

// Substitution matches the whole brace-delimited token, so `{nome}` is never found inside
// `{nome informal}` and the order below is not load-bearing. It still resolves the informal token
// first, so the pair reads in the order a template author thinks about them.
const WA_TOKEN_FIELDS: readonly WaTokenField[] = [
  'informalName',
  'name',
  'date',
  'collection',
  'title',
  'link',
];

/**
 * Resolve template placeholders with actual values. Accepts each field's pt/en/es token aliases so
 * a template typed (or a chip tapped) in any language substitutes correctly.
 */
export function resolveTemplate(template: string, vars: WhatsAppVariables): string {
  const values: Record<WaTokenField, string> = {
    // No informal name on record => greet with the full name rather than nothing.
    informalName: vars.speakerInformalName || vars.speakerName,
    name: vars.speakerName,
    date: vars.date,
    collection: vars.collection ?? '',
    title: vars.topic,
    link: vars.link ?? '',
  };
  let result = template;
  for (const field of WA_TOKEN_FIELDS) {
    for (const alias of WA_TOKEN_ALIASES[field]) {
      result = result.split(`{${alias}}`).join(values[field]);
    }
  }
  // Clean up whitespace left by empty placeholders WITHOUT flattening intentional line breaks:
  // collapse runs of spaces/tabs, drop trailing spaces per line, and cap blank-line runs.
  result = result
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return result;
}

/**
 * Wrap an already-resolved base message with the ward's delegation wrapper (v2.0).
 *
 * Used when a speech's contact is delegated to a responsible person: the normal per-position
 * message becomes the `{mensagem}` inside a friendly wrapper addressed to the responsible.
 *
 * @param baseMessage - The resolved per-position message (goes into `{mensagem}`).
 * @param wrapperTemplate - The ward's `whatsapp_template_delegation_wrapper`, or null for the
 *   locale default.
 * @param responsibleName - Name of the responsible person (`{responsavel}`).
 * @param delegateName - Name of the member the invitation is for (`{nome}`).
 * @param language - Language for the default wrapper fallback (default 'en-US').
 */
export function wrapDelegationMessage(
  baseMessage: string,
  wrapperTemplate: string | null,
  responsibleName: string,
  delegateName: string,
  language: string = 'en-US'
): string {
  const template = wrapperTemplate || getDefaultDelegationWrapper(language);
  // Resolve {mensagem} last so tokens inside the base message are not re-substituted.
  return template
    .replace(/\{responsavel\}/g, responsibleName)
    .replace(/\{nome\}/g, delegateName)
    .replace(/\{mensagem\}/g, baseMessage);
}

/**
 * Build a WhatsApp URL (wa.me) with pre-filled message.
 * @param phone - Full phone number (with country code, e.g., "+5511987654321")
 * @param countryCode - Optional country code (if not already in phone)
 * @param template - Message template (uses default for language/position if empty)
 * @param variables - Template variable values
 * @param language - Language for default template fallback (default 'pt-BR')
 * @param position - Speech position (1, 2, or 3) for default template selection
 */
export function buildWhatsAppUrl(
  phone: string,
  countryCode: string,
  template: string,
  variables: WhatsAppVariables,
  language: string = 'en-US',
  position: 1 | 2 | 3 = 1
): string {
  // Clean phone number: remove spaces, dashes, parentheses
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

  // If phone doesn't start with +, prepend country code
  if (!cleanPhone.startsWith('+') && countryCode) {
    cleanPhone = countryCode + cleanPhone;
  }

  // Remove leading + for wa.me format
  if (cleanPhone.startsWith('+')) {
    cleanPhone = cleanPhone.substring(1);
  }

  const messageTemplate = template || getDefaultSpeechTemplate(language, position);
  const message = resolveTemplate(messageTemplate, variables);
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Build a WhatsApp URL to open an existing conversation (no pre-filled message).
 * @param phone - Full phone number (with country code, e.g., "+5511987654321")
 */
export function buildWhatsAppConversationUrl(phone: string): string {
  // Clean phone number: remove spaces, dashes, parentheses
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');

  // Remove leading + for wa.me format
  if (cleanPhone.startsWith('+')) {
    cleanPhone = cleanPhone.substring(1);
  }

  return `https://wa.me/${cleanPhone}`;
}

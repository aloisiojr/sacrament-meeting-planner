/**
 * WhatsApp URL building utilities (pure functions, no React Native deps).
 * Template placeholders: {nome}, {data}, {posicao}, {colecao}, {titulo}, {link}
 */

// --- Default Templates ---

export const DEFAULT_TEMPLATE_PT_BR =
  'Olá, tudo bom! O Bispado gostaria de te convidar para fazer o {posicao} discurso no domingo dia {data}! Você falará sobre um tema da {colecao} com o título "{titulo}" {link}. Podemos confirmar o seu discurso?';

export const DEFAULT_TEMPLATE_EN =
  'Hi! The Bishopric would like to invite you to give the {posicao} speech on Sunday {data}! You will speak about a topic from {colecao} titled "{titulo}" {link}. Can we confirm your speech?';

export const DEFAULT_TEMPLATE_ES =
  'Hola, como estas? El Obispado te quiere invitar a dar el {posicao} discurso el domingo {data}! Hablaras sobre un tema de {colecao} con el titulo "{titulo}" {link}. Podemos confirmar tu discurso?';

// --- Default Prayer Templates ---

export const DEFAULT_OPENING_PRAYER_TEMPLATE_PT_BR =
  'Olá {nome}, você foi designado(a) para fazer a oração de abertura na Reunião Sacramental do dia {data}. Para ajudar na reverência, pedimos que você chegue 15min antes do início da reunião e se sente junto com o bispado ao púlpito. Podemos contar com você?';

export const DEFAULT_OPENING_PRAYER_TEMPLATE_EN =
  'Hello {nome}, you have been assigned to give the opening prayer at the Sacrament Meeting on {data}. To help with reverence, we kindly ask you to arrive 15 minutes early and sit with the bishopric at the pulpit. Can we count on you?';

export const DEFAULT_OPENING_PRAYER_TEMPLATE_ES =
  'Hola {nome}, has sido designado(a) para hacer la oración de apertura en la Reunión Sacramental del día {data}. Para ayudar con la reverencia, te pedimos que llegues 15 minutos antes del inicio de la reunión y te sientes junto con el obispado en el púlpito. ¿Podemos contar contigo?';

export const DEFAULT_CLOSING_PRAYER_TEMPLATE_PT_BR =
  'Olá {nome}, você foi designado(a) para fazer a oração de encerramento da Reunião Sacramental do dia {data}. Gostaríamos de pedir para que se junte ao bispado no púlpito durante o hino intermediário. Podemos contar com você?';

export const DEFAULT_CLOSING_PRAYER_TEMPLATE_EN =
  'Hello {nome}, you have been assigned to give the closing prayer at the Sacrament Meeting on {data}. We would like to ask you to join the bishopric at the pulpit during the intermediate hymn. Can we count on you?';

export const DEFAULT_CLOSING_PRAYER_TEMPLATE_ES =
  'Hola {nome}, has sido designado(a) para hacer la oración de cierre de la Reunión Sacramental del día {data}. Nos gustaría pedirte que te unas al obispado en el púlpito durante el himno intermedio. ¿Podemos contar contigo?';

/**
 * Get the default template for a given language.
 * Falls back to pt-BR if the language is not supported.
 */
export function getDefaultTemplate(language: string): string {
  switch (language) {
    case 'en':
      return DEFAULT_TEMPLATE_EN;
    case 'es':
      return DEFAULT_TEMPLATE_ES;
    case 'pt-BR':
    default:
      return DEFAULT_TEMPLATE_PT_BR;
  }
}

/**
 * Get the default prayer template for a given language and prayer type.
 * Falls back to pt-BR if the language is not supported.
 */
export function getDefaultPrayerTemplate(language: string, type: 'opening' | 'closing'): string {
  if (type === 'opening') {
    switch (language) {
      case 'en':
        return DEFAULT_OPENING_PRAYER_TEMPLATE_EN;
      case 'es':
        return DEFAULT_OPENING_PRAYER_TEMPLATE_ES;
      case 'pt-BR':
      default:
        return DEFAULT_OPENING_PRAYER_TEMPLATE_PT_BR;
    }
  }
  switch (language) {
    case 'en':
      return DEFAULT_CLOSING_PRAYER_TEMPLATE_EN;
    case 'es':
      return DEFAULT_CLOSING_PRAYER_TEMPLATE_ES;
    case 'pt-BR':
    default:
      return DEFAULT_CLOSING_PRAYER_TEMPLATE_PT_BR;
  }
}

// --- Types ---

export interface WhatsAppVariables {
  speakerName: string;
  date: string;
  topic: string;
  position: string;
  collection?: string;
  link?: string;
}

// --- Functions ---

/**
 * Resolve template placeholders with actual values.
 */
export function resolveTemplate(template: string, vars: WhatsAppVariables): string {
  let result = template;
  result = result.replace(/\{nome\}/g, vars.speakerName);
  result = result.replace(/\{data\}/g, vars.date);
  result = result.replace(/\{posicao\}/g, vars.position);
  result = result.replace(/\{colecao\}/g, vars.collection ?? '');
  result = result.replace(/\{titulo\}/g, vars.topic);
  result = result.replace(/\{link\}/g, vars.link ?? '');
  // Clean up extra whitespace from empty placeholders
  result = result.replace(/\s{2,}/g, ' ').trim();
  return result;
}

/**
 * Build a WhatsApp URL (wa.me) with pre-filled message.
 * @param phone - Full phone number (with country code, e.g., "+5511987654321")
 * @param countryCode - Optional country code (if not already in phone)
 * @param template - Message template (uses default for language if empty)
 * @param variables - Template variable values
 * @param language - Language for default template fallback (default 'pt-BR')
 */
export function buildWhatsAppUrl(
  phone: string,
  countryCode: string,
  template: string,
  variables: WhatsAppVariables,
  language: string = 'pt-BR'
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

  const messageTemplate = template || getDefaultTemplate(language);
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

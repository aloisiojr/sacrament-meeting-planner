/**
 * WhatsApp URL building utilities (pure functions, no React Native deps).
 * Template placeholders: {nome}, {data}, {posicao}, {colecao}, {titulo}, {link}
 */

// --- Default Template ---

export const DEFAULT_TEMPLATE_PT_BR =
  'Olá, tudo bom! O Bispado gostaria de te convidar para fazer o {posicao} discurso no domingo dia {data}! Você falará sobre um tema da {colecao} com o título {titulo} {link}. Podemos confirmar o seu discurso?';

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
 * @param template - Message template (uses default if empty)
 * @param variables - Template variable values
 */
export function buildWhatsAppUrl(
  phone: string,
  countryCode: string,
  template: string,
  variables: WhatsAppVariables
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

  const messageTemplate = template || DEFAULT_TEMPLATE_PT_BR;
  const message = resolveTemplate(messageTemplate, variables);
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

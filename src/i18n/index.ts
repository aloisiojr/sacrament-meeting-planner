import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ptBR from './locales/pt-BR.json';
import en from './locales/en.json';
import es from './locales/es.json';

export const SUPPORTED_LANGUAGES = ['pt-BR', 'en', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  'pt-BR': 'Portugues (Brasil)',
  en: 'English',
  es: 'Espanol',
};

export const DEFAULT_COUNTRY_CODES: Record<SupportedLanguage, string> = {
  'pt-BR': '+55',
  en: '+1',
  es: '+52',
};

export const DEFAULT_TIMEZONES: Record<SupportedLanguage, string> = {
  'pt-BR': 'America/Sao_Paulo',
  en: 'America/New_York',
  es: 'America/Mexico_City',
};

const resources = {
  'pt-BR': { translation: ptBR },
  en: { translation: en },
  es: { translation: es },
};

/**
 * Detect device locale and map to supported language.
 * Falls back to pt-BR if no match found.
 */
function detectDeviceLocale(): SupportedLanguage {
  try {
    // In React Native, we can use Intl or expo-localization
    // For now, use basic detection via Intl
    const deviceLocale =
      typeof Intl !== 'undefined' && Intl.DateTimeFormat
        ? Intl.DateTimeFormat().resolvedOptions().locale
        : 'pt-BR';

    // Check exact match first
    if (SUPPORTED_LANGUAGES.includes(deviceLocale as SupportedLanguage)) {
      return deviceLocale as SupportedLanguage;
    }

    // Check language prefix match (e.g., 'pt' matches 'pt-BR', 'es-MX' matches 'es')
    const langPrefix = deviceLocale.split('-')[0];
    if (langPrefix === 'pt') return 'pt-BR';
    if (langPrefix === 'en') return 'en';
    if (langPrefix === 'es') return 'es';

    return 'pt-BR';
  } catch {
    return 'pt-BR';
  }
}

/**
 * Initialize i18n with the given language or detect from device.
 * Language detection chain: ward setting -> device locale -> pt-BR default.
 *
 * @param wardLanguage - Optional language from ward settings (takes priority)
 */
export function initI18n(wardLanguage?: SupportedLanguage): void {
  const language = wardLanguage ?? detectDeviceLocale();

  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: 'pt-BR',
      interpolation: {
        escapeValue: false, // React already handles escaping
      },
      react: {
        useSuspense: false,
      },
    });
  } else {
    i18n.changeLanguage(language);
  }
}

/**
 * Change the current language at runtime.
 */
export function changeLanguage(language: SupportedLanguage): void {
  i18n.changeLanguage(language);
}

/**
 * Get the current language.
 */
export function getCurrentLanguage(): SupportedLanguage {
  return (i18n.language as SupportedLanguage) || 'pt-BR';
}

// Initialize with device locale detection by default
initI18n();

export default i18n;

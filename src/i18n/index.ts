import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ptBR from './locales/pt-BR.json';
import enUS from './locales/en-US.json';
import esLA from './locales/es-LA.json';

export const SUPPORTED_LANGUAGES = ['pt-BR', 'en-US', 'es-LA'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  'pt-BR': 'Portugues (Brasil)',
  'en-US': 'English',
  'es-LA': 'Espanol',
};

export const DEFAULT_COUNTRY_CODES: Record<SupportedLanguage, string> = {
  'pt-BR': '+55',
  'en-US': '+1',
  'es-LA': '+52',
};

export const DEFAULT_TIMEZONES: Record<SupportedLanguage, string> = {
  'pt-BR': 'America/Sao_Paulo',
  'en-US': 'America/New_York',
  'es-LA': 'America/Mexico_City',
};

/**
 * Map app language codes to database locale codes used in general_collections.
 * After CR-249, app codes and DB codes are unified (identity mapping).
 * Retained for forward compatibility if codes ever need to diverge again.
 */
const DB_LOCALE_MAP: Record<SupportedLanguage, string> = {
  'pt-BR': 'pt-BR',
  'en-US': 'en-US',
  'es-LA': 'es-LA',
};

/**
 * Convert an app language code to the database locale code used in general_collections.
 * After CR-249, this is an identity mapping: 'en-US' -> 'en-US', 'es-LA' -> 'es-LA'.
 * Returns the input unchanged if not a recognized SupportedLanguage.
 */
export function toDbLocale(language: string): string {
  return DB_LOCALE_MAP[language as SupportedLanguage] ?? language;
}

const resources = {
  'pt-BR': { translation: ptBR },
  'en-US': { translation: enUS },
  'es-LA': { translation: esLA },
};

/**
 * Detect device locale and map to supported language.
 * Falls back to en-US if no match found.
 */
function detectDeviceLocale(): SupportedLanguage {
  try {
    // In React Native, we can use Intl or expo-localization
    // For now, use basic detection via Intl
    const deviceLocale =
      typeof Intl !== 'undefined' && Intl.DateTimeFormat
        ? Intl.DateTimeFormat().resolvedOptions().locale
        : 'en-US';

    // Check exact match first
    if (SUPPORTED_LANGUAGES.includes(deviceLocale as SupportedLanguage)) {
      return deviceLocale as SupportedLanguage;
    }

    // Check language prefix match (e.g., 'pt' matches 'pt-BR', 'es-MX' matches 'es')
    const langPrefix = deviceLocale.split('-')[0];
    if (langPrefix === 'pt') return 'pt-BR';
    if (langPrefix === 'en') return 'en-US';
    if (langPrefix === 'es') return 'es-LA';

    return 'en-US';
  } catch {
    return 'en-US';
  }
}

/**
 * Initialize i18n with the given language or detect from device.
 * Language detection chain: ward setting -> device locale -> en-US default.
 *
 * @param wardLanguage - Optional language from ward settings (takes priority)
 */
export function initI18n(wardLanguage?: SupportedLanguage): void {
  const language = wardLanguage ?? detectDeviceLocale();

  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: 'en-US',
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
  return (i18n.language as SupportedLanguage) || 'en-US';
}

// Initialize with device locale detection by default
initI18n();

export default i18n;

import { Platform } from 'react-native';

/**
 * Store URL for the "update required" screen. Android is not published yet → null (the screen
 * shows a message instead of a broken link). Add the Play Store URL here when it goes live.
 */
export const STORE_URL: string | null =
  Platform.select<string | null>({
    ios: 'https://apps.apple.com/br/app/planejador-reuni%C3%A3o-sacramental/id6759450448',
    android: null,
    default: null,
  }) ?? null;

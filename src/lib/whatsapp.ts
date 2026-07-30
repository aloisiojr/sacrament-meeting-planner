/**
 * WhatsApp integration: build wa.me URLs and open WhatsApp.
 * Pure utilities are in whatsappUtils.ts; this file adds RN-dependent openWhatsApp.
 */

import { Linking, Alert } from 'react-native';
import i18n from '../i18n';

// Re-export pure utilities so existing imports continue to work
export {
  resolveTemplate,
  buildWhatsAppUrl,
  buildWhatsAppConversationUrl,
  getDefaultSpeechTemplate,
} from './whatsappUtils';
export type { WhatsAppVariables } from './whatsappUtils';

/**
 * Open WhatsApp via deep link.
 * Shows error alert if WhatsApp is not installed. Returns true only when WhatsApp
 * actually opened, so callers can avoid marking an invite "sent" when it wasn't.
 */
export async function openWhatsApp(url: string): Promise<boolean> {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    Alert.alert('WhatsApp', i18n.t('errors.whatsappNotInstalled'));
    return false;
  } catch {
    Alert.alert('WhatsApp', i18n.t('errors.whatsappFailed'));
    return false;
  }
}

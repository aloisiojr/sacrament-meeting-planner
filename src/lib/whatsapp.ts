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
 * Shows error alert if WhatsApp is not installed.
 */
export async function openWhatsApp(url: string): Promise<void> {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('WhatsApp', i18n.t('errors.whatsappNotInstalled'));
    }
  } catch {
    Alert.alert('WhatsApp', i18n.t('errors.whatsappFailed'));
  }
}

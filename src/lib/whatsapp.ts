/**
 * WhatsApp integration: build wa.me URLs and open WhatsApp.
 * Pure utilities are in whatsappUtils.ts; this file adds RN-dependent openWhatsApp.
 */

import { Linking, Alert } from 'react-native';

// Re-export pure utilities so existing imports continue to work
export {
  resolveTemplate,
  buildWhatsAppUrl,
  DEFAULT_TEMPLATE_PT_BR,
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
      Alert.alert('WhatsApp', 'WhatsApp is not installed on this device.');
    }
  } catch {
    Alert.alert('WhatsApp', 'Failed to open WhatsApp.');
  }
}

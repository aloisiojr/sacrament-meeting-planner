import { useEffect } from 'react';
import { Alert, BackHandler, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

/**
 * ExitConfirmation component.
 * Intercepts Android hardware back button at the root level.
 * Shows a confirmation dialog before exiting the app.
 * No-op on iOS (no hardware back button).
 */
export function ExitConfirmation() {
  const { t } = useTranslation();

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      Alert.alert(
        t('exitConfirmation.title'),
        t('exitConfirmation.message'),
        [
          { text: t('common.no'), style: 'cancel' },
          {
            text: t('common.yes'),
            style: 'destructive',
            onPress: () => BackHandler.exitApp(),
          },
        ],
        { cancelable: true }
      );
      // Return true to prevent default back behavior
      return true;
    };

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    return () => subscription.remove();
  }, [t]);

  return null;
}

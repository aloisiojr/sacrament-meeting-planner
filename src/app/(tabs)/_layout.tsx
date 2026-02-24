import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useWardManagePrayers } from '../../hooks/useSpeeches';
import { ExitConfirmation } from '../../components/ExitConfirmation';
import { HomeIcon, ClipboardListIcon, MicIcon, SettingsIcon } from '../../components/icons';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const { colors } = useTheme();
  const { managePrayers } = useWardManagePrayers();

  const isObserver = role === 'observer';
  const speechesTabTitle = managePrayers
    ? t('tabs.speechesAndPrayers')
    : t('tabs.speeches');

  return (
    <>
      <ExitConfirmation />
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.divider,
        },
        tabBarLabelStyle: {
          textAlign: 'center',
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color, size }) => (
            <HomeIcon color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: t('tabs.agenda'),
          tabBarIcon: ({ color, size }) => (
            <ClipboardListIcon color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="speeches"
        options={{
          title: speechesTabTitle,
          tabBarIcon: ({ color, size }) => (
            <MicIcon color={color} size={size} />
          ),
          tabBarLabel: ({ color }) => (
            <Text
              numberOfLines={2}
              style={{ fontSize: 10, textAlign: 'center', color }}
            >
              {speechesTabTitle}
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => (
            <SettingsIcon color={color} size={size} />
          ),
          // F116: Observer now has access to Settings tab (limited options rendered in settings/index.tsx)
        }}
      />
    </Tabs>
    </>
  );
}

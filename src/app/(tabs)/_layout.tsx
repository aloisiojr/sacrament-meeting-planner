import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { ExitConfirmation } from '../../components/ExitConfirmation';
import { HomeIcon, ClipboardListIcon, SettingsIcon } from '../../components/icons';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

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
          tabBarButtonTestID: "tab-home",
          tabBarIcon: ({ color, size }) => (
            <HomeIcon color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: t('tabs.agenda'),
          tabBarButtonTestID: "tab-agendas",
          tabBarIcon: ({ color, size }) => (
            <ClipboardListIcon color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
          tabBarButtonTestID: "tab-settings",
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

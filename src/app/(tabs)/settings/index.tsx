import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SettingsItemProps {
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

function SettingsItem({ label, onPress, colors }: SettingsItemProps) {
  return (
    <Pressable
      style={[styles.item, { borderBottomColor: colors.divider }]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={[styles.itemText, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.itemArrow, { color: colors.textSecondary }]}>{'\u203A'}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { hasPermission } = useAuth();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('settings.title')}
        </Text>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          {hasPermission('member:read') && (
            <SettingsItem
              label={t('settings.members')}
              onPress={() => router.push('/(tabs)/settings/members')}
              colors={colors}
            />
          )}
          {hasPermission('topic:write') && (
            <SettingsItem
              label={t('settings.topics')}
              onPress={() => router.push('/(tabs)/settings/topics')}
              colors={colors}
            />
          )}
          {hasPermission('settings:access') && (
            <SettingsItem
              label={t('settings.actors')}
              onPress={() => router.push('/(tabs)/settings/actors')}
              colors={colors}
            />
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          {hasPermission('settings:users') && (
            <SettingsItem
              label={t('settings.users')}
              onPress={() => router.push('/(tabs)/settings/users')}
              colors={colors}
            />
          )}
          {hasPermission('history:read') && (
            <SettingsItem
              label={t('settings.history')}
              onPress={() => router.push('/(tabs)/settings/history')}
              colors={colors}
            />
          )}
          {hasPermission('settings:whatsapp') && (
            <SettingsItem
              label={t('settings.whatsappTemplate')}
              onPress={() => router.push('/(tabs)/settings/whatsapp')}
              colors={colors}
            />
          )}
        </View>

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <SettingsItem
            label={t('settings.language')}
            onPress={() => {}}
            colors={colors}
          />
          <SettingsItem
            label={t('settings.theme')}
            onPress={() => {}}
            colors={colors}
          />
          <SettingsItem
            label={t('settings.about')}
            onPress={() => {}}
            colors={colors}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: {
    fontSize: 16,
  },
  itemArrow: {
    fontSize: 22,
    fontWeight: '300',
  },
});

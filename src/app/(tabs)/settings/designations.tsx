/**
 * Settings → Ward Business Templates. Lets a ward customize the four designation read-texts shown
 * in the Play interstitial. Each field is pre-filled with the ward override (if set) or the built-in
 * localized default; editing auto-saves the override, and "restore default" clears it (column NULL).
 * Mirrors the WhatsApp-templates screen. Gated by `settings:designations`.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../contexts/ThemeContext';
import {
  useWardDesignationTemplates,
  useUpdateWardDesignationTemplate,
} from '../../../hooks/useWard';
import { DESIGNATION_TYPES, designationTypeLabel } from '../../../lib/designations';
import type { DesignationType } from '../../../types/database';

function DesignationTemplatesContent() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const { templates: overrides, isLoaded } = useWardDesignationTemplates();
  const update = useUpdateWardDesignationTemplate();

  const defaultFor = useCallback(
    (type: DesignationType) => t(`agenda.designations.readText.${type}`),
    [t]
  );

  const [values, setValues] = useState<Record<DesignationType, string>>({
    release: '',
    sustain: '',
    priesthood: '',
    new_member: '',
  });
  const [edited, setEdited] = useState<Record<DesignationType, boolean>>({
    release: false,
    sustain: false,
    priesthood: false,
    new_member: false,
  });
  const [initialized, setInitialized] = useState(false);

  // Initialize each field from the override (if any) or the localized default — only once the
  // query has resolved, so a saved override isn't overwritten by the default on a cold cache.
  useEffect(() => {
    if (initialized || !isLoaded) return;
    setValues({
      release: overrides.release ?? defaultFor('release'),
      sustain: overrides.sustain ?? defaultFor('sustain'),
      priesthood: overrides.priesthood ?? defaultFor('priesthood'),
      new_member: overrides.new_member ?? defaultFor('new_member'),
    });
    setInitialized(true);
  }, [initialized, isLoaded, overrides, defaultFor]);

  const handleChange = useCallback((type: DesignationType, text: string) => {
    setValues((v) => ({ ...v, [type]: text }));
    setEdited((e) => (e[type] ? e : { ...e, [type]: true }));
  }, []);

  const handleBlur = useCallback(
    (type: DesignationType) => {
      if (!edited[type]) return; // only persist fields the user actually touched
      const text = values[type];
      // Blank or unchanged-from-default => clear the override (use the localized default);
      // otherwise save the custom text.
      const value = text.trim() && text !== defaultFor(type) ? text : null;
      update.mutate({ type, value });
    },
    [edited, values, defaultFor, update]
  );

  const handleRestore = useCallback(
    (type: DesignationType) => {
      setValues((v) => ({ ...v, [type]: defaultFor(type) }));
      setEdited((e) => ({ ...e, [type]: false }));
      update.mutate({ type, value: null });
    },
    [defaultFor, update]
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={12} testID="designation-templates-back">
            <Text style={[styles.backButton, { color: colors.primary }]}>{t('common.back')}</Text>
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {t('settings.designationsTemplate')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          {t('agenda.designations.templateHint')}
        </Text>

        {DESIGNATION_TYPES.map((type) => (
          <View key={type} style={styles.field}>
            <View style={styles.fieldHeader}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                {designationTypeLabel(type, t)}
              </Text>
              <Pressable onPress={() => handleRestore(type)} hitSlop={8} testID={`designation-template-restore-${type}`}>
                <Text style={[styles.restore, { color: colors.primary }]}>
                  {t('agenda.designations.restoreDefault')}
                </Text>
              </Pressable>
            </View>
            <TextInput
              testID={`designation-template-input-${type}`}
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={values[type]}
              onChangeText={(text) => handleChange(type, text)}
              onBlur={() => handleBlur(type)}
              multiline
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function DesignationTemplatesScreen() {
  return <DesignationTemplatesContent />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  backButton: { fontSize: 16, width: 70 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  headerSpacer: { width: 70 },
  hint: { fontSize: 13, marginBottom: 16 },
  field: { marginBottom: 20 },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  restore: { fontSize: 13, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 96,
    textAlignVertical: 'top',
  },
});

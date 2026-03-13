import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { DEFAULT_TIMEZONES, LANGUAGE_LABELS, SUPPORTED_LANGUAGES, changeLanguage } from '../../i18n';
import type { SupportedLanguage } from '../../i18n';
import { TIMEZONES } from '../../lib/timezones';
import { SearchInput } from '../../components/SearchInput';
import { CheckIcon } from '../../components/icons';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [stakeName, setStakeName] = useState('');
  const [wardName, setWardName] = useState('');
  const [role, setRole] = useState<'bishopric' | 'secretary'>('bishopric');
  const [language, setLanguage] = useState<SupportedLanguage>('pt-BR');
  const [timezone, setTimezone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState('');

  // Auto-detect timezone
  useEffect(() => {
    try {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(detectedTimezone || DEFAULT_TIMEZONES['pt-BR']);
    } catch {
      setTimezone(DEFAULT_TIMEZONES['pt-BR']);
    }
  }, []);

  const filteredTimezones = useMemo(() => {
    if (!timezoneSearch.trim()) return TIMEZONES;
    const query = timezoneSearch.toLowerCase();
    return TIMEZONES.filter((tz) => tz.toLowerCase().includes(query));
  }, [timezoneSearch]);

  const handleTimezoneSelect = useCallback((tz: string) => {
    setTimezone(tz);
    setShowTimezonePicker(false);
    setTimezoneSearch('');
  }, []);

  const validate = (): string | null => {
    if (!fullName.trim()) return t('auth.nameRequired');
    if (!email.trim()) return t('auth.emailRequired');
    if (!stakeName.trim()) return t('auth.stakeRequired');
    if (!wardName.trim()) return t('auth.wardRequired');
    if (password.length < 6) return t('auth.passwordMinLength');
    if (password !== confirmPassword) return t('auth.passwordMismatch');
    return null;
  };

  const handleRegister = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await supabase.functions.invoke('register-first-user', {
        body: {
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          stakeName: stakeName.trim(),
          wardName: wardName.trim(),
          role,
          language,
          timezone: timezone || DEFAULT_TIMEZONES[language],
        },
      });

      const data = response.data;

      if (response.error) {
        // Supabase JS v2: for non-2xx, data is null. Extract error body from Response.
        let errorCode: string | undefined;
        try {
          const ctx = response.error?.context;
          if (ctx instanceof Response) {
            const errorBody = await ctx.json();
            errorCode = errorBody?.error;
          }
        } catch {
          // Couldn't parse error body, fall through to generic message
        }
        if (errorCode === 'email_exists') {
          setError(t('auth.emailExists'));
          return;
        }
        if (errorCode === 'stake_ward_exists') {
          setError(t('auth.stakeWardExists'));
          return;
        }
        setError(t('auth.registrationFailed'));
        return;
      }

      // If session is returned, set it in the Supabase client
      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        // Apply the selected language immediately so UI renders correctly
        changeLanguage(language);
        // Navigation handled by auth state change in root layout
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Failed to fetch') || message.includes('Network')) {
        setError(t('auth.requiresConnection'));
      } else {
        setError(t('auth.registrationFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('auth.registerTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('auth.registerSubtitle')}
          </Text>
        </View>

        <View style={styles.formContainer}>
          {error && (
            <View
              testID="register-error-text"
              style={[
                styles.errorContainer,
                { backgroundColor: colors.errorContainer },
              ]}
            >
              <Text style={[styles.errorText, { color: colors.error }]}>
                {error}
              </Text>
            </View>
          )}

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('auth.fullName')}
            </Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
                color: colors.text,
              }]}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('auth.fullNamePlaceholder')}
              placeholderTextColor={colors.placeholder}
              autoCapitalize="words"
              autoCorrect={false}
              textContentType="name"
              autoComplete="name"
              editable={!loading}
              testID="register-fullname-input"
            />
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('auth.email')}
            </Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
                color: colors.text,
              }]}
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.email')}
              placeholderTextColor={colors.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              autoComplete="email"
              editable={!loading}
              testID="register-email-input"
            />
          </View>

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('auth.password')}
            </Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
                color: colors.text,
              }]}
              value={password}
              onChangeText={setPassword}
              placeholder={t('auth.password')}
              placeholderTextColor={colors.placeholder}
              secureTextEntry
              textContentType="newPassword"
              autoComplete="new-password"
              editable={!loading}
              testID="register-password-input"
            />
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('auth.confirmPassword')}
            </Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
                color: colors.text,
              }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('auth.confirmPassword')}
              placeholderTextColor={colors.placeholder}
              secureTextEntry
              textContentType="newPassword"
              autoComplete="new-password"
              editable={!loading}
              testID="register-confirm-password-input"
            />
          </View>

          {/* Stake */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('auth.stake')}
            </Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
                color: colors.text,
              }]}
              value={stakeName}
              onChangeText={setStakeName}
              placeholder={t('auth.stake')}
              placeholderTextColor={colors.placeholder}
              autoCapitalize="words"
              editable={!loading}
              testID="register-stake-input"
            />
          </View>

          {/* Ward */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('auth.ward')}
            </Text>
            <TextInput
              style={[styles.input, {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
                color: colors.text,
              }]}
              value={wardName}
              onChangeText={setWardName}
              placeholder={t('auth.ward')}
              placeholderTextColor={colors.placeholder}
              autoCapitalize="words"
              editable={!loading}
              testID="register-ward-input"
            />
          </View>

          {/* Role */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('auth.role')}
            </Text>
            <View style={styles.radioGroup}>
              {(['bishopric', 'secretary'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.radioButton,
                    {
                      borderColor: role === r ? colors.primary : colors.inputBorder,
                      backgroundColor: role === r ? colors.primaryContainer : colors.inputBackground,
                    },
                  ]}
                  onPress={() => setRole(r)}
                  disabled={loading}
                  testID={`register-role-${r}-radio`}
                >
                  <Text
                    style={[
                      styles.radioText,
                      { color: role === r ? colors.primary : colors.text },
                    ]}
                  >
                    {t(`roles.${r}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Language */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('auth.language')}
            </Text>
            <View style={styles.radioGroup}>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.radioButton,
                    {
                      borderColor: language === lang ? colors.primary : colors.inputBorder,
                      backgroundColor: language === lang ? colors.primaryContainer : colors.inputBackground,
                    },
                  ]}
                  onPress={() => setLanguage(lang)}
                  disabled={loading}
                  testID={`register-language-${lang}-radio`}
                >
                  <Text
                    style={[
                      styles.radioText,
                      { color: language === lang ? colors.primary : colors.text },
                    ]}
                  >
                    {LANGUAGE_LABELS[lang]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Timezone */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('auth.timezone')}
            </Text>
            <Pressable
              style={[styles.input, styles.pickerButton, {
                backgroundColor: colors.inputBackground,
                borderColor: colors.inputBorder,
              }]}
              onPress={() => setShowTimezonePicker(true)}
              disabled={loading}
              testID="register-timezone-input"
            >
              <Text style={[styles.pickerButtonText, { color: colors.text }]}>
                {timezone || 'America/Sao_Paulo'}
              </Text>
            </Pressable>
          </View>

          {/* Timezone Picker Modal */}
          <Modal
            visible={showTimezonePicker}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowTimezonePicker(false)}
          >
            <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Pressable onPress={() => { setShowTimezonePicker(false); setTimezoneSearch(''); }} hitSlop={12}>
                  <Text style={[styles.modalCloseText, { color: colors.primary }]}>
                    {t('common.close')}
                  </Text>
                </Pressable>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {t('timezoneSelector.title')}
                </Text>
                <View style={styles.modalHeaderSpacer} />
              </View>
              <View style={[styles.modalSearchContainer, { backgroundColor: colors.card }]}>
                <SearchInput
                  value={timezoneSearch}
                  onChangeText={setTimezoneSearch}
                  placeholder={t('timezoneSelector.search')}
                />
              </View>
              <FlatList
                data={filteredTimezones}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                style={[styles.modalList, { backgroundColor: colors.card }]}
                renderItem={({ item }) => {
                  const isSelected = item === timezone;
                  return (
                    <Pressable
                      style={[
                        styles.modalItem,
                        { borderBottomColor: colors.divider },
                        isSelected && { backgroundColor: colors.surfaceVariant },
                      ]}
                      onPress={() => handleTimezoneSelect(item)}
                    >
                      <Text style={[styles.modalItemText, { color: colors.text }]}>{item}</Text>
                      {isSelected && <CheckIcon size={18} color={colors.primary} />}
                    </Pressable>
                  );
                }}
              />
            </View>
          </Modal>

          {/* Submit */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.primary },
              loading && styles.submitButtonDisabled,
            ]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
            testID="register-submit-button"
          >
            {loading ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={[styles.submitButtonText, { color: colors.onPrimary }]}>
                {t('auth.createAccountButton')}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backLink}
            onPress={handleBack}
            disabled={loading}
            testID="register-back-button"
          >
            <Text style={[styles.backLinkText, { color: colors.primary }]}>
              {t('common.back')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radioButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  radioText: {
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerButton: {
    justifyContent: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
  },
  backLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  backLinkText: {
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalHeaderSpacer: {
    width: 50,
  },
  modalSearchContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 8,
  },
  modalList: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalItemText: {
    fontSize: 15,
    flex: 1,
  },
});
